import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  FileText, Plus, Search, Trash2, Edit2,
  Hash, Building2, Printer, DollarSign, XCircle
} from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { generateInvoicePDF } from '../../lib/pdfGenerator';

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
}

export const InvoiceModule: React.FC<InvoiceModuleProps> = ({
  invoices, documentTypes, onEdit, onNew, onDelete
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const getDocTypeName = (code: string) =>
    documentTypes.find(dt => dt.code === code)?.name || code;

  const getStatusBadge = (status: string) => {
    if (status === 'VOIDED') return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-red-100 text-red-700"><XCircle className="w-3 h-3" /> Anulado</span>;
    return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-700"><FileText className="w-3 h-3" /> Emitido</span>;
  };

  const getBillingBadge = (status: string) => {
    if (status === 'PAGADO') return <span className="text-[10px] font-black text-emerald-600">Cobrado</span>;
    if (status === 'PARCIAL') return <span className="text-[10px] font-black text-amber-600">Parcial</span>;
    return <span className="text-[10px] font-black text-slate-400">Pendiente</span>;
  };

  const filtered = invoices.filter(inv =>
    inv.numberFormatted.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.customerDocNumber.includes(searchTerm)
  );

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por # comprobante, cliente o RUC..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all outline-none"
          />
        </div>
        <button
          onClick={onNew}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
        >
          <Plus className="w-5 h-5" />
          Nueva Factura
        </button>
      </div>

      <div className="bg-white rounded-4xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Comprobante</th>
              <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Cliente</th>
              <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Condición</th>
              <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400 text-right">Total</th>
              <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400">Estado</th>
              <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map(inv => (
              <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-black text-slate-900">{inv.numberFormatted}</span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">{getDocTypeName(inv.documentType)}</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-800">{inv.customerName}</span>
                    <span className="text-[10px] text-slate-400">{inv.customerDocNumber}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="font-medium text-slate-600 text-sm">{inv.paymentCondition}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="font-black text-slate-900">{formatCurrency(inv.totalAmount)}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    {getStatusBadge(inv.status)}
                    {getBillingBadge(inv.billingStatus)}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onEdit(inv)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={async () => await generateInvoicePDF(inv, inv.items || [], 'print')} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all" title="Imprimir / Guardar PDF"><Printer className="w-4 h-4" /></button>
                    <button onClick={() => onDelete(inv.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};
