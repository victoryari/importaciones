import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ShoppingCart, Heart, Eye, SearchX, X, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { PRODUCTS as STATIC_PRODUCTS } from '../constants';
import { motion, AnimatePresence } from 'motion/react';
import { useCart } from '../context/CartContext';

interface Product {
  id: string | number;
  name: string;
  price: number;
  salePrice?: number;
  image: string;
  category: string;
  images?: string[];
  isActive?: boolean;
  brand?: { name: string };
  unit?: { symbol: string };
  description?: string;
  features?: string;
}

export default function ProductGrid({ forceCategory, limit, maxPrice }: { forceCategory?: string; limit?: number; maxPrice?: number }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchParams] = useSearchParams();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  
  const searchQuery = searchParams.get('search')?.toLowerCase() || '';

  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          // Filter active products only
          const visibleOnes = data.filter((p: any) => p.isActive !== false && p.showInWeb !== false);
          const mapped = visibleOnes.map((p: any) => ({
            ...p,
            // Ensure price is set from salePrice if available and parsed correctly
            price: Number(p.salePrice) || Number(p.price) || 0,
            image: p.images?.[0] || 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=1000&auto=format&fit=crop',
            category: p.category?.name || 'Varios'
          }));
          setProducts(mapped);
        } else {
          setProducts(STATIC_PRODUCTS);
        }
      })
      .catch(() => setProducts(STATIC_PRODUCTS));
  }, []);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [favorites, setFavorites] = useState<(string | number)[]>([]);

  const toggleFavorite = (id: string | number) => {
    setFavorites(prev => 
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const filteredProducts = products.filter(p => {
    let matchesSearch = p.name.toLowerCase().includes(searchQuery) || 
                         p.category.toLowerCase().includes(searchQuery);
    
    if (forceCategory) {
      matchesSearch = matchesSearch && p.category.toLowerCase() === forceCategory.toLowerCase();
    }

    if (maxPrice) {
      matchesSearch = matchesSearch && Number(p.price) <= maxPrice;
    }
    
    return matchesSearch;
  });

  // Apply limit if provided
  const displayedProducts = limit ? filteredProducts.slice(0, limit) : filteredProducts;

  return (
    <section className="py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Nuestros Productos</h2>
          <div className="h-1.5 w-24 bg-blue-600 mx-auto rounded-full" />
          <p className="mt-6 text-slate-500 max-w-2xl mx-auto font-medium">
            Selección exclusiva de productos premium diseñados para superar tus expectativas en cada detalle.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <AnimatePresence>
            {displayedProducts.length > 0 ? (
              displayedProducts.map((product, index) => (
                <motion.div
                  key={product.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                  className="group bg-white rounded-4xl overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 border border-slate-100 flex flex-col"
                >
                  <div className="relative aspect-4/5 overflow-hidden bg-white p-2 flex items-center justify-center">
                    <img 
                      src={product.image} 
                      alt={product.name}
                      className="max-w-full max-h-full object-contain transition-transform duration-700 group-hover:scale-110"
                    />
                    
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <button 
                        onClick={() => toggleFavorite(product.id)}
                        className={cn(
                          "p-3 rounded-full transition-all transform translate-y-4 group-hover:translate-y-0 duration-300",
                          favorites.includes(product.id) ? "bg-red-500 text-white" : "bg-white text-slate-900 hover:bg-red-500 hover:text-white"
                        )}
                      >
                        <Heart className={cn("w-5 h-5", favorites.includes(product.id) && "fill-current")} />
                      </button>
                      <button 
                        onClick={() => setSelectedProduct(product)}
                        className="p-3 bg-white rounded-full text-slate-900 hover:bg-blue-600 hover:text-white transition-all transform translate-y-4 group-hover:translate-y-0 duration-300 delay-75"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="absolute top-4 left-4 bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                      Nuevo
                    </div>
                  </div>

                  <div className="p-6">
                    <span className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1 block">
                      {product.brand?.name || product.category}
                    </span>
                    <h3 className="text-lg font-bold text-slate-800 mb-1 truncate">
                      {product.name}
                    </h3>
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-50">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 line-through">S/ {(Number(product.price) * 1.2).toFixed(2)}</span>
                        <span className="text-xl font-black text-slate-900">S/ {Number(product.price).toFixed(2)}</span>
                      </div>
                      <button 
                        onClick={() => addToCart(product)}
                        className="flex items-center gap-2 bg-slate-900 hover:bg-blue-600 text-white font-bold py-2.5 px-4 rounded-xl transition-all text-xs shadow-md shadow-slate-100"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        Añadir
                      </button>
                    </div>
                  </div>
                </motion.div>
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
                  <h3 className="text-xl font-bold text-slate-800">No encontramos resultados</h3>
                  <p className="text-slate-500">Intenta con otros términos o explora nuestras categorías.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

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

                <div className="md:w-1/2 bg-slate-50 p-12 flex items-center justify-center">
                  <img 
                    src={selectedProduct.image} 
                    alt={selectedProduct.name} 
                    className="max-w-full max-h-full object-contain drop-shadow-2xl"
                  />
                </div>

                <div className="md:w-1/2 p-12 overflow-y-auto">
                  <div className="space-y-6">
                    <div>
                      <span className="text-sm font-black text-blue-600 uppercase tracking-widest">{selectedProduct.category}</span>
                      <h2 className="text-4xl font-black text-slate-900 mt-2">{selectedProduct.name}</h2>
                    </div>

                    <div className="flex items-baseline gap-4">
                      <span className="text-4xl font-black text-blue-600">S/ {Number(selectedProduct.price).toFixed(2)}</span>
                      <span className="text-xl text-slate-300 line-through">S/ {(Number(selectedProduct.price) * 1.2).toFixed(2)}</span>
                    </div>

                    <div className="space-y-4 pt-6 border-t border-slate-100">
                      <div className="flex items-center gap-4 text-slate-600">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                          <Eye className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Estado</p>
                          <p className="font-bold">Stock Disponible</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 pt-6">
                      <h4 className="font-bold text-slate-900 uppercase tracking-widest text-xs">Descripción</h4>
                      <p className="text-slate-500 leading-relaxed font-medium italic">
                        {selectedProduct.description || "Este producto premium ha sido seleccionado por su excelente calidad y diseño superior."}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 pt-10">
                      <button 
                        onClick={() => { addToCart(selectedProduct); setSelectedProduct(null); }}
                        className="flex-1 flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-blue-200"
                      >
                        <ShoppingCart className="w-5 h-5" />
                        Añadir al Carrito
                      </button>
                      <button 
                        onClick={() => toggleFavorite(selectedProduct.id)}
                        className={cn(
                          "p-5 rounded-2xl transition-all border-2",
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

