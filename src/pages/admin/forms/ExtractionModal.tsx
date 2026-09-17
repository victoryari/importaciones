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
        <div className="fixed inset-0 z-300 flex items-center justify-center p-3 overflow-hidden">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={onClose} 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" 
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.97, y: 15 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.97, y: 15 }} 
            className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-200"
          >
            {/* Header */}
            <div className="bg-[#004A99] text-white px-4 py-2.5 flex items-center justify-between shadow-sm shrink-0 border-b border-blue-900">
              <div className="flex items-center gap-2.5">
                <div className="p-1 bg-white/10 rounded">
                  <Filter className="w-4 h-4 text-blue-200" />
                </div>
                <div>
                  <h2 className="text-xs font-bold leading-none text-white uppercase tracking-tight">Extraer Detalles de Otras Operaciones</h2>
                  <p className="text-[9px] text-blue-200 mt-0.5 uppercase font-medium">Búsqueda masiva de documentos para movimientos de almacén</p>
                </div>
              </div>
              <button 
                onClick={onClose} 
                className="p-1 hover:bg-red-600 rounded text-white/80 hover:text-white transition-colors cursor-pointer"
                title="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Filter Bar */}
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 shrink-0">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" /> Fecha Desde
                  </label>
                  <input 
                    type="date" 
                    value={dateFrom} 
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full h-8 px-2.5 rounded-lg border border-slate-300 bg-white font-bold text-xs text-slate-700 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" /> Fecha Hasta
                  </label>
                  <input 
                    type="date" 
                    value={dateTo} 
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full h-8 px-2.5 rounded-lg border border-slate-300 bg-white font-bold text-xs text-slate-700 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Tipo de Documento</label>
                  <div className="flex gap-3 h-8 items-center">
                    <label className="flex items-center gap-1.5 cursor-pointer group">
                      <input 
                        type="radio" 
                        name="sourceType"
                        className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500 cursor-pointer" 
                        checked={sourceType === 'COMPRA'} 
                        onChange={() => setSourceType('COMPRA')} 
                      />
                      <span className={`text-xs font-bold ${sourceType === 'COMPRA' ? 'text-blue-700' : 'text-slate-600'}`}>Compra</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer group">
                      <input 
                        type="radio" 
                        name="sourceType"
                        className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500 cursor-pointer" 
                        checked={sourceType === 'GUIA'} 
                        onChange={() => setSourceType('GUIA')} 
                      />
                      <span className={`text-xs font-bold ${sourceType === 'GUIA' ? 'text-blue-700' : 'text-slate-600'}`}>Guía Remisión</span>
                    </label>
                  </div>
                </div>
                <button 
                  onClick={handleSearch}
                  disabled={loading}
                  className="bg-[#004A99] hover:bg-blue-800 text-white h-8 px-4 rounded-lg font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {loading ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                  BUSCAR DOCUMENTOS
                </button>
              </div>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto p-4 bg-white">
              {results.length > 0 ? (
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200">
                        <th className="px-3 py-2 text-center text-[9px] font-black text-slate-500 uppercase tracking-wider w-16">Tipo Doc</th>
                        <th className="px-3 py-2 text-left text-[9px] font-black text-slate-500 uppercase tracking-wider w-36">Nro. Documento</th>
                        <th className="px-3 py-2 text-center text-[9px] font-black text-slate-500 uppercase tracking-wider w-24">Fecha</th>
                        <th className="px-3 py-2 text-left text-[9px] font-black text-slate-500 uppercase tracking-wider">Proveedor / Cliente</th>
                        <th className="px-3 py-2 text-right text-[9px] font-black text-slate-500 uppercase tracking-wider w-32">
                          {sourceType === 'COMPRA' ? 'Total' : 'Cant. Total'}
                        </th>
                        <th className="px-3 py-2 text-center text-[9px] font-black text-slate-500 uppercase tracking-wider w-28">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {results.map((item) => {
                        const totalQty = item.items?.reduce((acc: number, it: any) => acc + (it.quantity || 0), 0);
                        const uniqueUnits = [...new Set(item.items?.map((it: any) => it.unitSymbol || it.unitMeasure || it.product?.package?.symbol || it.product?.subPackage?.symbol || it.product?.unit?.symbol || 'UND'))];
                        const displayUnit = (uniqueUnits.length === 1 ? uniqueUnits[0] : 'ÍTEMS') as string;
                        
                        return (
                          <tr key={item.id} className="hover:bg-blue-50/40 transition-colors group">
                            <td className="px-3 py-2 text-center">
                              <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[9px] font-mono font-black">
                                {item.docType || '50'}
                              </span>
                            </td>
                            <td className="px-3 py-2 font-mono font-bold text-xs text-slate-800">
                              {item.docSeries ? `${item.docSeries}-${item.docNumber}` : item.docNumber}
                            </td>
                            <td className="px-3 py-2 text-[10px] font-medium text-slate-500 text-center font-mono">
                              {new Date(item.date).toLocaleDateString()}
                            </td>
                            <td className="px-3 py-2">
                              <div className="text-[11px] font-bold text-slate-800 uppercase leading-snug line-clamp-2">
                                {item.supplierName || item.customerName}
                              </div>
                              <div className="text-[9px] text-slate-400 font-mono font-medium mt-0.5">
                                RUC: {item.supplier?.docNumber || item.customer?.docNumber || '-'}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-right font-mono font-bold text-xs text-slate-900 whitespace-nowrap">
                              {sourceType === 'COMPRA' ? (
                                <>
                                  {item.currency === 'USD' ? '$' : 'S/'} {formatNumber(item.totalAmount)}
                                </>
                              ) : (
                                <span className="text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                  {formatNumber(totalQty, 0)} <span className="text-[8px] text-blue-500 uppercase">{displayUnit}</span>
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <button 
                                onClick={() => handleSelect(item)}
                                className="bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-300 hover:border-emerald-600 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 w-full shadow-2xs cursor-pointer"
                                title="Extraer ítems de este documento"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" /> EXTRAER
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center py-16 opacity-40">
                  <FileText className="w-16 h-16 text-slate-300 mb-3" />
                  <p className="text-slate-500 font-bold uppercase tracking-wider text-xs">No se encontraron resultados</p>
                  <p className="text-slate-400 text-[10px] font-medium mt-0.5">Ajuste los filtros de fecha para buscar documentos</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 bg-slate-100/90 border-t border-slate-200 flex justify-end shrink-0">
              <button 
                onClick={onClose}
                className="h-8 px-5 rounded-lg font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-all text-xs shadow-2xs flex items-center gap-1.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5 text-slate-500" /> CERRAR VENTANA
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
