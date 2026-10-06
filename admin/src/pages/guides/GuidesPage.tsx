import React, { useEffect, useState } from 'react';
import { Compass, Plus, Edit, Trash2, Star, CheckCircle } from 'lucide-react';
import api from '../../lib/api';
import { Guide, Column } from '../../types';
import { DataTable } from '../../components/common/DataTable';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';

export const GuidesPage: React.FC = () => {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(15);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [search, setSearch] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGuide, setEditingGuide] = useState<Guide | null>(null);
  const [deletingGuide, setDeletingGuide] = useState<Guide | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: '',
    languages: 'English, Hindi',
    status: 'Available',
    rating: 4.8,
  });

  const fetchGuides = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/api/admin/guides', {
        page,
        page_size: pageSize,
        search: search || undefined,
      });
      if (res.success) {
        setGuides(res.guides || []);
        setTotal(res.total || 0);
        setTotalPages(res.total_pages || 1);
      }
    } catch (err) {
      console.error('Failed to load guides:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGuides();
  }, [page]);

  const handleOpenCreate = () => {
    setEditingGuide(null);
    setForm({ name: '', languages: 'English, Hindi', status: 'Available', rating: 5.0 });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (guide: Guide) => {
    setEditingGuide(guide);
    setForm({
      name: guide.name,
      languages: guide.languages || '',
      status: guide.status || 'Available',
      rating: guide.rating || 5.0,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingGuide) {
        await api.put(`/api/admin/guides/${editingGuide.g_id}`, form);
      } else {
        await api.post('/api/admin/guides', form);
      }
      setIsModalOpen(false);
      fetchGuides();
    } catch (err: any) {
      alert(err.message || 'Failed to save guide');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingGuide) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/api/admin/guides/${deletingGuide.g_id}`);
      setDeletingGuide(null);
      fetchGuides();
    } catch (err: any) {
      alert(err.message || 'Failed to delete guide');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<Guide>[] = [
    {
      key: 'g_id',
      header: 'Guide ID',
      render: (row) => <span className="font-mono text-xs font-bold text-slate-500">#{row.g_id}</span>,
    },
    {
      key: 'name',
      header: 'Guide Name',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-bold text-xs flex items-center justify-center">
            {row.name ? row.name[0].toUpperCase() : 'G'}
          </div>
          <span className="font-bold text-slate-900 dark:text-slate-100">{row.name}</span>
        </div>
      ),
    },
    {
      key: 'languages',
      header: 'Languages Spoken',
      render: (row) => <span className="text-xs text-slate-600 dark:text-slate-300">{row.languages || '—'}</span>,
    },
    {
      key: 'rating',
      header: 'Average Rating',
      render: (row) => (
        <div className="flex items-center gap-1 text-amber-500 font-bold text-xs">
          <Star className="w-3.5 h-3.5 fill-current" />
          <span>{row.rating ? Number(row.rating).toFixed(1) : '5.0'} / 5.0</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        const s = (row.status || 'Available').toLowerCase();
        if (s === 'available') return <Badge variant="success" dot>Available</Badge>;
        if (s === 'booked') return <Badge variant="info" dot>Booked</Badge>;
        return <Badge variant="neutral" dot>{row.status || 'Offline'}</Badge>;
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
          <Button variant="ghost" size="sm" onClick={() => setDeletingGuide(row)}>
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
            <Compass className="w-6 h-6 text-teal-600" />
            Tour Guide Directory
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Manage certified multilingual local guides, availability schedules, and performance ratings.
          </p>
        </div>

        <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={handleOpenCreate}>
          Add Certified Guide
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={guides}
        total={total}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        isLoading={isLoading}
        onPageChange={setPage}
        onSearch={(q) => {
          setSearch(q);
          setPage(1);
          fetchGuides();
        }}
        searchPlaceholder="Search guides by name, languages..."
        searchValue={search}
        exportFilename="trusttrip_guides"
      />

      {/* Guide Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingGuide ? `Edit Guide: ${editingGuide.name}` : 'Add New Tour Guide'}
        subtitle="Certified guide profile and language proficiency details"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Guide Full Name *
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Rajesh Sharma"
              className="w-full text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Languages Spoken (comma separated) *
            </label>
            <input
              type="text"
              required
              value={form.languages}
              onChange={(e) => setForm({ ...form, languages: e.target.value })}
              placeholder="English, Hindi, Marathi, French"
              className="w-full text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Availability Status
              </label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="Available">Available</option>
                <option value="Booked">Booked</option>
                <option value="Busy">Busy</option>
                <option value="Not Available">Not Available</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Rating
              </label>
              <input
                type="number"
                step="0.1"
                min="1.0"
                max="5.0"
                value={form.rating}
                onChange={(e) => setForm({ ...form, rating: parseFloat(e.target.value) || 5.0 })}
                className="w-full text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isSubmitting}>
              {editingGuide ? 'Save Changes' : 'Register Guide'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deletingGuide}
        onClose={() => setDeletingGuide(null)}
        onConfirm={handleDelete}
        isLoading={isSubmitting}
        title={`Delete Guide: ${deletingGuide?.name}`}
        message="Are you sure you want to remove this guide from the platform?"
      />
    </div>
  );
};
