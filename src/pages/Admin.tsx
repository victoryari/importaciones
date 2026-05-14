import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutDashboard, Package, Save, Image as ImageIcon, Settings as SettingsIcon, LogOut, Trash2, X, CheckCircle, FileText, BarChart3, Star, ShoppingCart, Truck, DollarSign, User, MapPin, Hash, ArrowRightLeft, Building2, Users, ShieldCheck } from 'lucide-react';
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
import { SeriesModule } from './admin/SeriesModule';
import { PurchaseModule } from './admin/PurchaseModule';
import { TransferModule } from './admin/TransferModule';
import { SupplierModule } from './admin/SupplierModule';
import { RoleModule } from './admin/RoleModule';
import { UserModule } from './admin/UserModule';

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
import { SupplierForm } from './admin/forms/SupplierForm';
import { TransferForm } from './admin/forms/TransferForm';
import { MovementAssistantForm } from './admin/forms/MovementAssistantForm';
import PaymentForm from './admin/forms/PaymentForm';

import axios from 'axios';
import { getDeptId, getProvId, getDistId } from '../lib/ubigeoData';

// --- Interfaces Globales Estrictas ---
interface Category { id: number; name: string; slug: string; image?: string; isFeatured: boolean; _count?: { products: number }; }
interface Brand { id: number; name: string; logo?: string; _count?: { products: number }; }
interface Unit { id: number; name: string; symbol: string; }
interface Product { id: number; code?: string; name: string; slug: string; weight?: string; description?: string; features?: string; sanitaryRegister?: string; certificate?: string; igv: number; costPrice: number; salePrice: number; minSalePrice?: number; maxSalePrice?: number; stock: number; images?: string[]; isActive: boolean; categoryId: number; category?: { name: string }; brandId?: number; brand?: { name: string }; unitId?: number; unit?: { name: string; symbol: string }; showInWeb: boolean; manageLots: boolean; useExpiryDate: boolean; }
interface Order { id: number; customerName: string; customerEmail?: string; customerPhone: string; totalAmount: number; status: string; createdAt: string; items: any[]; paymentStatus: string; }
interface Customer { id: number; code?: string; name: string; personType: string; docType: string; docNumber: string; address?: string; phone?: string; email?: string; country: string; department?: string; province?: string; district?: string; firstName?: string; lastName?: string; }
interface Quotation { id: number; customerName: string; totalAmount: number; status: string; createdAt: string; items: any[]; exchangeRate: number; docSeries?: string; docNumber?: string; customerDocNumber?: string; customerPhone?: string; customerAddress?: string; currency?: string; pickupPlace?: string; sellerId?: number; customerId?: number; }

