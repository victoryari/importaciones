import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'motion/react';
import { 
  BarChart3, Search, Package, AlertTriangle, X, 
  ArrowUpRight, ArrowDownLeft, Edit2, Filter, 
  ChevronRight, RefreshCcw, Download, ArrowRightLeft,
  History, Boxes, Calendar, FileText, MapPin, Lock,
  FileInput, FileOutput, Plus
} from 'lucide-react';
import { formatNumber, ENTRY_NOTE_STATUSES } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { EntryNoteList } from './forms/EntryNoteList';
import { EntryNoteForm } from './forms/EntryNoteForm';

interface Product {
  id: number;
  code?: string;
  name: string;
  stock: number;
  images?: string[];
  category?: { name: string };
  unit?: { name?: string; symbol?: string };
  package?: { name?: string; symbol?: string };
  subPackage?: { name?: string; symbol?: string };
  quantityPerPackage?: number;
  quantityPerSubPackage?: number;
  isActive: boolean;
}

interface InventoryModuleProps {
  products: Product[];
  stockDetails: any[];
  movements: any[];
  onUpdateStock: (productId: number, newStock: number) => void;
  onEdit: (product: Product) => void;
  onOpenAssistant?: () => void;
  token?: string;
  onRefresh?: () => void;
}

export const InventoryModule: React.FC<InventoryModuleProps> = ({
  products,
  stockDetails,
  movements,
  onUpdateStock,
  onEdit,
  onOpenAssistant,
  token,
  onRefresh
}) => {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission?.('WRITE_INVENTORY') || hasPermission?.('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'stock' | 'history' | 'entryNotes' | 'exitNotes'>('stock');
  const [entryNotes, setEntryNotes] = useState<any[]>([]);
  const [loadingEntryNotes, setLoadingEntryNotes] = useState(false);
  const [entryNotesError, setEntryNotesError] = useState<string | null>(null);
  const [isEntryNoteFormOpen, setIsEntryNoteFormOpen] = useState(false);
  const [editingEntryNote, setEditingEntryNote] = useState<any>(null);

  useEffect(() => {
    if (activeSubTab === 'entryNotes' && token) {
      loadEntryNotes();
    }
  }, [activeSubTab, token]);

  const loadEntryNotes = async () => {
    setLoadingEntryNotes(true);
    setEntryNotesError(null);
    try {
      const res = await axios.get('/api/entry-notes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEntryNotes(Array.isArray(res.data) ? res.data : []);
    } catch (error: any) {
      const msg = error.response?.data?.error || error.message || 'Error desconocido';
      setEntryNotesError(msg);
      setEntryNotes([]);
    } finally {
      setLoadingEntryNotes(false);
    }
  };

  const handleNewEntryNote = () => {
    setEditingEntryNote(null);
    setIsEntryNoteFormOpen(true);
  };

  const handleEditEntryNote = (note: any) => {
    setEditingEntryNote(note);
    setIsEntryNoteFormOpen(true);
  };

  const handleCloseEntryNoteForm = () => {
    setIsEntryNoteFormOpen(false);
    setEditingEntryNote(null);
  };

  const handleDeleteEntryNote = async (id: number) => {
    if (!window.confirm('¿Está seguro de eliminar esta nota de ingreso?')) return;
    try {
      await axios.delete(`/api/entry-notes/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      loadEntryNotes();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error al eliminar nota de ingreso');
    }
  };

  const handleApproveEntryNote = async (id: number) => {
    if (!window.confirm('¿Está seguro de aprobar esta nota de ingreso? Se actualizará el stock.')) return;
    try {
      await axios.post(`/api/entry-notes/${id}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      loadEntryNotes();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error al aprobar nota de ingreso');
    }
  };

  const handleAnnulEntryNote = async (id: number) => {
    if (!window.confirm('¿Está seguro de anular esta nota de ingreso? Se revertirá el stock.')) return;
    try {
      await axios.post(`/api/entry-notes/${id}/annul`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      loadEntryNotes();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error al anular nota de ingreso');
    }
  };

  const stats = {
    total: products.length,
    lowStock: products.filter(p => p.stock > 0 && p.stock <= 10).length,
    outOfStock: products.filter(p => p.stock <= 0).length,
  };

  const filteredStock = stockDetails.filter(s => 
    s.product?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.product?.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.warehouse?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.zone?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredMovements = movements.filter(m => 
    (m.product?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.observation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.lotNumber?.toLowerCase().includes(searchTerm.toLowerCase())) &&
    m.status !== 'ANNULLED'
  );

  const handleAnnul = async (movementId: number) => {
    if (!window.confirm('¿Está seguro de anular este movimiento? Esta acción revertirá el stock a su estado anterior.')) return;
    try {
      await axios.post(`/api/movements/${movementId}/annul`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (onRefresh) onRefresh();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error al anular movimiento');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="space-y-8"
    >
      {/* Tab Switcher Interno */}
      <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm w-fit flex-wrap">
        <button 
          onClick={() => setActiveSubTab('stock')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all ${activeSubTab === 'stock' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Boxes className="w-4 h-4" />
          STOCK ACTUAL
        </button>
        <button 
          onClick={() => setActiveSubTab('history')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all ${activeSubTab === 'history' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <History className="w-4 h-4" />
          HISTORIAL
        </button>
        <button 
          onClick={() => setActiveSubTab('entryNotes')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all ${activeSubTab === 'entryNotes' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <FileInput className="w-4 h-4" />
          NOTAS DE INGRESO
        </button>
        <button 
          onClick={() => setActiveSubTab('exitNotes')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all ${activeSubTab === 'exitNotes' ? 'bg-red-600 text-white shadow-lg shadow-red-100' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <FileOutput className="w-4 h-4" />
          NOTAS DE SALIDA
        </button>
      </div>

      {activeSubTab === 'stock' && (
        <>
          {/* Stock Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-8 rounded-4xl border border-slate-200 shadow-sm flex items-center gap-6">
              <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
                <Package className="w-7 h-7" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total SKU</p>
                <p className="text-3xl font-black text-slate-900">{stats.total}</p>
              </div>
            </div>

            <div className="bg-white p-8 rounded-4xl border border-slate-200 shadow-sm flex items-center gap-6">
              <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Stock Bajo</p>
                <p className="text-3xl font-black text-amber-600">{stats.lowStock}</p>
              </div>
            </div>

            <div className="bg-white p-8 rounded-4xl border border-slate-200 shadow-sm flex items-center gap-6">
              <div className="w-14 h-14 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center">
                <X className="w-7 h-7" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Agotados</p>
                <p className="text-3xl font-black text-red-600">{stats.outOfStock}</p>
              </div>
            </div>
          </div>

          {/* Main Table Container */}
          <div className="bg-white rounded-4xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Buscar por producto o almacén..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all outline-none"
                />
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto">
                {canWrite ? (
                  <button 
                    onClick={onOpenAssistant}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase flex items-center gap-2 px-6 py-3 rounded-2xl shadow-lg shadow-blue-100 transition-all hover:-translate-y-0.5"
                  >
                    <ArrowRightLeft className="w-4 h-4" />
                    Asistente de Movimientos
                  </button>
                ) : (
                  <div className="flex items-center gap-2 bg-slate-100 text-slate-400 text-xs font-black uppercase px-6 py-3 rounded-2xl cursor-not-allowed">
                    <Lock className="w-4 h-4" />
                    Asistente de Movimientos
                  </div>
                )}
                <button className="text-xs font-black uppercase text-blue-600 hover:text-blue-700 flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-blue-50 transition-all">
                  <Download className="w-4 h-4" />
                  Exportar Inventario
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Producto</th>
                    <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Almacén / Zona</th>
                    <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400 text-center">Cantidad</th>
                    <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400 text-right">Lote</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredStock.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center">
                            {s.product?.images?.[0] ? (
                              <img src={s.product.images[0]} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Package className="w-5 h-5 text-slate-300" />
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900">{s.product?.name}</span>
                            <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{s.product?.code || 'SIN CODIGO'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg w-fit">{s.warehouse?.name}</span>
                          {s.zone && (
                            <span className="text-[10px] text-slate-400 uppercase font-black mt-1 ml-1 flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {s.zone.name}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className="text-xl font-black text-slate-900">
                            {formatNumber(s.quantity, 0)}
                          </span>
                          <span className="text-[10px] text-blue-700 font-black uppercase tracking-tight">
                            {s.product?.package?.name || s.product?.package?.symbol || s.product?.subPackage?.name || s.product?.unit?.name || s.product?.unit?.symbol || 'CAJ'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-3 py-1 rounded-full uppercase tracking-tighter">
                          {s.lotNumber || 'SIN LOTE'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredStock.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-20 text-center text-slate-400 italic">No hay stock registrado en ubicaciones</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeSubTab === 'history' && (
        <div className="bg-white rounded-4xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <div className="relative w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="text"
                placeholder="Filtrar historial..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:border-blue-500 outline-none"
              />
            </div>
            {canWrite ? (
              <button 
                onClick={onOpenAssistant}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase flex items-center gap-2 px-6 py-3 rounded-2xl shadow-lg shadow-blue-100 transition-all hover:-translate-y-0.5"
              >
                <PlusCircle className="w-4 h-4" />
                Nuevo Movimiento
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-slate-100 text-slate-400 text-xs font-black uppercase px-6 py-3 rounded-2xl cursor-not-allowed">
                <Lock className="w-4 h-4" />
                Nuevo Movimiento
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Fecha</th>
                  <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Tipo</th>
                  <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Producto</th>
                  <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Ruta / Almacén</th>
                  <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400 text-center">Cant.</th>
                  <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Glosa / Observación</th>
                  <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredMovements.map((mov) => (
                  <tr key={mov.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-700">{new Date(mov.createdAt).toLocaleDateString()}</span>
                        <span className="text-[10px] text-slate-400 font-bold">{new Date(mov.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                        mov.type === 'INPUT' ? 'bg-emerald-100 text-emerald-700' :
                        mov.type === 'OUTPUT' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {mov.type === 'INPUT' ? 'INGRESO' : mov.type === 'OUTPUT' ? 'SALIDA' : 'TRANSFER.'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-900">{mov.product?.name}</span>
                        <span className="text-[10px] text-slate-400 font-black italic">{mov.lotNumber ? `Lote: ${mov.lotNumber}` : 'Sin Lote'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          {mov.fromWarehouse && (
                            <div className="flex flex-col">
                              <span className="text-[10px] font-black bg-slate-100 px-2 py-1 rounded-lg text-slate-600">{mov.fromWarehouse.name}</span>
                              {mov.fromZone && <span className="text-[9px] text-slate-400 font-bold ml-1">📍 {mov.fromZone.name}</span>}
                            </div>
                          )}
                          {(mov.fromWarehouse && mov.toWarehouse) && <ArrowRightLeft className="w-3 h-3 text-slate-300" />}
                          {mov.toWarehouse && (
                            <div className="flex flex-col">
                              <span className="text-[10px] font-black bg-blue-50 px-2 py-1 rounded-lg text-blue-600">{mov.toWarehouse.name}</span>
                              {mov.toZone && <span className="text-[9px] text-blue-400 font-bold ml-1">📍 {mov.toZone.name}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm font-black text-slate-800">{mov.quantity}</span>
                    </td>
                    <td className="px-6 py-4">
                      <p className={`text-[11px] font-medium italic truncate max-w-xs ${mov.status === 'ANNULLED' ? 'text-red-400 line-through' : 'text-slate-500'}`}>
                        {mov.status === 'ANNULLED' ? `[ANULADO] ${mov.observation}` : mov.observation}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {mov.status !== 'ANNULLED' && canWrite && (
                        <button 
                          onClick={() => handleAnnul(mov.id)}
                          className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors group/btn"
                          title="Anular Movimiento"
                        >
                          <X className="w-4 h-4 group-hover/btn:scale-110" />
                        </button>
                      )}
                      {mov.status !== 'ANNULLED' && !canWrite && (
                        <Lock className="w-4 h-4 text-slate-300 mx-auto" />
                      )}
                    </td>
                  </tr>
                ))}
                {filteredMovements.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-20 text-center text-slate-400 italic">No hay movimientos registrados</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'entryNotes' && (
        <div className="relative min-h-[600px]">
          {entryNotesError ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-4xl border border-red-200 shadow-sm">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-10 h-10 text-red-500" />
              </div>
              <h3 className="text-xl font-black text-red-600 mb-2">Error al cargar notas de ingreso</h3>
              <p className="text-sm text-red-400 font-medium mb-4 max-w-md text-center">{entryNotesError}</p>
              <p className="text-xs text-slate-400 mb-6">Si el servidor no tiene los endpoints actualizados, reinicia el servidor backend.</p>
              <button onClick={loadEntryNotes} className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-colors">
                <RefreshCcw className="w-4 h-4" /> Reintentar
              </button>
            </div>
          ) : !isEntryNoteFormOpen ? (
                <EntryNoteList
                  notes={entryNotes}
                  loading={loadingEntryNotes}
                  canWrite={canWrite}
                  onNew={handleNewEntryNote}
                  onEdit={handleEditEntryNote}
                  onDelete={handleDeleteEntryNote}
                  onApprove={handleApproveEntryNote}
                  onAnnul={handleAnnulEntryNote}
                  onRefresh={loadEntryNotes}
                />
              ) : (
                <EntryNoteForm
                  isOpen={isEntryNoteFormOpen}
                  onClose={handleCloseEntryNoteForm}
                  editingNote={editingEntryNote}
                  token={token}
                  onSuccess={() => {
                    loadEntryNotes();
                    handleCloseEntryNoteForm();
                  }}
                />
              )}
        </div>
      )}

      {activeSubTab === 'exitNotes' && (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-4xl border border-slate-200 shadow-sm">
          <FileOutput className="w-16 h-16 text-slate-200 mb-4" />
          <h3 className="text-xl font-black text-slate-400 mb-2">Notas de Salida</h3>
          <p className="text-sm text-slate-400 font-medium">Módulo en desarrollo. Próximamente disponible.</p>
        </div>
      )}
    </motion.div>
  );
};

const PlusCircle = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
