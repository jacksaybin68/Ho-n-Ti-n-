/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  auth, db, messaging,
  signOut,
  onAuthStateChanged,
  FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  getToken,
  doc,
  getDoc,
  setDoc,
  collection,
  onSnapshot,
  query,
  where,
  addDoc,
  updateDoc,
  serverTimestamp,
  orderBy,
  Timestamp,
  getDocs,
  writeBatch,
  deleteDoc,
  adminUpdateUserAuth
} from './mockFirebase';
import {
  LayoutDashboard,
  Users,
  TicketCheck,
  LogOut,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  CreditCard,
  User as UserIcon,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  Menu,
  X,
  Settings,
  Plane,
  Ticket,
  Trash2,
  Info,
  Bell,
  BellOff,
  Eye,
  EyeOff,
  RotateCcw,
  Loader2,
  AlertTriangle,
  Check,
  Send,
  UserCog,
  RefreshCw,
  Moon,
  Sun,
  MessageCircle,
  Minus,
  UserPlus,
  Edit2,
  Database,
  Shield,
  ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';

// Tiện ích cho các class Tailwind
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Định nghĩa kiểu dữ liệu ---

type UserRole = 'admin' | 'user';
type RefundStatus = 'pending' | 'approved' | 'processing' | 'completed' | 'rejected';

interface UserProfile {
  uid: string;
  sdt: string;
  displayName: string;
  email?: string;
  role: UserRole;
  status: 'active' | 'inactive';
  createdAt: any;
  fcmToken?: string;
  notificationsEnabled?: boolean;
  lastReadAt?: any;
}

interface RefundRequest {
  id: string;
  userId: string;
  userSdt?: string;
  userEmail?: string;
  displayName?: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  amount: number;
  orderCode: string;
  status: RefundStatus;
  isVisible?: boolean;
  createdAt: any;
  updatedAt: any;
  adminNote?: string;
  processingTime?: any;
  refundSlipCode?: string;
  approvedBy?: string;
  approvedAt?: any;
  completedBy?: string;
  completedAt?: any;
  transferNote?: string;
  refundReason?: string;
  flightDate?: string;
  ticketNumber?: string;
  passengerName?: string;
}

interface AuditLog {
  id: string;
  adminId: string;
  adminEmail: string;
  action: 'update_user' | 'delete_user' | 'update_request' | 'bulk_action';
  targetId: string;
  targetType: 'user' | 'refundRequest';
  changes: Record<string, { old: any; new: any }>;
  timestamp: any;
}

interface ChatMessage {
  id: string;
  userId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  text: string;
  timestamp: any;
  isRead: boolean;
}

interface BookingCode {
  id?: string;
  orderCode: string;
  amount: number;
  passengerName: string;
  flightNumber: string;
  status: 'valid' | 'refunded';
  createdAt?: any;
  updatedAt?: any;
}

// --- Các hàm hỗ trợ dịch thuật ---

const translateRole = (role?: string) => {
  if (role === 'admin') return 'Quản trị viên';
  if (role === 'user') return 'Khách hàng';
  return role || '-';
};

const translateStatus = (status?: string) => {
  if (status === 'active') return 'Hoạt động';
  if (status === 'inactive') return 'Đã khóa';
  return status || '-';
};

const formatDate = (date: any, formatStr: string) => {
  if (!date) return '-';
  try {
    if (typeof date.toDate === 'function') {
      return format(date.toDate(), formatStr);
    }
    const d = new Date(date);
    if (!isNaN(d.getTime())) {
      return format(d, formatStr);
    }
  } catch (e) {
    console.error('Date formatting error:', e);
  }
  return '-';
};

// --- Các thành phần giao diện (Components) ---

const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50">
    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-2xl animate-spin shadow-lg shadow-blue-100"></div>
  </div>
);

const ChatBubble: React.FC<{ message: ChatMessage; isOwn: boolean; key?: any }> = ({ message, isOwn }) => (
  <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}>
    <div
      className={cn(
        'max-w-[75%] px-4 py-2.5 rounded-2xl text-sm',
        isOwn
          ? 'bg-blue-500 text-white rounded-br-md'
          : 'bg-gray-100 text-black rounded-bl-md'
      )}
    >
      {!isOwn && (
        <p className="text-[10px] font-semibold mb-1 opacity-70">{message.senderName}</p>
      )}
      <p className="break-words">{message.text}</p>
      <p className={`text-[10px] mt-1 ${isOwn ? 'text-blue-200' : 'text-gray-600'} text-right`}>
        {formatDate(message.timestamp, 'HH:mm')}
      </p>
    </div>
  </div>
);

const SkeletonRow: React.FC<{ cols?: number; key?: any }> = ({ cols = 5 }) => (
  <tr>
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} className="px-6 py-4">
        <div className="skeleton h-4 w-3/4"></div>
      </td>
    ))}
  </tr>
);

function NotificationBell({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="relative p-2.5 rounded-xl hover:bg-gray-100 transition-all duration-200 active:scale-95 group"
    >
      <Bell className="w-5 h-5 text-black group-hover:text-black transition-colors" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5
                       min-w-[18px] h-[18px] px-1
                       bg-rose-500 text-white text-[10px] font-bold
                       rounded-full flex items-center justify-center
                       pulse-glow">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}

const EmptyState = ({ message = 'Chưa có dữ liệu', icon }: { message?: string; icon?: React.ReactNode }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4 text-gray-600">
      {icon || <Ticket size={32} />}
    </div>
    <p className="text-gray-600 text-sm font-medium">{message}</p>
  </div>
);

const Button = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}) => {
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-100 hover:shadow-md hover:shadow-blue-200',
    secondary: 'bg-gray-100 text-black border border-gray-200 hover:bg-gray-200 shadow-sm',
    danger: 'bg-rose-500 text-white hover:bg-rose-600 shadow-sm shadow-rose-100 hover:shadow-md',
    ghost: 'bg-transparent text-black hover:bg-gray-100',
    outline: 'bg-transparent text-blue-600 border border-blue-200 hover:bg-blue-50',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-xs rounded-lg',
    md: 'px-4 py-2.5 rounded-lg',
    lg: 'px-6 py-3 rounded-xl text-base',
  };

  return (
    <button
      className={cn(
        'font-semibold transition-all active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  );
};

const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn('glass-card overflow-hidden', className)}>
    {children}
  </div>
);

const Badge = ({ status }: { status: RefundStatus | 'active' | 'inactive' | UserRole }) => {
  const styles: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    approved: 'bg-blue-50 text-blue-700 border-blue-200',
    processing: 'bg-violet-50 text-violet-700 border-violet-200',
    rejected: 'bg-rose-50 text-rose-700 border-rose-200',
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    inactive: 'bg-gray-100 text-black border-gray-200',
    admin: 'bg-violet-50 text-violet-700 border-violet-200',
    user: 'bg-gray-50 text-black border-gray-200',
  };

  const labels: Record<string, string> = {
    pending: 'Đang chờ duyệt',
    approved: 'Đã duyệt - Đang xử lý',
    processing: 'Đang chuyển tiền',
    rejected: 'Đã từ chối',
    completed: 'Hoàn tiền thành công',
    active: 'Hoạt động',
    inactive: 'Khóa',
    admin: 'Quản trị',
    user: 'Người dùng',
  };

  return (
    <span className={cn('px-2.5 py-0.5 rounded-2xl text-xs font-semibold border status-badge', styles[status as keyof typeof styles])}>
      {labels[status as keyof typeof labels] || status}
    </span>
  );
};

const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) => {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const visible = pages.slice(
    Math.max(0, currentPage - 3),
    Math.min(totalPages, currentPage + 2)
  );

  return (
    <div className="flex items-center justify-center gap-1 py-4">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-2 rounded-lg text-black hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        <ChevronLeft size={16} />
      </button>
      {currentPage > 3 && totalPages > 5 && (
        <>
          <button onClick={() => onPageChange(1)} className="px-3 py-1 rounded-lg text-xs font-medium text-black hover:bg-gray-100 transition-colors">1</button>
          <span className="px-1 text-gray-600">...</span>
        </>
      )}
      {visible.map(p => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          className={cn(
            'px-3 py-1 rounded-lg text-xs font-semibold transition-all min-w-[36px]',
            p === currentPage
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-100'
              : 'text-black hover:bg-gray-100'
          )}
        >
          {p}
        </button>
      ))}
      {currentPage < totalPages - 2 && totalPages > 5 && (
        <>
          <span className="px-1 text-gray-600">...</span>
          <button onClick={() => onPageChange(totalPages)} className="px-3 py-1 rounded-lg text-xs font-medium text-black hover:bg-gray-100 transition-colors">{totalPages}</button>
        </>
      )}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-2 rounded-lg text-black hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
};

