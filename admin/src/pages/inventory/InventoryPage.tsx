import React, { useEffect, useState } from 'react';
import { Plus, PlusCircle, MinusCircle, Edit, Trash2, AlertTriangle, Package, History } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { InventoryItem, Column } from '../../types';
import { DataTable } from '../../components/common/DataTable';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { formatCurrency } from '../../utils/formatters';

export const InventoryPage: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(15);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [search, setSearch] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modals state
  const [isItemModalOpen, setIsItemModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [isStockModalOpen, setIsStockModalOpen] = useState<'ADD' | 'REMOVE' | null>(null);
  const [selectedStockItem, setSelectedStockItem] = useState<InventoryItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<InventoryItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form states
  const [itemForm, setItemForm] = useState({
    name: '',
    category: 'Emergency',
    sku: '',
    current_stock: 10,
    minimum_stock: 5,
    unit: 'units',
    price: 0,
    supplier: 'TrustTrip Safety Supply',
    image_url: '',
    description: '',
  });

  const [stockForm, setStockForm] = useState({
    quantity: 1,
    supplier: '',
    batch_number: '',
    expiry_date: '',
    reason: 'Sold',
    notes: '',
  });

  const fetchInventory = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/api/admin/inventory', {
        page,
        page_size: pageSize,
        search: search || undefined,
        category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });
      if (res.success) {
        setItems(res.items || []);
        setTotal(res.total || 0);
        setTotalPages(res.total_pages || 1);
      }
    } catch (err) {
      console.error('Failed to load inventory:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [page, categoryFilter, statusFilter]);

  const handleSearch = (q: string) => {
    setSearch(q);
    setPage(1);
    fetchInventory();
  };

  const handleOpenCreateModal = () => {
    setEditingItem(null);
    setItemForm({
      name: '',
      category: 'Emergency',
      sku: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
      current_stock: 20,
      minimum_stock: 5,
      unit: 'units',
      price: 499,
      supplier: 'TrustTrip Safety Supply',
      image_url: '',
      description: '',
    });
    setIsItemModalOpen(true);
  };

  const handleOpenEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      category: item.category || 'General',
      sku: item.sku,
      current_stock: item.current_stock,
      minimum_stock: item.minimum_stock,
      unit: item.unit || 'units',
      price: item.price,
      supplier: item.supplier || '',
      image_url: item.image_url || '',
      description: item.description || '',
    });
    setIsItemModalOpen(true);
  };

  const handleItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingItem) {
        await api.put(`/api/admin/inventory/${editingItem.id}`, itemForm);
      } else {
        await api.post('/api/admin/inventory', itemForm);
      }
      setIsItemModalOpen(false);
      fetchInventory();
    } catch (err: any) {
      alert(err.message || 'Failed to save inventory item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStockItem || !isStockModalOpen) return;

    if (isStockModalOpen === 'REMOVE' && stockForm.quantity > selectedStockItem.current_stock) {
      alert(`Cannot remove ${stockForm.quantity} units! Current stock is only ${selectedStockItem.current_stock} units.`);
      return;
    }

    setIsSubmitting(true);
    try {
      if (isStockModalOpen === 'ADD') {
        await api.post(`/api/admin/inventory/${selectedStockItem.id}/add-stock`, {
          quantity: Number(stockForm.quantity),
          supplier: stockForm.supplier,
          batch_number: stockForm.batch_number,
          expiry_date: stockForm.expiry_date || undefined,
          notes: stockForm.notes,
        });
      } else {
        await api.post(`/api/admin/inventory/${selectedStockItem.id}/remove-stock`, {
          quantity: Number(stockForm.quantity),
          reason: stockForm.reason,
          notes: stockForm.notes,
        });
      }
      setIsStockModalOpen(null);
      setSelectedStockItem(null);
      fetchInventory();
    } catch (err: any) {
      alert(err.message || 'Stock transaction failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!deletingItem) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/api/admin/inventory/${deletingItem.id}`);
      setDeletingItem(null);
      fetchInventory();
    } catch (err: any) {
      alert(err.message || 'Failed to delete item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<InventoryItem>[] = [
    {
      key: 'name',
      header: 'Item / SKU',
      render: (row) => (
        <div className="flex items-center gap-3">
          {row.image_url ? (
            <img src={row.image_url} alt="" className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-slate-800" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
              <Package className="w-5 h-5" />
            </div>
          )}
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
      render: (row) => (
        <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          {row.category || 'General'}
        </span>
      ),
    },
    {
      key: 'current_stock',
      header: 'Stock / Level',
      render: (row) => {
        const isLow = row.current_stock <= row.minimum_stock;
        const isOut = row.current_stock <= 0;
        return (
          <div>
            <div className="flex items-center gap-1.5 font-bold text-sm">
              <span className={isOut ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-emerald-600'}>
                {row.current_stock}
              </span>
              <span className="text-xs text-slate-400 font-normal">{row.unit || 'units'}</span>
            </div>
            <p className="text-[10px] text-slate-400">Min: {row.minimum_stock}</p>
          </div>
        );
      },
    },
    {
      key: 'price',
      header: 'Unit Price',
      render: (row) => <span className="font-bold text-sm">{formatCurrency(row.price)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        if (row.current_stock <= 0) return <Badge variant="danger" dot>Out of Stock</Badge>;
        if (row.current_stock <= row.minimum_stock) return <Badge variant="warning" dot>Low Stock</Badge>;
        return <Badge variant="success" dot>In Stock</Badge>;
      },
    },
    {
      key: 'actions',
      header: 'Stock Actions',
      className: 'text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            title="Add Stock"
            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
            onClick={() => {
              setSelectedStockItem(row);
              setStockForm({ quantity: 10, supplier: row.supplier || '', batch_number: `BATCH-${Date.now().toString().slice(-4)}`, expiry_date: '', reason: 'Restock', notes: '' });
              setIsStockModalOpen('ADD');
            }}
          >
            <PlusCircle className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            title="Remove / Adjust Stock"
            className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30"
            onClick={() => {
              setSelectedStockItem(row);
              setStockForm({ quantity: 1, supplier: '', batch_number: '', expiry_date: '', reason: 'Sold', notes: '' });
              setIsStockModalOpen('REMOVE');
            }}
          >
            <MinusCircle className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            title="Edit Item Details"
            onClick={() => handleOpenEditModal(row)}
          >
            <Edit className="w-4 h-4 text-slate-500 hover:text-slate-700" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            title="Delete Item"
            onClick={() => setDeletingItem(row)}
          >
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
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Inventory & Safety Equipment
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Manage physical safety gear, replenish stock levels, and audit supply movements.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link to="/inventory/history">
            <Button variant="outline" size="sm" leftIcon={<History className="w-4 h-4" />}>
              Transaction History
            </Button>
          </Link>
          <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={handleOpenCreateModal}>
            Add Equipment Item
          </Button>
        </div>
      </div>

      {/* Inventory Table */}
      <DataTable
        columns={columns}
        data={items}
        total={total}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        isLoading={isLoading}
        onPageChange={setPage}
        onSearch={handleSearch}
        searchPlaceholder="Search equipment by name, SKU, supplier..."
        searchValue={search}
        exportFilename="trusttrip_inventory"
        filters={
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs font-semibold px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
            >
              <option value="ALL">All Categories</option>
              <option value="Emergency">Emergency</option>
              <option value="Medical">Medical</option>
              <option value="Electronics">Electronics</option>
              <option value="Self Defense">Self Defense</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs font-semibold px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
            >
              <option value="ALL">All Stock Statuses</option>
              <option value="IN_STOCK">In Stock</option>
              <option value="LOW_STOCK">Low Stock</option>
              <option value="OUT_OF_STOCK">Out of Stock</option>
            </select>
          </div>
        }
      />

      {/* Add/Edit Item Modal */}
      <Modal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        title={editingItem ? `Edit Item: ${editingItem.name}` : 'Add Safety Equipment Item'}
        subtitle="Configure catalog details, pricing, and minimum stock threshold"
      >
        <form onSubmit={handleItemSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Item Name *
              </label>
              <input
                type="text"
                required
                value={itemForm.name}
                onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                placeholder="e.g. Compact Emergency Medical Kit"
                className="w-full text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                SKU (Stock Keeping Unit) *
              </label>
              <input
                type="text"
                required
                value={itemForm.sku}
                onChange={(e) => setItemForm({ ...itemForm, sku: e.target.value })}
                placeholder="e.g. EQ-0012"
                className="w-full text-sm font-mono px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Category
              </label>
              <select
                value={itemForm.category}
                onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
                className="w-full text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="Emergency">Emergency</option>
                <option value="Medical">Medical</option>
                <option value="Electronics">Electronics</option>
                <option value="Self Defense">Self Defense</option>
                <option value="Gear">Gear</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Price (INR) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={itemForm.price}
                onChange={(e) => setItemForm({ ...itemForm, price: parseFloat(e.target.value) || 0 })}
                className="w-full text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Current Stock *
              </label>
              <input
                type="number"
                min="0"
                required
                value={itemForm.current_stock}
                onChange={(e) => setItemForm({ ...itemForm, current_stock: parseInt(e.target.value) || 0 })}
                className="w-full text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Minimum Stock Threshold *
              </label>
              <input
                type="number"
                min="1"
                required
                value={itemForm.minimum_stock}
                onChange={(e) => setItemForm({ ...itemForm, minimum_stock: parseInt(e.target.value) || 1 })}
                className="w-full text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Supplier
              </label>
              <input
                type="text"
                value={itemForm.supplier}
                onChange={(e) => setItemForm({ ...itemForm, supplier: e.target.value })}
                placeholder="TrustTrip Safety Supply"
                className="w-full text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Image URL
              </label>
              <input
                type="url"
                value={itemForm.image_url}
                onChange={(e) => setItemForm({ ...itemForm, image_url: e.target.value })}
                placeholder="https://..."
                className="w-full text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={itemForm.description}
              onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
              placeholder="Essential safety specifications..."
              className="w-full text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" type="button" onClick={() => setIsItemModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isSubmitting}>
              {editingItem ? 'Save Changes' : 'Create Item'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add / Remove Stock Modal */}
      <Modal
        isOpen={!!isStockModalOpen && !!selectedStockItem}
        onClose={() => setIsStockModalOpen(null)}
        title={isStockModalOpen === 'ADD' ? `Add Stock: ${selectedStockItem?.name}` : `Remove Stock: ${selectedStockItem?.name}`}
        subtitle={`Current available stock: ${selectedStockItem?.current_stock} ${selectedStockItem?.unit || 'units'}`}
      >
        <form onSubmit={handleStockSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Quantity to {isStockModalOpen === 'ADD' ? 'Add' : 'Deduct'} *
            </label>
            <input
              type="number"
              min="1"
              max={isStockModalOpen === 'REMOVE' ? selectedStockItem?.current_stock : 9999}
              required
              value={stockForm.quantity}
              onChange={(e) => setStockForm({ ...stockForm, quantity: parseInt(e.target.value) || 1 })}
              className="w-full text-base font-bold px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
            {isStockModalOpen === 'REMOVE' && (
              <p className="text-[11px] text-slate-400 mt-1">
                Max available to deduct: {selectedStockItem?.current_stock} units. Negative stock is strictly prevented.
              </p>
            )}
          </div>

          {isStockModalOpen === 'ADD' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Supplier / Vendor
                </label>
                <input
                  type="text"
                  value={stockForm.supplier}
                  onChange={(e) => setStockForm({ ...stockForm, supplier: e.target.value })}
                  placeholder="Supplier name"
                  className="w-full text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Batch / Lot Number
                </label>
                <input
                  type="text"
                  value={stockForm.batch_number}
                  onChange={(e) => setStockForm({ ...stockForm, batch_number: e.target.value })}
                  placeholder="e.g. BATCH-2026A"
                  className="w-full text-sm font-mono px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Reason for Stock Removal *
              </label>
              <select
                value={stockForm.reason}
                onChange={(e) => setStockForm({ ...stockForm, reason: e.target.value })}
                className="w-full text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="Sold">Sold / Order Fulfilled</option>
                <option value="Distributed">Distributed to Guides / Field</option>
                <option value="Damaged">Damaged / Defective</option>
                <option value="Expired">Expired</option>
                <option value="Lost">Lost / Inventory Discrepancy</option>
                <option value="Manual adjustment">Manual Stock Correction</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Administrative Notes
            </label>
            <textarea
              rows={2}
              value={stockForm.notes}
              onChange={(e) => setStockForm({ ...stockForm, notes: e.target.value })}
              placeholder="Optional transaction reference notes..."
              className="w-full text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" type="button" onClick={() => setIsStockModalOpen(null)}>
              Cancel
            </Button>
            <Button
              variant={isStockModalOpen === 'ADD' ? 'primary' : 'danger'}
              type="submit"
              isLoading={isSubmitting}
            >
              {isStockModalOpen === 'ADD' ? 'Confirm Stock Entry' : 'Deduct Stock'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Item Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deletingItem}
        onClose={() => setDeletingItem(null)}
        onConfirm={handleDeleteItem}
        isLoading={isSubmitting}
        title={`Delete Inventory Item: ${deletingItem?.name}`}
        message="Are you sure you want to remove this item from the inventory catalog? Historical transaction records will remain archived."
        confirmText="Delete Item"
        variant="danger"
      />
    </div>
  );
};
