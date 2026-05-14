import React, { useState, useEffect } from 'react';
import { Search, PlusCircle, TrendingUp, Edit2, Trash2, Package } from 'lucide-react';
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
  onNew: (type?: 'invoices' | 'guides') => void;
  onEdit: (purchase: Purchase, type?: 'invoices' | 'guides') => void;
  onDelete: (id: number) => void;
  purchases: Purchase[];
}

export const PurchaseModule: React.FC<PurchaseModuleProps> = ({ token, onNew, onEdit, onDelete, purchases }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'invoices' | 'guides'>('invoices');

  // Clasificar documentos
  const filtered = purchases.filter(p => {
    const matchesSearch = p.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         p.docNumber?.includes(searchTerm);
    
    if (activeTab === 'guides') {
      return matchesSearch && (p.docType === 'GUIA' || p.docType === '09' || p.docType === 'GRM');
    } else {
      // Invoices, Boletas, DUA, etc.
      return matchesSearch && (p.docType !== 'GUIA' && p.docType !== '09' && p.docType !== 'GRM');
    }
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Gestión de Adquisiciones</h2>
          <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">
            {activeTab === 'guides' ? 'Módulo de Almacén: Ingresos Físicos' : 'Módulo de Administración: Compras y Facturación'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none w-64 transition-all"
            />
          </div>
          <button 
            onClick={() => onNew(activeTab)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-blue-100 transition-all"
          >
            <PlusCircle className="w-4 h-4" /> 
            {activeTab === 'guides' ? 'Nueva Guía de Ingreso' : 'Nueva Factura / DUA'}
          </button>
        </div>
      </div>

      {/* --- TABS --- */}
      <div className="flex bg-slate-100 p-1 rounded-2xl w-fit">
        <button 
          onClick={() => setActiveTab('invoices')}
          className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'invoices' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Facturas / Boletas / DUA
        </button>
        <button 
          onClick={() => setActiveTab('guides')}
          className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'guides' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Guías de Remisión (Ingreso)
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600"><TrendingUp className="w-5 h-5" /></div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total {activeTab === 'guides' ? 'Guías' : 'Facturas'}</p>
              <p className="text-lg font-black text-slate-800">{filtered.length} Documentos</p>
            </div>
          </div>
        </div>
        {activeTab === 'invoices' && (
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600"><TrendingUp className="w-5 h-5" /></div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Monto Total</p>
                <p className="text-lg font-black text-slate-800">{formatCurrency(filtered.reduce((acc, p) => acc + Number(p.totalAmount), 0))}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50">
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Fecha</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Proveedor</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Documento</th>
              {activeTab === 'invoices' && <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Monto</th>}
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
                  <div className="font-bold text-slate-700 text-sm">{p.supplierName || (p as any).supplier?.name}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black ${['GUIA', '09', 'GRM'].includes(p.docType) ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>
                      {['09', 'GRM'].includes(p.docType) ? 'GUIA' : p.docType}
                    </span>
                    <span className="text-xs font-bold text-slate-600">{p.docSeries}-{p.docNumber}</span>
                  </div>
                </td>
                {activeTab === 'invoices' && (
                  <td className="px-6 py-4 text-right">
                    <div className="text-sm font-black text-slate-800">{p.currency} {formatNumber(p.totalAmount)}</div>
                  </td>
                )}
                <td className="px-6 py-4">
                  {(() => {
                    const statusToShow = (p as any).computedStatus || p.status;
                    const isPending = statusToShow === 'EN TRÁNSITO' || statusToShow === 'PENDING';
                    const bgColor = isPending ? 'bg-amber-50 text-amber-600 border border-amber-200/50' : 'bg-emerald-50 text-emerald-600 border border-emerald-200/50';
                    return (
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${bgColor}`}>
                        {statusToShow}
                      </span>
                    );
                  })()}
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => onEdit(p, activeTab)}
                      className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg transition-all"
                      title="Ver/Editar"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => onDelete(p.id)}
                      className="p-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-lg transition-all"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-12 text-center">
            <Package className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-sm font-bold text-slate-400">No se encontraron documentos en esta categoría</p>
          </div>
        )}
      </div>
    </div>
  );
};
