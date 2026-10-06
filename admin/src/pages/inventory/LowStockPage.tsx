import React, { useEffect, useState } from 'react';
import { AlertTriangle, PlusCircle, ArrowLeft, Package } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { InventoryItem, Column } from '../../types';
import { DataTable } from '../../components/common/DataTable';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { formatCurrency } from '../../utils/formatters';

export const LowStockPage: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [addQty, setAddQty] = useState<number>(20);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fetchLowStock = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/api/admin/inventory/low-stock');
      if (res.success) {
        setItems(res.items || []);
      }
    } catch (err) {
      console.error('Failed to load low-stock items:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLowStock();
  }, []);

  const handleQuickRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    setIsSubmitting(true);
    try {
      await api.post(`/api/admin/inventory/${selectedItem.id}/add-stock`, {
        quantity: addQty,
        reason: 'Emergency restock for low threshold',
        supplier: selectedItem.supplier || 'TrustTrip Safety Supply',
      });
      setSelectedItem(null);
      fetchLowStock();
    } catch (err: any) {
      alert(err.message || 'Failed to restock item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<InventoryItem>[] = [
    {
      key: 'name',
      header: 'Low Stock Item',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-slate-900 dark:text-slate-100">{row.name}</p>
            <p className="text-xs text-slate-400 font-mono">SKU: {row.sku}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (row) => <span>{row.category || 'General'}</span>,
    },
    {
      key: 'current_stock',
      header: 'Remaining Stock',
      render: (row) => (
        <span className="font-extrabold text-sm text-rose-600 dark:text-rose-400">
          {row.current_stock} {row.unit || 'units'}
        </span>
      ),
    },
    {
      key: 'minimum_stock',
      header: 'Required Minimum',
      render: (row) => (
        <span className="font-bold text-slate-600 dark:text-slate-300">
          {row.minimum_stock} {row.unit || 'units'}
        </span>
      ),
    },
    {
      key: 'price',
      header: 'Unit Price',
      render: (row) => <span className="font-semibold">{formatCurrency(row.price)}</span>,
    },
    {
      key: 'actions',
      header: 'Quick Action',
      className: 'text-right',
      render: (row) => (
        <Button
          size="sm"
          variant="primary"
          leftIcon={<PlusCircle className="w-4 h-4" />}
          onClick={() => {
            setSelectedItem(row);
            setAddQty(Math.max(20, row.minimum_stock * 2));
          }}
        >
          Quick Replenish
        </Button>
      ),
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
            <AlertTriangle className="w-6 h-6 text-amber-500" />
            Low Stock Alert Console
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Items requiring immediate replenishment to maintain traveler safety supply readiness.
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={items}
        isLoading={isLoading}
        emptyTitle="All stock levels healthy"
        emptyDescription="There are currently no items below their minimum safety thresholds."
        exportFilename="trusttrip_low_stock"
      />

      {/* Quick Replenish Modal */}
      <Modal
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        title={`Replenish Stock: ${selectedItem?.name}`}
        subtitle={`Current stock is ${selectedItem?.current_stock} (Min: ${selectedItem?.minimum_stock})`}
      >
        <form onSubmit={handleQuickRestock} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Quantity to Add *
            </label>
            <input
              type="number"
              min="1"
              required
              value={addQty}
              onChange={(e) => setAddQty(parseInt(e.target.value) || 1)}
              className="w-full text-base font-bold px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" type="button" onClick={() => setSelectedItem(null)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isSubmitting}>
              Confirm Replenishment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
