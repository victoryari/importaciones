import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ShoppingCart, Heart, Eye, SearchX, X, ChevronRight, Loader2, CheckCircle2, Box, Layers } from 'lucide-react';
import ProductCard from './ProductCard';
import { cn, calculateTotalUnitsPerPackage } from '../lib/utils';
import { PRODUCTS as STATIC_PRODUCTS } from '../constants';
import { motion, AnimatePresence } from 'motion/react';
import { useCart } from '../context/CartContext';

interface Product {
  id: string | number;
  name: string;
  code?: string;
  price: number;
  salePrice?: number;
  image: string;
  category: string;
  images?: string[];
  isActive?: boolean;
  showInWeb?: boolean;
  brand?: { name: string };
  unit?: { name?: string; symbol?: string };
  package?: { name?: string; symbol?: string };
  subPackage?: { name?: string; symbol?: string };
  quantityPerPackage?: number;
  quantityPerSubPackage?: number;
  description?: string;
  features?: string;
  weight?: number;
  volume?: number;
}

interface ProductGridProps {
  forceCategory?: string;
  limit?: number;
  maxPrice?: number;
  hideHeader?: boolean;
}

/** Mapea un producto de la API al formato del componente */
function mapProduct(p: any): Product {
  return {
    ...p,
    price: Number(p.salePrice) || Number(p.price) || 0,
    image: p.images?.[0] || 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=1000&auto=format&fit=crop',
    category: p.category?.name || 'Varios',
  };
}

