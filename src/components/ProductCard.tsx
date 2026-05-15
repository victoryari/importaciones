import { Heart, Eye, ShoppingCart, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { useCart } from '../context/CartContext';

export interface Product {
  id: string | number;
  name: string;
  code?: string;
  price: number; // This is the base price (salePrice in DB)
  image: string;
  category: string;
  brand?: { name: string };
  isOnSale?: boolean;
  discountPercent?: number;
  images?: string[];
}

interface ProductCardProps {
  product: Product;
  index?: number;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string | number) => void;
  onOpenQuickView?: (product: any) => void;
}

export default function ProductCard({ 
  product, 
  index = 0, 
  isFavorite = false, 
  onToggleFavorite, 
  onOpenQuickView 
}: ProductCardProps) {
  const { addToCart } = useCart();

  // Cálculos de precio
  const basePrice = Number(product.price) || 0;
  const hasDiscount = product.isOnSale && product.discountPercent && product.discountPercent > 0;
  
  const finalPrice = hasDiscount 
    ? basePrice * (1 - (Number(product.discountPercent) / 100))
    : basePrice;

  // Precio tachado: si es oferta usamos el basePrice, sino usamos el hardcoded 1.2x que tenía el sitio original
  const originalPrice = hasDiscount 
    ? basePrice 
    : basePrice * 1.2;

  const formatPrice = (n: number) => n.toFixed(2);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: Math.min(index * 0.05, 0.3) }}
      className="group bg-white rounded-4xl overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 border border-slate-100 flex flex-col h-full"
    >
      <div className="relative aspect-4/5 overflow-hidden bg-white p-2 flex items-center justify-center">
        <img
          src={product.image}
          alt={product.name}
          className="max-w-full max-h-full object-contain transition-transform duration-700 group-hover:scale-110"
          loading="lazy"
        />

        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
          <button
            onClick={(e) => {
              e.preventDefault();
              onToggleFavorite?.(product.id);
            }}
            className={cn(
              "p-3 rounded-full transition-all transform translate-y-4 group-hover:translate-y-0 duration-300",
              isFavorite ? "bg-red-500 text-white" : "bg-white text-slate-900 hover:bg-red-500 hover:text-white"
            )}
          >
            <Heart className={cn("w-5 h-5", isFavorite && "fill-current")} />
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              onOpenQuickView?.(product);
            }}
            className="p-3 bg-white rounded-full text-slate-900 hover:bg-blue-600 hover:text-white transition-all transform translate-y-4 group-hover:translate-y-0 duration-300 delay-75"
          >
            <Eye className="w-5 h-5" />
          </button>
        </div>

        {/* Badge de Oferta o Nuevo */}
        {hasDiscount ? (
          <div className="absolute top-4 left-4 bg-red-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 animate-pulse">
            <Sparkles className="w-3 h-3" />
            -{product.discountPercent}% OFF
          </div>
        ) : (
          <div className="absolute top-4 left-4 bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            Nuevo
          </div>
        )}

        {/* Código de producto */}
        {product.code && (
          <div className="absolute bottom-3 right-3 bg-slate-900/70 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
            {product.code}
          </div>
        )}
      </div>

      <div className="p-6 flex flex-col flex-1">
        <span className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1 block">
          {product.brand?.name || product.category}
        </span>
        <h3 className="text-lg font-bold text-slate-800 mb-1 line-clamp-2 flex-1">
          {product.name}
        </h3>
        
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-50">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 line-through">
              S/ {formatPrice(originalPrice)}
            </span>
            <span className={cn(
              "text-xl font-black",
              hasDiscount ? "text-red-600" : "text-slate-900"
            )}>
              S/ {formatPrice(finalPrice)}
            </span>
          </div>
          <button
            onClick={() => addToCart({
              id: product.id,
              name: product.name,
              price: finalPrice,
              image: product.image,
              quantity: 1
            })}
            className="flex items-center gap-2 bg-slate-900 hover:bg-blue-600 text-white font-bold py-2.5 px-4 rounded-xl transition-all text-xs shadow-md shadow-slate-100 active:scale-95"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            Añadir
          </button>
        </div>
      </div>
    </motion.div>
  );
}
