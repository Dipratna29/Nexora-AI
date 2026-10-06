import React, { useEffect, useState } from 'react';
import { Building2, Plus, Edit, Trash2, ShieldCheck, MapPin, Phone } from 'lucide-react';
import api from '../../lib/api';
import { Facility, Column } from '../../types';
import { DataTable } from '../../components/common/DataTable';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { formatCoordinates } from '../../utils/formatters';

export const FacilitiesPage: React.FC = () => {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(15);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFacility, setEditingFacility] = useState<Facility | null>(null);
  const [deletingFacility, setDeletingFacility] = useState<Facility | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState<{
    name: string;
    category: string;
    latitude: number;
    longitude: number;
    address: string;
    phone: string;
    opening_hours: string;
    is_verified: boolean;
    status: 'ACTIVE' | 'INACTIVE';
  }>({
    name: '',
    category: 'Hospital',
    latitude: 18.9398,
    longitude: 72.8368,
    address: '',
    phone: '',
    opening_hours: '24/7',
    is_verified: true,
    status: 'ACTIVE',
  });

  const fetchFacilities = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/api/admin/facilities', {
        page,
        page_size: pageSize,
        category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
        search: search || undefined,
      });
      if (res.success) {
        setFacilities(res.facilities || []);
        setTotal(res.total || 0);
        setTotalPages(res.total_pages || 1);
      }
    } catch (err) {
      console.error('Failed to load facilities:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFacilities();
  }, [page, categoryFilter]);

  const handleOpenCreate = () => {
    setEditingFacility(null);
    setForm({
      name: '',
      category: 'Hospital',
      latitude: 18.9220,
      longitude: 72.8340,
      address: '',
      phone: '',
      opening_hours: '24/7',
      is_verified: true,
      status: 'ACTIVE',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (f: Facility) => {
    setEditingFacility(f);
    setForm({
      name: f.name,
      category: f.category || 'Hospital',
      latitude: f.latitude,
      longitude: f.longitude,
      address: f.address || '',
      phone: f.phone || '',
      opening_hours: f.opening_hours || '24/7',
      is_verified: f.is_verified,
      status: f.status || 'ACTIVE',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingFacility) {
        await api.put(`/api/admin/facilities/${editingFacility.id}`, form);
      } else {
        await api.post('/api/admin/facilities', form);
      }
      setIsModalOpen(false);
      fetchFacilities();
    } catch (err: any) {
      alert(err.message || 'Failed to save facility');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingFacility) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/api/admin/facilities/${deletingFacility.id}`);
      setDeletingFacility(null);
      fetchFacilities();
    } catch (err: any) {
      alert(err.message || 'Failed to delete facility');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<Facility>[] = [
    {
      key: 'name',
      header: 'Facility Name & Verification',
      render: (row) => (
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 dark:text-slate-100">{row.name}</span>
            {row.is_verified && (
              <span title="Verified Safety Facility" className="text-emerald-500">
                <ShieldCheck className="w-4 h-4 inline" />
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 truncate max-w-xs">{row.address}</p>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (row) => (
        <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">
          {row.category}
        </span>
      ),
    },
    {
      key: 'phone',
      header: 'Helpline / Phone',
      render: (row) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-mono">
          <Phone className="w-3.5 h-3.5 text-slate-400" />
          <span>{row.phone || '—'}</span>
        </div>
      ),
    },
    {
      key: 'coordinates',
      header: 'GPS Location',
      render: (row) => (
        <div className="flex items-center gap-1 text-xs font-mono text-slate-500">
          <MapPin className="w-3.5 h-3.5 text-rose-400" />
          <span>{formatCoordinates(row.latitude, row.longitude)}</span>
        </div>
      ),
    },
    {
      key: 'opening_hours',
      header: 'Hours',
      render: (row) => <span className="text-xs">{row.opening_hours || '24/7'}</span>,
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
          <Button variant="ghost" size="sm" onClick={() => setDeletingFacility(row)}>
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
            <Building2 className="w-6 h-6 text-blue-600" />
            Safety & Emergency Facilities
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Manage verified police stations, hospitals, 24/7 pharmacies, and tourist assistance hubs.
          </p>
        </div>

        <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={handleOpenCreate}>
          Register Facility
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={facilities}
        total={total}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        isLoading={isLoading}
        onPageChange={setPage}
        onSearch={(q) => {
          setSearch(q);
          setPage(1);
          fetchFacilities();
        }}
        searchPlaceholder="Search facilities by name, address..."
        searchValue={search}
        exportFilename="trusttrip_facilities"
        filters={
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs font-semibold px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
          >
            <option value="ALL">All Categories</option>
            <option value="Hospital">Hospitals & Medical</option>
            <option value="Police Station">Police Stations</option>
            <option value="Pharmacy">Pharmacies</option>
            <option value="Tourist Assistance">Tourist Assistance</option>
          </select>
        }
      />

      {/* Facility Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingFacility ? `Edit Facility: ${editingFacility.name}` : 'Register Safety Facility'}
        subtitle="GPS coordinates and contact information for verified tourist assistance"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Facility Name *
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Apollo 24/7 Emergency Pharmacy"
              className="w-full text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Category *
              </label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="Hospital">Hospital / Trauma Center</option>
                <option value="Police Station">Police Station</option>
                <option value="Pharmacy">Pharmacy</option>
                <option value="Tourist Assistance">Tourist Assistance Hub</option>
                <option value="Emergency Services">Emergency Services</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Helpline Phone *
              </label>
              <input
                type="text"
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="e.g. 022-22852737"
                className="w-full text-sm font-mono px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Latitude *
              </label>
              <input
                type="number"
                step="0.000001"
                required
                value={form.latitude}
                onChange={(e) => setForm({ ...form, latitude: parseFloat(e.target.value) || 0 })}
                className="w-full text-sm font-mono px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Longitude *
              </label>
              <input
                type="number"
                step="0.000001"
                required
                value={form.longitude}
                onChange={(e) => setForm({ ...form, longitude: parseFloat(e.target.value) || 0 })}
                className="w-full text-sm font-mono px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Physical Street Address *
            </label>
            <input
              type="text"
              required
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="e.g. MG Road, Fort, Mumbai"
              className="w-full text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="is_verified"
              checked={form.is_verified}
              onChange={(e) => setForm({ ...form, is_verified: e.target.checked })}
              className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <label htmlFor="is_verified" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Verified Safety Facility (Display official trust shield to travelers)
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isSubmitting}>
              {editingFacility ? 'Save Changes' : 'Register Facility'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deletingFacility}
        onClose={() => setDeletingFacility(null)}
        onConfirm={handleDelete}
        isLoading={isSubmitting}
        title={`Delete Facility: ${deletingFacility?.name}`}
        message="Are you sure you want to delete this safety facility?"
      />
    </div>
  );
};
