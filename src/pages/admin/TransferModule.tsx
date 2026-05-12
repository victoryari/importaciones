import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowRightLeft, Search, PlusCircle } from 'lucide-react';
import axios from 'axios';

interface Transfer {
  id: number;
  fromWarehouseId: number;
  toWarehouseId: number;
  docNumber?: string;
  date: string;
  observation?: string;
  status: string;
  fromWarehouse: { name: string };
  toWarehouse: { name: string };
  items: any[];
}

interface TransferModuleProps {
  token?: string | null;
  onNew: () => void;
  transfers: Transfer[];
}

export const TransferModule: React.FC<TransferModuleProps> = ({ token, onNew, transfers }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = transfers.filter(t => 
    t.fromWarehouse.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.toWarehouse.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.docNumber?.includes(searchTerm)
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Transferencias</h2>
          <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">Movimientos entre Almacenes</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar transferencia..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none w-64 transition-all"
            />
          </div>
          <button 
            onClick={onNew}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-blue-100 transition-all"
          >
            <PlusCircle className="w-4 h-4" /> Nueva Transferencia
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50">
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Fecha</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Documento</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Ruta</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ítems</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map(t => (
              <tr key={t.id} className="hover:bg-slate-50/30 transition-colors">
                <td className="px-6 py-4 text-center">
                  <div className="flex flex-col items-center">
                    <span className="text-sm font-black text-slate-700">{new Date(t.date).getDate()}</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{new Date(t.date).toLocaleString('es-ES', { month: 'short' })}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-xs font-bold text-slate-600">{t.docNumber || 'SIN DOC'}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center gap-2">
                    <div className="px-3 py-1 bg-amber-50 text-amber-700 rounded-lg text-[10px] font-black border border-amber-100">{t.fromWarehouse.name}</div>
                    <ArrowRightLeft className="w-4 h-4 text-slate-300" />
                    <div className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-[10px] font-black border border-emerald-100">{t.toWarehouse.name}</div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-xs font-bold text-slate-600">{t.items.length} ítem(s)</div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                    {t.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
