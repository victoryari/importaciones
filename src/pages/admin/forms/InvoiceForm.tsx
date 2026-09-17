import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Save, X, FileText, Hash, Building2, User, DollarSign,
  Search, Trash2, Plus, Calendar, RefreshCw,
  Receipt, ChevronDown, UserPlus, Edit3, Printer,
  Eye, Check, ShieldCheck, AlertCircle, Gift, Link, ArrowLeftRight, CheckCircle2
} from 'lucide-react';
import { ProductSearchModal } from './ProductSearchModal';
import { formatNumber } from '../../../lib/utils';
import axios from 'axios';

interface DocumentTypeOption {
  code: string;
  name: string;
}

interface InvoiceFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  formData: any;
  setFormData: (data: any) => void;
  editingItem: any;
  loading: boolean;
  customers: any[];
  sellers: any[];
  documentTypes: DocumentTypeOption[];
  sunatCurrencies: any[];
  sunatPaymentConditions: any[];
  sunatOperationTypes: any[];
  sunatIgvAffectations?: any[];
  searchResults: any[];
  handleSearchProduct: (query: string) => void;
  quotationItems: any[];
  setQuotationItems?: (items: any[]) => void;
  addQuotationItem: (product: any) => void;
  updateQuotationItem: (productId: number, field: string | Record<string, any>, value?: any) => void;
  removeQuotationItem: (productId: number) => void;
  quotationTotal: number;
  token: string;
  series: any[];
  invoices?: any[];
  handleConsultCustomer?: (type: string, number: string) => Promise<any>;
  handleQuickRegister?: (data: any) => Promise<void>;
  onOpenCustomerForm?: (docNumber?: string) => void;
}

