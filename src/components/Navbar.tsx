import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, ShoppingCart, Menu, X, Phone, User, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useCart } from '../context/CartContext';

interface Category {
  id: number;
  name: string;
  slug: string;
}

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<any>({});
  const { cartCount, setIsOpen: setIsCartOpen } = useCart();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    
    // Fetch categories and settings
    fetch('/api/categories').then(res => res.json()).then(setCategories);
    fetch('/api/settings').then(res => res.json()).then(data => {
      setSettings(data);
    });

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={cn(
      "fixed top-0 left-0 w-full z-50 transition-all duration-300",
      isScrolled ? "bg-white shadow-md py-2" : "bg-white/90 backdrop-blur-sm py-4"
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
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
            <div className="relative w-full">
              <input 
                type="text" 
                placeholder="Buscar productos..."
                className="w-full bg-slate-100 border-none rounded-full py-2 px-10 focus:ring-2 focus:ring-blue-500 text-sm transition-all"
                onChange={(e) => {
                  const query = e.target.value;
                  const searchParams = new URLSearchParams(window.location.search);
                  if (query) {
                    searchParams.set('search', query);
                  } else {
                    searchParams.delete('search');
                  }
                  window.history.replaceState(null, '', `?${searchParams.toString()}`);
                  // Dispatch a custom event to notify other components
                  window.dispatchEvent(new Event('popstate'));
                }}
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
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

            <button 
              onClick={() => setIsCartOpen(true)}
              className="relative group"
            >
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

      {/* Mobile Menu (Overlay) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-t border-slate-100 overflow-hidden"
          >
            <div className="px-4 py-6 space-y-4">
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Buscar..."
                  className="w-full bg-slate-100 border-none rounded-lg py-2 px-10 text-sm"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
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
