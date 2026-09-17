import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText, Plus, Search, Trash2, Edit2,
  Building2, Printer, XCircle, Send, CheckCircle2,
  AlertTriangle, RefreshCw, Eye, Download, ShieldCheck,
  Info, X
} from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { generateInvoicePDF } from '../../lib/pdfGenerator';
import axios from 'axios';

interface InvoiceItem {
  id: number;
  quantity: number;
  price: number;
  total: number;
  product: { name: string; code?: string };
}

interface InvoiceInstallment {
  id: number;
  number: number;
  amount: number;
  dueDate: string;
  status: string;
}

interface Invoice {
  id: number;
  documentType: string;
  series: string;
  number: number;
  numberFormatted: string;
  customerName: string;
  customerDocNumber: string;
  totalAmount: number;
  status: string;
  billingStatus: string;
  paymentCondition: string;
  issueDate: string;
  items: InvoiceItem[];
  installments: InvoiceInstallment[];
  seller?: { name: string };
  warehouseId?: number;
  warehouse?: { id: number; name: string; sunatCode?: string; address?: string };
  sunatStatus?: string; // PENDING, ACCEPTED, REJECTED, VOIDED
  sunatResponse?: string;
  sunatCdrUrl?: string;
  sunatXmlUrl?: string;
  sunatPdfUrl?: string;
  sunatHashCode?: string;
  sunatQr?: string;
  sunatEstablishmentCode?: string;
}

interface DocumentTypeOption {
  code: string;
  name: string;
}

interface InvoiceModuleProps {
  invoices: Invoice[];
  documentTypes: DocumentTypeOption[];
  onEdit: (invoice: Invoice) => void;
  onNew: () => void;
  onDelete: (id: number) => void;
  token?: string;
  onRefresh?: () => void;
}

