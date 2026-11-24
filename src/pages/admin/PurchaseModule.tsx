import React, { useState, useMemo, useEffect } from 'react';
import { Search, PlusCircle, Edit2, Trash2, Package, ArrowUpDown, ArrowUp, ArrowDown, X, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { formatNumber } from '../../lib/utils';

interface Purchase {
  id: number;
  supplierName: string;
  docType: string;
  docSeries: string;
  docNumber: string;
  date: string;
  totalAmount: number;
  currency: string;
  status: string;
  purchaseType?: string;
  paymentCondition?: string;
  creditDays?: number;
  observation?: string | null;
  supplier?: { name?: string; docNumber?: string };
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
  items: any[];
}

interface PurchaseModuleProps {
  token?: string | null;
  onNew: (type?: 'invoices' | 'guides') => void;
  onEdit: (purchase: Purchase, type?: 'invoices' | 'guides') => void;
  onDelete: (id: number) => void;
  purchases: Purchase[];
  mode?: 'all' | 'invoices' | 'guides';
}

type SortField = 'date' | 'ruc' | 'supplier' | 'docType' | 'document' | 'totalAmount' | 'balance' | 'observation' | 'status' | 'createdBy' | 'createdAt' | 'updatedBy' | 'updatedAt';
type SortDirection = 'asc' | 'desc';

export const PurchaseModule: React.FC<PurchaseModuleProps> = ({ token, onNew, onEdit, onDelete, purchases, mode = 'all' }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState('ALL');
  const [purchaseTypeFilter, setPurchaseTypeFilter] = useState('ALL');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [activeTab, setActiveTab] = useState<'invoices' | 'guides'>(mode === 'guides' ? 'guides' : 'invoices');
  const effectiveTab = mode === 'all' ? activeTab : mode;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, dateFrom, dateTo, currencyFilter, purchaseTypeFilter, sortField, sortDirection, effectiveTab, pageSize]);

  const purchaseTypeOptions = useMemo(() => {
    const defaults = ['MERCADERIA', 'NACIONAL', 'IMPORTACION', 'GASTO', 'ACTIVO'];
    const fromData = purchases.map(p => (p.purchaseType || '').toUpperCase()).filter(Boolean);
    return Array.from(new Set([...defaults, ...fromData]));
  }, [purchases]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'date' ? 'desc' : 'asc');
    }
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />;
    return sortDirection === 'asc'
      ? <ArrowUp className="w-3.5 h-3.5 text-[#004A99]" />
      : <ArrowDown className="w-3.5 h-3.5 text-[#004A99]" />;
  };

  const hasActiveFilters = Boolean(searchTerm || dateFrom || dateTo || currencyFilter !== 'ALL' || purchaseTypeFilter !== 'ALL');

  const clearFilters = () => {
    setSearchTerm('');
    setDateFrom('');
    setDateTo('');
    setCurrencyFilter('ALL');
    setPurchaseTypeFilter('ALL');
  };

  // Clasificar, filtrar y ordenar documentos
  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    const list = purchases.filter(p => {
      const isGuideDoc = p.docType === 'GUIA' || p.docType === '09' || p.docType === 'GRM';
      if (effectiveTab === 'guides' ? !isGuideDoc : isGuideDoc) return false;

      const supplierName = (p.supplierName || p.supplier?.name || '').toLowerCase();
      const supplierRuc = (p.supplier?.docNumber || '').toLowerCase();
      const docCode = `${p.docSeries || ''}-${p.docNumber || ''}`.toLowerCase();
      const matchesSearch = !term || supplierName.includes(term) || supplierRuc.includes(term) || (p.docNumber || '').toLowerCase().includes(term) || docCode.includes(term);
      if (!matchesSearch) return false;

      const itemDate = p.date ? new Date(p.date).toISOString().split('T')[0] : '';
      if (dateFrom && (!itemDate || itemDate < dateFrom)) return false;
      if (dateTo && (!itemDate || itemDate > dateTo)) return false;

      const itemCurrency = (p.currency || 'PEN').toUpperCase();
      if (currencyFilter !== 'ALL' && itemCurrency !== currencyFilter) return false;

      const itemPurchaseType = (p.purchaseType || '').toUpperCase();
      if (purchaseTypeFilter !== 'ALL' && itemPurchaseType !== purchaseTypeFilter) return false;

      return true;
    });

    return [...list].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'date') {
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortField === 'ruc') {
        comparison = (a.supplier?.docNumber || '').localeCompare(b.supplier?.docNumber || '');
      } else if (sortField === 'supplier') {
        const nameA = (a.supplierName || a.supplier?.name || '').toLowerCase();
        const nameB = (b.supplierName || b.supplier?.name || '').toLowerCase();
        comparison = nameA.localeCompare(nameB);
      } else if (sortField === 'docType') {
        comparison = (a.docType || '').toLowerCase().localeCompare((b.docType || '').toLowerCase());
      } else if (sortField === 'document') {
        const docA = `${a.docSeries || ''}-${a.docNumber || ''}`.toLowerCase();
        const docB = `${b.docSeries || ''}-${b.docNumber || ''}`.toLowerCase();
        comparison = docA.localeCompare(docB);
      } else if (sortField === 'totalAmount') {
        comparison = Number(a.totalAmount || 0) - Number(b.totalAmount || 0);
      } else if (sortField === 'balance') {
        const balA = Number((a as any).balance ?? (a.paymentCondition === 'CREDITO' ? a.totalAmount : 0));
        const balB = Number((b as any).balance ?? (b.paymentCondition === 'CREDITO' ? b.totalAmount : 0));
        comparison = balA - balB;
      } else if (sortField === 'observation') {
        comparison = (a.observation || '').toLowerCase().localeCompare((b.observation || '').toLowerCase());
      } else if (sortField === 'status') {
        const stA = ((a as any).computedStatus || a.status || '').toLowerCase();
        const stB = ((b as any).computedStatus || b.status || '').toLowerCase();
        comparison = stA.localeCompare(stB);
      } else if (sortField === 'createdBy') {
        comparison = (a.createdBy || '').toLowerCase().localeCompare((b.createdBy || '').toLowerCase());
      } else if (sortField === 'createdAt') {
        comparison = new Date(a.createdAt || a.date).getTime() - new Date(b.createdAt || b.date).getTime();
      } else if (sortField === 'updatedBy') {
        comparison = (a.updatedBy || '').toLowerCase().localeCompare((b.updatedBy || '').toLowerCase());
      } else if (sortField === 'updatedAt') {
        comparison = new Date(a.updatedAt || a.createdAt || a.date).getTime() - new Date(b.updatedAt || b.createdAt || b.date).getTime();
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [purchases, effectiveTab, searchTerm, dateFrom, dateTo, currencyFilter, purchaseTypeFilter, sortField, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage, pageSize]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {effectiveTab === 'guides' ? 'Guías de Remisión (Ingreso de Compra)' : 'Compras y Facturación'}
          </h2>
          <p className="text-[11px] font-bold text-[#004A99] uppercase tracking-wider">
            {effectiveTab === 'guides' ? 'Módulo de Almacén: Ingresos Físicos' : 'Módulo de Administración: Facturas, Boletas y DUA'}
          </p>
        </div>
        <button 
          onClick={() => onNew(effectiveTab)}
          className="h-9 bg-[#004A99] hover:bg-[#003B7A] text-white px-4 rounded-lg font-semibold text-sm flex items-center gap-2 shadow-2xs transition-colors duration-150 self-start md:self-auto"
        >
          <PlusCircle className="w-4 h-4" /> 
          {effectiveTab === 'guides' ? 'Nueva Guía de Ingreso' : 'Nueva Compra'}
        </button>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 items-end">
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1">Proveedor / Documento</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar proveedor o serie-número..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="h-9 w-full pl-9 pr-3 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:border-[#004A99] outline-none transition-colors duration-150"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1">Fecha Desde</label>
            <input 
              type="date" 
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="h-9 w-full px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:border-[#004A99] outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1">Fecha Hasta</label>
            <input 
              type="date" 
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="h-9 w-full px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:border-[#004A99] outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1">Moneda</label>
            <select 
              value={currencyFilter}
              onChange={e => setCurrencyFilter(e.target.value)}
              className="h-9 w-full px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:border-[#004A99] outline-none"
            >
              <option value="ALL">Todas</option>
              <option value="PEN">PEN (Soles)</option>
              <option value="USD">USD (Dólares)</option>
            </select>
          </div>

          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1">Tipo Compra</label>
              <select 
                value={purchaseTypeFilter}
                onChange={e => setPurchaseTypeFilter(e.target.value)}
                className="h-9 w-full px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:border-[#004A99] outline-none"
              >
                <option value="ALL">Todos</option>
                {purchaseTypeOptions.map(pt => (
                  <option key={pt} value={pt}>{pt}</option>
                ))}
              </select>
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                title="Limpiar filtros"
                aria-label="Limpiar filtros"
                className="h-9 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors duration-150 shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* --- TABS (solo si mode === 'all') --- */}
      {mode === 'all' && (
        <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
          <button 
            onClick={() => setActiveTab('invoices')}
            className={`px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors duration-150 ${activeTab === 'invoices' ? 'bg-white text-[#004A99] shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Facturas / Boletas / DUA
          </button>
          <button 
            onClick={() => setActiveTab('guides')}
            className={`px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors duration-150 ${activeTab === 'guides' ? 'bg-white text-[#004A99] shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Guías de Remisión (Ingreso)
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100/80 border-b border-slate-200">
              <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider min-w-[260px]">
                <button type="button" onClick={() => handleSort('supplier')} className="inline-flex items-center gap-1 hover:text-[#004A99]">
                  Proveedor {renderSortIcon('supplier')}
                </button>
              </th>
              <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <button type="button" onClick={() => handleSort('date')} className="inline-flex items-center gap-1 hover:text-[#004A99]">
                  Documento {renderSortIcon('date')}
                </button>
              </th>
              {effectiveTab === 'invoices' && (
                <>
                  <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider text-right">
                    <button type="button" onClick={() => handleSort('totalAmount')} className="inline-flex items-center gap-1 hover:text-[#004A99]">
                      Total {renderSortIcon('totalAmount')}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider text-right">
                    <button type="button" onClick={() => handleSort('balance')} className="inline-flex items-center gap-1 hover:text-[#004A99]">
                      Saldo {renderSortIcon('balance')}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <button type="button" onClick={() => handleSort('observation')} className="inline-flex items-center gap-1 hover:text-[#004A99]">
                      Glosa {renderSortIcon('observation')}
                    </button>
                  </th>
                </>
              )}
              <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <button type="button" onClick={() => handleSort('status')} className="inline-flex items-center gap-1 hover:text-[#004A99]">
                  Estado {renderSortIcon('status')}
                </button>
              </th>
              <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                <button type="button" onClick={() => handleSort('createdBy')} className="inline-flex items-center gap-1 hover:text-[#004A99]">
                  Usuario Crea. {renderSortIcon('createdBy')}
                </button>
              </th>
              <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                <button type="button" onClick={() => handleSort('createdAt')} className="inline-flex items-center gap-1 hover:text-[#004A99]">
                  Fecha Crea. {renderSortIcon('createdAt')}
                </button>
              </th>
              <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                <button type="button" onClick={() => handleSort('updatedBy')} className="inline-flex items-center gap-1 hover:text-[#004A99]">
                  Usuario Act. {renderSortIcon('updatedBy')}
                </button>
              </th>
              <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                <button type="button" onClick={() => handleSort('updatedAt')} className="inline-flex items-center gap-1 hover:text-[#004A99]">
                  Fecha Act. {renderSortIcon('updatedAt')}
                </button>
              </th>
              <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginated.map(p => {
              const statusToShow = ((p as any).computedStatus || p.status || '').toUpperCase();
              const isAnnulled = p.status === 'ANNULLED' || statusToShow === 'ANNULLED' || statusToShow === 'ANULADO';
              const isConfirmed = !isAnnulled && ['COMPLETADA', 'COMPLETED', 'FACTURADA', 'TRANSFERIDA'].includes(statusToShow);
              const rowClass = isAnnulled
                ? 'bg-red-50/75 hover:bg-red-100/70 transition-colors duration-150 group'
                : isConfirmed
                  ? 'bg-emerald-50/75 hover:bg-emerald-100/70 transition-colors duration-150 group'
                  : 'hover:bg-blue-50/40 transition-colors duration-150 group';
              return (
              <tr key={p.id} className={rowClass}>
                <td className="px-4 py-3 min-w-[260px]">
                  <div className="flex flex-col">
                    <span className="font-semibold text-slate-800 text-xs leading-snug">{p.supplierName || p.supplier?.name}</span>
                    <span className="font-mono text-[11px] text-slate-500 font-medium tracking-wide">{p.supplier?.docNumber || 'S/D'}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <span className="font-mono text-xs font-bold text-slate-900 whitespace-nowrap">
                      {p.docType === '50' ? 'DUA ' : ''}{p.docSeries}-{p.docNumber}
                    </span>
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium tabular-nums">
                      <Calendar className="w-3 h-3" />
                      {new Date(p.date).toLocaleDateString('es-PE', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </div>
                  </div>
                </td>
                {effectiveTab === 'invoices' && (
                  <>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <div className="text-xs font-bold text-slate-900">{formatNumber(p.totalAmount)}</div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <div className="text-xs font-bold text-slate-800">
                        {formatNumber(Number((p as any).balance ?? (p.paymentCondition === 'CREDITO' ? p.totalAmount : 0)))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 max-w-[220px] truncate" title={p.observation || ''}>
                      {p.observation || '-'}
                    </td>
                  </>
                )}
                <td className="px-4 py-3">
                  {(() => {
                    const statusToShow = (p as any).computedStatus || p.status;
                    const upperStatus = (statusToShow || '').toUpperCase();
                    const isAnnulledRow = p.status === 'ANNULLED' || upperStatus === 'ANNULLED' || upperStatus === 'ANULADO';
                    const isPending = upperStatus === 'EN TRÁNSITO' || upperStatus === 'PENDING';
                    const bgColor = isAnnulledRow
                      ? 'bg-red-100 text-red-700 border border-red-200'
                      : isPending
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200';
                    return (
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${bgColor}`}>
                        {isAnnulledRow ? 'Anulada' : statusToShow}
                      </span>
                    );
                  })()}
                </td>
                <td className="px-4 py-3 text-xs font-medium text-slate-700 whitespace-nowrap">
                  {p.createdBy || '-'}
                </td>
                <td className="px-4 py-3 text-xs text-slate-600 font-mono tabular-nums whitespace-nowrap">
                  {p.createdAt ? new Date(p.createdAt).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}
                </td>
                <td className="px-4 py-3 text-xs font-medium text-slate-700 whitespace-nowrap">
                  {p.updatedBy || '-'}
                </td>
                <td className="px-4 py-3 text-xs text-slate-600 font-mono tabular-nums whitespace-nowrap">
                  {p.updatedAt && (p.updatedBy || (p.createdAt && Math.abs(new Date(p.updatedAt).getTime() - new Date(p.createdAt).getTime()) > 1000))
                    ? new Date(p.updatedAt).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
                    : '-'}
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    {!isAnnulled && (
                      <>
                        <button 
                          onClick={() => onEdit(p, effectiveTab)}
                          className="p-2 bg-blue-50 text-[#004A99] hover:bg-[#004A99] hover:text-white rounded-lg transition-colors duration-150"
                          title="Ver/Editar"
                          aria-label="Ver o editar documento"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => onDelete(p.id)}
                          className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors duration-150"
                          title="Anular"
                          aria-label="Anular documento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
        </div>
        {filtered.length === 0 && (
          <div className="p-12 text-center">
            <Package className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-sm font-bold text-slate-400">No se encontraron documentos en esta categoría</p>
          </div>
        )}
        {filtered.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-slate-50/80 border-t border-slate-200 text-xs">
            <div className="flex items-center gap-3 text-slate-600 font-medium tabular-nums">
              <span>
                Mostrando <strong className="text-slate-900">{(safePage - 1) * pageSize + 1}</strong>–<strong className="text-slate-900">{Math.min(safePage * pageSize, filtered.length)}</strong> de <strong className="text-slate-900">{filtered.length}</strong> registros
              </span>
              <select
                value={pageSize}
                onChange={e => setPageSize(Number(e.target.value))}
                aria-label="Registros por página"
                className="h-8 px-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 outline-none focus:border-[#004A99]"
              >
                <option value={10}>10 / pág.</option>
                <option value={20}>20 / pág.</option>
                <option value={50}>50 / pág.</option>
              </select>
            </div>
            <div className="flex items-center gap-1.5 tabular-nums">
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                aria-label="Página anterior"
                className="h-8 px-2.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg font-semibold flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Anterior
              </button>
              <span className="px-2.5 text-slate-700 font-semibold">
                Página {safePage} de {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                aria-label="Página siguiente"
                className="h-8 px-2.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg font-semibold flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150"
              >
                Siguiente <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
