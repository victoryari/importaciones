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
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-2xl">
              <Building2 className="w-7 h-7 text-indigo-600" />
            </div>
            Gestión de Almacenes
          </h2>
          <p className="text-slate-500 font-medium ml-12">Control jerárquico de ubicaciones y zonas</p>
        </div>
        <button 
          onClick={onNew}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-lg shadow-indigo-100 font-black uppercase text-xs tracking-wider"
        >
          <Plus className="w-5 h-5" /> Nuevo Almacén
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {warehouses.map((warehouse) => (
          <div key={warehouse.id} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden transition-all hover:border-indigo-200">
            {/* Cabecera del Almacén */}
            <div className="p-5 flex items-center justify-between group">
              <div className="flex items-center gap-4 flex-1 cursor-pointer" onClick={() => toggleWarehouse(warehouse.id)}>
                <div className={`p-1 rounded-lg transition-colors ${expandedWarehouses.includes(warehouse.id) ? 'bg-indigo-100 text-indigo-600' : 'text-slate-300'}`}>
                  {expandedWarehouses.includes(warehouse.id) ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </div>
                
                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-indigo-600 border border-slate-100 group-hover:bg-indigo-50 transition-colors">
                  <Building2 className="w-6 h-6" />
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-xs font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase tracking-tighter">{warehouse.code || 'S/C'}</span>
                    <h3 className="text-lg font-black text-slate-800">{warehouse.name}</h3>
                    {warehouse.type && (
                      <span className="text-[10px] font-black bg-indigo-600 text-white px-2 py-0.5 rounded-full uppercase tracking-widest">{warehouse.type}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {warehouse.address || 'Sin dirección'}</span>
                    <span className="flex items-center gap-1"><Info className="w-3 h-3" /> RUC: {warehouse.ruc || '---'}</span>
                  </div>
                </div>

                <div className="flex gap-4 px-8 border-x border-slate-50">
                  <div className="text-center">
                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Pisos</p>
                    <p className="text-sm font-black text-slate-700">{warehouse.floors?.length || 0}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Stock</p>
                    <p className="text-sm font-black text-emerald-600">Validado</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 ml-4">
                <button onClick={() => onEdit(warehouse)} className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all"><Edit2 className="w-5 h-5" /></button>
                <button onClick={() => onDelete(warehouse.id)} className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all"><Trash2 className="w-5 h-5" /></button>
              </div>
            </div>

            {/* Detalle Jerárquico (Acordeón) */}
            <AnimatePresence>
              {expandedWarehouses.includes(warehouse.id) && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }} 
                  animate={{ height: 'auto', opacity: 1 }} 
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-slate-50/50 border-t border-slate-100"
                >
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {warehouse.floors && warehouse.floors.length > 0 ? (
                      warehouse.floors.map(floor => (
                        <div key={floor.id} className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
                          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-50">
                            <Layers className="w-4 h-4 text-indigo-500" />
                            <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{floor.code}</span>
                            <h4 className="text-sm font-black text-slate-700 uppercase tracking-tight">{floor.name}</h4>
                          </div>
                          
                          <div className="space-y-2">
                            {floor.zones && floor.zones.length > 0 ? (
                              floor.zones.map((zone: any) => (
                                <div key={zone.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors">
                                  <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                                    <span className="text-xs font-bold text-slate-600">{zone.name}</span>
                                  </div>
                                  <span className="text-[10px] font-black text-slate-300 tracking-tighter uppercase">{zone.code}</span>
                                </div>
                              ))
                            ) : (
                              <p className="text-[10px] text-slate-300 italic font-bold py-2">Sin zonas configuradas</p>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-full py-8 text-center">
                        <Grid className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                        <p className="text-sm text-slate-400 font-bold">No hay una estructura jerárquica configurada aún.</p>
                        <button onClick={() => onEdit(warehouse)} className="text-indigo-600 text-xs font-black uppercase tracking-widest mt-2 hover:underline">Configurar ahora</button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}

        {warehouses.length === 0 && (
          <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-slate-200">
            <Building2 className="w-16 h-16 text-slate-100 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-400">No hay almacenes registrados</h3>
            <button onClick={onNew} className="text-indigo-600 font-black uppercase text-xs tracking-widest mt-4">Comenzar ahora</button>
          </div>
        )}
      </div>
    </div>
  );
};