export default function Admin() {
  const { token, logout, user, hasPermission } = useAuth();
  
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
  const [simpleModalType, setSimpleModalType] = useState<'categories' | 'brands' | 'units' | 'warehouses'>('categories');
  const [logisticsTab, setLogisticsTab] = useState<'agencies' | 'zones'>('agencies');

  // Formularios iniciales
  const initialSellerData = { name: '', dni: '', phone: '', email: '', isActive: true };
  const initialProductData = { code: '', name: '', slug: '', weight: '', description: '', features: '', sanitaryRegister: '', certificate: '', igv: 18, costPrice: 0, salePrice: 0, profitMargin: 30, minSalePrice: 0, maxSalePrice: 0, stock: 0, categoryId: '', brandId: '', unitId: '', packageId: '', quantityPerPackage: 1, subPackageId: '', quantityPerSubPackage: 1, images: [], isActive: true, isFeatured: false, showInWeb: true, manageLots: false, useExpiryDate: false };
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
    paymentCondition: 'CONTADO',
    currency: '1', 
    sellerName: user?.name || '',
    observation: '',
    globalDiscount: 0,
    billingStatus: 'SIN FACTURAR',
    agencyId: '',
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
  const initialWarehouseData = { code: '', name: '', commercialName: '', address: '', ruc: '', ubigeo: '', observation: '', phones: '', type: '', validateStock: true, isActive: true, floors: [] };

  const [agencyFormData, setAgencyFormData] = useState(initialAgencyData);
  const [warehouseFormData, setWarehouseFormData] = useState(initialWarehouseData);
  const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false);

  const [sellerFormData, setSellerFormData] = useState(initialSellerData);
  const [productFormData, setProductFormData] = useState(initialProductData);
  const [customerFormData, setCustomerFormData] = useState(initialCustomerData);
  const [seriesFormData, setSeriesFormData] = useState(initialSeriesData);
  const [purchaseFormData, setPurchaseFormData] = useState({
    supplierId: '', supplierName: '', docType: 'FACTURA', docSeries: '', docNumber: '',
    date: new Date().toISOString().split('T')[0], currency: 'PEN', exchangeRate: '1.00',
    warehouseId: '', observation: '', items: [] as any[]
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
    const total = quotationItems.reduce((acc, item) => acc + (item.price * item.quantity * (1 - (item.discount || 0) / 100)), 0);
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

  const handleResetQuotationForm = () => {
    setQuotationFormData(initialQuotationData);
    setQuotationItems([]);
    setSearchResults([]);
    setEditingItem(null);
  };

  const handleSearchProduct = (q: string) => {
    if (q.length > 1) {
      axios.get(`/api/products/search?q=${q}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => setSearchResults(r.data));
    }
  };

  const addQuotationItem = (p: any) => {
    if (!quotationItems.find(i => i.productId === p.id)) {
      const warehouseId = parseInt(quotationFormData.pickupPlace);
      const validRecords = (p.stockRecords || []).filter((sr: any) => sr.warehouseId === warehouseId && sr.quantity > 0);
      const oldestLot = validRecords.sort((a: any, b: any) => a.id - b.id)[0];

      setQuotationItems([...quotationItems, {
        productId: p.id,
        name: p.name,
        code: p.code,
        price: p.salePrice,
        quantity: 1,
        discount: 0,
        unit: p.unit,
        lot: oldestLot?.lot || null,
        stockRecords: p.stockRecords || []
      }]);
    }
    setSearchResults([]);
  };

  const updateQuotationItem = (id: number, f: string, v: any) => {
    setQuotationItems(quotationItems.map(i => i.productId === id ? { ...i, [f]: v } : i));
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
        '/api/shipping-zones', '/api/sunat/document_type', '/api/stats', '/api/exchange-rates',
        '/api/sellers', '/api/warehouses', '/api/sunat/currency', 
        '/api/sunat/payment_condition', '/api/sunat/operation_type', '/api/sunat/igv_affectation_type', '/api/sunat/doc_type', '/api/series', '/api/purchases', '/api/movements', '/api/suppliers', '/api/stock'
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
    formData.append('file', file);
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
            unitSymbol: i.product?.unit?.symbol || 'UND',
            quantity: i.quantity,
            price: i.price,
            lotNumber: i.lotNumber || ''
          })) || []
        });
      } else {
        setPurchaseFormData({
          supplierId: '', supplierName: '', docType: modeToSet === 'guides' ? '09' : '01', docSeries: '', docNumber: '',
          date: new Date().toISOString().split('T')[0], currency: 'PEN', exchangeRate: '1.00',
          warehouseId: '', observation: '', items: []
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
    else if (type === 'quotations' || type === 'orders') { 
      if (item) {
        // Mapeo explícito para asegurar que los campos coincidan con lo que QuotationForm espera
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
          docType: type === 'quotations' ? 'COT' : (type === 'orders' ? 'PED' : (item.docType || 'COT')),
          date: item.createdAt?.split('T')[0] || item.date || new Date().toISOString().split('T')[0],
          expiryDate: item.dueDate?.split('T')[0] || item.expiryDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        });
        
        setQuotationItems(item.items?.map((i: any) => ({
          productId: i.productId,
          name: i.product?.name || i.name || 'Producto',
          code: i.product?.code || i.code || '',
          price: Number(i.price || 0),
          quantity: Number(i.quantity || 0),
          discount: Number(i.discount || 0),
          unit: i.product?.unit?.symbol || i.unit || 'UND'
        })) || []);
      } else {
        setQuotationFormData({
          ...initialQuotationData,
          docType: type === 'quotations' ? 'COT' : (type === 'orders' ? 'PED' : 'COT')
        });
        setQuotationItems([]);
      }
      setIsQuotationModalOpen(true); 
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
      
      // Auto-generar slug si está vacío
      const dataToSubmit = { ...productFormData };
      if (!dataToSubmit.slug) {
        dataToSubmit.slug = dataToSubmit.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      }

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
      const res = await axios({ method: editingItem ? 'PUT' : 'POST', url, data: warehouseFormData, headers: { Authorization: `Bearer ${token}` } });
      showSuccess('Almacén guardado'); 
      if (!editingItem) {
        setIsWarehouseModalOpen(false);
      } else {
        // Actualizar el form data con la respuesta (que incluye IDs nuevos)
        setWarehouseFormData(res.data);
      }
      fetchData();
    } catch (err) { console.error(err); } finally { setLoading(false); }
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
        totalAmount: quotationTotal 
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

  const handleSubmitSupplier = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Sincronizar el código con el número de documento
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
      const res = await axios({ method: editingItem ? 'PUT' : 'POST', url, data: customerFormData, headers: { Authorization: `Bearer ${token}` } });
      showSuccess('Guardado'); 
      setIsCustomerModalOpen(false); 
      await fetchData();
      
      // Si estamos en el modal de cotización, seleccionar automáticamente al nuevo cliente
      if (isQuotationModalOpen && !editingItem) {
        setQuotationFormData((prev: any) => ({
          ...prev,
          customerId: res.data.id.toString(),
          ruc: res.data.docNumber,
          razonSocial: res.data.name || `${res.data.firstName} ${res.data.lastName}`,
          address: res.data.address || ''
        }));
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleConsultDocument = async () => {
    if (!customerFormData.docNumber) return;
    setLoading(true);
    try {
      const res = await axios.get(`/api/consult/${customerFormData.docType.toLowerCase()}/${customerFormData.docNumber.trim()}`, { headers: { Authorization: `Bearer ${token}` } });
      const d = res.data;
      
      // La API devuelve el objeto directamente (ruc, razonSocial, nombres, etc.)
      if (d.ruc || d.dni || d.razonSocial || d.nombres || d.nombre_o_razon_social || d.success) {
        // Normalizar respuesta si viene envuelta en .data
        const data = d.data || d;
        
        if (customerFormData.docType === 'RUC') {
          const dName = data.departamento || data.department || '';
          const pName = data.provincia || data.province || '';
          const diName = data.distrito || data.district || '';
          
          const deptId = getDeptId(dName);
          const provId = getProvId(deptId, pName);
          const distId = getDistId(provId, diName);

          setCustomerFormData({ 
            ...customerFormData, 
            name: data.razonSocial || data.nombre_o_razon_social || '', 
            address: data.direccion || data.direccion_completa || '', 
            department: deptId,
            province: provId,
            district: distId
          });
        } else {
          // Para DNI, manejar camelCase y snake_case, y separar nombres
          const rawNames = data.nombres || '';
          const nameParts = rawNames.trim().split(/\s+/);
          const firstName = nameParts[0] || '';
          const secondName = nameParts.slice(1).join(' ') || '';
          
          const apePat = data.apellidoPaterno || data.apellido_paterno || '';
          const apeMat = data.apellidoMaterno || data.apellido_materno || '';
          
          const dName = data.departamento || data.department || '';
          const pName = data.provincia || data.province || '';
          const diName = data.distrito || data.district || '';
          
          const deptId = getDeptId(dName);
          const provId = getProvId(deptId, pName);
          const distId = getDistId(provId, diName);

          setCustomerFormData({ 
            ...customerFormData, 
            firstName: firstName,
            secondName: secondName,
            lastName: apePat,
            surname: apeMat,
            name: data.razonSocial || `${rawNames} ${apePat} ${apeMat}`.trim(),
            address: data.direccion || data.direccion_completa || '',
            department: deptId,
            province: provId,
            district: distId
          });
        }
        showSuccess('Datos recuperados correctamente');
      } else {
        alert('No se encontró información para el número ingresado');
      }
    } catch (err) { 
      console.error(err);
      alert('Error en el servicio de consulta. Verifique que el número de documento sea válido.');
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
    <div className="w-full max-w-480 mx-auto px-4 py-4 md:px-6 h-screen flex flex-col">
      <AnimatePresence>{successMsg && <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-24 right-10 z-50 bg-green-600 text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-2"><CheckCircle className="w-5 h-5" /> <span className="font-bold">{successMsg}</span></motion.div>}</AnimatePresence>

      <div className="flex flex-col lg:flex-row gap-6 h-full min-h-0">
        <aside className="w-full lg:w-64 shrink-0 space-y-2 h-full overflow-y-auto custom-scrollbar pr-2">
          <div className="px-4 py-4 mb-4 bg-blue-900 text-white rounded-3xl shadow-lg shadow-blue-100"><div className="flex items-center gap-3 mb-1"><div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold">C</div><span className="font-bold text-lg">Panel Admin</span></div><p className="text-[10px] text-blue-300 font-bold uppercase tracking-widest pl-11">{user?.name || 'Administrador'}</p></div>
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Resumen', permission: 'VIEW_DASHBOARD' }, 
            { id: 'products', icon: Package, label: 'Productos', permission: 'VIEW_PRODUCTS' }, 
            { id: 'quotations', icon: FileText, label: 'Cotizaciones', permission: 'VIEW_QUOTATIONS' }, 
            { id: 'orders', icon: ShoppingCart, label: 'Pedidos', permission: 'VIEW_ORDERS' }, 
            { id: 'inventory', icon: BarChart3, label: 'Inventario / Stock', permission: 'VIEW_INVENTORY' }, 
            { id: 'purchases', icon: ShoppingCart, label: 'Compras', permission: 'VIEW_PURCHASES' },
            { id: 'logistics', icon: Truck, label: 'Logística', permission: 'VIEW_LOGISTICS' },
            { id: 'warehouses', icon: MapPin, label: 'Almacenes / Sedes', permission: 'VIEW_WAREHOUSES' },
            { id: 'customers', icon: Star, label: 'Clientes', permission: 'VIEW_CUSTOMERS' }, 
            { id: 'suppliers', icon: Building2, label: 'Proveedores', permission: 'VIEW_SUPPLIERS' },
            { id: 'sellers', icon: User, label: 'Vendedores', permission: 'VIEW_SELLERS' },
            { id: 'exchange-rates', icon: DollarSign, label: 'T. Cambio', permission: 'VIEW_EXCHANGE_RATES' }, 
            { id: 'series', icon: Hash, label: 'Series', permission: 'VIEW_SERIES' }, 
            { id: 'settings', icon: SettingsIcon, label: 'Ajustes', permission: 'VIEW_SETTINGS' },
            { id: 'users', icon: Users, label: 'Usuarios', permission: 'ALL' },
            { id: 'roles', icon: ShieldCheck, label: 'Roles', permission: 'ALL' },
          ].map(item => {
            const hasAccess = item.permission ? hasPermission?.(item.permission) : true;
            if (!hasAccess) return null;
            return (
              <button key={item.id} onClick={() => handleOpenTab(item.id, item.label)} className={`w-full flex items-center gap-3 px-4 py-4 rounded-2xl transition-all ${activeTabId === item.id || (item.id === 'products' && ['categories', 'brands', 'units'].includes(activeTabId)) ? 'bg-blue-100 text-blue-900 font-bold scale-105 shadow-sm' : 'hover:bg-slate-100'}`}><item.icon className="w-5 h-5" /> {item.label}</button>
            );
          })}
          <div className="pt-8 mt-8 border-t border-slate-100"><button onClick={logout} className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl text-red-600 hover:bg-red-50 transition-colors"><LogOut className="w-5 h-5" />Cerrar Sesión</button></div>
        </aside>

        <main className="flex-1 min-w-0 flex flex-col h-full bg-slate-50/50 rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          {/* Tab Bar */}
          <div className="flex items-center gap-2 px-4 pt-4 pb-0 bg-transparent border-b border-slate-200 overflow-x-auto custom-scrollbar shrink-0">
            {openTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className={`group flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-bold border-b-2 transition-all whitespace-nowrap ${activeTabId === tab.id ? 'border-blue-600 text-blue-600 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.02)]' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-white/50'}`}
              >
                {tab.label}
                {tab.id !== 'dashboard' && (
                  <X 
                    className={`w-3.5 h-3.5 transition-all rounded-full p-0.5 ${activeTabId === tab.id ? 'text-blue-400 hover:text-white hover:bg-red-500' : 'opacity-0 group-hover:opacity-100 hover:text-white hover:bg-red-500'}`} 
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
                            unit: i.product?.unit
                          })) || []);
                          setIsQuotationModalOpen(true);
                        }} 
                        onReset={handleResetQuotation}
                      />
                    )}
                    {currentTab === 'orders' && <OrderModule orders={orders} onUpdateStatus={(id, s) => axios.put(`/api/orders/${id}/status`, {status:s}, {headers:{Authorization:`Bearer ${token}`}}).then(fetchData)} onDelete={(id) => handleDelete('orders', id)} onViewGuide={() => {}} onEdit={(o) => openForm('orders', o)} onOpenPayment={handleOpenPayment} onNewDirectOrder={() => { handleResetQuotationForm(); setQuotationFormData(prev => ({...prev, docType: 'PED'})); setIsOrderModalOpen(true); }} />}
                    {currentTab === 'inventory' && <InventoryModule products={products} stockDetails={stockDetails} movements={movements} onUpdateStock={(pid, s) => axios.put(`/api/products/${pid}/stock`, {stock:s}, {headers:{Authorization:`Bearer ${token}`}}).then(fetchData)} onEdit={(p) => openForm('products', p)} onOpenAssistant={() => setIsMovementAssistantOpen(true)} token={token} onRefresh={fetchData} />}
                    {currentTab === 'customers' && <CustomerModule customers={customers} onEdit={(c) => openForm('customers', c)} onNew={() => openForm('customers')} onDelete={(id) => handleDelete('customers', id)} departments={[]} />}
                    {currentTab === 'exchange-rates' && <ExchangeRateModule token={token} exchangeRates={exchangeRates} onDelete={(id) => handleDelete('exchange-rates', id)} onSave={(d) => axios.post('/api/exchange-rates', d, {headers:{Authorization:`Bearer ${token}`}}).then(fetchData)} loading={loading} />}
                    {currentTab === 'logistics' && <LogisticsModule logisticsTab={logisticsTab} setLogisticsTab={setLogisticsTab} shippingAgencies={shippingAgencies} shippingZones={shippingZones} openEditModal={(item) => openForm(logisticsTab === 'agencies' ? 'shipping-agencies' : 'shipping-zones', item)} handleDelete={(t,id) => handleDelete(t,id)} />}
                    {currentTab === 'sellers' && <SellerModule sellers={sellers} onEdit={(s) => openForm('sellers', s)} onNew={() => openForm('sellers')} onDelete={(id) => handleDelete('sellers', id)} />}
                    {currentTab === 'warehouses' && <WarehouseModule warehouses={warehouses} onEdit={(w) => openForm('warehouses', w)} onNew={() => openForm('warehouses')} onDelete={(id) => handleDelete('warehouses', id)} />}
                    {currentTab === 'series' && <SeriesModule series={series} warehouses={warehouses} onEdit={(s) => openForm('series', s)} onNew={() => openForm('series')} onDelete={(id) => handleDelete('series', id)} />}
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
                  </div>
                </div>
              );
            })}

          {/* Modals localized to their respective tabs */}
          <div style={{ display: (activeTabId === 'quotations' || activeTabId === 'orders') ? 'block' : 'none' }}>
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
              handleSearchProduct={(q) => { if(q.length > 1) axios.get(`/api/products/search?q=${q}`, {headers:{Authorization:`Bearer ${token}`}}).then(r=>setSearchResults(r.data)) }} 
              quotationItems={quotationItems} 
              addQuotationItem={(p) => { 
                if(!quotationItems.find(i=>i.productId===p.id)) {
                  // --- Lógica PEPS (FIFO) ---
                  const warehouseId = parseInt(quotationFormData.pickupPlace);
                  const validRecords = (p.stockRecords || []).filter((sr: any) => sr.warehouseId === warehouseId && sr.quantity > 0);
                  // Ordenar por ID (los IDs más bajos suelen ser los ingresos más antiguos)
                  const oldestLot = validRecords.sort((a: any, b: any) => a.id - b.id)[0];
                  
                  setQuotationItems([...quotationItems, {
                    productId: p.id, 
                    name: p.name, 
                    code: p.code, 
                    price: p.salePrice, 
                    quantity: 1, 
                    discount: 0, 
                    unit: p.unit, 
                    lot: oldestLot?.lot || null,
                    stockRecords: p.stockRecords || []
                  }]);
                }
                setSearchResults([]); 
              }} 
              updateQuotationItem={(id, f, v) => setQuotationItems(quotationItems.map(i=>i.productId===id?{...i,[f]:v}:i))} 
              removeQuotationItem={(id) => {
                if (id === -1) {
                  setQuotationItems(prev => prev.slice(0, -1));
                } else {
                  setQuotationItems(prev => prev.filter(i => i.productId !== id));
                }
              }} 
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

          <div style={{ display: activeTabId === 'logistics' ? 'block' : 'none' }}>
            <AgencyForm isOpen={isAgencyModalOpen} onClose={() => setIsAgencyModalOpen(false)} onSubmit={handleSubmitAgency} formData={agencyFormData} setFormData={setAgencyFormData} editingItem={editingItem} loading={loading} shippingZones={shippingZones} handleConsultDocument={handleConsultForQuotation} />
          </div>

          <div style={{ display: activeTabId === 'warehouses' ? 'block' : 'none' }}>
            <WarehouseForm isOpen={isWarehouseModalOpen} onClose={() => setIsWarehouseModalOpen(false)} onSubmit={handleSubmitWarehouse} formData={warehouseFormData} setFormData={setWarehouseFormData} loading={loading} token={token} refreshData={fetchData} />
          </div>

          <div style={{ display: (activeTabId === 'customers' || isCustomerModalOpen) ? 'block' : 'none' }}>
            <CustomerForm isOpen={isCustomerModalOpen} onClose={() => setIsCustomerModalOpen(false)} onSubmit={handleSubmitCustomer} formData={customerFormData} setFormData={setCustomerFormData} editingItem={editingItem} loading={loading} documentTypes={documentTypes} handleConsultDocument={handleConsultDocument} />
          </div>

          <div style={{ display: (activeTabId === 'sellers' || isSellerModalOpen) ? 'block' : 'none' }}>
            <SellerForm isOpen={isSellerModalOpen} onClose={() => setIsSellerModalOpen(false)} onSubmit={handleSubmitSeller} formData={sellerFormData} setFormData={setSellerFormData} loading={loading} isEditing={!!editingItem} />
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

          </div> {/* Cierre del contenedor Content Area */}

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
            onOpenCustomerForm={(doc) => { setCustomerFormData({ ...initialCustomerData, docNumber: doc }); setIsCustomerModalOpen(true); }}
            token={token || ''}
            sunatIgvAffectations={sunatIgvAffectations}
            sunatDocTypes={sunatDocTypes}
            series={series}
          />

          <PaymentForm 
            isOpen={isPaymentModalOpen}
            onClose={() => setIsPaymentModalOpen(false)}
            order={selectedOrderForPayment}
            onSubmit={handleSubmitPayment}
            onDeletePayment={handleDeletePayment}
            loading={loading}
          />
        </main>
      </div>
    </div>
  );
}

