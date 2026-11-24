import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { motion } from 'motion/react';
import {
  BarChart3,
  Package,
  AlertTriangle,
  Star,
  CheckCircle,
  PackageSearch,
  Clock,
  Truck,
  FileText,
  RefreshCw,
  Calendar,
  ArrowRight,
  Target,
  Users,
  DollarSign,
  ClipboardList,
  TrendingUp,
  TrendingDown,
  Warehouse
} from 'lucide-react';
import { formatNumber, formatCurrency } from '../../lib/utils';

interface DashboardModuleProps {
  stats: any;
  token?: string | null;
  onNavigate: (view: string, label?: string) => void;
}

const WAREHOUSE_STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'Pendiente', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  IN_PICKING: { label: 'En Preparación', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  PICKED: { label: 'Preparado', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

export const DashboardModule: React.FC<DashboardModuleProps> = ({ stats, token, onNavigate }) => {
  const [summary, setSummary] = useState<any>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const fetchSummary = async (monthOverride?: string) => {
    if (!token) return;
    setLoadingSummary(true);
    try {
      const targetMonth = monthOverride || selectedMonth;
      const res = await axios.get('/api/dashboard/summary', {
        params: { month: targetMonth },
        headers: { Authorization: `Bearer ${token}` },
      });
      setSummary(res.data);
    } catch (err) {
      console.error('Error fetching dashboard summary:', err);
    } finally {
      setLoadingSummary(false);
    }
  };

  useEffect(() => {
    fetchSummary(selectedMonth);
  }, [token, selectedMonth]);

  // --- FASE 2: DASHBOARD DE ALMACÉN (PICKING Y DESPACHO) ---
  if (summary?.roleProfile === 'WAREHOUSE') {
    const wh = summary.warehouse || {};
    const recentOrders: any[] = wh.recentPickingOrders || [];
    const lowStock: any[] = wh.lowStockItems || [];
    const expiringLots: any[] = wh.expiringLots || [];

    return (
      <motion.div
        key="dashboard-warehouse"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="space-y-6"
      >
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-[#004A99] rounded-xl border border-blue-100">
              <PackageSearch className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 uppercase tracking-tight">
                Panel de Almacén y Picking
              </h2>
              <p className="text-xs text-slate-500">
                Operario: <span className="font-bold text-slate-700">{summary.userName}</span> • Sede:{' '}
                <span className="font-bold text-[#004A99]">{summary.warehouseName || 'MULTISEDE'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchSummary()}
              disabled={loadingSummary}
              className="h-9 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingSummary ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
            <button
              type="button"
              onClick={() => onNavigate('picking', 'Picking / Almacén')}
              className="h-9 px-4 bg-[#004A99] hover:bg-blue-800 text-white rounded-lg text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <PackageSearch className="w-4 h-4" />
              Ir a Picking
            </button>
            <button
              type="button"
              onClick={() => onNavigate('referral-guides', 'Guías de Remisión')}
              className="h-9 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileText className="w-4 h-4 text-[#004A99]" />
              Guías
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white p-5 rounded-xl border border-amber-200 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Pendientes Picking</p>
              <div className="w-8 h-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900 tabular-nums">{wh.pendingPicking || 0}</p>
            <p className="text-[11px] text-slate-500 mt-1">Por asignar / iniciar</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-blue-200 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-blue-700">En Preparación</p>
              <div className="w-8 h-8 bg-blue-50 text-[#004A99] rounded-lg flex items-center justify-center">
                <Package className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900 tabular-nums">{wh.inPicking || 0}</p>
            <p className="text-[11px] text-slate-500 mt-1">Armando pedidos</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-emerald-200 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Preparados</p>
              <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900 tabular-nums">{wh.preparedPicking || 0}</p>
            <p className="text-[11px] text-slate-500 mt-1">Listos para despacho</p>
          </div>

          <div className="bg-[#004A99] p-5 rounded-xl text-white border border-blue-900 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-blue-100">Despachados Hoy</p>
              <div className="w-8 h-8 bg-white/10 text-white rounded-lg flex items-center justify-center">
                <Truck className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-bold tabular-nums">{wh.dispatchedToday || 0}</p>
            <p className="text-[11px] text-blue-100 mt-1">Entregas del día</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Guías x Enviar SUNAT</p>
              <div className="w-8 h-8 bg-slate-100 text-slate-700 rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900 tabular-nums">{wh.pendingGuidesSunat || 0}</p>
            <p className="text-[11px] text-slate-500 mt-1">Pendientes / con observación</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight flex items-center gap-2">
                <PackageSearch className="w-4 h-4 text-[#004A99]" />
                Pedidos en Bandeja de Picking
              </h3>
              <button
                type="button"
                onClick={() => onNavigate('picking', 'Picking / Almacén')}
                className="text-xs font-bold text-[#004A99] hover:underline flex items-center gap-1 cursor-pointer"
              >
                Ver todos <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                    <th className="py-2 pr-3">Pedido</th>
                    <th className="py-2 pr-3">Cliente</th>
                    <th className="py-2 pr-3 text-center">Ítems</th>
                    <th className="py-2 pr-3">Operario</th>
                    <th className="py-2 text-right">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentOrders.map((ord) => {
                    const badge = WAREHOUSE_STATUS_BADGE[ord.warehouseStatus] || {
                      label: ord.warehouseStatus || '—',
                      cls: 'bg-slate-100 text-slate-600 border-slate-200',
                    };
                    return (
                      <tr key={ord.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 pr-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                          #PED-{ord.docSeries || ''}{ord.docNumber ? `-${ord.docNumber}` : ord.id}
                        </td>
                        <td className="py-2.5 pr-3 font-semibold text-slate-700 truncate max-w-48">
                          {ord.customerName}
                        </td>
                        <td className="py-2.5 pr-3 text-center font-bold text-slate-600">
                          {ord._count?.items || 0}
                        </td>
                        <td className="py-2.5 pr-3 text-slate-600">
                          {ord.picker?.name || <span className="text-slate-400 italic">Sin asignar</span>}
                        </td>
                        <td className="py-2.5 text-right">
                          <span className={`inline-block px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase ${badge.cls}`}>
                            {badge.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {recentOrders.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                        No hay pedidos pendientes en picking.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-tight flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Stock Bajo (≤ 5 un.)
                </h3>
                <button
                  type="button"
                  onClick={() => onNavigate('inventory', 'Inventario / Stock')}
                  className="text-[11px] font-bold text-[#004A99] hover:underline cursor-pointer"
                >
                  Inventario
                </button>
              </div>
              <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                {lowStock.map((st) => (
                  <div key={st.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-amber-50/50 border border-amber-100 text-xs">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 truncate">{st.product?.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        {st.product?.code} {st.lotNumber ? `• Lote: ${st.lotNumber}` : ''}
                      </p>
                    </div>
                    <span className="font-black text-amber-700 shrink-0 tabular-nums">{st.quantity}</span>
                  </div>
                ))}
                {lowStock.length === 0 && (
                  <p className="text-xs text-slate-400 italic text-center py-4">Sin alertas de stock bajo.</p>
                )}
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-tight flex items-center gap-1.5 mb-3">
                <Calendar className="w-4 h-4 text-red-500" />
                Lotes Próximos a Vencer (45 días)
              </h3>
              <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                {expiringLots.map((st) => (
                  <div key={st.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-red-50/50 border border-red-100 text-xs">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 truncate">{st.product?.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        Lote: {st.lotNumber || 'S/L'} • Stock: {st.quantity}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-red-700 shrink-0">
                      {st.expiryDate ? new Date(st.expiryDate).toLocaleDateString('es-PE', { timeZone: 'UTC' }) : '—'}
                    </span>
                  </div>
                ))}
                {expiringLots.length === 0 && (
                  <p className="text-xs text-slate-400 italic text-center py-4">Sin lotes próximos a vencer.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // --- FASE 3: DASHBOARD DE VENDEDOR ---
  if (summary?.roleProfile === 'SELLER') {
    const sel = summary.seller || {};
    const quota = Number(summary.monthlyQuota || 0);
    const sales = Number(sel.monthSalesAmount || 0);
    const pct = Number(sel.quotaProgressPct || 0);
    const remainingQuota = Math.max(0, quota - sales);
    const unpaidOrders: any[] = sel.unpaidOrders || [];
    const topClients: any[] = sel.topClients || [];
    const topProducts: any[] = sel.topProducts || [];

    return (
      <motion.div
        key="dashboard-seller"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="space-y-6"
      >
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-[#004A99] rounded-xl border border-blue-100">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 uppercase tracking-tight">
                Mi Panel Comercial
              </h2>
              <p className="text-xs text-slate-500">
                Vendedor: <span className="font-bold text-slate-700">{summary.sellerName || summary.userName}</span>
                {summary.warehouseName && (
                  <> • Sede: <span className="font-bold text-[#004A99]">{summary.warehouseName}</span></>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="h-9 px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-[#004A99]"
            />
            <button
              type="button"
              onClick={() => fetchSummary()}
              disabled={loadingSummary}
              className="h-9 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingSummary ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
            <button
              type="button"
              onClick={() => onNavigate('quotations', 'Cotizaciones')}
              className="h-9 px-4 bg-[#004A99] hover:bg-blue-800 text-white rounded-lg text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <ClipboardList className="w-4 h-4" />
              Cotizaciones
            </button>
            <button
              type="button"
              onClick={() => onNavigate('orders', 'Pedidos')}
              className="h-9 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Package className="w-4 h-4 text-[#004A99]" />
              Pedidos
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-[#004A99]" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Avance de Cuota Mensual
              </span>
            </div>
            <div className="text-xs font-bold text-slate-700 tabular-nums">
              {quota > 0 ? (
                <>
                  <span className="text-[#004A99]">{formatCurrency(sales)}</span> / {formatCurrency(quota)}{' '}
                  <span className={`ml-1 px-2 py-0.5 rounded-full text-[11px] ${pct >= 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-50 text-[#004A99]'}`}>
                    {pct}%
                  </span>
                </>
              ) : (
                <span className="text-slate-400 italic font-medium">Sin cuota mensual configurada</span>
              )}
            </div>
          </div>

          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(pct, 100)}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className={`h-full rounded-full ${pct >= 100 ? 'bg-emerald-500' : 'bg-[#004A99]'}`}
            />
          </div>

          {quota > 0 && (
            <p className="text-[11px] text-slate-500 mt-2">
              {remainingQuota > 0
                ? <>Te faltan <span className="font-bold text-slate-700">{formatCurrency(remainingQuota)}</span> para alcanzar tu meta del mes.</>
                : <span className="font-bold text-emerald-600">¡Meta mensual alcanzada!</span>}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#004A99] p-5 rounded-xl text-white border border-blue-900 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-blue-100">Mis Ventas del Mes</p>
              <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold tabular-nums">{formatCurrency(sales)}</p>
            <p className="text-[11px] text-blue-100 mt-1">Acumulado del mes actual</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Pedidos Atendidos</p>
              <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900 tabular-nums">{sel.monthOrdersCount || 0}</p>
            <p className="text-[11px] text-slate-500 mt-1">Confirmados en el mes</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Cotizaciones Abiertas</p>
              <div className="w-8 h-8 bg-blue-50 text-[#004A99] rounded-lg flex items-center justify-center">
                <ClipboardList className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900 tabular-nums">{sel.openQuotationsCount || 0}</p>
            <p className="text-[11px] text-slate-500 mt-1">Pendientes por cerrar</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-amber-200 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Pedidos Sin Cobrar</p>
              <div className="w-8 h-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900 tabular-nums">{sel.unpaidOrdersCount || 0}</p>
            <p className="text-[11px] text-amber-700 font-bold mt-1">
              Saldo: {formatCurrency(sel.unpaidTotalBalance || 0)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-amber-600" />
                Pedidos Pendientes de Cobro
              </h3>
              <button
                type="button"
                onClick={() => onNavigate('orders', 'Pedidos')}
                className="text-xs font-bold text-[#004A99] hover:underline flex items-center gap-1 cursor-pointer"
              >
                Ir a Pedidos <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                    <th className="py-2 pr-3">Pedido</th>
                    <th className="py-2 pr-3">Cliente</th>
                    <th className="py-2 pr-3 text-right">Total</th>
                    <th className="py-2 pr-3 text-right">Saldo</th>
                    <th className="py-2 text-right">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {unpaidOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 pr-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                        #PED-{ord.docSeries || ''}{ord.docNumber ? `-${ord.docNumber}` : ord.id}
                      </td>
                      <td className="py-2.5 pr-3 font-semibold text-slate-700 truncate max-w-48">
                        {ord.customerName}
                      </td>
                      <td className="py-2.5 pr-3 text-right font-mono text-slate-600 tabular-nums">
                        {formatCurrency(ord.totalAmount)}
                      </td>
                      <td className="py-2.5 pr-3 text-right font-mono font-bold text-amber-700 tabular-nums">
                        {formatCurrency(ord.balance)}
                      </td>
                      <td className="py-2.5 text-right">
                        <span className={`inline-block px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase ${ord.paymentStatus === 'PARTIAL' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                          {ord.paymentStatus === 'PARTIAL' ? 'Parcial' : 'Sin Cobrar'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {unpaidOrders.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                        No tienes pedidos pendientes de cobro.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-tight flex items-center gap-1.5 mb-3">
                <Users className="w-4 h-4 text-[#004A99]" />
                Mis Top 5 Clientes (Mes)
              </h3>
              <div className="space-y-2">
                {topClients.map((c, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 truncate">{c.name}</p>
                      <p className="text-[10px] text-slate-500">{c.orders} pedido(s)</p>
                    </div>
                    <span className="font-bold text-[#004A99] shrink-0 tabular-nums">{formatCurrency(c.total)}</span>
                  </div>
                ))}
                {topClients.length === 0 && (
                  <p className="text-xs text-slate-400 italic text-center py-4">Sin ventas registradas este mes.</p>
                )}
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-tight flex items-center gap-1.5 mb-3">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                Mis Top 5 Productos (Mes)
              </h3>
              <div className="space-y-2">
                {topProducts.map((p, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 truncate">{p.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        {p.code} • {formatNumber(p.quantity, 0)} un.
                      </p>
                    </div>
                    <span className="font-bold text-slate-800 shrink-0 tabular-nums">{formatCurrency(p.total)}</span>
                  </div>
                ))}
                {topProducts.length === 0 && (
                  <p className="text-xs text-slate-400 italic text-center py-4">Sin productos vendidos este mes.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // --- FASE 4: DASHBOARD GERENCIAL / ADMINISTRADOR ---
  const adm = summary?.admin || {};
  const monthRevenue = adm.monthRevenue ?? (stats?.totalRevenue || 0);
  const monthOrdersCount = adm.monthOrdersCount ?? (stats?.totalOrders || 0);
  const avgTicket = adm.avgTicket ?? (monthOrdersCount > 0 ? monthRevenue / monthOrdersCount : 0);
  const momPct: number | null = adm.momGrowthPct ?? null;
  const yoyPct: number | null = adm.yoyGrowthPct ?? null;
  const adminTopProducts: any[] = adm.topProducts || stats?.topProducts || [];
  const sellerRanking: any[] = adm.sellerRanking || [];
  const stagnantProducts: any[] = adm.stagnantProducts || [];
  const warehouseValuation: any[] = adm.inventoryValuationByWarehouse || [];
  const monthlyComparison: any[] = adm.monthlyComparison || [];
  const selectedYear = summary?.selectedYear || new Date().getFullYear();
  const maxChartValue = Math.max(
    1,
    ...monthlyComparison.map((m) => Math.max(Number(m.currentYear || 0), Number(m.prevYear || 0)))
  );

  return (
    <motion.div
      key="dashboard-admin"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="space-y-6"
    >
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-[#004A99] rounded-xl border border-blue-100">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 uppercase tracking-tight">
              Panel Gerencial y Dirección
            </h2>
            <p className="text-xs text-slate-500">
              Comparativa de ventas, desempeño comercial, inventario detenido y cuentas por cobrar.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="h-9 px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-[#004A99]"
          />
          <button
            type="button"
            onClick={() => fetchSummary()}
            disabled={loadingSummary}
            className="h-9 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingSummary ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
          <button
            type="button"
            onClick={() => onNavigate('orders', 'Pedidos')}
            className="h-9 px-3.5 bg-[#004A99] hover:bg-blue-800 text-white rounded-lg text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Package className="w-4 h-4" />
            Pedidos
          </button>
          <button
            type="button"
            onClick={() => onNavigate('payments', 'Cobros y Adelantos')}
            className="h-9 px-3.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <DollarSign className="w-4 h-4 text-emerald-600" />
            Cobros
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#004A99] p-5 rounded-xl text-white border border-blue-900 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-blue-100">Ventas del Mes</p>
            <div className="p-2 bg-white/10 rounded-lg">
              <BarChart3 className="w-4 h-4 text-blue-100" />
            </div>
          </div>
          <p className="text-2xl font-bold tracking-tight tabular-nums">{formatCurrency(monthRevenue)}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-bold">
            {momPct !== null && (
              <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full ${momPct >= 0 ? 'bg-emerald-500/20 text-emerald-200' : 'bg-red-500/20 text-red-200'}`}>
                {momPct >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {momPct >= 0 ? '+' : ''}{momPct}% vs mes ant.
              </span>
            )}
            {yoyPct !== null && (
              <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full ${yoyPct >= 0 ? 'bg-emerald-500/20 text-emerald-200' : 'bg-red-500/20 text-red-200'}`}>
                {yoyPct >= 0 ? '+' : ''}{yoyPct}% vs año ant.
              </span>
            )}
            {momPct === null && yoyPct === null && (
              <span className="text-blue-200 font-normal">Mes ant: {formatCurrency(adm.prevMonthRevenue || 0)}</span>
            )}
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-amber-200 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Cuentas por Cobrar</p>
            <div className="w-8 h-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 tabular-nums">{formatCurrency(adm.receivablesBalance || 0)}</p>
          <p className="text-[11px] text-amber-700 font-semibold mt-2">
            {adm.receivablesCount || 0} pedido(s) con saldo pendiente
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Valorización Inventario</p>
            <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
              <Warehouse className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 tabular-nums">{formatCurrency(adm.totalInventoryValue || 0)}</p>
          <p className="text-[11px] text-slate-500 mt-2">
            Costo total en stock • {adm.lowStockCount || 0} con stock bajo
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Pedidos del Mes</p>
            <div className="w-8 h-8 bg-blue-50 text-[#004A99] rounded-lg flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 tabular-nums">{monthOrdersCount}</p>
          <p className="text-[11px] text-slate-500 mt-2">
            Ticket promedio: <span className="font-bold text-slate-700">{formatCurrency(avgTicket)}</span>
          </p>
        </div>
      </div>

      {/* Gráfico Comparativo Mensual: Año Actual vs Año Anterior */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#004A99]" />
            Comparativa de Ventas Mensuales ({selectedYear} vs {selectedYear - 1})
          </h3>
          <div className="flex items-center gap-4 text-[11px] font-bold">
            <span className="flex items-center gap-1.5 text-slate-700">
              <span className="w-3 h-3 rounded-xs bg-[#004A99] inline-block" /> {selectedYear}
            </span>
            <span className="flex items-center gap-1.5 text-slate-500">
              <span className="w-3 h-3 rounded-xs bg-slate-300 inline-block" /> {selectedYear - 1}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-2 items-end h-44 pt-4 border-b border-slate-200 pb-2">
          {monthlyComparison.map((m) => {
            const curH = Math.max(2, Math.round((Number(m.currentYear || 0) / maxChartValue) * 100));
            const prevH = Math.max(2, Math.round((Number(m.prevYear || 0) / maxChartValue) * 100));
            const isSelected = Number(selectedMonth.split('-')[1]) - 1 === m.monthIndex;
            return (
              <div key={m.monthIndex} className="flex flex-col items-center h-full justify-end group relative">
                <div className="w-full flex items-end justify-center gap-1 h-32">
                  <div
                    className="w-2.5 sm:w-3 bg-slate-300 rounded-t transition-all duration-300"
                    style={{ height: `${m.prevYear > 0 ? prevH : 2}%` }}
                    title={`${m.monthLabel} ${selectedYear - 1}: ${formatCurrency(m.prevYear || 0)}`}
                  />
                  <div
                    className={`w-2.5 sm:w-3 rounded-t transition-all duration-300 ${isSelected ? 'bg-emerald-500' : 'bg-[#004A99]'}`}
                    style={{ height: `${m.currentYear > 0 ? curH : 2}%` }}
                    title={`${m.monthLabel} ${selectedYear}: ${formatCurrency(m.currentYear || 0)}`}
                  />
                </div>
                <span className={`text-[10px] mt-1.5 font-bold ${isSelected ? 'text-emerald-700' : 'text-slate-500'}`}>
                  {m.monthLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <Target className="w-4 h-4 text-[#004A99]" />
              Ranking de Vendedores vs Cuota (Mes)
            </h3>
            <button
              type="button"
              onClick={() => onNavigate('sellers', 'Vendedores')}
              className="text-xs font-bold text-[#004A99] hover:underline cursor-pointer"
            >
              Gestionar
            </button>
          </div>
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {sellerRanking.map((s, idx) => (
              <div key={s.id} className="p-3 rounded-lg bg-slate-50 border border-slate-100 space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded bg-[#004A99] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-slate-800 truncate">{s.name}</span>
                    <span className="text-[10px] text-slate-500">({s.ordersCount} ped.)</span>
                  </div>
                  <div className="text-right shrink-0 tabular-nums">
                    <span className="font-bold text-[#004A99]">{formatCurrency(s.salesAmount)}</span>
                    {s.monthlyQuota > 0 && (
                      <span className="text-[10px] text-slate-500 ml-1">/ {formatCurrency(s.monthlyQuota)}</span>
                    )}
                  </div>
                </div>
                {s.monthlyQuota > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${s.progressPct >= 100 ? 'bg-emerald-500' : 'bg-[#004A99]'}`}
                        style={{ width: `${Math.min(s.progressPct, 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-slate-600 tabular-nums w-10 text-right">
                      {s.progressPct}%
                    </span>
                  </div>
                )}
              </div>
            ))}
            {sellerRanking.length === 0 && (
              <div className="py-8 text-center text-xs text-slate-400 italic">No hay vendedores activos registrados.</div>
            )}
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight mb-4 flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            Top 10 Productos Más Vendidos (Mes)
          </h3>
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {adminTopProducts.map((prod: any, i: number) => (
              <div key={i} className="flex items-center gap-3 group">
                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center font-mono text-[11px] font-bold text-slate-600 group-hover:bg-[#004A99] group-hover:text-white transition-colors shrink-0">
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-xs text-slate-800 truncate">{prod.name}</p>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                    <div
                      className="h-full bg-[#004A99]"
                      style={{ width: `${Math.min((prod.total / (adminTopProducts[0]?.total || 1)) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="text-right shrink-0 tabular-nums">
                  <p className="font-bold text-xs text-slate-900">{formatCurrency(prod.total)}</p>
                  <p className="text-[10px] text-slate-500">{formatNumber(prod.quantity, 0)} un.</p>
                </div>
              </div>
            ))}
            {adminTopProducts.length === 0 && (
              <div className="py-8 text-center text-xs text-slate-400 italic">No hay ventas registradas este mes.</div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Productos Sin Movimiento (Últimos 60 días)
            </h3>
            <button
              type="button"
              onClick={() => onNavigate('inventory', 'Inventario / Stock')}
              className="text-xs font-bold text-[#004A99] hover:underline flex items-center gap-1 cursor-pointer"
            >
              Ver Inventario <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                  <th className="py-2 pr-3">Código</th>
                  <th className="py-2 pr-3">Producto</th>
                  <th className="py-2 pr-3 text-right">Stock</th>
                  <th className="py-2 text-right">Capital Inmovilizado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stagnantProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70">
                    <td className="py-2 pr-3 font-mono font-bold text-slate-600 whitespace-nowrap">{p.code}</td>
                    <td className="py-2 pr-3 font-semibold text-slate-800 truncate max-w-64">{p.name}</td>
                    <td className="py-2 pr-3 text-right font-bold text-amber-700 tabular-nums">{formatNumber(p.stock, 0)}</td>
                    <td className="py-2 text-right font-mono font-bold text-slate-800 tabular-nums">
                      {formatCurrency(p.immobilizedValue)}
                    </td>
                  </tr>
                ))}
                {stagnantProducts.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400 italic">
                      Todos los productos con stock tuvieron movimiento en los últimos 60 días.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight mb-4 flex items-center gap-2">
            <Warehouse className="w-4 h-4 text-[#004A99]" />
            Stock Valorizado por Almacén
          </h3>
          <div className="space-y-3">
            {warehouseValuation.map((w, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between gap-2 text-xs">
                <div className="min-w-0">
                  <p className="font-bold text-slate-800 truncate uppercase">{w.name}</p>
                  <p className="text-[10px] text-slate-500">{formatNumber(w.units, 0)} unidades</p>
                </div>
                <span className="font-bold text-[#004A99] shrink-0 tabular-nums">{formatCurrency(w.value)}</span>
              </div>
            ))}
            {warehouseValuation.length === 0 && (
              <p className="text-xs text-slate-400 italic text-center py-6">Sin stock valorizado registrado.</p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
