import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'motion/react';
import {
  DollarSign,
  Search,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Landmark,
  CreditCard,
  XCircle,
  Eye,
  RefreshCw,
  Calendar,
  Edit2,
  Save
} from 'lucide-react';
import { formatNumber } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';

export interface PaymentRecord {
  id: number;
  orderId: number;
  amount: number;
  method: string;
  bankName?: string | null;
  accountNumber?: string | null;
  ruc?: string | null;
  currency?: string | null;
  exchangeRate?: number | null;
  originalAmount?: number | null;
  voucherNumber?: string | null;
  observation?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  date: string;
  createdAt?: string;
  updatedAt?: string;
  order?: {
    id: number;
    docSeries?: string;
    docNumber?: string;
    customerName: string;
    customerDocNumber?: string;
    totalAmount: number;
    paymentStatus: string;
    status: string;
    paymentCondition?: string;
    warehouseStatus?: string | null;
    createdAt?: string;
  };
}

interface PaymentModuleProps {
  payments: PaymentRecord[];
  onDeletePayment: (paymentId: number) => Promise<void>;
  onUpdatePayment?: (paymentId: number, data: any) => Promise<void>;
  exchangeRates?: any[];
  onOpenOrderPayment: (orderId: number) => void;
  onRefresh?: () => void;
}

const BANK_OPTIONS = [
  'BCP',
  'BBVA',
  'INTERBANK',
  'SCOTIABANK',
  'BANBIF',
  'PICHINCHA',
  'BANCO DE LA NACIÓN',
  'CAJA PIURA',
  'CAJA AREQUIPA',
  'OTRO'
];

type SortField = 'order' | 'customer' | 'method' | 'voucher' | 'date' | 'currency' | 'amount' | 'observation' | 'createdBy' | 'createdAt' | 'updatedBy' | 'updatedAt';
type SortDirection = 'asc' | 'desc';

