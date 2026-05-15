import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  FileText, PlusCircle, Search, Edit2, Trash2, Phone, 
  ShoppingCart, Filter, Eye, Download, MessageCircle,
  Calendar, User, CreditCard, DollarSign, RefreshCcw, Lock
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
  pickupPlace?: string;
  sellerId?: number;
  customerId?: number;
  items?: QuotationItem[];
}

interface QuotationModuleProps {
  quotations: Quotation[];
  onDelete: (id: number) => void;
  onEdit: (quot: Quotation) => void;
  onConvertToOrder: (quot: Quotation) => void;
  onNew: () => void;
  onReset: (id: number) => void;
}

export const QuotationModule: React.FC<QuotationModuleProps> = ({
  quotations,
  onDelete,
  onEdit,
  onConvertToOrder,
  onNew,
  onReset
}) => {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission?.('WRITE_QUOTATIONS') || hasPermission?.('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredQuotations = quotations.filter(q => 
    q.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.docNumber?.includes(searchTerm) ||
    q.customerDocNumber?.includes(searchTerm)
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="space-y-6"
    >
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text"
            placeholder="Buscar por cliente, RUC/DNI o número..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all outline-none"
          />
        </div>
        {canWrite ? (
          <button 
            onClick={onNew}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-100 active:scale-95"
          >
            <PlusCircle className="w-5 h-5" />
            Nueva Cotización
          </button>
        ) : (
          <div className="flex items-center gap-2 bg-slate-100 text-slate-400 px-6 py-3 rounded-2xl font-bold cursor-not-allowed">
            <Lock className="w-5 h-5" />
            Nueva Cotización
          </div>
        )}
      </div>

      {/* Table List */}
      <div className="bg-white rounded-4xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Documento</th>
                <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Cliente</th>
                <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Estado</th>
                <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400 text-right">Total</th>
                <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredQuotations.length > 0 ? (
                filteredQuotations.map((quot) => (
                  <tr key={quot.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">
                          {quot.docSeries ? `${quot.docSeries}-${quot.docNumber}` : `#C-${quot.id}`}
                        </span>
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                          <Calendar className="w-3 h-3" />
                          {new Date(quot.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800 leading-tight">{quot.customerName}</span>
                        <span className="text-[10px] text-slate-400 font-black tracking-widest uppercase">{quot.customerDocNumber || 'S/D'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${
                        quot.status === 'PENDING' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                        quot.status === 'ACCEPTED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        'bg-slate-50 text-slate-400 border-slate-100'
                      }`}>
                        {quot.status === 'PENDING' ? 'Pendiente' : quot.status === 'ACCEPTED' ? 'Aceptada' : 'Expirada'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-black text-slate-900">
                          {quot.currency === 'PEN' ? 'S/' : '$'} {formatNumber(quot.totalAmount)}
                        </span>
                        {quot.currency === 'USD' && (
                          <span className="text-[10px] text-slate-400 font-bold italic">TC: {quot.exchangeRate}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {quot.status === 'PENDING' && canWrite && (
                          <button 
                            onClick={() => onConvertToOrder(quot)}
                            className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                            title="Convertir a Pedido"
                          >
                            <ShoppingCart className="w-4 h-4" />
                          </button>
                        )}
                        <button 
                          onClick={async () => await generateQuotationPDF(quot, quot.items || [])}
                          className="p-2.5 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-600 hover:text-white transition-all shadow-sm"
                          title="Descargar PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => window.open(`https://wa.me/${quot.customerPhone}?text=Hola%20${quot.customerName},%20aquí%20tienes%20tu%20cotización%20${quot.docSeries}-${quot.docNumber}`, '_blank')}
                          className="p-2.5 bg-green-50 text-green-600 rounded-xl hover:bg-green-600 hover:text-white transition-all shadow-sm"
                          title="Enviar WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                        {quot.status === 'ACCEPTED' && canWrite && (
                          <button 
                            onClick={() => onReset && onReset(quot.id)}
                            className="p-2.5 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-600 hover:text-white transition-all shadow-sm"
                            title="Desbloquear / Volver a Pendiente"
                          >
                            <RefreshCcw className="w-4 h-4" />
                          </button>
                        )}
                        {quot.status === 'PENDING' && canWrite && (
                          <>
                            <button 
                              onClick={() => onEdit(quot)}
                              className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => onDelete(quot.id)}
                              className="p-2.5 text-slate-300 hover:text-red-500 transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {!canWrite && (
                          <Lock className="w-4 h-4 text-slate-300" />
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
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
      </div>
    </motion.div>
  );
};
