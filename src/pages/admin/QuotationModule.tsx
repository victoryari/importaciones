import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'motion/react';
import { 
  FileText, PlusCircle, Search, Edit2, Trash2, Phone, 
  ShoppingCart, Filter, Eye, Download, MessageCircle,
  Calendar, User, CreditCard, DollarSign, RefreshCcw, Lock, Copy,
  ArrowUpDown, ArrowUp, ArrowDown, X, ChevronLeft, ChevronRight, KeyRound, ShieldCheck, Check
} from 'lucide-react';
import { generateQuotationPDF } from '../../lib/pdfGenerator';
import { formatNumber } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';

interface Customer {
  id: number;
  name: string;
  docNumber: string;
  phone?: string;
}

interface QuotationItem {
  id: number;
  productId: number;
  quantity: number;
  price: number;
  discount: number;
  product: {
    name: string;
    code?: string;
    unit?: { symbol: string };
  };
}

interface Quotation {
  id: number;
  docSeries?: string;
  docNumber?: string;
  customerName: string;
  customerDocNumber?: string;
  customerPhone?: string;
  customerAddress?: string;
  status: string;
  currency?: string;
  totalAmount: number;
  exchangeRate: number;
  createdAt: string;
  dueDate?: string | null;
  pickupPlace?: string;
  sellerId?: number;
  sellerName?: string;
  customerId?: number;
  items?: QuotationItem[];
}

interface QuotationModuleProps {
  quotations: Quotation[];
  onEdit: (q: Quotation) => void;
  onNew: () => void;
  onDelete: (id: number) => void;
  onConvertToOrder: (q: Quotation) => void;
  onClone?: (q: Quotation) => void;
  onReset: (id: number) => void;
  sunatCurrencies?: any[];
  sellers?: any[];
}

type SortField = 'document' | 'customer' | 'seller' | 'status' | 'totalAmount' | 'balance' | 'dueDate';
type SortDirection = 'asc' | 'desc';

