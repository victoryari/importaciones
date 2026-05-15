import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import { Search, ShoppingCart, Menu, X, Phone, User, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useCart } from '../context/CartContext';

interface Category {
  id: number;
  name: string;
  slug: string;
}

/** Hook de debounce: retrasa la actualización del valor N milisegundos */
function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

export default function Navbar() {
  const [isOpen, setIsOpen]         = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings]     = useState<any>({});
  const [inputValue, setInputValue] = useState('');
  const [mobileInput, setMobileInput] = useState('');

  const { cartCount, setIsOpen: setIsCartOpen } = useCart();
  const location       = useLocation();
  const navigate       = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const desktopInputRef = useRef<HTMLInputElement>(null);

  // Valor debounced (300ms) para no disparar búsqueda en cada tecla
  const debouncedSearch = useDebounce(inputValue || mobileInput, 300);

  // Scroll listener
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Carga de datos
  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(setCategories).catch(() => {});
    fetch('/api/settings').then(r => r.json()).then(setSettings).catch(() => {});
  }, []);

  // Sincronizar valor inicial desde la URL
  useEffect(() => {
    const q = searchParams.get('search') || '';
    setInputValue(q);
  }, []);

  // Aplicar búsqueda debounced a la URL y navegar a /products si no estamos ahí
  useEffect(() => {
    const current = searchParams.get('search') || '';
    if (debouncedSearch === current) return;

    const newParams = new URLSearchParams(searchParams);
    if (debouncedSearch) {
      newParams.set('search', debouncedSearch);
    } else {
      newParams.delete('search');
    }

    if (debouncedSearch && location.pathname !== '/products') {
      // Redirigir al catálogo con la búsqueda
      navigate(`/products?${newParams.toString()}`);
    } else {
      setSearchParams(newParams, { replace: true });
    }
  }, [debouncedSearch]);

  const clearSearch = () => {
    setInputValue('');
    setMobileInput('');
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('search');
    setSearchParams(newParams, { replace: true });
    desktopInputRef.current?.focus();
  };

  const activeSearch = searchParams.get('search') || '';

  return (
    <nav className={cn(
      "fixed top-0 left-0 w-full z-50 transition-all duration-300",
      isScrolled ? "bg-white shadow-md py-2" : "bg-white/90 backdrop-blur-sm py-4"
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group shrink-0">
            {settings.logo ? (
              <img
                src={settings.logo}
                alt="Logo"
                style={{ width: `${settings['logo-width'] || 150}px` }}
                className="h-auto object-contain"
              />
            ) : (
              <>
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl group-hover:bg-blue-700 transition-colors">
                  C
                </div>
                <div className="hidden sm:block">
                  <span className="text-xl font-bold text-blue-900 block leading-tight">Carmelita</span>
                  <span className="text-xs uppercase tracking-widest text-blue-600 font-semibold">Del Norte</span>
                </div>
              </>
            )}
          </Link>

          {/* Desktop Search */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              <input
                ref={desktopInputRef}
                type="text"
                placeholder="Buscar productos, códigos, marcas..."
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                className="w-full bg-slate-100 border-2 border-transparent rounded-full py-2.5 px-10 focus:ring-0 focus:border-blue-400 focus:bg-white text-sm transition-all outline-none"
              />
              {/* Botón limpiar búsqueda */}
              <AnimatePresence>
                {inputValue && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.6 }}
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-slate-300 hover:bg-blue-500 hover:text-white text-slate-600 transition-all"
                  >
                    <X className="w-3 h-3" />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Desktop Right Nav */}
          <div className="hidden md:flex items-center gap-6">
            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase text-slate-500 font-bold">Llámanos</span>
              <div className="flex items-center gap-1 text-blue-900 font-bold">
                <Phone className="w-3 h-3" />
                <span>{settings.whatsapp || settings.phone || '+51 987 654 321'}</span>
              </div>
            </div>

            <button className="relative group">
              <User className="w-6 h-6 text-slate-700 group-hover:text-blue-600 transition-colors" />
            </button>

            <button onClick={() => setIsCartOpen(true)} className="relative group">
              <ShoppingCart className="w-6 h-6 text-slate-700 group-hover:text-blue-600 transition-colors" />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center animate-in zoom-in">
                  {cartCount}
                </span>
              )}
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-slate-700 hover:text-blue-600 transition-colors"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Categories Bar (Desktop) */}
        <div className="hidden md:flex items-center gap-8 mt-4 pt-4 border-t border-slate-100">
          <Link to="/" className={cn("text-sm font-semibold hover:text-blue-600", location.pathname === '/' ? "text-blue-600" : "text-slate-600")}>Inicio</Link>
          <Link to="/nosotros" className="text-sm font-semibold text-slate-600 hover:text-blue-600">Nosotros</Link>
          <Link to="/contact" className="text-sm font-semibold text-slate-600 hover:text-blue-600">Contacto</Link>
          <Link to="/sucursales" className="text-sm font-semibold text-slate-600 hover:text-blue-600">Sucursales</Link>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-t border-slate-100 overflow-hidden"
          >
            <div className="px-4 py-6 space-y-4">

              {/* Mobile Search — ahora conectado */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar productos, códigos, marcas..."
                  value={mobileInput}
                  onChange={e => setMobileInput(e.target.value)}
                  className="w-full bg-slate-100 border-2 border-transparent rounded-lg py-2.5 px-10 text-sm outline-none focus:border-blue-400 focus:bg-white transition-all"
                />
                {mobileInput && (
                  <button
                    onClick={() => setMobileInput('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-slate-300 text-slate-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="space-y-4 font-bold text-slate-800">
                <Link to="/" onClick={() => setIsOpen(false)} className="block py-2 border-b border-slate-50">Inicio</Link>
                <Link to="/nosotros" onClick={() => setIsOpen(false)} className="block py-2 border-b border-slate-50">Nosotros</Link>
                <Link to="/contact" onClick={() => setIsOpen(false)} className="block py-2 border-b border-slate-50">Contacto</Link>
                <Link to="/sucursales" onClick={() => setIsOpen(false)} className="block py-2 border-b border-slate-50">Sucursales</Link>
              </div>

              <div className="pt-4 flex items-center gap-4 border-t border-slate-100">
                <div className="flex-1 bg-blue-600 text-white text-center py-3 rounded-lg font-bold">
                  Ingresar
                </div>
                <button
                  onClick={() => { setIsOpen(false); setIsCartOpen(true); }}
                  className="p-3 bg-slate-100 rounded-lg relative"
                >
                  <ShoppingCart className="w-5 h-5 text-slate-700" />
                  {cartCount > 0 && (
                    <span className="absolute top-0 right-0 bg-red-500 text-white text-[8px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                      {cartCount}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
