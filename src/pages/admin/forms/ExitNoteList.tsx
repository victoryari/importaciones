import React, { useState, useEffect } from 'react';
import {
  Search, Plus, Edit2, Trash2, CheckCircle, X,
  FileOutput, Download, Lock, MapPin, User
} from 'lucide-react';
import { formatCurrency, ENTRY_NOTE_STATUSES, NOTE_STATUS_OPTIONS } from '../../../lib/utils';
import { PaginationBar } from '../../../components/PaginationBar';

interface ExitNoteListProps {
  notes: any[];
  loading: boolean;
  canWrite: boolean;
  onNew: () => void;
  onEdit: (note: any) => void;
  onDelete: (id: number) => void;
  onApprove: (id: number) => void;
  onAnnul: (id: number) => void;
}

export const ExitNoteList: React.FC<ExitNoteListProps> = ({
  notes, loading, canWrite, onNew, onEdit, onDelete, onApprove, onAnnul
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, pageSize]);

  const filteredNotes = notes.filter(note => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = !term ||
      note.description?.toLowerCase().includes(term) ||
      note.guideRemission?.toLowerCase().includes(term) ||
      note.series?.toLowerCase().includes(term) ||
      note.number?.toLowerCase().includes(term) ||
      note.customer?.name?.toLowerCase().includes(term) ||
      note.warehouse?.name?.toLowerCase().includes(term);
    const matchesStatus = !statusFilter || note.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filteredNotes.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedNotes = filteredNotes.slice((safePage - 1) * pageSize, safePage * pageSize);

  const getStatusBadge = (status: string) => {
    const config = ENTRY_NOTE_STATUSES[status as keyof typeof ENTRY_NOTE_STATUSES];
    if (!config) return null;
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const canEdit = (status: string) => ['DRAFT', 'PENDING'].includes(status);
  const canDelete = (status: string) => status === 'DRAFT';
  const canApprove = (status: string) => ['DRAFT', 'PENDING'].includes(status);
  const canAnnul = (status: string) => status !== 'ANNULLED';

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-2.5 w-full md:w-auto">
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar nota de salida..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:border-red-500 text-xs font-medium outline-none transition-colors"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 focus:border-red-500 outline-none"
            >
              <option value="">Todos los estados</option>
              {NOTE_STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2.5 w-full md:w-auto">
            {canWrite ? (
              <button
                onClick={onNew}
                className="h-9 bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase flex items-center gap-1.5 px-4 rounded-xl shadow-sm transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Nueva Nota de Salida
              </button>
            ) : (
              <div className="h-9 flex items-center gap-1.5 bg-slate-100 text-slate-400 text-xs font-bold uppercase px-4 rounded-xl cursor-not-allowed">
                <Lock className="w-4 h-4" />
                Nueva Nota de Salida
              </div>
            )}
            <button type="button" className="h-9 text-xs font-bold uppercase text-slate-500 hover:text-slate-700 flex items-center gap-1.5 px-3 rounded-xl hover:bg-slate-50 transition-colors">
              <Download className="w-4 h-4" />
              Exportar
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <div className="animate-spin w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full mx-auto mb-3" />
            <p className="font-bold text-xs uppercase tracking-widest">Cargando notas de salida...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                  <th className="px-4 py-3">Fecha / Documento</th>
                  <th className="px-4 py-3">Almacén / Cliente</th>
                  <th className="px-4 py-3">Motivo</th>
                  <th className="px-4 py-3 text-center">Ítems</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                  <th className="px-4 py-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {paginatedNotes.map((note) => (
                  <tr key={note.id} className={`hover:bg-slate-50/80 transition-colors ${note.status === 'ANNULLED' ? 'opacity-60 bg-red-50/20' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800">{new Date(note.date).toLocaleDateString('es-PE', { timeZone: 'UTC' })}</span>
                        {(note.series || note.number) && (
                          <span className="text-[10px] text-slate-500 font-mono font-bold uppercase">
                            {note.documentType ? `${note.documentType} ` : ''}{note.series || ''}{note.series && note.number ? '-' : ''}{note.number || ''}
                          </span>
                        )}
                        {note.guideRemission && (
                          <span className="text-[9px] text-blue-600 font-bold mt-0.5">GR: {note.guideRemission}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span className="font-bold text-slate-700">{note.warehouse?.name || 'S/A'}</span>
                        </div>
                        {note.customer && (
                          <div className="flex items-center gap-1.5">
                            <User className="w-3 h-3 text-slate-400" />
                            <span className="text-[10px] text-slate-500 font-medium">{note.customer.name}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-700">{note.reasonCode}</span>
                        {note.description && (
                          <span className="text-[10px] text-slate-400 italic truncate max-w-[200px]">{note.description}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                        {note.items?.length || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <div className="flex flex-col items-end">
                        <span className="font-black text-slate-900 text-sm">
                          {formatCurrency(Number(note.totalAmount), note.currency === 'USD' ? '$' : 'S/')}
                        </span>
                        {note.currency === 'USD' && note.exchangeRate && (
                          <span className="text-[9px] text-slate-400 font-bold">
                            TC: {Number(note.exchangeRate).toFixed(4)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {getStatusBadge(note.status)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center items-center gap-1">
                        {canEdit(note.status) && canWrite && (
                          <button
                            onClick={() => onEdit(note)}
                            className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-colors cursor-pointer"
                            title="Editar Nota"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {canApprove(note.status) && canWrite && (
                          <button
                            onClick={() => onApprove(note.id)}
                            className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-white transition-colors cursor-pointer"
                            title="Aprobar Salida"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {canAnnul(note.status) && canWrite && (
                          <button
                            onClick={() => onAnnul(note.id)}
                            className="p-1.5 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-600 hover:text-white transition-colors cursor-pointer"
                            title="Anular Nota"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {canDelete(note.status) && canWrite && (
                          <button
                            onClick={() => onDelete(note.id)}
                            className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-colors cursor-pointer"
                            title="Eliminar Nota"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {!canWrite && <Lock className="w-3.5 h-3.5 text-slate-300 mx-auto" />}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredNotes.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-16 text-center">
                      <FileOutput className="w-14 h-14 text-slate-200 mx-auto mb-3" />
                      <p className="text-slate-400 font-bold text-sm mb-1">
                        {searchTerm || statusFilter ? 'No se encontraron resultados' : 'No hay notas de salida registradas'}
                      </p>
                      <p className="text-slate-400 text-xs">
                        {searchTerm || statusFilter ? 'Intente con otros filtros de búsqueda' : 'Haga clic en "Nueva Nota de Salida" para comenzar'}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {!loading && (
          <PaginationBar
            totalItems={filteredNotes.length}
            currentPage={currentPage}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        )}
      </div>
    </div>
  );
};
