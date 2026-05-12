import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { PlusCircle, Trash2, Save, Building2, Calendar, RefreshCw, FileSpreadsheet } from 'lucide-react';
import { formatNumber } from '../../lib/utils';

interface ExchangeRate {
  id: string;
  date: string;
  buy_rate: number | string;
  sell_rate: number | string;
}

interface ExchangeRateModuleProps {
  token?: string | null;
  exchangeRates: ExchangeRate[];
  onDelete: (id: string) => void;
  onSave: (data: { date: string, buy_rate: string, sell_rate: string }) => Promise<void>;
  loading: boolean;
}

export const ExchangeRateModule: React.FC<ExchangeRateModuleProps> = ({ 
  token,
  exchangeRates, 
  onDelete, 
  onSave,
  loading 
}) => {
  const currentDate = new Date();
  const [filterYear, setFilterYear] = useState(currentDate.getFullYear());
  const [filterMonth, setFilterMonth] = useState(currentDate.getMonth());
  const [selectedRateId, setSelectedRateId] = useState<string | null>(null);
  const [isFetchingSunat, setIsFetchingSunat] = useState(false);

  const [formData, setFormData] = useState({
    date: currentDate.toISOString().split('T')[0],
    buy: '',
    sell: ''
  });

  const filteredRates = useMemo(() => {
    return exchangeRates.filter(rate => {
      const d = new Date(rate.date + (String(rate.date).includes('T') ? '' : 'T12:00:00'));
      return d.getFullYear() === filterYear && d.getMonth() === filterMonth;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [exchangeRates, filterYear, filterMonth]);

  const handleRowClick = (rate: ExchangeRate) => {
    setSelectedRateId(rate.id);
    const d = new Date(rate.date + (String(rate.date).includes('T') ? '' : 'T12:00:00'));
    setFormData({
      date: d.toISOString().split('T')[0],
      buy: formatNumber(rate.buy_rate, 3),
      sell: formatNumber(rate.sell_rate, 3)
    });
  };

  const handleNew = () => {
    setSelectedRateId(null);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      buy: '',
      sell: ''
    });
  };

  const fetchFromSunat = async () => {
    setIsFetchingSunat(true);
    try {
      const res = await fetch('/api/exchange-rates/fetch-sunat', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      
      if (res.ok && data.compra) {
        setFormData(prev => ({ 
          ...prev, 
          buy: data.compra.toString(), 
          sell: data.venta.toString() 
        }));
      } else {
        alert(data.error || "No se pudo obtener el tipo de cambio.");
      }
    } catch (err) {
      alert("Error de conexión al consultar el servidor.");
    } finally { setIsFetchingSunat(false); }
  };

  const executeSave = async () => {
    if (!formData.buy || !formData.sell) {
      alert("Por favor, ingrese los valores de compra y venta.");
      return;
    }
    await onSave({
      date: formData.date,
      buy_rate: formData.buy,
      sell_rate: formData.sell
    });
  };

  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const years = [2024, 2025, 2026, 2027, 2028];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col h-[calc(100vh-140px)] gap-4">
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-6 shrink-0">
        <div className="flex items-center gap-2 text-blue-600 bg-blue-50 px-4 py-2 rounded-xl">
          <Calendar className="w-5 h-5" />
          <span className="font-black uppercase tracking-widest text-xs">Filtro de Búsquedas</span>
        </div>
        <div className="flex items-center gap-4">
          <select value={filterYear} onChange={e => setFilterYear(parseInt(e.target.value))} className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-sm outline-none focus:border-blue-500 bg-slate-50">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={filterMonth} onChange={e => setFilterMonth(parseInt(e.target.value))} className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-sm outline-none focus:border-blue-500 bg-slate-50">
            {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
        <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-100 flex justify-between items-center shrink-0">
            <h3 className="font-black text-slate-700 flex items-center gap-2 text-sm uppercase tracking-widest"><FileSpreadsheet className="w-4 h-4 text-blue-500" /> Resultado de Búsquedas</h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase">{filteredRates.length} Registros</span>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800 text-white sticky top-0 z-10 text-[10px] uppercase tracking-widest">
                <tr>
                  <th className="px-6 py-3 font-bold border-r border-slate-700">Fecha</th>
                  <th className="px-6 py-3 font-bold border-r border-slate-700 text-center">Compra</th>
                  <th className="px-6 py-3 font-bold border-r border-slate-700 text-center">Venta</th>
                  <th className="px-6 py-3 font-bold">Usuario</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRates.map((ex) => (
                  <tr key={ex.id} onClick={() => handleRowClick(ex)} className={`cursor-pointer transition-colors ${selectedRateId === ex.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'hover:bg-slate-50 border-l-4 border-l-transparent'}`}>
                    <td className="px-6 py-3 font-bold text-slate-700 border-r border-slate-100">{new Date(ex.date + (String(ex.date).includes('T') ? '' : 'T12:00:00')).toLocaleDateString()}</td>
                    <td className="px-6 py-3 text-center font-black text-emerald-600 border-r border-slate-100">{formatNumber(ex.buy_rate, 4)}</td>
                    <td className="px-6 py-3 text-center font-black text-blue-600 border-r border-slate-100">{formatNumber(ex.sell_rate, 4)}</td>
                    <td className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Admin</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-slate-50 p-4 border-t border-slate-200 shrink-0 flex flex-wrap justify-between items-center gap-4">
            <button onClick={fetchFromSunat} disabled={isFetchingSunat} className="bg-white border border-slate-200 hover:border-blue-500 hover:text-blue-600 text-slate-700 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-sm">
              <Building2 className="w-4 h-4 text-red-600" />
              {isFetchingSunat ? 'Cargando...' : 'Obtener SUNAT'}
            </button>
            <div className="flex gap-3">
              <button onClick={handleNew} className="bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-sm transition-all"><PlusCircle className="w-4 h-4" /> Agregar</button>
              <button onClick={() => selectedRateId && onDelete(selectedRateId)} disabled={!selectedRateId} className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"><Trash2 className="w-4 h-4" /> Eliminar</button>
            </div>
          </div>
        </div>

        <div className="w-full lg:w-80 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col shrink-0">
          <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-100 shrink-0">
            <h3 className="font-black text-slate-700 text-sm uppercase tracking-widest">Datos del Registro</h3>
          </div>
          <div className="p-6 space-y-6 flex-1 overflow-auto">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha de Cambio</label>
              <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full px-4 py-3 rounded-2xl border-2 border-slate-100 font-bold text-slate-700 focus:border-blue-500 outline-none transition-all bg-slate-50" />
            </div>
            <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100 space-y-5">
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-b border-slate-200 pb-2">Valores Oficiales</p>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 ml-1">Compra (S/)</label>
                <input type="number" step="0.0001" value={formData.buy} onChange={e => setFormData({...formData, buy: e.target.value})} className="w-full px-4 py-3 rounded-2xl border-2 border-emerald-100 font-black text-emerald-700 focus:border-emerald-500 outline-none transition-all bg-white text-right" placeholder="0.000" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 ml-1">Venta (S/)</label>
                <input type="number" step="0.0001" value={formData.sell} onChange={e => setFormData({...formData, sell: e.target.value})} className="w-full px-4 py-3 rounded-2xl border-2 border-blue-100 font-black text-blue-700 focus:border-blue-500 outline-none transition-all bg-white text-right" placeholder="0.000" />
              </div>
            </div>
          </div>
          <div className="p-6 border-t border-slate-100 bg-slate-50/50">
            <button onClick={executeSave} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-100 transition-all flex items-center justify-center gap-3 disabled:bg-blue-300">
              {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Guardar Cambios
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
