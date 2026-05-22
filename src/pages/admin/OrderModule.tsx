import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  ShoppingCart, Search, Filter, Edit2, Trash2, Phone, 
  MessageCircle, Truck, CreditCard, Clock, CheckCircle, 
  XCircle, FileText, MoreVertical, Eye, DollarSign, Lock, Undo2,
  Receipt
} from 'lucide-react';
import { formatNumber, formatCurrency } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';

interface OrderItem {
  id: number;
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
  voucherNumber?: string;
  payments?: Payment[];
}

interface OrderModuleProps {
  orders: Order[];
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

export const OrderModule: React.FC<OrderModuleProps> = ({
  orders,
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

  const filteredOrders = orders.filter(o => 
    o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.id.toString().includes(searchTerm) ||
    o.voucherNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="space-y-6"
    >
      {/* Search & Stats Header */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text"
            placeholder="Buscar por cliente, pedido o comprobante..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all outline-none"
          />
        </div>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
            <Clock className="w-4 h-4" />
            Últimos 30 días
          </div>
          {canWrite ? (
            <button 
              onClick={onNewDirectOrder}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-100 active:scale-95 whitespace-nowrap"
            >
              <ShoppingCart className="w-5 h-5" />
              Nuevo Pedido Directo
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-slate-100 text-slate-400 px-6 py-3 rounded-2xl font-bold cursor-not-allowed whitespace-nowrap">
              <Lock className="w-5 h-5" />
              Nuevo Pedido Directo
            </div>
          )}
        </div>
      </div>

      {/* Grid List */}
      <div className="bg-white rounded-4xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Pedido</th>
                <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Cliente</th>
                <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Pago / Envío</th>
                <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Comprobante</th>
                <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400 text-right">Total</th>
                <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400 text-right">Saldo</th>
                <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredOrders.map((order) => {
                const totalPaid = order.payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
                const balance = Math.max(0, Number(order.totalAmount) - totalPaid);
                const hasPayments = order.paymentStatus === 'PAID' || totalPaid > 0;
                const isDispatchedOrBeyond = ['DISPATCHED', 'SHIPPED', 'DELIVERED'].includes(order.status);
                const canDeleteOrder = !hasPayments && !isDispatchedOrBeyond;
                return (
                  <tr key={order.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-black text-slate-900">#PED-{order.docSeries || ''}{order.docNumber ? `-${order.docNumber}` : order.id}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">{new Date(order.createdAt).toLocaleDateString()}</span>
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-tighter ${
                            (order as any).origin === 'WEB' 
                              ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}>
                            {(order as any).origin || 'ADMIN'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800 leading-tight">{order.customerName}</span>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Truck className="w-3 h-3 text-slate-300" />
                          <span className="text-[10px] text-slate-400 font-medium">{order.agency?.name || 'Recojo en tienda'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5">
                        <span className={`w-fit px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${
                          order.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {order.paymentStatus === 'PAID' ? 'Pagado' : 'Pendiente Pago'}
                        </span>
                        <span className={`w-fit px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${
                          order.status === 'SHIPPED' ? 'bg-blue-100 text-blue-700' : 
                          order.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {order.status === 'SHIPPED' ? 'En camino' : 
                           order.status === 'DELIVERED' ? 'Entregado' : 'Procesando'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {order.voucherNumber ? (
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800 text-xs flex items-center gap-1">
                            <Receipt className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            {order.voucherNumber}
                          </span>
                          <span className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">GENERADO</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-semibold italic">Sin comprobante</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-black text-slate-900">{formatCurrency(order.totalAmount)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`font-bold text-xs px-2.5 py-1 rounded-lg border ${
                        balance === 0 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {formatCurrency(balance)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                      {canWrite && (
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
                          {order.paymentStatus === 'PAID' && order.status === 'PREPARING' && onCancelPayment && (
                            <button 
                              onClick={() => onCancelPayment(order.id)}
                              className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm"
                              title="Anular Cobro"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                          {onGenerateInvoice && ['PREPARING', 'DISPATCHED', 'SHIPPED', 'DELIVERED'].includes(order.status) && (
                            order.voucherNumber ? (
                              <span className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl text-[9px] font-black" title={order.voucherNumber}>
                                <FileText className="w-4 h-4" />
                              </span>
                            ) : (
                              <button 
                                onClick={() => onGenerateInvoice(order)}
                                className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                title="Generar Comprobante"
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
                      {canWrite && (
                        <>
                          {order.paymentStatus === 'PAID' || ['DISPATCHED','SHIPPED','DELIVERED'].includes(order.status) ? (
                            <span className="relative group">
                              <button 
                                disabled
                                className="p-2.5 bg-slate-100 text-slate-300 rounded-xl cursor-not-allowed shadow-sm"
                              >
                                <Lock className="w-4 h-4" />
                              </button>
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
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
                            <span className="relative group">
                              <button 
                                disabled
                                className="p-2.5 text-slate-200 cursor-not-allowed"
                                title="Eliminar bloqueado"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                              <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block z-50">
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
            })}
          </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};
