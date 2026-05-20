import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  PackageSearch, Search, X, Printer, UserCheck,
  CheckCircle2, Truck, Clock, Package, ChevronRight,
  Loader2, Building2, Calendar, MapPin, Phone, FileText, Box, MessageSquareText, ScrollText, Settings2, Plus, Pencil, UserCog
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import PickingTicketPrint from './PickingTicketPrint';

interface PickingOrder {
  id: number;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  customerCity?: string;
  totalAmount: number;
  status: string;
  warehouseStatus: string | null;
  paymentStatus: string;
  paymentCondition: string | null;
  docNumber?: string;
  docSeries?: string;
  docType?: string;
  voucherNumber?: string;
  createdAt: string;
  pickingStartedAt?: string;
  pickerId?: number;
  picker?: { id: number; name: string } | null;
  notes?: string;
  referralGuide?: string;
  carrierGuide?: string;
  items: PickingItem[];
  payments?: { amount: number }[];
  agency?: { id: number; name: string } | null;
}

interface Operator {
  id: number;
  name: string;
  isActive: boolean;
}

interface PickingItem {
  id: number;
  productId: number;
  quantity: number;
  price: number;
  discount: number;
  lotNumber?: string;
  warehouseName?: string;
  product: {
    id: number;
    name: string;
    code?: string;
    unit?: { symbol: string };

  };
}

