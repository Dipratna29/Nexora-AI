import React, { useEffect, useState } from 'react';
import { Tag, Plus, Edit, Trash2, Calendar, Percent } from 'lucide-react';
import api from '../../lib/api';
import { Offer, Column } from '../../types';
import { DataTable } from '../../components/common/DataTable';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { formatDate } from '../../utils/formatters';

export const OffersPage: React.FC = () => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(15);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [search, setSearch] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [deletingOffer, setDeletingOffer] = useState<Offer | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState<{
    title: string;
    description: string;
    discount: string;
    vendor: string;
    image_url: string;
    start_date: string;
    end_date: string;
    status: 'DRAFT' | 'PUBLISHED' | 'EXPIRED' | 'ARCHIVED';
  }>({
    title: '',
    description: '',
    discount: '15% OFF',
    vendor: 'TrustTrip Partner',
    image_url: '',
    start_date: new Date().toISOString().slice(0, 10),
    end_date: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
    status: 'PUBLISHED',
  });

  const fetchOffers = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/api/admin/offers', { page, page_size: pageSize, search: search || undefined });
      if (res.success) {
        setOffers(res.offers || []);
        setTotal(res.total || 0);
        setTotalPages(res.total_pages || 1);
      }
    } catch (err) {
      console.error('Failed to load offers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, [page]);

  const handleOpenCreate = () => {
    setEditingOffer(null);
    setForm({
      title: '',
      description: '',
      discount: '15% OFF',
      vendor: 'TrustTrip Safety Gear',
      image_url: '',
      start_date: new Date().toISOString().slice(0, 10),
      end_date: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
      status: 'PUBLISHED',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (offer: Offer) => {
    setEditingOffer(offer);
    setForm({
      title: offer.title,
      description: offer.description || '',
      discount: offer.discount,
      vendor: offer.vendor,
      image_url: offer.image_url || '',
      start_date: offer.start_date,
      end_date: offer.end_date,
      status: offer.status || 'PUBLISHED',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingOffer) {
        await api.put(`/api/admin/offers/${editingOffer.id}`, form);
      } else {
        await api.post('/api/admin/offers', form);
      }
      setIsModalOpen(false);
      fetchOffers();
    } catch (err: any) {
      alert(err.message || 'Failed to save offer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingOffer) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/api/admin/offers/${deletingOffer.id}`);
      setDeletingOffer(null);
      fetchOffers();
    } catch (err: any) {
      alert(err.message || 'Failed to delete offer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<Offer>[] = [
    {
      key: 'title',
      header: 'Offer & Deal',
      render: (row) => (
        <div className="flex items-center gap-3">
          {row.image_url ? (
            <img src={row.image_url} alt="" className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-slate-800" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center">
              <Tag className="w-5 h-5" />
            </div>
          )}
          <div>
            <p className="font-bold text-slate-900 dark:text-slate-100">{row.title}</p>
            <p className="text-xs text-slate-400 font-medium">By {row.vendor}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'discount',
      header: 'Discount / Deal',
      render: (row) => (
        <span className="font-extrabold text-xs px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
          {row.discount}
        </span>
      ),
    },
    {
      key: 'validity',
      header: 'Validity Period',
      render: (row) => (
        <div className="text-xs text-slate-500">
          <span>{formatDate(row.start_date)}</span> to <span className="font-semibold">{formatDate(row.end_date)}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        if (row.status === 'PUBLISHED') return <Badge variant="success" dot>Published</Badge>;
        if (row.status === 'DRAFT') return <Badge variant="neutral" dot>Draft</Badge>;
        return <Badge variant="warning" dot>{row.status}</Badge>;
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(row)}>
            <Edit className="w-4 h-4 text-slate-500" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDeletingOffer(row)}>
            <Trash2 className="w-4 h-4 text-rose-500" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <Tag className="w-6 h-6 text-purple-600" />
            Offers & Safety Equipment Promotions
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Manage discount vouchers, special equipment packages, and seasonal traveler promotions.
          </p>
        </div>

        <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={handleOpenCreate}>
          Create Offer
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={offers}
        total={total}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        isLoading={isLoading}
        onPageChange={setPage}
        onSearch={(q) => {
          setSearch(q);
          setPage(1);
          fetchOffers();
        }}
        searchPlaceholder="Search offers by title, vendor..."
        searchValue={search}
        exportFilename="trusttrip_offers"
      />

      {/* Offer Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingOffer ? `Edit Offer: ${editingOffer.title}` : 'Create Travel Safety Offer'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Offer Title *
            </label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. 20% Off Safety Kits Weekend Promo"
              className="w-full text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Discount Label *
              </label>
              <input
                type="text"
                required
                value={form.discount}
                onChange={(e) => setForm({ ...form, discount: e.target.value })}
                placeholder="e.g. 20% OFF or FLAT ₹200"
                className="w-full text-sm font-bold px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Vendor / Partner
              </label>
              <input
                type="text"
                required
                value={form.vendor}
                onChange={(e) => setForm({ ...form, vendor: e.target.value })}
                placeholder="TrustTrip Official"
                className="w-full text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                required
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="w-full text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                End Date *
              </label>
              <input
                type="date"
                required
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className="w-full text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Banner Image URL
            </label>
            <input
              type="url"
              value={form.image_url}
              onChange={(e) => setForm({ ...form, image_url: e.target.value })}
              placeholder="https://..."
              className="w-full text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Terms and promotional details..."
              className="w-full text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isSubmitting}>
              {editingOffer ? 'Save Changes' : 'Publish Offer'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deletingOffer}
        onClose={() => setDeletingOffer(null)}
        onConfirm={handleDelete}
        isLoading={isSubmitting}
        title={`Delete Offer: ${deletingOffer?.title}`}
        message="Are you sure you want to remove this promotion?"
      />
    </div>
  );
};
