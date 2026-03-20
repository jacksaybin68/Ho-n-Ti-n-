import { useState, useEffect } from 'react';
import {
  db,
  collection,
  query,
  onSnapshot,
  orderBy,
  where,
} from '../mockFirebase';
import {
  RefundRequest,
  UserProfile,
  AuditLog,
  BookingCode,
  ChatMessage
} from '../types';

export function useDashboardData(user: UserProfile | null, adminChatUserId?: string | null) {
  const [requests, setRequests] = useState<RefundRequest[]>([]);
  const [allRequests, setAllRequests] = useState<RefundRequest[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [bookingCodes, setBookingCodes] = useState<BookingCode[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversations, setConversations] = useState<{ userId: string; userName: string; lastMessage: string; lastTime: any; unread: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const unsubscribers: (() => void)[] = [];

    // User's own requests
    if (user.role === 'user') {
      const q = query(
        collection(db, 'refundRequests'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      unsubscribers.push(onSnapshot(q, (snapshot) => {
        setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RefundRequest)));
      }));
    }

    // Admin data
    if (user.role === 'admin') {
      // All requests
      const qReq = query(collection(db, 'refundRequests'), orderBy('createdAt', 'desc'));
      unsubscribers.push(onSnapshot(qReq, (snapshot) => {
        setAllRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RefundRequest)));
      }));

      // All users
      const qUsers = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      unsubscribers.push(onSnapshot(qUsers, (snapshot) => {
        setUsers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
      }));

      // Audit logs
      const qLogs = query(collection(db, 'adminAuditLog'), orderBy('createdAt', 'desc'));
      unsubscribers.push(onSnapshot(qLogs, (snapshot) => {
        setAuditLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditLog)));
      }));

      // Booking codes
      const qCodes = query(collection(db, 'basedata'), orderBy('orderCode', 'asc'));
      unsubscribers.push(onSnapshot(qCodes, (snapshot) => {
        setBookingCodes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BookingCode)));
      }));

      // Conversations for admin
      const qConv = query(collection(db, 'chats'), orderBy('lastTime', 'desc'));
      unsubscribers.push(onSnapshot(qConv, (snapshot) => {
        setConversations(snapshot.docs.map(doc => ({ userId: doc.id, ...doc.data() } as any)));
      }));
    }

    // Chat messages
    // For users: always own chat path
    if (user.role === 'user') {
      const qMsg = query(
        collection(db, 'chats', user.uid, 'messages'),
        orderBy('timestamp', 'asc')
      );
      unsubscribers.push(onSnapshot(qMsg, (snapshot) => {
        setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage)));
      }));
    }

    // For admin: load messages for current selected conversation
    if (user.role === 'admin') {
      if (adminChatUserId) {
        const qMsg = query(
          collection(db, 'chats', adminChatUserId, 'messages'),
          orderBy('timestamp', 'asc')
        );
        unsubscribers.push(onSnapshot(qMsg, (snapshot) => {
          setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage)));
        }));
      } else {
        setMessages([]);
      }
    }

    setIsLoading(false);

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [user, adminChatUserId]);

  return {
    requests,
    allRequests,
    users,
    auditLogs,
    bookingCodes,
    messages,
    conversations,
    isLoading,
    setMessages // to be used for admin to switch conversations
  };
}