export const InvoiceForm: React.FC<InvoiceFormProps> = ({
  isOpen, onClose, onSubmit, formData, setFormData, editingItem,
  loading, customers, sellers, documentTypes, sunatCurrencies,
  sunatPaymentConditions, sunatOperationTypes, sunatIgvAffectations, searchResults,
  handleSearchProduct, quotationItems, setQuotationItems, addQuotationItem,
  updateQuotationItem, removeQuotationItem, quotationTotal,
  token, series, invoices = [],
  handleConsultCustomer, handleQuickRegister, onOpenCustomerForm
}) => {
  const [isProductSearchOpen, setIsProductSearchOpen] = useState(false);
  const [customerSearchResults, setCustomerSearchResults] = useState<any[]>([]);
  const [docSearchResults, setDocSearchResults] = useState<any[]>([]);
  const [isConsulting, setIsConsulting] = useState(false);
  const [isSearchingRefDoc, setIsSearchingRefDoc] = useState(false);
  const [refSearchMessage, setRefSearchMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState(false);
  const [showInstallments, setShowInstallments] = useState(formData.paymentCondition === 'CREDITO');
  const [installments, setInstallments] = useState<any[]>(formData.installments || []);
  const [creditQty, setCreditQty] = useState(1);
  const [creditDays, setCreditDays] = useState(30);
  const [creditStart, setCreditStart] = useState(formData.issueDate || new Date().toISOString().split('T')[0]);
  const [creditAmount, setCreditAmount] = useState(quotationTotal);
  const [isEditingDocNumber, setIsEditingDocNumber] = useState(false);

  // Auto-selección y consulta de correlativo de serie
  useEffect(() => {
    if (isOpen && series && series.length > 0 && !editingItem) {
      const currentDocType = formData.documentType || (formData.customerDocNumber?.length === 11 ? '01' : '03');
      const matchingSeriesList = series.filter((s: any) => s.documentType === currentDocType && s.isActive);
      
      if (matchingSeriesList.length > 0) {
        const isCurrentValid = matchingSeriesList.some(
          (s: any) => s.id.toString() === formData.series?.toString() || s.series === formData.docSeries
        );
        const targetSeries = isCurrentValid 
          ? matchingSeriesList.find((s: any) => s.id.toString() === formData.series?.toString() || s.series === formData.docSeries)!
          : matchingSeriesList[0];

        if (!isCurrentValid || !formData.docNumber || !formData.docSeries || formData.series !== targetSeries.id.toString()) {
          axios.get(`/api/series/next/${targetSeries.warehouseId}/${currentDocType}`, {
            headers: { Authorization: `Bearer ${token}` }
          }).then(res => {
            setFormData((prev: any) => ({
              ...prev,
              documentType: currentDocType,
              series: targetSeries.id.toString(),
              docSeries: res.data.series,
              docNumber: res.data.nextNumber,
              seriesId: targetSeries.id
            }));
          }).catch(() => {
            setFormData((prev: any) => ({
              ...prev,
              documentType: currentDocType,
              series: targetSeries.id.toString(),
              docSeries: targetSeries.series,
              docNumber: targetSeries.docNumber || '00000001',
              seriesId: targetSeries.id
            }));
          });
        }
      }
    }
  }, [isOpen, formData.documentType, series, token, editingItem]);

  // Sincronizar cuotas
  useEffect(() => {
    if (isOpen) {
      setShowInstallments(formData.paymentCondition === 'CREDITO');
      if (!editingItem) {
        if (formData.paymentCondition === 'CREDITO') {
          const base = new Date(formData.issueDate || new Date().toISOString().split('T')[0]);
          base.setDate(base.getDate() + 30);
          const initStart = base.toISOString().split('T')[0];
          setCreditStart(initStart);
          generateInstallmentsList(1, 30, initStart, quotationTotal);
        } else {
          setInstallments([]);
        }
      } else {
        setInstallments(formData.installments || []);
      }
    }
  }, [isOpen, formData.paymentCondition]);

  useEffect(() => {
    setFormData((prev: any) => ({ ...prev, installments }));
  }, [installments]);

  // Consulta automática de tipo de cambio por fecha
  useEffect(() => {
    if (isOpen && formData.issueDate && !editingItem) {
      axios.get(`/api/exchange-rates/fetch-by-date/${formData.issueDate}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => {
          if (res.data) {
            const isSoles = formData.currency === 'PEN';
            const rate = isSoles ? res.data.buy_rate : res.data.sell_rate;
            setFormData((prev: any) => ({ ...prev, exchangeRate: rate }));
          }
        }).catch(() => {});
    }
  }, [formData.issueDate, isOpen, formData.currency]);

  // Búsqueda y carga automática de Comprobante de Referencia (Para Notas de Crédito / Débito)
  const searchReferenceDocument = async (docTypeParam?: string, seriesParam?: string, numberParam?: string) => {
    const docType = docTypeParam || formData.refDocType || '01';
    const rawSeries = (seriesParam !== undefined ? seriesParam : formData.refDocSeries || '').trim().toUpperCase();
    const rawNumber = (numberParam !== undefined ? numberParam : formData.refDocNumber || '').trim();

    if (!rawSeries || !rawNumber) {
      return;
    }

    setIsSearchingRefDoc(true);
    setRefSearchMessage(null);

    const intNum = parseInt(rawNumber, 10);
    const paddedNum = !isNaN(intNum) ? String(intNum).padStart(8, '0') : rawNumber;

    try {
      let foundInvoice: any = null;

      // 1. Intentar endpoint backend
      try {
        const res = await axios.get(`/api/invoices/by-reference/${docType}/${rawSeries}/${rawNumber}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data) {
          foundInvoice = res.data;
        }
      } catch {
        // Fallback: Buscar en la lista local de comprobantes
        foundInvoice = invoices.find((inv: any) =>
          inv.documentType === docType &&
          inv.series?.toUpperCase() === rawSeries &&
          (inv.number === intNum || String(inv.number).padStart(8, '0') === paddedNum || String(inv.number) === rawNumber)
        );
      }

      if (foundInvoice) {
        const cust = foundInvoice.customer || {};
        const isRuc = cust.docType === 'RUC' || (cust.docNumber && cust.docNumber.length === 11) || (foundInvoice.customerDocNumber && foundInvoice.customerDocNumber.length === 11);

        setFormData((prev: any) => ({
          ...prev,
          refDocType: docType,
          refDocSeries: foundInvoice.series || rawSeries,
          refDocNumber: String(foundInvoice.number || rawNumber).padStart(8, '0'),
          refDocDate: foundInvoice.issueDate ? foundInvoice.issueDate.split('T')[0] : prev.refDocDate,
          customerId: foundInvoice.customerId?.toString() || cust.id?.toString() || '',
          customerDocType: foundInvoice.customerDocType || (isRuc ? 'RUC' : 'DNI'),
          customerDocNumber: foundInvoice.customerDocNumber || cust.docNumber || '',
          customerName: foundInvoice.customerName || cust.name || `${cust.firstName || ''} ${cust.lastName || ''}`.trim() || '',
          customerAddress: foundInvoice.customerAddress || cust.address || '',
          customerEmail: foundInvoice.customerEmail || cust.email || '',
          customerPhone: foundInvoice.customerPhone || cust.phone || '',
          sellerId: foundInvoice.sellerId?.toString() || prev.sellerId,
          currency: foundInvoice.currency || 'PEN',
          exchangeRate: foundInvoice.exchangeRate || '1.000',
          priceIncludesIgv: foundInvoice.priceIncludesIgv !== false,
          includeIgv: foundInvoice.includeIgv !== false,
          notes: prev.notes || `Nota por modificación al comprobante ${rawSeries}-${paddedNum}`
        }));

        // Poblar productos del comprobante referenciado
        if (foundInvoice.items && Array.isArray(foundInvoice.items) && foundInvoice.items.length > 0) {
          const newItems = foundInvoice.items.map((i: any) => {
            const prod = i.product || {};
            const unitOptions: any[] = [];
            if (prod.subPackage) {
              unitOptions.push({ symbol: prod.subPackage.symbol, name: prod.subPackage.name, qtyPerBase: (prod.quantityPerSubPackage || 1) * (prod.quantityPerPackage || 1) });
            }
            if (prod.package) {
              unitOptions.push({ symbol: prod.package.symbol, name: prod.package.name, qtyPerBase: prod.quantityPerPackage || 1 });
            }
            if (prod.unit) {
              unitOptions.push({ symbol: prod.unit.symbol, name: prod.unit.name, qtyPerBase: 1 });
            }
            return {
              productId: i.productId,
              name: prod.name || i.name || 'Producto',
              code: prod.code || i.code || '',
              price: Number(i.price || 0),
              quantity: Number(i.quantity || 0),
              discount: Number(i.discount || 0),
              unitOptions,
              unitMeasure: i.unitMeasure || prod.package?.symbol || prod.subPackage?.symbol || prod.unit?.symbol || 'UND',
              priceType: i.priceType || 'PRICE1',
              lotNumber: i.lotNumber || '',
              isFree: i.isFree || Number(i.price) === 0,
              referencePrice: Number(i.referencePrice || prod.salePrice || i.price || 0),
              unit: prod.unit || { symbol: 'UND' }
            };
          });

          if (setQuotationItems) {
            setQuotationItems(newItems);
          }
        }

        setRefSearchMessage({
          type: 'success',
          text: `Comprobante ${rawSeries}-${paddedNum} encontrado y cargado con éxito.`
        });
      } else {
        setRefSearchMessage({
          type: 'error',
          text: `No se encontró el comprobante ${rawSeries}-${paddedNum} en el sistema.`
        });
      }
    } catch (err) {
      console.error('Error al consultar comprobante de referencia:', err);
      setRefSearchMessage({
        type: 'error',
        text: `Error al consultar el comprobante ${rawSeries}-${paddedNum}.`
      });
    } finally {
      setIsSearchingRefDoc(false);
    }
  };

  // Cambio manual de Tipo de Documento (Factura / Boleta / Nota de Crédito)
  const handleDocumentTypeChange = (newDocType: string) => {
    const matching = series.filter((s: any) => s.documentType === newDocType && s.isActive);
    const firstSerie = matching[0];

    setFormData((prev: any) => ({
      ...prev,
      documentType: newDocType,
      series: firstSerie ? firstSerie.id.toString() : '',
      docSeries: firstSerie?.series || '',
      docNumber: '',
      refNoteReason: newDocType === '07' ? (prev.refNoteReason || '01') : prev.refNoteReason,
      refDocType: newDocType === '07' ? (prev.refDocType || '01') : prev.refDocType
    }));

    if (firstSerie) {
      axios.get(`/api/series/next/${firstSerie.warehouseId}/${newDocType}`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => {
        setFormData((prev: any) => ({
          ...prev,
          docSeries: res.data.series,
          docNumber: res.data.nextNumber,
          seriesId: firstSerie.id
        }));
      }).catch(() => {});
    }
  };

  // Cambio manual de Serie
  const handleSeriesChange = (seriesIdStr: string) => {
    setFormData((prev: any) => ({ ...prev, series: seriesIdStr }));
    if (seriesIdStr) {
      const s = series.find((x: any) => x.id.toString() === seriesIdStr);
      if (s) {
        axios.get(`/api/series/next/${s.warehouseId}/${formData.documentType || '01'}`, {
          headers: { Authorization: `Bearer ${token}` }
        }).then(res => {
          setFormData((prev: any) => ({
            ...prev,
            docSeries: res.data.series,
            docNumber: res.data.nextNumber,
            seriesId: s.id
          }));
        }).catch(() => {
          setFormData((prev: any) => ({
            ...prev,
            docSeries: s.series,
            seriesId: s.id
          }));
        });
      }
    }
  };

  // Función generadora de cuotas con fecha calculada
  const generateInstallmentsList = (qty: number, days: number, startDateStr: string, totalAmount: number) => {
    const start = new Date(startDateStr);
    const newInstallments = [];
    const totalToFinance = totalAmount || quotationTotal;
    const amountPerInst = totalToFinance / qty;

    for (let i = 0; i < qty; i++) {
      const dueDate = new Date(start);
      if (i > 0) {
        dueDate.setDate(dueDate.getDate() + (days * i));
      }
      newInstallments.push({
        number: i + 1,
        amount: i === qty - 1
          ? totalToFinance - amountPerInst * (qty - 1)
          : amountPerInst,
        daysOffset: days * (i + 1),
        dueDate: dueDate.toISOString().split('T')[0],
        status: 'PENDING'
      });
    }
    setInstallments(newInstallments);
  };

  // Manejo de cambio en días de crédito con actualización inmediata de la fecha de 1ra cuota
  const handleCreditDaysChange = (days: number) => {
    setCreditDays(days);
    const base = new Date(formData.issueDate || new Date().toISOString().split('T')[0]);
    base.setDate(base.getDate() + Number(days));
    const calculatedStart = base.toISOString().split('T')[0];
    setCreditStart(calculatedStart);
    generateInstallmentsList(creditQty, days, calculatedStart, creditAmount || quotationTotal);
  };

  const handleCreditQtyChange = (qty: number) => {
    setCreditQty(qty);
    generateInstallmentsList(qty, creditDays, creditStart, creditAmount || quotationTotal);
  };

  const handleCreditStartChange = (dateStr: string) => {
    setCreditStart(dateStr);
    generateInstallmentsList(creditQty, creditDays, dateStr, creditAmount || quotationTotal);
  };

  const handleConditionChange = (value: string) => {
    setFormData((prev: any) => ({ ...prev, paymentCondition: value }));
    setShowInstallments(value === 'CREDITO');
    if (value === 'CREDITO') {
      const base = new Date(formData.issueDate || new Date().toISOString().split('T')[0]);
      base.setDate(base.getDate() + Number(creditDays || 30));
      const calculatedStart = base.toISOString().split('T')[0];
      setCreditStart(calculatedStart);
      generateInstallmentsList(creditQty || 1, creditDays || 30, calculatedStart, quotationTotal);
    } else {
      setInstallments([]);
    }
  };

  const handleDocPredictiveSearch = (q: string) => {
    let docType = '';
    if (q.length === 8) {
      docType = 'DNI';
      if (formData.documentType === '01') handleDocumentTypeChange('03');
    } else if (q.length === 11) {
      docType = 'RUC';
      if (formData.documentType === '03') handleDocumentTypeChange('01');
    }

    setFormData((prev: any) => ({
      ...prev,
      customerDocNumber: q,
      customerDocType: docType || prev.customerDocType,
      ...(q === '' ? {
        customerName: '',
        customerAddress: '',
        customerEmail: '',
        customerPhone: '',
        customerId: null
      } : {})
    }));
    if (q.length > 2) {
      const filtered = customers.filter(c =>
        c.docNumber?.includes(q) ||
        (c.name && c.name.toLowerCase().includes(q.toLowerCase())) ||
        (c.firstName && c.firstName.toLowerCase().includes(q.toLowerCase())) ||
        (c.lastName && c.lastName.toLowerCase().includes(q.toLowerCase()))
      );
      setDocSearchResults(filtered);
    } else {
      setDocSearchResults([]);
    }
  };

  const handleNamePredictiveSearch = (q: string) => {
    setFormData((prev: any) => ({ ...prev, customerName: q }));
    if (q.length > 2) {
      const filtered = customers.filter(c =>
        (c.name && c.name.toLowerCase().includes(q.toLowerCase())) ||
        (c.firstName && c.firstName.toLowerCase().includes(q.toLowerCase())) ||
        (c.lastName && c.lastName.toLowerCase().includes(q.toLowerCase())) ||
        c.docNumber?.includes(q)
      );
      setCustomerSearchResults(filtered);
    } else {
      setCustomerSearchResults([]);
    }
  };

  const selectCustomer = (c: any) => {
    const isRuc = (c.docNumber || '').length === 11 || c.docType === 'RUC';
    if (isRuc && formData.documentType === '03') {
      handleDocumentTypeChange('01');
    } else if (!isRuc && formData.documentType === '01') {
      handleDocumentTypeChange('03');
    }

    setFormData((prev: any) => ({
      ...prev,
      customerDocNumber: c.docNumber || '',
      customerDocType: c.docType || (isRuc ? 'RUC' : 'DNI'),
      customerName: c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim() || '',
      customerAddress: c.address || '',
      customerEmail: c.email || '',
      customerPhone: c.phone || '',
      customerId: c.id || null
    }));
    setCustomerSearchResults([]);
    setDocSearchResults([]);
  };

  const handleApiPeruSearch = async () => {
    const docNum = formData.customerDocNumber;
    if (!docNum) return;
    setIsConsulting(true);
    try {
      const existing = customers.find(c => c.docNumber === docNum);
      if (existing) {
        selectCustomer(existing);
        return;
      }
      const docType = docNum.length === 11 ? 'RUC' : 'DNI';
      const data = await handleConsultCustomer?.(docType, docNum);
      if (data) {
        let name = '';
        let address = '';
        if (docType === 'RUC') {
          name = data.nombre_o_razon_social || data.razonSocial || '';
          address = data.direccion_completa || data.direccion || '';
          if (formData.documentType === '03') handleDocumentTypeChange('01');
        } else {
          name = `${data.nombres || ''} ${data.apellido_paterno || ''} ${data.apellido_materno || ''}`.trim();
          if (formData.documentType === '01') handleDocumentTypeChange('03');
        }
        setFormData((prev: any) => ({
          ...prev,
          customerName: name || prev.customerName,
          customerAddress: address || prev.customerAddress,
          customerDocType: docType
        }));
      }
    } catch (err) {
      console.error('APIPeru search error:', err);
    } finally {
      setIsConsulting(false);
    }
  };

  // Cálculos considerando Ítems Gratuitos / Bonificación
  const totalGratuito = quotationItems.reduce((acc, item) => {
    if (!item.isFree) return acc;
    const refP = Number(item.referencePrice || item.originalPrice || item.price || 0);
    return acc + (refP * Number(item.quantity || 0));
  }, 0);

  const valorVenta = quotationItems.reduce((acc, item) => {
    if (item.isFree) return acc;
    const subtotal = Number(item.price || 0) * Number(item.quantity || 0);
    const totalLine = subtotal - ((subtotal * (Number(item.discount) || 0)) / 100);
    return acc + (totalLine / 1.18);
  }, 0);

  const igvTotal = quotationItems.reduce((acc, item) => {
    if (item.isFree) return acc;
    const subtotal = Number(item.price || 0) * Number(item.quantity || 0);
    const totalLine = subtotal - ((subtotal * (Number(item.discount) || 0)) / 100);
    const valorLine = totalLine / 1.18;
    return acc + (totalLine - valorLine);
  }, 0);

  const totalComprobante = quotationItems.reduce((acc, item) => {
    if (item.isFree) return acc;
    const subtotal = Number(item.price || 0) * Number(item.quantity || 0);
    return acc + (subtotal - ((subtotal * (Number(item.discount) || 0)) / 100));
  }, 0);

  const sumCuotas = (installments || []).reduce((acc, inst) => acc + (Number(inst.amount) || 0), 0);
  const isCreditDiff = formData.paymentCondition === 'CREDITO' && (installments || []).length > 0 && Math.abs(sumCuotas - totalComprobante) > 0.05;

  const isBoletaLimitExceeded = (formData.documentType === '03' || (!formData.documentType && (formData.customerDocNumber || '').length !== 11)) &&
    totalComprobante >= 700 &&
    (!formData.customerDocNumber || formData.customerDocNumber.trim() === '00000000' || formData.customerDocNumber.trim().length < 8);

  const handleAutoAdjustInstallments = () => {
    if (!installments || installments.length === 0) return;
    const diff = totalComprobante - sumCuotas;
    const updated = [...installments];
    const lastIdx = updated.length - 1;
    updated[lastIdx] = {
      ...updated[lastIdx],
      amount: parseFloat(Math.max(0, Number(updated[lastIdx].amount) + diff).toFixed(2))
    };
    setInstallments(updated);
  };

  const handleValidatedSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quotationItems.length === 0) {
      alert('Debe agregar al menos un producto al comprobante.');
      return;
    }

    // 1. Validación Factura Electrónica
    if (formData.documentType === '01') {
      const cleanDoc = (formData.customerDocNumber || '').trim();
      if (!cleanDoc || cleanDoc.length !== 11 || !/^\d{11}$/.test(cleanDoc)) {
        alert('Normativa SUNAT: Las Facturas Electrónicas requieren obligatoriamente un número de RUC válido de 11 dígitos numéricos.');
        return;
      }
    }

    // 2. Validación Boleta de Venta >= S/ 700.00
    if (formData.documentType === '03' && totalComprobante >= 700) {
      const cleanDoc = (formData.customerDocNumber || '').trim();
      if (!cleanDoc || cleanDoc === '00000000' || cleanDoc.length < 8) {
        alert('Normativa SUNAT: Las Boletas de Venta iguales o mayores a S/ 700.00 requieren identificar obligatoriamente al cliente con DNI, RUC o Carné de Extranjería válido.');
        return;
      }
    }

    // 3. Validación Cuotas de Crédito
    if (formData.paymentCondition === 'CREDITO') {
      if (!installments || installments.length === 0) {
        alert('Normativa SUNAT: Las ventas al CRÉDITO requieren definir al menos una cuota de pago con fecha de vencimiento e importe.');
        return;
      }
      if (Math.abs(sumCuotas - totalComprobante) > 0.10) {
        alert(`Inconsistencia en Cuotas: La suma de cuotas (S/ ${sumCuotas.toFixed(2)}) no coincide con el total del comprobante (S/ ${totalComprobante.toFixed(2)}). Presione el botón "Ajustar al Total" para cuadrar al centavo.`);
        return;
      }
    }

    onSubmit(e);
  };

  const currentAvailableSeries = series.filter(
    (s: any) => s.documentType === (formData.documentType || '01') && s.isActive
  );

  const isCreditNote = formData.documentType === '07' || formData.documentType === '08';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="absolute inset-0 z-110 flex items-center justify-center p-2 overflow-hidden">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" />
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 15 }}
            className="relative w-full h-full max-w-[99%] max-h-[98vh] bg-[#F1F5F9] rounded-xl shadow-2xl overflow-hidden flex flex-col border border-slate-300"
          >
            {/* === BARRA DE TITULO ERP === */}
            <div className="bg-[#004A99] px-4 py-2 flex items-center justify-between shrink-0 text-white shadow-sm border-b border-blue-900">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-white/10 flex items-center justify-center text-white">
                  <Receipt className="w-4 h-4" />
                </div>
                <h2 className="text-xs font-bold text-white tracking-tight uppercase">
                  {editingItem ? 'Editar Comprobante de Venta' : 'Registro y Emisión de Comprobante'}
                </h2>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 bg-blue-900/60 px-2.5 py-0.5 rounded border border-blue-400/30">
                  <span className="text-[10px] font-bold text-blue-200 uppercase">I.G.V.</span>
                  <input
                    type="number"
                    value={formData.igvPercent || 18}
                    onChange={e => setFormData((prev: any) => ({ ...prev, igvPercent: e.target.value }))}
                    className="w-10 h-5 border border-blue-400/50 rounded bg-blue-950 text-white text-[11px] font-bold text-center outline-none"
                  />
                  <span className="text-[10px] font-bold text-blue-200">%</span>
                </div>
                <button onClick={onClose} className="hover:bg-red-600 text-white p-1 rounded transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* BANNERS DE ALERTA NORMATIVA SUNAT EN TIEMPO REAL */}
            {isBoletaLimitExceeded && (
              <div className="bg-amber-500 text-white px-3 py-1.5 flex items-center justify-between text-xs font-bold shrink-0 border-b border-amber-600 animate-pulse">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>
                    ⚠️ <strong>Normativa SUNAT:</strong> Esta Boleta es $\ge$ S/ 700.00 (Total: S/ {totalComprobante.toFixed(2)}). Es obligatorio ingresar el DNI, RUC o documento válido del cliente.
                  </span>
                </div>
              </div>
            )}

            {isCreditDiff && (
              <div className="bg-rose-600 text-white px-3 py-1.5 flex items-center justify-between text-xs font-bold shrink-0 border-b border-rose-700">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>
                    ⚠️ <strong>Descuadre en Cuotas a Crédito:</strong> Total Comprobante: S/ {totalComprobante.toFixed(2)} | Suma de Cuotas: S/ {sumCuotas.toFixed(2)} (Diferencia: S/ {(totalComprobante - sumCuotas).toFixed(2)})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAutoAdjustInstallments}
                  className="bg-white text-rose-700 hover:bg-rose-50 px-2 py-0.5 rounded text-[10px] uppercase font-black tracking-wide shadow-xs cursor-pointer"
                >
                  Ajustar al Total
                </button>
              </div>
            )}

            <form
              onSubmit={handleValidatedSubmit}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') e.preventDefault(); }}
              className="flex-1 overflow-hidden flex flex-col p-2 space-y-1.5"
            >
              {/* === SECCIÓN 1: CABECERA Y CLIENTE (ESTRUCTURA ORDENADA POR FILAS) === */}
              <fieldset className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs space-y-2 shrink-0">
                <legend className="text-[10px] font-bold text-blue-700 px-1.5 uppercase tracking-tight">
                  Datos del Comprobante y Cliente
                </legend>

                {/* FILA 1: Tipo Documento, Serie, Nro Comprobante, Emisión, Moneda y T.C. */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Tipo de Documento */}
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-bold text-slate-600 w-14 text-right shrink-0">Tipo:</span>
                    <select
                      value={formData.documentType || '01'}
                      onChange={e => handleDocumentTypeChange(e.target.value)}
                      className="h-7.5 w-36 border border-slate-300 rounded px-1.5 text-xs font-bold bg-white text-slate-800 outline-none focus:border-blue-500"
                      required
                    >
                      {documentTypes.filter(dt => ['01', '03', '07', '08'].includes(dt.code)).map(dt => (
                        <option key={dt.code} value={dt.code}>{dt.code} - {dt.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Serie */}
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-bold text-slate-600 shrink-0">Serie:</span>
                    <select
                      value={formData.series || ''}
                      onChange={e => handleSeriesChange(e.target.value)}
                      className="h-7.5 w-20 border border-slate-300 rounded px-1 text-xs font-bold bg-white text-slate-800 outline-none focus:border-blue-500 font-mono"
                    >
                      <option value="">--Serie--</option>
                      {currentAvailableSeries.map((s: any) => (
                        <option key={s.id} value={s.id}>{s.series}</option>
                      ))}
                    </select>
                  </div>

                  {/* Nro Comprobante */}
                  <div className="relative w-36">
                    <input
                      type="text"
                      readOnly={!isEditingDocNumber}
                      value={formData.docSeries && formData.docNumber ? `${formData.docSeries}-${formData.docNumber}` : (formData.docNumber || '00000001')}
                      onChange={e => {
                        const val = e.target.value;
                        setFormData((prev: any) => ({ ...prev, docNumber: val }));
                      }}
                      className={`h-7.5 w-full border rounded px-1.5 text-xs font-black font-mono text-center outline-none ${
                        isEditingDocNumber ? 'bg-amber-50 border-amber-400 text-amber-900' : 'bg-slate-100 border-slate-300 text-blue-800'
                      }`}
                      placeholder="F001-00000001"
                    />
                    <button 
                      type="button" 
                      onClick={() => setIsEditingDocNumber(!isEditingDocNumber)} 
                      className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-blue-600"
                      title="Modificar número manualmente"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Fecha de Emisión */}
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-bold text-slate-600 shrink-0">Emisión:</span>
                    <input
                      type="date"
                      value={formData.issueDate || ''}
                      onChange={e => setFormData((prev: any) => ({ ...prev, issueDate: e.target.value }))}
                      className="h-7.5 w-32 border border-slate-300 rounded px-1.5 text-xs font-bold bg-white text-slate-800 outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Moneda & Tipo de Cambio */}
                  <div className="flex items-center gap-1">
                    <select
                      value={formData.currency || 'PEN'}
                      onChange={e => setFormData((prev: any) => ({ ...prev, currency: e.target.value }))}
                      className="h-7.5 w-20 border border-slate-300 rounded px-1 text-xs font-bold bg-white text-slate-800 outline-none shrink-0"
                    >
                      {sunatCurrencies.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                    </select>
                    <input
                      type="number"
                      step="0.001"
                      value={formData.exchangeRate || '1.000'}
                      onChange={e => setFormData((prev: any) => ({ ...prev, exchangeRate: e.target.value }))}
                      className="h-7.5 w-18 border border-slate-300 rounded px-1 text-xs font-bold text-center bg-amber-50/70 text-amber-900 outline-none"
                      title="Tipo de Cambio"
                      placeholder="T.C."
                    />
                  </div>
                </div>

                {/* FILA 2: Cliente (Número de Documento + Razón Social / Nombre con ancho ajustado) */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Número de Documento (RUC/DNI) */}
                  <div className="flex items-center gap-1 w-52 sm:w-56 shrink-0">
                    <span className="text-[11px] font-bold text-slate-600 w-14 text-right shrink-0">Cliente:</span>
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={formData.customerDocNumber || ''}
                        onChange={e => handleDocPredictiveSearch(e.target.value)}
                        className="h-7.5 w-full border border-slate-300 rounded pl-2 pr-12 text-xs font-bold font-mono outline-none focus:border-blue-500"
                        placeholder="RUC / DNI"
                      />
                      <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                        <button 
                          type="button" 
                          onClick={handleApiPeruSearch} 
                          disabled={isConsulting || !formData.customerDocNumber} 
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded disabled:opacity-40"
                          title="Consultar en SUNAT / RENIEC"
                        >
                          {isConsulting ? <RefreshCw className="w-3 h-3 animate-spin text-blue-600" /> : <Search className="w-3 h-3" />}
                        </button>
                        <button 
                          type="button" 
                          onClick={() => onOpenCustomerForm?.(formData.customerDocNumber)} 
                          className="p-1 text-emerald-600 hover:bg-emerald-50 rounded" 
                          title="Nuevo Cliente"
                        >
                          <UserPlus className="w-3 h-3" />
                        </button>
                      </div>

                      {docSearchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-70 mt-1 bg-white shadow-2xl border border-slate-200 rounded max-h-48 overflow-y-auto">
                          {docSearchResults.map(c => (
                            <div key={c.id} onClick={() => selectCustomer(c)} className="p-1.5 hover:bg-blue-50 cursor-pointer text-xs border-b border-slate-100">
                              <span className="font-bold">{c.docNumber}</span>
                              <span className="text-[10px] text-slate-500 ml-2">{c.name || `${c.firstName} ${c.lastName}`}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Razón Social / Nombre con tamaño ajustado y proporcionado */}
                  <div className="relative w-full sm:w-[480px] lg:w-[540px]">
                    <input
                      type="text"
                      value={formData.customerName || ''}
                      onChange={e => handleNamePredictiveSearch(e.target.value)}
                      className="h-7.5 w-full border border-slate-300 rounded px-2 text-xs font-bold bg-[#D9E9FF] text-[#004A99] uppercase outline-none focus:border-blue-500"
                      placeholder="NOMBRE O RAZÓN SOCIAL DEL CLIENTE"
                      required
                    />
                    {customerSearchResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-70 mt-1 bg-white shadow-2xl border border-slate-200 rounded max-h-48 overflow-y-auto">
                        {customerSearchResults.map(c => (
                          <div key={c.id} onClick={() => selectCustomer(c)} className="p-1.5 hover:bg-blue-50 cursor-pointer text-xs border-b border-slate-100">
                            <span className="font-bold">{c.name || `${c.firstName} ${c.lastName}`}</span>
                            <span className="text-[10px] text-slate-500 ml-2">{c.docNumber}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* FILA 3: Dirección con tamaño ajustado y proporcionado */}
                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-bold text-slate-600 w-14 text-right shrink-0">Dirección:</span>
                  <input
                    type="text"
                    value={formData.customerAddress || ''}
                    onChange={e => setFormData((prev: any) => ({ ...prev, customerAddress: e.target.value }))}
                    className="h-7.5 w-full sm:w-[620px] lg:w-[700px] border border-slate-300 rounded px-2 text-xs font-medium bg-white outline-none focus:border-blue-500"
                    placeholder="Dirección fiscal o de entrega..."
                  />
                </div>

                {/* FILA 4: Condición de Pago / Crédito, Vendedor y Tipo de Operación SUNAT */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Condición de Pago / Crédito */}
                  <div className="flex items-center gap-1 w-52 sm:w-56 shrink-0">
                    <span className="text-[11px] font-bold text-slate-600 w-14 text-right shrink-0">Condición:</span>
                    <div className="flex items-center gap-1 flex-1">
                      <select
                        value={formData.paymentCondition || 'CONTADO'}
                        onChange={e => handleConditionChange(e.target.value)}
                        className="h-7.5 w-full border border-slate-300 rounded px-1.5 text-xs font-bold bg-white text-slate-800 outline-none"
                      >
                        {sunatPaymentConditions.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                      </select>
                      {showInstallments && (
                        <button 
                          type="button" 
                          onClick={() => setIsInstallmentModalOpen(true)} 
                          className="h-7.5 px-2 bg-blue-50 text-blue-700 border border-blue-300 rounded hover:bg-blue-600 hover:text-white transition-colors flex items-center gap-1 text-[10px] font-bold shrink-0" 
                          title="Gestionar cuotas de crédito"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{installments.length} c.</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Vendedor reubicado en Fila 4 */}
                  <div className="flex items-center gap-1 w-56 sm:w-60 shrink-0">
                    <span className="text-[11px] font-bold text-slate-600 shrink-0">Vendedor:</span>
                    <select
                      value={formData.sellerId || ''}
                      onChange={e => setFormData((prev: any) => ({ ...prev, sellerId: e.target.value }))}
                      className="h-7.5 w-full border border-slate-300 rounded px-1.5 text-xs font-bold bg-white text-slate-800 outline-none truncate"
                    >
                      <option value="">--Vendedor--</option>
                      {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>

                  {/* Tipo de Operación SUNAT */}
                  <div className="flex items-center gap-1 w-72 sm:w-80 shrink-0">
                    <span className="text-[11px] font-bold text-slate-600 shrink-0">Tipo Op.:</span>
                    <select
                      value={formData.operationType || '10'}
                      onChange={e => setFormData((prev: any) => ({ ...prev, operationType: e.target.value }))}
                      className="h-7.5 w-full border border-slate-300 rounded px-1.5 text-[11px] font-bold bg-white text-slate-800 outline-none truncate"
                      title="Tipo de Operación SUNAT (Catálogo 07 / 51)"
                    >
                      <option value="10">10 | GRAVADO - OP. ONEROSA</option>
                      <option value="11">11 | [GRAVADO] RETIRO PREMIO</option>
                      <option value="12">12 | [GRAVADO] RETIRO DONACIÓN</option>
                      <option value="13">13 | [GRAVADO] RETIRO</option>
                      <option value="14">14 | [GRAVADO] PUBLICIDAD</option>
                      <option value="15">15 | [GRAVADO] BONIFICACIONES</option>
                      <option value="16">16 | [GRAVADO] ENTREGA TRABAJADORES</option>
                      <option value="20">20 | EXONERADO - ONEROSA</option>
                      <option value="30">30 | INAFECTO - ONEROSA</option>
                      <option value="40">40 | EXPORTACIÓN</option>
                      {sunatOperationTypes?.map((t: any) => (
                        <option key={t.code} value={t.code}>{t.code} | {t.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* FILA ESPECIAL: DOCUMENTO DE REFERENCIA (CON BÚSQUEDA AUTOMÁTICA AL PRESIONAR TAB O ENTER) */}
                {isCreditNote && (
                  <div className="p-2 bg-amber-50/90 rounded-lg border border-amber-300 flex flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1 w-44 shrink-0">
                        <span className="text-[11px] font-black text-amber-950 shrink-0 flex items-center gap-1">
                          <Link className="w-3 h-3 text-amber-700" /> Doc. Ref:
                        </span>
                        <select
                          value={formData.refDocType || '01'}
                          onChange={e => {
                            const newType = e.target.value;
                            setFormData((prev: any) => ({ ...prev, refDocType: newType }));
                            if (formData.refDocSeries && formData.refDocNumber) {
                              searchReferenceDocument(newType, formData.refDocSeries, formData.refDocNumber);
                            }
                          }}
                          className="h-7.5 w-full border border-amber-300 rounded px-1.5 text-xs font-bold bg-white text-slate-800 outline-none"
                        >
                          <option value="01">01 - FACTURA</option>
                          <option value="03">03 - BOLETA</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="text-[11px] font-bold text-amber-950 shrink-0">Serie/N°:</span>
                        <input
                          type="text"
                          placeholder="F001"
                          value={formData.refDocSeries || ''}
                          onChange={e => setFormData((prev: any) => ({ ...prev, refDocSeries: e.target.value.toUpperCase() }))}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              searchReferenceDocument();
                            }
                          }}
                          className="h-7.5 w-18 border border-amber-300 rounded px-1 text-xs font-mono font-bold uppercase bg-white text-center"
                        />
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="00000123"
                            value={formData.refDocNumber || ''}
                            onChange={e => setFormData((prev: any) => ({ ...prev, refDocNumber: e.target.value }))}
                            onKeyDown={e => {
                              if (e.key === 'Tab' || e.key === 'Enter') {
                                searchReferenceDocument();
                              }
                            }}
                            onBlur={() => {
                              if (formData.refDocSeries && formData.refDocNumber) {
                                searchReferenceDocument();
                              }
                            }}
                            className="h-7.5 w-28 border border-amber-300 rounded pl-1.5 pr-7 text-xs font-mono font-bold bg-white text-center"
                          />
                          <button
                            type="button"
                            onClick={() => searchReferenceDocument()}
                            disabled={isSearchingRefDoc || !formData.refDocSeries || !formData.refDocNumber}
                            className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 text-amber-700 hover:text-amber-900 disabled:opacity-40"
                            title="Buscar comprobante de referencia (o presione TAB)"
                          >
                            {isSearchingRefDoc ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-700" />
                            ) : (
                              <Search className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="text-[11px] font-bold text-amber-950 shrink-0">F. Ref:</span>
                        <input
                          type="date"
                          value={formData.refDocDate || ''}
                          onChange={e => setFormData((prev: any) => ({ ...prev, refDocDate: e.target.value }))}
                          className="h-7.5 w-32 border border-amber-300 rounded px-1 text-xs font-bold bg-white"
                        />
                      </div>

                      <div className="flex items-center gap-1 flex-1 min-w-[240px]">
                        <span className="text-[11px] font-bold text-amber-950 shrink-0">Motivo:</span>
                        <select
                          value={formData.refNoteReason || '01'}
                          onChange={e => setFormData((prev: any) => ({ ...prev, refNoteReason: e.target.value }))}
                          className="h-7.5 w-full border border-amber-300 rounded px-1.5 text-xs font-bold bg-white text-amber-950 outline-none truncate"
                        >
                          <option value="01">01 | ANULACIÓN DE LA OPERACIÓN</option>
                          <option value="02">02 | ANULACIÓN POR ERROR EN EL RUC</option>
                          <option value="03">03 | CORRECCIÓN POR ERROR EN LA DESCRIPCIÓN</option>
                          <option value="04">04 | DESCUENTO GLOBAL</option>
                          <option value="05">05 | DESCUENTO POR ÍTEM</option>
                          <option value="06">06 | DEVOLUCIÓN TOTAL</option>
                          <option value="07">07 | DEVOLUCIÓN POR ÍTEM</option>
                          <option value="08">08 | BONIFICACIÓN</option>
                          <option value="09">09 | DISMINUCIÓN EN EL VALOR</option>
                          <option value="10">10 | OTROS CONCEPTOS</option>
                        </select>
                      </div>
                    </div>

                    {/* Mensaje de estado de búsqueda de referencia */}
                    {refSearchMessage && (
                      <div className={`text-[11px] font-bold px-2 py-0.5 rounded flex items-center gap-1.5 ${
                        refSearchMessage.type === 'success' 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                          : 'bg-red-100 text-red-800 border border-red-300'
                      }`}>
                        {refSearchMessage.type === 'success' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                        )}
                        <span>{refSearchMessage.text}</span>
                      </div>
                    )}
                  </div>
                )}
              </fieldset>

              {/* === SECCIÓN 2: REFERENCIAS Y OPCIONES DE EMISIÓN (LÍNEA ÚNICA COMPACTA) === */}
              <div className="bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-2xs flex flex-wrap items-center gap-x-3 gap-y-1 text-xs shrink-0">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1 text-[11px] font-bold text-slate-700 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={formData.priceIncludesIgv !== false} 
                      onChange={e => setFormData((prev: any) => ({ ...prev, priceIncludesIgv: e.target.checked }))} 
                      className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600" 
                    />
                    Precios Inc. IGV
                  </label>
                  <label className="flex items-center gap-1 text-[11px] font-bold text-slate-700 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={formData.includeIgv !== false} 
                      onChange={e => setFormData((prev: any) => ({ ...prev, includeIgv: e.target.checked }))} 
                      className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600" 
                    />
                    Afecto IGV
                  </label>
                </div>

                <div className="h-4 w-px bg-slate-200 hidden sm:block" />

                {/* N° Pedido de Referencia */}
                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-bold text-blue-800">N° Pedido:</span>
                  <input 
                    type="text" 
                    value={formData.orderNumber || (formData.orderId ? `PED-${String(formData.orderId).padStart(6, '0')}` : '')} 
                    onChange={e => setFormData((prev: any) => ({ ...prev, orderNumber: e.target.value }))}
                    className="h-6 w-32 border border-blue-200 rounded px-1.5 text-[11px] font-black bg-blue-50 text-blue-900 text-center font-mono" 
                    placeholder="S/P" 
                  />
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-bold text-slate-500">Guía Rem.:</span>
                  <input 
                    type="text" 
                    value={formData.guideRemission || ''} 
                    onChange={e => setFormData((prev: any) => ({ ...prev, guideRemission: e.target.value }))}
                    className="h-6 w-28 border border-slate-300 rounded px-1.5 text-[11px] font-bold bg-white text-slate-700 font-mono" 
                    placeholder="T001-00001" 
                  />
                </div>

                <div className="flex items-center gap-1 flex-1 min-w-[200px]">
                  <span className="text-[11px] font-bold text-slate-500">Obs / Concepto:</span>
                  <input 
                    type="text" 
                    value={formData.notes || ''} 
                    onChange={e => setFormData((prev: any) => ({ ...prev, notes: e.target.value }))}
                    className="h-6 flex-1 border border-slate-300 rounded px-2 text-[11px] font-medium bg-white text-slate-700" 
                    placeholder="Observaciones de comprobante..." 
                  />
                </div>
              </div>

              {/* === SECCIÓN 3: GRILLA DE PRODUCTOS Y DETALLES (MÁXIMO ESPACIO VERTICAL) === */}
              <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden flex flex-col flex-1 min-h-[220px]">
                {/* Toolbar de productos */}
                <div className="bg-slate-100/90 border-b border-slate-200 px-2.5 py-1.5 flex items-center justify-between gap-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <button 
                      type="button" 
                      onClick={() => setIsProductSearchOpen(true)} 
                      className="h-7 px-3 bg-blue-700 hover:bg-blue-800 text-white rounded text-xs font-bold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Agregar Producto
                    </button>
                    <button 
                      type="button" 
                      onClick={() => removeQuotationItem(-1)} 
                      className="h-7 px-2.5 bg-white border border-slate-300 hover:bg-red-50 hover:border-red-300 hover:text-red-600 text-slate-600 rounded text-xs font-bold flex items-center gap-1 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Quitar Último
                    </button>
                  </div>

                  <div className="relative group w-80">
                    <input
                      type="text"
                      placeholder="Buscar y añadir producto por código o nombre..."
                      onChange={e => handleSearchProduct(e.target.value)}
                      className="h-7 w-full border border-slate-300 bg-white text-slate-800 rounded pl-7 pr-2 text-xs font-medium outline-none focus:border-blue-500 shadow-2xs"
                    />
                    <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                    
                    {searchResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white shadow-2xl border border-slate-200 rounded-lg max-h-64 overflow-y-auto">
                        {searchResults.map(p => (
                          <div key={p.id} onClick={() => { addQuotationItem(p); handleSearchProduct(''); }} className="p-2 hover:bg-blue-50 cursor-pointer text-xs flex justify-between border-b border-slate-50 items-center">
                            <div>
                              <span className="font-bold text-slate-800 block">{p.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{p.code}</span>
                            </div>
                            <span className="text-blue-700 font-black text-xs">S/ {formatNumber(p.salePrice)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Tabla de Productos con Header Fijo */}
                <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
                  <table className="w-full text-xs border-collapse">
                    <thead className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur-xs text-slate-700 border-b border-slate-200 shadow-2xs">
                      <tr>
                        <th className="px-2 py-1.5 font-bold text-center w-8">#</th>
                        <th className="px-2 py-1.5 font-bold text-center w-12">Alm.</th>
                        <th className="px-2 py-1.5 font-bold text-left w-24">Código</th>
                        <th className="px-2 py-1.5 font-bold text-left min-w-[220px]">Descripción del Producto</th>
                        <th className="px-2 py-1.5 font-bold text-center w-18">Gratuito</th>
                        <th className="px-2 py-1.5 font-bold text-right w-20">Cantidad</th>
                        <th className="px-2 py-1.5 font-bold text-center w-16">U. M.</th>
                        <th className="px-2 py-1.5 font-bold text-right w-24">P. Unitario</th>
                        <th className="px-2 py-1.5 font-bold text-right w-20">Dscto %</th>
                        <th className="px-2 py-1.5 font-bold text-right w-24">Importe</th>
                        <th className="px-2 py-1.5 w-10 text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {quotationItems.map((item, index) => {
                        const isFree = item.isFree || item.isBonus || false;
                        const refPrice = Number(item.referencePrice || item.originalPrice || item.price || 0);
                        const effectivePrice = isFree ? 0 : Number(item.price || 0);
                        const subtotal = effectivePrice * (Number(item.quantity) || 0);
                        const discountAmt = subtotal * ((Number(item.discount) || 0) / 100);
                        const totalLine = subtotal - discountAmt;

                        return (
                          <tr key={item.productId || index} className={`transition-colors ${isFree ? 'bg-amber-50/40 hover:bg-amber-50/70' : 'hover:bg-blue-50/40'}`}>
                            <td className="px-2 py-1.5 text-center font-bold text-slate-400">{index + 1}</td>
                            <td className="px-2 py-1.5 text-center font-mono font-bold text-slate-500">01</td>
                            <td className="px-2 py-1.5 font-mono font-bold text-slate-700">{item.code || '-'}</td>
                            <td className="px-2 py-1.5 font-bold text-slate-800 truncate max-w-sm" title={item.name}>
                              <div className="flex items-center gap-1.5">
                                {isFree && (
                                  <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-black uppercase tracking-tight shrink-0 border border-amber-200">
                                    BONIFICACIÓN
                                  </span>
                                )}
                                <span className="truncate">{item.name}</span>
                              </div>
                            </td>

                            {/* Columna Gratuito / Bonificación */}
                            <td className="px-2 py-1.5 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  if (!isFree) {
                                    updateQuotationItem(item.productId, {
                                      referencePrice: item.price || refPrice,
                                      isFree: true,
                                      price: 0,
                                      discount: 0
                                    });
                                  } else {
                                    const restoreP = item.referencePrice || refPrice || 0;
                                    updateQuotationItem(item.productId, {
                                      isFree: false,
                                      price: restoreP
                                    });
                                  }
                                }}
                                className={`px-2 py-0.5 rounded text-[9px] font-black uppercase transition-all flex items-center justify-center gap-1 mx-auto cursor-pointer ${
                                  isFree 
                                    ? 'bg-amber-500 text-white shadow-xs ring-1 ring-amber-400' 
                                    : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                                }`}
                                title={isFree ? "Ítem marcado como regalo/bonificación (Gratuito S/ 0.00)" : "Marcar producto como regalo/bonificación"}
                              >
                                <Gift className="w-2.5 h-2.5" />
                                {isFree ? 'SÍ' : 'NO'}
                              </button>
                            </td>

                            <td className="px-2 py-1.5">
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={e => updateQuotationItem(item.productId, 'quantity', parseFloat(e.target.value) || 0)}
                                className="w-full h-6 text-right border border-slate-300 rounded px-1.5 font-bold text-xs bg-white outline-none focus:border-blue-500"
                              />
                            </td>

                            <td className="px-2 py-1.5 text-center">
                              <select
                                value={item.unitMeasure || item.package?.symbol || item.subPackage?.symbol || item.unit?.symbol || 'UND'}
                                onChange={e => updateQuotationItem(item.productId, 'unitMeasure', e.target.value)}
                                className="h-6 w-full text-center border border-slate-300 rounded px-1 font-bold text-xs bg-white outline-none cursor-pointer"
                              >
                                {item.unitOptions && item.unitOptions.length > 0 ? (
                                  item.unitOptions.map((u: any, i: number) => (
                                    <option key={i} value={u.symbol}>{u.symbol}</option>
                                  ))
                                ) : (
                                  <option value={item.unitMeasure || 'UND'}>{item.unitMeasure || 'UND'}</option>
                                )}
                              </select>
                            </td>

                            <td className="px-2 py-1.5">
                              {isFree ? (
                                <div className="flex flex-col items-end leading-tight">
                                  <span className="font-black text-amber-700 text-xs">S/ 0.00</span>
                                  <span className="text-[8px] text-slate-400 font-medium">Ref: S/ {formatNumber(refPrice)}</span>
                                </div>
                              ) : (
                                <input
                                  type="number"
                                  step="0.01"
                                  value={item.price}
                                  onChange={e => updateQuotationItem(item.productId, 'price', parseFloat(e.target.value) || 0)}
                                  className="w-full h-6 text-right border border-slate-300 rounded px-1.5 font-bold text-xs bg-white outline-none focus:border-blue-500"
                                />
                              )}
                            </td>

                            <td className="px-2 py-1.5">
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="100"
                                disabled={isFree}
                                value={isFree ? 0 : (item.discount || 0)}
                                onChange={e => updateQuotationItem(item.productId, 'discount', parseFloat(e.target.value) || 0)}
                                className="w-full h-6 text-right border border-slate-300 rounded px-1.5 font-bold text-xs bg-white outline-none focus:border-blue-500 text-slate-600 disabled:opacity-50"
                              />
                            </td>

                            <td className="px-2 py-1.5 text-right font-black text-slate-800">
                              {isFree ? (
                                <span className="text-amber-700 font-black">S/ 0.00</span>
                              ) : (
                                `S/ ${formatNumber(totalLine)}`
                              )}
                            </td>

                            <td className="px-2 py-1.5 text-center">
                              <button 
                                type="button" 
                                onClick={() => removeQuotationItem(item.productId)} 
                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Eliminar fila"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {quotationItems.length === 0 && (
                        <tr>
                          <td colSpan={11} className="py-12 text-center text-slate-400 italic text-xs">
                            No hay productos agregados en este comprobante. Busque productos arriba o haga clic en "Agregar Producto".
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* === SECCIÓN 4: TOTALES Y LIQUIDACIÓN (COMPACTA) === */}
              <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs shrink-0">
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 text-xs items-center">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Descuento</span>
                    <input type="text" readOnly className="h-6 w-full text-right border border-slate-200 rounded px-1.5 font-bold text-xs bg-slate-50 text-slate-600" value="0.00" />
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Op. Gravada (V. Venta)</span>
                    <input type="text" readOnly className="h-6 w-full text-right border border-slate-300 rounded px-1.5 font-bold text-xs bg-slate-50 text-slate-800 font-mono" value={formatNumber(valorVenta)} />
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">I.G.V. (18%)</span>
                    <input type="text" readOnly className="h-6 w-full text-right border border-slate-300 rounded px-1.5 font-bold text-xs bg-slate-50 text-slate-800 font-mono" value={formatNumber(igvTotal)} />
                  </div>

                  {totalGratuito > 0 ? (
                    <div className="space-y-0.5 bg-amber-50 p-1 rounded border border-amber-200">
                      <span className="text-[9px] font-black text-amber-800 uppercase block">Op. Gratuita</span>
                      <span className="font-black text-amber-900 text-xs block text-right font-mono">S/ {formatNumber(totalGratuito)}</span>
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">ISC / Percepción</span>
                      <input type="text" readOnly className="h-6 w-full text-right border border-slate-200 rounded px-1.5 font-bold text-xs bg-slate-50 text-slate-600" value="0.00" />
                    </div>
                  )}

                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Redondeo</span>
                    <input type="text" readOnly className="h-6 w-full text-right border border-slate-200 rounded px-1.5 font-bold text-xs bg-slate-50 text-slate-600" value="0.00" />
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Cant. Items</span>
                    <input type="text" readOnly className="h-6 w-full text-center border border-slate-200 rounded px-1.5 font-bold text-xs bg-slate-50 text-slate-700" value={quotationItems.reduce((s, i) => s + (Number(i.quantity) || 0), 0)} />
                  </div>

                  {/* CAJA DESTACADA TOTAL */}
                  <div className="col-span-2 bg-[#D9E9FF] p-2 rounded-lg border border-[#004A99] flex items-center justify-between shadow-2xs">
                    <div>
                      <span className="text-[10px] font-black text-[#004A99] uppercase tracking-wider block">IMPORTE TOTAL</span>
                      <span className="text-[11px] font-bold text-blue-800">{formData.currency === 'USD' ? 'DÓLARES' : 'SOLES'}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-black text-[#004A99] tracking-tight font-mono">
                        {formData.currency === 'USD' ? '$' : 'S/'} {formatNumber(totalComprobante)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* === FOOTER: BOTONES DE ACCIÓN === */}
              <div className="p-1 flex items-center justify-between shrink-0">
                <div className="flex gap-2">
                  <button 
                    type="button" 
                    onClick={onClose} 
                    className="h-8 px-4 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <X className="w-3.5 h-3.5 text-red-500" /> Salir
                  </button>
                  <button 
                    type="button" 
                    className="h-8 px-4 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <Printer className="w-3.5 h-3.5 text-blue-700" /> Vista Previa
                  </button>
                </div>

                <button 
                  type="submit" 
                  disabled={loading || quotationItems.length === 0} 
                  className="h-8 px-6 bg-[#004A99] hover:bg-blue-800 text-white font-bold rounded-lg text-xs shadow-md shadow-blue-900/10 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  {loading ? 'Emitiendo...' : (editingItem ? 'Guardar Cambios' : 'Emitir Comprobante')}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL GESTIÓN DE CUOTAS */}
      <AnimatePresence>
        {isInstallmentModalOpen && (
          <div className="absolute inset-0 z-120 flex items-center justify-center p-0 overflow-hidden">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsInstallmentModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" />
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 20 }}
              className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-300 z-10"
            >
              <div className="bg-[#004A99] px-4 py-2.5 flex items-center justify-between text-white">
                <h2 className="text-xs font-bold tracking-tight uppercase flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Gestión de Cuotas de Crédito
                </h2>
                <button onClick={() => setIsInstallmentModalOpen(false)} className="hover:bg-red-500 text-white p-1 rounded transition-colors"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-4 gap-2 items-end">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">N° Cuotas</span>
                    <input 
                      type="number" 
                      min="1" 
                      max="36" 
                      value={creditQty} 
                      onChange={e => handleCreditQtyChange(parseInt(e.target.value) || 1)} 
                      className="h-8 w-full border border-slate-300 rounded px-2 text-xs font-bold text-center" 
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Días p/ 1ra Cuota</span>
                    <input 
                      type="number" 
                      min="1" 
                      value={creditDays} 
                      onChange={e => handleCreditDaysChange(parseInt(e.target.value) || 30)} 
                      className="h-8 w-full border border-blue-400 bg-blue-50/50 rounded px-2 text-xs font-bold text-center text-blue-900" 
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">F. 1ra Cuota</span>
                    <input 
                      type="date" 
                      value={creditStart} 
                      onChange={e => handleCreditStartChange(e.target.value)} 
                      className="h-8 w-full border border-slate-300 rounded px-1.5 text-xs font-bold" 
                    />
                  </div>
                  <button 
                    type="button" 
                    onClick={() => generateInstallmentsList(creditQty, creditDays, creditStart, creditAmount || quotationTotal)} 
                    className="h-8 bg-blue-700 text-white rounded text-xs font-bold hover:bg-blue-800 flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Generar
                  </button>
                </div>

                {installments.length > 0 && (
                  <div className="border border-slate-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                        <tr>
                          <th className="px-3 py-1.5 text-left">#</th>
                          <th className="px-3 py-1.5 text-right">Monto Cuota</th>
                          <th className="px-3 py-1.5 text-right">Días</th>
                          <th className="px-3 py-1.5 text-right">Fecha Vencimiento</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {installments.map((inst, i) => (
                          <tr key={i}>
                            <td className="px-3 py-1.5 font-bold text-slate-600">{inst.number}</td>
                            <td className="px-3 py-1.5 text-right font-black text-blue-700">S/ {formatNumber(inst.amount)}</td>
                            <td className="px-3 py-1.5 text-right text-slate-500">{inst.daysOffset} días</td>
                            <td className="px-3 py-1.5 text-right font-mono font-bold text-slate-800">{inst.dueDate}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                
                <div className="pt-2 flex justify-end">
                  <button type="button" onClick={() => setIsInstallmentModalOpen(false)} className="px-5 h-8 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded text-xs transition-colors">
                    Aceptar Cuotas
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ProductSearchModal 
        isOpen={isProductSearchOpen} 
        onClose={() => setIsProductSearchOpen(false)} 
        onSelect={(p) => { addQuotationItem(p); setIsProductSearchOpen(false); }} 
        token={token} 
      />
    </AnimatePresence>
  );
};
