import React from 'react';
import { ChevronLeft, ChevronRight, Search, Download, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from './Button';
import { Skeleton } from './Skeleton';
import { EmptyState } from './EmptyState';
import { exportToCsv } from '../../utils/exportToCsv';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  isLoading?: boolean;
  onPageChange?: (newPage: number) => void;
  onSearch?: (searchQuery: string) => void;
  searchPlaceholder?: string;
  searchValue?: string;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  exportFilename?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  sortColumn?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (columnKey: string) => void;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  total = 0,
  page = 1,
  pageSize = 15,
  totalPages = 1,
  isLoading = false,
  onPageChange,
  onSearch,
  searchPlaceholder = 'Search records...',
  searchValue = '',
  filters,
  actions,
  exportFilename,
  emptyTitle = 'No records found',
  emptyDescription = 'There are currently no records matching your filter criteria.',
  sortColumn,
  sortOrder = 'desc',
  onSort,
}: DataTableProps<T>) {
  const [localSearch, setLocalSearch] = React.useState(searchValue);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) onSearch(localSearch);
  };

  const handleExport = () => {
    if (exportFilename && data.length > 0) {
      const csvCols = columns.map(c => ({ key: c.key, header: c.header }));
      exportToCsv(exportFilename, data, csvCols);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
      {/* Top Bar: Search, Filters, Actions */}
      <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {onSearch && (
            <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
              />
            </form>
          )}
          {filters}
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-end md:self-auto">
          {exportFilename && data.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download className="w-4 h-4" />}
              onClick={handleExport}
            >
              Export CSV
            </Button>
          )}
          {actions}
        </div>
      </div>

      {/* Table Area */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-5 py-3.5 ${col.className || ''} ${
                    col.sortable ? 'cursor-pointer select-none hover:text-slate-900 dark:hover:text-slate-200' : ''
                  }`}
                  onClick={() => col.sortable && onSort && onSort(col.key)}
                >
                  <div className="flex items-center gap-1.5">
                    {col.header}
                    {col.sortable && (
                      <span className="text-slate-400">
                        {sortColumn === col.key ? (
                          sortOrder === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 text-brand-500" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-brand-500" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {isLoading ? (
              Array.from({ length: pageSize }).map((_, rIdx) => (
                <tr key={rIdx}>
                  {columns.map((c, cIdx) => (
                    <td key={cIdx} className="px-5 py-4">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-0">
                  <EmptyState title={emptyTitle} description={emptyDescription} />
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr
                  key={row.id || row.user_id || row.g_id || idx}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                >
                  {columns.map((col) => (
                    <td key={col.key} className={`px-5 py-4 text-slate-700 dark:text-slate-300 ${col.className || ''}`}>
                      {col.render ? col.render(row) : row[col.key] !== undefined && row[col.key] !== null ? String(row[col.key]) : '—'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 0 && (
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/20">
          <div>
            Showing <span className="font-semibold text-slate-700 dark:text-slate-200">{data.length > 0 ? (page - 1) * pageSize + 1 : 0}</span> to{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-200">{Math.min(page * pageSize, total)}</span> of{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-200">{total}</span> records
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || isLoading}
              onClick={() => onPageChange && onPageChange(page - 1)}
              leftIcon={<ChevronLeft className="w-4 h-4" />}
            >
              Previous
            </Button>
            <span className="px-2 font-medium">
              Page {page} of {Math.max(1, totalPages)}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || isLoading}
              onClick={() => onPageChange && onPageChange(page + 1)}
              rightIcon={<ChevronRight className="w-4 h-4" />}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
