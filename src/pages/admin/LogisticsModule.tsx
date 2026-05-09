import React from 'react';
import { motion } from 'motion/react';
import { Building2, MapPin, PlusCircle, Trash2, Edit2 } from 'lucide-react';

interface LogisticsModuleProps {
  logisticsTab: 'agencies' | 'zones';
  setLogisticsTab: (tab: 'agencies' | 'zones') => void;
  shippingAgencies: any[];
  shippingZones: any[];
  openEditModal: (item: any) => void;
  handleDelete: (type: string, id: string) => void;
}

export const LogisticsModule: React.FC<LogisticsModuleProps> = ({
  logisticsTab,
  setLogisticsTab,
  shippingAgencies,
  shippingZones,
  openEditModal,
  handleDelete
}) => {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-xl font-black text-slate-800">Módulo de Logística</h3>
            <p className="text-sm text-slate-500">Gestiona agencias de transporte y zonas de entrega</p>
          </div>
          <div className="flex bg-slate-100 p-1.5 rounded-2xl">
            <button onClick={() => setLogisticsTab('agencies')} className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${logisticsTab === 'agencies' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              <Building2 className="w-4 h-4" /> Agencias
            </button>
            <button onClick={() => setLogisticsTab('zones')} className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${logisticsTab === 'zones' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              <MapPin className="w-4 h-4" /> Zonas
            </button>
          </div>
        </div>

        <div className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white/50">
            <h4 className="font-bold text-slate-700 flex items-center gap-2">
              {logisticsTab === 'agencies' ? <Building2 className="w-5 h-5 text-blue-500" /> : <MapPin className="w-5 h-5 text-blue-500" />}
              {logisticsTab === 'agencies' ? 'Listado de Agencias' : 'Zonas de Entrega'}
            </h4>
            <button 
              onClick={() => openEditModal(null)} 
              className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-blue-700 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              {logisticsTab === 'agencies' ? 'Nueva Agencia' : 'Nueva Zona'}
            </button>
          </div>

          <table className="w-full text-left">
            <thead className="bg-slate-50/50 border-b border-slate-100 text-[10px] uppercase tracking-wider font-black text-slate-400">
              <tr>
                <th className="px-6 py-4">Nombre / Descripción</th>
                {logisticsTab === 'agencies' && <th className="px-6 py-4">Contacto</th>}
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {(logisticsTab === 'agencies' ? shippingAgencies : shippingZones).map((item: any) => (
                <tr key={item.id} className="border-b border-slate-100 last:border-0 hover:bg-white transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-800">{item.name}</div>
                    <div className="text-[10px] text-slate-400 font-medium">{item.description || 'Sin descripción adicional'}</div>
                  </td>
                  {logisticsTab === 'agencies' && <td className="px-6 py-4 font-bold text-slate-600">{item.contact_info || '-'}</td>}
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black uppercase">Activo</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEditModal(item)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(logisticsTab === 'agencies' ? 'shipping-agencies' : 'shipping-zones', item.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};
