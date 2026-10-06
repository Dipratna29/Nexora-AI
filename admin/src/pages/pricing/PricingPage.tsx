import React, { useEffect, useState } from 'react';
import { BadgePercent, Plus, Edit, IndianRupee } from 'lucide-react';
import api from '../../lib/api';
import { PriceItem, Column } from '../../types';
import { DataTable } from '../../components/common/DataTable';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { formatCurrency } from '../../utils/formatters';

export const PricingPage: React.FC = () => {
  const [priceItems, setPriceItems] = useState<PriceItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PriceItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: '',
    base_price: 20,
  });

  const fetchPricing = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/api/admin/pricing');
      if (res.success) {
        setPriceItems(res.items || []);
      }
    } catch (err) {
      console.error('Failed to load fair-pricing items:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPricing();
  }, []);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setForm({ name: '', base_price: 20 });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: PriceItem) => {
    setEditingItem(item);
    setForm({ name: item.name, base_price: item.base_price });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingItem) {
        await api.put(`/api/admin/pricing/${editingItem.id}`, form);
      } else {
        await api.post('/api/admin/pricing', form);
      }
      setIsModalOpen(false);
      fetchPricing();
    } catch (err: any) {
      alert(err.message || 'Failed to save price item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<PriceItem>[] = [
    {
      key: 'id',
      header: 'ID',
      render: (row) => <span className="font-mono text-xs font-bold text-slate-500">#{row.id}</span>,
    },
    {
      key: 'name',
      header: 'Benchmark Item / Service',
      render: (row) => (
        <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{row.name}</span>
      ),
    },
    {
      key: 'base_price',
      header: 'Fair Benchmark Price (INR)',
      render: (row) => (
        <span className="font-extrabold text-sm text-emerald-600 dark:text-emerald-400">
          {formatCurrency(row.base_price)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Edit Benchmark',
      className: 'text-right',
      render: (row) => (
        <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(row)}>
          <Edit className="w-4 h-4 text-slate-500" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <BadgePercent className="w-6 h-6 text-indigo-600" />
            Fair Price Anti-Gouging Index
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Maintain local benchmark rates used by travelers to detect tourist overpricing.
          </p>
        </div>

        <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={handleOpenCreate}>
          Add Benchmark Item
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={priceItems}
        isLoading={isLoading}
        exportFilename="trusttrip_fair_prices"
      />

      {/* Pricing Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? `Edit Benchmark: ${editingItem.name}` : 'Add Fair Price Item'}
        subtitle="Benchmark standard tourist fair price"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Item / Service Name *
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Bottled Water (1L) or Auto Fare (per km)"
              className="w-full text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Standard Benchmark Base Price (INR) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={form.base_price}
              onChange={(e) => setForm({ ...form, base_price: parseFloat(e.target.value) || 0 })}
              className="w-full text-sm font-bold px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isSubmitting}>
              Save Benchmark
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
