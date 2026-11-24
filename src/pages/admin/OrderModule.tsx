import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  ShoppingCart, Search, Filter, Edit2, Trash2, Phone, 
  MessageCircle, Truck, CreditCard, Clock, CheckCircle, 
  XCircle, FileText, MoreVertical, Eye, DollarSign, Lock, Undo2,
  Receipt, ArrowUpDown, ArrowUp, ArrowDown, X, ChevronLeft, ChevronRight
} from 'lucide-react';
import { formatNumber, formatCurrency } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';

interface OrderItem {
  id: number;
  productId?: number;
  quantity: number;
  price: number;
  product: {
    name: string;
    images?: string[];
  };
}

interface Payment {
  id: number;
  amount: number;
  method: string;
  date: string;
}

interface OrderInvoiceItem {
  productId: number;
  quantity: number;
  unitMeasure?: string;
}

interface OrderInvoice {
  id: number;
  numberFormatted: string;
  documentType?: string;
  totalAmount?: number;
  sunatStatus?: string;
  createdAt?: string;
  items?: OrderInvoiceItem[];
}

interface Order {
  id: number;
  customerName: string;
  customerPhone: string;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
  items: OrderItem[];
  agency?: {
    name: string;
    zone?: { name: string };
  };
  docSeries?: string;
  docNumber?: string;
  sellerName?: string;
  customerDocNumber?: string;
  voucherNumber?: string;
  payments?: Payment[];
  invoices?: OrderInvoice[];
}

const getOrderBillingProgress = (order: Order) => {
  const activeInvoices = (order.invoices || []).filter(
    inv => !['REJECTED', 'VOIDED', 'ANULADO'].includes(String(inv.sunatStatus || '').toUpperCase())
  );
  const orderedByProduct = new Map<number, number>();
  let orderedTotal = 0;

  (order.items || []).forEach(item => {
    const qty = Number(item.quantity || 0);
    orderedTotal += qty;
    if (item.productId) {
      orderedByProduct.set(item.productId, (orderedByProduct.get(item.productId) || 0) + qty);
    }
  });

  if (activeInvoices.length === 0) {
    if (order.voucherNumber) {
      return { status: 'FULL' as const, orderedTotal, invoicedTotal: orderedTotal, remainingTotal: 0, activeInvoices };
    }
    return { status: 'PENDING' as const, orderedTotal, invoicedTotal: 0, remainingTotal: orderedTotal, activeInvoices };
  }

  const invoicedByProduct = new Map<number, number>();
  activeInvoices.forEach(inv => {
    (inv.items || []).forEach(ii => {
      invoicedByProduct.set(ii.productId, (invoicedByProduct.get(ii.productId) || 0) + Number(ii.quantity || 0));
    });
  });

  let invoicedTotal = 0;
  orderedByProduct.forEach((orderedQty, pid) => {
    invoicedTotal += Math.min(orderedQty, invoicedByProduct.get(pid) || 0);
  });

  const remainingTotal = Math.max(0, orderedTotal - invoicedTotal);
  const status = orderedTotal > 0 && remainingTotal <= 0
    ? ('FULL' as const)
    : invoicedTotal > 0
      ? ('PARTIAL' as const)
      : ('PENDING' as const);

  return { status, orderedTotal, invoicedTotal, remainingTotal, activeInvoices };
};

interface OrderModuleProps {
  orders: Order[];
  sellers?: any[];
  onUpdateStatus: (id: number, status: string) => void;
  onDelete: (id: number) => void;
  onViewGuide: (order: Order) => void;
  onViewDetail: (order: Order) => void;
  onEdit: (order: Order) => void;
  onOpenPayment: (order: Order) => void;
  onNewDirectOrder: () => void;
  onCancelDispatch?: (id: number) => void;
  onCancelPayment?: (id: number) => void;
  onGenerateInvoice?: (order: Order) => void;
}

