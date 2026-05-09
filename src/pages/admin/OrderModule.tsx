import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  ShoppingCart, Search, Filter, Edit2, Trash2, Phone, 
  MessageCircle, Truck, CreditCard, Clock, CheckCircle, 
  XCircle, FileText, MoreVertical, Eye
} from 'lucide-react';

interface OrderItem {
  id: number;
  quantity: number;
  price: number;
  product: {
    name: string;
    images?: string[];
  };
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
}

interface OrderModuleProps {
  orders: Order[];
  onUpdateStatus: (id: number, status: string) => void;
  onDelete: (id: number) => void;
  onViewGuide: (order: Order) => void;
  onEdit: (order: Order) => void;
}

export const OrderModule: React.FC<OrderModuleProps> = ({
  orders,
  onUpdateStatus,
  onDelete,
  onViewGuide,
  onEdit
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredOrders = orders.filter(o => 
    o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.id.toString().includes(searchTerm)
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
            placeholder="Buscar por cliente o # pedido..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all outline-none"
          />
        </div>
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
          <Clock className="w-4 h-4" />
          Últimos 30 días
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
                <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400 text-right">Total</th>
                <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-black text-slate-900">#PED-{order.id}</span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">{new Date(order.createdAt).toLocaleDateString()}</span>
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
                  <td className="px-6 py-4 text-right">
                    <span className="font-black text-slate-900">S/ {Number(order.totalAmount).toFixed(2)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => window.open(`https://wa.me/${order.customerPhone}`, '_blank')}
                        className="p-2.5 bg-green-50 text-green-600 rounded-xl hover:bg-green-600 hover:text-white transition-all shadow-sm"
                        title="Contactar WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => onViewGuide(order)}
                        className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                        title="Ver Guía"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => onEdit(order)}
                        className="p-2.5 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => onDelete(order.id)}
                        className="p-2.5 text-slate-300 hover:text-red-500 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};
