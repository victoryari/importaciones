import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutDashboard, Package, Save, Image as ImageIcon, Settings as SettingsIcon, LogOut, Trash2, X, CheckCircle, AlertCircle, FileText, BarChart3, Star, ShoppingCart, Truck, DollarSign, User, MapPin, Hash, ArrowRightLeft, Building2, Users, ShieldCheck, PackageSearch, ChevronDown, Receipt } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SettingsModule } from './admin/SettingsModule';
import { ExchangeRateModule } from './admin/ExchangeRateModule';
import { LogisticsModule } from './admin/LogisticsModule';
import { QuotationModule } from './admin/QuotationModule';
import { ProductModule } from './admin/ProductModule';
import { OrderModule } from './admin/OrderModule';
import { InventoryModule } from './admin/InventoryModule';
import { CustomerModule } from './admin/CustomerModule';
import { DashboardModule } from './admin/DashboardModule';
import { SellerModule } from './admin/SellerModule';
import { WarehouseModule } from './admin/WarehouseModule';
import WarehousePickingModule from './admin/WarehousePickingModule';
import { SeriesModule } from './admin/SeriesModule';
import { InvoiceModule } from './admin/InvoiceModule';
import { PurchaseModule } from './admin/PurchaseModule';
import { TransferModule } from './admin/TransferModule';
import { SupplierModule } from './admin/SupplierModule';
import { RoleModule } from './admin/RoleModule';
import { UserModule } from './admin/UserModule';
import { AdvancedLogisticsModule } from './admin/AdvancedLogisticsModule';
import { ReferralGuideModule } from './admin/ReferralGuideModule';
import { ProfileView } from './admin/ProfileView';

// Formularios
import { QuotationForm } from './admin/forms/QuotationForm';
import { OrderForm } from './admin/forms/OrderForm';
import { ProductForm } from './admin/forms/ProductForm';
import { SimpleForm } from './admin/forms/SimpleForm';
import { WarehouseForm } from './admin/forms/WarehouseForm';
import { CustomerForm } from './admin/forms/CustomerForm';
import { SellerForm } from './admin/forms/SellerForm';
import { AgencyForm } from './admin/forms/AgencyForm';
import { SeriesForm } from './admin/forms/SeriesForm';
import { PurchaseEntryForm } from './admin/forms/PurchaseEntryForm';
import { ReferralGuideForm } from './admin/forms/ReferralGuideForm';
import { SalesReferralGuideForm } from './admin/forms/SalesReferralGuideForm';
import { SupplierForm } from './admin/forms/SupplierForm';
import { TransferForm } from './admin/forms/TransferForm';
import { MovementAssistantForm } from './admin/forms/MovementAssistantForm';
import PaymentForm from './admin/forms/PaymentForm';
import { InvoiceForm } from './admin/forms/InvoiceForm';
import { OrderDetailModal } from './admin/OrderDetailModal';
import { formatFullCustomerAddress } from '../lib/utils';

import axios from 'axios';
import { getDeptId, getProvId, getDistId, resolveUbigeoInfo } from '../lib/ubigeoData';

// --- Interfaces Globales Estrictas ---
interface Category { id: number; name: string; slug: string; image?: string; isFeatured: boolean; _count?: { products: number }; }
interface Brand { id: number; name: string; logo?: string; _count?: { products: number }; }
interface Unit { id: number; name: string; symbol: string; }
interface Product { id: number; code?: string; name: string; slug: string; weight?: number; volume?: number; description?: string; features?: string; sanitaryRegister?: string; certificate?: string; igv: number; costPrice: number; salePrice: number; minSalePrice?: number; maxSalePrice?: number; stock: number; images?: string[]; isActive: boolean; categoryId: number; category?: { name: string }; brandId?: number; brand?: { name: string }; unitId?: number; unit?: { name?: string; symbol?: string }; packageId?: number; package?: { name?: string; symbol?: string }; subPackageId?: number; subPackage?: { name?: string; symbol?: string }; quantityPerPackage?: number; quantityPerSubPackage?: number; showInWeb: boolean; manageLots: boolean; useExpiryDate: boolean; }
interface Order { id: number; customerName: string; customerEmail?: string; customerPhone: string; totalAmount: number; status: string; createdAt: string; items: any[]; paymentStatus: string; }
interface Customer { id: number; code?: string; name: string; personType: string; docType: string; docNumber: string; address?: string; phone?: string; email?: string; country: string; department?: string; province?: string; district?: string; firstName?: string; lastName?: string; }
interface Quotation { id: number; customerName: string; totalAmount: number; status: string; createdAt: string; items: any[]; exchangeRate: number; docSeries?: string; docNumber?: string; customerDocNumber?: string; customerPhone?: string; customerAddress?: string; currency?: string; pickupPlace?: string; sellerId?: number; customerId?: number; }