type SortField = 'order' | 'customer' | 'status' | 'voucher' | 'totalAmount' | 'balance';
type SortDirection = 'asc' | 'desc';

export const OrderModule: React.FC<OrderModuleProps> = ({
  orders,
  sellers = [],
  onUpdateStatus,
  onDelete,
  onViewGuide,
  onViewDetail,
  onEdit,
  onOpenPayment,
  onNewDirectOrder,
  onCancelDispatch,
  onCancelPayment,
  onGenerateInvoice
}) => {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission?.('WRITE_ORDERS') || hasPermission?.('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sellerFilter, setSellerFilter] = useState('ALL');
  const [sortField, setSortField] = useState<SortField>('order');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [invoicesModalOrder, setInvoicesModalOrder] = useState<Order | null>(null);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, dateFrom, dateTo, sellerFilter, sortField, sortDirection, pageSize]);

  const sellerOptions = useMemo(() => {
    const names = new Set<string>();
    sellers.forEach((s: any) => {
      if (s?.name) names.add(String(s.name).trim());
    });
    orders.forEach(o => {
      if (o.sellerName) names.add(String(o.sellerName).trim());
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [sellers, orders]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'order' ? 'desc' : 'asc');
    }
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />;
    return sortDirection === 'asc'
      ? <ArrowUp className="w-3.5 h-3.5 text-[#004A99]" />
      : <ArrowDown className="w-3.5 h-3.5 text-[#004A99]" />;
  };

  const hasActiveFilters = Boolean(searchTerm || dateFrom || dateTo || sellerFilter !== 'ALL');

  const clearFilters = () => {
    setSearchTerm('');
    setDateFrom('');
    setDateTo('');
    setSellerFilter('ALL');
  };

  const getOrderBalance = (order: Order) => {
    const totalPaid = order.payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
    return Math.max(0, Number(order.totalAmount) - totalPaid);
  };

  const filteredOrders = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    const list = orders.filter(o => {
      const orderCode = `#ped-${o.docSeries || ''}${o.docNumber ? `-${o.docNumber}` : o.id}`.toLowerCase();
      const shortCode = `${o.docSeries || ''}-${o.docNumber || ''}`.toLowerCase();
      const matchesSearch = !term ||
        o.customerName.toLowerCase().includes(term) ||
        (o.customerDocNumber || '').toLowerCase().includes(term) ||
        o.id.toString().includes(term) ||
        (o.docNumber || '').toLowerCase().includes(term) ||
        shortCode.includes(term) ||
        orderCode.includes(term) ||
        (o.voucherNumber || '').toLowerCase().includes(term);
      if (!matchesSearch) return false;

      const itemDate = o.createdAt ? new Date(o.createdAt).toISOString().split('T')[0] : '';
      if (dateFrom && (!itemDate || itemDate < dateFrom)) return false;
      if (dateTo && (!itemDate || itemDate > dateTo)) return false;

      if (sellerFilter !== 'ALL') {
        const oSeller = (o.sellerName || '').trim().toLowerCase();
        if (oSeller !== sellerFilter.toLowerCase()) return false;
      }

      return true;
    });

    return [...list].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'order') {
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        if (comparison === 0) comparison = a.id - b.id;
      } else if (sortField === 'customer') {
        comparison = (a.customerName || '').toLowerCase().localeCompare((b.customerName || '').toLowerCase());
      } else if (sortField === 'status') {
        comparison = `${a.paymentStatus}-${a.status}`.localeCompare(`${b.paymentStatus}-${b.status}`);
      } else if (sortField === 'voucher') {
        comparison = (a.voucherNumber || '').toLowerCase().localeCompare((b.voucherNumber || '').toLowerCase());
      } else if (sortField === 'totalAmount') {
        comparison = Number(a.totalAmount || 0) - Number(b.totalAmount || 0);
      } else if (sortField === 'balance') {
        comparison = getOrderBalance(a) - getOrderBalance(b);
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [orders, searchTerm, dateFrom, dateTo, sellerFilter, sortField, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedOrders = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, safePage, pageSize]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 6 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.16, ease: 'easeOut' }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-3 justify-between items-start md:items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Pedidos</h2>
          <p className="text-[11px] font-bold text-[#004A99] uppercase tracking-wider">Gestión de Órdenes, Cobros y Despachos</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <Clock className="w-3.5 h-3.5" />
            Últimos 30 días
          </div>
          {canWrite ? (
            <button 
              onClick={onNewDirectOrder}
              className="h-9 bg-[#004A99] hover:bg-[#003B7A] text-white px-4 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors duration-150 shadow-2xs whitespace-nowrap"
            >
              <ShoppingCart className="w-4 h-4" />
              Nuevo Pedido Directo
            </button>
          ) : (
            <div className="h-9 flex items-center gap-2 bg-slate-100 text-slate-500 px-4 rounded-lg text-sm font-semibold cursor-not-allowed whitespace-nowrap">
              <Lock className="w-4 h-4" />
              Nuevo Pedido Directo
            </div>
          )}
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 items-end">
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1">Nro. Pedido / Cliente / Comprobante</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text"
                placeholder="Buscar pedido, cliente, RUC/DNI o comprobante..."
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

          <div className="sm:col-span-2 flex items-end gap-2">
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

      {/* Grid List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200">
                <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 whitespace-nowrap">
                  <button type="button" onClick={() => handleSort('order')} className="inline-flex items-center gap-1 hover:text-[#004A99]">
                    Pedido {renderSortIcon('order')}
                  </button>
                </th>
                <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 min-w-[160px]">
                  <button type="button" onClick={() => handleSort('customer')} className="inline-flex items-center gap-1 hover:text-[#004A99]">
                    Cliente {renderSortIcon('customer')}
                  </button>
                </th>
                <th className="px-2.5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 text-center whitespace-nowrap">Condición</th>
                <th className="px-2.5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 whitespace-nowrap">
                  <button type="button" onClick={() => handleSort('status')} className="inline-flex items-center gap-1 hover:text-[#004A99]">
                    Pago / Envío {renderSortIcon('status')}
                  </button>
                </th>
                <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 whitespace-nowrap">
                  <button type="button" onClick={() => handleSort('voucher')} className="inline-flex items-center gap-1 hover:text-[#004A99]">
                    Comprobante {renderSortIcon('voucher')}
                  </button>
                </th>
                <th className="px-2.5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 text-center whitespace-nowrap">Facturación</th>
                <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 text-right whitespace-nowrap">
                  <button type="button" onClick={() => handleSort('totalAmount')} className="inline-flex items-center gap-1 hover:text-[#004A99]">
                    Total {renderSortIcon('totalAmount')}
                  </button>
                </th>
                <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 text-right whitespace-nowrap">
                  <button type="button" onClick={() => handleSort('balance')} className="inline-flex items-center gap-1 hover:text-[#004A99]">
                    Saldo {renderSortIcon('balance')}
                  </button>
                </th>
                <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 text-right whitespace-nowrap">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedOrders.length > 0 ? paginatedOrders.map((order) => {
                const totalPaid = order.payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
                const balance = Math.max(0, Number(order.totalAmount) - totalPaid);
                const hasPayments = order.paymentStatus === 'PAID' || totalPaid > 0;
                const isDispatchedOrBeyond = ['DISPATCHED', 'SHIPPED', 'DELIVERED'].includes(order.status);
                const isAnnulled = order.status === 'ANNULLED' || order.status === 'CANCELLED';
                const billing = getOrderBillingProgress(order);
                const isConfirmed = !isAnnulled && (billing.status === 'FULL' || ['DISPATCHED', 'SHIPPED', 'DELIVERED', 'COMPLETED'].includes(order.status));
                const canDeleteOrder = !isAnnulled && !hasPayments && !isDispatchedOrBeyond && billing.activeInvoices.length === 0;
                const rowClass = isAnnulled
                  ? 'bg-red-50/75 hover:bg-red-100/70 transition-colors duration-150 group'
                  : isConfirmed
                    ? 'bg-emerald-50/75 hover:bg-emerald-100/70 transition-colors duration-150 group'
                    : 'hover:bg-blue-50/40 transition-colors duration-150 group';
                return (
                  <tr key={order.id} className={rowClass}>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-mono font-bold text-xs text-slate-900 whitespace-nowrap">#PED-{order.docSeries || ''}{order.docNumber ? `-${order.docNumber}` : order.id}</span>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[10px] text-slate-500 font-medium">{new Date(order.createdAt).toLocaleDateString()}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                            (order as any).origin === 'WEB' 
                              ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}>
                            {(order as any).origin || 'ADMIN'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col">
                        <span className="font-semibold text-xs text-slate-800 leading-tight">{order.customerName}</span>
                        <span className="font-mono text-[10px] text-slate-500 font-medium tracking-wide">{order.customerDocNumber || 'S/D'}</span>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Truck className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="text-[10px] text-slate-500 font-medium">{order.agency?.name || 'Recojo en tienda'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-2.5 py-3 text-center whitespace-nowrap">
                      {(() => {
                        const cond = String((order as any).paymentCondition || 'CONTADO').toUpperCase();
                        const isCredit = cond.includes('CRED');
                        return (
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                            isCredit
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>
                            {cond}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-2.5 py-3 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <span className={`w-fit px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                          order.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {order.paymentStatus === 'PAID' ? 'Pagado' : 'Pendiente Pago'}
                        </span>
                        <span className={`w-fit px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                          isAnnulled ? 'bg-red-100 text-red-700 border border-red-200' :
                          order.status === 'SHIPPED' ? 'bg-blue-100 text-blue-700' : 
                          order.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {isAnnulled ? 'Anulado' :
                           order.status === 'SHIPPED' ? 'En camino' : 
                           order.status === 'DELIVERED' ? 'Entregado' : 'Procesando'}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {billing.activeInvoices.length > 0 ? (
                        <div className="flex flex-col gap-0.5">
                          {billing.activeInvoices.slice(0, 2).map(inv => (
                            <span key={inv.id} className="font-mono font-bold text-slate-800 text-[11px] flex items-center gap-1 whitespace-nowrap">
                              <Receipt className="w-3 h-3 text-blue-600 shrink-0" />
                              {inv.numberFormatted}
                            </span>
                          ))}
                          {billing.activeInvoices.length > 2 ? (
                            <button
                              type="button"
                              onClick={() => setInvoicesModalOrder(order)}
                              className="text-[10px] font-bold text-[#004A99] hover:text-blue-800 underline underline-offset-2 cursor-pointer text-left w-fit mt-0.5"
                              title={`Ver los ${billing.activeInvoices.length} comprobantes generados`}
                            >
                              (más... {billing.activeInvoices.length} comprobantes)
                            </button>
                          ) : (
                            <span className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">
                              {billing.activeInvoices.length > 1 ? `${billing.activeInvoices.length} COMPROBANTES` : 'GENERADO'}
                            </span>
                          )}
                        </div>
                      ) : order.voucherNumber ? (
                        <div className="flex flex-col">
                          <span className="font-mono font-bold text-slate-800 text-[11px] flex items-center gap-1 whitespace-nowrap">
                            <Receipt className="w-3 h-3 text-blue-600 shrink-0" />
                            {order.voucherNumber}
                          </span>
                          <span className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">GENERADO</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-semibold italic">Sin comprobante</span>
                      )}
                    </td>
                    <td className="px-2.5 py-3 text-center whitespace-nowrap">
                      {billing.status === 'FULL' ? (
                        <div className="inline-flex flex-col items-center">
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-100 text-emerald-700 border border-emerald-200">
                            Facturado
                          </span>
                        </div>
                      ) : billing.status === 'PARTIAL' ? (
                        <div className="inline-flex flex-col items-center gap-0.5">
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-300">
                            Parcial ({billing.invoicedTotal}/{billing.orderedTotal})
                          </span>
                          <span className="text-[9px] font-bold text-amber-700">
                            Pend. por facturar: {billing.remainingTotal}
                          </span>
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-slate-100 text-slate-600 border border-slate-200">
                          Pend. por facturar
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right whitespace-nowrap">
                      <span className="font-black text-xs text-slate-900 whitespace-nowrap">{formatCurrency(order.totalAmount)}</span>
                    </td>
                    <td className="px-3 py-3 text-right whitespace-nowrap">
                      <span className={`inline-block font-bold text-[11px] px-2 py-0.5 rounded-lg border whitespace-nowrap ${
                        balance === 0 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {formatCurrency(balance)}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                    <div className="flex justify-end gap-1.5">
                      <button 
                        onClick={() => onViewDetail(order)}
                        className="p-2.5 bg-sky-50 text-sky-600 rounded-xl hover:bg-sky-600 hover:text-white transition-all shadow-sm"
                        title="Ver Detalle"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => window.open(`https://wa.me/${order.customerPhone}`, '_blank')}
                        className="p-2.5 bg-green-50 text-green-600 rounded-xl hover:bg-green-600 hover:text-white transition-all shadow-sm"
                        title="Contactar WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                      {canWrite && !isAnnulled && (
                        <>
                          {order.status === 'DISPATCHED' && onCancelDispatch && (
                            <button 
                              onClick={() => onCancelDispatch(order.id)}
                              className="p-2.5 bg-orange-50 text-orange-600 rounded-xl hover:bg-orange-600 hover:text-white transition-all shadow-sm"
                              title="Anular Despacho"
                            >
                              <Undo2 className="w-4 h-4" />
                            </button>
                          )}
                          {onGenerateInvoice && (
                            ['PREPARING', 'DISPATCHED', 'SHIPPED', 'DELIVERED'].includes(order.status) ||
                            (!isAnnulled && String((order as any).paymentCondition || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().includes('CRED')) ||
                            billing.status === 'PARTIAL'
                          ) && (
                            billing.status === 'FULL' ? (
                              <span className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl text-[9px] font-black" title={`Facturado completamente: ${order.voucherNumber || ''}`}>
                                <FileText className="w-4 h-4" />
                              </span>
                            ) : (
                              <button 
                                onClick={() => onGenerateInvoice(order)}
                                className={`p-2.5 rounded-xl transition-all shadow-sm ${
                                  billing.status === 'PARTIAL'
                                    ? 'bg-amber-50 text-amber-700 hover:bg-amber-600 hover:text-white ring-1 ring-amber-200'
                                    : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white'
                                }`}
                                title={billing.status === 'PARTIAL' ? `Facturar saldo pendiente (${billing.remainingTotal} rest.)` : 'Generar Comprobante'}
                              >
                                <Receipt className="w-4 h-4" />
                              </button>
                            )
                          )}
                          <button 
                            onClick={() => onOpenPayment(order)}
                            className="p-2.5 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-600 hover:text-white transition-all shadow-sm"
                            title="Registrar Cobro"
                          >
                            <DollarSign className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      <button 
                        onClick={() => onViewGuide(order)}
                        className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                        title="Ver Guía"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                      {canWrite && !isAnnulled && (
                        <>
                          {order.paymentStatus === 'PAID' || ['DISPATCHED','SHIPPED','DELIVERED'].includes(order.status) ? (
                            <span className="relative group/btn">
                              <button 
                                disabled
                                className="p-2.5 bg-slate-100 text-slate-300 rounded-xl cursor-not-allowed shadow-sm"
                              >
                                <Lock className="w-4 h-4" />
                              </button>
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/btn:block z-50 pointer-events-none">
                                <div className="bg-slate-900 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-xl whitespace-nowrap">
                                  {order.status === 'DISPATCHED' || order.status === 'SHIPPED' || order.status === 'DELIVERED'
                                    ? 'Anule el despacho y el cobro para editar'
                                    : 'Anule el cobro para editar'}
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900" />
                                </div>
                              </div>
                            </span>
                          ) : (
                            <button 
                              onClick={() => onEdit(order)}
                              className="p-2.5 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          {canDeleteOrder ? (
                            <button 
                              onClick={() => onDelete(order.id)}
                              className="p-2.5 text-slate-300 hover:text-red-500 transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <span className="relative group/btn">
                              <button 
                                disabled
                                className="p-2.5 text-slate-200 cursor-not-allowed"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                              <div className="absolute bottom-full right-0 mb-2 hidden group-hover/btn:block z-50 pointer-events-none">
                                <div className="bg-slate-900 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-xl whitespace-nowrap">
                                  {hasPayments 
                                    ? 'Anule el cobro para poder eliminar' 
                                    : 'Anule el despacho para poder eliminar'}
                                  <div className="absolute top-full right-3 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900" />
                                </div>
                              </div>
                            </span>
                          )}
                        </>
                      )}
                      {!canWrite && <Lock className="w-4 h-4 text-slate-300" />}
                    </div>
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={9} className="px-6 py-16 text-center text-sm font-semibold text-slate-400">
                  No se encontraron pedidos con los filtros seleccionados
                </td>
              </tr>
            )}
          </tbody>
          </table>
        </div>
        {filteredOrders.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-slate-50/80 border-t border-slate-200 text-xs">
            <div className="flex items-center gap-3 text-slate-600 font-medium tabular-nums">
              <span>
                Mostrando <strong className="text-slate-900">{(safePage - 1) * pageSize + 1}</strong>–<strong className="text-slate-900">{Math.min(safePage * pageSize, filteredOrders.length)}</strong> de <strong className="text-slate-900">{filteredOrders.length}</strong> registros
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

      {/* Modal: Listado completo de comprobantes del pedido */}
      {invoicesModalOrder && (() => {
        const modalBilling = getOrderBillingProgress(invoicesModalOrder);
        return (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden">
              <div className="px-5 py-3.5 bg-[#004A99] text-white flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-tight">
                    Comprobantes del Pedido #PED-{invoicesModalOrder.docSeries || ''}{invoicesModalOrder.docNumber ? `-${invoicesModalOrder.docNumber}` : invoicesModalOrder.id}
                  </h3>
                  <p className="text-[11px] text-blue-200 font-medium">{invoicesModalOrder.customerName}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setInvoicesModalOrder(null)}
                  className="p-1.5 hover:bg-white/10 rounded-lg cursor-pointer"
                  aria-label="Cerrar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 max-h-96 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-600">
                      <th className="px-3 py-2">Comprobante</th>
                      <th className="px-3 py-2">Fecha</th>
                      <th className="px-3 py-2 text-center">Estado SUNAT</th>
                      <th className="px-3 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {modalBilling.activeInvoices.map(inv => (
                      <tr key={inv.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2.5 font-mono font-bold text-[#004A99]">
                          <div className="flex items-center gap-1.5">
                            <Receipt className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span>{inv.numberFormatted}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-slate-600 font-mono">
                          {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString('es-PE') : '-'}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                            inv.sunatStatus === 'ACCEPTED'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {inv.sunatStatus || 'PENDIENTE'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right font-bold text-slate-900 tabular-nums">
                          {formatCurrency(Number(inv.totalAmount || 0))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-600">
                  Total comprobantes: {modalBilling.activeInvoices.length}
                </span>
                <button
                  type="button"
                  onClick={() => setInvoicesModalOrder(null)}
                  className="px-4 py-1.5 bg-[#004A99] hover:bg-blue-800 text-white font-bold rounded-lg cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </motion.div>
  );
};
