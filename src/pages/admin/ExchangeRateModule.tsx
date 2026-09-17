import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { PlusCircle, Trash2, Save, Building2, Calendar, RefreshCw, FileSpreadsheet, Plus } from 'lucide-react';
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
  isActive?: boolean;
}

export const ExchangeRateModule: React.FC<ExchangeRateModuleProps> = ({ 
  token,
  exchangeRates, 
  onDelete, 
  onSave,
  loading,
  isActive = true
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

  React.useEffect(() => {
    if (!isActive) {
      handleNew();
    }
  }, [isActive]);

  const fetchFromSunat = async () => {
    setIsFetchingSunat(true);
    try {
      const res = await fetch(`/api/exchange-rates/fetch-sunat?date=${formData.date}`, {
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
    handleNew();
  };

  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const years = [2024, 2025, 2026, 2027, 2028];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col h-[calc(100vh-140px)] gap-2.5">
      {/* Filtros Superiores */}
      <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-50 text-blue-800 rounded">
            <Calendar className="w-4 h-4" />
          </div>
          <span className="font-bold uppercase tracking-tight text-xs text-slate-700">Filtro por Período</span>
        </div>

        <div className="flex items-center gap-2">
          <select 
            value={filterYear} 
            onChange={e => setFilterYear(parseInt(e.target.value))} 
            className="h-8 px-3 rounded border border-slate-300 font-bold text-xs outline-none focus:border-blue-500 bg-white"
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select 
            value={filterMonth} 
            onChange={e => setFilterMonth(parseInt(e.target.value))} 
            className="h-8 px-3 rounded border border-slate-300 font-bold text-xs outline-none focus:border-blue-500 bg-white"
          >
            {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-2.5 flex-1 min-h-0">
        {/* Tabla de Registros */}
        <div className="flex-1 bg-white rounded-lg border border-slate-200 shadow-2xs flex flex-col overflow-hidden">
          <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex justify-between items-center shrink-0">
            <h3 className="font-bold text-slate-800 flex items-center gap-1.5 text-xs uppercase tracking-tight">
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-700" /> Historial de Tipos de Cambio
            </h3>
            <span className="text-[10px] font-bold text-slate-500 uppercase">{filteredRates.length} Registros</span>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-2.5 border-r border-slate-200">Fecha</th>
                  <th className="px-4 py-2.5 border-r border-slate-200 text-center">Compra (S/)</th>
                  <th className="px-4 py-2.5 border-r border-slate-200 text-center">Venta (S/)</th>
                  <th className="px-4 py-2.5 text-center">Usuario</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredRates.map((ex) => (
                  <tr 
                    key={ex.id} 
                    onClick={() => handleRowClick(ex)} 
                    className={`cursor-pointer transition-colors ${selectedRateId === ex.id ? 'bg-blue-100/60 border-l-4 border-l-blue-700 font-bold' : 'hover:bg-slate-50 border-l-4 border-l-transparent'}`}
                  >
                    <td className="px-4 py-2 font-mono text-slate-800 border-r border-slate-100">{new Date(ex.date + (String(ex.date).includes('T') ? '' : 'T12:00:00')).toLocaleDateString()}</td>
                    <td className="px-4 py-2 text-center font-mono font-bold text-emerald-700 border-r border-slate-100">{formatNumber(ex.buy_rate, 4)}</td>
                    <td className="px-4 py-2 text-center font-mono font-bold text-blue-800 border-r border-slate-100">{formatNumber(ex.sell_rate, 4)}</td>
                    <td className="px-4 py-2 text-center text-[10px] font-bold text-slate-500 uppercase">Admin</td>
                  </tr>
                ))}
                {filteredRates.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400 italic">No hay registros de tipo de cambio para este mes</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-slate-100 px-4 py-2 border-t border-slate-200 shrink-0 flex flex-wrap justify-between items-center gap-2">
            <button 
              type="button"
              onClick={fetchFromSunat} 
              disabled={isFetchingSunat} 
              className="h-8 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 px-3 rounded text-xs font-bold uppercase flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5 text-blue-700" />
              {isFetchingSunat ? 'Consultando...' : 'Obtener de SUNAT'}
            </button>

            <div className="flex gap-2">
              <button 
                type="button"
                onClick={handleNew} 
                className="h-8 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 px-3 rounded text-xs font-bold uppercase flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Nuevo Registro
              </button>
              <button 
                type="button"
                onClick={() => selectedRateId && onDelete(selectedRateId)} 
                disabled={!selectedRateId} 
                className="h-8 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 px-3 rounded text-xs font-bold uppercase flex items-center gap-1 transition-colors disabled:opacity-40 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Eliminar
              </button>
            </div>
          </div>
        </div>

        {/* Panel Lateral de Registro / Edición */}
        <div className="w-full lg:w-80 bg-white rounded-lg border border-slate-200 shadow-2xs flex flex-col shrink-0">
          <div className="bg-[#004A99] px-4 py-2 text-white flex items-center justify-between rounded-t-lg shrink-0">
            <h3 className="font-bold text-xs uppercase tracking-tight">Datos del Registro</h3>
          </div>

          <div className="p-3 space-y-3 flex-1 overflow-auto bg-slate-50/60">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-600 uppercase">Fecha de Cambio</label>
              <input 
                type="date" 
                value={formData.date} 
                onChange={e => setFormData({...formData, date: e.target.value})} 
                className="h-8 w-full px-2 rounded border border-slate-300 font-medium text-xs text-slate-800 focus:border-blue-500 outline-none bg-white" 
              />
            </div>

            <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-2">
              <p className="text-[10px] font-bold text-blue-900 uppercase border-b border-slate-100 pb-1">Valores Oficiales</p>
              
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600 uppercase">Compra (S/)</label>
                <input 
                  type="number" 
                  step="0.0001" 
                  value={formData.buy} 
                  onChange={e => setFormData({...formData, buy: e.target.value})} 
                  className="h-8 w-full px-2 rounded border border-emerald-300 font-bold font-mono text-emerald-800 focus:border-emerald-600 outline-none bg-emerald-50/50 text-right text-xs" 
                  placeholder="0.0000" 
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600 uppercase">Venta (S/)</label>
                <input 
                  type="number" 
                  step="0.0001" 
                  value={formData.sell} 
                  onChange={e => setFormData({...formData, sell: e.target.value})} 
                  className="h-8 w-full px-2 rounded border border-blue-300 font-bold font-mono text-blue-900 focus:border-blue-600 outline-none bg-blue-50/50 text-right text-xs" 
                  placeholder="0.0000" 
                />
              </div>
            </div>
          </div>

          <div className="p-3 border-t border-slate-200 bg-slate-100/90 rounded-b-lg">
            <button 
              type="button"
              onClick={executeSave} 
              disabled={loading} 
              className="w-full h-8 bg-[#004A99] hover:bg-blue-800 text-white font-bold text-xs uppercase rounded flex items-center justify-center gap-1.5 transition-colors shadow-md disabled:opacity-50 cursor-pointer"
            >
              {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Guardar Tipo de Cambio
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