interface UserOption {
  id: number;
  name: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  PENDING: { label: 'Pendiente', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
  IN_PICKING: { label: 'En Preparación', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: PackageSearch },
  PICKED: { label: 'Preparado', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  DISPATCHED: { label: 'Despachado', color: 'bg-slate-100 text-slate-700 border-slate-200', icon: Truck },
};

export default function WarehousePickingModule() {
  const { token } = useAuth();
  const [orders, setOrders] = useState<PickingOrder[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<PickingOrder | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [printOrder, setPrintOrder] = useState<PickingOrder | null>(null);
  const [activeView, setActiveView] = useState<'tray' | 'operators'>('tray');
  const [operatorName, setOperatorName] = useState('');
  const [editingOperator, setEditingOperator] = useState<Operator | null>(null);
  const [dispatchModal, setDispatchModal] = useState<PickingOrder | null>(null);
  const [referralGuide, setReferralGuide] = useState('');
  const [carrierGuide, setCarrierGuide] = useState('');

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/picking/orders', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setOrders(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchOperators = async () => {
    try {
      const res = await fetch('/api/picking/operators', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setOperators(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveOperator = async () => {
    if (!operatorName.trim()) return;
    try {
      const url = editingOperator
        ? `/api/picking/operators/${editingOperator.id}`
        : '/api/picking/operators';
      const method = editingOperator ? 'PUT' : 'POST';
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: operatorName.trim() })
      });
      setOperatorName('');
      setEditingOperator(null);
      fetchOperators();
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleOperator = async (op: Operator) => {
    await fetch(`/api/picking/operators/${op.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ isActive: !op.isActive })
    });
    fetchOperators();
  };

  useEffect(() => {
    fetchOperators();
    fetchOrders();
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  const activeOperators = operators.filter(o => o.isActive);

  const handleAssign = async (pickerId: number) => {
    if (!selectedOrder) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/picking/${selectedOrder.id}/assign`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ pickerId })
      });
      if (res.ok) {
        const updated = await res.json();
        setOrders(prev => prev.map(o => o.id === updated.id ? { ...o, ...updated } : o));
        setSelectedOrder(prev => prev ? { ...prev, ...updated } : null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePrepare = async () => {
    if (!selectedOrder) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/picking/${selectedOrder.id}/prepare`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchOrders();
        setSelectedOrder(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePrint = (order: PickingOrder) => {
    setPrintOrder(order);
    setTimeout(() => setPrintOrder(null), 500);
  };

  const openDispatchModal = (order: PickingOrder) => {
    setReferralGuide(order.referralGuide || '');
    setCarrierGuide(order.carrierGuide || '');
    setDispatchModal(order);
  };

  const handleDispatch = async () => {
    if (!dispatchModal) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/picking/${dispatchModal.id}/dispatch`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ referralGuide, carrierGuide })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al despachar');
      }
      fetchOrders();
      setDispatchModal(null);
    } catch (e: any) {
      alert(e.message || 'Error al despachar');
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = orders.filter(o => {
    const matchesSearch = !search ||
      o.id.toString().includes(search) ||
      o.customerName?.toLowerCase().includes(search.toLowerCase()) ||
      o.docNumber?.toLowerCase().includes(search.toLowerCase());

    const orderDate = o.createdAt?.split('T')[0] || '';
    const matchesFrom = !dateFrom || orderDate >= dateFrom;
    const matchesTo = !dateTo || orderDate <= dateTo;

    return matchesSearch && matchesFrom && matchesTo;
  });

  const totalPaid = (order: PickingOrder) =>
    order.payments?.reduce((s, p) => s + Number(p.amount), 0) || 0;

  const formatCurrency = (v: number) =>
    'S/ ' + Number(v).toFixed(2);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <PackageSearch className="w-7 h-7 text-blue-600" />
            Picking / Almacén
          </h1>
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
            <button
              onClick={() => setActiveView('tray')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeView === 'tray' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Bandeja
            </button>
            <button
              onClick={() => setActiveView('operators')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeView === 'operators' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Operarios
            </button>
          </div>
        </div>
        {activeView === 'tray' && (
          <button
            onClick={fetchOrders}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all"
          >
            <Loader2 className="w-4 h-4" />
            Actualizar
          </button>
        )}
      </div>

      {activeView === 'tray' && (
        <p className="text-sm text-slate-500 -mt-4">
          {orders.filter(o => o.warehouseStatus === 'PENDING').length} pendientes
          {' · '}
          {orders.filter(o => o.warehouseStatus === 'IN_PICKING').length} en preparación
          {' · '}
          {orders.filter(o => o.warehouseStatus === 'PICKED').length} preparados
        </p>
      )}

      {activeView === 'operators' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={operatorName}
              onChange={e => setOperatorName(e.target.value)}
              placeholder={editingOperator ? 'Editar nombre...' : 'Nombre del operario...'}
              className="flex-1 max-w-xs px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
              onKeyDown={e => e.key === 'Enter' && handleSaveOperator()}
            />
            <button
              onClick={handleSaveOperator}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all flex items-center gap-2"
            >
              {editingOperator ? 'Guardar' : <><Plus className="w-4 h-4" /> Agregar</>}
            </button>
            {editingOperator && (
              <button
                onClick={() => { setEditingOperator(null); setOperatorName(''); }}
                className="px-4 py-2.5 text-slate-500 hover:text-slate-700 font-bold text-sm"
              >
                Cancelar
              </button>
            )}
          </div>
          <div className="grid gap-2">
            {operators.length === 0 && (
              <p className="text-sm text-slate-400 py-8 text-center">No hay operarios registrados. Agrega el primero.</p>
            )}
            {operators.map(op => (
              <div key={op.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-slate-200 transition-all">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm ${op.isActive ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                    {op.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className={`font-bold text-sm ${op.isActive ? 'text-slate-800' : 'text-slate-400 line-through'}`}>{op.name}</p>
                    <p className="text-[10px] text-slate-400">{op.isActive ? 'Activo' : 'Inactivo'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { setEditingOperator(op); setOperatorName(op.name); }}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    title="Editar"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleToggleOperator(op)}
                    className={`p-2 rounded-lg transition-all ${op.isActive ? 'text-slate-400 hover:text-red-500 hover:bg-red-50' : 'text-slate-400 hover:text-green-500 hover:bg-green-50'}`}
                    title={op.isActive ? 'Desactivar' : 'Activar'}
                  >
                    {op.isActive ? '✕' : '✓'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeView === 'tray' && (
        <>
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por # pedido, cliente o documento..."
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-medium"
            />
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="px-3 py-3.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm font-medium"
              title="Desde"
            />
            <span className="text-slate-300 font-bold">–</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="px-3 py-3.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm font-medium"
              title="Hasta"
            />
            {(dateFrom || dateTo) && (
              <button
                onClick={() => { setDateFrom(''); setDateTo(''); }}
                className="p-3.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                title="Limpiar filtro"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {loading ? (
        <div className="flex justify-center py-32">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-32 bg-white rounded-3xl border border-dashed border-slate-200">
          <PackageSearch className="w-16 h-16 text-slate-200 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-400">No hay pedidos en la bandeja</h3>
          <p className="text-slate-400 mt-2">Los pedidos pagados aparecerán aquí automáticamente.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map(order => {
            const cfg = statusConfig[order.warehouseStatus || 'PENDING'] || statusConfig.PENDING;
            const StatusIcon = cfg.icon;
            return (
              <motion.button
                key={order.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setSelectedOrder(order)}
                className="w-full text-left bg-white rounded-2xl border border-slate-200 p-5 hover:border-blue-300 hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-lg font-black text-slate-800">#PED-{order.id}</span>
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${cfg.color}`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {cfg.label}
                      </span>
                      <span className={`text-[10px] font-black px-2 py-1 rounded-md ${
                        order.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-700' :
                        order.paymentStatus === 'PARTIAL' ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {order.paymentStatus === 'PAID' ? 'PAGADO' :
                         order.paymentStatus === 'PARTIAL' ? 'PARCIAL' :
                         'PENDIENTE'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-slate-500">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        {order.customerName}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {formatDate(order.createdAt)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Box className="w-3.5 h-3.5 text-slate-400" />
                        {order.items.length} producto{order.items.length !== 1 ? 's' : ''}
                      </span>
                      {(order.docSeries || order.docNumber) && (
                        <span className="flex items-center gap-1.5">
                          <ScrollText className="w-3.5 h-3.5 text-slate-400" />
                          {order.docSeries || ''}{order.docNumber ? `-${order.docNumber}` : ''}
                        </span>
                      )}
                      {order.voucherNumber && (
                        <span className="flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-slate-400" />
                          Factura: {order.voucherNumber}
                        </span>
                      )}
                      {order.referralGuide && (
                        <span className="flex items-center gap-1.5">
                          <Truck className="w-3.5 h-3.5 text-slate-400" />
                          Guía: {order.referralGuide}
                        </span>
                      )}
                      {order.agency && (
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {order.agency.name}
                        </span>
                      )}
                      {order.notes && (
                        <span className="flex items-center gap-1.5 text-amber-600">
                          <MessageSquareText className="w-3.5 h-3.5" />
                          Observaciones
                        </span>
                      )}
                      {order.picker && (
                        <span className="flex items-center gap-1.5 text-blue-600">
                          <UserCheck className="w-3.5 h-3.5" />
                          {order.picker.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                    {(order.warehouseStatus === 'IN_PICKING' || order.warehouseStatus === 'PICKED') && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handlePrint(order); }}
                        className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all opacity-0 group-hover:opacity-100"
                        title="Imprimir ticket"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white z-10 border-b border-slate-100 px-6 py-4 flex items-center justify-between rounded-t-3xl">
                <div>
                  <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                    <Package className="w-6 h-6 text-blue-600" />
                    Pedido #PED-{selectedOrder.id}
                  </h2>
                  <p className="text-sm text-slate-500">{formatDate(selectedOrder.createdAt)}</p>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Cliente</p>
                    <p className="font-bold text-slate-800">{selectedOrder.customerName}</p>
                    {selectedOrder.customerPhone && (
                      <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1">
                        <Phone className="w-3.5 h-3.5" /> {selectedOrder.customerPhone}
                      </p>
                    )}
                    {selectedOrder.customerAddress && (
                      <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1">
                        <MapPin className="w-3.5 h-3.5" /> {selectedOrder.customerAddress}
                      </p>
                    )}
                    {selectedOrder.agency && (
                      <p className="text-sm text-slate-500 mt-1">{selectedOrder.agency.name}</p>
                    )}
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Documentos Relacionados</p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="text-slate-500">Pedido:</span>
                        <span className="font-bold text-slate-800">#PED-{selectedOrder.id}</span>
                      </div>
                      {(selectedOrder.docSeries || selectedOrder.docNumber) && (
                        <div className="flex items-center gap-2 text-sm">
                          <ScrollText className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="text-slate-500">{selectedOrder.docType === 'FACT' ? 'Factura' : 'Documento'}:</span>
                          <span className="font-bold text-slate-800">{selectedOrder.docSeries || ''}{selectedOrder.docNumber ? `-${selectedOrder.docNumber}` : ''}</span>
                        </div>
                      )}
                      {selectedOrder.voucherNumber && (
                        <div className="flex items-center gap-2 text-sm">
                          <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="text-slate-500">Comprobante:</span>
                          <span className="font-bold text-slate-800">{selectedOrder.voucherNumber}</span>
                        </div>
                      )}
                      {selectedOrder.referralGuide && (
                        <div className="flex items-center gap-2 text-sm">
                          <Truck className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="text-slate-500">Guía Remisión:</span>
                          <span className="font-bold text-slate-800">{selectedOrder.referralGuide}</span>
                        </div>
                      )}
                      {selectedOrder.carrierGuide && (
                        <div className="flex items-center gap-2 text-sm">
                          <Truck className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="text-slate-500">Guía Transportista:</span>
                          <span className="font-bold text-slate-800">{selectedOrder.carrierGuide}</span>
                        </div>
                      )}
                      {selectedOrder.agency && (
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="text-slate-500">Agencia:</span>
                          <span className="font-bold text-slate-800">{selectedOrder.agency.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                    <Box className="w-3.5 h-3.5" /> Productos
                  </p>
                  <div className="space-y-2">
                    {selectedOrder.items.map((item, i) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-black shrink-0">
                            {i + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 text-sm truncate">{item.product.name}</p>
                            <p className="text-[10px] text-slate-400">
                              {item.product.code && `Cód: ${item.product.code}`}
                              {item.product.unit && ` · ${item.product.unit.symbol}`}
                              {item.lotNumber && ` · Lote: ${item.lotNumber}`}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          <p className="font-black text-slate-800">{item.quantity} <span className="text-xs font-medium text-slate-400">und</span></p>
                          {item.warehouseName && (
                            <p className="text-[10px] text-slate-400 mt-0.5">{item.warehouseName}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedOrder.notes && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-1">Notas</p>
                    <p className="text-sm text-amber-800">{selectedOrder.notes}</p>
                  </div>
                )}

                <div className="border-t border-slate-100 pt-6 space-y-4">
                  {selectedOrder.warehouseStatus === 'PENDING' && (
                    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                      <p className="text-xs font-black text-blue-700 mb-3 flex items-center gap-2">
                        <UserCheck className="w-4 h-4" /> Asignar Operario
                      </p>
                      <div className="flex items-center gap-3">
                          <select
                            className="flex-1 px-4 py-2.5 rounded-xl border border-blue-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                            defaultValue=""
                            onChange={e => e.target.value && handleAssign(parseInt(e.target.value))}
                            disabled={actionLoading}
                          >
                            <option value="" disabled>Seleccionar operario...</option>
                            {activeOperators.map(op => (
                              <option key={op.id} value={op.id}>{op.name}</option>
                            ))}
                          </select>
                      </div>
                    </div>
                  )}

                  {(selectedOrder.warehouseStatus === 'IN_PICKING' || selectedOrder.warehouseStatus === 'PICKED') && (
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-black text-slate-500">Operario Asignado</p>
                          <p className="font-bold text-slate-800 flex items-center gap-2 mt-1">
                            <UserCheck className="w-4 h-4 text-blue-600" />
                            {selectedOrder.picker?.name || '—'}
                          </p>
                        </div>
                        {selectedOrder.pickingStartedAt && (
                          <div className="text-right">
                            <p className="text-xs font-black text-slate-500">Inicio</p>
                            <p className="font-bold text-slate-700 text-sm mt-1">
                              {new Date(selectedOrder.pickingStartedAt).toLocaleString('es-PE')}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3">
                    {selectedOrder.warehouseStatus === 'IN_PICKING' && (
                      <button
                        onClick={() => handlePrint(selectedOrder)}
                        className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                      >
                        <Printer className="w-5 h-5" />
                        Imprimir Ticket
                      </button>
                    )}
                    {selectedOrder.warehouseStatus === 'IN_PICKING' && (
                      <button
                        onClick={handlePrepare}
                        disabled={actionLoading}
                        className="flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 disabled:opacity-50"
                      >
                        {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                        Marcar como Preparado
                      </button>
                    )}
                    {selectedOrder.warehouseStatus === 'PICKED' && (
                      <>
                        <button
                          onClick={() => handlePrint(selectedOrder)}
                          className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                        >
                          <Printer className="w-5 h-5" />
                          Reimprimir Ticket
                        </button>
                        <button
                          onClick={() => openDispatchModal(selectedOrder)}
                          className="flex items-center gap-2 px-5 py-3 bg-orange-600 text-white rounded-2xl font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-200"
                        >
                          <Truck className="w-5 h-5" />
                          Despachar
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MODAL DE DESPACHO --- */}
      <AnimatePresence>
        {dispatchModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-orange-600" />
                  Despachar Pedido #PED-{dispatchModal.id}
                </h3>
                <button
                  onClick={() => setDispatchModal(null)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-slate-500">
                  Registre los datos de la guía de remisión para completar el despacho.
                </p>
                <div>
                  <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1 block">
                    N° Guía de Remisión Remitente <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={referralGuide}
                    onChange={e => setReferralGuide(e.target.value)}
                    placeholder="Ej: GRR-000001"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none font-bold text-sm"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1 block">
                    N° Guía del Transportista <span className="text-slate-300">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={carrierGuide}
                    onChange={e => setCarrierGuide(e.target.value)}
                    placeholder="Ej: GT-000001"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none font-bold text-sm"
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  onClick={() => setDispatchModal(null)}
                  className="px-5 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDispatch}
                  disabled={actionLoading || !referralGuide.trim()}
                  className="flex items-center gap-2 px-6 py-2.5 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition-all shadow-lg disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Truck className="w-5 h-5" />}
                  Confirmar Despacho
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {printOrder && <PickingTicketPrint order={printOrder} />}
      </>
      )}
    </div>
  );
}