import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Search, Edit2, Trash2, UserPlus, Phone, Mail, MapPin, Building2 } from 'lucide-react';
import axios from 'axios';

interface Supplier {
  id: number;
  code?: string;
  name: string;
  docType: string;
  docNumber: string;
  address?: string;
  phone?: string;
  email?: string;
  contact?: string;
}

interface SupplierModuleProps {
  token?: string | null;
  onNew: () => void;
  onEdit: (s: Supplier) => void;
  suppliers: Supplier[];
}

export const SupplierModule: React.FC<SupplierModuleProps> = ({ token, onNew, onEdit, suppliers }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.docNumber?.includes(searchTerm)
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Directorio de Proveedores</h2>
          <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">Gestión de Contactos y Entidades</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar proveedor..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none w-64 transition-all"
            />
          </div>
          <button 
            onClick={onNew}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-blue-100 transition-all"
          >
            <UserPlus className="w-4 h-4" /> Nuevo Proveedor
          </button>
        </div>
      </div>


      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(s => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            key={s.id} 
            className="bg-white p-6 rounded-4xl border border-slate-100 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all"><Building2 className="w-6 h-6" /></div>
              <div className="flex gap-1">
                <button onClick={() => onEdit(s)} className="p-2 hover:bg-slate-100 text-slate-400 hover:text-blue-600 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                <button 
                  onClick={() => {
                    if (confirm('¿Eliminar proveedor?')) {
                      axios.delete(`/api/suppliers/${s.id}`, { headers: { Authorization: `Bearer ${token}` } }).then(() => window.dispatchEvent(new CustomEvent('refreshData')));
                    }
                  }}
                  className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                ><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
            
            <h3 className="font-black text-slate-800 line-clamp-1">{s.name}</h3>
            <p className="text-[10px] font-bold text-slate-400 mb-4">{s.docType}: {s.docNumber}</p>
            
            <div className="space-y-2">
              {s.phone && <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500"><Phone className="w-3 h-3" /> {s.phone}</div>}
              {s.email && <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500"><Mail className="w-3 h-3" /> {s.email}</div>}
              {s.address && <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500"><MapPin className="w-3 h-3" /> {s.address}</div>}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
