import React, { useEffect, useState } from 'react';
import { History, ArrowLeft, ArrowUpRight, ArrowDownLeft, RefreshCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { InventoryTransaction, Column } from '../../types';
import { DataTable } from '../../components/common/DataTable';
import { Badge } from '../../components/common/Badge';
import { formatDateTime } from '../../utils/formatters';

export const InventoryHistoryPage: React.FC = () => {
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(20);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/api/admin/inventory/transactions', {
        page,
        page_size: pageSize,
        type: typeFilter !== 'ALL' ? typeFilter : undefined,
      });
      if (res.success) {
        setTransactions(res.transactions || []);
        setTotal(res.total || 0);
        setTotalPages(res.total_pages || 1);
      }
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [page, typeFilter]);

  const columns: Column<InventoryTransaction>[] = [
    {
      key: 'type',
      header: 'Movement Type',
      render: (row) => {
        const isAdd = row.type === 'ADD' || row.type === 'RETURN' || row.type === 'STOCK_IN';
        return (
          <div className="flex items-center gap-2">
            <div
              className={`p-1.5 rounded-lg shrink-0 ${
                isAdd
                  ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600'
                  : 'bg-amber-100 dark:bg-amber-950/40 text-amber-600'
              }`}
            >
              {isAdd ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
            </div>
            <Badge variant={isAdd ? 'success' : 'warning'}>{row.type}</Badge>
          </div>
        );
      },
    },
    {
      key: 'item',
      header: 'Item',
      render: (row) => (
        <div>
          <p className="font-bold text-slate-900 dark:text-slate-100">
            {row.inventory_items?.name || `Item #${row.item_id}`}
          </p>
          <p className="text-[11px] text-slate-400 font-mono">
            {row.inventory_items?.sku ? `SKU: ${row.inventory_items.sku}` : `ID: ${row.item_id}`}
          </p>
        </div>
      ),
    },
    {
      key: 'quantity',
      header: 'Qty Changed',
      render: (row) => {
        const isAdd = row.type === 'ADD' || row.type === 'RETURN' || row.type === 'STOCK_IN';
        return (
          <span className={`font-extrabold text-sm ${isAdd ? 'text-emerald-600' : 'text-rose-600'}`}>
            {isAdd ? '+' : '-'}{row.quantity}
          </span>
        );
      },
    },
    {
      key: 'stock_change',
      header: 'Stock Delta',
      render: (row) => (
        <span className="text-xs text-slate-500 font-mono">
          {row.previous_stock} → <span className="font-bold text-slate-800 dark:text-slate-200">{row.new_stock}</span>
        </span>
      ),
    },
    {
      key: 'reason',
      header: 'Reason & Notes',
      render: (row) => (
        <div>
          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{row.reason || 'General adjustment'}</p>
          {row.notes && <p className="text-[11px] text-slate-400 truncate max-w-xs">{row.notes}</p>}
        </div>
      ),
    },
    {
      key: 'admin_email',
      header: 'Authorized Admin',
      render: (row) => <span className="text-xs font-medium text-slate-500">{row.admin_email || 'System'}</span>,
    },
    {
      key: 'created_at',
      header: 'Timestamp',
      render: (row) => <span className="text-xs">{formatDateTime(row.created_at)}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            to="/inventory"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Inventory
          </Link>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2.5">
            <History className="w-6 h-6 text-brand-600" />
            Inventory Stock Movement Ledger
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Complete audit trail of all physical equipment restocks, order dispatches, and manual adjustments.
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={transactions}
        total={total}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        isLoading={isLoading}
        onPageChange={setPage}
        exportFilename="trusttrip_inventory_transactions"
        filters={
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs font-semibold px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
          >
            <option value="ALL">All Transaction Types</option>
            <option value="ADD">Add / Restock</option>
            <option value="REMOVE">Remove / Sold</option>
            <option value="ADJUST">Adjustments</option>
          </select>
        }
      />
    </div>
  );
};