export const InvoiceModule: React.FC<InvoiceModuleProps> = ({
  invoices, documentTypes, onEdit, onNew, onDelete, token, onRefresh
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSunatInvoice, setSelectedSunatInvoice] = useState<Invoice | null>(null);
  const [sendingId, setSendingId] = useState<number | null>(null);
  const [filterSunatStatus, setFilterSunatStatus] = useState<string>('ALL');

  const getDocTypeName = (code: string) =>
    documentTypes.find(dt => dt.code === code)?.name || code;

  const handleSendToSunat = async (inv: Invoice) => {
    if (sendingId) return;
    setSendingId(inv.id);
    try {
      const res = await axios.post(`/api/invoices/${inv.id}/send-sunat`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data?.sunatStatus === 'ACCEPTED') {
        alert(`✓ Comprobante ${inv.numberFormatted} ACEPTADO por SUNAT.`);
      } else {
        alert(`SUNAT: ${res.data?.sunatResponse || 'Procesado'}`);
      }
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al enviar comprobante a SUNAT');
    } finally {
      setSendingId(null);
    }
  };

  const getSunatBadge = (inv: Invoice) => {
    const status = inv.sunatStatus || 'PENDING';
    if (status === 'ACCEPTED') {
      return (
        <span 
          onClick={() => setSelectedSunatInvoice(inv)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-100/90 text-emerald-800 border border-emerald-300 shadow-sm cursor-pointer hover:bg-emerald-200 transition-colors"
          title="Ver CDR y constancia SUNAT"
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          Aceptado SUNAT
        </span>
      );
    }
    if (status === 'REJECTED') {
      return (
        <span 
          onClick={() => setSelectedSunatInvoice(inv)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-300 shadow-sm cursor-pointer hover:bg-rose-200 transition-colors"
          title="Ver motivo de rechazo"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
          Rechazado
        </span>
      );
    }
    if (status === 'VOIDED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-slate-100 text-slate-600 border border-slate-300">
          <XCircle className="w-3.5 h-3.5 text-slate-400" />
          Anulado
        </span>
      );
    }
    return (
      <span 
        onClick={() => handleSendToSunat(inv)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-900 border border-amber-300 shadow-sm cursor-pointer hover:bg-amber-200 transition-colors"
        title="Clic para enviar a SUNAT"
      >
        <Send className="w-3 h-3 text-amber-700" />
        Pendiente de Envío
      </span>
    );
  };

  const filtered = invoices.filter(inv => {
    const matchesSearch = 
      inv.numberFormatted.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.customerDocNumber.includes(searchTerm) ||
      (inv.warehouse?.name || '').toLowerCase().includes(searchTerm.toLowerCase());

    const status = inv.sunatStatus || 'PENDING';
    const matchesSunat = filterSunatStatus === 'ALL' || status === filterSunatStatus;

    return matchesSearch && matchesSunat;
  });

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Controles de Cabecera */}
      <div className="flex flex-col md:flex-row gap-3 justify-between items-center bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 w-full md:w-auto flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar comprobante, RUC/DNI o sede..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs font-medium rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
            />
          </div>

          {/* Filtro por estado SUNAT */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {['ALL', 'ACCEPTED', 'PENDING', 'REJECTED'].map(st => (
              <button
                key={st}
                onClick={() => setFilterSunatStatus(st)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${filterSunatStatus === st ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                {st === 'ALL' ? 'Todos' : st === 'ACCEPTED' ? 'Aceptados' : st === 'PENDING' ? 'Pendientes' : 'Rechazados'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors"
              title="Actualizar listado"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onNew}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-700 text-white rounded-xl text-xs font-bold hover:bg-blue-800 transition-all shadow-md shadow-blue-200"
          >
            <Plus className="w-4 h-4" />
            Emitir Comprobante
          </button>
        </div>
      </div>

      {/* Tabla Principal */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/70 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <th className="px-5 py-3.5">Comprobante</th>
              <th className="px-5 py-3.5">Establecimiento / Sede</th>
              <th className="px-5 py-3.5">Cliente</th>
              <th className="px-5 py-3.5">Fecha</th>
              <th className="px-5 py-3.5 text-right">Total</th>
              <th className="px-5 py-3.5 text-center">Estado SUNAT</th>
              <th className="px-5 py-3.5 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {filtered.length > 0 ? (
              filtered.map(inv => {
                const establishmentCode = inv.warehouse?.sunatCode || inv.sunatEstablishmentCode || '0000';
                const warehouseName = inv.warehouse?.name || (establishmentCode === '0000' ? 'TIENDA CUZCO' : establishmentCode === '0003' ? 'ALMACEN CUZCO' : 'ALMACÉN ZÁRATE');

                return (
                  <tr key={inv.id} className="hover:bg-blue-50/40 transition-colors group">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-50 text-blue-700 rounded-lg shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-mono font-bold text-slate-900 text-sm">{inv.numberFormatted}</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase">{getDocTypeName(inv.documentType)}</span>
                        </div>
                      </div>
                    </td>

                    {/* Sede / Establecimiento Anexo */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-700 text-[11px]">{warehouseName}</span>
                          <span className="text-[9px] font-mono font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded w-max">
                            SUNAT: {establishmentCode}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="flex flex-col max-w-[200px] truncate">
                        <span className="font-bold text-slate-800 truncate" title={inv.customerName}>{inv.customerName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{inv.customerDocNumber}</span>
                      </div>
                    </td>

                    <td className="px-5 py-3.5 text-slate-600 font-medium text-[11px]">
                      {new Date(inv.issueDate).toLocaleDateString()}
                    </td>

                    <td className="px-5 py-3.5 text-right font-mono font-bold text-slate-900 text-sm">
                      {formatCurrency(inv.totalAmount)}
                    </td>

                    {/* Estado SUNAT */}
                    <td className="px-5 py-3.5 text-center">
                      {getSunatBadge(inv)}
                    </td>

                    {/* Acciones */}
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex justify-end items-center gap-1">
                        {/* Enviar / Reintentar SUNAT */}
                        {(inv.sunatStatus === 'PENDING' || inv.sunatStatus === 'REJECTED') && (
                          <button
                            onClick={() => handleSendToSunat(inv)}
                            disabled={sendingId === inv.id}
                            className="p-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 rounded-lg transition-all"
                            title="Enviar a SUNAT"
                          >
                            {sendingId === inv.id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Send className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}

                        {/* Imprimir Comprobante Oficial */}
                        <button
                          onClick={async () => await generateInvoicePDF(inv, inv.items || [], 'print')}
                          className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-all"
                          title="Imprimir Representación Impresa PDF con QR"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>

                        {/* Ver CDR / Detalles SUNAT */}
                        <button
                          onClick={() => setSelectedSunatInvoice(inv)}
                          className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all"
                          title="Ver CDR y Firma SUNAT"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onEdit(inv)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onDelete(inv.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                          title="Eliminar / Anular"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                  <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-xs font-bold uppercase tracking-wider">No se encontraron comprobantes</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Constancia y Detalle SUNAT (CDR) */}
      <AnimatePresence>
        {selectedSunatInvoice && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden"
            >
              {/* Header Modal */}
              <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h3 className="text-sm font-bold">Constancia de Recepción SUNAT</h3>
                    <p className="text-[10px] text-slate-300 font-mono">{selectedSunatInvoice.numberFormatted}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedSunatInvoice(null)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Contenido */}
              <div className="p-5 space-y-4 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                    <span className="text-slate-500 font-bold">Estado en SUNAT:</span>
                    {getSunatBadge(selectedSunatInvoice)}
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                    <span className="text-slate-500 font-bold">Establecimiento Anexo:</span>
                    <span className="font-mono font-bold text-slate-800">
                      [{selectedSunatInvoice.warehouse?.sunatCode || selectedSunatInvoice.sunatEstablishmentCode || '0000'}] {selectedSunatInvoice.warehouse?.name || 'Sede Principal'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                    <span className="text-slate-500 font-bold">Código Hash Firma:</span>
                    <span className="font-mono text-[11px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded break-all">
                      {selectedSunatInvoice.sunatHashCode || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-bold">Emisión:</span>
                    <span className="text-slate-700 font-medium">{new Date(selectedSunatInvoice.issueDate).toLocaleString()}</span>
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-blue-600" /> Mensaje Oficial SUNAT:
                  </p>
                  <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-100 text-slate-800 font-mono text-[11px]">
                    {selectedSunatInvoice.sunatResponse || 'El comprobante ha sido emitido y registrado en el sistema.'}
                  </div>
                </div>

                {selectedSunatInvoice.sunatQr && (
                  <div>
                    <p className="text-[11px] font-bold text-slate-700 mb-1">Cadena Código QR Oficial:</p>
                    <div className="bg-slate-100 p-2.5 rounded-lg border border-slate-200 font-mono text-[10px] text-slate-600 break-all">
                      {selectedSunatInvoice.sunatQr}
                    </div>
                  </div>
                )}

                {/* Acciones del Modal */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setSelectedSunatInvoice(null)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                  >
                    Cerrar
                  </button>
                  <button
                    onClick={async () => {
                      await generateInvoicePDF(selectedSunatInvoice, selectedSunatInvoice.items || [], 'print');
                    }}
                    className="px-4 py-2 bg-blue-700 text-white rounded-xl font-bold hover:bg-blue-800 flex items-center gap-1.5 transition-colors shadow-md shadow-blue-200"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Imprimir Comprobante
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
