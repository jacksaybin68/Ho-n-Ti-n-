/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'admin' | 'user';
export type RefundStatus = 'pending' | 'approved' | 'processing' | 'completed' | 'rejected';

export interface UserProfile {
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

export interface RefundRequest {
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

export interface AuditLog {
  id: string;
  adminId: string;
  adminEmail: string;
  action: 'update_user' | 'delete_user' | 'update_request' | 'bulk_action' | 'create_user';
  targetId: string;
  targetType: 'user' | 'refundRequest';
  changes: Record<string, { old: any; new: any }>;
  createdAt: any;
  affectedIds?: string[]; // Added for bulk actions
}

export interface ChatMessage {
  id: string;
  userId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  text: string;
  timestamp: any;
  isRead: boolean;
}

export interface BookingCode {
  id?: string;
  orderCode: string;
  amount: number;
  passengerName: string;
  flightNumber: string;
  status: 'valid' | 'refunded';
  createdAt?: any;
  updatedAt?: any;
}
