import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, Filter, Calendar, FileText, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import { formatNumber } from '../../../lib/utils';

interface ExtractionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExtract: (items: any[], sourceInfo: any) => void;
  token: string;
}

export const ExtractionModal: React.FC<ExtractionModalProps> = ({ isOpen, onClose, onExtract, token }) => {
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [sourceType, setSourceType] = useState<'COMPRA' | 'GUIA'>('COMPRA');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/movements/sources`, {
        params: { from: dateFrom, to: dateTo, type: sourceType },
        headers: { Authorization: `Bearer ${token}` }
      });
      setResults(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (source: any) => {
    onExtract(source.items, source);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-300 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={onClose} 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" 
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.95, y: 20 }} 
            className="relative w-full max-w-5xl h-[85vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-white/20"
          >
            {/* Header */}
            <div className="bg-[#1e293b] text-white px-6 py-4 flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center shadow-inner">
                  <Filter className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold leading-none">Extraer Detalles de Otras Operaciones</h2>
                  <p className="text-xs text-blue-300 mt-1 font-medium">Búsqueda masiva de documentos para movimientos de almacén</p>
                </div>
              </div>
              <button onClick={onClose} className="hover:bg-white/10 p-2 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Filter Bar */}
            <div className="p-6 bg-slate-50 border-b border-slate-200">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Fecha Desde
                  </label>
                  <input 
                    type="date" 
                    value={dateFrom} 
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white font-bold text-sm text-slate-700 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Fecha Hasta
                  </label>
                  <input 
                    type="date" 
                    value={dateTo} 
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white font-bold text-sm text-slate-700 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tipo de Documento</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${sourceType === 'COMPRA' ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white group-hover:border-blue-400'}`}>
                        {sourceType === 'COMPRA' && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                      <input type="radio" className="hidden" checked={sourceType === 'COMPRA'} onChange={() => setSourceType('COMPRA')} />
                      <span className={`text-xs font-bold ${sourceType === 'COMPRA' ? 'text-blue-700' : 'text-slate-500'}`}>Compra</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${sourceType === 'GUIA' ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white group-hover:border-blue-400'}`}>
                        {sourceType === 'GUIA' && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                      <input type="radio" className="hidden" checked={sourceType === 'GUIA'} onChange={() => setSourceType('GUIA')} />
                      <span className={`text-xs font-bold ${sourceType === 'GUIA' ? 'text-blue-700' : 'text-slate-500'}`}>Guía Remisión</span>
                    </label>
                  </div>
                </div>
                <button 
                  onClick={handleSearch}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white h-10.5 px-6 rounded-xl font-bold text-sm shadow-lg shadow-blue-200 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Search className="w-4 h-4" />}
                  BUSCAR DOCUMENTOS
                </button>
              </div>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto p-6 bg-white">
              {results.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b-2 border-slate-200">
                        <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Tipo Doc</th>
                        <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Nro. Documento</th>
                        <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Fecha</th>
                        <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Proveedor / Cliente</th>
                        <th className="px-4 py-3 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">
                          {sourceType === 'COMPRA' ? 'Total' : 'Cant. Total'}
                        </th>
                        <th className="px-4 py-3 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest w-40">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {results.map((item) => {
                        const totalQty = item.items?.reduce((acc: number, it: any) => acc + (it.quantity || 0), 0);
                        const uniqueUnits = [...new Set(item.items?.map((it: any) => it.product?.unit?.symbol || 'UND'))];
                        const displayUnit = (uniqueUnits.length === 1 ? uniqueUnits[0] : 'ÍTEMS') as string;
                        
                        return (
                          <tr key={item.id} className="hover:bg-blue-50/50 transition-colors group">
                            <td className="px-4 py-4">
                              <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-lg text-[10px] font-black uppercase">
                                {item.docType}
                              </span>
                            </td>
                            <td className="px-4 py-4 font-bold text-slate-700">{item.docSeries}-{item.docNumber}</td>
                            <td className="px-4 py-4 text-xs font-medium text-slate-500 text-center">
                              {new Date(item.date).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-4">
                              <div className="text-xs font-bold text-slate-700 uppercase">{item.supplierName || item.customerName}</div>
                              <div className="text-[10px] text-slate-400 font-medium">RUC: {item.supplier?.docNumber || item.customer?.docNumber}</div>
                            </td>
                            <td className="px-4 py-4 text-right font-black text-slate-900">
                              {sourceType === 'COMPRA' ? (
                                <>
                                  {item.currency === 'USD' ? '$' : 'S/'} {formatNumber(item.totalAmount)}
                                </>
                              ) : (
                                <span className="text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                                  {formatNumber(totalQty, 0)} <span className="text-[9px] text-blue-400 uppercase">{displayUnit}</span>
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-4 text-center">
                              <button 
                                onClick={() => handleSelect(item)}
                                className="bg-white border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-500 hover:text-white px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 w-full shadow-sm"
                              >
                                <CheckCircle2 className="w-4 h-4" /> EXTRAER
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center py-20 opacity-40">
                  <FileText className="w-20 h-20 text-slate-200 mb-4" />
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">No se encontraron resultados</p>
                  <p className="text-slate-300 text-xs font-medium mt-1">Ajuste los filtros de fecha para buscar documentos</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-4 shrink-0">
              <button 
                onClick={onClose}
                className="px-8 py-3 rounded-2xl font-bold text-slate-600 hover:bg-slate-200 transition-all text-sm"
              >
                CERRAR VENTANA
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