export const QuotationModule: React.FC<QuotationModuleProps> = ({ 
  quotations, 
  onEdit, 
  onNew, 
  onDelete, 
  onConvertToOrder,
  onClone,
  onReset,
  sunatCurrencies = [],
  sellers = []
}) => {
  const { user, token, hasPermission } = useAuth();
  const canWrite = hasPermission('WRITE_QUOTATIONS') || hasPermission('ALL');
  const canDelete = hasPermission('DELETE_QUOTATIONS') || hasPermission('ALL');
  const isSupervisorOrAdmin =
    hasPermission('ALL') ||
    String(user?.role || '').toUpperCase().includes('ADMIN') ||
    String(user?.role || '').toUpperCase().includes('SUPERVISOR');

  const isOwnQuotation = (quot: any) => {
    if (user?.sellerId && quot.sellerId) return Number(quot.sellerId) === Number(user.sellerId);
    if (user?.name && quot.sellerName) {
      return String(quot.sellerName).trim().toUpperCase() === String(user.name).trim().toUpperCase();
    }
    return false;
  };

  // Token generation modal (Supervisor/Admin)
  const [isTokenGenModalOpen, setIsTokenGenModalOpen] = useState(false);
  const [activeTokens, setActiveTokens] = useState<any[]>([]);
  const [generatingToken, setGeneratingToken] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Token prompt & remote approval modal (Seller editing or converting another seller's quotation)
  const [tokenPromptQuotation, setTokenPromptQuotation] = useState<any | null>(null);
  const [tokenActionMode, setTokenActionMode] = useState<'edit' | 'convert'>('edit');
  const [enteredToken, setEnteredToken] = useState('');
  const [verifyingToken, setVerifyingToken] = useState(false);
  const [tokenError, setTokenError] = useState('');
  const [authReason, setAuthReason] = useState('');
  const [sendingAuthReq, setSendingAuthReq] = useState(false);
  const [myAuthRequests, setMyAuthRequests] = useState<any[]>([]);

  const loadMyAuthRequests = async () => {
    if (!token || isSupervisorOrAdmin) return;
    try {
      const res = await axios.get('/api/quotations/auth-requests', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMyAuthRequests(Array.isArray(res.data?.requests) ? res.data.requests : []);
    } catch {
      // silent
    }
  };

  useEffect(() => {
    if (!token || isSupervisorOrAdmin) return;
    loadMyAuthRequests();
    const timer = setInterval(loadMyAuthRequests, 10000);
    return () => clearInterval(timer);
  }, [token, isSupervisorOrAdmin]);

  const getApprovedAuthForQuotation = (quotationId: number) =>
    myAuthRequests.find(
      (r: any) =>
        r.quotationId === quotationId &&
        r.status === 'APPROVED' &&
        r.expiresAt &&
        new Date(r.expiresAt) > new Date()
    );

  const getPendingAuthForQuotation = (quotationId: number) =>
    myAuthRequests.find(
      (r: any) => r.quotationId === quotationId && r.status === 'PENDING'
    );

  const loadActiveTokens = async () => {
    if (!token || !isSupervisorOrAdmin) return;
    try {
      const res = await axios.get('/api/quotations/edit-tokens', { headers: { Authorization: `Bearer ${token}` } });
      setActiveTokens(Array.isArray(res.data) ? res.data : []);
    } catch {
      setActiveTokens([]);
    }
  };

  const handleOpenTokenGenerator = () => {
    setIsTokenGenModalOpen(true);
    loadActiveTokens();
  };

  const handleGenerateToken = async () => {
    if (!token) return;
    setGeneratingToken(true);
    try {
      const res = await axios.post('/api/quotations/edit-tokens', { ttlMinutes: 15 }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActiveTokens(prev => [res.data, ...prev]);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al generar token');
    } finally {
      setGeneratingToken(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1500);
  };

  const handleRequestEdit = (quot: any) => {
    if (isSupervisorOrAdmin || isOwnQuotation(quot) || getApprovedAuthForQuotation(quot.id)) {
      onEdit(quot);
      return;
    }
    setTokenActionMode('edit');
    setTokenPromptQuotation(quot);
    setEnteredToken('');
    setAuthReason('');
    setTokenError('');
  };

  const handleRequestConvert = (quot: any) => {
    if (isSupervisorOrAdmin || isOwnQuotation(quot) || getApprovedAuthForQuotation(quot.id)) {
      onConvertToOrder(quot);
      return;
    }
    setTokenActionMode('convert');
    setTokenPromptQuotation(quot);
    setEnteredToken('');
    setAuthReason('');
    setTokenError('');
  };

  const handleSendAuthRequest = async () => {
    if (!tokenPromptQuotation || !token) return;
    setSendingAuthReq(true);
    setTokenError('');
    try {
      await axios.post(`/api/quotations/${tokenPromptQuotation.id}/auth-request`, {
        action: tokenActionMode === 'convert' ? 'CONVERT' : 'EDIT',
        reason: authReason.trim() || null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await loadMyAuthRequests();
    } catch (err: any) {
      setTokenError(err.response?.data?.error || 'Error al enviar solicitud.');
    } finally {
      setSendingAuthReq(false);
    }
  };

  const handleVerifyAndOpenEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenPromptQuotation || !enteredToken.trim()) return;
    setVerifyingToken(true);
    setTokenError('');
    try {
      const cleanCode = enteredToken.trim().toUpperCase();
      await axios.post(`/api/quotations/${tokenPromptQuotation.id}/verify-edit-token`, { code: cleanCode }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const target = tokenPromptQuotation;
      const mode = tokenActionMode;
      setTokenPromptQuotation(null);
      setEnteredToken('');
      if (mode === 'convert') {
        onConvertToOrder({ ...target, _editToken: cleanCode });
      } else {
        onEdit({ ...target, _editToken: cleanCode });
      }
    } catch (err: any) {
      setTokenError(err.response?.data?.error || 'Token inválido o expirado.');
    } finally {
      setVerifyingToken(false);
    }
  };
  
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sellerFilter, setSellerFilter] = useState('ALL');
  const [sortField, setSortField] = useState<SortField>('document');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, dateFrom, dateTo, statusFilter, sellerFilter, sortField, sortDirection, pageSize]);

  const sellerOptions = useMemo(() => {
    const names = new Set<string>();
    sellers.forEach((s: any) => {
      if (s?.name) names.add(String(s.name).trim());
    });
    quotations.forEach(q => {
      if (q.sellerName) names.add(String(q.sellerName).trim());
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [sellers, quotations]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'document' ? 'desc' : 'asc');
    }
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />;
    return sortDirection === 'asc'
      ? <ArrowUp className="w-3.5 h-3.5 text-[#004A99]" />
      : <ArrowDown className="w-3.5 h-3.5 text-[#004A99]" />;
  };

  const hasActiveFilters = Boolean(searchTerm || dateFrom || dateTo || statusFilter !== 'ALL' || sellerFilter !== 'ALL');

  const clearFilters = () => {
    setSearchTerm('');
    setDateFrom('');
    setDateTo('');
    setStatusFilter('ALL');
    setSellerFilter('ALL');
  };

  const getCurrencySymbol = (currencyCode?: string) => {
    if (!currencyCode) return 'S/';
    // Encontrar en sunatCurrencies
    const currency = sunatCurrencies.find(c => c.code === currencyCode);
    if (currency) {
      // Usualmente el símbolo está en la descripción o es predecible
      if (currency.code === 'PEN' || currency.code === '1') return 'S/';
      if (currency.code === 'USD' || currency.code === '2') return '$';
      // Fallback: si la descripción tiene el símbolo (ej: "S/ - SOLES")
      if (currency.description.includes('S/')) return 'S/';
      if (currency.description.includes('$')) return '$';
    }
    return currencyCode === 'USD' ? '$' : 'S/';
  };

  const filteredQuotations = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    const list = quotations.filter(q => {
      const docCode = q.docSeries ? `${q.docSeries}-${q.docNumber || ''}`.toLowerCase() : `#c-${q.id}`;
      const matchesSearch = !term ||
        q.customerName.toLowerCase().includes(term) ||
        (q.docNumber || '').toLowerCase().includes(term) ||
        docCode.includes(term) ||
        (q.customerDocNumber || '').toLowerCase().includes(term);
      if (!matchesSearch) return false;

      const itemDate = q.createdAt ? new Date(q.createdAt).toISOString().split('T')[0] : '';
      if (dateFrom && (!itemDate || itemDate < dateFrom)) return false;
      if (dateTo && (!itemDate || itemDate > dateTo)) return false;

      if (statusFilter !== 'ALL' && q.status !== statusFilter) return false;

      if (sellerFilter !== 'ALL') {
        const qSeller = (q.sellerName || '').trim().toLowerCase();
        if (qSeller !== sellerFilter.toLowerCase()) return false;
      }

      return true;
    });

    return [...list].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'document') {
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        if (comparison === 0) comparison = a.id - b.id;
      } else if (sortField === 'customer') {
        comparison = (a.customerName || '').toLowerCase().localeCompare((b.customerName || '').toLowerCase());
      } else if (sortField === 'seller') {
        comparison = (a.sellerName || '').toLowerCase().localeCompare((b.sellerName || '').toLowerCase());
      } else if (sortField === 'status') {
        comparison = (a.status || '').toLowerCase().localeCompare((b.status || '').toLowerCase());
      } else if (sortField === 'totalAmount') {
        comparison = Number(a.totalAmount || 0) - Number(b.totalAmount || 0);
      } else if (sortField === 'balance') {
        const balA = Number((a as any).balance ?? (a.status === 'PENDING' ? a.totalAmount : 0));
        const balB = Number((b as any).balance ?? (b.status === 'PENDING' ? b.totalAmount : 0));
        comparison = balA - balB;
      } else if (sortField === 'dueDate') {
        const dA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
        const dB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
        comparison = dA - dB;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [quotations, searchTerm, dateFrom, dateTo, statusFilter, sellerFilter, sortField, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(filteredQuotations.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedQuotations = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredQuotations.slice(start, start + pageSize);
  }, [filteredQuotations, safePage, pageSize]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 6 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.16, ease: 'easeOut' }}
      className="space-y-4"
    >
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row gap-3 justify-between items-start md:items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Cotizaciones</h2>
          <p className="text-[11px] font-bold text-[#004A99] uppercase tracking-wider">Gestión Comercial y Seguimiento</p>
        </div>
        <div className="flex items-center gap-2">
          {isSupervisorOrAdmin && (
            <button
              type="button"
              onClick={handleOpenTokenGenerator}
              className="h-9 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 px-3.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors duration-150 cursor-pointer"
              title="Generar token temporal para autorizar edición de cotizaciones"
            >
              <KeyRound className="w-3.5 h-3.5" />
              Token de Edición
            </button>
          )}
          {canWrite ? (
            <button 
              onClick={onNew}
              className="h-9 bg-[#004A99] hover:bg-[#003B7A] text-white px-4 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors duration-150 shadow-2xs"
            >
              <PlusCircle className="w-4 h-4" />
              Nueva Cotización
            </button>
          ) : (
            <div className="h-9 flex items-center gap-2 bg-slate-100 text-slate-500 px-4 rounded-lg text-sm font-semibold cursor-not-allowed">
              <Lock className="w-4 h-4" />
              Nueva Cotización
            </div>
          )}
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 items-end">
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1">Cliente / Documento</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text"
                placeholder="Buscar por cliente, RUC/DNI o número..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 w-full pl-9 pr-3 text-xs font-medium rounded-lg border border-slate-300 bg-white focus:border-[#004A99] transition-colors duration-150 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1">Fecha Desde</label>
            <input 
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-9 w-full px-2.5 text-xs font-medium rounded-lg border border-slate-300 bg-white focus:border-[#004A99] outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1">Fecha Hasta</label>
            <input 
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-9 w-full px-2.5 text-xs font-medium rounded-lg border border-slate-300 bg-white focus:border-[#004A99] outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1">Estado</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 w-full px-2.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white focus:border-[#004A99] outline-none"
            >
              <option value="ALL">Todos</option>
              <option value="PENDING">Pendiente</option>
              <option value="ACCEPTED">Aceptada</option>
              <option value="EXPIRED">Expirada</option>
            </select>
          </div>

          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1">Vendedor</label>
              <select
                value={sellerFilter}
                onChange={(e) => setSellerFilter(e.target.value)}
                className="h-9 w-full px-2.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white focus:border-[#004A99] outline-none"
              >
                <option value="ALL">Todos</option>
                {sellerOptions.map(name => (
                  <option key={name} value={name}>{name}</option>
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

      {/* Table List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200">
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  <button type="button" onClick={() => handleSort('document')} className="inline-flex items-center gap-1 hover:text-[#004A99]">
                    Documento {renderSortIcon('document')}
                  </button>
                </th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-600 min-w-[220px]">
                  <button type="button" onClick={() => handleSort('customer')} className="inline-flex items-center gap-1 hover:text-[#004A99]">
                    Cliente {renderSortIcon('customer')}
                  </button>
                </th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  <button type="button" onClick={() => handleSort('seller')} className="inline-flex items-center gap-1 hover:text-[#004A99]">
                    Vendedor {renderSortIcon('seller')}
                  </button>
                </th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  <button type="button" onClick={() => handleSort('status')} className="inline-flex items-center gap-1 hover:text-[#004A99]">
                    Estado {renderSortIcon('status')}
                  </button>
                </th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-600 text-right">
                  <button type="button" onClick={() => handleSort('totalAmount')} className="inline-flex items-center gap-1 hover:text-[#004A99]">
                    Total {renderSortIcon('totalAmount')}
                  </button>
                </th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-600 text-right">
                  <button type="button" onClick={() => handleSort('balance')} className="inline-flex items-center gap-1 hover:text-[#004A99]">
                    Saldo {renderSortIcon('balance')}
                  </button>
                </th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-600 whitespace-nowrap">
                  <button type="button" onClick={() => handleSort('dueDate')} className="inline-flex items-center gap-1 hover:text-[#004A99]">
                    Fecha Venc. {renderSortIcon('dueDate')}
                  </button>
                </th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-600 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedQuotations.length > 0 ? (
                paginatedQuotations.map((quot) => {
                  const isAnnulled = quot.status === 'ANNULLED' || quot.status === 'ANULADO';
                  const isConverted = quot.status === 'ACCEPTED' || quot.status === 'CONVERTED';
                  const rowClass = isAnnulled
                    ? 'bg-red-50/75 hover:bg-red-100/70 transition-colors duration-150 group'
                    : isConverted
                      ? 'bg-emerald-50/75 hover:bg-emerald-100/70 transition-colors duration-150 group'
                      : 'hover:bg-blue-50/40 transition-colors duration-150 group';
                  return (
                  <tr key={quot.id} className={rowClass}>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-mono font-bold text-xs text-slate-900">
                          {quot.docSeries ? `${quot.docSeries}-${quot.docNumber}` : `#C-${quot.id}`}
                        </span>
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                          <Calendar className="w-3 h-3" />
                          {new Date(quot.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 min-w-[220px]">
                      <div className="flex flex-col">
                        <span className="font-semibold text-xs text-slate-800 leading-snug">{quot.customerName}</span>
                        <span className="font-mono text-[11px] text-slate-500 font-medium tracking-wide uppercase">{quot.customerDocNumber || 'S/D'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-slate-700 whitespace-nowrap">
                      {quot.sellerName || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase border ${
                        isAnnulled ? 'bg-red-100 text-red-700 border-red-200' :
                        isConverted ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                        quot.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {isAnnulled ? 'Anulada' : isConverted ? 'Pasó a Pedido' : quot.status === 'PENDING' ? 'Pendiente' : 'Expirada'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-col items-end tabular-nums">
                        <span className="font-bold text-sm text-slate-900">
                          {getCurrencySymbol(quot.currency)} {formatNumber(quot.totalAmount)}
                        </span>
                        {(quot.currency === 'USD' || quot.currency === '2') && (
                          <span className="text-[11px] text-slate-500 font-medium">TC: {quot.exchangeRate}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <span className="font-bold text-xs text-slate-800">
                        {getCurrencySymbol(quot.currency)} {formatNumber(Number((quot as any).balance ?? (quot.status === 'PENDING' ? quot.totalAmount : 0)))}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 font-mono tabular-nums whitespace-nowrap">
                      {quot.dueDate ? new Date(quot.dueDate).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        {quot.status === 'PENDING' && canWrite && (() => {
                          const isAuthorizedRemote = Boolean(getApprovedAuthForQuotation(quot.id));
                          const needsToken = !isSupervisorOrAdmin && !isOwnQuotation(quot) && !isAuthorizedRemote;
                          return (
                            <button 
                              onClick={() => handleRequestConvert(quot)}
                              className={`p-2 rounded-lg transition-colors duration-150 ${
                                needsToken
                                  ? 'bg-amber-50 text-amber-700 hover:bg-amber-600 hover:text-white border border-amber-200'
                                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white'
                              }`}
                              title={
                                isAuthorizedRemote ? 'Autorizado por Supervisor — Convertir a Pedido' :
                                needsToken ? 'Pasar a Pedido cotización de otro vendedor (Requiere Autorización)' :
                                'Convertir a Pedido'
                              }
                              aria-label="Convertir a Pedido"
                            >
                              <ShoppingCart className="w-4 h-4" />
                            </button>
                          );
                        })()}
                        {canWrite && onClone && (
                          <button 
                            onClick={() => onClone(quot)}
                            className="p-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-600 hover:text-white transition-colors duration-150"
                            title="Clonar Cotización"
                            aria-label="Clonar Cotización"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        )}
                        <button 
                          onClick={async () => await generateQuotationPDF(quot, quot.items || [])}
                          className="p-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-700 hover:text-white transition-colors duration-150"
                          title="Descargar PDF"
                          aria-label="Descargar PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => window.open(`https://wa.me/${quot.customerPhone}?text=Hola%20${quot.customerName},%20aquí%20tienes%20tu%20cotización%20${quot.docSeries}-${quot.docNumber}`, '_blank')}
                          className="p-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-600 hover:text-white transition-colors duration-150"
                          title="Enviar WhatsApp"
                          aria-label="Enviar WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                        {quot.status === 'ACCEPTED' && canWrite && (
                          <button 
                            onClick={() => onReset && onReset(quot.id)}
                            className="p-2 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-600 hover:text-white transition-colors duration-150"
                            title="Desbloquear / Volver a Pendiente"
                            aria-label="Desbloquear / Volver a Pendiente"
                          >
                            <RefreshCcw className="w-4 h-4" />
                          </button>
                        )}
                        {quot.status === 'PENDING' && canWrite && (
                          <>
                            {(() => {
                              const isAuthorizedRemote = Boolean(getApprovedAuthForQuotation(quot.id));
                              const needsToken = !isSupervisorOrAdmin && !isOwnQuotation(quot) && !isAuthorizedRemote;
                              return (
                                <button 
                                  onClick={() => handleRequestEdit(quot)}
                                  className={`p-2 rounded-lg transition-colors duration-150 ${
                                    needsToken
                                      ? 'bg-amber-50 text-amber-700 hover:bg-amber-600 hover:text-white border border-amber-200'
                                      : isAuthorizedRemote
                                        ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200'
                                        : 'bg-blue-50 text-[#004A99] hover:bg-[#004A99] hover:text-white'
                                  }`}
                                  title={
                                    isAuthorizedRemote ? 'Autorizado por Supervisor — Editar' :
                                    needsToken ? 'Editar cotización de otro vendedor (Requiere Autorización)' :
                                    'Editar'
                                  }
                                  aria-label="Editar"
                                >
                                  {needsToken ? <KeyRound className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                                </button>
                              );
                            })()}
                            <button 
                              onClick={() => onDelete(quot.id)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-150"
                              title="Anular"
                              aria-label="Anular"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {!canWrite && (
                          <Lock className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
                        <FileText className="w-8 h-8" />
                      </div>
                      <p className="text-slate-400 font-bold">No se encontraron cotizaciones</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filteredQuotations.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-slate-50/80 border-t border-slate-200 text-xs">
            <div className="flex items-center gap-3 text-slate-600 font-medium tabular-nums">
              <span>
                Mostrando <strong className="text-slate-900">{(safePage - 1) * pageSize + 1}</strong>–<strong className="text-slate-900">{Math.min(safePage * pageSize, filteredQuotations.length)}</strong> de <strong className="text-slate-900">{filteredQuotations.length}</strong> registros
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

      {/* Modal: Generar Token de Autorización (Supervisor / Admin) */}
      {isTokenGenModalOpen && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 bg-[#004A99] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-300" />
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-tight">Tokens de Edición (1 uso / 15 min)</h3>
                  <p className="text-[11px] text-blue-200">Autoriza a un vendedor a editar la cotización de otro</p>
                </div>
              </div>
              <button onClick={() => setIsTokenGenModalOpen(false)} className="p-1 hover:bg-white/10 rounded-lg cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <button
                type="button"
                onClick={handleGenerateToken}
                disabled={generatingToken}
                className="w-full h-9 bg-[#004A99] hover:bg-blue-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                {generatingToken ? 'Generando...' : 'Generar Nuevo Token'}
              </button>

              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {activeTokens.length === 0 ? (
                  <p className="text-center text-xs text-slate-400 py-4">No hay tokens activos vigentes</p>
                ) : (
                  activeTokens.map(tk => (
                    <div key={tk.id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 border border-slate-200">
                      <div>
                        <span className="font-mono font-black text-base tracking-widest text-[#004A99]">{tk.code}</span>
                        <p className="text-[10px] text-slate-500">
                          Expira: {new Date(tk.expiresAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyCode(tk.code)}
                        className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg text-[11px] font-bold text-slate-700 flex items-center gap-1 cursor-pointer"
                      >
                        {copiedCode === tk.code ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedCode === tk.code ? 'Copiado' : 'Copiar'}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Solicitar Autorización Remota o Ingresar Token */}
      {tokenPromptQuotation && (() => {
        const pendingReq = getPendingAuthForQuotation(tokenPromptQuotation.id);
        const approvedReq = getApprovedAuthForQuotation(tokenPromptQuotation.id);
        return (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden">
              <div className="px-5 py-3.5 bg-amber-600 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4" />
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-tight">Autorización Requerida</h3>
                    <p className="text-[11px] text-amber-100">
                      Cotización de {tokenPromptQuotation.sellerName || 'otro vendedor'}
                    </p>
                  </div>
                </div>
                <button type="button" onClick={() => setTokenPromptQuotation(null)} className="p-1 hover:bg-white/10 rounded-lg cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 space-y-4">
                {/* Opción principal: Solicitud Remota al Supervisor/Admin */}
                <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 space-y-2.5">
                  <p className="text-xs font-bold text-[#004A99]">
                    Opción 1: Solicitar aprobación remota al Supervisor / Admin
                  </p>
                  {approvedReq ? (
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-2">
                        ¡Solicitud aprobada por {approvedReq.reviewedByName || 'Supervisor'}! Ya puedes continuar.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          const target = tokenPromptQuotation;
                          setTokenPromptQuotation(null);
                          if (tokenActionMode === 'convert') onConvertToOrder(target);
                          else onEdit(target);
                        }}
                        className="w-full h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg cursor-pointer"
                      >
                        {tokenActionMode === 'convert' ? 'Continuar a Pasar a Pedido' : 'Continuar a Editar'}
                      </button>
                    </div>
                  ) : pendingReq ? (
                    <div className="flex items-center justify-between gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      <span className="text-xs font-bold text-amber-800">
                        Solicitud enviada — Esperando aprobación...
                      </span>
                      <button
                        type="button"
                        onClick={loadMyAuthRequests}
                        className="px-2.5 py-1 bg-white border border-amber-300 rounded text-[11px] font-bold text-amber-800 hover:bg-amber-100 cursor-pointer"
                      >
                        Verificar
                      </button>
                    </div>
                  ) : (
                    <>
                      <input
                        type="text"
                        value={authReason}
                        onChange={e => setAuthReason(e.target.value)}
                        placeholder="Motivo breve (opcional, ej: cliente solicitó cambio)..."
                        className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-[#004A99]"
                      />
                      <button
                        type="button"
                        onClick={handleSendAuthRequest}
                        disabled={sendingAuthReq}
                        className="w-full h-9 bg-[#004A99] hover:bg-blue-800 disabled:opacity-50 text-white text-xs font-bold rounded-lg cursor-pointer"
                      >
                        {sendingAuthReq ? 'Enviando solicitud...' : `Solicitar Autorización para ${tokenActionMode === 'convert' ? 'Pasar a Pedido' : 'Editar'}`}
                      </button>
                    </>
                  )}
                </div>

                {/* Opción alternativa: Token manual */}
                <form onSubmit={handleVerifyAndOpenEdit} className="pt-2 border-t border-slate-200 space-y-2.5">
                  <p className="text-xs font-bold text-slate-600">
                    Opción 2: ¿Ya tienes un Token temporal?
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={12}
                      value={enteredToken}
                      onChange={e => setEnteredToken(e.target.value.toUpperCase())}
                      placeholder="TOKEN (EJ: A7K9P2)"
                      className="flex-1 h-9 px-3 border border-slate-300 rounded-lg text-center font-mono font-black text-sm tracking-widest uppercase outline-none focus:border-amber-500"
                    />
                    <button
                      type="submit"
                      disabled={verifyingToken || !enteredToken.trim()}
                      className="px-4 h-9 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg cursor-pointer"
                    >
                      {verifyingToken ? 'Validando...' : 'Validar'}
                    </button>
                  </div>
                </form>

                {tokenError && (
                  <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5">
                    {tokenError}
                  </p>
                )}

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setTokenPromptQuotation(null)}
                    className="px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </motion.div>
  );
};