export default function ProductGrid({ forceCategory, limit, maxPrice, hideHeader }: ProductGridProps) {
  const [products, setProducts]           = useState<Product[]>([]);
  const [isLoading, setIsLoading]         = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [favorites, setFavorites]         = useState<(string | number)[]>([]);
  const [cols, setCols]                   = useState(3);

  const [searchParams] = useSearchParams();
  const { addToCart }  = useCart();
  const navigate       = useNavigate();

  // Parámetros de búsqueda desde la URL
  const searchQuery    = searchParams.get('search') || '';
  const categoryParam  = searchParams.get('category') || '';

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery)                     params.set('search', searchQuery);
      if (forceCategory || categoryParam)  params.set('category', forceCategory || categoryParam);
      if (limit)                           params.set('limit', String(limit));

      const res  = await fetch(`/api/products?${params.toString()}`);
      const data = await res.json();

      if (Array.isArray(data) && data.length > 0) {
        setProducts(data.map(mapProduct));
      } else if (!searchQuery) {
        setProducts(STATIC_PRODUCTS.map(mapProduct));
      } else {
        setProducts([]);
      }
    } catch {
      setProducts(STATIC_PRODUCTS.map(mapProduct));
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, forceCategory, categoryParam, limit]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        const val = parseInt(data.products_per_page, 10);
        if (val >= 2 && val <= 6) setCols(val);
      })
      .catch(() => {});
  }, []);

  const displayedProducts = maxPrice
    ? products.filter(p => Number(p.price) <= maxPrice)
    : products;

  const toggleFavorite = (id: string | number) => {
    setFavorites(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const renderFormattedText = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    return (
      <div className="space-y-3">
        {lines.map((line, idx) => {
          const isListItem = line.startsWith('-') || line.startsWith('*') || line.startsWith('•');
          const cleanLine = isListItem ? line.substring(1).trim() : line;
          
          if (isListItem) {
            return (
              <div key={idx} className="flex gap-3 items-start group">
                <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                <p className="text-slate-600 leading-relaxed text-sm font-medium">
                  {cleanLine}
                </p>
              </div>
            );
          }
          
          return (
            <p key={idx} className="text-slate-500 leading-relaxed text-sm font-medium">
              {line}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <section className="py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4">
        {!hideHeader && (
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">
              {searchQuery ? `Resultados para "${searchQuery}"` : 'Nuestros Productos'}
            </h2>
            <div className="h-1.5 w-24 bg-blue-600 mx-auto rounded-full" />
            {!searchQuery && (
              <p className="mt-6 text-slate-500 max-w-2xl mx-auto font-medium">
                Selección exclusiva de productos premium diseñados para superar tus expectativas en cada detalle.
              </p>
            )}
          </div>
        )}

        {/* Estado de carga */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4 text-slate-400">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
            <p className="font-bold text-sm uppercase tracking-widest">Buscando productos...</p>
          </div>
        ) : (
          <div className={`grid grid-cols-1 sm:grid-cols-2 gap-8 ${cols === 2 ? 'lg:grid-cols-2' : cols === 3 ? 'lg:grid-cols-3' : cols === 4 ? 'lg:grid-cols-4' : cols === 5 ? 'lg:grid-cols-5' : cols === 6 ? 'lg:grid-cols-6' : 'lg:grid-cols-3'}`}>
            <AnimatePresence mode="popLayout">
              {displayedProducts.length > 0 ? (
                displayedProducts.map((product, index) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    index={index}
                    isFavorite={favorites.includes(product.id)}
                    onToggleFavorite={toggleFavorite}
                    onOpenQuickView={setSelectedProduct}
                  />
                ))
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="col-span-full flex flex-col items-center justify-center py-20 text-center space-y-4"
                >
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center">
                    <SearchX className="w-10 h-10 text-slate-300" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">
                      {searchQuery
                        ? `Sin resultados para "${searchQuery}"`
                        : 'No encontramos resultados'}
                    </h3>
                    <p className="text-slate-500 mt-1">
                      {searchQuery
                        ? 'Prueba con otro término, código o marca.'
                        : 'Intenta con otros términos o explora nuestras categorías.'}
                    </p>
                  </div>
                  {searchQuery && (
                    <button
                      onClick={() => navigate('/products')}
                      className="mt-2 px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors text-sm"
                    >
                      Ver todos los productos
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Modal de vista rápida actualizado */}
        <AnimatePresence>
          {selectedProduct && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white rounded-4xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl relative flex flex-col md:flex-row"
              >
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="absolute top-6 right-6 z-10 p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-slate-600" />
                </button>

                <div className="md:w-1/2 bg-white p-12 flex items-center justify-center border-r border-slate-50">
                  <img
                    src={selectedProduct.image}
                    alt={selectedProduct.name}
                    className="max-w-full max-h-full object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-500"
                  />
                </div>

                <div className="md:w-1/2 p-12 overflow-y-auto">
                  <div className="space-y-6">
                    <div>
                      <span className="text-xs font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full">
                        {selectedProduct.category}
                      </span>
                      {selectedProduct.code && (
                        <span className="ml-3 text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-1 rounded-full uppercase tracking-tighter">
                          {selectedProduct.code}
                        </span>
                      )}
                      <h2 className="text-3xl font-black text-slate-900 mt-4 leading-tight">
                        {selectedProduct.name}
                      </h2>
                      {selectedProduct.brand?.name && (
                        <p className="text-sm text-slate-500 font-medium mt-2 flex items-center gap-2">
                          Marca: <span className="font-bold text-slate-800">{selectedProduct.brand.name}</span>
                        </p>
                      )}
                      {(selectedProduct.package?.name || selectedProduct.subPackage?.name) && (
                        <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <Box className="w-3 h-3" />
                            Empaque
                          </p>
                          <div className="space-y-1">
                            {selectedProduct.package?.name && (
                              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                                <Box className="w-3.5 h-3.5 text-blue-500" />
                                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">1 {selectedProduct.package.name}</span>
                                <span className="text-slate-400">=</span>
                                <span className="text-blue-600">{selectedProduct.quantityPerPackage || 1}</span>
                                <span>{selectedProduct.subPackage?.name || selectedProduct.unit?.name || 'un.'}</span>
                              </div>
                            )}
                            {selectedProduct.subPackage?.name && (
                              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                                <Layers className="w-3.5 h-3.5 text-amber-500" />
                                <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded">1 {selectedProduct.subPackage.name}</span>
                                <span className="text-slate-400">=</span>
                                <span className="text-amber-600">{selectedProduct.quantityPerSubPackage || 1}</span>
                                <span>{selectedProduct.unit?.name || 'un.'}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2 pt-1 border-t border-slate-200 mt-1">
                              <span className="text-[10px] font-black text-emerald-600">Total:</span>
                              <span className="text-xs font-black text-emerald-600">
                                1 {selectedProduct.package?.name || selectedProduct.subPackage?.name || 'empaque'} = {calculateTotalUnitsPerPackage({ quantityPerPackage: selectedProduct.quantityPerPackage, quantityPerSubPackage: selectedProduct.quantityPerSubPackage })} {selectedProduct.unit?.name || 'un.'}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                      {(selectedProduct.weight || selectedProduct.volume) && (
                        <div className="flex gap-4 mt-3">
                          {selectedProduct.weight && (
                            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                              Peso: {Number(selectedProduct.weight).toFixed(4)} kg
                            </span>
                          )}
                          {selectedProduct.volume && (
                            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                              Volumen: {Number(selectedProduct.volume).toFixed(4)} m³
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-baseline gap-4 py-4 border-y border-slate-50">
                      <span className="text-4xl font-black text-blue-600">
                        S/ {Number(selectedProduct.price).toFixed(2)}
                      </span>
                      <span className="text-xl text-slate-300 line-through font-bold">
                        S/ {(Number(selectedProduct.price) * 1.2).toFixed(2)}
                      </span>
                    </div>

                    <div className="space-y-8">
                      <div>
                        <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                          <div className="w-4 h-1 bg-blue-600 rounded-full" />
                          Descripción
                        </p>
                        {renderFormattedText(selectedProduct.description || 'Este producto premium ha sido seleccionado por su excelente calidad y diseño superior.')}
                      </div>
                      
                      {selectedProduct.features && (
                        <div>
                          <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                            <div className="w-4 h-1 bg-blue-600 rounded-full" />
                            Características Clave
                          </p>
                          {renderFormattedText(selectedProduct.features)}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-4 pt-8">
                      <button
                        onClick={() => { addToCart(selectedProduct); setSelectedProduct(null); }}
                        className="flex-1 flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-blue-200 active:scale-95"
                      >
                        <ShoppingCart className="w-5 h-5" />
                        Añadir al Carrito
                      </button>
                      <button
                        onClick={() => toggleFavorite(selectedProduct.id)}
                        className={cn(
                          "p-4 rounded-2xl transition-all border-2",
                          favorites.includes(selectedProduct.id)
                            ? "bg-red-50 border-red-200 text-red-500"
                            : "bg-slate-50 border-slate-100 text-slate-400 hover:text-red-500"
                        )}
                      >
                        <Heart className={cn("w-6 h-6", favorites.includes(selectedProduct.id) && "fill-current")} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Botón "Ver catálogo completo" */}
        {limit && (
          <div className="mt-16 text-center">
            <button
              onClick={() => navigate('/products')}
              className="inline-flex items-center gap-4 bg-slate-900 text-white font-black py-5 px-12 rounded-4xl hover:bg-blue-600 transition-all group shadow-xl shadow-slate-200 hover:shadow-blue-200"
            >
              Ver Catálogo Completo
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ChevronRight className="w-5 h-5 text-white" />
              </div>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