export const PaymentModule: React.FC<PaymentModuleProps> = ({
  payments,
  onDeletePayment,
  onUpdatePayment,
  exchangeRates = [],
  onOpenOrderPayment,
  onRefresh
}) => {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission?.('WRITE_ORDERS') || hasPermission?.('ALL');

  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [bankFilter, setBankFilter] = useState('ALL');
  const [currencyFilter, setCurrencyFilter] = useState('ALL');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [paymentMethods, setPaymentMethods] = useState<{ name: string; isActive: boolean }[]>([
    { name: 'EFECTIVO', isActive: true },
    { name: 'TRANSFERENCIA', isActive: true },
    { name: 'TARJETA / POS', isActive: true },
    { name: 'YAPE / PLIN', isActive: true },
  ]);

  const [bankAccounts, setBankAccounts] = useState<any[]>([]);

  useEffect(() => {
    axios.get('/api/payment-methods')
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setPaymentMethods(res.data);
        }
      })
      .catch(() => {});
    axios.get('/api/bank-accounts')
      .then((res) => {
        if (Array.isArray(res.data)) {
          setBankAccounts(res.data);
        }
      })
      .catch(() => {});
  }, []);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [editingPayment, setEditingPayment] = useState<PaymentRecord | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    method: 'EFECTIVO',
    bankName: '',
    accountNumber: '',
    ruc: '',
    currency: 'PEN',
    exchangeRate: '1',
    amount: '0',
    voucherNumber: '',
    date: '',
    observation: ''
  });

  const getRateForDate = (targetDate: string) => {
    const match = exchangeRates.find((r: any) => r.date && String(r.date).split('T')[0] === targetDate);
    const rate = match?.sell_rate ?? exchangeRates[0]?.sell_rate ?? 1;
    return Number(rate) > 0 ? String(rate) : '1';
  };

  const openEditModal = (p: PaymentRecord) => {
    const pCurrency = (p.currency || 'PEN').toUpperCase();
    const pDate = p.date ? new Date(p.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    const pRate = p.exchangeRate ? String(p.exchangeRate) : getRateForDate(pDate);
    const displayAmount = pCurrency === 'USD' && p.originalAmount ? Number(p.originalAmount).toFixed(2) : Number(p.amount).toFixed(2);
    setEditingPayment(p);
    setEditForm({
      method: p.method || 'EFECTIVO',
      bankName: p.bankName || '',
      accountNumber: p.accountNumber || '',
      ruc: p.ruc || '',
      currency: pCurrency,
      exchangeRate: pRate,
      amount: displayAmount,
      voucherNumber: p.voucherNumber || '',
      date: pDate,
      observation: p.observation || ''
    });
  };

  const handleEditCurrencyChange = (newCurrency: string) => {
    if (newCurrency === editForm.currency) return;
    const rate = parseFloat(editForm.exchangeRate) || 1;
    const current = parseFloat(editForm.amount) || 0;
    let nextAmount = editForm.amount;
    if (newCurrency === 'USD' && rate > 0) {
      nextAmount = (current / rate).toFixed(2);
    } else if (newCurrency === 'PEN') {
      nextAmount = (current * rate).toFixed(2);
    }
    setEditForm(prev => ({ ...prev, currency: newCurrency, amount: nextAmount }));
  };

  const editRawAmount = parseFloat(editForm.amount) || 0;
  const editRate = parseFloat(editForm.exchangeRate) || 1;
  const editConvertedPEN = editForm.currency === 'USD' ? Number((editRawAmount * editRate).toFixed(2)) : editRawAmount;

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment || !onUpdatePayment) return;
    setSavingEdit(true);
    try {
      await onUpdatePayment(editingPayment.id, {
        ...editForm,
        ruc: /TRANSFER|DEPOS|DEPÓS/i.test(String(editForm.method || '')) ? editForm.ruc : '',
        amount: editConvertedPEN,
        originalAmount: editForm.currency === 'USD' ? editRawAmount : null,
        exchangeRate: editForm.currency === 'USD' ? editRate : null
      });
      setEditingPayment(null);
    } catch {
      // error alert handled by parent
    } finally {
      setSavingEdit(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, dateFrom, dateTo, bankFilter, currencyFilter, methodFilter, sortField, sortDirection, pageSize]);

  const bankOptions = useMemo(() => {
    const banks = new Set<string>();
    bankAccounts.forEach((a: any) => {
      if (a.bankName) banks.add(String(a.bankName).trim());
    });
    payments.forEach(p => {
      if (p.bankName) banks.add(p.bankName.trim());
    });
    return Array.from(banks).sort((a, b) => a.localeCompare(b));
  }, [payments, bankAccounts]);

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

  const hasActiveFilters = Boolean(
    searchTerm || dateFrom || dateTo || bankFilter !== 'ALL' || currencyFilter !== 'ALL' || methodFilter !== 'ALL'
  );

  const clearFilters = () => {
    setSearchTerm('');
    setDateFrom('');
    setDateTo('');
    setBankFilter('ALL');
    setCurrencyFilter('ALL');
    setMethodFilter('ALL');
  };

  const filteredPayments = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    const list = payments.filter(p => {
      const orderCode = p.order
        ? `#ped-${p.order.docSeries || ''}${p.order.docNumber ? `-${p.order.docNumber}` : p.order.id}`.toLowerCase()
        : `#${p.orderId}`;
      const customerName = (p.order?.customerName || '').toLowerCase();
      const customerDoc = (p.order?.customerDocNumber || '').toLowerCase();
      const voucher = (p.voucherNumber || '').toLowerCase();
      const account = (p.accountNumber || '').toLowerCase();

      const matchesSearch =
        !term ||
        orderCode.includes(term) ||
        customerName.includes(term) ||
        customerDoc.includes(term) ||
        voucher.includes(term) ||
        account.includes(term);
      if (!matchesSearch) return false;

      const itemDate = p.date ? new Date(p.date).toISOString().split('T')[0] : '';
      if (dateFrom && (!itemDate || itemDate < dateFrom)) return false;
      if (dateTo && (!itemDate || itemDate > dateTo)) return false;

      if (bankFilter !== 'ALL' && (p.bankName || '') !== bankFilter) return false;

      const itemCurrency = (p.currency || 'PEN').toUpperCase();
      if (currencyFilter !== 'ALL' && itemCurrency !== currencyFilter) return false;

      if (methodFilter !== 'ALL' && (p.method || '').toUpperCase() !== methodFilter) return false;

      return true;
    });

    return [...list].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'date') {
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
        if (comparison === 0) comparison = a.id - b.id;
      } else if (sortField === 'order') {
        comparison = a.orderId - b.orderId;
      } else if (sortField === 'customer') {
        comparison = (a.order?.customerName || '').toLowerCase().localeCompare((b.order?.customerName || '').toLowerCase());
      } else if (sortField === 'method') {
        comparison = `${a.method}-${a.bankName || ''}`.toLowerCase().localeCompare(`${b.method}-${b.bankName || ''}`.toLowerCase());
      } else if (sortField === 'voucher') {
        comparison = (a.voucherNumber || '').toLowerCase().localeCompare((b.voucherNumber || '').toLowerCase());
      } else if (sortField === 'currency') {
        comparison = (a.currency || 'PEN').localeCompare(b.currency || 'PEN');
      } else if (sortField === 'amount') {
        comparison = Number(a.amount || 0) - Number(b.amount || 0);
      } else if (sortField === 'observation') {
        comparison = (a.observation || '').toLowerCase().localeCompare((b.observation || '').toLowerCase());
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
  }, [payments, searchTerm, dateFrom, dateTo, bankFilter, currencyFilter, methodFilter, sortField, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedPayments = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredPayments.slice(start, start + pageSize);
  }, [filteredPayments, safePage, pageSize]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.16, ease: 'easeOut' }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Cobros y Adelantos</h2>
          <p className="text-[11px] font-bold text-[#004A99] uppercase tracking-wider">
            Control de Abonos, Cuentas Bancarias y Anulación de Cobros
          </p>
        </div>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="h-9 px-3.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors duration-150 self-start md:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Actualizar
          </button>
        )}
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2.5 items-end">
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1">
              Pedido / Cliente / Voucher / Cuenta
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar pedido, cliente, RUC/DNI, voucher..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="h-9 w-full pl-9 pr-3 text-xs font-medium rounded-lg border border-slate-300 bg-white focus:border-[#004A99] transition-colors duration-150 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1">Fecha Desde</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="h-9 w-full px-2.5 text-xs font-medium rounded-lg border border-slate-300 bg-white focus:border-[#004A99] outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1">Fecha Hasta</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="h-9 w-full px-2.5 text-xs font-medium rounded-lg border border-slate-300 bg-white focus:border-[#004A99] outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1">Método</label>
            <select
              value={methodFilter}
              onChange={e => setMethodFilter(e.target.value)}
              className="h-9 w-full px-2.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white focus:border-[#004A99] outline-none"
            >
              <option value="ALL">Todos</option>
              {paymentMethods.map((m) => (
                <option key={m.name} value={m.name}>{m.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1">Banco</label>
            <select
              value={bankFilter}
              onChange={e => setBankFilter(e.target.value)}
              className="h-9 w-full px-2.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white focus:border-[#004A99] outline-none"
            >
              <option value="ALL">Todos</option>
              {bankOptions.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1">Moneda</label>
              <select
                value={currencyFilter}
                onChange={e => setCurrencyFilter(e.target.value)}
                className="h-9 w-full px-2.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white focus:border-[#004A99] outline-none"
              >
                <option value="ALL">Todas</option>
                <option value="PEN">PEN (S/)</option>
                <option value="USD">USD ($)</option>
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

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200">
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-600 whitespace-nowrap">
                  <button type="button" onClick={() => handleSort('order')} className="inline-flex items-center gap-1 hover:text-[#004A99]">
                    Pedido {renderSortIcon('order')}
                  </button>
                </th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-600 min-w-[200px]">
                  <button type="button" onClick={() => handleSort('customer')} className="inline-flex items-center gap-1 hover:text-[#004A99]">
                    Cliente {renderSortIcon('customer')}
                  </button>
                </th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  <button type="button" onClick={() => handleSort('method')} className="inline-flex items-center gap-1 hover:text-[#004A99]">
                    Método / Banco / Cuenta {renderSortIcon('method')}
                  </button>
                </th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-600 whitespace-nowrap">
                  <button type="button" onClick={() => handleSort('voucher')} className="inline-flex items-center gap-1 hover:text-[#004A99]">
                    Nro. Operación {renderSortIcon('voucher')}
                  </button>
                </th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-600 whitespace-nowrap">
                  <button type="button" onClick={() => handleSort('date')} className="inline-flex items-center gap-1 hover:text-[#004A99]">
                    Fecha Operación {renderSortIcon('date')}
                  </button>
                </th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-600 text-center">
                  <button type="button" onClick={() => handleSort('currency')} className="inline-flex items-center gap-1 hover:text-[#004A99]">
                    Moneda {renderSortIcon('currency')}
                  </button>
                </th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-600 text-right whitespace-nowrap">
                  <button type="button" onClick={() => handleSort('amount')} className="inline-flex items-center gap-1 hover:text-[#004A99]">
                    Monto (S/) {renderSortIcon('amount')}
                  </button>
                </th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  <button type="button" onClick={() => handleSort('observation')} className="inline-flex items-center gap-1 hover:text-[#004A99]">
                    Glosa {renderSortIcon('observation')}
                  </button>
                </th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-600 whitespace-nowrap">
                  <button type="button" onClick={() => handleSort('createdBy')} className="inline-flex items-center gap-1 hover:text-[#004A99]">
                    Usuario Crea. {renderSortIcon('createdBy')}
                  </button>
                </th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-600 whitespace-nowrap">
                  <button type="button" onClick={() => handleSort('createdAt')} className="inline-flex items-center gap-1 hover:text-[#004A99]">
                    Fecha Crea. {renderSortIcon('createdAt')}
                  </button>
                </th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-600 whitespace-nowrap">
                  <button type="button" onClick={() => handleSort('updatedBy')} className="inline-flex items-center gap-1 hover:text-[#004A99]">
                    Usuario Act. {renderSortIcon('updatedBy')}
                  </button>
                </th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-600 whitespace-nowrap">
                  <button type="button" onClick={() => handleSort('updatedAt')} className="inline-flex items-center gap-1 hover:text-[#004A99]">
                    Fecha Act. {renderSortIcon('updatedAt')}
                  </button>
                </th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-600 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedPayments.length > 0 ? paginatedPayments.map(p => {
                const isDispatched = Boolean(p.order && ['DISPATCHED', 'SHIPPED', 'DELIVERED'].includes(p.order.status));
                const orderDate = p.order?.createdAt || p.date;
                return (
                  <tr key={p.id} className="hover:bg-blue-50/40 transition-colors duration-150">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-mono font-bold text-xs text-slate-900">
                          {p.order
                            ? `#PED-${p.order.docSeries || ''}${p.order.docNumber ? `-${p.order.docNumber}` : p.order.id}`
                            : `#PED-${p.orderId}`}
                        </span>
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium tabular-nums">
                          <Calendar className="w-3 h-3" />
                          {new Date(orderDate).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 min-w-[200px]">
                      <div className="flex flex-col">
                        <span className="font-semibold text-xs text-slate-800 leading-snug">
                          {p.order?.customerName || '-'}
                        </span>
                        <span className="font-mono text-[11px] text-slate-500">
                          {p.order?.customerDocNumber || 'S/D'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${
                          p.method === 'EFECTIVO' ? 'bg-emerald-50 text-emerald-700' :
                          p.method === 'TRANSFERENCIA' ? 'bg-blue-50 text-[#004A99]' :
                          'bg-purple-50 text-purple-700'
                        }`}>
                          {p.method === 'EFECTIVO' ? <DollarSign className="w-3.5 h-3.5" /> :
                           p.method === 'TRANSFERENCIA' ? <Landmark className="w-3.5 h-3.5" /> :
                           <CreditCard className="w-3.5 h-3.5" />}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-800 uppercase whitespace-nowrap">
                            {p.method}{p.bankName ? ` • ${p.bankName}` : ''}
                          </span>
                          {p.accountNumber && (
                            <span className="font-mono text-[11px] text-slate-500 whitespace-nowrap">CTA: {p.accountNumber}</span>
                          )}
                          {p.ruc && (
                            <span className="font-mono text-[11px] text-slate-500 whitespace-nowrap">RUC: {p.ruc}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-700 whitespace-nowrap">
                      {p.voucherNumber || '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700 font-mono tabular-nums whitespace-nowrap">
                      {new Date(p.date).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                        p.currency === 'USD'
                          ? 'bg-blue-50 text-[#004A99] border border-blue-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {p.currency || 'PEN'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">
                      <div className="flex flex-col items-end">
                        <span className="font-bold text-xs text-slate-900">S/ {formatNumber(p.amount)}</span>
                        {p.currency === 'USD' && p.originalAmount && (
                          <span className="text-[11px] text-[#004A99] font-medium">
                            $ {formatNumber(p.originalAmount)} (TC {Number(p.exchangeRate || 1).toFixed(3)})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 max-w-[200px] truncate" title={p.observation || ''}>
                      {p.observation || '-'}
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
                      {p.updatedAt ? new Date(p.updatedAt).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onOpenOrderPayment(p.orderId)}
                          className="p-2 bg-blue-50 text-[#004A99] rounded-lg hover:bg-[#004A99] hover:text-white transition-colors duration-150"
                          title="Ver / Gestionar cobros del pedido"
                          aria-label="Ver cobros del pedido"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {canWrite && onUpdatePayment && (
                          <button
                            type="button"
                            onClick={() => openEditModal(p)}
                            className="p-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-700 hover:text-white transition-colors duration-150"
                            title="Editar Cobro / Adelanto"
                            aria-label="Editar Cobro"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {canWrite && (
                          <button
                            type="button"
                            disabled={isDispatched}
                            onClick={() => {
                              if (confirm('¿Anular este cobro / adelanto? Se recalculará el saldo del pedido.')) {
                                onDeletePayment(p.id);
                              }
                            }}
                            className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                            title={isDispatched ? 'No se puede anular: pedido ya despachado' : 'Anular Cobro'}
                            aria-label="Anular Cobro"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={13} className="px-6 py-16 text-center text-sm font-semibold text-slate-400">
                    No se encontraron cobros o adelantos registrados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filteredPayments.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-slate-50/80 border-t border-slate-200 text-xs">
            <div className="flex items-center gap-3 text-slate-600 font-medium tabular-nums">
              <span>
                Mostrando <strong className="text-slate-900">{(safePage - 1) * pageSize + 1}</strong>–<strong className="text-slate-900">{Math.min(safePage * pageSize, filteredPayments.length)}</strong> de <strong className="text-slate-900">{filteredPayments.length}</strong> registros
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

      {/* Modal de Edición de Cobro / Adelanto */}
      <AnimatePresence>
        {editingPayment && (
          <div key="edit-payment-modal" className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 8 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-300 overflow-hidden flex flex-col max-h-[92vh]"
            >
              <div className="bg-[#004A99] px-4 py-3 flex items-center justify-between text-white border-b border-blue-900">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-tight">Editar Cobro / Adelanto</h3>
                  <p className="text-[11px] text-blue-200 font-medium">
                    {editingPayment.order
                      ? `#PED-${editingPayment.order.docSeries || ''}${editingPayment.order.docNumber ? `-${editingPayment.order.docNumber}` : editingPayment.order.id}`
                      : `#PED-${editingPayment.orderId}`} • {editingPayment.order?.customerName || '-'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingPayment(null)}
                  aria-label="Cerrar modal"
                  className="p-1 hover:bg-red-600 rounded text-white/80 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="p-4 space-y-3 overflow-y-auto bg-slate-50/60">
                <div className="bg-white p-3.5 rounded-lg border border-slate-200 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Método de Pago</label>
                      <select
                        value={editForm.method}
                        onChange={e => setEditForm({ ...editForm, method: e.target.value })}
                        className="h-9 w-full bg-white border border-slate-300 rounded-lg px-3 text-xs font-semibold outline-none focus:border-[#004A99]"
                      >
                        {paymentMethods.filter((m) => m.isActive).map((m) => (
                          <option key={m.name} value={m.name}>{m.name}</option>
                        ))}
                        {editForm.method && !paymentMethods.some((m) => m.isActive && m.name === editForm.method) && (
                          <option value={editForm.method}>{editForm.method}</option>
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Moneda</label>
                      <select
                        value={editForm.currency}
                        onChange={e => handleEditCurrencyChange(e.target.value)}
                        className="h-9 w-full bg-white border border-slate-300 rounded-lg px-3 text-xs font-semibold outline-none focus:border-[#004A99]"
                      >
                        <option value="PEN">SOLES (S/)</option>
                        <option value="USD">DÓLARES ($)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Banco del Abono</label>
                      {(() => {
                        const activeAccounts = bankAccounts.filter((a) => a.isActive);
                        const uniqueBankNames = activeAccounts.length > 0
                          ? Array.from(new Set(activeAccounts.map((a) => a.bankName)))
                          : BANK_OPTIONS;
                        return (
                          <select
                            value={editForm.bankName}
                            onChange={e => {
                              const bank = e.target.value;
                              const matching = activeAccounts.filter((a) => a.bankName === bank);
                              const preferred = matching.find((a) => a.currency === editForm.currency) || matching[0];
                              setEditForm({
                                ...editForm,
                                bankName: bank,
                                accountNumber: preferred ? preferred.accountNumber : ''
                              });
                            }}
                            className="h-9 w-full bg-white border border-slate-300 rounded-lg px-3 text-xs outline-none focus:border-[#004A99]"
                          >
                            <option value="">-- Seleccionar Banco --</option>
                            {uniqueBankNames.map(bank => (
                              <option key={bank} value={bank}>{bank}</option>
                            ))}
                            {editForm.bankName && !uniqueBankNames.includes(editForm.bankName) && (
                              <option value={editForm.bankName}>{editForm.bankName}</option>
                            )}
                          </select>
                        );
                      })()}
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Nro. de Cuenta</label>
                      {(() => {
                        const activeAccounts = bankAccounts.filter((a) => a.isActive && a.bankName === editForm.bankName);
                        if (activeAccounts.length > 0) {
                          return (
                            <select
                              value={editForm.accountNumber}
                              onChange={e => setEditForm({ ...editForm, accountNumber: e.target.value })}
                              className="h-9 w-full bg-white border border-slate-300 rounded-lg px-3 text-xs font-mono outline-none focus:border-[#004A99]"
                            >
                              <option value="">-- Seleccionar Cuenta --</option>
                              {activeAccounts.map((acc) => (
                                <option key={acc.id} value={acc.accountNumber}>
                                  {acc.accountNumber} ({acc.currency})
                                </option>
                              ))}
                              {editForm.accountNumber && !activeAccounts.some((a) => a.accountNumber === editForm.accountNumber) && (
                                <option value={editForm.accountNumber}>{editForm.accountNumber}</option>
                              )}
                            </select>
                          );
                        }
                        return (
                          <input
                            type="text"
                            value={editForm.accountNumber}
                            onChange={e => setEditForm({ ...editForm, accountNumber: e.target.value })}
                            className="h-9 w-full bg-white border border-slate-300 rounded-lg px-3 text-xs font-mono outline-none focus:border-[#004A99]"
                            placeholder="Ej: 191-12345678-0-90"
                          />
                        );
                      })()}
                    </div>
                    {(/TRANSFER|DEPOS|DEPÓS/i.test(String(editForm.method || ''))) && (
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Número de RUC (Titular / Empresa)</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={11}
                          value={editForm.ruc}
                          onChange={e => setEditForm({ ...editForm, ruc: e.target.value.replace(/\D/g, '').slice(0, 11) })}
                          className="h-9 w-full bg-white border border-slate-300 rounded-lg px-3 text-xs font-mono outline-none focus:border-[#004A99]"
                          placeholder="Ej: 20123456789"
                        />
                      </div>
                    )}
                    {editForm.currency === 'USD' && (
                      <div>
                        <label className="block text-[11px] font-bold text-[#004A99] uppercase mb-1">Tipo de Cambio</label>
                        <input
                          required
                          type="number"
                          step="0.001"
                          min="0.001"
                          value={editForm.exchangeRate}
                          onChange={e => setEditForm({ ...editForm, exchangeRate: e.target.value })}
                          className="h-9 w-full bg-blue-50/70 border border-blue-300 rounded-lg px-3 text-xs font-mono font-bold text-[#004A99] outline-none focus:border-[#004A99]"
                        />
                      </div>
                    )}
                    <div className={editForm.currency === 'USD' ? '' : 'sm:col-span-2'}>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                        Monto {editForm.currency === 'USD' ? '(en Dólares)' : '(en Soles)'}
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">
                          {editForm.currency === 'USD' ? '$' : 'S/'}
                        </span>
                        <input
                          required
                          type="number"
                          step="0.01"
                          value={editForm.amount}
                          onChange={e => setEditForm({ ...editForm, amount: e.target.value })}
                          className="h-9 w-full bg-white border border-slate-300 rounded-lg pl-8 pr-3 text-xs font-mono font-bold outline-none focus:border-[#004A99]"
                        />
                      </div>
                      {editForm.currency === 'USD' && (
                        <p className="mt-1 text-[11px] font-semibold text-emerald-700 tabular-nums">
                          Equivalente: S/ {formatNumber(editConvertedPEN)} (TC {editRate})
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Nro. Operación</label>
                      <input
                        type="text"
                        value={editForm.voucherNumber}
                        onChange={e => setEditForm({ ...editForm, voucherNumber: e.target.value })}
                        className="h-9 w-full bg-white border border-slate-300 rounded-lg px-3 text-xs font-mono outline-none focus:border-[#004A99]"
                        placeholder="Ej: 098234"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Fecha Operación</label>
                      <input
                        required
                        type="date"
                        value={editForm.date}
                        onChange={e => setEditForm({ ...editForm, date: e.target.value })}
                        className="h-9 w-full bg-white border border-slate-300 rounded-lg px-3 text-xs outline-none focus:border-[#004A99]"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Glosa / Observación</label>
                      <input
                        type="text"
                        value={editForm.observation}
                        onChange={e => setEditForm({ ...editForm, observation: e.target.value })}
                        className="h-9 w-full bg-white border border-slate-300 rounded-lg px-3 text-xs outline-none focus:border-[#004A99]"
                        placeholder="Observación del adelanto..."
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => setEditingPayment(null)}
                    className="h-9 px-3.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit || editConvertedPEN <= 0}
                    aria-busy={savingEdit}
                    className="h-9 px-4 bg-[#004A99] hover:bg-[#003B7A] text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {savingEdit ? 'Guardando...' : 'Actualizar Cobro'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
