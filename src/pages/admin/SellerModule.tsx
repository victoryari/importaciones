import React, { useState } from 'react';
import { motion } from 'motion/react';
import { User, Phone, Mail, Trash2, Edit2, Plus, CheckCircle2, XCircle, List, LayoutGrid, Building2 } from 'lucide-react';

interface Seller {
  id: number;
  name: string;
  dni: string;
  phone: string;
  email: string;
  isActive: boolean;
  warehouseId?: number | null;
  warehouse?: {
    id: number;
    name: string;
    sunatCode?: string;
  };
}

interface SellerModuleProps {
  sellers: Seller[];
  onEdit: (seller: Seller) => void;
  onNew: () => void;
  onDelete: (id: number) => void;
}

export const SellerModule: React.FC<SellerModuleProps> = ({ sellers, onEdit, onNew, onDelete }) => {
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <User className="w-6 h-6 text-blue-600" />
            Vendedores
          </h2>
          <p className="text-sm text-slate-400 font-medium">Asignación de asesores de venta a sedes y almacenes</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* View Toggle */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              title="Vista de Listado"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              title="Vista de Tarjetas"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          <button 
            onClick={onNew}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-blue-100 font-bold text-sm"
          >
            <Plus className="w-4 h-4" /> Nuevo Vendedor
          </button>
        </div>
      </div>

      {viewMode === 'list' ? (
        /* Sellers List (Table Style) */
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] uppercase tracking-wider font-black text-slate-400">
                  <th className="px-6 py-4">Vendedor / DNI</th>
                  <th className="px-6 py-4">Sede / Almacén Asignado</th>
                  <th className="px-6 py-4">Teléfono</th>
                  <th className="px-6 py-4">Correo</th>
                  <th className="px-6 py-4 text-center">Estado</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sellers.map((seller) => (
                  <tr key={seller.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0">
                          {seller.name ? seller.name.substring(0, 2).toUpperCase() : <User className="w-4 h-4" />}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800 leading-tight">{seller.name}</span>
                          <span className="text-[10px] text-slate-400 font-bold mt-0.5">DNI: {seller.dni}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {seller.warehouse ? (
                        <span className="inline-flex items-center gap-1.5 font-bold text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                          <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                          [{seller.warehouse.sunatCode || '0000'}] {seller.warehouse.name}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Multisede / General</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {seller.phone ? (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          {seller.phone}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Sin teléfono</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {seller.email ? (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          {seller.email}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Sin correo</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center">
                        {seller.isActive ? (
                          <span className="flex items-center gap-1 text-emerald-600 text-[10px] font-bold bg-emerald-50 px-2.5 py-1 rounded-full uppercase">
                            <CheckCircle2 className="w-3 h-3" /> Activo
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-slate-400 text-[10px] font-bold bg-slate-50 px-2.5 py-1 rounded-full uppercase">
                            <XCircle className="w-3 h-3" /> Inactivo
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button 
                          onClick={() => onEdit(seller)}
                          className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-2xs cursor-pointer"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => onDelete(seller.id)}
                          className="p-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-lg transition-all shadow-2xs cursor-pointer"
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
      ) : (
        /* Sellers Grid (Card Style) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sellers.map((seller) => (
            <motion.div 
              key={seller.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl transition-all group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <User className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-1">
                  {seller.isActive ? (
                    <span className="flex items-center gap-1 text-emerald-600 text-[10px] font-bold bg-emerald-50 px-2 py-0.5 rounded-full uppercase">
                      <CheckCircle2 className="w-3 h-3" /> Activo
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-slate-400 text-[10px] font-bold bg-slate-50 px-2 py-0.5 rounded-full uppercase">
                      <XCircle className="w-3 h-3" /> Inactivo
                    </span>
                  )}
                </div>
              </div>

              <h3 className="text-base font-bold text-slate-800 mb-1">{seller.name}</h3>
              <p className="text-xs text-slate-400 font-bold mb-3">DNI: {seller.dni}</p>

              {seller.warehouse && (
                <div className="mb-4">
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                    <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                    [{seller.warehouse.sunatCode || '0000'}] {seller.warehouse.name}
                  </span>
                </div>
              )}

              <div className="space-y-2 pt-3 border-t border-slate-50 text-xs text-slate-600">
                {seller.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{seller.phone}</span>
                  </div>
                )}
                {seller.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{seller.email}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-5 pt-4 border-t border-slate-50">
                <button
                  onClick={() => onEdit(seller)}
                  className="flex-1 py-2 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Editar
                </button>
                <button
                  onClick={() => onDelete(seller.id)}
                  className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-xl transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
