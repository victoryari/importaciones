import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Search, Plus, Edit2, Trash2, CheckCircle, X, Eye,
  FileInput, Filter, Download, Lock, ChevronRight,
  Calendar, MapPin, User, Hash, DollarSign
} from 'lucide-react';
import { formatNumber, formatCurrency, ENTRY_NOTE_STATUSES } from '../../../lib/utils';

interface EntryNoteListProps {
  notes: any[];
  loading: boolean;
  canWrite: boolean;
  onNew: () => void;
  onEdit: (note: any) => void;
  onDelete: (id: number) => void;
  onApprove: (id: number) => void;
  onAnnul: (id: number) => void;
  onRefresh: () => void;
}

export const EntryNoteList: React.FC<EntryNoteListProps> = ({
  notes, loading, canWrite, onNew, onEdit, onDelete, onApprove, onAnnul, onRefresh
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const filteredNotes = notes.filter(note => {
    const matchesSearch = !searchTerm ||
      note.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.guideRemission?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.series?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.warehouse?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || note.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const config = ENTRY_NOTE_STATUSES[status as keyof typeof ENTRY_NOTE_STATUSES];
    if (!config) return null;
    return (
      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const canEdit = (status: string) => ['DRAFT', 'PENDING'].includes(status);
  const canDelete = (status: string) => status === 'DRAFT';
  const canApprove = (status: string) => ['DRAFT', 'PENDING'].includes(status);
  const canAnnul = (status: string) => !['ANNULLED'].includes(status);

  return (
    <div className="space-y-4">
      {/* Main Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar nota de ingreso..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 transition-all outline-none"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-12 px-4 rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-600 focus:border-emerald-500 outline-none"
            >
              <option value="">Todos los estados</option>
              {Object.entries(ENTRY_NOTE_STATUSES).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            {canWrite ? (
              <button
                onClick={onNew}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase flex items-center gap-2 px-6 py-3 rounded-2xl shadow-lg shadow-emerald-100 transition-all hover:-translate-y-0.5"
              >
                <Plus className="w-4 h-4" />
                Nueva Nota de Ingreso
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-slate-100 text-slate-400 text-xs font-black uppercase px-6 py-3 rounded-2xl cursor-not-allowed">
                <Lock className="w-4 h-4" />
                Nueva Nota de Ingreso
              </div>
            )}
            <button className="text-xs font-black uppercase text-slate-500 hover:text-slate-700 flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-slate-50 transition-all">
              <Download className="w-4 h-4" />
              Exportar
            </button>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="font-bold text-sm uppercase tracking-widest">Cargando notas de ingreso...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Fecha / Documento</th>
                  <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Almacén / Proveedor</th>
                  <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Motivo</th>
                  <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400 text-center">Items</th>
                  <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400 text-right">Total</th>
                  <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400 text-center">Estado</th>
                  <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredNotes.map((note) => (
                  <tr key={note.id} className={`hover:bg-slate-50/80 transition-colors group ${note.status === 'ANNULLED' ? 'opacity-60 bg-red-50/20' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-700">{new Date(note.date).toLocaleDateString('es-PE')}</span>
                        {(note.series || note.number) && (
                          <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                            {note.documentType ? `${note.documentType} ` : ''}{note.series || ''}{note.series && note.number ? '-' : ''}{note.number || ''}
                          </span>
                        )}
                        {note.guideRemission && (
                          <span className="text-[9px] text-blue-500 font-bold mt-0.5">GR: {note.guideRemission}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span className="text-xs font-bold text-slate-600">{note.warehouse?.name || 'S/A'}</span>
                        </div>
                        {note.supplier && (
                          <div className="flex items-center gap-1.5">
                            <User className="w-3 h-3 text-slate-400" />
                            <span className="text-[10px] text-slate-500 font-medium">{note.supplier.name}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-700">{note.reasonCode}</span>
                        {note.description && (
                          <span className="text-[10px] text-slate-400 italic truncate max-w-[200px]">{note.description}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-[10px] font-black">
                        {note.items?.length || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-black text-slate-900 text-base">
                          {formatCurrency(Number(note.totalAmount), note.currency === 'USD' ? '$' : 'S/')}
                        </span>
                        {note.currency === 'USD' && note.exchangeRate && (
                          <span className="text-[9px] text-slate-400 font-bold">
                            TC: {Number(note.exchangeRate).toFixed(4)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {getStatusBadge(note.status)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center items-center gap-1.5">
                        {canEdit(note.status) && canWrite && (
                          <button
                            onClick={() => onEdit(note)}
                            className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-2xs"
                            title="Editar Nota"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {canApprove(note.status) && canWrite && (
                          <button
                            onClick={() => onApprove(note.id)}
                            className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-2xs"
                            title="Aprobar Ingreso"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        {canAnnul(note.status) && canWrite && (
                          <button
                            onClick={() => onAnnul(note.id)}
                            className="p-2 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-600 hover:text-white transition-all shadow-2xs"
                            title="Anular Nota"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete(note.status) && canWrite && (
                          <button
                            onClick={() => onDelete(note.id)}
                            className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-2xs"
                            title="Eliminar Nota"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        {!canWrite && (
                          <Lock className="w-4 h-4 text-slate-300 mx-auto" />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredNotes.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-20 text-center">
                      <FileInput className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                      <p className="text-slate-400 font-bold text-lg mb-1">
                        {searchTerm || statusFilter ? 'No se encontraron resultados' : 'No hay notas de ingreso registradas'}
                      </p>
                      <p className="text-slate-400 text-sm">
                        {searchTerm || statusFilter ? 'Intente con otros filtros de búsqueda' : 'Haga clic en "Nueva Nota de Ingreso" para comenzar'}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Leyenda / Resumen */}
      <div className="flex flex-wrap items-center gap-6 px-4 py-2 border-t border-slate-100 bg-white/50 rounded-xl">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span>
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Total: {notes.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
          <span className="text-[11px] font-bold text-amber-600 uppercase tracking-widest">Borrador: {notes.filter(n => n.status === 'DRAFT').length}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
          <span className="text-[11px] font-bold text-blue-600 uppercase tracking-widest">Aprobadas: {notes.filter(n => n.status === 'APPROVED' || n.status === 'COMPLETED').length}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
          <span className="text-[11px] font-bold text-red-600 uppercase tracking-widest">Anuladas: {notes.filter(n => n.status === 'ANNULLED').length}</span>
        </div>
      </div>
    </div>
  );
};
