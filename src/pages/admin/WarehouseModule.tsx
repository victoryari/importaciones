import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, Plus, Trash2, Edit2, MapPin, Layers, Search
} from 'lucide-react';

interface Warehouse {
  id: number;
  code?: string;
  sunatCode?: string;
  name: string;
  type?: string;
  address?: string;
  ruc?: string;
  floors?: any[];
  isActive: boolean;
  validateStock: boolean;
}

interface WarehouseModuleProps {
  warehouses: Warehouse[];
  onEdit: (warehouse: Warehouse) => void;
  onNew: () => void;
  onDelete: (id: number) => void;
}

export const WarehouseModule: React.FC<WarehouseModuleProps> = ({ warehouses, onEdit, onNew, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  const filteredWarehouses = warehouses.filter((w) => {
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !q ||
      w.name?.toLowerCase().includes(q) ||
      w.code?.toLowerCase().includes(q) ||
      w.address?.toLowerCase().includes(q) ||
      w.ruc?.toLowerCase().includes(q) ||
      w.sunatCode?.toLowerCase().includes(q);
    const matchesType = typeFilter === 'ALL' || (w.type || '').toUpperCase() === typeFilter;
    return matchesSearch && matchesType;
  });

  const warehouseTypes = Array.from(new Set(warehouses.map(w => (w.type || '').toUpperCase()).filter(Boolean)));

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Cabecera de Módulo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Gestión de Almacenes</h2>
          <p className="text-[11px] font-bold text-[#004A99] uppercase tracking-wider">
            Módulo de Logística: Control jerárquico de sedes, pisos y zonas
          </p>
        </div>
        <button 
          type="button"
          onClick={onNew}
          className="h-9 bg-[#004A99] hover:bg-[#003B7A] text-white px-4 rounded-lg font-semibold text-sm flex items-center gap-2 shadow-2xs transition-colors duration-150 self-start md:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Nuevo Almacén
        </button>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
          <div className="sm:col-span-8">
            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wide mb-1">
              Buscar Almacén / Sede
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por código, nombre, establecimiento SUNAT, dirección o RUC..."
                className="w-full h-8 pl-8 pr-3 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <div className="sm:col-span-4">
            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wide mb-1">
              Tipo de Almacén
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-blue-500"
            >
              <option value="ALL">Todos ({warehouses.length})</option>
              {warehouseTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabla ERP */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#004A99]" />
            <span className="text-[11px] font-bold text-blue-950 uppercase tracking-tight">
              Listado de Almacenes / Sedes
            </span>
          </div>
          <span className="text-[11px] font-semibold text-slate-500 tabular-nums">
            {filteredWarehouses.length} registro{filteredWarehouses.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-wider font-bold text-slate-600">
              <tr>
                <th className="px-4 py-2.5">Código / Nombre</th>
                <th className="px-4 py-2.5">Establecimiento SUNAT</th>
                <th className="px-4 py-2.5">Dirección y RUC</th>
                <th className="px-4 py-2.5 text-center">Estructura</th>
                <th className="px-4 py-2.5 text-center">Stock</th>
                <th className="px-4 py-2.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredWarehouses.map((warehouse) => {
                const wType = (warehouse.type || '').toUpperCase();
                const isPrincipal = wType === 'PRINCIPAL';
                const floorsCount = warehouse.floors?.length || 0;
                const zonesCount = (warehouse.floors || []).reduce(
                  (acc: number, f: any) => acc + (f.zones?.length || 0),
                  0
                );
                return (
                  <tr key={warehouse.id} className="hover:bg-blue-50/40 transition-colors">
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded uppercase">
                          {warehouse.code || 'S/C'}
                        </span>
                        <span className="text-xs font-bold text-slate-900">{warehouse.name}</span>
                        {wType && (
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            isPrincipal
                              ? 'bg-[#004A99] text-white'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}>
                            {wType}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span className="text-[11px] font-mono font-bold bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded">
                        Cód. {warehouse.sunatCode || '0000'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="text-xs text-slate-700 font-medium flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{warehouse.address || 'Sin dirección'}</span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">RUC: {warehouse.ruc || '---'}</div>
                    </td>
                    <td className="px-4 py-2.5 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onEdit(warehouse)}
                        title="Gestionar pisos y zonas"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-[#004A99] border border-slate-200 hover:border-blue-200 text-[11px] font-bold transition-colors cursor-pointer tabular-nums"
                      >
                        <Layers className="w-3.5 h-3.5 text-blue-700" />
                        <span>{floorsCount} {floorsCount === 1 ? 'piso' : 'pisos'} · {zonesCount} {zonesCount === 1 ? 'zona' : 'zonas'}</span>
                      </button>
                    </td>
                    <td className="px-4 py-2.5 text-center whitespace-nowrap">
                      {warehouse.validateStock ? (
                        <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold uppercase">
                          Validado
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded-full text-[10px] font-bold uppercase">
                          No Validado
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onEdit(warehouse)}
                          title="Editar almacén"
                          className="p-1.5 bg-blue-50 text-[#004A99] hover:bg-[#004A99] hover:text-white rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(warehouse.id)}
                          title="Eliminar almacén"
                          className="p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredWarehouses.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-14 bg-white">
                    <Building2 className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-400">No se encontraron almacenes registrados</p>
                    {warehouses.length === 0 && (
                      <button type="button" onClick={onNew} className="text-[#004A99] font-bold uppercase text-xs mt-2 hover:underline cursor-pointer">
                        Comenzar ahora
                      </button>
                    )}
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
