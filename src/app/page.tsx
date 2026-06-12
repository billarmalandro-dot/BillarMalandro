"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Search, ShoppingBag, Plus, Minus, X, Check, Beer, Clock, ChefHat, CheckCircle, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import PromoCarousel, { Novedad } from "@/components/PromoCarousel";
import BottomDock from "@/components/BottomDock";
import Footer from "@/components/Footer";

interface Categoria {
  id_categoria: string;
  nombre: string;
}

interface Producto {
  id_producto: string;
  id_categoria: string;
  nombre: string;
  descripcion: string | null;
  imagen_url: string | null;
  precio_venta: number;
}

interface CartItem {
  producto: Producto;
  cantidad: number;
}

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  
  const [novedades, setNovedades] = useState<Novedad[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [tableNumber, setTableNumber] = useState("");
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [misPedidos, setMisPedidos] = useState<any[]>([]);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadData();
    // Restaurar carrito guardado si existe (ej. tras iniciar sesión)
    const savedCart = localStorage.getItem("billanga_cart");
    const savedTable = localStorage.getItem("billanga_table");
    if (savedCart) {
      try { setCart(JSON.parse(savedCart)); setIsCartOpen(true); } catch (e) {}
    }
    if (savedTable) {
      setTableNumber(savedTable);
    }

    const channel = supabase
      .channel('client-pedidos-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pedidos' },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Sincronizar la búsqueda del Navbar con el filtro del catálogo
  useEffect(() => {
    const syncSearch = () => {
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const q = params.get("q") || "";
        setSearchQuery(q);
      }
    };
    syncSearch();
    window.addEventListener("popstate", syncSearch);
    // Escuchar cambios de URL hechos por el Navbar (pushState)
    const originalPushState = history.pushState;
    history.pushState = function(...args) {
      originalPushState.apply(this, args);
      syncSearch();
    };
    return () => {
      window.removeEventListener("popstate", syncSearch);
      history.pushState = originalPushState;
    };
  }, []);

  useEffect(() => {
    const handleOpenCart = () => setIsCartOpen(true);
    window.addEventListener("open-cart", handleOpenCart);
    return () => window.removeEventListener("open-cart", handleOpenCart);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Cargar Novedades (Portada / Promos)
      const { data: novs } = await supabase
        .from("novedades")
        .select("*")
        .eq("activo", true)
        .order("publicado_en", { ascending: false });
      if (novs) setNovedades(novs);

      // Cargar Categorías
      const { data: cats } = await supabase.from("categorias").select("*").order("nombre");
      if (cats) setCategorias(cats);

      // Cargar Productos
      const { data: prods } = await supabase
        .from("productos")
        .select("id_producto, id_categoria, nombre, descripcion, imagen_url, precio_venta")
        .eq("activo", true)
        .order("nombre");
      if (prods) setProductos(prods);

      // Cargar mis pedidos de hoy
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: cliente } = await supabase.from("clientes").select("id_cliente").eq("auth_id", user.id).single();
        if (cliente) {
          const hoy = new Date();
          hoy.setHours(0,0,0,0);
          const { data: misPed } = await supabase
            .from("pedidos")
            .select(`*, pedido_items(cantidad, subtotal, productos(nombre, imagen_url))`)
            .eq("id_cliente", cliente.id_cliente)
            .gte("created_at", hoy.toISOString())
            .order("created_at", { ascending: false });
          if (misPed) setMisPedidos(misPed);
        }
      }

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (producto: Producto) => {
    setCart(prev => {
      const existing = prev.find(item => item.producto.id_producto === producto.id_producto);
      if (existing) {
        return prev.map(item => item.producto.id_producto === producto.id_producto ? { ...item, cantidad: item.cantidad + 1 } : item);
      }
      return [...prev, { producto, cantidad: 1 }];
    });
  };

  const removeFromCart = (id_producto: string) => {
    setCart(prev => prev.filter(item => item.producto.id_producto !== id_producto));
  };

  const updateQuantity = (id_producto: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.producto.id_producto === id_producto) {
        const newQty = item.cantidad + delta;
        return newQty > 0 ? { ...item, cantidad: newQty } : item;
      }
      return item;
    }));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.producto.precio_venta * item.cantidad), 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.cantidad, 0);

  const handleSendOrder = async () => {
    if (!tableNumber) { alert("Por favor, ingresa tu número de mesa."); return; }
    if (cart.length === 0) return;

    setIsOrdering(true);

    try {
      // 1. Verificar sesión
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Guardar progreso y redirigir
        localStorage.setItem("billanga_cart", JSON.stringify(cart));
        localStorage.setItem("billanga_table", tableNumber);
        router.push("/login?redirect=/");
        return;
      }

      // 2. Obtener id_cliente
      const { data: cliente } = await supabase.from("clientes").select("id_cliente").eq("auth_id", user.id).single();
      if (!cliente) throw new Error("No se encontró el perfil de cliente.");

      // 3. Obtener id_sucursal (asumimos la primera para la web por ahora)
      const { data: sucursal } = await supabase.from("sucursales").select("id_sucursal").limit(1).single();
      if (!sucursal) throw new Error("No hay sucursales activas.");

      // 4. Crear el Pedido
      const { data: nuevoPedido, error: pedidoError } = await supabase.from("pedidos").insert({
        id_cliente: cliente.id_cliente,
        id_sucursal: sucursal.id_sucursal,
        total: cartTotal,
        numero_mesa: tableNumber,
        tipo: 'online',
        estado: 'pendiente'
      }).select().single();

      if (pedidoError) throw pedidoError;

      // 5. Crear los Items
      const items = cart.map(item => ({
        id_pedido: nuevoPedido.id_pedido,
        id_producto: item.producto.id_producto,
        cantidad: item.cantidad,
        precio_unitario: item.producto.precio_venta
      }));

      const { error: itemsError } = await supabase.from("pedido_items").insert(items);
      if (itemsError) throw itemsError;

      // 6. Éxito
      localStorage.removeItem("billanga_cart");
      localStorage.removeItem("billanga_table");
      setIsOrdering(false);
      setOrderSuccess(true);
      setCart([]);
      setTimeout(() => {
        setOrderSuccess(false);
        setIsCartOpen(false);
      }, 3000);

    } catch (err: any) {
      alert("Error al procesar el pedido: " + err.message);
      setIsOrdering(false);
    }
  };

  const filteredProducts = productos.filter(p => {
    const matchesCategory = activeCategory === "all" || p.id_categoria === activeCategory;
    const matchesSearch = p.nombre.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-billanga-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] font-[family-name:var(--font-geist-sans)] text-white pb-32">
      {/* Navbar Superior (Mantiene perfil, logo y navegación) */}
      <Navbar hideMobileMenu={true} />

      {/* Portada / Carrusel de Promociones */}
      <div className="w-full mb-8">
        <PromoCarousel novedades={novedades} />
      </div>

      {/* Buscador Integrado (solo visible en móvil si no usa el Navbar) */}
      <div id="menu" className="px-4 pb-4">
        <div className="relative max-w-4xl mx-auto">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-billanga-gray" />
          <input 
            type="text" 
            placeholder="Buscar cerveza, snacks, poleras..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#1a1a1c] border border-[#2a2a2c] rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:border-billanga-primary shadow-lg transition-colors"
          />
        </div>
      </div>

      {/* Menú de Categorías (Scroll horizontal) */}
      <div className="px-4 pb-6 overflow-x-auto flex gap-2 scrollbar-hide max-w-4xl mx-auto">
        <button 
          onClick={() => setActiveCategory("all")}
          className={`px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all shadow-md ${
            activeCategory === "all" ? "bg-billanga-primary text-white" : "bg-[#1a1a1c] text-billanga-gray border border-[#2a2a2c] hover:bg-[#2a2a2c]"
          }`}
        >
          Todo
        </button>
        {categorias.map(cat => (
          <button 
            key={cat.id_categoria}
            onClick={() => setActiveCategory(cat.id_categoria)}
            className={`px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all shadow-md ${
              activeCategory === cat.id_categoria ? "bg-billanga-primary text-white" : "bg-[#1a1a1c] text-billanga-gray border border-[#2a2a2c] hover:bg-[#2a2a2c]"
            }`}
          >
            {cat.nombre}
          </button>
        ))}
      </div>

      {/* Cuadrícula de Productos */}
      <div className="px-4 max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        {filteredProducts.map(prod => (
          <div key={prod.id_producto} className="bg-[#1a1a1c] border border-[#2a2a2c] rounded-2xl overflow-hidden flex flex-col h-full hover:scale-[1.02] active:scale-95 transition-transform shadow-lg group">
            {/* Imagen del producto */}
            <div className="relative w-full aspect-square bg-[#121212] border-b border-[#2a2a2c] flex items-center justify-center p-4 overflow-hidden">
              {prod.imagen_url ? (
                <img src={prod.imagen_url} alt={prod.nombre} className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
              ) : (
                <Beer className="w-12 h-12 text-[#2a2a2c]" />
              )}
            </div>
            
            {/* Info y botón */}
            <div className="p-3.5 flex flex-col flex-1">
              <h3 className="font-bold text-sm text-white line-clamp-2 leading-tight">{prod.nombre}</h3>
              {prod.descripcion && (
                <p className="text-[11px] text-billanga-gray mt-1.5 line-clamp-2">{prod.descripcion}</p>
              )}
              
              <div className="mt-auto pt-4 flex flex-col gap-2.5">
                <span className="font-black text-billanga-primary text-[15px]">Bs. {Number(prod.precio_venta).toFixed(2)}</span>
                <button 
                  onClick={() => addToCart(prod)}
                  className="w-full py-2.5 bg-[#2a2a2c] hover:bg-billanga-primary hover:border-billanga-primary text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1 border border-white/5 shadow-md"
                >
                  <Plus className="w-3.5 h-3.5" /> Agregar
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredProducts.length === 0 && (
          <div className="col-span-full py-16 text-center text-billanga-gray text-sm">
            No se encontraron productos que coincidan con la búsqueda.
          </div>
        )}
      </div>

      {/* Floating Checkout Button (Sticky en la parte inferior) */}
      {(cart.length > 0 || misPedidos.length > 0) && !isCartOpen && (
        <div className="fixed bottom-28 md:bottom-6 left-0 w-full px-4 z-40 flex justify-center animate-in slide-in-from-bottom-10 fade-in duration-300">
          <button 
            onClick={() => setIsCartOpen(true)}
            className="w-full max-w-sm bg-billanga-primary hover:bg-billanga-primary-dark text-white rounded-2xl p-4 flex items-center justify-between shadow-[0_10px_30px_rgba(220, 38, 38,0.4)] transition-transform hover:scale-105 active:scale-95"
          >
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-xl relative">
                <ShoppingBag className="w-6 h-6" />
                {(cartItemCount > 0 || misPedidos.length > 0) && (
                  <span className="absolute -top-2 -right-2 bg-white text-billanga-primary w-5 h-5 rounded-full text-xs font-black flex items-center justify-center shadow-sm">
                    {cart.length > 0 ? cartItemCount : misPedidos.length}
                  </span>
                )}
                {misPedidos.some(p => p.estado === 'pendiente' || p.estado === 'preparacion' || p.estado === 'listo') && (
                  <span className="absolute -top-2 -left-2 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-yellow-500 border-2 border-billanga-primary"></span>
                  </span>
                )}
              </div>
              <span className="font-bold text-left leading-tight">
                {cart.length > 0 ? <><span className="text-xs">Ver tu</span><br/>Pedido</> : <><span className="text-xs">Ver tus</span><br/>Pedidos Activos</>}
              </span>
            </div>
            {cart.length > 0 && (
              <span className="font-black text-xl">
                Bs. {cartTotal.toFixed(2)}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Carrito Overlay Modals */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col justify-end md:items-center md:justify-center">
          <div className="bg-[#121212] w-full md:max-w-md md:rounded-3xl h-[85vh] md:h-[80vh] rounded-t-3xl border-t md:border border-[#2a2a2c] flex flex-col animate-in slide-in-from-bottom-full duration-300 shadow-2xl">
            
            {/* Header del carrito */}
            <div className="p-5 border-b border-[#2a2a2c] flex justify-between items-center bg-[#1a1a1c] rounded-t-3xl">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-billanga-primary" />
                Tu Pedido
              </h2>
              <button onClick={() => setIsCartOpen(false)} className="p-2 bg-black/40 hover:bg-[#2a2a2c] rounded-full text-billanga-gray transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Items del carrito */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
              {orderSuccess ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-4 animate-in fade-in zoom-in">
                  <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center">
                    <Check className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-black text-white uppercase italic">¡Pedido Enviado!</h3>
                  <p className="text-billanga-gray text-sm px-6">Tu pedido ha sido enviado a la barra. Puedes ver su estado en tus Pedidos Activos.</p>
                </div>
              ) : (
                <>
                  {/* Sección Carrito Actual */}
                  {cart.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold text-billanga-gray uppercase tracking-wider px-1">En el carrito</h3>
                      {cart.map(item => (
                        <div key={item.producto.id_producto} className="flex gap-3 bg-[#1a1a1c] border border-[#2a2a2c] p-3 rounded-2xl items-center shadow-sm">
                          <div className="w-16 h-16 bg-black rounded-xl flex-shrink-0 relative overflow-hidden flex items-center justify-center">
                            {item.producto.imagen_url ? (
                              <img src={item.producto.imagen_url} alt={item.producto.nombre} className="absolute inset-0 w-full h-full object-cover" />
                            ) : (
                              <Beer className="w-6 h-6 text-billanga-gray" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-sm text-white truncate">{item.producto.nombre}</h4>
                            <p className="font-bold text-billanga-primary text-xs mt-1">Bs. {Number(item.producto.precio_venta).toFixed(2)}</p>
                          </div>
                          <div className="flex flex-col items-center justify-between gap-2">
                            <div className="flex items-center gap-3 bg-black border border-[#2a2a2c] rounded-lg p-1">
                              <button onClick={() => updateQuantity(item.producto.id_producto, -1)} className="w-6 h-6 flex items-center justify-center text-white bg-[#2a2a2c] rounded-md hover:bg-billanga-primary transition-colors"><Minus className="w-3 h-3" /></button>
                              <span className="font-bold text-sm w-4 text-center">{item.cantidad}</span>
                              <button onClick={() => updateQuantity(item.producto.id_producto, 1)} className="w-6 h-6 flex items-center justify-center text-white bg-billanga-primary rounded-md hover:bg-[#b81d24] transition-colors"><Plus className="w-3 h-3" /></button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Sección Mis Pedidos Activos */}
                  {misPedidos.length > 0 && (
                    <div className="space-y-4 pt-2">
                      <h3 className="text-sm font-bold text-billanga-gray uppercase tracking-wider px-1">Seguimiento en Vivo</h3>
                      {misPedidos.map((pedido) => (
                        <div key={pedido.id_pedido} className="bg-[#1a1a1c] border border-white/10 p-4 rounded-2xl flex flex-col gap-3">
                          <div className="flex justify-between items-center pb-2 border-b border-white/5">
                            <span className="text-xs font-bold text-billanga-gray">Pedido a las {new Date(pedido.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            <span className={`flex items-center gap-1.5 text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
                              pedido.estado === 'pendiente' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                              pedido.estado === 'preparacion' || pedido.estado === 'listo' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                              pedido.estado === 'entregado' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                              'bg-red-500/10 text-red-500 border-red-500/20'
                            }`}>
                              {pedido.estado === 'pendiente' && <Clock className="w-3 h-3" />}
                              {(pedido.estado === 'preparacion' || pedido.estado === 'listo') && <ChefHat className="w-3 h-3" />}
                              {pedido.estado === 'entregado' && <CheckCircle className="w-3 h-3" />}
                              {pedido.estado === 'cancelado' && <XCircle className="w-3 h-3" />}
                              
                              {pedido.estado === 'pendiente' ? 'Esperando al Barman...' :
                               (pedido.estado === 'preparacion' || pedido.estado === 'listo') ? 'En Preparación' :
                               pedido.estado === 'entregado' ? 'Entregado en mesa' : 'Cancelado'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-bold text-white">{pedido.pedido_items.reduce((acc: number, item: any) => acc + item.cantidad, 0)} Productos</span>
                            <span className="text-sm font-bold text-billanga-primary">Bs. {Number(pedido.total).toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {cart.length === 0 && misPedidos.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-center text-billanga-gray space-y-3">
                      <ShoppingBag className="w-12 h-12 opacity-20" />
                      <p>Aún no has agregado nada al pedido.</p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer Checkout */}
            {!orderSuccess && cart.length > 0 && (
              <div className="border-t border-[#2a2a2c] bg-[#1a1a1c] p-5 pb-8 md:pb-5 md:rounded-b-3xl space-y-4 shadow-[0_-10px_20px_rgba(0,0,0,0.5)] z-10">
                <div className="flex justify-between items-end">
                  <span className="text-billanga-gray font-bold text-sm uppercase tracking-wider">Total del Pedido</span>
                  <span className="text-2xl font-black text-white">Bs. {cartTotal.toFixed(2)}</span>
                </div>
                
                <div>
                  <label className="text-xs font-bold text-billanga-gray uppercase tracking-wider block mb-2">¿En qué mesa estás?</label>
                  <input 
                    type="text" 
                    value={tableNumber}
                    onChange={e => setTableNumber(e.target.value)}
                    placeholder="Ej: Mesa 3"
                    className="w-full bg-[#121212] border border-[#2a2a2c] rounded-xl py-3 px-4 text-white font-bold focus:outline-none focus:border-billanga-primary"
                  />
                </div>

                <button 
                  onClick={handleSendOrder}
                  disabled={isOrdering || !tableNumber}
                  className="w-full py-4 bg-billanga-primary hover:bg-[#b81d24] disabled:opacity-50 text-white rounded-xl font-black text-lg transition-all shadow-[0_0_20px_rgba(220, 38, 38,0.3)] flex justify-center items-center gap-2 active:scale-95"
                >
                  {isOrdering ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : "Enviar a la Barra"}
                </button>
              </div>
            )}
            
          </div>
        </div>
      )}

      {/* Barra de navegación inferior móvil */}
      <BottomDock />
      
      {/* Footer */}
      <Footer />
    </div>
  );
}