export default function Admin() {
  const { token, logout, user, updateUser, hasPermission } = useAuth();
  
  // Estados de Datos
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [shippingAgencies, setShippingAgencies] = useState<any[]>([]);
  const [shippingZones, setShippingZones] = useState<any[]>([]);
  const [documentTypes, setDocumentTypes] = useState<any[]>([]);
  const [seriesDocTypes, setSeriesDocTypes] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [exchangeRates, setExchangeRates] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [sunatCurrencies, setSunatCurrencies] = useState<any[]>([]);
  const [sunatPaymentConditions, setSunatPaymentConditions] = useState<any[]>([]);
  const [sunatOperationTypes, setSunatOperationTypes] = useState<any[]>([]);
  const [sunatIgvAffectations, setSunatIgvAffectations] = useState<any[]>([]);
  const [sunatDocTypes, setSunatDocTypes] = useState<any[]>([]);
  const [series, setSeries] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [stockDetails, setStockDetails] = useState<any[]>([]);

  // Estados de UI
  const [openTabs, setOpenTabs] = useState<{id: string, label: string}[]>([{ id: 'dashboard', label: 'Resumen' }]);
  const [activeTabId, setActiveTabId] = useState<string>('dashboard');
  const view = activeTabId; // Alias for backward compatibility
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    ventas: false,
    compras: false,
    logistica: false,
    general: false
  });

  const handleOpenTab = (id: string, label: string) => {
    if (!openTabs.find(t => t.id === id)) {
      setOpenTabs([...openTabs, { id, label }]);
    }
    setActiveTabId(id);
  };

  const handleCloseTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newTabs = openTabs.filter(t => t.id !== id);
    setOpenTabs(newTabs);
    if (activeTabId === id && newTabs.length > 0) {
      setActiveTabId(newTabs[newTabs.length - 1].id);
    } else if (newTabs.length === 0) {
      handleOpenTab('dashboard', 'Resumen');
    }
  };
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isSellerModalOpen, setIsSellerModalOpen] = useState(false);
  const [isSimpleModalOpen, setIsSimpleModalOpen] = useState(false);
  const [isAgencyModalOpen, setIsAgencyModalOpen] = useState(false);
  const [isSeriesModalOpen, setIsSeriesModalOpen] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isMovementAssistantOpen, setIsMovementAssistantOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<any>(null);
  const [isReferralGuideModalOpen, setIsReferralGuideModalOpen] = useState(false);
  const [selectedOrderIdForGuide, setSelectedOrderIdForGuide] = useState<number | null>(null);
  const [referralGuideRefreshTrigger, setReferralGuideRefreshTrigger] = useState(0);
  const [simpleModalType, setSimpleModalType] = useState<'categories' | 'brands' | 'units' | 'warehouses'>('categories');
  const [logisticsTab, setLogisticsTab] = useState<'agencies' | 'zones'>('agencies');

  // Formularios iniciales
  const initialSellerData = { name: '', dni: '', phone: '', email: '', warehouseId: '', isActive: true };
  const initialProductData = { code: '', name: '', slug: '', weight: '', description: '', features: '', sanitaryRegister: '', certificate: '', igv: 18, costPrice: 0, salePrice: 0, profitMargin: 30, minSalePrice: 0, maxSalePrice: 0, stock: 0, categoryId: '', brandId: '', unitId: '', packageId: '', quantityPerPackage: 1, subPackageId: '', quantityPerSubPackage: 1, images: [], isActive: true, isFeatured: false, showInWeb: true, manageLots: false, useExpiryDate: false, isOnSale: false, discountPercent: '' };
  const initialQuotationData = { 
    igvPercent: 18,
    docType: 'COT',
    docSeries: '0005',
    docNumber: '',
    internalCode: '',
    date: new Date().toISOString().split('T')[0], 
    expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    exchangeRate: 1.0,
    ruc: '',
    razonSocial: '',
    address: '',
    customerId: '', 
    sellerId: '',
    warehouseId: user?.warehouseId ? user.warehouseId.toString() : '',
    paymentCondition: 'CONTADO',
    currency: '1', 
    sellerName: user?.name || '',
    observation: '',
    globalDiscount: 0,
    billingStatus: 'SIN FACTURAR',
    agencyId: '',
    branchId: '',
    purchaseOrder: '',
    requirementNumber: '',
    priceIncludesIgv: true,
    operationType: '10',
    pickupPlace: '',
    flete: 0,
    includeIgv: true 
  };
  const initialCustomerData = { personType: 'NATURAL', docType: 'DNI', docNumber: '', firstName: '', secondName: '', lastName: '', surname: '', name: '', email: '', phone: '', address: '', country: 'PERU', department: '', province: '', district: '' };
  const initialSimpleData = { name: '', slug: '', image: '', logo: '', symbol: '' };
  const initialAgencyData = { name: '', ruc: '', address: '', legalAddress: '', phone: '', email: '', contact: '', department: '', province: '', district: '', zoneId: '', isActive: true, branches: [] };
  const initialSeriesData = { documentType: 'COT', series: '', currentNumber: 0, warehouseId: '', isActive: true };
  const initialInvoiceData = {
    documentType: '01', series: '', docSeries: '', docNumber: '', seriesId: '',
    customerName: '', customerDocType: 'DNI', customerDocNumber: '', customerAddress: '',
    customerEmail: '', customerPhone: '', customerId: '',
    warehouseId: user?.warehouseId ? user.warehouseId.toString() : '',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    currency: 'PEN', exchangeRate: '1.000',
    paymentCondition: 'CONTADO', operationType: '10',
    includeIgv: true, priceIncludesIgv: true, igvPercent: 18,
    sellerId: '', orderId: '', orderNumber: '', guideRemission: '', notes: '',
    refDocType: '01', refDocSeries: '', refDocNumber: '', refDocDate: '', refNoteReason: '01',
    installments: [] as any[],
  };
  const initialWarehouseData = { code: '', sunatCode: '0000', name: '', commercialName: '', address: '', ruc: '', ubigeo: '', observation: '', phones: '', type: '', validateStock: true, isActive: true, floors: [] };

  const [agencyFormData, setAgencyFormData] = useState(initialAgencyData);
  const [warehouseFormData, setWarehouseFormData] = useState(initialWarehouseData);
  const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false);

  const [sellerFormData, setSellerFormData] = useState(initialSellerData);
  const [productFormData, setProductFormData] = useState(initialProductData);
  const [customerFormData, setCustomerFormData] = useState(initialCustomerData);
  const [seriesFormData, setSeriesFormData] = useState(initialSeriesData);
  const [invoiceFormData, setInvoiceFormData] = useState(initialInvoiceData);
  const [invoiceItems, setInvoiceItems] = useState<any[]>([]);
  const [orderDetail, setOrderDetail] = useState<any>(null);
  const [isOrderDetailOpen, setIsOrderDetailOpen] = useState(false);
  const [purchaseFormData, setPurchaseFormData] = useState({
    supplierId: '', supplierName: '', docType: '01', docSeries: '', docNumber: '',
    date: new Date().toISOString().split('T')[0], currency: 'PEN', exchangeRate: '1.00',
    warehouseId: '', purchaseType: 'MERCADERIA', paymentCondition: 'CONTADO', creditDays: 0,
    observation: '', items: [] as any[]
  });
  const [supplierFormData, setSupplierFormData] = useState({
    name: '', docType: 'RUC', docNumber: '', address: '', phone: '', email: '', contact: ''
  });
  const [transferFormData, setTransferFormData] = useState({
    fromWarehouseId: '', toWarehouseId: '', docNumber: '', date: new Date().toISOString().split('T')[0], observation: '',
    items: [] as any[]
  });
  const [quotationFormData, setQuotationFormData] = useState<any>(initialQuotationData);
  const [simpleFormData, setSimpleFormData] = useState(initialSimpleData);
  const [quotationItems, setQuotationItems] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [quotationTotal, setQuotationTotal] = useState(0);

  useEffect(() => { fetchData(); }, []);
  useEffect(() => {
    const total = quotationItems.reduce((acc, item) => {
      if (item.isFree) return acc;
      return acc + (Number(item.price || 0) * Number(item.quantity || 0) * (1 - (Number(item.discount) || 0) / 100));
    }, 0);
    setQuotationTotal(total);
  }, [quotationItems]);

  useEffect(() => {
    if (view === 'quotations' && isQuotationModalOpen && quotationFormData.date) {
      axios.get(`/api/exchange-rates/fetch-by-date/${quotationFormData.date}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => {
          if (res.data) {
            const isSoles = quotationFormData.currency === '1' || quotationFormData.currency === 'PEN';
            const rate = isSoles ? res.data.buy_rate : res.data.sell_rate;
            setQuotationFormData((prev: any) => ({ ...prev, exchangeRate: rate }));
          }
        }).catch(err => console.error("TC by date error:", err));
    }
  }, [quotationFormData.date, isQuotationModalOpen, view, quotationFormData.currency]);

  const showSuccess = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000); };
  const showError = (msg: string) => { setErrorMsg(msg); setTimeout(() => setErrorMsg(''), 4000); };

  const handleResetQuotationForm = () => {
    setQuotationFormData(initialQuotationData);
    setQuotationItems([]);
    setSearchResults([]);
    setEditingItem(null);
  };

  const handleSearchProduct = (q: string) => {
    if (q.length > 1) {
      // Usar endpoint correcto con todos los includes necesarios
      axios.get(`/api/products/search?q=${q}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => setSearchResults(r.data));
    } else {
      setSearchResults([]);
    }
  };

  const addQuotationItem = (p: any) => {
    if (!quotationItems.find(i => i.productId === p.id)) {
      const validRecords = (p.stockRecords || []).filter((sr: any) => {
        const isTransitory = sr.warehouseId === 6 || sr.warehouse?.type?.toUpperCase() === 'TRANSITORIO';
        return sr.quantity > 0 && !isTransitory;
      });
      
      const oldestLot = validRecords.sort((a: any, b: any) => a.id - b.id)[0];

      // Construir lista de unidades de medida jerárquicas
      const unitOptions: any[] = [];
      if (p.subPackage) {
        unitOptions.push({ symbol: p.subPackage.symbol, name: p.subPackage.name, qtyPerBase: p.quantityPerSubPackage * p.quantityPerPackage });
      }
      if (p.package) {
        unitOptions.push({ symbol: p.package.symbol, name: p.package.name, qtyPerBase: p.quantityPerPackage });
      }
      if (p.unit) {
        unitOptions.push({ symbol: p.unit.symbol, name: p.unit.name, qtyPerBase: 1 });
      }

      setQuotationItems([...quotationItems, {
        productId: p.id,
        name: p.name,
        code: p.code,
        price: p.salePrice,
        originalPrice: p.salePrice,
        referencePrice: p.salePrice,
        isFree: false,
        freeType: '15',
        quantity: 1,
        discount: 0,
        unit: p.unit,
        package: p.package,
        subPackage: p.subPackage,
        quantityPerPackage: p.quantityPerPackage || 1,
        quantityPerSubPackage: p.quantityPerSubPackage || 1,
        unitMeasure: p.package?.symbol || p.subPackage?.symbol || p.unit?.symbol || 'UND',
        unitOptions,
        lot: oldestLot?.lotNumber || oldestLot?.lot || null,
        warehouseName: oldestLot?.warehouse?.name || 'S/A',
        expiryDate: oldestLot?.expiryDate || null,
        stockRecords: p.stockRecords || []
      }]);
    }
    setSearchResults([]);
  };

  const updateQuotationItem = (id: number, f: string | Record<string, any>, v?: any) => {
    setQuotationItems(prev => prev.map(i => {
      if (i.productId === id) {
        if (typeof f === 'object' && f !== null) {
          return { ...i, ...f };
        }
        return { ...i, [f as string]: v };
      }
      return i;
    }));
  };

  const removeQuotationItem = (id: number) => {
    if (id === -1) {
      setQuotationItems(prev => prev.slice(0, -1));
    } else {
      setQuotationItems(prev => prev.filter(i => i.productId !== id));
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const endpoints = [
        '/api/categories', '/api/brands', '/api/units', '/api/products', 
        '/api/orders', '/api/quotations', '/api/customers', '/api/shipping-agencies', 
        '/api/shipping-zones', '/api/sunat/TABLA_02', '/api/stats', '/api/exchange-rates',
        '/api/sellers', '/api/warehouses', '/api/sunat/TABLA_04', 
        '/api/sunat/CAT_PAY', '/api/sunat/CAT_51', '/api/sunat/TABLA_12', '/api/sunat/TABLA_10', '/api/series', '/api/purchases', '/api/movements', '/api/suppliers', '/api/stock', '/api/document-types', '/api/invoices'
      ];
      const responses = await Promise.all(endpoints.map(url => axios.get(url, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] }))));
      setCategories(responses[0].data); 
      setBrands(responses[1].data); 
      setUnits(responses[2].data); 
      setProducts(responses[3].data); 
      setOrders(responses[4].data); 
      setQuotations(responses[5].data); 
      setCustomers(responses[6].data); 
      setShippingAgencies(responses[7].data); 
      setShippingZones(responses[8].data); 
      setDocumentTypes(responses[9].data); 
      setStats(responses[10].data); 
      setExchangeRates(responses[11].data);
      setSellers(responses[12].data);
      const warehousesData = responses[13].data;
      setWarehouses(warehousesData);
      
      // Actualizar datos del modal de almacén si está abierto
      if (isWarehouseModalOpen && (warehouseFormData as any)?.id) {
        const current = warehousesData.find((w: any) => w.id === (warehouseFormData as any).id);
        if (current) setWarehouseFormData(current);
      }
      
      setSunatCurrencies(responses[14].data);
      setSunatPaymentConditions(responses[15].data);
      setSunatOperationTypes(responses[16].data);
      setSunatIgvAffectations(responses[17].data);
      setSunatDocTypes(responses[18].data);
      setSeries(responses[19].data);
      setPurchases(responses[20].data);
      setMovements(responses[21].data);
      setSuppliers(responses[22].data);
      setStockDetails(responses[23].data);
      setSeriesDocTypes(responses[24].data);
      setInvoices(responses[25].data);
      
      const todayRate = responses[11].data[0]?.sell_rate;
      if (todayRate) setQuotationFormData((prev: any) => ({ ...prev, exchangeRate: todayRate }));
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const getMediaUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `${axios.defaults.baseURL || ''}${path}`;
  };

  const handleFileUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    const res = await axios.post('/api/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` }
    });
    return res.data.url;
  };

  const [purchaseMode, setPurchaseMode] = useState<'invoices' | 'guides'>('invoices');

  const openForm = (type: string, item: any = null, purchaseEntryMode?: 'invoices' | 'guides') => {
    console.log(`[FRONTEND] openForm called for type: ${type}`, item);
    setEditingItem(item);
    if (type === 'products') { setProductFormData(item || initialProductData); setIsProductModalOpen(true); }
    else if (['categories', 'brands', 'units'].includes(type)) { 
      setSimpleModalType(type as any);
      setSimpleFormData(item || initialSimpleData);
      setIsSimpleModalOpen(true); 
    }
    else if (type === 'warehouses') {
      setWarehouseFormData(item || initialWarehouseData);
      setIsWarehouseModalOpen(true);
    }
    else if (type === 'customers') { 
      setCustomerFormData(item || initialCustomerData); 
      setIsCustomerModalOpen(true); 
    }
    else if (type === 'sellers') { setSellerFormData(item || initialSellerData); setIsSellerModalOpen(true); }
    else if (type === 'shipping-agencies') {
      setAgencyFormData(item || initialAgencyData);
      setIsAgencyModalOpen(true);
    }
    else if (type === 'series') {
      setSeriesFormData(item || initialSeriesData);
      setIsSeriesModalOpen(true);
    }
    else if (type === 'invoices') {
      if (item) {
        // item could be an existing invoice OR an order (for generating comprobante)
        const isFromOrder = item.customerPhone !== undefined && item.totalAmount !== undefined && item.items !== undefined && item.docType === 'PED';
        if (isFromOrder) {
          // Populate from order (new comprobante mode, not edit)
          setEditingItem(null);
          const customer = customers.find(c => c.id === item.customerId);
          setQuotationFormData((prev: any) => ({ ...prev, ...item }));
          const isRuc = item.customerDocType === 'RUC' || (item.customerDocNumber && item.customerDocNumber.length === 11);
          const targetDocType = isRuc ? '01' : '03';
          const matchingSeries = series.find((s: any) => s.documentType === targetDocType && s.isActive) || series.find((s: any) => s.documentType === '01' && s.isActive);

          const orderNumberStr = item.docSeries && item.docNumber 
            ? `${item.docSeries}-${item.docNumber}` 
            : (item.orderNumber || `PED-${String(item.id).padStart(6, '0')}`);

          setInvoiceFormData({
            ...initialInvoiceData,
            customerName: item.customerName || '',
            customerDocType: item.customerDocType || (isRuc ? 'RUC' : 'DNI'),
            customerDocNumber: item.customerDocNumber || '',
            customerAddress: item.customerAddress || '',
            customerEmail: item.customerEmail || '',
            customerPhone: item.customerPhone || '',
            customerId: item.customerId?.toString() || '',
            sellerId: item.sellerId?.toString() || '',
            orderId: item.id,
            orderNumber: orderNumberStr,
            guideRemission: item.guideRemission || item.guiaRemision || '',
            paymentCondition: item.paymentCondition || 'CONTADO',
            currency: item.currency || 'PEN',
            operationType: item.operationType || '10',
            exchangeRate: item.exchangeRate || '1.000',
            issueDate: new Date().toISOString().split('T')[0],
            notes: item.notes || '',
            documentType: targetDocType,
            series: matchingSeries ? matchingSeries.id.toString() : '',
            docSeries: matchingSeries ? matchingSeries.series : '',
          });
          setQuotationItems(item.items?.map((i: any) => {
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
              isFree: i.isFree || i.isBonus || Number(i.price) === 0,
              referencePrice: Number(i.referencePrice || i.originalPrice || prod.salePrice || i.price || 0),
              unit: prod.unit || { symbol: 'UND' },
            };
          }) || []);
        } else {
          // Edit existing invoice
          const matchingSeries = series.find(s => s.series === item.series && s.documentType === item.documentType);
          setInvoiceFormData({
            ...initialInvoiceData,
            ...item,
            series: matchingSeries ? matchingSeries.id.toString() : '',
            docSeries: item.series,
            docNumber: item.number?.toString() || '',
            issueDate: item.issueDate?.split('T')[0] || new Date().toISOString().split('T')[0],
            sellerId: item.sellerId?.toString() || '',
            customerId: item.customerId?.toString() || '',
          });
          setQuotationItems(item.items?.map((i: any) => {
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
              isFree: i.isFree || i.isBonus || Number(i.price) === 0,
              referencePrice: Number(i.referencePrice || i.originalPrice || prod.salePrice || i.price || 0),
              unit: prod.unit || { symbol: 'UND' },
            };
          }) || []);
        }
      } else {
        setInvoiceFormData({
          ...initialInvoiceData,
          issueDate: new Date().toISOString().split('T')[0],
        });
        setQuotationItems([]);
      }
      setIsInvoiceModalOpen(true);
    }
    else if (type === 'purchases') {
      const modeToSet = purchaseEntryMode || 'invoices';
      console.log(`[FRONTEND] Setting purchase mode to: ${modeToSet}`);
      setPurchaseMode(modeToSet);
      
      if (item) {
        setPurchaseFormData({
          ...item,
          date: item.date?.split('T')[0] || new Date().toISOString().split('T')[0],
          items: item.items?.map((i: any) => ({
            productId: i.productId,
            name: i.product?.name || 'Producto',
            code: i.product?.code || '',
            unitSymbol: i.unitSymbol || i.product?.package?.symbol || i.product?.subPackage?.symbol || i.product?.unit?.symbol || 'UND',
            quantity: i.quantity,
            price: i.price,
            lotNumber: i.lotNumber || '',
            seriesNumber: i.seriesNumber || '',
            expiryDate: i.expiryDate ? i.expiryDate.split('T')[0] : '',
            observation: i.observation || ''
          })) || []
        });
      } else {
        setPurchaseFormData({
          supplierId: '', supplierName: '', docType: modeToSet === 'guides' ? '09' : '01', docSeries: '', docNumber: '',
          date: new Date().toISOString().split('T')[0], currency: 'PEN', exchangeRate: '1.00',
          warehouseId: '', purchaseType: 'MERCADERIA', paymentCondition: 'CONTADO', creditDays: 0,
          observation: '', items: []
        });
      }
      setIsPurchaseModalOpen(true);
    }
    else if (type === 'suppliers') {
      setSupplierFormData(item || { name: '', docType: 'RUC', docNumber: '', address: '', phone: '', email: '', contact: '' });
      setIsSupplierModalOpen(true);
    }
    else if (type === 'transfers') {
      setTransferFormData(item || {
        fromWarehouseId: '', toWarehouseId: '', docNumber: '', date: new Date().toISOString().split('T')[0], observation: '',
        items: []
      });
      setIsTransferModalOpen(true);
    }
    else if (type === 'quotations') { 
      if (item) {
        setQuotationFormData({
          ...initialQuotationData,
          ...item,
          id: item.id,
          ruc: item.customerDocNumber || item.ruc || '',
          razonSocial: item.customerName || item.razonSocial || '',
          address: item.customerAddress || item.address || '',
          observation: item.notes || item.observation || '',
          flete: item.shippingCost || item.flete || 0,
          igvPercent: item.igvPercent || 18,
          pickupPlace: item.pickupPlace?.toString() || '',
          currency: item.currency || '1',
          sellerId: item.sellerId?.toString() || '',
          customerId: item.customerId?.toString() || '',
          agencyId: item.agencyId?.toString() || '',
          docType: 'COT',
          date: item.createdAt?.split('T')[0] || item.date || new Date().toISOString().split('T')[0],
          expiryDate: item.dueDate?.split('T')[0] || item.expiryDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        });
        
        setQuotationItems(item.items?.map((i: any) => {
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
            unit: prod.unit,
            package: prod.package,
            subPackage: prod.subPackage,
            quantityPerPackage: prod.quantityPerPackage || 1,
            quantityPerSubPackage: prod.quantityPerSubPackage || 1,
            unitOptions,
            unitMeasure: i.unitMeasure || prod.package?.symbol || prod.subPackage?.symbol || prod.unit?.symbol || 'UND',
            lot: i.lotNumber || i.lot || null,
            warehouseName: i.warehouseName || null,
            expiryDate: i.expiryDate || null,
            stockRecords: prod.stockRecords || []
          };
        }) || []);
      } else {
        const matchedSeller = sellers.find(s => 
          (user?.email && s.email?.toLowerCase() === user.email.toLowerCase()) ||
          (user?.name && (s.name?.toLowerCase().trim() === user.name.toLowerCase().trim() || user.name.toLowerCase().includes(s.name.toLowerCase().trim()))) ||
          (user?.warehouseId && s.warehouseId === user.warehouseId)
        ) || (sellers.filter(s => s.isActive !== false).length === 1 ? sellers.find(s => s.isActive !== false) : null);

        setQuotationFormData({ 
          ...initialQuotationData, 
          docType: 'COT',
          sellerId: matchedSeller ? matchedSeller.id.toString() : '',
          sellerName: matchedSeller ? matchedSeller.name : (user?.name || ''),
          operationType: '10'
        });
        setQuotationItems([]);
      }
      setIsQuotationModalOpen(true); 
    }
    else if (type === 'orders') { 
      if (item) {
        setQuotationFormData({
          ...initialQuotationData,
          ...item,
          id: item.id,
          ruc: item.customerDocNumber || item.ruc || '',
          razonSocial: item.customerName || item.razonSocial || '',
          address: item.customerAddress || item.address || '',
          observation: item.notes || item.observation || '',
          flete: item.shippingCost || item.flete || 0,
          igvPercent: item.igvPercent || 18,
          pickupPlace: item.pickupPlace?.toString() || '',
          currency: item.currency || '1',
          sellerId: item.sellerId?.toString() || '',
          customerId: item.customerId?.toString() || '',
          agencyId: item.agencyId?.toString() || '',
          docType: 'PED',
          operationType: item.operationType || '10',
          date: item.createdAt?.split('T')[0] || item.date || new Date().toISOString().split('T')[0],
          expiryDate: item.dueDate?.split('T')[0] || item.expiryDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        });
        
        setQuotationItems(item.items?.map((i: any) => {
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
            unit: prod.unit,
            package: prod.package,
            subPackage: prod.subPackage,
            quantityPerPackage: prod.quantityPerPackage || 1,
            quantityPerSubPackage: prod.quantityPerSubPackage || 1,
            unitOptions,
            unitMeasure: i.unitMeasure || prod.package?.symbol || prod.subPackage?.symbol || prod.unit?.symbol || 'UND',
            lot: i.lotNumber || i.lot || null,
            warehouseName: i.warehouseName || null,
            expiryDate: i.expiryDate || null,
            stockRecords: prod.stockRecords || []
          };
        }) || []);
      } else {
        const matchedSeller = sellers.find(s => 
          (user?.email && s.email?.toLowerCase() === user.email.toLowerCase()) ||
          (user?.name && (s.name?.toLowerCase().trim() === user.name.toLowerCase().trim() || user.name.toLowerCase().includes(s.name.toLowerCase().trim()))) ||
          (user?.warehouseId && s.warehouseId === user.warehouseId)
        ) || (sellers.filter(s => s.isActive !== false).length === 1 ? sellers.find(s => s.isActive !== false) : null);

        setQuotationFormData({ 
          ...initialQuotationData, 
          docType: 'PED',
          sellerId: matchedSeller ? matchedSeller.id.toString() : '',
          sellerName: matchedSeller ? matchedSeller.name : (user?.name || ''),
          operationType: '10'
        });
        setQuotationItems([]);
      }
      setIsOrderModalOpen(true); 
    }
  };

  const handleDelete = async (type: string, id: number | string) => {
    if (!confirm('¿Seguro que desea eliminar?')) return;
    try { 
      console.log(`[FRONTEND] Deleting ${type} with ID:`, id);
      const res = await axios.delete(`/api/${type}/${id}`, { headers: { Authorization: `Bearer ${token}` } }); 
      console.log(`[FRONTEND] Delete response:`, res.data);
      showSuccess('Eliminado'); 
      fetchData(); 
    } catch (err: any) { 
      console.error(`[FRONTEND] Delete error for ${type}/${id}:`, err);
      const msg = err.response?.data?.error || err.message || 'Error al eliminar';
      alert(msg); 
    }
  };

  const handleSubmitSimple = async (e: any) => {
    e.preventDefault(); setLoading(true);
    try {
      const url = editingItem ? `/api/${simpleModalType}/${editingItem.id}` : `/api/${simpleModalType}`;
      await axios({ method: editingItem ? 'PUT' : 'POST', url, data: simpleFormData, headers: { Authorization: `Bearer ${token}` } });
      showSuccess('Guardado correctamente'); setIsSimpleModalOpen(false); fetchData();
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleSubmitProduct = async (e: any) => {
    e.preventDefault(); setLoading(true);
    try {
      const url = editingItem ? `/api/products/${editingItem.id}` : '/api/products';
      
      // Auto-generar slug único: nombre + código (o timestamp si no hay código)
      const dataToSubmit = { ...productFormData };
      if (!dataToSubmit.slug) {
        const base = dataToSubmit.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        const suffix = dataToSubmit.code 
          ? dataToSubmit.code.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
          : Date.now().toString(36);
        dataToSubmit.slug = `${base}-${suffix}`;
      }

      // Eliminar campos que no existen en el schema de Prisma
      const cleanData = dataToSubmit as any;
      delete cleanData.image;
      delete cleanData.isFeatured;

      await axios({ method: editingItem ? 'PUT' : 'POST', url, data: dataToSubmit, headers: { Authorization: `Bearer ${token}` } });
      showSuccess('Guardado'); setIsProductModalOpen(false); fetchData();
    } catch (err: any) { 
      console.error(err); 
      alert(err.response?.data?.error || 'Error al guardar el producto');
    } finally { setLoading(false); }
  };

  const handleSubmitSeller = async (e: any) => {
    e.preventDefault(); setLoading(true);
    try {
      const url = editingItem ? `/api/sellers/${editingItem.id}` : '/api/sellers';
      await axios({ method: editingItem ? 'PUT' : 'POST', url, data: sellerFormData, headers: { Authorization: `Bearer ${token}` } });
      showSuccess('Vendedor guardado'); setIsSellerModalOpen(false); fetchData();
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleSubmitWarehouse = async (e: any) => {
    e.preventDefault(); setLoading(true);
    try {
      const url = editingItem ? `/api/warehouses/${editingItem.id}` : '/api/warehouses';
      
      // Remove relation fields (like floors) before sending to prevent Prisma schema errors
      const payload = {
        name: warehouseFormData.name,
        code: warehouseFormData.code,
        type: warehouseFormData.type,
        address: warehouseFormData.address,
        ruc: warehouseFormData.ruc,
        phones: warehouseFormData.phones,
        sunatCode: warehouseFormData.sunatCode || '0000',
        observation: warehouseFormData.observation,
        isActive: warehouseFormData.isActive,
        validateStock: warehouseFormData.validateStock
      };

      const res = await axios({ method: editingItem ? 'PUT' : 'POST', url, data: payload, headers: { Authorization: `Bearer ${token}` } });
      showSuccess('Almacén guardado'); 
      setIsWarehouseModalOpen(false);
      fetchData();
    } catch (err: any) { 
      console.error(err); 
      alert(err.response?.data?.error || 'Error al guardar el almacén');
    } finally { setLoading(false); }
  };

  const handleSubmitAgency = async (e: any) => {
    e.preventDefault(); setLoading(true);
    try {
      const url = editingItem ? `/api/shipping-agencies/${editingItem.id}` : '/api/shipping-agencies';
      await axios({ method: editingItem ? 'PUT' : 'POST', url, data: agencyFormData, headers: { Authorization: `Bearer ${token}` } });
      showSuccess('Agencia guardada'); setIsAgencyModalOpen(false); fetchData();
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleSubmitQuotation = async (e: any) => {
    e.preventDefault(); 
    
    // --- VALIDACIONES ESTRICTAS ---
    if (!quotationFormData.razonSocial && !quotationFormData.customerId) {
      alert('Error: Debe seleccionar o ingresar un cliente.');
      return;
    }
    if (quotationItems.length === 0) {
      alert('Error: El detalle de la cotización no puede estar vacío. Agregue al menos un producto.');
      return;
    }
    if (!quotationFormData.pickupPlace) {
      alert('Error: Debe seleccionar un "Lugar de Recojo" (Almacén).');
      return;
    }
    const hasInvalidItems = quotationItems.some(i => i.quantity <= 0 || i.price <= 0);
    if (hasInvalidItems) {
      alert('Error: Todos los productos deben tener cantidad y precio mayor a cero.');
      return;
    }

    setLoading(true);
    try {
      const selectedCustomer = customers.find(c => c.id === parseInt(quotationFormData.customerId));
      const selectedSeller = sellers.find(s => s.id === parseInt(quotationFormData.sellerId));
      const payload = { 
        ...quotationFormData, 
        customerName: selectedCustomer ? (selectedCustomer.name || `${selectedCustomer.firstName} ${selectedCustomer.lastName}`) : (quotationFormData.razonSocial || ''),
        customerDocNumber: selectedCustomer?.docNumber || quotationFormData.ruc || '',
        customerPhone: selectedCustomer?.phone || '',
        customerEmail: selectedCustomer?.email || '',
        customerAddress: selectedCustomer?.address || quotationFormData.address || '',
        customerDocType: selectedCustomer?.docType || (quotationFormData.ruc?.length === 11 ? 'RUC' : 'DNI'),
        sellerName: selectedSeller?.name || quotationFormData.sellerName,
        dueDate: quotationFormData.expiryDate,
        items: quotationItems, 
        totalAmount: quotationTotal,
        warehouseStatus: editingItem?.warehouseStatus || null
      };
      const isOrder = quotationFormData.docType === 'PED';
      
      let url = '';
      let method = 'POST';
      
      if (isOrder) {
        if (editingItem && editingItem.docType === 'PED') {
          url = `/api/orders/${editingItem.id}`;
          method = 'PUT';
        } else {
          url = '/api/orders';
          method = 'POST';
          if (editingItem) payload.quotationId = editingItem.id;
        }
      } else {
        if (editingItem && editingItem.docType !== 'PED') {
          url = `/api/quotations/${editingItem.id}`;
          method = 'PUT';
        } else {
          url = '/api/quotations';
          method = 'POST';
        }
      }
      
      const res = await axios({ method, url, data: payload, headers: { Authorization: `Bearer ${token}` } });
      showSuccess(isOrder ? 'Pedido generado' : 'Cotización guardada'); 
      setIsQuotationModalOpen(false); 
      setIsOrderModalOpen(false);
      fetchData();
      
      if (isOrder) handleOpenTab('orders', 'Pedidos');
    } catch (err: any) { 
      console.error(err);
      alert(err.response?.data?.error || 'Error al guardar la cotización'); 
    } finally { setLoading(false); }
  };

  const handleSubmitSeries = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingItem) await axios.put(`/api/series/${editingItem.id}`, seriesFormData, { headers: { Authorization: `Bearer ${token}` } });
      else await axios.post('/api/series', seriesFormData, { headers: { Authorization: `Bearer ${token}` } });
      setIsSeriesModalOpen(false);
      await fetchData();
      showSuccess('Serie guardada');
    } catch (err) { alert('Error al guardar'); } finally { setLoading(false); }
  };

  const handleSubmitInvoice = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        documentType: invoiceFormData.documentType || '01',
        series: invoiceFormData.docSeries,
        number: parseInt(invoiceFormData.docNumber) || 0,
        customerName: invoiceFormData.customerName || '',
        customerDocType: invoiceFormData.customerDocType || 'DNI',
        customerDocNumber: invoiceFormData.customerDocNumber || '',
        customerAddress: invoiceFormData.customerAddress || '',
        customerEmail: invoiceFormData.customerEmail || '',
        customerPhone: invoiceFormData.customerPhone || '',
        customerId: invoiceFormData.customerId ? parseInt(invoiceFormData.customerId) : null,
        issueDate: invoiceFormData.issueDate,
        dueDate: invoiceFormData.dueDate,
        currency: invoiceFormData.currency || 'PEN',
        exchangeRate: parseFloat(invoiceFormData.exchangeRate) || 1,
        paymentCondition: invoiceFormData.paymentCondition || 'CONTADO',
        operationType: invoiceFormData.operationType || '10',
        includeIgv: invoiceFormData.includeIgv !== false,
        priceIncludesIgv: invoiceFormData.priceIncludesIgv !== false,
        igvPercent: Number(invoiceFormData.igvPercent) || 18,
        sellerId: invoiceFormData.sellerId ? parseInt(invoiceFormData.sellerId) : null,
        orderId: invoiceFormData.orderId ? parseInt(invoiceFormData.orderId) : null,
        notes: invoiceFormData.notes || '',
        items: quotationItems.map((item: any) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitMeasure: item.unitMeasure || 'UND',
          price: item.price,
          discount: item.discount || 0,
          priceType: item.priceType || 'PRICE1',
          lotNumber: item.lotNumber || null,
        })),
        installments: invoiceFormData.paymentCondition === 'CREDITO' ? invoiceFormData.installments || [] : [],
        totalAmount: quotationTotal,
      };

      if (editingItem) {
        await axios.put(`/api/invoices/${editingItem.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post('/api/invoices', payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      setIsInvoiceModalOpen(false);
      await fetchData();
      showSuccess('Comprobante emitido correctamente');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al emitir comprobante');
    } finally { setLoading(false); }
  };

  const handleSubmitSupplier = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...supplierFormData, code: supplierFormData.docNumber };
      
      if (editingItem) await axios.put(`/api/suppliers/${editingItem.id}`, payload, { headers: { Authorization: `Bearer ${token}` } });
      else await axios.post('/api/suppliers', payload, { headers: { Authorization: `Bearer ${token}` } });
      setIsSupplierModalOpen(false);
      await fetchData();
      showSuccess('Proveedor guardado');
    } catch (err) { alert('Error al guardar'); } finally { setLoading(false); }
  };

  const handleOpenPayment = (order: any) => {
    setSelectedOrderForPayment(order);
    setIsPaymentModalOpen(true);
  };

  const handleSubmitPayment = async (data: any) => {
    setLoading(true);
    try {
      await axios.post('/api/payments', data, { headers: { Authorization: `Bearer ${token}` } });
      showSuccess('Pago registrado');
      
      // Actualizar el pedido seleccionado para reflejar el nuevo pago
      const res = await axios.get(`/api/orders/${data.orderId}`, { headers: { Authorization: `Bearer ${token}` } });
      setSelectedOrderForPayment(res.data);
      
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al registrar pago');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePayment = async (paymentId: number) => {
    if (!confirm('¿Seguro que desea eliminar este cobro?')) return;
    setLoading(true);
    try {
      await axios.delete(`/api/payments/${paymentId}`, { headers: { Authorization: `Bearer ${token}` } });
      showSuccess('Cobro eliminado');
      
      if (selectedOrderForPayment) {
        const res = await axios.get(`/api/orders/${selectedOrderForPayment.id}`, { headers: { Authorization: `Bearer ${token}` } });
        setSelectedOrderForPayment(res.data);
      }
      
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al eliminar pago');
    } finally {
      setLoading(false);
    }
  };

  const handleResetQuotation = async (id: number) => {
    if (!confirm('¿Seguro que desea desbloquear esta cotización y volverla a estado PENDIENTE?')) return;
    setLoading(true);
    try {
      await axios.put(`/api/quotations/${id}/reset`, {}, { headers: { Authorization: `Bearer ${token}` } });
      showSuccess('Cotización desbloqueada');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al resetear cotización');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitTransfer = async (data: any) => {
    setLoading(true);
    try {
      await axios.post('/api/transfers', data, { headers: { Authorization: `Bearer ${token}` } });
      setIsTransferModalOpen(false);
      await fetchData();
      showSuccess('Transferencia procesada');
    } catch (err) { alert('Error al procesar transferencia'); } finally { setLoading(false); }
  };

  const handleSubmitMovement = async (data: any) => {
    setLoading(true);
    try {
      await axios.post('/api/movements', data, { headers: { Authorization: `Bearer ${token}` } });
      setIsMovementAssistantOpen(false);
      await fetchData();
      showSuccess('Movimiento procesado correctamente');
    } catch (err: any) { 
      alert(err.response?.data?.error || 'Error al procesar movimiento'); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleSubmitCustomer = async (e: any) => {
    e.preventDefault(); setLoading(true);
    try {
      const url = editingItem ? `/api/customers/${editingItem.id}` : '/api/customers';
      const fullAddress = formatFullCustomerAddress(
        customerFormData.address,
        customerFormData.district,
        customerFormData.province,
        customerFormData.department
      );
      const payload = { ...customerFormData, address: fullAddress };

      const res = await axios({ method: editingItem ? 'PUT' : 'POST', url, data: payload, headers: { Authorization: `Bearer ${token}` } });
      showSuccess('Cliente guardado'); 
      setIsCustomerModalOpen(false); 
      await fetchData();
      
      // Si estamos en el modal de cotización o pedido, seleccionar automáticamente al nuevo cliente con todos sus datos
      if ((isQuotationModalOpen || isOrderModalOpen) && !editingItem) {
        const client = res.data;
        const clientName = client.name || [client.firstName, client.secondName, client.lastName, client.surname].filter(Boolean).join(' ') || '';
        setQuotationFormData((prev: any) => ({
          ...prev,
          customerId: client.id ? client.id.toString() : '',
          ruc: client.docNumber || prev.ruc,
          razonSocial: clientName,
          address: client.address || fullAddress || ''
        }));
      }
    } catch (err: any) { 
      console.error(err);
      alert(err.response?.data?.error || 'Error al guardar cliente');
    } finally { setLoading(false); }
  };

  const handleConsultDocument = async () => {
    const rawDoc = (customerFormData.docNumber || '').trim();
    if (!rawDoc) {
      showError('Ingrese un número de documento para consultar');
      return;
    }

    // Normalizar tipo de documento: SUNAT usa '1'/'6', API espera 'dni'/'ruc'
    const typeMap: Record<string, string> = { '1': 'dni', '6': 'ruc', 'DNI': 'dni', 'RUC': 'ruc', 'dni': 'dni', 'ruc': 'ruc' };
    const apiType = typeMap[customerFormData.docType] || (rawDoc.length === 11 ? 'ruc' : 'dni');

    if (apiType === 'ruc' && rawDoc.length !== 11) {
      showError(`El RUC debe tener exactamente 11 dígitos numéricos (ingresó ${rawDoc.length} dígitos).`);
      return;
    }
    if (apiType === 'dni' && rawDoc.length !== 8) {
      showError(`El DNI debe tener exactamente 8 dígitos numéricos (ingresó ${rawDoc.length} dígitos).`);
      return;
    }

    setLoading(true);
    try {
      const res = await axios.get(`/api/consult/${apiType}/${rawDoc}`, { headers: { Authorization: `Bearer ${token}` } });
      const d = res.data;
      
      if (d.success === false || d.message) {
        showError(d.message || 'No se encontró información para el número ingresado');
        return;
      }
      
      if (d.ruc || d.dni || d.razonSocial || d.nombres || d.nombre_o_razon_social) {
        const data = d.data || d;
        const isRuc = customerFormData.docType === '6' || customerFormData.docType === 'RUC';
        const ubi = resolveUbigeoInfo(data);

        if (isRuc) {
          const fullAddress = formatFullCustomerAddress(
            data.direccion || data.direccion_completa || '',
            ubi.district,
            ubi.province,
            ubi.department
          );

          setCustomerFormData({ 
            ...customerFormData, 
            name: data.razonSocial || data.nombre_o_razon_social || '', 
            address: fullAddress, 
            department: ubi.department,
            province: ubi.province,
            district: ubi.district
          });
        } else {
          const rawNames = data.nombres || '';
          const nameParts = rawNames.trim().split(/\s+/);
          const firstName = nameParts[0] || '';
          const secondName = nameParts.slice(1).join(' ') || '';
          
          const apePat = data.apellidoPaterno || data.apellido_paterno || '';
          const apeMat = data.apellidoMaterno || data.apellido_materno || '';

          const fullAddress = formatFullCustomerAddress(
            data.direccion || data.direccion_completa || '',
            ubi.district,
            ubi.province,
            ubi.department
          );

          setCustomerFormData({ 
            ...customerFormData, 
            firstName: firstName,
            secondName: secondName,
            lastName: apePat,
            surname: apeMat,
            name: data.razonSocial || `${rawNames} ${apePat} ${apeMat}`.trim(),
            address: fullAddress, 
            department: ubi.department,
            province: ubi.province,
            district: ubi.district
          });
        }
        showSuccess('Datos recuperados correctamente');
      } else {
        showError('No se encontró información para el número ingresado. Verifique que sea un DNI/RUC válido registrado en SUNAT.');
      }
    } catch (err: any) { 
      console.error(err);
      const errMsg = err.response?.data?.error || err.response?.data?.message || 'Error en el servicio de consulta. Verifique que el número de documento sea válido.';
      showError(errMsg);
    } finally { setLoading(false); }
  };

  const handleConsultForQuotation = async (type: string, number: string) => {
    try {
      const res = await axios.get(`/api/consult/${type.toLowerCase()}/${number}`, { headers: { Authorization: `Bearer ${token}` } });
      const d = res.data;
      // Validar si la respuesta tiene datos válidos
      if (d && (d.ruc || d.dni || d.razonSocial || d.nombres || d.nombre_o_razon_social || d.success)) {
        return d.data || d;
      }
      return null;
    } catch (err) { 
      console.error("Consult error:", err);
      return null; 
    }
  };

  const handleQuickRegisterCustomer = async (data: any) => {
    setLoading(true);
    try {
      const res = await axios.post('/api/customers', data, { headers: { Authorization: `Bearer ${token}` } });
      await fetchData();
      setQuotationFormData((prev: any) => ({ ...prev, customerId: res.data.id.toString() }));
      showSuccess('Cliente registrado y seleccionado');
    } catch (err) { alert('Error al registrar'); } finally { setLoading(false); }
  };

  return (
    <div className="w-full max-w-480 mx-auto px-4 py-4 md:px-6 h-screen flex flex-col bg-[#f8fafc]/30">
      <AnimatePresence>
        {successMsg && <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-24 right-10 z-300 bg-green-600 text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-2"><CheckCircle className="w-5 h-5" /> <span className="font-bold">{successMsg}</span></motion.div>}
        {errorMsg && <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-24 right-10 z-300 bg-red-600 text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-2"><AlertCircle className="w-5 h-5" /> <span className="font-bold">{errorMsg}</span></motion.div>}
      </AnimatePresence>

      <div className="flex flex-col lg:flex-row gap-6 h-full min-h-0">
        <aside className="w-full lg:w-64 shrink-0 space-y-2 h-full overflow-y-auto custom-scrollbar pr-2">
          <div 
            onClick={() => handleOpenTab('profile', 'Mi Perfil')}
            className={`px-4 py-3 mb-4 bg-white border rounded-2xl shadow-xs cursor-pointer transition-all hover:shadow-md hover:border-blue-400 group ${
              activeTabId === 'profile' ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20' : 'border-slate-100'
            }`}
            title="Haga clic para ver y editar su perfil de usuario"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-linear-to-tr from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center font-black text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform shrink-0">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'C'}
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-bold text-slate-800 text-sm tracking-tight block truncate group-hover:text-blue-600 transition-colors">
                  Panel Admin
                </span>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">
                  {user?.name || 'Administrador'}
                </p>
              </div>
            </div>
          </div>
          {/* --- MENU AGRUPADO --- */}
          {/* Resumen (standalone) */}
          <button onClick={() => handleOpenTab('dashboard', 'Resumen')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all ${activeTabId === 'dashboard' ? 'bg-sky-500 text-white font-semibold shadow-md shadow-sky-100' : 'text-slate-600 hover:bg-slate-50'}`}><LayoutDashboard className="w-5 h-5" /> Resumen</button>

          {/* Ventas */}
          <div className="space-y-0.5">
            <button onClick={() => setCollapsedSections(prev => ({...prev, ventas: !prev.ventas}))} className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all">
              Ventas
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${collapsedSections.ventas ? '-rotate-90' : ''}`} />
            </button>
            {!collapsedSections.ventas && (
              <div className="space-y-0.5 pl-2">
                {[
                  { id: 'quotations', icon: FileText, label: 'Cotizaciones', permission: 'VIEW_QUOTATIONS' },
                  { id: 'orders', icon: ShoppingCart, label: 'Pedidos', permission: 'VIEW_ORDERS' },
                  { id: 'invoices', icon: Receipt, label: 'Facturación', permission: 'VIEW_ORDERS' },
                  { id: 'customers', icon: Star, label: 'Clientes', permission: 'VIEW_CUSTOMERS' },
                  { id: 'sellers', icon: User, label: 'Vendedores', permission: 'VIEW_SELLERS' },
                ].map(item => {
                  const hasAccess = item.permission ? hasPermission?.(item.permission) : true;
                  if (!hasAccess) return null;
                  return (
                    <button key={item.id} onClick={() => handleOpenTab(item.id, item.label)} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all ${activeTabId === item.id ? 'bg-sky-500 text-white font-semibold shadow-md shadow-sky-100' : 'text-slate-600 hover:bg-slate-50'}`}><item.icon className="w-4 h-4" /> {item.label}</button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Productos (standalone) */}
          <button onClick={() => handleOpenTab('products', 'Productos')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all ${activeTabId === 'products' || ['categories', 'brands', 'units'].includes(activeTabId) ? 'bg-sky-500 text-white font-semibold shadow-md shadow-sky-100' : 'text-slate-600 hover:bg-slate-50'}`}><Package className="w-5 h-5" /> Productos</button>

          {/* Compras */}
          <div className="space-y-0.5">
            <button onClick={() => setCollapsedSections(prev => ({...prev, compras: !prev.compras}))} className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all">
              Compras
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${collapsedSections.compras ? '-rotate-90' : ''}`} />
            </button>
            {!collapsedSections.compras && (
              <div className="space-y-0.5 pl-2">
                {[
                  { id: 'purchases', icon: ShoppingCart, label: 'Compras', permission: 'VIEW_PURCHASES' },
                  { id: 'suppliers', icon: Building2, label: 'Proveedores', permission: 'VIEW_SUPPLIERS' },
                ].map(item => {
                  const hasAccess = item.permission ? hasPermission?.(item.permission) : true;
                  if (!hasAccess) return null;
                  return (
                    <button key={item.id} onClick={() => handleOpenTab(item.id, item.label)} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all ${activeTabId === item.id ? 'bg-sky-500 text-white font-semibold shadow-md shadow-sky-100' : 'text-slate-600 hover:bg-slate-50'}`}><item.icon className="w-4 h-4" /> {item.label}</button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Logística */}
          <div className="space-y-0.5">
            <button onClick={() => setCollapsedSections(prev => ({...prev, logistica: !prev.logistica}))} className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all">
              Logística
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${collapsedSections.logistica ? '-rotate-90' : ''}`} />
            </button>
            {!collapsedSections.logistica && (
              <div className="space-y-0.5 pl-2">
                {[
                  { id: 'referral-guides', icon: FileText, label: 'Guías de Remisión', permission: 'VIEW_LOGISTICS' },
                  { id: 'picking', icon: PackageSearch, label: 'Picking / Almacén', permission: 'VIEW_PICKING' },
                  { id: 'inventory', icon: BarChart3, label: 'Inventario / Stock', permission: 'VIEW_INVENTORY' },
                  { id: 'warehouses', icon: MapPin, label: 'Almacenes / Sedes', permission: 'VIEW_WAREHOUSES' },
                  { id: 'shipping', icon: Truck, label: 'Agencias', permission: 'VIEW_LOGISTICS' },
                  { id: 'logistics', icon: Truck, label: 'Config. Logística', permission: 'VIEW_LOGISTICS' },
                ].map(item => {
                  const hasAccess = item.permission ? hasPermission?.(item.permission) : true;
                  if (!hasAccess) return null;
                  return (
                    <button key={item.id} onClick={() => handleOpenTab(item.id, item.label)} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all ${activeTabId === item.id ? 'bg-sky-500 text-white font-semibold shadow-md shadow-sky-100' : 'text-slate-600 hover:bg-slate-50'}`}><item.icon className="w-4 h-4" /> {item.label}</button>
                  );
                })}
              </div>
            )}
          </div>

          {/* General */}
          <div className="space-y-0.5">
            <button onClick={() => setCollapsedSections(prev => ({...prev, general: !prev.general}))} className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all">
              General
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${collapsedSections.general ? '-rotate-90' : ''}`} />
            </button>
            {!collapsedSections.general && (
              <div className="space-y-0.5 pl-2">
                {[
                  { id: 'exchange-rates', icon: DollarSign, label: 'T. Cambio', permission: 'VIEW_EXCHANGE_RATES' },
                  { id: 'series', icon: Hash, label: 'Series', permission: 'VIEW_SERIES' },
                  { id: 'settings', icon: SettingsIcon, label: 'Ajustes', permission: 'VIEW_SETTINGS' },
                  { id: 'users', icon: Users, label: 'Usuarios', permission: 'ALL' },
                  { id: 'roles', icon: ShieldCheck, label: 'Roles', permission: 'ALL' },
                ].map(item => {
                  const hasAccess = item.permission ? hasPermission?.(item.permission) : true;
                  if (!hasAccess) return null;
                  return (
                    <button key={item.id} onClick={() => handleOpenTab(item.id, item.label)} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all ${activeTabId === item.id ? 'bg-sky-500 text-white font-semibold shadow-md shadow-sky-100' : 'text-slate-600 hover:bg-slate-50'}`}><item.icon className="w-4 h-4" /> {item.label}</button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="pt-6 mt-6 border-t border-slate-100"><button onClick={logout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50/50 transition-colors"><LogOut className="w-5 h-5" />Cerrar Sesión</button></div>
        </aside>

        <main className="flex-1 min-w-0 flex flex-col h-full bg-[#f8fafc] rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
          {/* Tab Bar */}
          <div className="flex items-center gap-2 px-4 pt-4 pb-0 bg-white border-b border-slate-100 overflow-x-auto custom-scrollbar shrink-0">
            {openTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className={`group flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-bold border-b-2 transition-all whitespace-nowrap ${activeTabId === tab.id ? 'border-sky-500 text-sky-500 bg-[#f8fafc]' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
              >
                {tab.label}
                {tab.id !== 'dashboard' && (
                  <X 
                    className={`w-3.5 h-3.5 transition-all rounded-full p-0.5 ${activeTabId === tab.id ? 'text-sky-400 hover:text-white hover:bg-red-500' : 'opacity-0 group-hover:opacity-100 hover:text-white hover:bg-red-500'}`} 
                    onClick={(e) => handleCloseTab(tab.id, e)} 
                  />
                )}
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div className="flex-1 relative overflow-hidden bg-white">
            {openTabs.map(tab => {
              const currentTab = tab.id;
              return (
                <div key={tab.id} className="absolute inset-0 overflow-y-auto" style={{ display: activeTabId === tab.id ? 'block' : 'none', zIndex: activeTabId === tab.id ? 10 : 0 }}>
                  <div className="p-4 md:p-8">
                    {currentTab === 'dashboard' && <DashboardModule stats={stats} onNavigate={(v: any) => handleOpenTab(v, 'Módulo')} />}
                    {['products', 'categories', 'brands', 'units'].includes(currentTab) && <ProductModule products={products} categories={categories} brands={brands} units={units} onDelete={(t,id)=>handleDelete(t,id)} onEdit={openForm} onNew={openForm} />}
                    {currentTab === 'quotations' && (
                      <QuotationModule 
                        quotations={quotations} 
                        onEdit={(q) => openForm('quotations', q)} 
                        onNew={() => openForm('quotations')} 
                        onDelete={(id) => handleDelete('quotations', id)} 
                        onConvertToOrder={(q) => {
                          setEditingItem(null); 
                          setQuotationFormData({
                            ...q,
                            id: undefined,
                            quotationId: q.id,
                            docType: 'PED',
                            docSeries: '', // Resetear serie para que elija una de pedido
                            docNumber: '', // Resetear número
                            ruc: q.customerDocNumber,
                            razonSocial: q.customerName,
                            address: q.customerAddress,
                            date: new Date().toISOString().split('T')[0],
                            expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                            pickupPlace: q.pickupPlace || '',
                            sellerId: q.sellerId?.toString() || '',
                            customerId: q.customerId?.toString() || '',
                          });
                          setQuotationItems(q.items?.map((i: any) => ({
                            productId: i.productId,
                            name: i.product?.name || 'Producto',
                            code: i.product?.code || '',
                            price: i.price,
                            quantity: i.quantity,
                            discount: i.discount || 0,
                            unit: i.product?.unit,
                            unitMeasure: i.unitMeasure || i.product?.unit?.symbol || 'UND',
                            lot: i.lotNumber || i.lot || null,
                            expiryDate: i.expiryDate || null,
                            warehouseName: i.warehouseName || null,
                            stockRecords: i.product?.stockRecords || []
                          })) || []);
                          setIsQuotationModalOpen(true);
                        }} 
                        onReset={handleResetQuotation}
                        sunatCurrencies={sunatCurrencies}
                      />
                    )}
                    {currentTab === 'orders' && <OrderModule orders={orders} onUpdateStatus={(id, s) => axios.put(`/api/orders/${id}/status`, {status:s}, {headers:{Authorization:`Bearer ${token}`}}).then(fetchData)} onDelete={(id) => handleDelete('orders', id)} onViewGuide={() => handleOpenTab('referral-guides', 'Guías de Remisión')} onEdit={(o) => openForm('orders', o)} onOpenPayment={handleOpenPayment} onNewDirectOrder={() => { handleResetQuotationForm(); setQuotationFormData(prev => ({...prev, docType: 'PED'})); setIsOrderModalOpen(true); }} onCancelDispatch={(id) => { if (confirm('¿Anular despacho? Se revertirá el stock y el pedido volverá a "Preparado" en picking.')) { axios.put(`/api/orders/${id}/status`, {status: 'PREPARING'}, {headers:{Authorization:`Bearer ${token}`}}).then(fetchData).catch(err => alert(err.response?.data?.error || 'Error al anular despacho')); } }} onCancelPayment={(id) => { if (confirm('¿Anular cobro? Se eliminarán los pagos y se devolverá el stock a los almacenes originales.')) { axios.post(`/api/orders/${id}/cancel-payment`, {}, {headers:{Authorization:`Bearer ${token}`}}).then(fetchData).catch(err => alert(err.response?.data?.error || 'Error al anular cobro')); } }} onGenerateInvoice={(o) => openForm('invoices', {...o, docType: 'PED'})} onViewDetail={(o) => { setOrderDetail(o); setIsOrderDetailOpen(true); }} />}
                    {currentTab === 'inventory' && <InventoryModule products={products} stockDetails={stockDetails} movements={movements} onUpdateStock={(pid, s) => axios.put(`/api/products/${pid}/stock`, {stock:s}, {headers:{Authorization:`Bearer ${token}`}}).then(fetchData)} onEdit={(p) => openForm('products', p)} onOpenAssistant={() => setIsMovementAssistantOpen(true)} token={token} onRefresh={fetchData} />}
                    {currentTab === 'customers' && <CustomerModule customers={customers} onEdit={(c) => openForm('customers', c)} onNew={() => openForm('customers')} onDelete={(id) => handleDelete('customers', id)} departments={[]} />}
                    {currentTab === 'exchange-rates' && <ExchangeRateModule token={token} exchangeRates={exchangeRates} onDelete={(id) => handleDelete('exchange-rates', id)} onSave={(d) => axios.post('/api/exchange-rates', d, {headers:{Authorization:`Bearer ${token}`}}).then(fetchData)} loading={loading} isActive={activeTabId === tab.id} />}
                    {currentTab === 'shipping' && <LogisticsModule logisticsTab={logisticsTab} setLogisticsTab={setLogisticsTab} shippingAgencies={shippingAgencies} shippingZones={shippingZones} openEditModal={(item) => openForm(logisticsTab === 'agencies' ? 'shipping-agencies' : 'shipping-zones', item)} handleDelete={(t,id) => handleDelete(t,id)} />}
                    {currentTab === 'referral-guides' && (
                      <ReferralGuideModule 
                        token={token} 
                        orders={orders} 
                        warehouses={warehouses} 
                        shippingAgencies={shippingAgencies} 
                        seriesList={series} 
                        onNew={() => {
                          setSelectedOrderIdForGuide(null);
                          setIsReferralGuideModalOpen(true);
                        }}
                        refreshTrigger={referralGuideRefreshTrigger}
                      />
                    )}
                    {currentTab === 'logistics' && <AdvancedLogisticsModule token={token} />}
                    {currentTab === 'sellers' && <SellerModule sellers={sellers} onEdit={(s) => openForm('sellers', s)} onNew={() => openForm('sellers')} onDelete={(id) => handleDelete('sellers', id)} />}
                    {currentTab === 'warehouses' && <WarehouseModule warehouses={warehouses} onEdit={(w) => openForm('warehouses', w)} onNew={() => openForm('warehouses')} onDelete={(id) => handleDelete('warehouses', id)} />}
                    {currentTab === 'picking' && <WarehousePickingModule />}
                    {currentTab === 'series' && <SeriesModule series={series} warehouses={warehouses} documentTypes={seriesDocTypes} onEdit={(s) => openForm('series', s)} onNew={() => openForm('series')} onDelete={(id) => handleDelete('series', id)} />}
                    {currentTab === 'invoices' && <InvoiceModule invoices={invoices} documentTypes={seriesDocTypes} onEdit={(inv) => openForm('invoices', inv)} onNew={() => openForm('invoices')} onDelete={(id) => handleDelete('invoices', id)} token={token} onRefresh={fetchData} />}
                    {currentTab === 'purchases' && (
                      <PurchaseModule 
                        token={token || undefined} 
                        onNew={(mode) => openForm('purchases', null, mode)} 
                        onEdit={(p, mode) => openForm('purchases', p, mode)}
                        onDelete={(id) => handleDelete('purchases', id)}
                        purchases={purchases} 
                      />
                    )}
                    {currentTab === 'suppliers' && <SupplierModule token={token} onNew={() => openForm('suppliers')} onEdit={(s) => openForm('suppliers', s)} suppliers={suppliers} />}
                    {currentTab === 'settings' && <SettingsModule token={token} />}
                    {currentTab === 'users' && <UserModule />}
                    {currentTab === 'roles' && <RoleModule />}
                    {currentTab === 'profile' && (
                      <ProfileView 
                        user={user} 
                        token={token} 
                        onUserUpdate={(updatedUser) => {
                          updateUser(updatedUser);
                        }}
                        showSuccess={showSuccess}
                        showError={showError}
                      />
                    )}
                  </div>
                </div>
              );
            })}

          {/* Modals localized to their respective tabs */}
          <div style={{ display: activeTabId === 'quotations' ? 'block' : 'none' }}>
            <QuotationForm 
              isOpen={isQuotationModalOpen} 
              onClose={() => setIsQuotationModalOpen(false)} 
              onSubmit={handleSubmitQuotation} 
              formData={quotationFormData} 
              setFormData={setQuotationFormData} 
              editingItem={editingItem} 
              loading={loading} 
              customers={customers} 
              sellers={sellers}
              warehouses={warehouses}
              shippingAgencies={shippingAgencies}
              sunatCurrencies={sunatCurrencies}
              sunatPaymentConditions={sunatPaymentConditions}
              sunatOperationTypes={sunatOperationTypes}
              searchResults={searchResults} 
              handleSearchProduct={handleSearchProduct} 
              quotationItems={quotationItems} 
              addQuotationItem={addQuotationItem} 
              updateQuotationItem={updateQuotationItem} 
              removeQuotationItem={removeQuotationItem} 
              quotationTotal={quotationTotal} 
              handleConsultCustomer={handleConsultForQuotation}
              handleQuickRegister={handleQuickRegisterCustomer}
              onOpenCustomerForm={(doc) => {
                setCustomerFormData({ 
                  ...initialCustomerData, 
                  docNumber: doc,
                  docType: doc.length === 11 ? 'RUC' : 'DNI',
                  personType: doc.length === 11 ? 'JURIDICA' : 'NATURAL'
                });
                setIsCustomerModalOpen(true);
              }}
              token={token}
              sunatIgvAffectations={sunatIgvAffectations}
              sunatDocTypes={sunatDocTypes}
              series={series}
            />
          </div>

          <div style={{ display: ['products', 'categories', 'brands', 'units'].includes(activeTabId) ? 'block' : 'none' }}>
            <ProductForm isOpen={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} onSubmit={handleSubmitProduct} formData={productFormData} setFormData={setProductFormData} editingItem={editingItem} loading={loading} categories={categories} brands={brands} units={units} handleFileUpload={handleFileUpload} setLoading={setLoading} token={token || undefined} />
          </div>

          <div style={{ display: activeTabId === 'shipping' ? 'block' : 'none' }}>
            <AgencyForm isOpen={isAgencyModalOpen} onClose={() => setIsAgencyModalOpen(false)} onSubmit={handleSubmitAgency} formData={agencyFormData} setFormData={setAgencyFormData} editingItem={editingItem} loading={loading} shippingZones={shippingZones} handleConsultDocument={handleConsultForQuotation} />
          </div>

          <div style={{ display: activeTabId === 'warehouses' ? 'block' : 'none' }}>
            <WarehouseForm isOpen={isWarehouseModalOpen} onClose={() => setIsWarehouseModalOpen(false)} onSubmit={handleSubmitWarehouse} formData={warehouseFormData} setFormData={setWarehouseFormData} loading={loading} token={token} refreshData={fetchData} />
          </div>

          <div style={{ display: activeTabId === 'customers' || isCustomerModalOpen ? 'block' : 'none' }}>
            <CustomerForm isOpen={isCustomerModalOpen} onClose={() => setIsCustomerModalOpen(false)} onSubmit={handleSubmitCustomer} formData={customerFormData} setFormData={setCustomerFormData} editingItem={editingItem} loading={loading} documentTypes={documentTypes} handleConsultDocument={handleConsultDocument} />
          </div>

          <div style={{ display: activeTabId === 'sellers' ? 'block' : 'none' }}>
            <SellerForm isOpen={isSellerModalOpen} onClose={() => setIsSellerModalOpen(false)} onSubmit={handleSubmitSeller} formData={sellerFormData} setFormData={setSellerFormData} loading={loading} isEditing={!!editingItem} warehouses={warehouses} />
          </div>

          <div style={{ display: ['products', 'categories', 'brands', 'units', 'warehouses'].includes(activeTabId) ? 'block' : 'none' }}>
            <SimpleForm isOpen={isSimpleModalOpen} onClose={() => setIsSimpleModalOpen(false)} onSubmit={handleSubmitSimple} formData={simpleFormData} setFormData={setSimpleFormData} type={simpleModalType} loading={loading} handleFileUpload={handleFileUpload} />
          </div>

          <div style={{ display: activeTabId === 'series' ? 'block' : 'none' }}>
            <SeriesForm 
              isOpen={isSeriesModalOpen}
              onClose={() => setIsSeriesModalOpen(false)}
              onSubmit={handleSubmitSeries}
              formData={seriesFormData}
              setFormData={setSeriesFormData}
              loading={loading}
              warehouses={warehouses}
              documentTypes={seriesDocTypes}
            />
          </div>

          <div style={{ display: ['invoices', 'orders'].includes(activeTabId) ? 'block' : 'none' }}>
            <InvoiceForm
              isOpen={isInvoiceModalOpen}
              onClose={() => setIsInvoiceModalOpen(false)}
              onSubmit={handleSubmitInvoice}
              formData={invoiceFormData}
              setFormData={setInvoiceFormData}
              editingItem={editingItem}
              loading={loading}
              customers={customers}
              sellers={sellers}
              documentTypes={seriesDocTypes}
              sunatCurrencies={sunatCurrencies}
              sunatPaymentConditions={sunatPaymentConditions}
              sunatOperationTypes={sunatOperationTypes}
              sunatIgvAffectations={sunatIgvAffectations}
              searchResults={searchResults}
              handleSearchProduct={handleSearchProduct}
              quotationItems={quotationItems}
              setQuotationItems={setQuotationItems}
              addQuotationItem={addQuotationItem}
              updateQuotationItem={updateQuotationItem}
              removeQuotationItem={removeQuotationItem}
              quotationTotal={quotationTotal}
              token={token}
              series={series}
              invoices={invoices}
              handleConsultCustomer={handleConsultForQuotation}
              handleQuickRegister={handleQuickRegisterCustomer}
              onOpenCustomerForm={(doc) => { setCustomerFormData({ ...initialCustomerData, docNumber: doc }); setIsCustomerModalOpen(true); }}
            />
          </div>

          <div style={{ display: activeTabId === 'orders' ? 'block' : 'none' }}>
            <OrderDetailModal
              isOpen={isOrderDetailOpen}
              onClose={() => setIsOrderDetailOpen(false)}
              order={orderDetail}
            />
          </div>

          <div style={{ display: activeTabId === 'purchases' ? 'block' : 'none' }}>
            {purchaseMode === 'guides' ? (
              <ReferralGuideForm 
                isOpen={isPurchaseModalOpen}
                onClose={() => setIsPurchaseModalOpen(false)}
                onSuccess={() => { setIsPurchaseModalOpen(false); fetchData(); showSuccess('Guía de Ingreso registrada'); }}
                token={token}
                formData={purchaseFormData}
                setFormData={setPurchaseFormData}
              />
            ) : (
              <PurchaseEntryForm 
                isOpen={isPurchaseModalOpen}
                onClose={() => setIsPurchaseModalOpen(false)}
                onSuccess={() => { setIsPurchaseModalOpen(false); fetchData(); showSuccess('Compra registrada correctamente'); }}
                token={token}
                formData={purchaseFormData}
                setFormData={setPurchaseFormData}
                mode={purchaseMode}
              />
            )}
          </div>

          <div style={{ display: activeTabId === 'suppliers' ? 'block' : 'none' }}>
            <SupplierForm 
              isOpen={isSupplierModalOpen}
              onClose={() => setIsSupplierModalOpen(false)}
              onSubmit={handleSubmitSupplier}
              formData={supplierFormData}
              setFormData={setSupplierFormData}
              editingItem={editingItem}
              loading={loading}
              token={token}
            />
          </div>

          <div style={{ display: activeTabId === 'transfers' ? 'block' : 'none' }}>
            <TransferForm 
              isOpen={isTransferModalOpen}
              onClose={() => setIsTransferModalOpen(false)}
              onSubmit={handleSubmitTransfer}
              formData={transferFormData}
              setFormData={setTransferFormData}
              loading={loading}
              warehouses={warehouses}
              products={products}
            />
          </div>

          <div style={{ display: activeTabId === 'inventory' ? 'block' : 'none' }}>
            <MovementAssistantForm 
              isOpen={isMovementAssistantOpen}
              onClose={() => setIsMovementAssistantOpen(false)}
              onSubmit={handleSubmitMovement}
              warehouses={warehouses}
              customers={[
                ...customers.map(c => ({ ...c, type: 'CUSTOMER' })),
                ...suppliers.map(s => ({ ...s, type: 'SUPPLIER' }))
              ]}
              products={products}
              token={token}
            />
          </div>

          <div style={{ display: activeTabId === 'orders' ? 'block' : 'none' }}>
            <OrderForm 
              isOpen={isOrderModalOpen}
              onClose={() => setIsOrderModalOpen(false)}
              onSubmit={handleSubmitQuotation}
              formData={quotationFormData}
              setFormData={setQuotationFormData}
              editingItem={editingItem}
              loading={loading}
              customers={customers}
              sellers={sellers}
              warehouses={warehouses}
              shippingAgencies={shippingAgencies}
              sunatCurrencies={sunatCurrencies}
              sunatPaymentConditions={sunatPaymentConditions}
              sunatOperationTypes={sunatOperationTypes}
              searchResults={searchResults}
              handleSearchProduct={handleSearchProduct}
              quotationItems={quotationItems}
              addQuotationItem={addQuotationItem}
              updateQuotationItem={updateQuotationItem}
              removeQuotationItem={removeQuotationItem}
              quotationTotal={quotationTotal}
              handleConsultCustomer={handleConsultForQuotation}
              handleQuickRegister={handleQuickRegisterCustomer}
              onOpenCustomerForm={(doc) => {
                setCustomerFormData({ 
                  ...initialCustomerData, 
                  docNumber: doc,
                  docType: doc && doc.length === 11 ? 'RUC' : 'DNI',
                  personType: doc && doc.length === 11 ? 'JURIDICA' : 'NATURAL'
                });
                setIsCustomerModalOpen(true);
              }}
              token={token || ''}
              sunatIgvAffectations={sunatIgvAffectations}
              sunatDocTypes={sunatDocTypes}
              series={series}
            />
          </div>

          <div style={{ display: activeTabId === 'orders' ? 'block' : 'none' }}>
            <PaymentForm 
              isOpen={isPaymentModalOpen}
              onClose={() => setIsPaymentModalOpen(false)}
              order={selectedOrderForPayment}
              onSubmit={handleSubmitPayment}
              onDeletePayment={handleDeletePayment}
              loading={loading}
            />
          </div>

          <div style={{ display: activeTabId === 'referral-guides' || isReferralGuideModalOpen ? 'block' : 'none' }}>
            <SalesReferralGuideForm
              isOpen={isReferralGuideModalOpen}
              onClose={() => setIsReferralGuideModalOpen(false)}
              onSuccess={() => {
                setIsReferralGuideModalOpen(false);
                setReferralGuideRefreshTrigger(prev => prev + 1);
                fetchData();
              }}
              token={token}
              initialOrderId={selectedOrderIdForGuide}
              orders={orders}
              quotations={quotations}
              invoices={invoices}
              warehouses={warehouses}
              shippingAgencies={shippingAgencies}
              seriesList={series}
              sellers={sellers}
            />
          </div>

          </div> {/* Cierre del contenedor Content Area */}
        </main>
      </div>
    </div>
  );
}

