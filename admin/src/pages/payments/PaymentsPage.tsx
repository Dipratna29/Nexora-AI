import React, { useEffect, useState } from 'react';
import {
  CreditCard,
  CheckCircle2,
  Clock,
  XCircle,
  ShieldCheck,
  Eye,
  RotateCcw,
  RefreshCw,
  AlertCircle,
  Package,
  User as UserIcon,
  FileText
} from 'lucide-react';
import api from '../../lib/api';
import { PaymentRecord, Column } from '../../types';
import { DataTable } from '../../components/common/DataTable';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

export const PaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(15);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Inspection modal state
  const [inspectPayment, setInspectPayment] = useState<PaymentRecord | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState<boolean>(false);

  // Refund dialog state
  const [refundPayment, setRefundPayment] = useState<PaymentRecord | null>(null);
  const [isRefunding, setIsRefunding] = useState<boolean>(false);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchPayments = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/api/admin/payments', {
        page,
        page_size: pageSize,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        search: search || undefined,
      });
      if (res.success) {
        setPayments(res.payments || []);
        setTotal(res.total || 0);
        setTotalPages(res.total_pages || 1);
      }
    } catch (err) {
      console.error('Failed to load payments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [page, statusFilter]);

  // Auto-refresh when returning to tab/window
  useEffect(() => {
    const handleFocus = () => {
      fetchPayments();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Reconcile loading state
  const [isReconciling, setIsReconciling] = useState<boolean>(false);

  const handleReconcilePayment = async (paymentId: number) => {
    setIsReconciling(true);
    setActionNotice(null);
    try {
      const res = await api.post(`/api/admin/payments/${paymentId}/reconcile`);
      if (res.success && res.payment) {
        setInspectPayment(res.payment);
        setActionNotice({
          type: 'success',
          message: 'Payment successfully reconciled directly with Razorpay API.',
        });
        await fetchPayments();
      } else {
        setActionNotice({
          type: 'error',
          message: res.message || 'Gateway reconciliation was not completed.',
        });
      }
    } catch (err: any) {
      setActionNotice({
        type: 'error',
        message: err?.response?.data?.message || err?.message || 'Gateway reconciliation failed',
      });
    } finally {
      setIsReconciling(false);
    }
  };

  const handleOpenInspect = async (row: PaymentRecord) => {
    setInspectPayment(row);
    setIsDetailLoading(true);
    try {
      const res = await api.get(`/api/admin/payments/${row.id}`);
      if (res.success && res.payment) {
        setInspectPayment(res.payment);
      }
    } catch (err) {
      console.warn('Could not load detailed payment record:', err);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleConfirmRefund = async (reason?: string) => {
    if (!refundPayment) return;
    setIsRefunding(true);
    setActionNotice(null);
    try {
      const res = await api.post(`/api/admin/payments/${refundPayment.id}/refund`, {
        reason: reason || 'Admin initiated refund from control website',
      });
      if (res.success) {
        setActionNotice({
          type: 'success',
          message: res.message || 'Refund successfully executed and processed.',
        });
        setRefundPayment(null);
        setInspectPayment(null);
        await fetchPayments();
      } else {
        setActionNotice({
          type: 'error',
          message: res.message || 'Refund request was rejected by payment gateway.',
        });
      }
    } catch (err: any) {
      setActionNotice({
        type: 'error',
        message: err?.response?.data?.message || err?.message || 'Failed to execute refund',
      });
    } finally {
      setIsRefunding(false);
    }
  };

  const columns: Column<PaymentRecord>[] = [
    {
      key: 'razorpay_order_id',
      header: 'Order Reference',
      render: (row) => (
        <div>
          <p className="font-mono font-bold text-xs text-slate-900 dark:text-slate-100">{row.razorpay_order_id}</p>
          <p className="font-mono text-[10px] text-slate-400">Rcpt: {row.receipt || '—'}</p>
        </div>
      ),
    },
    {
      key: 'user_id',
      header: 'Traveler',
      render: (row) => (
        <div>
          <p className="font-semibold text-xs text-slate-900 dark:text-slate-100">
            {row.traveler_name || `User #${row.user_id}`}
          </p>
          {row.traveler_username ? (
            <p className="text-[10px] text-slate-400">@{row.traveler_username}</p>
          ) : null}
        </div>
      ),
    },
    {
      key: 'equipment_id',
      header: 'Equipment',
      render: (row) => (
        <div>
          <p className="font-medium text-xs text-slate-800 dark:text-slate-200">
            {row.equipment_name || 'Safety Gear'}
          </p>
          <p className="text-[10px] text-slate-400">Qty: {row.quantity || 1} unit(s)</p>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (row) => (
        <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
          {formatCurrency((row.amount_paise || 0) / 100, row.currency || 'INR')}
        </span>
      ),
    },
    {
      key: 'razorpay_payment_id',
      header: 'Gateway Payment ID',
      render: (row) => (
        <span className="font-mono text-xs text-slate-500">{row.razorpay_payment_id || 'Pending Gateway Capture'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        const s = (row.status || 'PENDING').toUpperCase();
        if (s === 'PAID') return <Badge variant="success" dot>Captured / Paid</Badge>;
        if (s === 'REFUNDED') return <Badge variant="info" dot>Refunded</Badge>;
        if (s === 'FAILED') return <Badge variant="danger" dot>Failed</Badge>;
        return <Badge variant="warning" dot>Pending</Badge>;
      },
    },
    {
      key: 'created_at',
      header: 'Date',
      render: (row) => <span className="text-xs">{formatDateTime(row.created_at)}</span>,
    },
    {
      key: 'id',
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleOpenInspect(row)}
            title="Inspect Payment Details"
          >
            <Eye className="w-3.5 h-3.5 text-blue-500" />
            Inspect
          </Button>
          {(row.status || '').toUpperCase() === 'PAID' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setRefundPayment(row)}
              title="Issue Refund"
              className="text-rose-600 border-rose-200 dark:border-rose-900 hover:bg-rose-50 dark:hover:bg-rose-950/50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Refund
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-emerald-600" />
            Safety Equipment Payment Transactions
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Audit Razorpay payment captures, verify signatures server-side, inspect equipment orders, and process refunds.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={fetchPayments}
            isLoading={isLoading}
            title="Reload latest payments from server"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 text-blue-500 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {actionNotice && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-xs font-semibold ${
            actionNotice.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800'
          }`}
        >
          <span>{actionNotice.message}</span>
          <button onClick={() => setActionNotice(null)} className="text-xs underline ml-4">
            Dismiss
          </button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={payments}
        total={total}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        isLoading={isLoading}
        onPageChange={setPage}
        onSearch={(q) => {
          setSearch(q);
          setPage(1);
          fetchPayments();
        }}
        searchPlaceholder="Search by order ID, payment ID, receipt, user..."
        searchValue={search}
        exportFilename="trusttrip_payments"
        filters={
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs font-semibold px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
          >
            <option value="ALL">All Payment Statuses</option>
            <option value="PAID">PAID / Captured</option>
            <option value="PENDING">PENDING</option>
            <option value="REFUNDED">REFUNDED</option>
            <option value="FAILED">FAILED</option>
          </select>
        }
      />

      {/* INSPECTION MODAL */}
      {inspectPayment && (
        <Modal
          isOpen={!!inspectPayment}
          onClose={() => setInspectPayment(null)}
          title={`Payment Transaction #${inspectPayment.id}`}
          maxWidth="lg"
        >
          <div className="space-y-6">
            {/* TOP SUMMARY */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Payable Total</p>
                <p className="text-2xl font-black text-slate-900 dark:text-slate-100">
                  {formatCurrency((inspectPayment.amount_paise || 0) / 100, inspectPayment.currency || 'INR')}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Status</p>
                {(() => {
                  const s = (inspectPayment.status || 'PENDING').toUpperCase();
                  if (s === 'PAID') return <Badge variant="success" dot>Captured / Paid</Badge>;
                  if (s === 'REFUNDED') return <Badge variant="info" dot>Refunded</Badge>;
                  if (s === 'FAILED') return <Badge variant="danger" dot>Failed</Badge>;
                  return <Badge variant="warning" dot>Pending</Badge>;
                })()}
              </div>
            </div>

            {/* TWO COLUMN BREAKDOWN */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* CUSTOMER INFO */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <UserIcon className="w-4 h-4 text-blue-500" />
                  Traveler Details
                </div>
                <div className="text-xs space-y-1">
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    {inspectPayment.traveler?.name || inspectPayment.traveler_name || `User #${inspectPayment.user_id}`}
                  </p>
                  <p className="text-slate-500">Username: @{inspectPayment.traveler?.username || inspectPayment.traveler_username || 'n/a'}</p>
                  <p className="text-slate-500">Contact: {inspectPayment.traveler?.mob || inspectPayment.traveler_mob || 'Not provided'}</p>
                </div>
              </div>

              {/* EQUIPMENT & STOCK AUDIT */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <Package className="w-4 h-4 text-emerald-500" />
                  Safety Equipment & Stock Audit
                </div>
                <div className="text-xs space-y-1">
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    {inspectPayment.equipment?.name || inspectPayment.equipment_name || 'Safety Gear'}
                  </p>
                  <p className="text-slate-500">SKU: {inspectPayment.equipment?.sku || inspectPayment.equipment_sku || '—'}</p>
                  <p className="text-slate-500">Quantity Ordered: <span className="font-bold text-slate-800 dark:text-slate-200">{inspectPayment.quantity || 1} unit(s)</span></p>
                  {inspectPayment.inventory_audit?.previous_stock !== undefined && (
                    <p className="text-slate-500">Stock Before Order: <span className="font-medium text-slate-700 dark:text-slate-300">{inspectPayment.inventory_audit.previous_stock} units</span></p>
                  )}
                  {inspectPayment.inventory_audit?.new_stock !== undefined && (
                    <p className="text-slate-500">Stock After Order: <span className="font-medium text-emerald-600 dark:text-emerald-400">{inspectPayment.inventory_audit.new_stock} units</span></p>
                  )}
                  {inspectPayment.inventory_audit?.transaction_id && (
                    <p className="text-[10px] text-slate-400 font-mono">Ledger Entry #{inspectPayment.inventory_audit.transaction_id} ({inspectPayment.inventory_audit.transaction_type})</p>
                  )}
                  <p className="text-slate-500 pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
                    Current Live Warehouse Stock: <span className="font-semibold text-slate-800 dark:text-slate-200">{inspectPayment.inventory_audit?.current_warehouse_stock ?? inspectPayment.equipment?.current_stock ?? '—'} units</span>
                  </p>
                </div>
              </div>
            </div>

            {/* GATEWAY AUDIT INFO */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                <FileText className="w-4 h-4 text-purple-500" />
                Gateway References & Audit Flags
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400">Razorpay Order ID: </span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{inspectPayment.razorpay_order_id}</span>
                </div>
                <div>
                  <span className="text-slate-400">Gateway Payment ID: </span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{inspectPayment.razorpay_payment_id || 'Pending'}</span>
                </div>
                <div>
                  <span className="text-slate-400">Receipt Ref: </span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">{inspectPayment.receipt || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400">Payment Captured At: </span>
                  <span className="text-slate-800 dark:text-slate-200">{inspectPayment.paid_at ? formatDateTime(inspectPayment.paid_at) : 'Not paid'}</span>
                </div>
                <div>
                  <span className="text-slate-400">Signature Verified: </span>
                  <span className="font-semibold text-emerald-600">
                    {inspectPayment.signature_verified ? '✓ Verified HMAC-SHA256' : 'Pending Signature'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Webhook Status: </span>
                  <span className={`font-semibold ${inspectPayment.webhook_verified ? 'text-blue-600' : 'text-amber-600'}`}>
                    {inspectPayment.webhook_verified ? '✓ Webhook Reconciled' : 'Pending Webhook'}
                  </span>
                </div>
              </div>

              {!inspectPayment.webhook_verified && (
                <p className="text-[11px] text-slate-400 italic">
                  Note: "Pending Webhook" means the checkout signature was verified by the server. Direct webhook delivery from Razorpay will reconcile automatically when received.
                </p>
              )}

              {inspectPayment.failure_reason && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
                  <span className="font-bold">Failure Reason: </span>
                  {inspectPayment.failure_reason}
                </div>
              )}

              {inspectPayment.refund_id && (
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-xs text-blue-700 dark:text-blue-300">
                  <span className="font-bold">Refund ID: </span>
                  <span className="font-mono">{inspectPayment.refund_id}</span>
                  {inspectPayment.refunded_at && (
                    <span> • Processed on {formatDateTime(inspectPayment.refunded_at)}</span>
                  )}
                </div>
              )}
            </div>

            {/* MODAL FOOTER */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button variant="outline" onClick={() => setInspectPayment(null)}>
                Close
              </Button>
              <div className="flex items-center gap-2">
                {inspectPayment.razorpay_payment_id && (
                  <Button
                    variant="outline"
                    onClick={() => handleReconcilePayment(inspectPayment.id)}
                    isLoading={isReconciling}
                    title="Inquire payment directly with Razorpay gateway API"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1 text-blue-500" />
                    Reconcile with Gateway
                  </Button>
                )}
                {(inspectPayment.status || '').toUpperCase() === 'PAID' && (
                  <Button
                    variant="danger"
                    onClick={() => {
                      setRefundPayment(inspectPayment);
                    }}
                  >
                    <RotateCcw className="w-4 h-4 mr-1.5" />
                    Refund Payment
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* REFUND CONFIRMATION DIALOG */}
      {refundPayment && (
        <ConfirmDialog
          isOpen={!!refundPayment}
          onClose={() => setRefundPayment(null)}
          onConfirm={handleConfirmRefund}
          title="Confirm Payment Refund"
          message={`Are you sure you want to refund ${formatCurrency(
            (refundPayment.amount_paise || 0) / 100,
            refundPayment.currency || 'INR'
          )} to customer ${refundPayment.traveler_name || `User #${refundPayment.user_id}`}? This operation will call Razorpay's refund gateway API, restock the safety equipment inventory, and dispatch an in-app refund confirmation.`}
          confirmText="Yes, Issue Full Refund"
          cancelText="Cancel"
          variant="danger"
          requireReason={true}
          reasonPlaceholder="Enter administrative reason for this refund..."
          isLoading={isRefunding}
        />
      )}
    </div>
  );
};
