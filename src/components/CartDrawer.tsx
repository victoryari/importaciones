import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShoppingBag, Plus, Minus, Trash2, MessageCircle } from 'lucide-react';
import { useCart } from '../context/CartContext';

export default function CartDrawer() {
  const { items, isOpen, setIsOpen, updateQuantity, removeFromCart, clearCart, total, cartCount } = useCart();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState("51987654321");
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    city: '',
    address: '',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(settings => {
        if (settings.whatsapp) setWhatsappNumber(settings.whatsapp);
      });
  }, []);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: formData.name,
          customerPhone: formData.phone,
          customerCity: formData.city,
          customerAddress: formData.address,
          notes: formData.notes,
          items: items.map(item => ({
            productId: parseInt(item.id.toString()),
            quantity: item.quantity,
            price: item.price
          })),
          totalAmount: total
        })
      });

      if (!response.ok) throw new Error('Error al guardar el pedido');
      
      const order = await response.json();

      // Open WhatsApp
      const message = encodeURIComponent(
        `¡Hola Carmelita del Norte! 👋\n\n` +
        `He realizado un nuevo pedido *#${order.id}* desde la web:\n\n` +
        `👤 *Cliente:* ${formData.name}\n` +
        `📞 *Teléfono:* ${formData.phone}\n` +
        `📍 *Ciudad:* ${formData.city}\n\n` +
        `📦 *Detalle del Pedido:*\n` +
        items.map(i => `• ${i.quantity}x ${i.name} - S/ ${(i.price * i.quantity).toFixed(2)}`).join('\n') +
        `\n\n💰 *Total: S/ ${total.toFixed(2)}*\n\n¿Podrían confirmarme la disponibilidad y métodos de pago? ¡Gracias!`
      );
      
      window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');
      
      // Reset cart and close drawer
      setIsOpen(false);
      setIsCheckingOut(false);
      setFormData({ name: '', phone: '', city: '', address: '', notes: '' });
      clearCart();
      
    } catch (error) {
      alert('Hubo un error al procesar tu pedido. Por favor, intenta de nuevo.');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-100"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-101 flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-blue-900 text-white">
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-6 h-6" />
                <div>
                  <h2 className="font-black text-xl">Tu Carrito</h2>
                  <p className="text-xs text-blue-300 font-bold uppercase tracking-widest">{cartCount} Artículos</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setIsOpen(false);
                  setIsCheckingOut(false);
                }}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center">
                    <ShoppingBag className="w-10 h-10 text-slate-300" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Tu carrito está vacío</h3>
                    <p className="text-sm text-slate-500">¡Explora nuestros productos y llena tu cocina de calidad!</p>
                  </div>
                  <button 
                    onClick={() => setIsOpen(false)}
                    className="bg-blue-600 text-white px-8 py-3 rounded-full font-bold hover:bg-blue-700 transition-colors"
                  >
                    Ver Productos
                  </button>
                </div>
              ) : isCheckingOut ? (
                <div className="space-y-6">
                  <button 
                    onClick={() => setIsCheckingOut(false)}
                    className="text-blue-600 text-sm font-bold flex items-center gap-2"
                  >
                    ← Volver al carrito
                  </button>
                  <form id="checkout-form" onSubmit={handleCheckout} className="space-y-4">
                    <h3 className="text-xl font-black text-slate-900">Datos de Contacto</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Nombre Completo</label>
                        <input 
                          required
                          type="text"
                          value={formData.name}
                          onChange={e => setFormData({...formData, name: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-colors"
                          placeholder="Juan Pérez"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Teléfono / WhatsApp</label>
                        <input 
                          required
                          type="tel"
                          value={formData.phone}
                          onChange={e => setFormData({...formData, phone: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-colors"
                          placeholder="987654321"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Ciudad</label>
                        <input 
                          required
                          type="text"
                          value={formData.city}
                          onChange={e => setFormData({...formData, city: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-colors"
                          placeholder="Chiclayo"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Dirección (Opcional)</label>
                        <input 
                          type="text"
                          value={formData.address}
                          onChange={e => setFormData({...formData, address: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-colors"
                          placeholder="Av. Las Américas 123"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Notas Adicionales</label>
                        <textarea 
                          value={formData.notes}
                          onChange={e => setFormData({...formData, notes: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-colors h-24 resize-none"
                          placeholder="Ej: Tocar el timbre fuerte"
                        />
                      </div>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="space-y-6">
                  {items.map((item) => (
                    <motion.div 
                      layout
                      key={item.id} 
                      className="flex gap-4 group"
                    >
                      <div className="w-20 h-20 bg-slate-50 rounded-2xl overflow-hidden border border-slate-100 shrink-0">
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex justify-between gap-2">
                          <h4 className="font-bold text-slate-900 leading-tight">{item.name}</h4>
                          <span className="font-black text-blue-600">S/ {item.price.toFixed(2)}</span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center bg-slate-100 rounded-full p-1">
                            <button 
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="p-1 hover:bg-white rounded-full transition-colors shadow-sm"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-8 text-center text-xs font-black">{item.quantity}</span>
                            <button 
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="p-1 hover:bg-white rounded-full transition-colors shadow-sm"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <button 
                            onClick={() => removeFromCart(item.id)}
                            className="text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div className="p-6 border-t border-slate-100 bg-slate-50 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-bold uppercase text-xs tracking-widest">Total del Pedido</span>
                  <span className="text-2xl font-black text-slate-900">S/ {total.toFixed(2)}</span>
                </div>
                
                {isCheckingOut ? (
                  <button 
                    form="checkout-form"
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-[#25D366] hover:bg-[#20bd5c] text-white font-black py-4 rounded-2xl shadow-xl shadow-green-100 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <MessageCircle className="w-6 h-6 fill-white" />
                    {isSubmitting ? 'Procesando...' : 'Confirmar y Enviar WhatsApp'}
                  </button>
                ) : (
                  <button 
                    onClick={() => setIsCheckingOut(true)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-100 transition-all"
                  >
                    Confirmar Pedido
                  </button>
                )}
                
                <p className="text-[10px] text-center text-slate-400 font-medium px-4">
                  {isCheckingOut 
                    ? 'Tus datos se guardarán en nuestro sistema y luego serás redirigido a WhatsApp.' 
                    : 'Añade más productos o confirma tu pedido para coordinar la entrega.'}
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
