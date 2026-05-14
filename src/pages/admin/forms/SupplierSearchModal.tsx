import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search, User, CheckCircle } from 'lucide-react';
import axios from 'axios';

interface SupplierSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (supplier: any) => void;
  token: string;
}

export const SupplierSearchModal: React.FC<SupplierSearchModalProps> = ({ isOpen, onClose, onSelect, token }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      fetchAllSuppliers();
    }
  }, [isOpen]);

  const fetchAllSuppliers = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/suppliers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuppliers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.docNumber.includes(searchTerm)
  );

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-200"
        >
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                <Search className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-800 tracking-tight">Buscar Proveedor</h2>
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">RUC / DNI / Razón Social</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            <div className="relative group">
              <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
              <input 
                autoFocus
                type="text" 
                placeholder="Escribe el nombre o documento..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full h-14 pl-12 pr-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-base font-bold outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner"
              />
            </div>

            <div className="max-h-[400px] overflow-y-auto pr-2 space-y-2 custom-scrollbar">
              {loading ? (
                <div className="py-20 text-center">
                  <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-sm font-bold text-slate-400">Cargando proveedores...</p>
                </div>
              ) : filtered.length > 0 ? (
                filtered.map(s => (
                  <button 
                    key={s.id}
                    onClick={() => onSelect(s)}
                    className="w-full p-4 bg-white border border-slate-100 rounded-2xl hover:border-blue-500 hover:bg-blue-50/50 transition-all flex items-center justify-between group shadow-sm"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                        <User className="w-6 h-6" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-black text-slate-800 group-hover:text-blue-900 uppercase">{s.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="px-2 py-0.5 bg-slate-100 rounded text-[9px] font-black text-slate-500">{s.docType}</span>
                          <span className="text-xs font-bold text-slate-400">{s.docNumber}</span>
                        </div>
                      </div>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-blue-200">
                        <CheckCircle className="w-4 h-4" />
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="py-20 text-center text-slate-400">
                  <Search className="w-12 h-12 mx-auto mb-4 opacity-10" />
                  <p className="text-sm font-bold">No se encontraron resultados</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