// --- Thành phần chính (Main App) ---

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'requests' | 'settings' | 'audit' | 'chat' | 'bookings'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  // Giao diện hiện tại chỉ hỗ trợ chế độ sáng (Light mode)


  // Các trạng thái Chat
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [adminChatUserId, setAdminChatUserId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [newMessage, setNewMessage] = useState('');
  const [conversations, setConversations] = useState<{ userId: string; userName: string; lastMessage: string; lastTime: any; unread: number }[]>([]);
  const [chatToast, setChatToast] = useState<{ name: string; text: string } | null>(null);

  // Các trạng thái dữ liệu (Data states)
  const [allRequests, setAllRequests] = useState<RefundRequest[]>([]);
  const [myRequests, setMyRequests] = useState<RefundRequest[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [bookingCodes, setBookingCodes] = useState<BookingCode[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Lắng nghe trạng thái đăng nhập (Auth Listener)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setIsLoggingIn(true);
        setLoading(false);
        
        const profileRef = doc(db, 'users', firebaseUser.uid);
        const profileSnap = await getDoc(profileRef);

        if (profileSnap.exists()) {
          setProfile(profileSnap.data() as UserProfile);
        } else {
          const formattedPhone = firebaseUser.phoneNumber || firebaseUser.email?.split('_')[1]?.split('@')[0] || '';
          const newProfile: UserProfile = {
            uid: firebaseUser.uid,
            sdt: formattedPhone,
            displayName: firebaseUser.displayName || 'Người dùng ' + (formattedPhone.slice(-4) || 'mới'),
            email: firebaseUser.email || undefined,
            role: ['0999999999', '0383165313', '0968686868'].some(p => firebaseUser.email?.includes(p.replace('+', ''))) ? 'admin' : 'user',
            status: 'active',
            createdAt: serverTimestamp(),
          };
          await setDoc(profileRef, newProfile, { merge: true });
          setProfile(newProfile);
        }
      } else {
        setUser(null);
        setProfile(null);
        setIsLoggingIn(false);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Đã gỡ bỏ hiệu ứng chuyển chế độ tối (Chỉ dùng Light mode)


  // Lắng nghe dữ liệu thời gian thực (Real-time Listeners)
  useEffect(() => {
    if (!profile) return;

    let unsubRequests: () => void;
    let unsubUsers: () => void;
    let unsubAudit: () => void;
    let unsubBookings: () => void;

    setDataLoading(true);

    if (profile.role === 'admin') {
      const q = query(collection(db, 'refundRequests'), orderBy('createdAt', 'desc'));
      unsubRequests = onSnapshot(q, (snapshot) => {
        setAllRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RefundRequest)));
        setDataLoading(false);
      });

      const uq = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      unsubUsers = onSnapshot(uq, (snapshot) => {
        setAllUsers(snapshot.docs.map(doc => doc.data() as UserProfile));
      });

      const aq = query(collection(db, 'adminAuditLog'), orderBy('timestamp', 'desc'));
      unsubAudit = onSnapshot(aq, (snapshot) => {
        setAuditLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditLog)));
      });

      const bq = query(collection(db, 'basedata'), orderBy('orderCode', 'asc'));
      unsubBookings = onSnapshot(bq, (snapshot) => {
        setBookingCodes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BookingCode)));
      });
    } else {
      const q = query(
        collection(db, 'refundRequests'),
        where('userId', '==', profile.uid),
        orderBy('createdAt', 'desc')
      );
      unsubRequests = onSnapshot(q, (snapshot) => {
        setMyRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RefundRequest)));
        setDataLoading(false);
      });
    }

    return () => {
      unsubRequests?.();
      unsubUsers?.();
      unsubAudit?.();
      unsubBookings?.();
    };
  }, [profile]);

  // Lắng nghe tin nhắn Chat
  useEffect(() => {
    if (!profile) return;

    const constraints: any[] = [];
    if (profile.role !== 'admin') {
      constraints.push(where('userId', '==', profile.uid));
    }
    constraints.push(orderBy('timestamp', 'asc'));

    const q = query(collection(db, 'chats'), ...constraints);

    const unsubChat = onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
      setChatMessages(messages);

      const unread = messages.filter(m => !m.isRead && m.senderId !== profile.uid);
      setUnreadCount(unread.length);

      // Xây dựng danh sách cuộc trò chuyện cho admin
      if (profile.role === 'admin') {
        const convMap = new Map<string, { userId: string; userName: string; lastMessage: string; lastTime: any; unread: number }>();

        snapshot.docs.forEach(doc => {
          const data = doc.data();
          const uid = data.userId as string;
          if (!convMap.has(uid)) {
            convMap.set(uid, {
              userId: uid,
              userName: (data.senderRole !== 'admin' ? data.senderName : '') || 'Khách hàng',
              lastMessage: data.text || '',
              lastTime: data.timestamp,
              unread: 0
            });
          }
          const conv = convMap.get(uid)!;
          // Cập nhật userName nếu tìm thấy tin nhắn từ user (không phải admin)
          if (data.senderRole !== 'admin' && data.senderName && conv.userName === 'Khách hàng') {
            conv.userName = data.senderName;
          }
          // Cập nhật lastMessage và lastTime nếu tin nhắn mới hơn
          if (data.timestamp && (!conv.lastTime || (data.timestamp.toDate?.() > conv.lastTime.toDate?.()))) {
            conv.lastMessage = data.text || '';
            conv.lastTime = data.timestamp;
          }
          // Đếm unread
          if (!data.isRead && data.senderId !== profile.uid) {
            conv.unread++;
          }
        });

        setConversations(Array.from(convMap.values()).sort((a, b) => {
          const timeA = a.lastTime?.toDate?.()?.getTime() || 0;
          const timeB = b.lastTime?.toDate?.()?.getTime() || 0;
          return timeB - timeA;
        }));
      }

      // Toast notification khi có tin nhắn mới từ người khác
      if (messages.length > 0 && !isChatOpen) {
        const lastMsg = messages[messages.length - 1];
        if (lastMsg.senderId !== profile.uid) {
          setChatToast({ name: lastMsg.senderName, text: lastMsg.text });
          setTimeout(() => setChatToast(null), 4000);
        }
      }
    });

    return () => unsubChat();
  }, [profile, adminChatUserId, isChatOpen]);

  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginSuccess, setLoginSuccess] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user && messaging) {
      const requestPermission = async () => {
        try {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            const token = await getToken(messaging, {
              vapidKey: import.meta.env.VITE_FCM_VAPID_KEY
            });
            if (token) {
              await updateDoc(doc(db, 'users', user.uid), { fcmToken: token });
            }
          }
        } catch (error) {
          console.error('Error getting FCM token:', error);
        }
      };
      requestPermission();
    }
  }, [user]);

  const formatPhone = (phone: string) => {
    if (phone.trim().toLowerCase() === 'admin') return 'Admin';
    let f = phone.replace(/[^0-9]/g, ''); // Xóa tất cả ký tự không phải số
    if (!f) return phone.trim();
    if (f.startsWith('84')) f = '0' + f.substring(2);
    else if (!f.startsWith('0')) f = '0' + f;
    return f;
  };

  const getMockEmail = (phone: string) => {
    if (phone === 'Admin') return 'admin@aerorefund.com';
    return `phone_${phone}@aerorefund.com`;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoading(true);

    if (!phoneNumber.trim()) {
      setLoginError('Vui lòng nhập số điện thoại.');
      setIsLoading(false);
      return;
    }

    if (!password) {
      setLoginError('Vui lòng nhập mật khẩu.');
      setIsLoading(false);
      return;
    }

    const formattedPhone = formatPhone(phoneNumber);
    const mockEmail = getMockEmail(formattedPhone);

    try {
      const result = await signInWithEmailAndPassword(auth, mockEmail, password);
      const firebaseUser = result.user;

      // Cập nhật state ngay lập tức, không chờ onAuthStateChanged
      setUser(firebaseUser);
      const profileRef = doc(db, 'users', firebaseUser.uid);
      const profileSnap = await getDoc(profileRef);
      if (profileSnap.exists()) {
        setProfile(profileSnap.data() as UserProfile);
      } else {
        const newProfile: UserProfile = {
          uid: firebaseUser.uid,
          sdt: formattedPhone,
          displayName: firebaseUser.displayName || 'Người dùng mới',
          email: firebaseUser.email || undefined,
          role: ['0999999999', '0383165313', '0968686868'].some(p => firebaseUser.email?.includes(p)) ? 'admin' : 'user',
          status: 'active',
          createdAt: serverTimestamp(),
        };
        await setDoc(profileRef, newProfile, { merge: true });
        setProfile(newProfile);
      }
      setPhoneNumber('');
      setPassword('');
      setIsLoading(false);
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential' || error.code === 'auth/invalid-login-credentials' || error.code === 'auth/wrong-password') {
        setLoginError('Mật khẩu không chính xác hoặc tài khoản không tồn tại.');
      } else if (error.code === 'auth/too-many-requests') {
        setLoginError('Quá nhiều yêu cầu. Vui lòng thử lại sau.');
      } else {
        setLoginError('Đăng nhập thất bại. Vui lòng thử lại sau.');
      }
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoading(true);

    if (!displayName.trim()) {
      setLoginError('Vui lòng nhập họ và tên.');
      setIsLoading(false);
      return;
    }

    if (!phoneNumber.trim()) {
      setLoginError('Vui lòng nhập số điện thoại.');
      setIsLoading(false);
      return;
    }

    if (!password || password.length < 6) {
      setLoginError('Mật khẩu phải có ít nhất 6 ký tự.');
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setLoginError('Mật khẩu xác nhận không khớp.');
      setIsLoading(false);
      return;
    }

    const formattedPhone = formatPhone(phoneNumber);
    const mockEmail = getMockEmail(formattedPhone);
    const isAdmin = formattedPhone === '0999999999' || formattedPhone === '0383165313' || formattedPhone === '0968686868';

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, mockEmail, password);
      await updateProfile(userCredential.user, { displayName: displayName.trim() });

      const profileRef = doc(db, 'users', userCredential.user.uid);
      await setDoc(profileRef, {
        uid: userCredential.user.uid,
        sdt: formattedPhone,
        displayName: displayName.trim(),
        role: isAdmin ? 'admin' : 'user',
        status: 'active',
        createdAt: serverTimestamp(),
      });

      setPhoneNumber('');
      setPassword('');
      setConfirmPassword('');
      setDisplayName('');
      setAuthMode('login');
      setLoginSuccess('Đăng ký tài khoản thành công! Vui lòng đăng nhập.');
      setTimeout(() => setLoginSuccess(null), 5000);
    } catch (error: any) {
      console.error('Register error:', error);
      if (error.code === 'auth/email-already-in-use') {
        setLoginError('Số điện thoại này đã được đăng ký.');
      } else {
        setLoginError('Đăng ký thất bại. Vui lòng kiểm tra lại thông tin.');
      }
    }
    setIsLoading(false);
  };

  const handleLogout = () => signOut(auth);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !profile) return;

    try {
      await addDoc(collection(db, 'chats'), {
        userId: profile.role === 'admin' ? (adminChatUserId || profile.uid) : profile.uid,
        senderId: profile.uid,
        senderName: profile.displayName,
        senderRole: profile.role,
        text: newMessage.trim(),
        timestamp: serverTimestamp(),
        isRead: false
      });
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // Đánh dấu tin nhắn đã đọc
  const handleMarkMessagesAsRead = async (messageIds: string[]) => {
    try {
      const batch = writeBatch(db);
      messageIds.forEach(id => {
        const docRef = doc(db, 'chats', id);
        batch.update(docRef, { isRead: true });
      });
      await batch.commit();
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  // Xử lý chọn cuộc trò chuyện (Admin)
  const handleSelectConversation = (userId: string) => {
    setAdminChatUserId(userId);
  };

  // Xử lý quay lại danh sách cuộc trò chuyện (Admin)
  const handleBackToConversations = () => {
    setAdminChatUserId(null);
  };

  if (loading) return <LoadingSpinner />;

  if (!user) {
    return (
      <motion.div
        className="min-h-screen bg-gray-50 flex"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        {/* Cột trái - Thương hiệu & Hình ảnh */}
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-blue-50 border-r border-gray-200">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-800 via-blue-900 to-[#0a0a0f] opacity-95 z-0"></div>
          {/* Vòng tròn trang trí */}
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-blue-400 blur-3xl opacity-15 z-0"></div>
          <div className="absolute top-1/2 right-1/4 w-64 h-64 rounded-full bg-emerald-400 blur-3xl opacity-10 z-0"></div>

          <div className="relative z-10 flex flex-col justify-between p-16 w-full h-full text-white">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-2xl border border-white/20">
                <Plane className="text-white w-6 h-6" />
              </div>
              <span className="text-2xl font-bold tracking-tight">AeroRefund</span>
            </div>

            <div className="space-y-6">
              <h1 className="text-5xl font-extrabold tracking-tight leading-tight">
                Hoàn vé máy bay <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-blue-100">nhanh chóng & hiệu quả</span>
              </h1>
              <p className="text-lg text-blue-100/80 max-w-md">
                Trải nghiệm hệ thống xử lý hoàn tiền vé máy bay tự động, minh bạch và an toàn tuyệt đối.
              </p>
            </div>

            <div className="flex items-center gap-4 text-sm text-blue-200/60 font-medium">
              <ShieldCheck size={20} />
              <span>Bảo mật chuẩn quốc tế và an toàn dữ liệu cá nhân</span>
            </div>
          </div>
        </div>

        {/* Cột phải - Form đăng nhập/đăng ký */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 relative overflow-hidden">
          {/* Hình nền mờ cho di động */}
          <div className="lg:hidden absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-blue-50 to-transparent /20 z-0"></div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-full max-w-[420px] relative z-10"
          >
            <div className="lg:hidden flex justify-center mb-8">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/30">
                <Plane className="text-white w-8 h-8" />
              </div>
            </div>

            <div className="text-center lg:text-left mb-8 space-y-2">
              <h2 className="text-3xl font-bold text-black  tracking-tight">
                {authMode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
              </h2>
              <p className="text-black ">
                {authMode === 'login' ? 'Chào mừng bạn quay lại với hệ thống.' : 'Bắt đầu sử dụng bằng cách đăng ký.'}
              </p>
            </div>

            <Card className="p-8 shadow-xl shadow-gray-200/50  border border-gray-200/60 ">

              {loginError && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 text-sm font-medium text-rose-600 bg-rose-50 /10 border border-rose-100 /20 rounded-xl flex items-center gap-3">
                  <AlertTriangle size={16} className="shrink-0" />
                  {loginError}
                </motion.div>
              )}

              {loginSuccess && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 text-sm font-medium text-emerald-600 bg-emerald-50 /10 border border-emerald-100 /20 rounded-xl flex items-center gap-3">
                  <CheckCircle2 size={16} className="shrink-0" />
                  {loginSuccess}
                </motion.div>
              )}

              {authMode === 'login' ? (
                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="space-y-1.5 focus-within:text-blue-600 transition-colors">
                    <label className="text-xs font-bold text-black  uppercase tracking-wider">Số điện thoại / Tên đăng nhập</label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        className={cn(
                          "w-full px-4 py-3 border border-gray-200  rounded-xl text-sm bg-gray-50/50 /50 focus:bg-white :bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 placeholder:text-gray-600 :text-black  font-medium"
                        )}
                        placeholder="098 888 ...."
                        value={phoneNumber}
                        onChange={e => setPhoneNumber(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5 focus-within:text-blue-600 transition-colors">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-black  uppercase tracking-wider">Mật khẩu</label>
                      <a href="#" className="text-xs font-medium text-blue-600  hover:text-blue-700 transition-colors">Quên mật khẩu?</a>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        className="w-full px-4 py-3 border border-gray-200  rounded-xl text-sm bg-gray-50/50 /50 focus:bg-white :bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 placeholder:text-gray-600 pr-10"
                        placeholder="••••••••"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full py-3.5 mt-2 rounded-xl text-sm font-bold text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30" disabled={isLoading}>
                    {isLoading ? <><Loader2 size={18} className="animate-spin" /> Đang đăng nhập...</> : 'Đăng nhập'}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleRegister} className="space-y-5">
                  <div className="space-y-1.5 focus-within:text-blue-600 transition-colors">
                    <label className="text-xs font-bold text-black  uppercase tracking-wider">Họ Tên</label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-3 border border-gray-200  rounded-xl text-sm bg-gray-50/50 /50 focus:bg-white :bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 placeholder:text-gray-600 :text-black  font-medium"
                      placeholder="Nguyễn Văn A"
                      value={displayName}
                      onChange={e => setDisplayName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5 focus-within:text-blue-600 transition-colors">
                    <label className="text-xs font-bold text-black  uppercase tracking-wider">Số ĐT (Số điện thoại)</label>
                    <div className="relative">
                      <input
                        type="tel"
                        required
                        className="w-full px-4 py-3 border border-gray-200  rounded-xl text-sm bg-gray-50/50 /50 focus:bg-white :bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 placeholder:text-gray-600 :text-black  font-medium"
                        placeholder="0912 345 678"
                        value={phoneNumber}
                        onChange={e => setPhoneNumber(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5 focus-within:text-blue-600 transition-colors">
                    <label className="text-xs font-bold text-black  uppercase tracking-wider">Mật khẩu</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        minLength={6}
                        className="w-full px-4 py-3 border border-gray-200  rounded-xl text-sm bg-gray-50/50 /50 focus:bg-white :bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 placeholder:text-gray-600 :text-black  pr-10"
                        placeholder="Ít nhất 6 ký tự"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5 focus-within:text-blue-600 transition-colors">
                    <label className="text-xs font-bold text-black  uppercase tracking-wider">Xác nhận mật khẩu</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        minLength={6}
                        className="w-full px-4 py-3 border border-gray-200  rounded-xl text-sm bg-gray-50/50 /50 focus:bg-white :bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 placeholder:text-gray-600 :text-black  pr-10"
                        placeholder="Nhập lại mật khẩu"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full py-3.5 mt-2 rounded-xl text-sm font-bold text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30" disabled={isLoading}>
                    {isLoading ? <><Loader2 size={18} className="animate-spin" /> Đang đăng ký...</> : 'Đăng ký'}
                  </Button>
                </form>
              )}

              <div className="mt-8 pt-6 border-t border-gray-100  text-center">
                <button
                  type="button"
                  onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setPhoneNumber(''); setPassword(''); setConfirmPassword(''); setDisplayName(''); setShowPassword(false); setShowConfirmPassword(false); }}
                  className="text-black  hover:text-black :text-white transition-colors text-sm font-medium"
                >
                  {authMode === 'login' ? 'Chưa có tài khoản? Đăng ký ngay' : 'Đã có tài khoản? Đăng nhập'}
                </button>
              </div>
            </Card>

            <p className="mt-8 text-center text-xs text-gray-600  max-w-xs mx-auto">
              Bằng cách tiếp tục, bạn đồng ý với Điều khoản dịch vụ và Chính sách bảo mật của chúng tôi.
            </p>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="min-h-screen bg-gray-50 flex"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {/* Thanh điều hướng bên (Sidebar) */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-200 text-black transition-all duration-200 shadow-2xl lg:shadow-none lg:relative lg:translate-x-0 flex flex-col",
          !isSidebarOpen && "-translate-x-full"
        )}
      >
        <div className="h-full flex flex-col">
          <div className="p-6 flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/30">
              <Plane className="text-white w-5 h-5" />
            </div>
            <span className="text-white font-bold text-lg tracking-tight">AeroRefund</span>
          </div>

          <nav className="flex-1 px-4 space-y-1">
            <SidebarItem
              icon={<LayoutDashboard size={20} />}
              label="Tổng quan"
              active={activeTab === 'dashboard'}
              onClick={() => setActiveTab('dashboard')}
            />
            {profile?.role === 'admin' && (
              <>
                <SidebarItem
                  icon={<Users size={20} />}
                  label="Quản lý User"
                  active={activeTab === 'users'}
                  onClick={() => setActiveTab('users')}
                />
                <SidebarItem
                  icon={<Ticket size={20} />}
                  label="Yêu cầu hoàn vé"
                  active={activeTab === 'requests'}
                  onClick={() => setActiveTab('requests')}
                />
                <SidebarItem
                  icon={<ShieldCheck size={20} />}
                  label="Nhật ký Admin"
                  active={activeTab === 'audit'}
                  onClick={() => setActiveTab('audit')}
                />
                <SidebarItem
                  icon={<TicketCheck size={20} />}
                  label="Mã đặt chỗ"
                  active={activeTab === 'bookings'}
                  onClick={() => setActiveTab('bookings')}
                />
              </>
            )}
            {profile?.role === 'user' && (
              <SidebarItem
                icon={<Ticket size={20} />}
                label="Hoàn tiền"
                active={activeTab === 'requests'}
                onClick={() => setActiveTab('requests')}
              />
            )}
            <SidebarItem
              icon={<Settings size={20} />}
              label="Cài đặt tài khoản"
              active={activeTab === 'settings'}
              onClick={() => setActiveTab('settings')}
            />
            <button
              onClick={() => setIsChatOpen(!isChatOpen)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 relative",
                isChatOpen
                  ? "bg-blue-500 text-white shadow-md shadow-blue-200"
                  : "bg-gray-50 text-gray-600 hover:bg-blue-50 hover:text-blue-600 active:scale-[0.98] border border-gray-200"
              )}
            >
              <MessageCircle size={20} />
              <span className="font-medium">Chat hỗ trợ</span>
              {unreadCount > 0 && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 min-w-[20px] h-5 px-1.5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          </nav>

          <div className="p-4 border-t border-gray-200/50">
            <div className="flex items-center gap-3 mb-4 px-2">
              <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center border border-gray-700 shadow-md">
                {user.photoURL ? (
                  <img src={user.photoURL} className="w-full h-full rounded-xl" alt="Avatar" referrerPolicy="no-referrer" />
                ) : (
                  <UserIcon size={20} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{profile?.displayName}</p>
                <p className="text-xs text-gray-500 truncate">{profile?.phoneNumber || (profile?.email?.startsWith('phone_') ? profile?.displayName : profile?.email)}</p>
              </div>
            </div>
            <Button variant="ghost" className="w-full justify-start text-gray-600 hover:text-gray-900" onClick={handleLogout}>
              <LogOut size={18} />
              Đăng xuất
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-14 bg-white/95 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-40 border-b border-gray-200 shadow-sm"
          style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
          <div className="flex items-center gap-4">
            <button className="lg:hidden text-black hover:bg-gray-100 p-2 rounded-lg transition-colors" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
              {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <h2 className="text-lg font-bold text-black capitalize tracking-tight">
              {activeTab === 'dashboard' ? 'Tổng quan chuyến bay' :
                activeTab === 'users' ? 'Quản lý người dùng' :
                  activeTab === 'requests' ? (profile?.role === 'admin' ? 'Yêu cầu hoàn vé' : 'Hoàn tiền') :
                    activeTab === 'audit' ? 'Nhật ký Admin' :
                      activeTab === 'bookings' ? 'Quản lý mã đặt chỗ' :
                        'Cài đặt tài khoản'}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-50 backdrop-blur-sm rounded-2xl text-xs font-medium text-black border border-gray-200">
              <Clock size={14} />
              {format(new Date(), 'dd/MM/yyyy')}
            </div>
            {/* Theme toggle removed */}
            <button
              onClick={() => setIsChatOpen(!isChatOpen)}
              className="relative p-2.5 rounded-xl hover:bg-gray-100 transition-all duration-200 active:scale-95"
              title="Chat hỗ trợ"
            >
              <MessageCircle size={18} className="text-black" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Vùng nội dung có thể cuộn (Scrollable Area) */}
        <motion.div
          className="flex-1 overflow-y-auto p-4 sm:p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {!profile ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                  </div>
                ) : profile.role === 'admin' ? (
                  <AdminDashboard requests={allRequests} users={allUsers} />
                ) : (
                  <UserDashboard requests={myRequests} profile={profile} isLoading={dataLoading} isDashboard={true} />
                )}
              </motion.div>
            )}

            {activeTab === 'users' && profile?.role === 'admin' && (
              <motion.div
                key="users"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <UserManagement users={allUsers} allRequests={allRequests} profile={profile!} isLoading={dataLoading} onChatWithUser={(uid) => { setAdminChatUserId(uid); setIsChatOpen(true); }} />
              </motion.div>
            )}

            {activeTab === 'requests' && (
              <motion.div
                key="requests"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                {profile?.role === 'admin' ? (
                  <RefundRequestManagement requests={allRequests} isLoading={dataLoading} />
                ) : (
                  <UserDashboard requests={myRequests} profile={profile!} isLoading={dataLoading} isDashboard={false} />
                )}
              </motion.div>
            )}

            {activeTab === 'audit' && profile?.role === 'admin' && (
              <motion.div
                key="audit"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <AuditLogView logs={auditLogs} />
              </motion.div>
            )}

            {activeTab === 'bookings' && profile?.role === 'admin' && (
              <motion.div
                key="bookings"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <AdminBookingManagement codes={bookingCodes} />
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <ProfileSettings profile={profile!} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </main>

      {/* Bảng Chat (Chat Panel) */}
      <AnimatePresence>
        {isChatOpen && (
          <ChatPanel
            messages={profile?.role === 'admin' && adminChatUserId ? chatMessages.filter(m => m.userId === adminChatUserId) : chatMessages}
            currentUser={profile!}
            onSendMessage={handleSendMessage}
            newMessage={newMessage}
            onNewMessageChange={setNewMessage}
            onClose={() => setIsChatOpen(false)}
            onMarkAsRead={handleMarkMessagesAsRead}
            adminChatUserId={adminChatUserId}
            onSelectConversation={handleSelectConversation}
            conversations={conversations}
            isAdminView={profile?.role === 'admin'}
            onBack={handleBackToConversations}
          />
        )}
      </AnimatePresence>

      {/* Toast notification khi có tin nhắn mới */}
      {chatToast && !isChatOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20, x: 0 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-24 right-6 bg-white rounded-2xl shadow-xl shadow-gray-300/50 p-4 z-[90] max-w-[300px] border border-gray-100"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
              <MessageCircle size={18} className="text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-black">{chatToast.name}</p>
              <p className="text-xs text-gray-500 mt-0.5 truncate">{chatToast.text}</p>
            </div>
            <button
              onClick={() => { setChatToast(null); setIsChatOpen(true); }}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium shrink-0"
            >
              Trả lời
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

// --- Các thành phần con (Sub-components) ---

function SidebarItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
        active
          ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm shadow-blue-900/20"
          : "text-gray-600 hover:bg-white/10 hover:text-gray-200 hover:backdrop-blur-sm active:scale-[0.98]"
      )}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  );
}

// --- Các thành phần cho Người dùng (User Components) ---

function AnimatedStatCard({ label, value, icon, accent = 'blue' }: { label: string; value: string | number; icon: React.ReactNode; accent?: 'blue' | 'amber' | 'emerald' | 'rose' | 'violet' }) {
  const accentColors = {
    blue: 'bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600 shadow-sm shadow-blue-200/50',
    amber: 'bg-gradient-to-br from-amber-50 to-amber-100 text-amber-600 shadow-sm shadow-amber-200/50',
    emerald: 'bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-600 shadow-sm shadow-emerald-200/50',
    rose: 'bg-gradient-to-br from-rose-50 to-rose-100 text-rose-600 shadow-sm shadow-rose-200/50',
    violet: 'bg-gradient-to-br from-violet-50 to-violet-100 text-violet-600 shadow-sm shadow-violet-200/50',
  };

  return (
    <div className="glass-card p-4 hover-lift cursor-default group">
      <div className="flex items-center justify-between mb-2">
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", accentColors[accent])}>
          {React.cloneElement(icon as React.ReactElement, { size: 16 })}
        </div>
      </div>
      <p className="text-xs font-medium text-gray-600">{label}</p>
      <div key={String(value)} className="animate-count">
        <h3 className="text-xl font-bold text-black mt-0.5 tracking-tight">{value}</h3>
      </div>
    </div>
  );
}

function UserDashboard({ requests, profile, isLoading, isDashboard }: { requests: RefundRequest[]; profile: UserProfile; isLoading?: boolean; isDashboard: boolean }) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [pnrSearch, setPnrSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<RefundStatus | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRequest, setSelectedRequest] = useState<RefundRequest | null>(null);
  const itemsPerPage = 10;

  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      const statusMatch = statusFilter === 'all' || r.status === statusFilter;
      const pnrMatch = pnrSearch === '' || r.orderCode.toLowerCase().includes(pnrSearch.toLowerCase());
      return statusMatch && pnrMatch;
    });
  }, [requests, statusFilter, pnrSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / itemsPerPage));
  const paginatedRequests = filteredRequests.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => { setCurrentPage(1); }, [pnrSearch, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-black">Chào mừng, {profile.displayName}</h1>
          <p className="text-sm text-gray-600">Theo dõi và tạo yêu cầu hoàn tiền vé máy bay của bạn.</p>
        </div>
        {!isDashboard && (
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus size={20} />
            Tạo yêu cầu mới
          </Button>
        )}
      </div>

      {!isDashboard && isFormOpen && (
        <div className="mb-8">
          <RefundRequestForm onClose={() => setIsFormOpen(false)} profile={profile} />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <AnimatedStatCard
          label="Tổng yêu cầu"
          value={requests.length}
          icon={<Ticket className="text-blue-600" />}
          accent="blue"
        />
        <AnimatedStatCard
          label="Đang chờ xử lý"
          value={requests.filter(r => r.status === 'pending' || r.status === 'approved').length}
          icon={<Clock className="text-amber-600" />}
          accent="amber"
        />
        <AnimatedStatCard
          label="Đang chuyển tiền"
          value={requests.filter(r => r.status === 'processing').length}
          icon={<RefreshCw className="text-violet-600" />}
          accent="violet"
        />
        <AnimatedStatCard
          label="Đã hoàn tất"
          value={requests.filter(r => r.status === 'completed').length}
          icon={<CheckCircle2 className="text-emerald-600" />}
          accent="emerald"
        />
      </div>

      <Card>
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="font-bold text-black tracking-tight">
            {isDashboard ? 'Yêu cầu gần đây' : 'Lịch sử yêu cầu'}
          </h3>
          {!isDashboard && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={14} />
                <input
                  type="text"
                  placeholder="Tìm theo mã PNR..."
                  value={pnrSearch}
                  onChange={e => setPnrSearch(e.target.value)}
                  className="pl-9 pr-3 py-1.5 text-xs border border-gray-200 rounded-xl bg-white/80 focus:bg-white
                    outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400
                    transition-all duration-200 placeholder:text-gray-600 w-44"
                />
              </div>
              {(['all', 'pending', 'approved', 'processing', 'completed', 'rejected'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={cn(
                    'px-3 py-1.5 text-xs font-semibold rounded-xl transition-all duration-200',
                    statusFilter === f
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm shadow-blue-200 active:scale-[0.97]'
                      : 'bg-gray-50/80 backdrop-blur-sm text-black hover:bg-gray-100 border border-gray-200/60'
                  )}
                >
                  {f === 'all' ? 'Tất cả' : f === 'pending' ? 'Chờ duyệt' : f === 'approved' ? 'Đã duyệt' : f === 'processing' ? 'Đang chuyển tiền' : f === 'completed' ? 'Hoàn tất' : 'Từ chối'}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/80 text-gray-600 text-[11px] uppercase tracking-widest font-semibold border-b border-gray-200/60">
                <th className="px-6 py-4">Mã PNR</th>
                <th className="px-6 py-4">Ngân hàng nhận</th>
                <th className="px-6 py-4">Số tiền hoàn</th>
                <th className="px-6 py-4">Mã phiếu</th>
                <th className="px-6 py-4">Ngày yêu cầu</th>
                <th className="px-6 py-4">Trạng thái</th>
                <th className="px-6 py-4 text-center">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100/50">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} cols={7} />)
              ) : (isDashboard ? requests.slice(0, 5) : paginatedRequests).length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      message={isDashboard ? 'Chưa có yêu cầu nào' : (pnrSearch || statusFilter !== 'all'
                        ? 'Không tìm thấy yêu cầu phù hợp'
                        : 'Chưa có yêu cầu nào')}
                      icon={<Ticket size={32} />}
                    />
                  </td>
                </tr>
              ) : (
                (isDashboard ? requests.slice(0, 5) : paginatedRequests).map(req => (
                  <tr key={req.id} className="hover:bg-gray-50/60 transition-colors duration-150">
                    <td className="px-6 py-4 font-semibold text-black">
                      {req.isVisible !== false ? req.orderCode : <span className="flex items-center gap-1.5 text-gray-400 font-medium italic"><ShieldAlert size={12} /> Đang bảo mật</span>}
                    </td>
                    <td className="px-6 py-4 text-black">
                      <div className="flex flex-col">
                        <span className="font-medium">{req.isVisible !== false ? req.bankName : '****************'}</span>
                        <span className="text-xs text-gray-600">{req.isVisible !== false ? req.accountNumber : '**********'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-black">
                      {req.isVisible !== false 
                        ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(req.amount)
                        : <span className="text-gray-400 italic">Đang chờ...</span>
                      }
                    </td>
                    <td className="px-6 py-4">
                      {req.isVisible !== false && req.refundSlipCode ? (
                        <span className="text-xs font-semibold text-violet-600 bg-violet-50 px-2 py-1 rounded-lg">
                          {req.refundSlipCode}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-black text-sm">
                      {req.createdAt ? format(req.createdAt.toDate(), 'dd/MM/yyyy HH:mm') : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <Badge status={req.status} />
                        {req.isVisible !== false && req.adminNote && (
                          <span className="mt-1 text-[10px] text-gray-600 italic leading-tight max-w-[150px]">
                            {req.adminNote}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => setSelectedRequest(req)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-xl transition-all active:scale-95"
                        title="Xem chi tiết"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View - Card Layout */}
        <div className="md:hidden divide-y divide-gray-100">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-4 space-y-3">
                <div className="skeleton h-4 w-1/2"></div>
                <div className="skeleton h-3 w-3/4"></div>
                <div className="skeleton h-5 w-1/4"></div>
              </div>
            ))
          ) : (isDashboard ? requests.slice(0, 5) : paginatedRequests).length === 0 ? (
            <div className="py-12 px-4">
              <EmptyState
                message={isDashboard ? 'Chưa có yêu cầu nào' : (pnrSearch || statusFilter !== 'all'
                  ? 'Không tìm thấy yêu cầu phù hợp'
                  : 'Chưa có yêu cầu nào')}
                icon={<Ticket size={28} />}
              />
            </div>
          ) : (
            (isDashboard ? requests.slice(0, 5) : paginatedRequests).map(req => (
              <div key={req.id} className="p-4 active:bg-gray-50 transition-colors" onClick={() => setSelectedRequest(req)}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Mã PNR</span>
                    <span className="font-bold text-black">{req.isVisible !== false ? req.orderCode : 'PNR-******'}</span>
                  </div>
                  <Badge status={req.status} />
                </div>
                
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-gray-600 font-medium">
                      <CreditCard size={12} className="text-gray-400" />
                      <span>{req.isVisible !== false ? req.bankName : '****************'}</span>
                    </div>
                    <div className="text-[11px] text-gray-400 font-medium ml-5">
                      {req.isVisible !== false ? req.accountNumber : '**********'}
                    </div>
                    <div className="text-[10px] text-gray-400 font-medium flex items-center gap-2 ml-5">
                      <Clock size={10} />
                      {req.createdAt ? format(req.createdAt.toDate(), 'dd/MM/yyyy HH:mm') : '-'}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-blue-600">
                      {req.isVisible !== false 
                        ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(req.amount)
                        : <span className="text-gray-400 italic text-[10px]">Đang chờ...</span>
                      }
                    </p>
                    <button className="text-[10px] font-bold text-blue-500 uppercase flex items-center gap-1 ml-auto mt-1">
                      Chi tiết <ChevronRight size={10} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {!isLoading && !isDashboard && filteredRequests.length > itemsPerPage && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        )}
      </Card>

      <AnimatePresence>
        {!isDashboard && isFormOpen && (
          <RefundRequestForm onClose={() => setIsFormOpen(false)} profile={profile} />
        )}
        {selectedRequest && (
          <UserRequestDetailModal
            request={selectedRequest}
            onClose={() => setSelectedRequest(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function UserRequestDetailModal({ request, onClose }: { request: RefundRequest; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-md"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-lg lg:max-w-xl glass-card shadow-2xl overflow-hidden flex flex-col max-h-[90vh] sm:max-h-auto"
      >
        <div className="p-4 sm:p-6 border-b border-gray-100/60 flex items-center justify-between bg-gray-50/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
              <TicketCheck size={18} className="sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-black">Chi tiết yêu cầu hoàn vé</h3>
              <p className="text-[10px] sm:text-xs text-black">Mã đặt chỗ (PNR): <span className="font-semibold">{request.isVisible !== false ? request.orderCode : 'PNR-******'}</span></p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-gray-600 hover:text-black hover:bg-gray-100 transition-all active:scale-95"><X size={20} className="sm:w-6 sm:h-6" /></button>
        </div>
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto relative">
          {request.isVisible === false && (
            <div className="absolute inset-0 z-20 bg-white/80 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-center">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4 animate-pulse">
                <ShieldAlert size={32} />
              </div>
              <h4 className="text-lg font-bold text-black mb-2">Thông tin đang được bảo mật</h4>
              <p className="text-sm text-gray-600 max-w-[280px]">Hệ thống đang kiểm tra yêu cầu của bạn. Thông tin chi tiết sẽ được hiển thị sau khi Admin phê duyệt.</p>
            </div>
          )}
          
          <div className="flex items-center justify-center mb-2">
            <Badge status={request.status} />
          </div>

          {request.isVisible !== false && request.refundSlipCode && (
            <div className="bg-violet-50 border border-violet-100 rounded-xl p-4 text-center">
              <p className="text-[10px] font-bold text-violet-600 uppercase tracking-wider mb-1">Mã phiếu hoàn tiền</p>
              <p className="text-lg font-bold text-violet-700">{request.refundSlipCode}</p>
            </div>
          )}

          {request.refundReason && (
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <p className="text-xs font-bold text-black uppercase tracking-wider">Lý do yêu cầu</p>
              <div className="flex justify-between">
                <span className="text-sm text-black">Lý do hoàn:</span>
                <span className="font-medium text-sm text-black">{request.refundReason}</span>
              </div>
            </div>
          )}

          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <p className="text-xs font-bold text-black uppercase tracking-wider">Thông tin nhận tiền</p>
            <div className="flex justify-between">
              <span className="text-sm text-black">Ngân hàng:</span>
              <span className="font-semibold text-sm text-black">{request.isVisible !== false ? request.bankName : '****************'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-black">Số tài khoản:</span>
              <span className="font-semibold text-sm text-black">{request.isVisible !== false ? request.accountNumber : '**********'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-black">Chủ tài khoản:</span>
              <span className="font-semibold text-sm text-black uppercase">{request.isVisible !== false ? request.accountHolder : '**********'}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-black uppercase mb-1">Số tiền hoàn</p>
              <p className="text-lg font-bold text-blue-600">
                {request.isVisible !== false 
                  ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(request.amount)
                  : '***.*** đ'
                }
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-black uppercase mb-1">Ngày tạo</p>
              <p className="text-sm font-semibold text-black">
                {request.createdAt ? format(request.createdAt.toDate(), 'dd/MM/yyyy HH:mm') : '-'}
              </p>
            </div>
          </div>

          {request.isVisible !== false && request.transferNote && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
              <p className="text-xs font-bold text-amber-600 uppercase mb-1">Ghi chú chuyển khoản</p>
              <p className="text-sm text-black">{request.transferNote}</p>
            </div>
          )}

          {request.adminNote && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <p className="text-xs font-bold text-blue-600 uppercase mb-1">Ghi chú từ Admin</p>
              <p className="text-sm text-black">{request.adminNote}</p>
            </div>
          )}

          {request.status === 'pending' && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
              <Clock size={20} className="text-amber-600 mx-auto mb-1" />
              <p className="text-sm font-semibold text-amber-700">Yêu cầu đang chờ duyệt</p>
              <p className="text-xs text-amber-600 mt-1">Bạn sẽ nhận được thông báo khi có cập nhật.</p>
            </div>
          )}
          {request.status === 'approved' && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
              <CheckCircle2 size={20} className="text-blue-600 mx-auto mb-1" />
              <p className="text-sm font-semibold text-blue-700">Yêu cầu đã được duyệt</p>
              <p className="text-xs text-blue-600 mt-1">Chúng tôi đang xử lý hoàn tiền cho bạn.</p>
            </div>
          )}
          {request.status === 'processing' && (
            <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 text-center">
              <CreditCard size={20} className="text-violet-600 mx-auto mb-1" />
              <p className="text-sm font-semibold text-violet-700">Đang chuyển tiền</p>
              <p className="text-xs text-violet-600 mt-1">Tiền đang được chuyển vào tài khoản của bạn.</p>
            </div>
          )}
          {request.status === 'completed' && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
              <CheckCircle2 size={20} className="text-emerald-600 mx-auto mb-1" />
              <p className="text-sm font-semibold text-emerald-700">Hoàn tiền thành công</p>
              <p className="text-xs text-emerald-600 mt-1">Tiền đã được hoàn vào tài khoản của bạn. Vui lòng kiểm tra tài khoản ngân hàng.</p>
            </div>
          )}
          {request.status === 'rejected' && !request.adminNote && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-center">
              <XCircle size={20} className="text-rose-600 mx-auto mb-1" />
              <p className="text-sm font-semibold text-rose-700">Yêu cầu bị từ chối</p>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs font-bold text-black uppercase tracking-wider">Lịch sử xử lý</p>
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-black">Yêu cầu được tạo</p>
                  <p className="text-[10px] text-gray-600">
                    {request.createdAt ? format(request.createdAt.toDate(), 'dd/MM/yyyy HH:mm') : '-'}
                  </p>
                </div>
              </div>
              {request.processingTime && (
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${request.status === 'completed' ? 'bg-emerald-500' : request.status === 'rejected' ? 'bg-rose-500' : request.status === 'processing' ? 'bg-violet-500' : 'bg-blue-500'}`} />
                  <div>
                    <p className="text-xs font-semibold text-black">
                      {request.status === 'completed' ? 'Hoàn tiền thành công' :
                        request.status === 'rejected' ? 'Yêu cầu bị từ chối' :
                          request.status === 'processing' ? 'Đang chuyển tiền' :
                            request.status === 'approved' ? 'Đã duyệt - Đang xử lý' : 'Cập nhật trạng thái'}
                    </p>
                    <p className="text-[10px] text-gray-600">
                      {request.processingTime ? format(request.processingTime.toDate(), 'dd/MM/yyyy HH:mm') : '-'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="p-4 sm:p-6 border-t border-gray-100 flex justify-end bg-white">
          <Button variant="secondary" onClick={onClose} className="w-full sm:w-auto">Đóng</Button>
        </div>
      </motion.div>
    </div>
  );
}

// Danh sách ngân hàng Việt Nam
const VIETNAMESE_BANKS = [
  { code: 'VCB', name: 'Ngân hàng TMCP Ngoại thương Việt Nam (Vietcombank)' },
  { code: 'BIDV', name: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam (BIDV)' },
  { code: 'VTB', name: 'Ngân hàng TMCP Bảo Việt (BAOVIET Bank)' },
  { code: 'TCB', name: 'Ngân hàng TMCP Kỹ thương Việt Nam (Techcombank)' },
  { code: 'VPB', name: 'Ngân hàng TMCP Việt Nam Thịnh Vượng (VPBank)' },
  { code: 'CTG', name: 'Ngân hàng TMCP Công thương Việt Nam (VietinBank)' },
  { code: 'MB', name: 'Ngân hàng TMCP Quân đội (MB Bank)' },
  { code: 'TPB', name: 'Ngân hàng TMCP Tiên Phong (TPBank)' },
  { code: 'ACB', name: 'Ngân hàng TMCP Á Châu (ACB)' },
  { code: 'SHB', name: 'Ngân hàng TMCP Sài Gòn - Hà Nội (SHB)' },
  { code: 'HDB', name: 'Ngân hàng TMCP Phát triển Thành phố Hồ Chí Minh (HDBank)' },
  { code: 'MSB', name: 'Ngân hàng TMCP Hàng hải Việt Nam (MSB)' },
  { code: 'OCB', name: 'Ngân hàng TMCP Phương Đông (OCB)' },
  { code: 'VIB', name: 'Ngân hàng TMCP Quốc tế Việt Nam (VIB)' },
  { code: 'NCB', name: 'Ngân hàng TMCP Quốc Dân (NCB)' },
  { code: 'SCB', name: 'Ngân hàng TMCP Sài Gòn (SCB)' },
  { code: 'PGB', name: 'Ngân hàng TMCP Xăng dầu Petrolimex (PGBank)' },
  { code: 'EIB', name: 'Ngân hàng TMCP Xuất nhập khẩu Việt Nam (EximBank)' },
  { code: 'ABB', name: 'Ngân hàng TMCP An Bình (ABBank)' },
  { code: 'BAC', name: 'Ngân hàng TMCP Bắc Á (BacABank)' },
  { code: 'VAB', name: 'Ngân hàng TMCP Việt Á (VietABank)' },
  { code: 'NAB', name: 'Ngân hàng TMCP Nam Á (NamABank)' },
  { code: 'SGB', name: 'Ngân hàng TMCP Sài Gòn Công thương (Saigonbank)' },
  { code: 'KLB', name: 'Ngân hàng TMCP Kiên Long (Kienlongbank)' },
  { code: 'LPB', name: 'Ngân hàng TMCP Bưu điện Liên Việt (LienVietPostBank)' },
  { code: 'SEAB', name: 'Ngân hàng TMCP Đông Nam Á (SeABank)' },
  { code: 'UOB', name: 'Ngân hàng United Overseas Bank Việt Nam (UOB)' },
  { code: 'CIT', name: 'Ngân hàng TNHH MTV CITibank Việt Nam (Citibank)' },
  { code: 'HSBC', name: 'Ngân hàng TNHH MTV HSBC Việt Nam (HSBC)' },
  { code: 'SC', name: 'Ngân hàng TNHH MTV Standard Chartered Bank Việt Nam (Standard Chartered)' },
  { code: 'CKB', name: 'Ngân hàng TNHH MTV Woori Việt Nam (Woori Bank)' },
  { code: 'KEB', name: 'Ngân hàng TNHH MTV KE B Hana Việt Nam (KEB Hana Bank)' },
  { code: 'SHBVN', name: 'Ngân hàng TNHH MTV Shinhan Việt Nam (Shinhan Bank)' },
  { code: 'AGB', name: 'Ngân hàng TNHH MTV Đại Á (Daiwa Bank)' },
  { code: 'ICB', name: 'Ngân hàng TNHH MTV CIMB Việt Nam (CIMB)' },
  { code: 'MBG', name: 'Ngân hàng TNHH MTV Public Bank Việt Nam (Public Bank)' },
  { code: 'IND', name: 'Ngân hàng Indovina Bank (Indovina)' },
  { code: 'VRB', name: 'Ngân hàng Liên doanh Việt Nga (VRB)' },
  { code: 'COOP', name: 'Ngân hàng Hợp tác xã Việt Nam (Co-opBank)' },
  { code: 'BAB', name: 'Ngân hàng TMCP Bắc Bộ (BacABank)' },
  { code: 'DLB', name: 'Ngân hàng TMCP Đông Dương (DongIndus Bank)' },
  { code: 'GDB', name: 'Ngân hàng TMCP Dầu khí Toàn cầu (Global Petroleum Bank)' },
  { code: 'KLBVN', name: 'Ngân hàng TNHH MTV Kasikorn Việt Nam (Kasikorn Bank)' },
  { code: 'MHB', name: 'Ngân hàng TMCP Mizuho Việt Nam (Mizuho Bank)' },
  { code: 'NMH', name: 'Ngân hàng TNHH MTV NMH Việt Nam (BNP Paribas)' },
];

function RefundRequestForm({ onClose, profile }: { onClose: () => void; profile: UserProfile }) {
  const [formData, setFormData] = useState({
    bankName: '',
    accountNumber: '',
    accountHolder: '',
    amount: '',
    orderCode: '',
    refundReason: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);
    try {
      await addDoc(collection(db, 'refundRequests'), {
        userId: profile.uid,
        userEmail: profile.email,
        userSdt: profile.sdt,
        displayName: profile.displayName,
        bankName: formData.bankName,
        accountNumber: formData.accountNumber,
        accountHolder: formData.accountHolder,
        amount: Number(formData.amount),
        orderCode: formData.orderCode,
        refundReason: formData.refundReason,
        status: 'pending',
        isVisible: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setSuccess(true);
      setTimeout(() => onClose(), 1800);
    } catch (error) {
      console.error('Error creating request:', error);
      alert('Có lỗi xảy ra khi gửi yêu cầu. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-md"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-[calc(100%-2rem)] sm:w-full max-w-lg sm:max-w-xl lg:max-w-2xl glass-card shadow-2xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[92vh]"
      >
        <div className="p-4 sm:p-5 border-b border-gray-100/60 flex items-center justify-between bg-gray-50/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-3 w-full">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
              <RotateCcw size={18} className="sm:w-5 sm:h-5" />
            </div>
            <div className="flex-1 text-center pr-8 sm:pr-10">
              <h3 className="text-base sm:text-lg font-bold text-black">Yêu cầu hoàn vé máy bay</h3>
              <p className="text-[10px] sm:text-xs text-black">Điền thông tin bên dưới để gửi yêu cầu hoàn vé</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-gray-600 hover:text-black hover:bg-gray-100 transition-all active:scale-95"><X size={20} className="sm:w-6 sm:h-6" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-rose-600 text-xs flex items-start gap-2">
              <XCircle size={14} className="mt-0.5 flex-shrink-0" />
              <span className="flex-1">{error}</span>
              <button onClick={() => setError(null)} className="flex-shrink-0 p-0.5 rounded hover:bg-rose-100 transition-colors"><X size={14} /></button>
            </div>
          )}
          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-600 text-xs flex items-start gap-2">
              <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0" />
              <span className="flex-1">Yêu cầu hoàn vé đã được gửi thành công! Chúng tôi sẽ xử lý trong 1-3 ngày làm việc.</span>
            </div>
          )}
          <div className="grid grid-cols-1 gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-black">Lý do hoàn tiền</label>
                <select
                  className="w-full px-3.5 py-2.5 bg-white/80 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition-all text-sm"
                  value={formData.refundReason}
                  onChange={e => setFormData({ ...formData, refundReason: e.target.value })}
                >
                  <option value="">Chọn lý do...</option>
                  <option value="hoan_ve">Hoàn vé</option>
                  <option value="huy_chuyen">Hủy chuyến bay</option>
                  <option value="thay_doi_lich">Thay đổi lịch</option>
                  <option value="khac">Khác</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-black">Chủ tài khoản</label>
                <input
                  required
                  className="w-full px-3.5 py-3 sm:py-2.5 bg-white/80 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition-all text-sm placeholder:text-gray-600"
                  placeholder="Tên in trên thẻ"
                  value={formData.accountHolder}
                  onChange={e => setFormData({ ...formData, accountHolder: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-black">Số tài khoản</label>
                <input
                  required
                  className="w-full px-3.5 py-3 sm:py-2.5 bg-white/80 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition-all text-sm placeholder:text-gray-600"
                  placeholder="Nhập số tài khoản"
                  value={formData.accountNumber}
                  onChange={e => setFormData({ ...formData, accountNumber: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-black">Tên Ngân Hàng</label>
              <select
                required
                className="w-full px-3.5 py-2.5 bg-white/80 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition-all text-sm"
                value={formData.bankName}
                onChange={e => setFormData({ ...formData, bankName: e.target.value })}
              >
                <option value="">Chọn ngân hàng...</option>
                {VIETNAMESE_BANKS.map(bank => (
                  <option key={bank.code} value={bank.name}>{bank.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-black">Mã đặt chỗ (PNR)</label>
                <input
                  required
                  className="w-full px-3.5 py-3 sm:py-2.5 bg-white/80 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition-all text-sm placeholder:text-gray-600"
                  placeholder="Ví dụ: ABCXYZ"
                  value={formData.orderCode}
                  onChange={e => setFormData({ ...formData, orderCode: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-black">Số tiền hoàn (VND)</label>
                <input
                  required
                  type="number"
                  className="w-full px-3.5 py-3 sm:py-2.5 bg-white/80 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition-all text-sm placeholder:text-gray-600"
                  placeholder="0"
                  value={formData.amount}
                  onChange={e => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>
            </div>
          </div>
          <div className="pt-3 sm:pt-4 flex flex-col sm:flex-row gap-2.5 sm:gap-3 sticky bottom-0 bg-white pb-2">
            <Button type="button" variant="secondary" className="order-2 sm:order-1 flex-1 py-3" onClick={onClose}>Hủy</Button>
            <Button type="submit" className="order-1 sm:order-2 flex-1 py-3" loading={isSubmitting}>
              {isSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu hoàn vé'}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// --- Các thành phần cho Quản trị viên (Admin Components) ---

function AdminDashboard({ requests, users }: { requests: RefundRequest[]; users: UserProfile[] }) {
  const [isSeeding, setIsSeeding] = useState(false);
  const [resetConfirm, setResetConfirm] = useState<{ type: string; label: string } | null>(null);
  const [dbStats, setDbStats] = useState<Record<string, number>>({});

  const stats = useMemo(() => ({
    totalAmount: requests.filter(r => r.status === 'approved' || r.status === 'completed' || r.status === 'processing').reduce((sum, r) => sum + r.amount, 0),
    pendingCount: requests.filter(r => r.status === 'pending').length,
    processingCount: requests.filter(r => r.status === 'processing').length,
    completedCount: requests.filter(r => r.status === 'completed').length,
    userCount: users.length,
    recentRequests: requests.slice(0, 5)
  }), [requests, users]);

  // Đọc thông tin database từ localStorage
  const refreshDbStats = () => {
    const collections = ['users', 'refundRequests', 'basedata', 'chats', 'adminAuditLog'];
    const newStats: Record<string, number> = {};
    collections.forEach(col => {
      try {
        const data = JSON.parse(localStorage.getItem('col_' + col) || '[]');
        newStats[col] = Array.isArray(data) ? data.length : 0;
      } catch { newStats[col] = 0; }
    });
    try {
      const mockUsers = JSON.parse(localStorage.getItem('mockUsers') || '[]');
      newStats['mockUsers'] = Array.isArray(mockUsers) ? mockUsers.length : 0;
    } catch { newStats['mockUsers'] = 0; }
    setDbStats(newStats);
  };

  useEffect(() => { refreshDbStats(); }, [requests, users]);

  const handleResetCollection = (type: string) => {
    if (type === 'all') {
      // Xóa tất cả dữ liệu
      const keysToRemove = ['col_users', 'col_refundRequests', 'col_basedata', 'col_chats', 'col_adminAuditLog', 'mockUsers', 'mockUser'];
      keysToRemove.forEach(k => localStorage.removeItem(k));
      window.location.reload();
    } else if (type === 'mockUsers') {
      // Chỉ giữ lại admin accounts
      const admins = [
        { uid: 'admin_123', email: 'admin@aerorefund.com', password: 'Matkhau1', displayName: 'Admin', phoneNumber: '' },
        { uid: 'admin_0968686868', email: 'phone_0968686868@aerorefund.com', password: 'Admin123', displayName: 'Admin 0968686868', phoneNumber: '0968686868' },
      ];
      localStorage.setItem('mockUsers', JSON.stringify(admins));
      localStorage.removeItem('col_users');
      window.location.reload();
    } else {
      localStorage.removeItem('col_' + type);
      refreshDbStats();
    }
    setResetConfirm(null);
  };

  const handleSeedBaseData = async () => {
    if (import.meta.env.DEV === false) return;
    setIsSeeding(true);
    try {
      const mockData = [
        { orderCode: 'ABCXYZ', amount: 2500000, passengerName: 'NGUYEN VAN A', flightNumber: 'VN123', status: 'valid' },
        { orderCode: 'DEF456', amount: 1800000, passengerName: 'TRAN THI B', flightNumber: 'VJ456', status: 'valid' },
        { orderCode: 'GHI789', amount: 3200000, passengerName: 'LE VAN C', flightNumber: 'QH789', status: 'valid' },
        { orderCode: 'JKL012', amount: 1500000, passengerName: 'PHAM THI D', flightNumber: 'VN456', status: 'refunded' }
      ];

      for (const item of mockData) {
        const q = query(collection(db, 'basedata'), where('orderCode', '==', item.orderCode));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
          await addDoc(collection(db, 'basedata'), item);
        }
      }
      alert('Khởi tạo dữ liệu mẫu thành công!');
      refreshDbStats();
    } catch (error) {
      console.error('Error seeding data:', error);
      alert('Có lỗi xảy ra khi khởi tạo dữ liệu. Vui lòng thử lại.');
    } finally {
      setIsSeeding(false);
    }
  };

  const dbCollections = [
    { key: 'users', label: 'Hồ sơ người dùng', icon: <UserIcon size={16} className="text-blue-600" />, color: 'blue' },
    { key: 'mockUsers', label: 'Tài khoản đăng nhập', icon: <Shield size={16} className="text-violet-600" />, color: 'violet' },
    { key: 'refundRequests', label: 'Yêu cầu hoàn vé', icon: <TicketCheck size={16} className="text-amber-600" />, color: 'amber' },
    { key: 'basedata', label: 'Mã đặt chỗ (PNR)', icon: <Ticket size={16} className="text-emerald-600" />, color: 'emerald' },
    { key: 'chats', label: 'Tin nhắn chat', icon: <MessageCircle size={16} className="text-sky-600" />, color: 'sky' },
    { key: 'adminAuditLog', label: 'Nhật ký Admin', icon: <ShieldCheck size={16} className="text-rose-600" />, color: 'rose' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-black">Quản trị hệ thống</h1>
        {import.meta.env.DEV && (
          <Button
            variant="secondary"
            onClick={handleSeedBaseData}
            loading={isSeeding}
            size="sm"
          >
            <RefreshCw size={12} />
            Khởi tạo dữ liệu mẫu
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <AnimatedStatCard
          label="Tổng tiền đã duyệt"
          value={new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(stats.totalAmount)}
          icon={<CreditCard className="text-blue-600" />}
          accent="blue"
        />
        <AnimatedStatCard
          label="Yêu cầu chờ duyệt"
          value={stats.pendingCount}
          icon={<Clock className="text-amber-600" />}
          accent="amber"
        />
        <AnimatedStatCard
          label="Đang chuyển tiền"
          value={stats.processingCount}
          icon={<RefreshCw className="text-violet-600" />}
          accent="violet"
        />
        <AnimatedStatCard
          label="Hoàn tất"
          value={stats.completedCount}
          icon={<CheckCircle2 className="text-emerald-600" />}
          accent="emerald"
        />
        <AnimatedStatCard
          label="Tổng người dùng"
          value={stats.userCount}
          icon={<Users className="text-blue-600" />}
          accent="blue"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-black tracking-tight">Yêu cầu mới nhất</h3>
            <ChevronRight size={18} className="text-gray-600" />
          </div>
          <div className="divide-y divide-gray-100">
            {stats.recentRequests.length === 0 ? (
              <div className="p-8 text-center text-gray-600">
                <EmptyState message="Chưa có yêu cầu nào" icon={<Ticket size={24} />} />
              </div>
            ) : (
              stats.recentRequests.map(req => (
                <div key={req.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                      <Ticket size={20} className="text-black" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-black">{req.orderCode}</p>
                      <p className="text-xs text-black">{req.userEmail}</p>
                    </div>
                  </div>
                  <Badge status={req.status} />
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-black">Người dùng mới</h3>
            <ChevronRight size={18} className="text-gray-600" />
          </div>
          <div className="divide-y divide-gray-100">
            {users.slice(0, 5).map(u => (
              <div key={u.uid} className="p-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gray-100/80 flex items-center justify-center border border-gray-200/60 shadow-sm">
                    <UserIcon size={20} className="text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-black">{u.displayName}</p>
                    <p className="text-xs text-black">{u.email}</p>
                  </div>
                </div>
                <Badge status={u.role} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Quản lý Database */}
      {import.meta.env.DEV && (
        <Card>
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-100 to-orange-100 flex items-center justify-center">
                <Database size={20} className="text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-black">Quản lý Database (LocalStorage)</h3>
                <p className="text-xs text-gray-500">Xem và xóa dữ liệu đang lưu trữ trong trình duyệt</p>
              </div>
            </div>
            <button
              onClick={() => setResetConfirm({ type: 'all', label: 'TOÀN BỘ dữ liệu' })}
              className="px-4 py-2 bg-gradient-to-r from-rose-500 to-rose-600 text-white text-xs font-bold rounded-xl hover:from-rose-600 hover:to-rose-700 transition-all active:scale-95 shadow-sm shadow-rose-200"
            >
              <span className="flex items-center gap-1.5">
                <Trash2 size={14} />
                Reset toàn bộ
              </span>
            </button>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {dbCollections.map(col => (
                <div key={col.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white border border-gray-200/60 flex items-center justify-center shadow-sm">
                      {col.icon}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-black">{col.label}</p>
                      <p className="text-xs text-gray-500">
                        {dbStats[col.key] !== undefined ? `${dbStats[col.key]} bản ghi` : '...'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setResetConfirm({ type: col.key, label: col.label })}
                    className="p-2 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title={`Xóa ${col.label}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Modal xác nhận Reset */}
      <AnimatePresence>
        {resetConfirm && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-md"
              onClick={() => setResetConfirm(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 text-center"
            >
              <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-xl font-bold text-black mb-2">Xác nhận xóa dữ liệu?</h3>
              <p className="text-sm text-gray-600 mb-6">
                Bạn sắp xóa <span className="font-bold text-rose-600">{resetConfirm.label}</span>.
                {resetConfirm.type === 'all' && ' Tất cả dữ liệu sẽ bị xóa và trang sẽ được tải lại.'}
                {resetConfirm.type === 'mockUsers' && ' Chỉ giữ lại tài khoản Admin mặc định.'}
                {' '}Hành động này không thể hoàn tác.
              </p>
              <div className="flex gap-3">
                <Button variant="secondary" className="flex-1" onClick={() => setResetConfirm(null)}>Hủy</Button>
                <Button variant="danger" className="flex-1" onClick={() => handleResetCollection(resetConfirm.type)}>Xóa dữ liệu</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function UserManagement({ users, allRequests, profile, isLoading, onChatWithUser }: {
  users: UserProfile[];
  allRequests: RefundRequest[];
  profile: UserProfile;
  isLoading?: boolean;
  onChatWithUser: (uid: string) => void;
}) {
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [newPasswordForUser, setNewPasswordForUser] = useState('');
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [editTab, setEditTab] = useState<'info' | 'requests'>('info');
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const usersPerPage = 10;

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const searchMatch = userSearch === '' ||
        u.displayName?.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.sdt?.includes(userSearch);
      const roleMatch = roleFilter === 'all' || u.role === roleFilter;
      const statusMatch = statusFilter === 'all' || u.status === statusFilter;
      return searchMatch && roleMatch && statusMatch;
    });
  }, [users, userSearch, roleFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / usersPerPage));
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * usersPerPage, currentPage * usersPerPage);

  useEffect(() => { setCurrentPage(1); }, [userSearch, roleFilter, statusFilter]);

  const writeAuditLog = async (action: AuditLog['action'], targetId: string, targetType: AuditLog['targetType'], changes: Record<string, { old: any; new: any }>) => {
    try {
      await addDoc(collection(db, 'adminAuditLog'), {
        adminId: profile.uid,
        adminEmail: profile.email,
        action,
        targetId,
        targetType,
        changes,
        timestamp: serverTimestamp()
      });
    } catch (e) {
      console.error('Audit log error:', e);
    }
  };

  const handleUpdateUser = async (uid: string, data: Partial<UserProfile>, oldData: Partial<UserProfile>) => {
    try {
      const changes: Record<string, { old: any; new: any }> = {};
      if (data.role !== undefined && data.role !== oldData.role) {
        changes.role = { old: oldData.role, new: data.role };
      }
      if (data.status !== undefined && data.status !== oldData.status) {
        changes.status = { old: oldData.status, new: data.status };
      }
      if (data.displayName !== undefined && data.displayName !== oldData.displayName) {
        changes.displayName = { old: oldData.displayName, new: data.displayName };
      }
      if (data.sdt !== undefined && data.sdt !== oldData.sdt) {
        changes.sdt = { old: oldData.sdt, new: data.sdt };
      }

      await updateDoc(doc(db, 'users', uid), data);

      let newEmail;
      if (data.sdt && data.sdt !== oldData.sdt) {
        newEmail = `phone_${data.sdt.replace('+', '')}@aerorefund.com`;
      }
      if (newEmail || newPasswordForUser) {
        await adminUpdateUserAuth(uid, newEmail, newPasswordForUser || undefined);
        if (newPasswordForUser) {
          changes.password = { old: '***', new: 'Mật khẩu mới' };
        }
      }

      if (Object.keys(changes).length > 0) {
        await writeAuditLog('update_user', uid, 'user', changes);
      }
      setResetSuccess(uid);
      setTimeout(() => {
        setEditingUser(null);
        setNewPasswordForUser('');
        setResetSuccess(null);
      }, 1500);
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Cập nhật thông tin người dùng thất bại. Vui lòng thử lại.');
    }
  };

  const handleDeleteUser = async (uid: string) => {
    const targetUser = users.find(u => u.uid === uid);
    if (!targetUser) return;
    try {
      await updateDoc(doc(db, 'users', uid), { status: 'inactive' });
      await writeAuditLog('delete_user', uid, 'user', {
        status: { old: targetUser.status, new: 'inactive' }
      });
      setUserToDelete(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Khóa người dùng thất bại. Vui lòng thử lại.');
    }
  };



  const userRequests = useMemo(() => {
    if (!editingUser) return [];
    return allRequests.filter(r => r.userId === editingUser.uid);
  }, [editingUser, allRequests]);

  return (
    <div className="space-y-6">
      <Card>
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center justify-between w-full">
            <h3 className="font-bold text-black tracking-tight">Danh sách người dùng</h3>
            <Button onClick={() => setIsCreateUserModalOpen(true)} variant="secondary" className="py-1.5 text-xs gap-1.5">
              <Plus size={14} />
              Tạo tài khoản
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={14} />
              <input
                placeholder="Tìm kiếm người dùng..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                className="pl-9 pr-3 py-1.5 bg-white/80 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all duration-200 w-48 placeholder:text-gray-600"
              />
            </div>
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value as UserRole | 'all')}
              className="px-3 py-1.5 text-xs border border-gray-200 rounded-xl bg-white/80 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all duration-200 cursor-pointer"
            >
              <option value="all">Tất cả vai trò</option>
              <option value="admin">Quản trị</option>
              <option value="user">Người dùng</option>
            </select>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as 'active' | 'inactive' | 'all')}
              className="px-3 py-1.5 text-xs border border-gray-200 rounded-xl bg-white/80 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all duration-200 cursor-pointer"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Hoạt động</option>
              <option value="inactive">Khóa</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-black text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Người dùng</th>
                <th className="px-6 py-4 font-semibold">Vai trò</th>
                <th className="px-6 py-4 font-semibold">Trạng thái</th>
                <th className="px-6 py-4 font-semibold">Ngày đăng ký</th>
                <th className="px-6 py-4 font-semibold text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} cols={5} />)
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <EmptyState message="Không tìm thấy người dùng phù hợp" icon={<Users size={32} />} />
                  </td>
                </tr>
              ) : (
                paginatedUsers.map(u => (
                  <tr key={u.uid} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-2xl bg-gray-100 flex items-center justify-center border border-gray-200 text-gray-600">
                          <UserIcon size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-black">{u.displayName}</p>
                          <p className="text-xs text-black">{u.email}</p>
                          {u.sdt && <p className="text-xs text-gray-600">{u.sdt}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4"><Badge status={u.role} /></td>
                    <td className="px-6 py-4"><Badge status={u.status} /></td>
                    <td className="px-6 py-4 text-sm text-black">
                      {formatDate(u.createdAt, 'dd/MM/yyyy')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onChatWithUser(u.uid); }}>
                          <MessageCircle size={14} />
                          Trò chuyện
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => { setEditingUser(u); setNewPasswordForUser(''); setEditTab('info'); }}>
                          <UserCog size={14} />
                          Sửa
                        </Button>
                        <button
                          onClick={() => setUserToDelete(u)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Khóa người dùng"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && filteredUsers.length > usersPerPage && (
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        )}
      </Card>

      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-md"
              onClick={() => setEditingUser(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg glass-card shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
            >
              <div className="p-6 border-b border-gray-100/60 flex items-center justify-between bg-gray-50/80 backdrop-blur-sm shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-100 flex items-center justify-center">
                    <UserCog size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-black">Chỉnh sửa User</h3>
                    <p className="text-xs text-black">{editingUser.email}</p>
                  </div>
                </div>
                <button onClick={() => setEditingUser(null)} className="p-2 rounded-xl text-gray-600 hover:text-black hover:bg-gray-100 transition-all active:scale-95"><X size={24} /></button>
              </div>

              <div className="p-4 border-b border-gray-100 bg-white shrink-0">
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditTab('info')}
                    className={cn(
                      'px-4 py-2 text-xs font-medium rounded-lg transition-colors',
                      editTab === 'info'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-black hover:bg-gray-200'
                    )}
                  >
                    Thông tin
                  </button>
                  <button
                    onClick={() => setEditTab('requests')}
                    className={cn(
                      'px-4 py-2 text-xs font-medium rounded-lg transition-colors',
                      editTab === 'requests'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-black hover:bg-gray-200'
                    )}
                  >
                    Yêu cầu hoàn vé ({userRequests.length})
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                {editTab === 'info' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-black uppercase">Họ và tên</label>
                        <input
                          className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-white/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all duration-200 placeholder:text-gray-600 text-sm"
                          value={editingUser.displayName}
                          onChange={e => setEditingUser({ ...editingUser, displayName: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-black uppercase">Số điện thoại</label>
                        <input
                          className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-white/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all duration-200 placeholder:text-gray-600 text-sm"
                          value={editingUser.sdt || ''}
                          onChange={e => setEditingUser({ ...editingUser, sdt: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-black uppercase">Email</label>
                      <input
                        disabled
                        className="w-full px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-600 cursor-not-allowed text-sm"
                        value={editingUser.email || ''}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-black uppercase">Vai trò</label>
                        <select
                          className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-white/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all duration-200 placeholder:text-gray-600 text-sm"
                          value={editingUser.role}
                          onChange={e => setEditingUser({ ...editingUser, role: e.target.value as UserRole })}
                        >
                          <option value="user">Người dùng</option>
                          <option value="admin">Quản trị</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-black uppercase">Trạng thái</label>
                        <select
                          className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-white/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all duration-200 placeholder:text-gray-600 text-sm"
                          value={editingUser.status}
                          onChange={e => setEditingUser({ ...editingUser, status: e.target.value as 'active' | 'inactive' })}
                        >
                          <option value="active">Hoạt động</option>
                          <option value="inactive">Tạm khóa</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-black uppercase">Ngày đăng ký</label>
                      <input
                        disabled
                        className="w-full px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-600 cursor-not-allowed text-sm"
                        value={formatDate(editingUser.createdAt, 'dd/MM/yyyy HH:mm')}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-black uppercase">Mật khẩu mới (Tùy chọn)</label>
                      <input
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-white/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all duration-200 placeholder:text-gray-600"
                        placeholder="Để trống nếu không muốn thay đổi"
                        value={newPasswordForUser}
                        onChange={e => setNewPasswordForUser(e.target.value)}
                      />
                    </div>
                    {resetSuccess === editingUser.uid && (
                      <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-700 text-xs flex items-center gap-2">
                        <CheckCircle2 size={14} />
                        Đã cập nhật thông tin thành công!
                      </div>
                    )}
                  </div>
                )}

                {editTab === 'requests' && (
                  <div className="space-y-3">
                    {userRequests.length === 0 ? (
                      <EmptyState message="Người dùng này chưa có yêu cầu hoàn vé nào" icon={<Ticket size={24} />} />
                    ) : (
                      userRequests.map(req => (
                        <div key={req.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                                <Ticket size={16} className="text-black" />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-black">{req.orderCode}</p>
                                <p className="text-xs text-black">{req.bankName} - {req.accountNumber}</p>
                              </div>
                            </div>
                            <Badge status={req.status} />
                          </div>
                          <div className="flex justify-between pl-11">
                            <span className="text-xs text-black">
                              {formatDate(req.createdAt, 'dd/MM/yyyy HH:mm')}
                            </span>
                            <span className="text-xs font-bold text-blue-600">
                              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(req.amount)}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-gray-100 flex gap-3 shrink-0">
                <Button variant="secondary" className="flex-1" onClick={() => setEditingUser(null)}>Hủy</Button>
                <Button
                  className="flex-1"
                  onClick={() => handleUpdateUser(editingUser.uid, {
                    role: editingUser.role,
                    status: editingUser.status,
                    displayName: editingUser.displayName,
                    sdt: editingUser.sdt
                  }, editingUser)}
                >
                  Lưu thay đổi
                </Button>
              </div>
            </motion.div>
          </div>
        )}

        {userToDelete && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-md"
              onClick={() => setUserToDelete(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm glass-card shadow-2xl p-6 text-center"
            >
              <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-black mb-2">Xác nhận khóa tài khoản?</h3>
              <p className="text-black mb-6">
                Bạn có chắc chắn muốn khóa tài khoản <span className="font-bold text-black">{userToDelete.displayName}</span>? Người dùng sẽ không thể đăng nhập sau khi bị khóa.
              </p>
              <div className="flex gap-3">
                <Button variant="secondary" className="flex-1" onClick={() => setUserToDelete(null)}>Hủy</Button>
                <Button variant="danger" className="flex-1" onClick={() => handleDeleteUser(userToDelete.uid)}>Xác nhận khóa</Button>
              </div>
            </motion.div>
          </div>
        )}

        <AnimatePresence>
          {isCreateUserModalOpen && (
            <CreateUserModal onClose={() => setIsCreateUserModalOpen(false)} adminProfile={profile} />
          )}
        </AnimatePresence>
      </AnimatePresence>
    </div>
  );
}

function CreateUserModal({ onClose, adminProfile }: { onClose: () => void; adminProfile: UserProfile }) {
  const [formData, setFormData] = useState({
    displayName: '',
    sdt: '',
    password: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const generatedEmail = formData.sdt
    ? `phone_${formData.sdt.replace(/\D/g, '')}@aerorefund.com`
    : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.displayName.trim() || !formData.sdt.trim() || !formData.password.trim()) {
      setError('Vui lòng điền đầy đủ thông tin.');
      return;
    }
    if (formData.password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);
    try {
      const uid = 'user_' + Date.now();
      const email = generatedEmail;

      const userData: UserProfile = {
        uid,
        displayName: formData.displayName.trim(),
        sdt: formData.sdt.replace(/\D/g, ''),
        email,
        role: 'user',
        status: 'active',
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'users', uid), userData);

      const users: any[] = JSON.parse(localStorage.getItem('mockUsers') || '[]');
      users.push({ uid, email, password: formData.password, displayName: formData.displayName.trim(), phoneNumber: formData.sdt.replace(/\D/g, ''), role: 'user' });
      localStorage.setItem('mockUsers', JSON.stringify(users));

      await addDoc(collection(db, 'adminAuditLog'), {
        adminId: adminProfile.uid,
        adminEmail: adminProfile.email,
        action: 'create_user',
        targetId: uid,
        targetType: 'user',
        changes: {
          displayName: { old: '', new: formData.displayName.trim() },
          sdt: { old: '', new: formData.sdt.replace(/\D/g, '') },
          email: { old: '', new: email },
        },
        timestamp: serverTimestamp(),
      });

      setSuccess(true);
      setTimeout(() => onClose(), 1800);
    } catch (err) {
      console.error('Error creating user:', err);
      setError('Có lỗi xảy ra khi tạo tài khoản. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-md"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-md glass-card shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="p-5 border-b border-gray-100/60 flex items-center justify-between bg-gray-50/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-violet-100 text-violet-600 rounded-xl flex items-center justify-center">
              <UserPlus size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-black">Tạo tài khoản người dùng</h3>
              <p className="text-[10px] text-black">Tạo tài khoản mới cho khách hàng</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-gray-600 hover:text-black hover:bg-gray-100 transition-all active:scale-95">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-rose-600 text-xs flex items-start gap-2">
              <XCircle size={14} className="mt-0.5 flex-shrink-0" />
              <span className="flex-1">{error}</span>
              <button onClick={() => setError(null)} className="flex-shrink-0 p-0.5 rounded hover:bg-rose-100 transition-colors"><X size={14} /></button>
            </div>
          )}
          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-600 text-xs flex items-start gap-2">
              <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0" />
              <span className="flex-1">Tài khoản đã được tạo thành công!</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-sm font-semibold text-black">Họ và tên <span className="text-rose-500">*</span></label>
            <input
              required
              className="w-full px-3.5 py-2.5 bg-white/80 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 outline-none transition-all text-sm placeholder:text-gray-600"
              placeholder="Nhập họ tên đầy đủ"
              value={formData.displayName}
              onChange={e => setFormData({ ...formData, displayName: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-black">Số điện thoại <span className="text-rose-500">*</span></label>
            <input
              required
              type="tel"
              className="w-full px-3.5 py-2.5 bg-white/80 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 outline-none transition-all text-sm placeholder:text-gray-600"
              placeholder="Ví dụ: 0912345678"
              value={formData.sdt}
              onChange={e => setFormData({ ...formData, sdt: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-black">Email (tự động tạo)</label>
            <input
              disabled
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-500 cursor-not-allowed"
              value={generatedEmail || 'Nhập số điện thoại để tạo email...'}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-black">Mật khẩu <span className="text-rose-500">*</span></label>
            <input
              required
              type="password"
              className="w-full px-3.5 py-2.5 bg-white/80 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 outline-none transition-all text-sm placeholder:text-gray-600"
              placeholder="Ít nhất 6 ký tự"
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
            />
          </div>

          <div className="pt-2 flex gap-3">
            <Button type="button" variant="secondary" className="flex-1 py-2.5" onClick={onClose}>Hủy</Button>
            <Button type="submit" className="flex-1 py-2.5" loading={isSubmitting}>
              {isSubmitting ? 'Đang tạo...' : 'Tạo tài khoản'}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function RefundRequestManagement({ requests, isLoading }: { requests: RefundRequest[]; isLoading?: boolean }) {
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
  const [filter, setFilter] = useState<RefundStatus | 'all'>('all');
  const [bankFilter, setBankFilter] = useState<string>('all');
  const [pnrSearch, setPnrSearch] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'none'>('none');
  const [actionToConfirm, setActionToConfirm] = useState<{ id: string, status: RefundStatus } | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<RefundRequest | null>(null);
  const [isEditingRequest, setIsEditingRequest] = useState<RefundRequest | null>(null);
  const [editForm, setEditForm] = useState<Partial<RefundRequest>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const requestsPerPage = 15;

  const uniqueBanks = useMemo(() => {
    const banks = new Set(requests.map(r => r.bankName));
    return Array.from(banks).sort();
  }, [requests]);

  const filteredRequests = useMemo(() => {
    let result = requests.filter(r => {
      const statusMatch = filter === 'all' || r.status === filter;
      const bankMatch = bankFilter === 'all' || r.bankName === bankFilter;
      const pnrMatch = pnrSearch === '' || r.orderCode.toLowerCase().includes(pnrSearch.toLowerCase());
      return statusMatch && bankMatch && pnrMatch;
    });

    if (sortOrder !== 'none') {
      result = [...result].sort((a, b) => {
        const timeA = a.processingTime?.toDate?.()?.getTime() || a.createdAt?.toDate?.()?.getTime() || 0;
        const timeB = b.processingTime?.toDate?.()?.getTime() || b.createdAt?.toDate?.()?.getTime() || 0;
        return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
      });
    }
    return result;
  }, [requests, filter, bankFilter, pnrSearch, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / requestsPerPage));
  const paginatedRequests = filteredRequests.slice((currentPage - 1) * requestsPerPage, currentPage * requestsPerPage);

  useEffect(() => { setCurrentPage(1); }, [filter, bankFilter, pnrSearch, sortOrder]);

  const generateRefundSlipCode = () => {
    const date = new Date();
    const dateStr = date.getFullYear().toString() +
      String(date.getMonth() + 1).padStart(2, '0') +
      String(date.getDate()).padStart(2, '0');
    const random = Math.random().toString(36).substr(2, 5).toUpperCase();
    return `RH-${dateStr}-${random}`;
  };

  const handleSaveRequest = async () => {
    if (!isEditingRequest) return;
    setIsSaving(true);
    try {
      const updateData: Record<string, any> = { updatedAt: serverTimestamp() };
      const changes: Record<string, { old: any; new: any }> = {};

      const fieldsToCheck: (keyof RefundRequest)[] = ['bankName', 'accountNumber', 'accountHolder', 'amount', 'orderCode', 'refundSlipCode', 'transferNote', 'refundReason', 'isVisible'];
      for (const field of fieldsToCheck) {
        const oldVal = (isEditingRequest as any)[field];
        const newVal = (editForm as any)[field];
        if (newVal !== undefined && newVal !== oldVal) {
          changes[field] = { old: oldVal, new: newVal };
          updateData[field] = newVal;
        }
      }

      // Handle status change with audit and timestamps
      if (editForm.status && editForm.status !== isEditingRequest.status) {
        changes['status'] = { old: isEditingRequest.status, new: editForm.status };
        updateData['status'] = editForm.status;
        updateData['processingTime'] = serverTimestamp();
        if (editForm.status === 'approved') {
          updateData['approvedBy'] = auth.currentUser?.email || auth.currentUser?.uid;
          updateData['approvedAt'] = serverTimestamp();
          // Tự động mở hiển thị khi duyệt
          updateData['isVisible'] = true;
          changes['isVisible'] = { old: isEditingRequest.isVisible, new: true };
        }
        if (editForm.status === 'completed') {
          updateData['completedBy'] = auth.currentUser?.email || auth.currentUser?.uid;
          updateData['completedAt'] = serverTimestamp();
        }
      }

      await updateDoc(doc(db, 'refundRequests', isEditingRequest.id), updateData);

      if (Object.keys(changes).length > 0) {
        await addDoc(collection(db, 'adminAuditLog'), {
          adminId: auth.currentUser?.uid,
          adminEmail: auth.currentUser?.email,
          action: 'update_request',
          targetId: isEditingRequest.id,
          targetType: 'refundRequest',
          changes,
          timestamp: serverTimestamp()
        });
      }

      setIsEditingRequest(null);
      setSelectedRequest(null);
    } catch (error) {
      console.error('Error saving request:', error);
      alert('Lưu thay đổi thất bại. Vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBulkAction = async (status: 'approved' | 'processing' | 'rejected' | 'completed') => {
    const batch = writeBatch(db);
    const changes: Record<string, { old: RefundStatus; new: RefundStatus }> = {};
    selectedRequests.forEach(id => {
      const req = requests.find(r => r.id === id);
      if (req) changes[id] = { old: req.status, new: status };
      const reqRef = doc(db, 'refundRequests', id);
      const updateData: any = { status, processingTime: serverTimestamp() };
      if (status === 'approved' && req.status !== 'approved') {
        updateData.approvedBy = auth.currentUser?.email || auth.currentUser?.uid;
        updateData.approvedAt = serverTimestamp();
      }
      if (status === 'completed' && req.status !== 'completed') {
        updateData.completedBy = auth.currentUser?.email || auth.currentUser?.uid;
        updateData.completedAt = serverTimestamp();
      }
      batch.update(reqRef, updateData);
    });
    await batch.commit();
    await addDoc(collection(db, 'adminAuditLog'), {
      action: 'bulk_action',
      status,
      affectedIds: selectedRequests,
      changes,
      timestamp: serverTimestamp()
    });
    setSelectedRequests([]);
    setNotes({});
  };

  const toggleSelectAll = () => {
    if (selectedRequests.length === paginatedRequests.length) {
      setSelectedRequests([]);
    } else {
      setSelectedRequests(paginatedRequests.map(r => r.id));
    }
  };

  const toggleSelect = (id: string) => {
    if (selectedRequests.includes(id)) {
      setSelectedRequests(selectedRequests.filter(r => r !== id));
    } else {
      setSelectedRequests([...selectedRequests, id]);
    }
  };

  const handleUpdateStatus = async (id: string, status: RefundStatus) => {
    try {
      const request = requests.find(r => r.id === id);
      if (!request) return;

      const oldStatus = request.status;
      const updateData: any = {
        status,
        adminNote: notes[id] || '',
        updatedAt: serverTimestamp(),
        processingTime: serverTimestamp()
      };
      if (status === 'approved' && oldStatus !== 'approved') {
        updateData.approvedBy = auth.currentUser?.email || auth.currentUser?.uid;
        updateData.approvedAt = serverTimestamp();
      }
      if (status === 'completed' && oldStatus !== 'completed') {
        updateData.completedBy = auth.currentUser?.email || auth.currentUser?.uid;
        updateData.completedAt = serverTimestamp();
      }
      await updateDoc(doc(db, 'refundRequests', id), updateData);

      const changes: Record<string, { old: any; new: any }> = {};
      if (status !== oldStatus) {
        changes.status = { old: oldStatus, new: status };
      }
      const newNote = notes[id] || '';
      if (newNote !== (request.adminNote || '')) {
        changes.adminNote = { old: request.adminNote || '', new: newNote };
      }

      if (Object.keys(changes).length > 0) {
        await addDoc(collection(db, 'adminAuditLog'), {
          adminId: auth.currentUser?.uid,
          adminEmail: auth.currentUser?.email,
          action: 'update_request',
          targetId: id,
          targetType: 'refundRequest',
          changes,
          timestamp: serverTimestamp()
        });
      }

      const userDoc = await getDoc(doc(db, 'users', request.userId));
      const userData = userDoc.data() as UserProfile | undefined;

      if (userData?.fcmToken && userData.notificationsEnabled !== false) {
        let title = '';
        let body = '';

        if (status === 'approved') {
          title = 'Yêu cầu hoàn vé được duyệt';
          body = `Yêu cầu cho mã PNR ${request.orderCode} đã được duyệt. Số tiền: ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(request.amount)}`;
        } else if (status === 'processing') {
          title = 'Yêu cầu hoàn vé đang chuyển tiền';
          body = `Yêu cầu cho mã PNR ${request.orderCode} đang được chuyển tiền. Vui lòng chờ trong giây lát.`;
        } else if (status === 'rejected') {
          title = 'Yêu cầu hoàn vé bị từ chối';
          body = `Yêu cầu cho mã PNR ${request.orderCode} đã bị từ chối. Ghi chú: ${notes[id] || 'Không có'}`;
        } else if (status === 'completed') {
          title = 'Yêu cầu hoàn vé đã hoàn tất';
          body = `Yêu cầu cho mã PNR ${request.orderCode} đã được xử lý hoàn tất. Vui lòng kiểm tra tài khoản của bạn.`;
        }

        if (title && body) {
          await fetch('/api/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: userData.fcmToken, title, body })
          });
        }
      }
    } catch (error) {
      console.error('Error updating request:', error);
      alert('Cập nhật trạng thái yêu cầu thất bại. Vui lòng thử lại.');
    }
  };

  const handleToggleVisibility = async (req: RefundRequest, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const newVisibility = req.isVisible === false ? true : false;
      await updateDoc(doc(db, 'refundRequests', req.id), { isVisible: newVisibility });
      await addDoc(collection(db, 'adminAuditLog'), {
        adminId: auth.currentUser?.uid,
        adminEmail: auth.currentUser?.email,
        action: 'update_request',
        targetId: req.id,
        targetType: 'refundRequest',
        changes: { isVisible: { old: req.isVisible !== false, new: newVisibility } },
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Error toggling visibility:', error);
      alert('Lỗi khi cập nhật hiển thị.');
    }
  };

  return (
    <Card>
      <AnimatePresence>
        {selectedRequest && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-md"
              onClick={() => { setSelectedRequest(null); setIsEditingRequest(null); }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-xl glass-card shadow-2xl overflow-y-auto max-h-[90vh] flex flex-col"
            >
              <div className="p-5 border-b border-gray-100/60 flex items-center justify-between bg-gray-50/80 backdrop-blur-sm shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                    <TicketCheck size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-black">Chi tiết yêu cầu hoàn vé</h3>
                    <p className="text-[10px] text-black">Mã PNR: <span className="font-semibold">{selectedRequest.orderCode}</span></p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!isEditingRequest ? (
                    <button
                      onClick={() => { setIsEditingRequest(selectedRequest); setEditForm(selectedRequest); }}
                      className="p-2 rounded-xl text-blue-600 hover:bg-blue-50 transition-all active:scale-95"
                      title="Chỉnh sửa"
                    >
                      <Edit2 size={16} />
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsEditingRequest(null)}
                      className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 transition-all active:scale-95"
                      title="Hủy chỉnh sửa"
                    >
                      <X size={16} />
                    </button>
                  )}
                  <button onClick={() => { setSelectedRequest(null); setIsEditingRequest(null); }} className="p-2 rounded-xl text-gray-600 hover:text-black hover:bg-gray-100 transition-all active:scale-95">
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="p-5 space-y-4 flex-1">
                {isEditingRequest ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-black uppercase">Mã PNR</label>
                        <input
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
                          value={editForm.orderCode || ''}
                          onChange={e => setEditForm({ ...editForm, orderCode: e.target.value.toUpperCase() })}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-black uppercase">Số tiền (VND)</label>
                        <input
                          type="number"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
                          value={editForm.amount || ''}
                          onChange={e => setEditForm({ ...editForm, amount: Number(e.target.value) })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-black uppercase">Tên ngân hàng</label>
                        <input
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
                          value={editForm.bankName || ''}
                          onChange={e => setEditForm({ ...editForm, bankName: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-black uppercase">Số tài khoản</label>
                        <input
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
                          value={editForm.accountNumber || ''}
                          onChange={e => setEditForm({ ...editForm, accountNumber: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-black uppercase">Chủ tài khoản</label>
                        <input
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
                          value={editForm.accountHolder || ''}
                          onChange={e => setEditForm({ ...editForm, accountHolder: e.target.value.toUpperCase() })}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-black uppercase">Mã phiếu hoàn tiền</label>
                        <div className="flex gap-2">
                          <input
                            disabled
                            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                            value={editForm.refundSlipCode || selectedRequest.refundSlipCode || ''}
                            placeholder="Chưa có mã phiếu"
                          />
                          <button
                            onClick={() => setEditForm({ ...editForm, refundSlipCode: generateRefundSlipCode() })}
                            className="px-3 py-2 bg-violet-50 text-violet-600 border border-violet-200 rounded-lg text-xs font-semibold hover:bg-violet-100 transition-all shrink-0"
                            title="Tạo mã phiếu mới"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-black uppercase">Lý do hoàn tiền</label>
                        <input
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
                          value={editForm.refundReason || ''}
                          onChange={e => setEditForm({ ...editForm, refundReason: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-black uppercase">Ngày bay</label>
                        <input
                          type="date"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
                          value={editForm.flightDate || ''}
                          onChange={e => setEditForm({ ...editForm, flightDate: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-black uppercase">Số vé máy bay</label>
                        <input
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
                          value={editForm.ticketNumber || ''}
                          onChange={e => setEditForm({ ...editForm, ticketNumber: e.target.value.toUpperCase() })}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-black uppercase">Tên hành khách</label>
                        <input
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
                          value={editForm.passengerName || ''}
                          onChange={e => setEditForm({ ...editForm, passengerName: e.target.value.toUpperCase() })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-black uppercase">Trạng thái</label>
                        <select
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
                          value={editForm.status || 'pending'}
                          onChange={e => setEditForm({ ...editForm, status: e.target.value as RefundStatus })}
                        >
                          <option value="pending">Chờ duyệt</option>
                          <option value="approved">Đã duyệt</option>
                          <option value="processing">Đang chuyển tiền</option>
                          <option value="completed">Hoàn tất</option>
                          <option value="rejected">Từ chối</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-black uppercase">Ghi chú chuyển khoản</label>
                        <input
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
                          value={editForm.transferNote || ''}
                          onChange={e => setEditForm({ ...editForm, transferNote: e.target.value })}
                          placeholder="VD: Đã chuyển lúc 14:30"
                        />
                      </div>
                    </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-black uppercase">Ghi chú Admin</label>
                        <textarea
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none resize-none"
                          rows={2}
                          value={editForm.adminNote || ''}
                          onChange={e => setEditForm({ ...editForm, adminNote: e.target.value })}
                          placeholder="Ghi chú cho khách hàng..."
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl border border-blue-100">
                        <div className="flex items-center gap-2">
                          <Eye size={16} className="text-blue-600" />
                          <span className="text-sm font-semibold text-blue-900">Hiển thị thông tin cho khách hàng</span>
                        </div>
                        <button
                          onClick={() => setEditForm({ ...editForm, isVisible: !editForm.isVisible })}
                          className={cn(
                            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
                            editForm.isVisible ? "bg-blue-600" : "bg-gray-200"
                          )}
                        >
                          <span
                            className={cn(
                              "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                              editForm.isVisible ? "translate-x-6" : "translate-x-1"
                            )}
                          />
                        </button>
                      </div>
                    </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Badge status={selectedRequest.status} />
                      <div className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        selectedRequest.isVisible !== false ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-500"
                      )}>
                        {selectedRequest.isVisible !== false ? (
                          <><Eye size={12} /> Đang hiển thị cho khách</>
                        ) : (
                          <><EyeOff size={12} /> Đang ẩn với khách</>
                        )}
                      </div>
                    </div>

                    {selectedRequest.refundSlipCode && (
                      <div className="bg-violet-50 border border-violet-100 rounded-xl p-4 text-center">
                        <p className="text-[10px] font-bold text-violet-600 uppercase tracking-wider mb-1">Mã phiếu hoàn tiền</p>
                        <p className="text-lg font-bold text-violet-700">{selectedRequest.refundSlipCode}</p>
                      </div>
                    )}

                    <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                      <p className="text-xs font-bold text-black uppercase tracking-wider">Thông tin hành khách</p>
                      <div className="flex justify-between">
                        <span className="text-sm text-black">Tên hành khách:</span>
                        <span className="font-semibold text-sm text-black">{selectedRequest.passengerName || selectedRequest.displayName || '-'}</span>
                      </div>
                      {selectedRequest.ticketNumber && (
                        <div className="flex justify-between">
                          <span className="text-sm text-black">Số vé:</span>
                          <span className="font-medium text-sm text-black">{selectedRequest.ticketNumber}</span>
                        </div>
                      )}
                      {selectedRequest.flightDate && (
                        <div className="flex justify-between">
                          <span className="text-sm text-black">Ngày bay:</span>
                          <span className="font-medium text-sm text-black">{selectedRequest.flightDate}</span>
                        </div>
                      )}
                      {selectedRequest.refundReason && (
                        <div className="flex justify-between">
                          <span className="text-sm text-black">Lý do:</span>
                          <span className="font-medium text-sm text-black">
                            {selectedRequest.refundReason === 'hoan_ve' ? 'Hoàn vé' :
                              selectedRequest.refundReason === 'huy_chuyen' ? 'Hủy chuyến bay' :
                                selectedRequest.refundReason === 'thay_doi_lich' ? 'Thay đổi lịch' : 'Khác'}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                      <p className="text-xs font-bold text-black uppercase tracking-wider">Thông tin nhận tiền</p>
                      <div className="flex justify-between">
                        <span className="text-sm text-black">Ngân hàng:</span>
                        <span className="font-medium text-sm text-black">{selectedRequest.bankName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-black">Số tài khoản:</span>
                        <span className="font-medium text-sm text-black">{selectedRequest.accountNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-black">Chủ tài khoản:</span>
                        <span className="font-medium text-sm text-black uppercase">{selectedRequest.accountHolder}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-xs text-black uppercase mb-1">Số tiền hoàn</p>
                        <p className="text-lg font-bold text-blue-600">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedRequest.amount)}</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-xs text-black uppercase mb-1">Ngày tạo</p>
                        <p className="text-sm font-semibold text-black">{formatDate(selectedRequest.createdAt, 'dd/MM/yyyy HH:mm')}</p>
                      </div>
                    </div>

                    {selectedRequest.transferNote && (
                      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                        <p className="text-xs font-bold text-amber-600 uppercase mb-1">Ghi chú chuyển khoản</p>
                        <p className="text-sm text-black">{selectedRequest.transferNote}</p>
                      </div>
                    )}

                    {selectedRequest.adminNote && (
                      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                        <p className="text-xs font-bold text-blue-600 uppercase mb-1">Ghi chú Admin</p>
                        <p className="text-sm text-black">{selectedRequest.adminNote}</p>
                      </div>
                    )}

                    {!selectedRequest.adminNote && selectedRequest.status === 'pending' && (
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                        <Clock size={20} className="text-gray-600 mx-auto mb-1" />
                        <p className="text-xs text-black">Yêu cầu đang chờ admin xử lý.</p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <p className="text-xs font-bold text-black uppercase tracking-wider">Lịch sử xử lý</p>
                      <div className="space-y-2">
                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                          <div>
                            <p className="text-xs font-semibold text-black">Yêu cầu được tạo</p>
                            <p className="text-[10px] text-gray-600">{formatDate(selectedRequest.createdAt, 'dd/MM/yyyy HH:mm')}</p>
                          </div>
                        </div>
                        {selectedRequest.processingTime && (
                          <div className="flex items-start gap-3">
                            <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${selectedRequest.status === 'completed' ? 'bg-emerald-500' : selectedRequest.status === 'rejected' ? 'bg-rose-500' : selectedRequest.status === 'processing' ? 'bg-violet-500' : 'bg-blue-500'}`} />
                            <div>
                              <p className="text-xs font-semibold text-black">
                                {selectedRequest.status === 'completed' ? 'Hoàn tiền thành công' :
                                  selectedRequest.status === 'rejected' ? 'Yêu cầu bị từ chối' :
                                    selectedRequest.status === 'processing' ? 'Đang chuyển tiền' :
                                      selectedRequest.status === 'approved' ? 'Đã duyệt - Đang xử lý' : 'Cập nhật trạng thái'}
                              </p>
                              <p className="text-[10px] text-gray-600">{formatDate(selectedRequest.processingTime, 'dd/MM/yyyy HH:mm')}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-5 border-t border-gray-100 flex gap-3 shrink-0 bg-white">
                {isEditingRequest ? (
                  <>
                    <Button variant="secondary" className="flex-1" onClick={() => setIsEditingRequest(null)}>Hủy</Button>
                    <Button className="flex-1" onClick={handleSaveRequest} loading={isSaving}>
                      {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </Button>
                  </>
                ) : (
                  <Button variant="secondary" className="w-full" onClick={() => { setSelectedRequest(null); setIsEditingRequest(null); }}>Đóng</Button>
                )}
              </div>
            </motion.div>
          </div>
        )}
        {actionToConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-md"
              onClick={() => setActionToConfirm(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm glass-card shadow-2xl p-6 text-center"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm shadow-blue-200/50">
                <Info size={32} />
              </div>
              <h3 className="text-xl font-bold text-black mb-2">Xác nhận hành động?</h3>
              <p className="text-black mb-6">
                Bạn có chắc chắn muốn chuyển trạng thái yêu cầu sang <span className="font-bold text-black">
                  {actionToConfirm.status === 'pending' ? 'Chờ duyệt' :
                    actionToConfirm.status === 'approved' ? 'Đã duyệt' :
                      actionToConfirm.status === 'completed' ? 'Hoàn tất' : 'Từ chối'}
                </span>?
              </p>
              <div className="flex gap-3">
                <Button variant="secondary" className="flex-1" onClick={() => setActionToConfirm(null)}>Hủy</Button>
                <Button className="flex-1" onClick={() => {
                  handleUpdateStatus(actionToConfirm.id, actionToConfirm.status);
                  setActionToConfirm(null);
                }}>Xác nhận</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h3 className="font-bold text-black tracking-tight">Danh sách yêu cầu hoàn vé máy bay</h3>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            placeholder="Tìm theo mã PNR..."
            value={pnrSearch}
            onChange={(e) => setPnrSearch(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium rounded-xl border border-gray-200 bg-white/80 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all duration-200 placeholder:text-gray-600 w-44"
          />
          <select
            value={bankFilter}
            onChange={(e) => setBankFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium rounded-xl border border-gray-200 bg-white/80 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all duration-200 cursor-pointer"
          >
            <option value="all">Tất cả ngân hàng</option>
            {uniqueBanks.map(bank => (
              <option key={bank} value={bank}>{bank}</option>
            ))}
          </select>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
            className="px-3 py-1.5 text-xs font-medium rounded-xl border border-gray-200 bg-white/80 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all duration-200 cursor-pointer"
          >
            <option value="none">Sắp xếp theo ngày</option>
            <option value="newest">Mới nhất trước</option>
            <option value="oldest">Cũ nhất trước</option>
          </select>
          {(['all', 'pending', 'approved', 'processing', 'completed', 'rejected'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-1.5 text-xs font-semibold rounded-xl transition-all duration-200 active:scale-[0.97]',
                filter === f
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm shadow-blue-200'
                  : 'bg-gray-50/80 backdrop-blur-sm text-black hover:bg-gray-100 border border-gray-200/60'
              )}
            >
              {f === 'all' ? 'Tất cả' : f === 'pending' ? 'Chờ duyệt' : f === 'approved' ? 'Đã duyệt' : f === 'processing' ? 'Đang chuyển' : f === 'completed' ? 'Hoàn tất' : 'Từ chối'}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        {selectedRequests.length > 0 && (
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white p-4 flex items-center justify-between rounded-b-xl">
            <span className="text-sm font-semibold">Đã chọn {selectedRequests.length} yêu cầu</span>
            <div className="flex gap-2">
              <button onClick={() => handleBulkAction('approved')} className="px-3 py-1.5 text-xs bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl hover:from-blue-600 hover:to-blue-700 font-semibold shadow-sm">Duyệt</button>
              <button onClick={() => handleBulkAction('processing')} className="px-3 py-1.5 text-xs bg-gradient-to-r from-violet-500 to-violet-600 rounded-xl hover:from-violet-600 hover:to-violet-700 font-semibold shadow-sm">Đang chuyển</button>
              <button onClick={() => handleBulkAction('completed')} className="px-3 py-1.5 text-xs bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl hover:from-emerald-600 hover:to-emerald-700 font-semibold shadow-sm">Hoàn tất</button>
              <button onClick={() => handleBulkAction('rejected')} className="px-3 py-1.5 text-xs bg-gradient-to-r from-rose-500 to-rose-600 rounded-xl hover:from-rose-600 hover:to-rose-700 font-semibold shadow-sm">Từ chối</button>
            </div>
          </div>
        )}
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50/80 text-gray-600 text-[11px] uppercase tracking-widest font-semibold border-b border-gray-200/60">
              <th className="px-6 py-4 w-10">
                <input type="checkbox" checked={selectedRequests.length === paginatedRequests.length && paginatedRequests.length > 0} onChange={toggleSelectAll} />
              </th>
              <th className="px-6 py-4 font-semibold">Mã PNR / Ngày đặt</th>
              <th className="px-6 py-4 font-semibold">Khách hàng</th>
              <th className="px-6 py-4 font-semibold">Thông tin nhận tiền</th>
              <th className="px-6 py-4 font-semibold">Số tiền hoàn</th>
              <th className="px-6 py-4 font-semibold">Ghi chú Admin</th>
              <th className="px-6 py-4 font-semibold">Thời gian xử lý</th>
              <th className="px-6 py-4 font-semibold">Trạng thái</th>
              <th className="px-6 py-4 font-semibold text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100/50">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={9} />)
            ) : paginatedRequests.length > 0 ? (
              paginatedRequests.map(req => (
                <tr
                  key={req.id}
                  className={cn("hover:bg-gray-50/60 transition-colors duration-150 group/row", selectedRequests.includes(req.id) && "bg-blue-50/40")}
                >
                  <td className="px-6 py-4">
                    <input type="checkbox" checked={selectedRequests.includes(req.id)} onChange={(e) => { e.stopPropagation(); toggleSelect(req.id); }} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="group/pnr inline-block">
                      <p className="text-sm font-bold text-black cursor-pointer" onClick={() => setSelectedRequest(req)}>{req.orderCode}</p>
                      <p className="text-xs text-gray-600">{formatDate(req.createdAt, 'dd/MM/yyyy HH:mm')}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-black">{req.userEmail}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-black">{req.bankName}</span>
                      <span className="text-xs text-black">{req.accountNumber} - {req.accountHolder}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-bold text-black">
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(req.amount)}
                  </td>
                  <td className="px-6 py-4">
                    <textarea
                      className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-xl bg-white/80 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition-all duration-200 resize-y placeholder:text-gray-600"
                      placeholder="Nhập ghi chú..."
                      value={notes[req.id] !== undefined ? notes[req.id] : (req.adminNote || '')}
                      onClick={(e) => e.stopPropagation()}
                      onChange={e => setNotes({ ...notes, [req.id]: e.target.value })}
                      onBlur={() => handleUpdateStatus(req.id, req.status)}
                      rows={1}
                    />
                  </td>
                  <td className="px-6 py-4 text-xs text-black">
                    {formatDate(req.processingTime, 'dd/MM/yyyy HH:mm')}
                  </td>
                  <td className="px-6 py-4"><Badge status={req.status} /></td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <select
                        value={req.status}
                        onChange={(e) => {
                          e.stopPropagation();
                          setActionToConfirm({ id: req.id, status: e.target.value as RefundStatus });
                        }}
                        className={cn(
                          "px-2 py-1.5 text-xs font-semibold rounded-xl border outline-none transition-all cursor-pointer",
                          req.status === 'pending' ? "bg-amber-50 text-amber-700 border-amber-200" :
                            req.status === 'approved' ? "bg-blue-50 text-blue-700 border-blue-200" :
                              req.status === 'completed' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                "bg-rose-50 text-rose-700 border-rose-200"
                        )}
                      >
                        <option value="pending">Chờ duyệt</option>
                        <option value="approved">Đã duyệt</option>
                        <option value="processing">Đang chuyển tiền</option>
                        <option value="completed">Hoàn tất</option>
                        <option value="rejected">Từ chối</option>
                      </select>
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedRequest(req); setIsEditingRequest(req); setEditForm(req); }}
                        className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-xl transition-all active:scale-95"
                        title="Chỉnh sửa phiếu hoàn"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={(e) => handleToggleVisibility(req, e)}
                        className={cn(
                          "p-1.5 rounded-xl transition-all active:scale-95",
                          req.isVisible !== false ? "text-emerald-600 hover:bg-emerald-50" : "text-gray-400 hover:bg-gray-100"
                        )}
                        title={req.isVisible !== false ? "Đang mở cho user (Nhấn để ẩn)" : "Đang ẩn (Nhấn để mở cho user)"}
                      >
                        {req.isVisible !== false ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedRequest(req); }}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-xl transition-all active:scale-95"
                        title="Xem chi tiết"
                      >
                        <Info size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9}>
                  <EmptyState message="Không có yêu cầu nào trong danh sách này" icon={<TicketCheck size={32} />} />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {!isLoading && filteredRequests.length > requestsPerPage && (
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      )}
    </Card>
  );
}

function AuditLogView({ logs }: { logs: AuditLog[] }) {
  const [filterAction, setFilterAction] = useState<AuditLog['action'] | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 20;

  const filteredLogs = useMemo(() => {
    return logs.filter(l => filterAction === 'all' || l.action === filterAction);
  }, [logs, filterAction]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / logsPerPage));
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * logsPerPage, currentPage * logsPerPage);

  useEffect(() => { setCurrentPage(1); }, [filterAction]);

  const actionLabels: Record<string, string> = {
    update_user: 'Cập nhật user',
    delete_user: 'Khóa user',
    update_request: 'Cập nhật yêu cầu',
    bulk_action: 'Hành động hàng loạt',
  };

  const actionColors: Record<string, string> = {
    update_user: 'bg-blue-50 text-blue-700 border-blue-200',
    delete_user: 'bg-rose-50 text-rose-700 border-rose-200',
    update_request: 'bg-blue-50 text-blue-700 border-blue-200',
    bulk_action: 'bg-amber-50 text-amber-700 border-amber-200',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-black">Nhật ký Admin</h1>
          <p className="text-sm text-black">Theo dõi các hành động của quản trị viên trong hệ thống.</p>
        </div>
        <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-4 py-2">
          <ShieldCheck size={16} className="text-blue-600" />
          <span className="text-xs font-medium text-black">{logs.length} hành động</span>
        </div>
      </div>

      <Card>
        <div className="p-6 border-b border-gray-100/60 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-gray-600 uppercase mr-2 tracking-wider">Lọc:</span>
          {(['all', 'update_user', 'delete_user', 'update_request', 'bulk_action'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilterAction(f)}
              className={cn(
                'px-3 py-1.5 text-xs font-semibold rounded-xl transition-all duration-200 active:scale-[0.97]',
                filterAction === f
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm shadow-blue-200'
                  : 'bg-gray-50/80 backdrop-blur-sm text-black hover:bg-gray-100 border border-gray-200/60'
              )}
            >
              {f === 'all' ? 'Tất cả' : actionLabels[f]}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-widest text-gray-600 font-semibold border-b border-gray-200/60">
                <th className="px-6 py-4">Thời gian</th>
                <th className="px-6 py-4">Admin</th>
                <th className="px-6 py-4">Hành động</th>
                <th className="px-6 py-4">Chi tiết thay đổi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100/50">
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <EmptyState message="Chưa có nhật ký nào" icon={<ShieldCheck size={32} />} />
                  </td>
                </tr>
              ) : (
                paginatedLogs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50/60 transition-colors duration-150">
                    <td className="px-6 py-4 text-sm text-black">
                      {formatDate(log.timestamp, 'dd/MM/yyyy HH:mm:ss')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-xl bg-gray-100/80 flex items-center justify-center border border-gray-200/60">
                          <UserIcon size={14} className="text-black" />
                        </div>
                        <span className="text-sm font-medium text-black">{log.adminEmail}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn('px-2.5 py-0.5 rounded-2xl text-xs font-semibold border', actionColors[log.action] || 'bg-gray-50 text-black border-gray-200')}>
                        {actionLabels[log.action] || log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-black max-w-xs">
                      {log.changes && Object.keys(log.changes).length > 0 ? (
                        <div className="space-y-1">
                          {Object.entries(log.changes as Record<string, { old: unknown; new: unknown }>).map(([key, val]) => (
                            <div key={key} className="flex items-center gap-1 flex-wrap">
                              <span className="font-semibold text-black capitalize">
                                {key === 'status' ? 'Trạng thái' : key === 'adminNote' ? 'Ghi chú' : key}:
                              </span>
                              <span className="line-through text-rose-500">
                                {key === 'status' ? (
                                  val.old === 'pending' ? 'Chờ duyệt' :
                                    val.old === 'approved' ? 'Đã duyệt' :
                                      val.old === 'completed' ? 'Hoàn tất' :
                                        val.old === 'rejected' ? 'Từ chối' : String(val.old)
                                ) : String(val.old)}
                              </span>
                              <span>→</span>
                              <span className="font-medium text-emerald-600">
                                {key === 'status' ? (
                                  val.new === 'pending' ? 'Chờ duyệt' :
                                    val.new === 'approved' ? 'Đã duyệt' :
                                      val.new === 'completed' ? 'Hoàn tất' :
                                        val.new === 'rejected' ? 'Từ chối' : String(val.new)
                                ) : String(val.new)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : log.action === 'bulk_action' && log.affectedIds ? (
                        <span className="text-black">Áp dụng cho {log.affectedIds.length} yêu cầu</span>
                      ) : (
                        <span className="italic">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {filteredLogs.length > logsPerPage && (
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        )}
      </Card>
    </div>
  );
}

function AdminBookingManagement({ codes }: { codes: BookingCode[] }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'valid' | 'refunded'>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<BookingCode | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<BookingCode | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const codesPerPage = 15;

  const [formData, setFormData] = useState({
    orderCode: '',
    amount: '',
    passengerName: '',
    flightNumber: '',
    status: 'valid' as 'valid' | 'refunded'
  });

  const filteredCodes = useMemo(() => {
    return codes.filter(c => {
      const searchMatch = search === '' ||
        c.orderCode.toLowerCase().includes(search.toLowerCase()) ||
        c.passengerName.toLowerCase().includes(search.toLowerCase()) ||
        c.flightNumber.toLowerCase().includes(search.toLowerCase());
      const statusMatch = statusFilter === 'all' || c.status === statusFilter;
      return searchMatch && statusMatch;
    });
  }, [codes, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredCodes.length / codesPerPage));
  const paginatedCodes = filteredCodes.slice((currentPage - 1) * codesPerPage, currentPage * codesPerPage);

  useEffect(() => { setCurrentPage(1); }, [search, statusFilter]);

  const resetForm = () => {
    setFormData({ orderCode: '', amount: '', passengerName: '', flightNumber: '', status: 'valid' });
    setEditingCode(null);
    setMessage(null);
  };

  const openAddForm = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openEditForm = (code: BookingCode) => {
    setFormData({
      orderCode: code.orderCode,
      amount: String(code.amount),
      passengerName: code.passengerName,
      flightNumber: code.flightNumber,
      status: code.status
    });
    setEditingCode(code);
    setIsFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!formData.orderCode.trim()) {
      setMessage({ type: 'error', text: 'Vui lòng nhập mã đặt chỗ (PNR).' });
      return;
    }
    if (!formData.amount || isNaN(Number(formData.amount)) || Number(formData.amount) <= 0) {
      setMessage({ type: 'error', text: 'Số tiền không hợp lệ.' });
      return;
    }
    if (!formData.passengerName.trim()) {
      setMessage({ type: 'error', text: 'Vui lòng nhập tên hành khách.' });
      return;
    }
    if (!formData.flightNumber.trim()) {
      setMessage({ type: 'error', text: 'Vui lòng nhập số hiệu chuyến bay.' });
      return;
    }

    setIsSaving(true);
    try {
      const data = {
        orderCode: formData.orderCode.trim().toUpperCase(),
        amount: Number(formData.amount),
        passengerName: formData.passengerName.trim().toUpperCase(),
        flightNumber: formData.flightNumber.trim().toUpperCase(),
        status: formData.status,
        updatedAt: serverTimestamp()
      };

      if (editingCode?.id) {
        await updateDoc(doc(db, 'basedata', editingCode.id), data);
        setMessage({ type: 'success', text: 'Cập nhật mã đặt chỗ thành công!' });
      } else {
        const q = query(collection(db, 'basedata'), where('orderCode', '==', data.orderCode));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          setMessage({ type: 'error', text: `Mã PNR "${data.orderCode}" đã tồn tại trong hệ thống.` });
          setIsSaving(false);
          return;
        }
        await addDoc(collection(db, 'basedata'), { ...data, createdAt: serverTimestamp() });
        setMessage({ type: 'success', text: 'Thêm mã đặt chỗ thành công!' });
      }

      setTimeout(() => {
        setIsFormOpen(false);
        resetForm();
      }, 800);
    } catch (error) {
      console.error('Save booking code error:', error);
      setMessage({ type: 'error', text: 'Có lỗi xảy ra. Vui lòng thử lại.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (code: BookingCode) => {
    if (!code.id) return;
    try {
      await deleteDoc(doc(db, 'basedata', code.id));
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Delete booking code error:', error);
      alert('Xóa thất bại. Vui lòng thử lại.');
    }
  };

  const stats = useMemo(() => ({
    total: codes.length,
    valid: codes.filter(c => c.status === 'valid').length,
    refunded: codes.filter(c => c.status === 'refunded').length,
    totalAmount: codes.reduce((sum, c) => sum + c.amount, 0)
  }), [codes]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-black">Quản lý mã đặt chỗ</h1>
          <p className="text-sm text-black">Thêm, chỉnh sửa và quản lý các mã đặt chỗ (PNR) trong hệ thống.</p>
        </div>
        <Button onClick={openAddForm}>
          <Plus size={16} />
          Thêm mã đặt chỗ
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Tổng mã</p>
          <p className="text-2xl font-bold text-black mt-1">{stats.total}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Còn hiệu lực</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.valid}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Đã hoàn tiền</p>
          <p className="text-2xl font-bold text-rose-600 mt-1">{stats.refunded}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Tổng giá trị</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(stats.totalAmount)}
          </p>
        </div>
      </div>

      <Card>
        <div className="p-6 border-b border-gray-100/60 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm mã PNR, tên hành khách, chuyến bay..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all placeholder:text-gray-400"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Trạng thái:</span>
            {(['all', 'valid', 'refunded'] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  'px-3 py-1.5 text-xs font-semibold rounded-xl transition-all duration-200 active:scale-[0.97]',
                  statusFilter === s
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm shadow-blue-200'
                    : 'bg-gray-50/80 text-black hover:bg-gray-100 border border-gray-200/60'
                )}
              >
                {s === 'all' ? 'Tất cả' : s === 'valid' ? 'Còn hiệu lực' : 'Đã hoàn tiền'}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-widest text-gray-600 font-semibold border-b border-gray-200/60">
                <th className="px-6 py-4">Mã PNR</th>
                <th className="px-6 py-4">Hành khách</th>
                <th className="px-6 py-4">Chuyến bay</th>
                <th className="px-6 py-4">Số tiền</th>
                <th className="px-6 py-4">Trạng thái</th>
                <th className="px-6 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100/50">
              {paginatedCodes.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState message="Chưa có mã đặt chỗ nào" icon={<TicketCheck size={32} />} />
                  </td>
                </tr>
              ) : (
                paginatedCodes.map(code => (
                  <tr key={code.id} className="hover:bg-gray-50/60 transition-colors duration-150">
                    <td className="px-6 py-4">
                      <span className="font-bold text-black font-mono text-sm">{code.orderCode}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-black">{code.passengerName}</td>
                    <td className="px-6 py-4 text-sm text-black">{code.flightNumber}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-black">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(code.amount)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        'inline-flex items-center px-2.5 py-1 text-[10px] font-bold rounded-full border',
                        code.status === 'valid'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      )}>
                        {code.status === 'valid' ? 'Còn hiệu lực' : 'Đã hoàn tiền'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditForm(code)}
                          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-blue-600 transition-colors"
                          title="Chỉnh sửa"
                        >
                          <UserCog size={16} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(code)}
                          className="p-2 rounded-lg hover:bg-rose-50 text-gray-500 hover:text-rose-600 transition-colors"
                          title="Xóa"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!isSaving && filteredCodes.length > codesPerPage && (
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        )}
      </Card>

      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-md"
              onClick={() => setIsFormOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-black">
                  {editingCode ? 'Chỉnh sửa mã đặt chỗ' : 'Thêm mã đặt chỗ mới'}
                </h3>
                <button
                  onClick={() => setIsFormOpen(false)}
                  className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-black transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {message && (
                <div className={cn(
                  'mb-4 p-3 rounded-xl text-sm font-medium border',
                  message.type === 'success'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                )}>
                  {message.text}
                </div>
              )}

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                    Mã đặt chỗ (PNR) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.orderCode}
                    onChange={(e) => setFormData({ ...formData, orderCode: e.target.value.toUpperCase() })}
                    placeholder="VD: ABCXYZ"
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all uppercase placeholder:normal-case"
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                    Số tiền (VND) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="VD: 2500000"
                    min="0"
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                    Tên hành khách <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.passengerName}
                    onChange={(e) => setFormData({ ...formData, passengerName: e.target.value.toUpperCase() })}
                    placeholder="VD: NGUYEN VAN A"
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all uppercase placeholder:normal-case"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                    Số hiệu chuyến bay <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.flightNumber}
                    onChange={(e) => setFormData({ ...formData, flightNumber: e.target.value.toUpperCase() })}
                    placeholder="VD: VN123"
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all uppercase placeholder:normal-case"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                    Trạng thái <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex gap-3">
                    {(['valid', 'refunded'] as const).map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setFormData({ ...formData, status: s })}
                        className={cn(
                          'flex-1 py-2.5 text-sm font-semibold rounded-xl border transition-all duration-200',
                          formData.status === s
                            ? s === 'valid'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-2 ring-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-300 ring-2 ring-rose-200'
                            : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                        )}
                      >
                        {s === 'valid' ? 'Còn hiệu lực' : 'Đã hoàn tiền'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setIsFormOpen(false)}
                    className="flex-1"
                  >
                    Hủy
                  </Button>
                  <Button
                    type="submit"
                    loading={isSaving}
                    className="flex-1"
                  >
                    {editingCode ? 'Lưu thay đổi' : 'Thêm mới'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-md"
              onClick={() => setDeleteConfirm(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0">
                  <AlertTriangle size={24} className="text-rose-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-black">Xác nhận xóa</h3>
                  <p className="text-sm text-black">Hành động này không thể hoàn tác.</p>
                </div>
              </div>
              <p className="text-sm text-black mb-6">
                Bạn có chắc chắn muốn xóa mã PNR <span className="font-bold">{deleteConfirm.orderCode}</span> của{' '}
                <span className="font-semibold">{deleteConfirm.passengerName}</span> không?
              </p>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1"
                >
                  Hủy
                </Button>
                <Button
                  variant="danger"
                  onClick={() => handleDelete(deleteConfirm)}
                  className="flex-1"
                >
                  Xóa
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProfileSettings({ profile }: { profile: UserProfile }) {
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [sdt, setSdt] = useState(profile.sdt || '');
  const [notificationsEnabled, setNotificationsEnabled] = useState(profile.notificationsEnabled ?? true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const userRef = doc(db, 'users', profile.uid);
      await updateDoc(userRef, {
        displayName,
        sdt,
        notificationsEnabled,
        updatedAt: serverTimestamp()
      });
      setMessage({ type: 'success', text: 'Cập nhật thông tin thành công!' });
    } catch (error) {
      console.error('Update profile error:', error);
      setMessage({ type: 'error', text: 'Có lỗi xảy ra khi cập nhật thông tin.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="p-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm shadow-blue-200/50">
            <UserIcon size={32} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-black">Cài đặt tài khoản</h3>
            <p className="text-sm text-black">Quản lý thông tin cá nhân của bạn</p>
          </div>
        </div>

        {message && (
          <div className={cn(
            "p-4 rounded-lg mb-6 text-sm font-medium border flex items-center gap-2",
            message.type === 'success' ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-rose-50 text-rose-700 border-rose-100"
          )}>
            {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            {message.text}
          </div>
        )}

        <form onSubmit={handleUpdateProfile} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-black">Email</label>
              <input
                type="email"
                disabled
                className="w-full px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-black cursor-not-allowed"
                value={profile.email ?? ''}
              />
              <p className="text-xs text-gray-600">Email dùng để đăng nhập, không thể thay đổi.</p>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-black">Họ và tên</label>
              <input
                type="text"
                required
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-white/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all duration-200 placeholder:text-gray-600"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-black">Số điện thoại</label>
              <input
                type="tel"
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-white/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all duration-200 placeholder:text-gray-600"
                value={sdt}
                onChange={e => setSdt(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-black">Vai trò</label>
                <div className="px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-black">
                  {translateRole(profile.role)}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-black">Trạng thái</label>
                <div className="px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-black">
                  {translateStatus(profile.status)}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <h4 className="text-sm font-bold text-black mb-4 flex items-center gap-2">
                <Bell size={16} className="text-blue-600" />
                Thông báo
              </h4>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div>
                  <p className="text-sm font-semibold text-black">Thông báo đẩy (FCM)</p>
                  <p className="text-xs text-black">Nhận thông báo về trạng thái hoàn vé và tin tức mới nhất.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-2xl transition-colors focus:outline-none",
                    notificationsEnabled ? "bg-blue-600" : "bg-gray-300"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-2xl bg-white transition-transform",
                      notificationsEnabled ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <Button
              type="submit"
              loading={isSaving}
              disabled={isSaving || (displayName === profile.displayName && sdt === (profile.sdt || '') && notificationsEnabled === (profile.notificationsEnabled ?? true))}
            >
              {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

interface ChatPanelProps {
  messages: ChatMessage[];
  currentUser: UserProfile;
  onSendMessage: () => void;
  newMessage: string;
  onNewMessageChange: (value: string) => void;
  onClose: () => void;
  onMarkAsRead?: (messageIds: string[]) => void;
  adminChatUserId?: string | null;
  onSelectConversation?: (userId: string) => void;
  conversations?: { userId: string; userName: string; lastMessage: string; lastTime: any; unread: number }[];
  isAdminView?: boolean;
  onBack?: () => void;
}

function ChatPanel({
  messages,
  currentUser,
  onSendMessage,
  newMessage,
  onNewMessageChange,
  onClose,
  onMarkAsRead,
  adminChatUserId,
  onSelectConversation,
  conversations,
  isAdminView,
  onBack
}: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showConversations, setShowConversations] = useState(!adminChatUserId && currentUser.role === 'admin');

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Đánh dấu tin nhắn đã đọc khi mở chat
  useEffect(() => {
    if (onMarkAsRead && messages.length > 0) {
      const unreadIds = messages
        .filter(m => !m.isRead && m.senderId !== currentUser.uid)
        .map(m => m.id);
      if (unreadIds.length > 0) {
        onMarkAsRead(unreadIds);
      }
    }
  }, [messages, onMarkAsRead, currentUser.uid]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  };

  const handleSelectConversation = (userId: string) => {
    setShowConversations(false);
    onSelectConversation?.(userId);
  };

  const handleBack = () => {
    setShowConversations(true);
    onBack?.();
  };

  // Floating chat bubble button (when minimized)
  if (isMinimized) {
    return (
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ type: 'spring', damping: 15, stiffness: 300 }}
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full shadow-2xl shadow-blue-500/40 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform z-[80]"
      >
        <MessageCircle size={28} className="text-white" />
        {messages.filter(m => !m.isRead && m.senderId !== currentUser.uid).length > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[24px] h-6 px-1.5 bg-rose-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg">
            {messages.filter(m => !m.isRead && m.senderId !== currentUser.uid).length}
          </span>
        )}
      </motion.button>
    );
  }

  // Header text dựa trên role và trạng thái
  const getHeaderSubtitle = () => {
    if (currentUser.role === 'admin') {
      if (showConversations) return 'Danh sách cuộc trò chuyện';
      if (adminChatUserId) {
        const conv = conversations?.find(c => c.userId === adminChatUserId);
        return conv ? `Trò chuyện với ${conv.userName}` : 'Hỗ trợ khách hàng';
      }
      return 'Hỗ trợ khách hàng';
    }
    return 'Liên hệ CSKH 24/7';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="fixed bottom-6 right-6 w-[380px] h-[560px] bg-white rounded-3xl shadow-2xl shadow-gray-400/30 overflow-hidden z-[80] flex flex-col"
    >
      {/* Thanh tiêu đề (Header) */}
      <div className="p-4 flex items-center justify-between bg-gradient-to-r from-blue-500 to-blue-600 text-white shrink-0">
        <div className="flex items-center gap-3">
          {isAdminView && (adminChatUserId || !showConversations) && (
            <button
              onClick={handleBack}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors -ml-1"
            >
              <ChevronLeft size={20} />
            </button>
          )}
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <MessageCircle size={20} />
          </div>
          <div>
            <h3 className="font-bold">Chat hỗ trợ</h3>
            <p className="text-xs text-blue-100">{getHeaderSubtitle()}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(true)}
            className="p-2 hover:bg-white/20 rounded-xl transition-colors"
            title="Thu nhỏ"
          >
            <Minus size={18} />
          </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Danh sách cuộc trò chuyện (Admin only) */}
      {isAdminView && showConversations && (
        <div className="flex-1 overflow-y-auto bg-gray-50">
          {conversations && conversations.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {conversations.map((conv) => (
                <button
                  key={conv.userId}
                  onClick={() => handleSelectConversation(conv.userId)}
                  className="w-full p-4 flex items-start gap-3 hover:bg-blue-50 transition-colors text-left"
                >
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                    <UserIcon size={18} className="text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm text-black truncate">{conv.userName}</p>
                      {conv.lastTime && (
                        <span className="text-[10px] text-gray-500 shrink-0 ml-2">
                          {conv.lastTime.toDate ? format(conv.lastTime.toDate(), 'HH:mm') : ''}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{conv.lastMessage}</p>
                  </div>
                  {conv.unread > 0 && (
                    <span className="min-w-[20px] h-5 px-1.5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shrink-0">
                      {conv.unread}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-4">
                <MessageCircle size={32} className="text-blue-500" />
              </div>
              <p className="text-sm font-medium text-black">Chưa có cuộc trò chuyện nào</p>
              <p className="text-xs text-gray-600 mt-1">Khách hàng sẽ xuất hiện khi gửi tin nhắn</p>
            </div>
          )}
        </div>
      )}

      {/* Tin nhắn (Messages) */}
      {(!isAdminView || !showConversations) && (
        <div className="flex-1 overflow-y-auto p-4 space-y-1 bg-gray-50">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-4">
                <MessageCircle size={32} className="text-blue-500" />
              </div>
              <p className="text-sm font-medium text-black">Chưa có tin nhắn nào</p>
              <p className="text-xs text-gray-600 mt-1">
                {currentUser.role === 'admin' && adminChatUserId
                  ? 'Bắt đầu cuộc trò chuyện với khách hàng'
                  : 'Gửi tin nhắn để bắt đầu cuộc trò chuyện'}
              </p>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <ChatBubble
                  key={msg.id}
                  message={msg}
                  isOwn={msg.senderId === currentUser.uid}
                />
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      )}

      {/* Ô nhập liệu (Input) */}
      {(!isAdminView || !showConversations) && (
        <div className="p-4 border-t border-gray-100 bg-white shrink-0">
          <div className="flex items-end gap-2">
            <textarea
              value={newMessage}
              onChange={(e) => onNewMessageChange(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Nhập tin nhắn..."
              rows={1}
              className="flex-1 px-4 py-3 border border-gray-200 rounded-2xl text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all resize-none placeholder:text-gray-600"
              style={{ maxHeight: '100px' }}
            />
            <button
              onClick={onSendMessage}
              disabled={!newMessage.trim()}
              className={cn(
                "p-3 rounded-2xl transition-all duration-200",
                newMessage.trim()
                  ? "bg-blue-500 text-white hover:bg-blue-600 shadow-md shadow-blue-200 active:scale-95"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              )}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
