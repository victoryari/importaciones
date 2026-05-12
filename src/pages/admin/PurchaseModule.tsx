import React, { useState, useEffect } from 'react';
import { Search, PlusCircle, TrendingUp, Edit2, Trash2 } from 'lucide-react';
import axios from 'axios';
import { formatNumber, formatCurrency } from '../../lib/utils';

interface Purchase {
  id: number;
  supplierName: string;
  docType: string;
  docSeries: string;
  docNumber: string;
  date: string;
  totalAmount: number;
  currency: string;
  status: string;
  items: any[];
}

interface PurchaseModuleProps {
  token?: string | null;
  onNew: () => void;
  onEdit: (purchase: Purchase) => void;
  onDelete: (id: number) => void;
  purchases: Purchase[];
}

export const PurchaseModule: React.FC<PurchaseModuleProps> = ({ token, onNew, onEdit, onDelete, purchases }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = purchases.filter(p => 
    p.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.docNumber?.includes(searchTerm)
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Registro de Compras</h2>
          <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">Ingresos por Importación y Compras Locales</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar compra..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none w-64 transition-all"
            />
          </div>
          <button 
            onClick={onNew}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-blue-100 transition-all"
          >
            <PlusCircle className="w-4 h-4" /> Nuevo Ingreso
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-4xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600"><TrendingUp className="w-6 h-6" /></div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Compras (Mes)</p>
              <p className="text-xl font-black text-slate-800">{formatCurrency(purchases.reduce((acc, p) => acc + Number(p.totalAmount), 0))}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50">
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Fecha</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Proveedor</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Documento</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Monto Total</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map(p => (
              <tr key={p.id} className="hover:bg-slate-50/30 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex flex-col items-center">
                    <span className="text-sm font-black text-slate-700">{new Date(p.date).getDate()}</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{new Date(p.date).toLocaleString('es-ES', { month: 'short' })}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-700">{p.supplierName}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[9px] font-black">{p.docType}</span>
                    <span className="text-xs font-bold text-slate-600">{p.docSeries}-{p.docNumber}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="text-sm font-black text-slate-800">{p.currency} {formatNumber(p.totalAmount)}</div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                    {p.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => onEdit(p)}
                      className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg transition-all shadow-sm"
                      title="Editar Compra"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => onDelete(p.id)}
                      className="p-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-lg transition-all shadow-sm"
                      title="Eliminar Compra"
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
  );
};
