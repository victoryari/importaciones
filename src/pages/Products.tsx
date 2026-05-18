import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductGrid from '../components/ProductGrid';
import { Filter, ChevronRight, X } from 'lucide-react';
import { cn } from '../lib/utils';

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories]     = useState<any[]>([]);
  const [priceRange, setPriceRange]     = useState<number>(2000);

  const selectedCategory = searchParams.get('category') || '';

  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(setCategories).catch(() => {});
  }, []);

  const handleCategorySelect = (slug: string) => {
    const newSlug = selectedCategory === slug ? '' : slug;
    const newParams = new URLSearchParams(searchParams);
    if (newSlug) {
      newParams.set('category', newSlug);
    } else {
      newParams.delete('category');
    }
    setSearchParams(newParams);
  };

  const clearSearch = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('search');
    setSearchParams(newParams);
  };

  const activeSearch = searchParams.get('search') || '';

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="bg-blue-900 pt-28 pb-12 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
        </div>
        <div className="max-w-7xl mx-auto px-4 relative z-10 text-center">
          <h1 className="text-3xl md:text-5xl font-black mb-4">Nuestro Catálogo</h1>
          <p className="text-lg text-blue-100 max-w-xl mx-auto font-medium">
            Explora nuestra colección completa de productos premium con los mejores precios del mercado.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex flex-col lg:flex-row gap-12">

          {/* Sidebar */}
          <aside className="lg:w-1/4 space-y-10 hidden lg:block">
            <div>
              <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2 uppercase tracking-widest">
                <Filter className="w-5 h-5 text-blue-600" /> Categorías
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => handleCategorySelect('')}
                  className={cn(
                    "w-full text-left px-5 py-3 rounded-2xl font-bold transition-all border-2",
                    !selectedCategory
                      ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200"
                      : "bg-white border-transparent text-slate-500 hover:bg-slate-100"
                  )}
                >
                  Todas las Categorías
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleCategorySelect(cat.slug)}
                    className={cn(
                      "w-full text-left px-5 py-3 rounded-2xl font-bold transition-all border-2 flex justify-between items-center",
                      selectedCategory === cat.slug
                        ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200"
                        : "bg-white border-transparent text-slate-500 hover:bg-slate-100"
                    )}
                  >
                    {cat.name}
                    <span className={cn(
                      "text-[10px] font-black px-2 py-1 rounded-lg",
                      selectedCategory === cat.slug ? "bg-blue-50 text-white" : "bg-slate-100 text-slate-400"
                    )}>
                      {cat._count?.products || 0}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Rango de precio */}
            <div className="p-6 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm">
              <h4 className="font-black text-slate-900 mb-4 uppercase tracking-widest text-xs flex items-center gap-2">
                <Filter className="w-4 h-4 text-blue-600" />
                Precio Máximo
              </h4>
              <input
                type="range"
                min={50}
                max={5000}
                step={50}
                value={priceRange}
                onChange={e => setPriceRange(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between mt-2 text-xs font-bold text-slate-400">
                <span>S/ 50</span>
                <span className="text-blue-600 text-sm">S/ {priceRange.toLocaleString()}</span>
                <span>S/ 5,000</span>
              </div>
            </div>

            <div className="p-6 bg-blue-50 rounded-[2.5rem] border border-blue-100">
              <h4 className="font-black text-blue-900 mb-2">¿Necesitas ayuda?</h4>
              <p className="text-sm text-blue-700 font-medium leading-relaxed">
                Nuestros asesores están listos para ayudarte a encontrar el producto ideal.
              </p>
              <button className="mt-4 w-full bg-blue-600 text-white font-black py-3 rounded-2xl hover:bg-blue-700 transition-colors">
                Contactar Asesor
              </button>
            </div>
          </aside>

          {/* Main Content */}
          <main className="lg:w-3/4">
            {/* Breadcrumb + filtros activos */}
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-slate-400 font-bold uppercase tracking-widest text-xs flex-wrap">
                <span>Catálogo</span>
                {selectedCategory && (
                  <>
                    <ChevronRight className="w-4 h-4" />
                    <span className="text-slate-900">{selectedCategory}</span>
                  </>
                )}
                {activeSearch && (
                  <>
                    <ChevronRight className="w-4 h-4" />
                    <span className="flex items-center gap-1.5 bg-blue-100 text-blue-700 px-3 py-1 rounded-full normal-case">
                      "{activeSearch}"
                      <button onClick={clearSearch} className="hover:text-blue-900">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  </>
                )}
                {!selectedCategory && !activeSearch && (
                  <span className="text-slate-900">Todos los Productos</span>
                )}
              </div>
            </div>

            <ProductGrid forceCategory={selectedCategory} maxPrice={priceRange} hideHeader />
          </main>
        </div>
      </div>
    </div>
  );
}
