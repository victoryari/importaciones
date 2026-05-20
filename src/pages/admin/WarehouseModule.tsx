import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, Plus, Trash2, Edit2, MapPin, 
  ChevronRight, ChevronDown, Layers, Grid,
  Info, ShieldCheck, Activity, Phone
} from 'lucide-react';

interface Warehouse {
  id: number;
  code?: string;
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
  const [expandedWarehouses, setExpandedWarehouses] = useState<number[]>([]);

  const toggleWarehouse = (id: number) => {
    setExpandedWarehouses(prev => 
      prev.includes(id) ? prev.filter(wId => wId !== id) : [...prev, id]
    );
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-xl font-black text-slate-800">Gestión de Almacenes</h3>
            <p className="text-sm text-slate-500 font-medium">Control jerárquico de ubicaciones y zonas de almacenamiento</p>
          </div>
          <button 
            onClick={onNew}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" /> Nuevo Almacén
          </button>
        </div>

        <div className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white/50">
            <h4 className="font-bold text-slate-700 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-500" />
              Listado de Almacenes / Sedes
            </h4>
          </div>

          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/50 border-b border-slate-100 text-[10px] uppercase tracking-wider font-black text-slate-400">
              <tr>
                <th className="w-12 px-6 py-4"></th>
                <th className="px-6 py-4">Código / Nombre</th>
                <th className="px-6 py-4">Dirección y RUC</th>
                <th className="px-6 py-4 text-center">Pisos</th>
                <th className="px-6 py-4">Stock</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {warehouses.map((warehouse) => {
                const isExpanded = expandedWarehouses.includes(warehouse.id);
                return (
                  <React.Fragment key={warehouse.id}>
                    <tr className="border-b border-slate-100 last:border-0 hover:bg-white transition-colors cursor-pointer" onClick={() => toggleWarehouse(warehouse.id)}>
                      <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={() => toggleWarehouse(warehouse.id)}
                          className={`p-1 rounded-lg transition-colors ${isExpanded ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:bg-slate-100'}`}
                        >
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase tracking-tighter">{warehouse.code || 'S/C'}</span>
                          <span className="font-bold text-slate-800">{warehouse.name}</span>
                          {warehouse.type && (
                            <span className="text-[9px] font-black bg-blue-600 text-white px-2 py-0.5 rounded-full uppercase tracking-widest">{warehouse.type}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs text-slate-600 font-medium flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-400" /> {warehouse.address || 'Sin dirección'}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">RUC: {warehouse.ruc || '---'}</div>
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-slate-700">
                        {warehouse.floors?.length || 0}
                      </td>
                      <td className="px-6 py-4">
                        {warehouse.validateStock ? (
                          <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[9px] font-black uppercase tracking-wider">Validado</span>
                        ) : (
                          <span className="px-2.5 py-0.5 bg-slate-200 text-slate-600 rounded-full text-[9px] font-black uppercase tracking-wider">No Validado</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => onEdit(warehouse)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><Edit2 className="w-4.5 h-4.5" /></button>
                          <button onClick={() => onDelete(warehouse.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 className="w-4.5 h-4.5" /></button>
                        </div>
                      </td>
                    </tr>
                    
                    {/* Fila expandible con el detalle jerárquico */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={6} className="bg-slate-50/50 p-6 border-b border-slate-100">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {warehouse.floors && warehouse.floors.length > 0 ? (
                              warehouse.floors.map(floor => (
                                <div key={floor.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-50">
                                    <Layers className="w-4 h-4 text-blue-500" />
                                    <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{floor.code}</span>
                                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-tight">{floor.name}</h4>
                                  </div>
                                  
                                  <div className="space-y-1.5">
                                    {floor.zones && floor.zones.length > 0 ? (
                                      floor.zones.map((zone: any) => (
                                        <div key={zone.id} className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                                          <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                            <span className="text-xs font-semibold text-slate-600">{zone.name}</span>
                                          </div>
                                          <span className="text-[9px] font-black text-slate-300 tracking-tighter uppercase">{zone.code}</span>
                                        </div>
                                      ))
                                    ) : (
                                      <p className="text-[10px] text-slate-300 italic font-bold py-1">Sin zonas configuradas</p>
                                    )}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="col-span-full py-6 text-center">
                                <Grid className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                                <p className="text-xs text-slate-400 font-bold">No hay una estructura jerárquica configurada aún.</p>
                                <button onClick={() => onEdit(warehouse)} className="text-blue-600 text-xs font-black uppercase tracking-widest mt-2 hover:underline">Configurar ahora</button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {warehouses.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-24 bg-white rounded-b-2xl border-t border-slate-100">
                    <Building2 className="w-16 h-16 text-slate-100 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-slate-400">No hay almacenes registrados</h3>
                    <button onClick={onNew} className="text-blue-600 font-black uppercase text-xs tracking-widest mt-4 hover:underline">Comenzar ahora</button>
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
