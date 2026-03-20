import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TicketCheck,
  Edit2,
  X,
  Plus,
  Eye,
  EyeOff,
  Clock,
  Info,
  Search,
  ChevronRight,
} from "lucide-react";
import { Card } from "../../../components/Card";
import { Button } from "../../../components/Button";
import { Badge } from "../../../components/Badge";
import { Pagination } from "../../../components/Pagination";
import { EmptyState } from "../../../components/EmptyState";
import { SkeletonRow } from "../../../components/SkeletonRow";
import { formatDate, cn } from "../../../utils";
import { RefundRequest, RefundStatus, UserProfile } from "../../../types";
import {
  db,
  auth,
  doc,
  updateDoc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp,
  writeBatch,
} from "../../../mockFirebase";

interface RefundRequestManagementProps {
  requests: RefundRequest[];
  isLoading?: boolean;
}

export function RefundRequestManagement({
  requests,
  isLoading,
}: RefundRequestManagementProps) {
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
  const [filter, setFilter] = useState<RefundStatus | "all">("all");
  const [bankFilter, setBankFilter] = useState<string>("all");
  const [pnrSearch, setPnrSearch] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "none">(
    "none",
  );
  const [actionToConfirm, setActionToConfirm] = useState<{
    id: string;
    status: RefundStatus;
  } | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<RefundRequest | null>(
    null,
  );
  const [isEditingRequest, setIsEditingRequest] =
    useState<RefundRequest | null>(null);
  const [editForm, setEditForm] = useState<Partial<RefundRequest>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const requestsPerPage = 15;

  const uniqueBanks = useMemo(() => {
    const banks = new Set(requests.map((r) => r.bankName));
    return Array.from(banks).sort();
  }, [requests]);

  const filteredRequests = useMemo(() => {
    let result = requests.filter((r) => {
      const statusMatch = filter === "all" || r.status === filter;
      const bankMatch = bankFilter === "all" || r.bankName === bankFilter;
      const pnrMatch =
        pnrSearch === "" ||
        r.orderCode.toLowerCase().includes(pnrSearch.toLowerCase());
      return statusMatch && bankMatch && pnrMatch;
    });

    if (sortOrder !== "none") {
      result = [...result].sort((a, b) => {
        const timeA =
          a.processingTime?.toDate?.()?.getTime() ||
          a.createdAt?.toDate?.()?.getTime() ||
          0;
        const timeB =
          b.processingTime?.toDate?.()?.getTime() ||
          b.createdAt?.toDate?.()?.getTime() ||
          0;
        return sortOrder === "newest" ? timeB - timeA : timeA - timeB;
      });
    }
    return result;
  }, [requests, filter, bankFilter, pnrSearch, sortOrder]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRequests.length / requestsPerPage),
  );
  const paginatedRequests = filteredRequests.slice(
    (currentPage - 1) * requestsPerPage,
    currentPage * requestsPerPage,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, bankFilter, pnrSearch, sortOrder]);

  const generateRefundSlipCode = () => {
    const date = new Date();
    const dateStr =
      date.getFullYear().toString() +
      String(date.getMonth() + 1).padStart(2, "0") +
      String(date.getDate()).padStart(2, "0");
    const random = Math.random().toString(36).substr(2, 5).toUpperCase();
    return `RH-${dateStr}-${random}`;
  };

  const handleSaveRequest = async () => {
    if (!isEditingRequest) return;
    setIsSaving(true);
    try {
      const updateData: Record<string, any> = { updatedAt: serverTimestamp() };
      const changes: Record<string, { old: any; new: any }> = {};

      const fieldsToCheck: (keyof RefundRequest)[] = [
        "bankName",
        "accountNumber",
        "accountHolder",
        "amount",
        "orderCode",
        "refundSlipCode",
        "transferNote",
        "refundReason",
        "isVisible",
      ];
      for (const field of fieldsToCheck) {
        const oldVal = (isEditingRequest as any)[field];
        const newVal = (editForm as any)[field];
        if (newVal !== undefined && newVal !== oldVal) {
          changes[field] = { old: oldVal, new: newVal };
          updateData[field] = newVal;
        }
      }

      if (editForm.status && editForm.status !== isEditingRequest.status) {
        changes["status"] = {
          old: isEditingRequest.status,
          new: editForm.status,
        };
        updateData["status"] = editForm.status;
        updateData["processingTime"] = serverTimestamp();
        if (editForm.status === "approved") {
          updateData["approvedBy"] =
            auth.currentUser?.email || auth.currentUser?.uid;
          updateData["approvedAt"] = serverTimestamp();
          updateData["isVisible"] = true;
          changes["isVisible"] = { old: isEditingRequest.isVisible, new: true };
        }
        if (editForm.status === "completed") {
          updateData["completedBy"] =
            auth.currentUser?.email || auth.currentUser?.uid;
          updateData["completedAt"] = serverTimestamp();
        }
      }

      await updateDoc(
        doc(db, "refundRequests", isEditingRequest.id),
        updateData,
      );

      if (Object.keys(changes).length > 0) {
        await addDoc(collection(db, "adminAuditLog"), {
          adminId: auth.currentUser?.uid,
          adminEmail: auth.currentUser?.email,
          action: "update_request",
          targetId: isEditingRequest.id,
          targetType: "refundRequest",
          changes,
          createdAt: serverTimestamp(),
        });
      }

      setIsEditingRequest(null);
      setSelectedRequest(null);
    } catch (error) {
      console.error("Error saving request:", error);
      alert("Lưu thay đổi thất bại. Vui lòng thử lại.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleBulkAction = async (
    status: "approved" | "processing" | "rejected" | "completed",
  ) => {
    const batch = writeBatch(db);
    const changes: Record<string, { old: RefundStatus; new: RefundStatus }> =
      {};
    selectedRequests.forEach((id) => {
      const req = requests.find((r) => r.id === id);
      if (req) changes[id] = { old: req.status, new: status };
      const reqRef = doc(db, "refundRequests", id);
      const updateData: any = { status, processingTime: serverTimestamp() };
      if (status === "approved" && req?.status !== "approved") {
        updateData.approvedBy =
          auth.currentUser?.email || auth.currentUser?.uid;
        updateData.approvedAt = serverTimestamp();
      }
      if (status === "completed" && req?.status !== "completed") {
        updateData.completedBy =
          auth.currentUser?.email || auth.currentUser?.uid;
        updateData.completedAt = serverTimestamp();
      }
      batch.update(reqRef, updateData);
    });
    await batch.commit();
    await addDoc(collection(db, "adminAuditLog"), {
      action: "bulk_action",
      status,
      affectedIds: selectedRequests,
      changes,
      createdAt: serverTimestamp(),
    });
    setSelectedRequests([]);
    setNotes({});
  };

  const toggleSelectAll = () => {
    if (selectedRequests.length === paginatedRequests.length) {
      setSelectedRequests([]);
    } else {
      setSelectedRequests(paginatedRequests.map((r) => r.id));
    }
  };

  const toggleSelect = (id: string) => {
    if (selectedRequests.includes(id)) {
      setSelectedRequests(selectedRequests.filter((r) => r !== id));
    } else {
      setSelectedRequests([...selectedRequests, id]);
    }
  };

  const handleUpdateStatus = async (id: string, status: RefundStatus) => {
    try {
      const request = requests.find((r) => r.id === id);
      if (!request) return;

      const oldStatus = request.status;
      const updateData: any = {
        status,
        adminNote: notes[id] || "",
        updatedAt: serverTimestamp(),
        processingTime: serverTimestamp(),
      };
      if (status === "approved" && oldStatus !== "approved") {
        updateData.approvedBy =
          auth.currentUser?.email || auth.currentUser?.uid;
        updateData.approvedAt = serverTimestamp();
      }
      if (status === "completed" && oldStatus !== "completed") {
        updateData.completedBy =
          auth.currentUser?.email || auth.currentUser?.uid;
        updateData.completedAt = serverTimestamp();
      }
      await updateDoc(doc(db, "refundRequests", id), updateData);

      const changes: Record<string, { old: any; new: any }> = {};
      if (status !== oldStatus) {
        changes.status = { old: oldStatus, new: status };
      }
      const newNote = notes[id] || "";
      if (newNote !== (request.adminNote || "")) {
        changes.adminNote = { old: request.adminNote || "", new: newNote };
      }

      if (Object.keys(changes).length > 0) {
        await addDoc(collection(db, "adminAuditLog"), {
          adminId: auth.currentUser?.uid,
          adminEmail: auth.currentUser?.email,
          action: "update_request",
          targetId: id,
          targetType: "refundRequest",
          changes,
          createdAt: serverTimestamp(),
        });
      }

      const userDoc = await getDoc(doc(db, "users", request.userId));
      const userData = userDoc.data() as UserProfile | undefined;

      if (userData?.fcmToken && userData.notificationsEnabled !== false) {
        let title = "";
        let body = "";

        if (status === "approved") {
          title = "Yêu cầu hoàn vé được duyệt";
          body = `Yêu cầu cho mã PNR ${request.orderCode} đã được duyệt. Số tiền: ${new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(request.amount)}`;
        } else if (status === "processing") {
          title = "Yêu cầu hoàn vé đang chuyển tiền";
          body = `Yêu cầu cho mã PNR ${request.orderCode} đang được chuyển tiền. Vui lòng chờ trong giây lát.`;
        } else if (status === "rejected") {
          title = "Yêu cầu hoàn vé bị từ chối";
          body = `Yêu cầu cho mã PNR ${request.orderCode} đã bị từ chối. Ghi chú: ${notes[id] || "Không có"}`;
        } else if (status === "completed") {
          title = "Yêu cầu hoàn vé đã hoàn tất";
          body = `Yêu cầu cho mã PNR ${request.orderCode} đã được xử lý hoàn tất. Vui lòng kiểm tra tài khoản của bạn.`;
        }

        if (title && body) {
          await fetch("/api/notify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: userData.fcmToken, title, body }),
          });
        }
      }
    } catch (error) {
      console.error("Error updating request:", error);
      alert("Cập nhật trạng thái yêu cầu thất bại. Vui lòng thử lại.");
    }
  };

  const handleToggleVisibility = async (
    req: RefundRequest,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    try {
      const newVisibility = req.isVisible === false ? true : false;
      await updateDoc(doc(db, "refundRequests", req.id), {
        isVisible: newVisibility,
      });
      await addDoc(collection(db, "adminAuditLog"), {
        adminId: auth.currentUser?.uid,
        adminEmail: auth.currentUser?.email,
        action: "update_request",
        targetId: req.id,
        targetType: "refundRequest",
        changes: {
          isVisible: { old: req.isVisible !== false, new: newVisibility },
        },
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error toggling visibility:", error);
      alert("Lỗi khi cập nhật hiển thị.");
    }
  };

  return (
    <div className="w-full bg-white rounded-md overflow-hidden shadow-md border border-[#06427D]">
      <AnimatePresence>
        {selectedRequest && (
          <>
            <motion.div
              key="selected-request-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-md"
              onClick={() => {
                setSelectedRequest(null);
                setIsEditingRequest(null);
              }}
            />
            <motion.div
              key="selected-request-modal"
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
                    <h3 className="text-base font-bold text-black">
                      Chi tiết yêu cầu hoàn vé
                    </h3>
                    <p className="text-[10px] text-black">
                      Mã PNR:{" "}
                      <span className="font-semibold">
                        {selectedRequest.orderCode}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!isEditingRequest ? (
                    <button
                      onClick={() => {
                        setIsEditingRequest(selectedRequest);
                        setEditForm(selectedRequest);
                      }}
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
                  <button
                    onClick={() => {
                      setSelectedRequest(null);
                      setIsEditingRequest(null);
                    }}
                    className="p-2 rounded-xl text-gray-600 hover:text-black hover:bg-gray-100 transition-all active:scale-95"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="p-5 space-y-4 flex-1">
                {isEditingRequest ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-black uppercase">
                          Mã PNR
                        </label>
                        <input
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
                          value={editForm.orderCode || ""}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              orderCode: e.target.value.toUpperCase(),
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-black uppercase">
                          Số tiền (VND)
                        </label>
                        <input
                          type="number"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
                          value={editForm.amount || ""}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              amount: Number(e.target.value),
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-black uppercase">
                          Tên ngân hàng
                        </label>
                        <input
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
                          value={editForm.bankName || ""}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              bankName: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-black uppercase">
                          Số tài khoản
                        </label>
                        <input
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
                          value={editForm.accountNumber || ""}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              accountNumber: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-black uppercase">
                          Chủ tài khoản
                        </label>
                        <input
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
                          value={editForm.accountHolder || ""}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              accountHolder: e.target.value.toUpperCase(),
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-black uppercase">
                          Mã phiếu hoàn tiền
                        </label>
                        <div className="flex gap-2">
                          <input
                            disabled
                            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                            value={
                              editForm.refundSlipCode ||
                              selectedRequest.refundSlipCode ||
                              ""
                            }
                            placeholder="Chưa có mã phiếu"
                          />
                          <button
                            onClick={() =>
                              setEditForm({
                                ...editForm,
                                refundSlipCode: generateRefundSlipCode(),
                              })
                            }
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
                        <label className="text-xs font-bold text-black uppercase">
                          Lý do hoàn tiền
                        </label>
                        <input
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
                          value={editForm.refundReason || ""}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              refundReason: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-black uppercase">
                          Ngày bay
                        </label>
                        <input
                          type="date"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
                          value={editForm.flightDate || ""}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              flightDate: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-black uppercase">
                          Số vé máy bay
                        </label>
                        <input
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
                          value={editForm.ticketNumber || ""}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              ticketNumber: e.target.value.toUpperCase(),
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-black uppercase">
                          Tên hành khách
                        </label>
                        <input
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
                          value={editForm.passengerName || ""}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              passengerName: e.target.value.toUpperCase(),
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-black uppercase">
                          Trạng thái
                        </label>
                        <select
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
                          value={editForm.status || "pending"}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              status: e.target.value as RefundStatus,
                            })
                          }
                        >
                          <option value="pending">Chờ duyệt</option>
                          <option value="approved">Đã duyệt</option>
                          <option value="processing">Đang chuyển tiền</option>
                          <option value="completed">Hoàn tất</option>
                          <option value="rejected">Từ chối</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-black uppercase">
                          Ghi chú chuyển khoản
                        </label>
                        <input
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
                          value={editForm.transferNote || ""}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              transferNote: e.target.value,
                            })
                          }
                          placeholder="VD: Đã chuyển lúc 14:30"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-black uppercase">
                        Ghi chú Admin
                      </label>
                      <textarea
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none resize-none"
                        rows={2}
                        value={editForm.adminNote || ""}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            adminNote: e.target.value,
                          })
                        }
                        placeholder="Ghi chú cho khách hàng..."
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl border border-blue-100">
                      <div className="flex items-center gap-2">
                        <Eye size={16} className="text-blue-600" />
                        <span className="text-sm font-semibold text-blue-900">
                          Hiển thị thông tin cho khách hàng
                        </span>
                      </div>
                      <button
                        onClick={() =>
                          setEditForm({
                            ...editForm,
                            isVisible: !editForm.isVisible,
                          })
                        }
                        className={cn(
                          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
                          editForm.isVisible ? "bg-blue-600" : "bg-gray-200",
                        )}
                      >
                        <span
                          className={cn(
                            "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                            editForm.isVisible
                              ? "translate-x-6"
                              : "translate-x-1",
                          )}
                        />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Badge status={selectedRequest.status} />
                      <div
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                          selectedRequest.isVisible !== false
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-gray-100 text-gray-500",
                        )}
                      >
                        {selectedRequest.isVisible !== false ? (
                          <>
                            <Eye size={12} /> Đang hiển thị cho khách
                          </>
                        ) : (
                          <>
                            <EyeOff size={12} /> Đang ẩn với khách
                          </>
                        )}
                      </div>
                    </div>

                    {selectedRequest.refundSlipCode && (
                      <div className="bg-violet-50 border border-violet-100 rounded-xl p-4 text-center">
                        <p className="text-[10px] font-bold text-violet-600 uppercase tracking-wider mb-1">
                          Mã phiếu hoàn tiền
                        </p>
                        <p className="text-lg font-bold text-violet-700">
                          {selectedRequest.refundSlipCode}
                        </p>
                      </div>
                    )}

                    <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                      <p className="text-xs font-bold text-black uppercase tracking-wider">
                        Thông tin hành khách
                      </p>
                      <div className="flex justify-between">
                        <span className="text-sm text-black">
                          Tên hành khách:
                        </span>
                        <span className="font-semibold text-sm text-black">
                          {selectedRequest.passengerName ||
                            selectedRequest.displayName ||
                            "-"}
                        </span>
                      </div>
                      {selectedRequest.ticketNumber && (
                        <div className="flex justify-between">
                          <span className="text-sm text-black">Số vé:</span>
                          <span className="font-medium text-sm text-black">
                            {selectedRequest.ticketNumber}
                          </span>
                        </div>
                      )}
                      {selectedRequest.flightDate && (
                        <div className="flex justify-between">
                          <span className="text-sm text-black">Ngày bay:</span>
                          <span className="font-medium text-sm text-black">
                            {selectedRequest.flightDate}
                          </span>
                        </div>
                      )}
                      {selectedRequest.refundReason && (
                        <div className="flex justify-between">
                          <span className="text-sm text-black">Lý do:</span>
                          <span className="font-medium text-sm text-black">
                            {selectedRequest.refundReason === "hoan_ve"
                              ? "Hoàn vé"
                              : selectedRequest.refundReason === "huy_chuyen"
                                ? "Hủy chuyến bay"
                                : selectedRequest.refundReason ===
                                    "thay_doi_lich"
                                  ? "Thay đổi lịch"
                                  : "Khác"}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                      <p className="text-xs font-bold text-black uppercase tracking-wider">
                        Thông tin nhận tiền
                      </p>
                      <div className="flex justify-between">
                        <span className="text-sm text-black">Ngân hàng:</span>
                        <span className="font-medium text-sm text-black">
                          {selectedRequest.bankName}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-black">
                          Số tài khoản:
                        </span>
                        <span className="font-medium text-sm text-black">
                          {selectedRequest.accountNumber}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-black">
                          Chủ tài khoản:
                        </span>
                        <span className="font-medium text-sm text-black uppercase">
                          {selectedRequest.accountHolder}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-xs text-black uppercase mb-1">
                          Số tiền hoàn
                        </p>
                        <p className="text-lg font-bold text-blue-600">
                          {new Intl.NumberFormat("vi-VN", {
                            style: "currency",
                            currency: "VND",
                          }).format(selectedRequest.amount)}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-xs text-black uppercase mb-1">
                          Ngày tạo
                        </p>
                        <p className="text-sm font-semibold text-black">
                          {formatDate(
                            selectedRequest.createdAt,
                            "dd/MM/yyyy HH:mm",
                          )}
                        </p>
                      </div>
                    </div>

                    {selectedRequest.transferNote && (
                      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                        <p className="text-xs font-bold text-amber-600 uppercase mb-1">
                          Ghi chú chuyển khoản
                        </p>
                        <p className="text-sm text-black">
                          {selectedRequest.transferNote}
                        </p>
                      </div>
                    )}

                    {selectedRequest.adminNote && (
                      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                        <p className="text-xs font-bold text-blue-600 uppercase mb-1">
                          Ghi chú Admin
                        </p>
                        <p className="text-sm text-black">
                          {selectedRequest.adminNote}
                        </p>
                      </div>
                    )}

                    {!selectedRequest.adminNote &&
                      selectedRequest.status === "pending" && (
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                          <Clock
                            size={20}
                            className="text-gray-600 mx-auto mb-1"
                          />
                          <p className="text-xs text-black">
                            Yêu cầu đang chờ admin xử lý.
                          </p>
                        </div>
                      )}

                    <div className="space-y-2">
                      <p className="text-xs font-bold text-black uppercase tracking-wider">
                        Lịch sử xử lý
                      </p>
                      <div className="space-y-2">
                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                          <div>
                            <p className="text-xs font-semibold text-black">
                              Yêu cầu được tạo
                            </p>
                            <p className="text-[10px] text-gray-600">
                              {formatDate(
                                selectedRequest.createdAt,
                                "dd/MM/yyyy HH:mm",
                              )}
                            </p>
                          </div>
                        </div>
                        {selectedRequest.processingTime && (
                          <div className="flex items-start gap-3">
                            <div
                              className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${selectedRequest.status === "completed" ? "bg-emerald-500" : selectedRequest.status === "rejected" ? "bg-rose-500" : selectedRequest.status === "processing" ? "bg-violet-500" : "bg-blue-500"}`}
                            />
                            <div>
                              <p className="text-xs font-semibold text-black">
                                {selectedRequest.status === "completed"
                                  ? "Hoàn tiền thành công"
                                  : selectedRequest.status === "rejected"
                                    ? "Yêu cầu bị từ chối"
                                    : selectedRequest.status === "processing"
                                      ? "Đang chuyển tiền"
                                      : selectedRequest.status === "approved"
                                        ? "Đã duyệt - Đang xử lý"
                                        : "Cập nhật trạng thái"}
                              </p>
                              <p className="text-[10px] text-gray-600">
                                {formatDate(
                                  selectedRequest.processingTime,
                                  "dd/MM/yyyy HH:mm",
                                )}
                              </p>
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
                    <Button
                      variant="secondary"
                      className="flex-1"
                      onClick={() => setIsEditingRequest(null)}
                    >
                      Hủy
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={handleSaveRequest}
                      loading={isSaving}
                    >
                      {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => {
                      setSelectedRequest(null);
                      setIsEditingRequest(null);
                    }}
                  >
                    Đóng
                  </Button>
                )}
              </div>
            </motion.div>
          </>
        )}
        {actionToConfirm && (
          <>
            <motion.div
              key="action-confirm-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-md"
              onClick={() => setActionToConfirm(null)}
            />
            <motion.div
              key="action-confirm-modal"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm glass-card shadow-2xl p-6 text-center"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm shadow-blue-200/50">
                <Info size={32} />
              </div>
              <h3 className="text-xl font-bold text-black mb-2">
                Xác nhận hành động?
              </h3>
              <p className="text-black mb-6">
                Bạn có chắc chắn muốn chuyển trạng thái yêu cầu sang{" "}
                <span className="font-bold text-black">
                  {actionToConfirm.status === "pending"
                    ? "Chờ duyệt"
                    : actionToConfirm.status === "approved"
                      ? "Đã duyệt"
                      : actionToConfirm.status === "completed"
                        ? "Hoàn tất"
                        : "Từ chối"}
                </span>
                ?
              </p>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setActionToConfirm(null)}
                >
                  Hủy
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => {
                    handleUpdateStatus(
                      actionToConfirm.id,
                      actionToConfirm.status,
                    );
                    setActionToConfirm(null);
                  }}
                >
                  Xác nhận
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="bg-[#06427D] py-2.5 px-4 flex items-center justify-between border-b border-[#0A73D1]">
        <div className="flex items-center gap-2">
          <TicketCheck size={20} className="text-white" />
          <h3 className="text-white font-bold text-[16px] uppercase font-sans tracking-wide">
            Quản lý hoàn vé máy bay
          </h3>
        </div>
      </div>

      <div className="p-4">
        <div className="flex flex-col lg:flex-row justify-between items-center gap-3 bg-gray-50 p-2.5 border border-gray-200 rounded mb-3">
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full lg:w-auto">
            <div className="relative w-full sm:w-44">
              <input
                type="text"
                placeholder="Mã PNR..."
                value={pnrSearch}
                onChange={(e) => setPnrSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-[13px] border border-gray-300 rounded outline-none focus:border-blue-500"
              />
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            </div>
            <select
              value={bankFilter}
              onChange={(e) => setBankFilter(e.target.value)}
              className="w-full sm:w-auto px-3 py-1.5 text-[13px] border border-gray-300 rounded outline-none focus:border-blue-500 font-bold bg-white"
            >
              <option value="all">NGÂN HÀNG: TẤT CẢ</option>
              {uniqueBanks.map((bank) => (
                <option key={bank} value={bank}>
                  {bank}
                </option>
              ))}
            </select>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
              className="w-full sm:w-auto px-3 py-1.5 text-[13px] border border-gray-300 rounded outline-none focus:border-blue-500 font-bold bg-white"
            >
              <option value="none">SẮP XẾP: MẶC ĐỊNH</option>
              <option value="newest">MỚI NHẤT TRƯỚC</option>
              <option value="oldest">CŨ NHẤT TRƯỚC</option>
            </select>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full lg:w-auto pb-1 lg:pb-0">
            <span className="text-[11px] font-bold text-gray-700 uppercase mr-1 whitespace-nowrap hidden xl:block">
              Trạng thái:
            </span>
            {(
              [
                "all",
                "pending",
                "approved",
                "processing",
                "completed",
                "rejected",
              ] as const
            ).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "whitespace-nowrap px-2.5 py-1 text-[11px] md:text-[12px] font-bold rounded transition-colors",
                  filter === f
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-100",
                )}
              >
                {f === "all"
                  ? "Tất cả"
                  : f === "pending"
                    ? "Chờ"
                    : f === "approved"
                      ? "Duyệt"
                      : f === "processing"
                        ? "Chuyển"
                        : f === "completed"
                          ? "H.tất"
                          : "Từ chối"}
              </button>
            ))}
          </div>
        </div>

        <div className="border border-gray-200 rounded overflow-hidden">
          {selectedRequests.length > 0 && (
            <div className="bg-blue-50 text-blue-900 p-2.5 flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-blue-200">
              <div className="flex items-center gap-2 font-bold text-[12px] md:text-[13px]">
                <TicketCheck size={16} className="text-blue-600" />
                <span className="uppercase whitespace-nowrap">
                  Chọn {selectedRequests.length} mục
                </span>
              </div>
              <div className="grid grid-cols-2 sm:flex gap-2 w-full sm:w-auto">
                <button
                  onClick={() => handleBulkAction("approved")}
                  className="px-2 py-1.5 text-[10px] md:text-[11px] bg-blue-600 text-white rounded shadow-sm hover:bg-blue-700 font-bold transition-colors uppercase"
                >
                  Duyệt
                </button>
                <button
                  onClick={() => handleBulkAction("processing")}
                  className="px-2 py-1.5 text-[10px] md:text-[11px] bg-violet-600 text-white rounded shadow-sm hover:bg-violet-700 font-bold transition-colors uppercase"
                >
                  Chuyển
                </button>
                <button
                  onClick={() => handleBulkAction("completed")}
                  className="px-2 py-1.5 text-[10px] md:text-[11px] bg-emerald-600 text-white rounded shadow-sm hover:bg-emerald-700 font-bold transition-colors uppercase"
                >
                  H.tất
                </button>
                <button
                  onClick={() => handleBulkAction("rejected")}
                  className="px-2 py-1.5 text-[10px] md:text-[11px] bg-red-600 text-white rounded shadow-sm hover:bg-red-700 font-bold transition-colors uppercase"
                >
                  Từ chối
                </button>
              </div>
            </div>
          )}

          {/* Table View (Desktop) */}
          <div className="hidden md:block overflow-x-auto w-full">
            <table className="w-full text-left text-[13px] text-gray-700 min-w-[1000px]">
              <thead>
                <tr className="bg-[#f5f5f5] text-[#0A58A3] border-b border-gray-300">
                  <th className="px-3 py-2.5 w-10 border-r border-gray-300 text-center">
                    <input
                      type="checkbox"
                      className="cursor-pointer"
                      checked={
                        selectedRequests.length === paginatedRequests.length &&
                        paginatedRequests.length > 0
                      }
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="px-3 py-2.5 font-bold uppercase w-36 border-r border-gray-300">
                    Mã PNR / Ngày đặt
                  </th>
                  <th className="px-3 py-2.5 font-bold uppercase w-48 border-r border-gray-300">
                    Khách hàng
                  </th>
                  <th className="px-3 py-2.5 font-bold uppercase w-48 border-r border-gray-300">
                    Thông tin nhận tiền
                  </th>
                  <th className="px-3 py-2.5 font-bold uppercase w-32 border-r border-gray-300 text-right">
                    Số tiền hoàn
                  </th>
                  <th className="px-3 py-2.5 font-bold uppercase min-w-[150px] border-r border-gray-300">
                    Ghi chú Admin
                  </th>
                  <th className="px-3 py-2.5 font-bold uppercase w-32 text-center border-r border-gray-300">
                    Trạng thái
                  </th>
                  <th className="px-3 py-2.5 font-bold uppercase w-28 text-center">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <SkeletonRow key={i} cols={8} />
                  ))
                ) : paginatedRequests.length > 0 ? (
                  paginatedRequests.map((req) => (
                    <tr
                      key={req.id}
                      className="hover:bg-blue-50 transition-colors"
                    >
                      <td className="px-3 py-2.5 border-r border-gray-100 text-center">
                        <input
                          type="checkbox"
                          className="cursor-pointer"
                          checked={selectedRequests.includes(req.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleSelect(req.id);
                          }}
                        />
                      </td>
                      <td className="px-3 py-2.5 border-r border-gray-100 italic">
                        <div className="flex flex-col">
                          <p
                            className="text-[13px] font-black tracking-widest text-[#0A58A3] cursor-pointer hover:underline uppercase"
                            onClick={() => setSelectedRequest(req)}
                          >
                            {req.orderCode}
                          </p>
                          <p className="text-[11px] font-bold text-gray-500">
                            {formatDate(req.createdAt, "dd/MM/yyyy HH:mm")}
                          </p>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 border-r border-gray-100">
                        <div className="flex flex-col">
                          <span className="text-[12px] font-bold text-black uppercase truncate whitespace-nowrap overflow-hidden">
                            {req.displayName || "Khách hàng"}
                          </span>
                          <span className="text-[11px] text-gray-500 truncate whitespace-nowrap overflow-hidden">
                            {req.userEmail}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 border-r border-gray-100">
                        <div className="flex flex-col">
                          <span className="text-[12px] font-bold text-black uppercase whitespace-nowrap overflow-hidden">
                            {req.bankName}
                          </span>
                          <span className="text-[11px] font-bold text-gray-600 truncate whitespace-nowrap overflow-hidden">
                            {req.accountNumber}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 border-r border-gray-100 text-right font-black text-[#FF6600]">
                        {new Intl.NumberFormat("vi-VN", {
                          style: "currency",
                          currency: "VND",
                        }).format(req.amount)}
                      </td>
                      <td className="px-3 py-2.5 border-r border-gray-100">
                        <input
                          className="w-full px-2 py-1 text-[12px] border border-gray-300 rounded focus:border-[#0A73D1] outline-none"
                          placeholder="Ghi chú nhanh..."
                          value={
                            notes[req.id] !== undefined
                              ? notes[req.id]
                              : req.adminNote || ""
                          }
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) =>
                            setNotes({ ...notes, [req.id]: e.target.value })
                          }
                          onBlur={() => handleUpdateStatus(req.id, req.status)}
                        />
                      </td>
                      <td className="px-3 py-2.5 border-r border-gray-100 text-center">
                        <Badge status={req.status} className="!text-[10px]" />
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRequest(req);
                              setIsEditingRequest(req);
                              setEditForm(req);
                            }}
                            className="text-[#0A58A3] hover:text-[#06427D] transition-colors"
                            title="Chỉnh sửa"
                          >
                            <Edit2 size={14} />
                          </button>
                          <span className="text-gray-300">|</span>
                          <button
                            onClick={(e) => handleToggleVisibility(req, e)}
                            className={cn(
                              "transition-colors",
                              req.isVisible !== false
                                ? "text-emerald-600 hover:text-emerald-800"
                                : "text-gray-400 hover:text-gray-600",
                            )}
                            title={
                              req.isVisible !== false ? "Đang hiện" : "Đang ẩn"
                            }
                          >
                            {req.isVisible !== false ? (
                              <Eye size={14} />
                            ) : (
                              <EyeOff size={14} />
                            )}
                          </button>
                          <span className="text-gray-300">|</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRequest(req);
                            }}
                            className="text-gray-500 hover:text-gray-800 transition-colors"
                            title="Chi tiết"
                          >
                            <Info size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-3 py-10 text-center text-red-500 font-bold italic border-t border-gray-200 bg-red-50"
                    >
                      KHÔNG TÌM THẤY YÊU CẦU NÀO
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Card View (Mobile) */}
          <div className="md:hidden divide-y divide-gray-100">
            {isLoading ? (
               <div className="p-10 text-center text-gray-400 grayscale">Đang tải...</div>
            ) : paginatedRequests.length > 0 ? (
               paginatedRequests.map((req) => (
                 <div 
                   key={req.id} 
                   className={cn(
                     "p-4 active:bg-blue-50 transition-colors relative",
                     selectedRequests.includes(req.id) ? "bg-blue-50/50" : "bg-white"
                   )}
                   onClick={() => setSelectedRequest(req)}
                 >
                   <div className="absolute left-0 top-0 bottom-0 w-1 bg-transparent group-active:bg-blue-500" />
                   
                   <div className="flex justify-between items-start mb-2">
                     <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-gray-300"
                          checked={selectedRequests.includes(req.id)}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleSelect(req.id);
                          }}
                        />
                        <div>
                          <p className="text-[13px] font-black text-[#0A58A3] uppercase tracking-tighter leading-none">{req.orderCode}</p>
                          <p className="text-[10px] text-gray-500 mt-1 font-bold">{formatDate(req.createdAt, "dd/MM/yyyy HH:mm")}</p>
                        </div>
                     </div>
                     <Badge status={req.status} className="!text-[9px] !px-1.5 !py-0.5 shadow-sm" />
                   </div>

                   <div className="grid grid-cols-2 gap-3 my-3">
                     <div className="min-w-0">
                        <p className="text-[9px] text-gray-400 font-bold uppercase mb-0.5">Khách hàng</p>
                        <p className="text-[12px] font-bold text-gray-800 truncate">{req.displayName || "Khách hàng"}</p>
                     </div>
                     <div className="text-right min-w-0">
                        <p className="text-[9px] text-gray-400 font-bold uppercase mb-0.5">Số tiền hoàn</p>
                        <p className="text-[13px] font-black text-[#FF6600]">
                          {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(req.amount)}
                        </p>
                     </div>
                   </div>

                   <div className="bg-gray-50/80 p-2 rounded border border-gray-100 mb-3">
                      <p className="text-[9px] text-gray-400 font-bold uppercase mb-1">Thông tin nhận tiền</p>
                      <div className="flex justify-between items-center">
                        <p className="text-[11px] font-bold text-gray-700">{req.bankName}</p>
                        <p className="text-[11px] font-black text-blue-900 tracking-tight">{req.accountNumber}</p>
                      </div>
                   </div>

                   <div className="flex justify-between items-center">
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRequest(req);
                            setIsEditingRequest(req);
                            setEditForm(req);
                          }}
                          className="p-1.5 bg-blue-50 text-blue-700 rounded border border-blue-200"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={(e) => handleToggleVisibility(req, e)}
                          className={cn(
                            "p-1.5 rounded border transition-colors",
                            req.isVisible !== false ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-gray-50 text-gray-400 border-gray-200"
                          )}
                        >
                          {req.isVisible !== false ? <Eye size={12} /> : <EyeOff size={12} />}
                        </button>
                      </div>
                      <button className="text-[11px] font-bold text-[#06427D] uppercase flex items-center gap-1">
                        Chi tiết <ChevronRight size={10} />
                      </button>
                   </div>
                 </div>
               ))
            ) : (
               <div className="p-10 text-center text-red-500 font-bold bg-red-50">KHÔNG CÓ DỮ LIỆU</div>
            )}
          </div>
        </div>
        {!isLoading && filteredRequests.length > requestsPerPage && (
          <div className="mt-3 pb-4 px-4">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}
