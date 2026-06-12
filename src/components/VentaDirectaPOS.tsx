"use client";

import { useState, useEffect } from "react";
import { 
  X, Search, ShoppingBag, Plus, Minus, Tag, Check, 
  User, UserCheck, UserX, Banknote
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { printReceipt } from "@/utils/printReceipt";

interface Producto {
  id_producto: string;
  id_categoria: string;
  nombre: string;
  precio_venta: number;
  imagen_url?: string;
}

interface Categoria {
  id_categoria: string;
  nombre: string;
}

interface Cliente {
  id_cliente: string;
  nombre: string;
  telefono: string | null;
}

interface CartItem {
  id_producto: string;
  producto: Producto;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

interface VentaDirectaPOSProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function VentaDirectaPOS({ onClose, onSuccess }: VentaDirectaPOSProps) {
  const [loading, setLoading] = useState(true);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchProductoQuery, setSearchProductoQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Cliente
  const [searchClienteQuery, setSearchClienteQuery] = useState("");
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [isSearchingCliente, setIsSearchingCliente] = useState(false);

  // Cobro
  const [isClosing, setIsClosing] = useState(false);
  const [metodoPago, setMetodoPago] = useState<"efectivo" | "qr">("efectivo");
  const [isProcessing, setIsProcessing] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [catRes, prodRes, cliRes] = await Promise.all([
        supabase.from("categorias").select("*"),
        supabase.from("productos").select("*").eq("activo", true),
        supabase.from("clientes").select("*").eq("activo", true)
      ]);

      if (catRes.data) setCategorias(catRes.data);
      if (prodRes.data) setProductos(prodRes.data);
      if (cliRes.data) setClientes(cliRes.data);
      setLoading(false);
    };
    fetchData();
  }, []);

  const filteredProducts = productos.filter(p => 
    (activeCategory === 'all' || p.id_categoria === activeCategory) &&
    p.nombre.toLowerCase().includes(searchProductoQuery.toLowerCase())
  );

  const handleAddProduct = (prod: Producto) => {
    setCart(prev => {
      const existing = prev.find(item => item.id_producto === prod.id_producto);
      if (existing) {
        return prev.map(item => 
          item.id_producto === prod.id_producto 
            ? { ...item, cantidad: item.cantidad + 1, subtotal: (item.cantidad + 1) * item.precio_unitario }
            : item
        );
      }
      return [...prev, {
        id_producto: prod.id_producto,
        producto: prod,
        cantidad: 1,
        precio_unitario: prod.precio_venta,
        subtotal: prod.precio_venta
      }];
    });
  };

  const handleRemoveProduct = (prodId: string) => {
    setCart(prev => {
      const existing = prev.find(item => item.id_producto === prodId);
      if (existing && existing.cantidad > 1) {
        return prev.map(item => 
          item.id_producto === prodId 
            ? { ...item, cantidad: item.cantidad - 1, subtotal: (item.cantidad - 1) * item.precio_unitario }
            : item
        );
      }
      return prev.filter(item => item.id_producto !== prodId);
    });
  };

  const totalCart = cart.reduce((acc, item) => acc + item.subtotal, 0);

  const filteredClientes = clientes.filter(c => c.nombre.toLowerCase().includes(searchClienteQuery.toLowerCase()));

  const handleConfirmClose = async () => {
    if (cart.length === 0) return;
    setIsProcessing(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("No estás autenticado.");
      
      const { data: userProfile, error: profileError } = await supabase.from("usuarios").select("id_usuario, nombre, usuario_sucursal(id_sucursal)").eq("auth_id", userData.user.id).single();
      if (profileError || !userProfile) {
        console.error("Error perfil:", profileError);
        throw new Error("Perfil de usuario no encontrado.");
      }

      const idSucursal = userProfile.usuario_sucursal && Array.isArray(userProfile.usuario_sucursal) && userProfile.usuario_sucursal.length > 0 
        ? userProfile.usuario_sucursal[0].id_sucursal 
        : null;
        
      if (!idSucursal) throw new Error("No tienes una sucursal asignada para realizar ventas.");

      // Insertar Venta
      const { data: newVenta, error: ventaError } = await supabase
        .from("ventas")
        .insert({
          id_sucursal: idSucursal,
          id_usuario: userProfile.id_usuario,
          id_cliente: (selectedCliente?.id_cliente && selectedCliente.id_cliente !== 'anon') ? selectedCliente.id_cliente : null,
          id_sesion: null, // Venta Directa
          total: totalCart,
          metodo_pago: metodoPago,
          estado: "completada"
        })
        .select()
        .single();
      
      if (ventaError) throw ventaError;

      // Insertar Items
      const itemsToInsert = cart.map(item => ({
        id_venta: newVenta.id_venta,
        id_producto: item.id_producto,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario
      }));

      const { error: itemsError } = await supabase.from("venta_items").insert(itemsToInsert);
      if (itemsError) throw itemsError;

      // Actualizar puntos si es cliente registrado (1 punto por cada 10 Bs por ejemplo, esto puede ajustarse luego)
      if (selectedCliente) {
         const puntosGanados = Math.floor(totalCart / 10);
         if (puntosGanados > 0) {
           await supabase.rpc('increment_puntos', { x_cliente: selectedCliente.id_cliente, x_puntos: puntosGanados });
         }
      }

      // Imprimir recibo
      printReceipt({
        tipo: "directa",
        cajero: userProfile.nombre || "Cajero",
        cliente: selectedCliente?.id_cliente !== 'anon' ? selectedCliente?.nombre : undefined,
        productos: cart.map(i => ({
          nombre: i.producto.nombre,
          cantidad: i.cantidad,
          precio_unitario: i.precio_unitario,
          subtotal: i.subtotal
        })),
        totalGeneral: totalCart,
        metodoPago: metodoPago
      });

      onSuccess();
    } catch (err: any) {
      alert("Error al procesar la venta: " + err.message);
      setIsProcessing(false);
    }
  };

  if (loading) return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[70] flex items-center justify-center p-6">
      <div className="text-white">Cargando catálogo...</div>
    </div>
  );

  return (
    <>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-2 sm:p-6">
        <div className="bg-[#141416] border border-[#2a2a2c] w-full h-[95vh] md:h-full max-w-6xl rounded-2xl flex flex-col md:flex-row overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
          
          {/* IZQUIERDA: Cuenta y Resumen */}
          <div className="w-full md:w-1/3 h-[50vh] md:h-full border-b md:border-b-0 md:border-r border-[#2a2a2c] flex flex-col bg-[#1a1a1c]">
            <div className="p-4 sm:p-5 border-b border-[#2a2a2c] bg-[#1a1a1c] flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-black text-xl text-white flex items-center gap-2">
                  <ShoppingBag className="text-billar-primary w-5 h-5" />
                  Venta Directa
                </h3>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-[#2a2a2c] rounded-full text-billar-gray transition-colors"><X className="w-5 h-5" /></button>
            </div>

            {/* Asignación de Cliente */}
            <div className="p-3 border-b border-[#2a2a2c] bg-[#141416] shrink-0">
               {!selectedCliente ? (
                 <div className="relative">
                   <div className="flex gap-2">
                     <div className="relative flex-1">
                       <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-billar-gray/50" />
                       <input 
                         type="text" 
                         placeholder="Buscar cliente para sumar puntos..." 
                         value={searchClienteQuery}
                         onChange={e => { setSearchClienteQuery(e.target.value); setIsSearchingCliente(true); }}
                         onFocus={() => setIsSearchingCliente(true)}
                         className="bg-[#1a1a1c] border border-[#2a2a2c] rounded-lg py-2 pl-9 pr-3 text-sm text-white w-full focus:outline-none focus:border-billar-primary transition-colors"
                       />
                     </div>
                     <button onClick={() => setSelectedCliente({ id_cliente: 'anon', nombre: 'Anónimo', telefono: null })} className="bg-[#2a2a2c] text-white p-2 rounded-lg hover:bg-[#3a3a3c] transition-colors" title="Venta Anónima">
                       <UserX className="w-5 h-5" />
                     </button>
                   </div>
                   
                   {isSearchingCliente && searchClienteQuery.length > 0 && (
                     <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a1c] border border-[#2a2a2c] rounded-lg shadow-xl z-10 max-h-48 overflow-y-auto">
                       {filteredClientes.length > 0 ? (
                         filteredClientes.map(c => (
                           <button 
                             key={c.id_cliente} 
                             onClick={() => { setSelectedCliente(c); setIsSearchingCliente(false); setSearchClienteQuery(""); }}
                             className="w-full text-left px-4 py-3 hover:bg-[#2a2a2c] text-sm text-white border-b border-[#2a2a2c]/50 last:border-0 flex items-center gap-2"
                           >
                             <User className="w-4 h-4 text-billar-gray" />
                             {c.nombre}
                           </button>
                         ))
                       ) : (
                         <div className="p-4 text-sm text-billar-gray text-center">No se encontraron clientes</div>
                       )}
                     </div>
                   )}
                 </div>
               ) : (
                 <div className="bg-billar-primary/10 border border-billar-primary/30 p-3 rounded-xl flex items-center justify-between">
                   <div className="flex items-center gap-3">
                     <div className="bg-billar-primary/20 p-2 rounded-lg">
                       {selectedCliente.id_cliente === 'anon' ? <UserX className="w-4 h-4 text-billar-primary" /> : <UserCheck className="w-4 h-4 text-billar-primary" />}
                     </div>
                     <div>
                       <h4 className="font-bold text-white text-sm">{selectedCliente.nombre}</h4>
                       <p className="text-[10px] text-billar-gray">{selectedCliente.id_cliente === 'anon' ? 'Sin acumulación de puntos' : 'Cliente Frecuente'}</p>
                     </div>
                   </div>
                   <button onClick={() => setSelectedCliente(null)} className="text-billar-gray hover:text-white p-1"><X className="w-4 h-4" /></button>
                 </div>
               )}
            </div>

            {/* Items del carrito */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-[#2a2a2c]">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-billar-gray/50 space-y-2">
                  <ShoppingBag className="w-12 h-12 opacity-20" />
                  <p className="text-sm">El carrito está vacío</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.id_producto} className="bg-black/30 border border-[#2a2a2c] p-3 rounded-xl flex items-center justify-between group">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="flex flex-col items-center gap-1 bg-[#1a1a1c] border border-[#2a2a2c] rounded-lg overflow-hidden shrink-0">
                        <button onClick={() => handleAddProduct(item.producto)} className="p-1 hover:bg-[#2a2a2c] text-white w-full flex justify-center"><Plus className="w-3 h-3" /></button>
                        <span className="text-xs font-bold w-7 text-center">{item.cantidad}</span>
                        <button onClick={() => handleRemoveProduct(item.id_producto)} className="p-1 hover:bg-[#2a2a2c] text-white w-full flex justify-center"><Minus className="w-3 h-3" /></button>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-white text-sm truncate">{item.producto.nombre}</h4>
                        <p className="text-[10px] text-billar-gray">Bs. {Number(item.precio_unitario).toFixed(2)} c/u</p>
                      </div>
                    </div>
                    <div className="text-right font-bold text-white ml-2">
                      Bs. {item.subtotal.toFixed(2)}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Totalizador */}
            <div className="p-5 border-t border-[#2a2a2c] bg-[#1a1a1c] shrink-0">
              <div className="flex justify-between items-end mb-4">
                <span className="text-xs text-billar-gray uppercase tracking-wider font-bold">Total a Pagar</span>
                <span className="text-3xl font-black text-white">
                  Bs. {totalCart.toFixed(2)}
                </span>
              </div>
              <button 
                onClick={() => setIsClosing(true)} 
                disabled={cart.length === 0 || !selectedCliente}
                className="w-full py-4 bg-billar-primary hover:bg-billar-primary-dark disabled:bg-[#2a2a2c] disabled:text-billar-gray text-white rounded-xl font-bold text-lg transition-all flex justify-center items-center gap-2"
              >
                Cobrar Venta
              </button>
              {!selectedCliente && <p className="text-[10px] text-center text-billar-gray mt-2">Selecciona un cliente o "Anónimo" para cobrar</p>}
            </div>
          </div>

          {/* DERECHA: Catálogo POS */}
          <div className="flex-1 min-w-0 h-[45vh] md:h-full flex flex-col bg-[#141416]">
            
            {/* Buscador de productos */}
            <div className="p-3 sm:p-4 border-b border-[#2a2a2c] bg-[#1a1a1c] shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-billar-gray/50" />
                <input 
                  type="text" 
                  placeholder="Buscar producto..." 
                  value={searchProductoQuery}
                  onChange={e => setSearchProductoQuery(e.target.value)}
                  className="bg-[#141416] border border-[#2a2a2c] rounded-lg py-2 pl-9 pr-3 text-sm text-white w-full focus:outline-none focus:border-billar-primary transition-colors"
                />
              </div>
            </div>

            <div className="p-3 sm:p-4 border-b border-[#2a2a2c] bg-[#1a1a1c] overflow-x-auto flex gap-2 shrink-0 scrollbar-thin scrollbar-thumb-[#2a2a2c]">
              <button onClick={() => setActiveCategory('all')} className={`shrink-0 px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${activeCategory === 'all' ? 'bg-white text-black' : 'bg-[#2a2a2c] text-billar-gray hover:text-white'}`}>Todos</button>
              {categorias.map(cat => <button key={cat.id_categoria} onClick={() => setActiveCategory(cat.id_categoria)} className={`shrink-0 px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${activeCategory === cat.id_categoria ? 'bg-white text-black' : 'bg-[#2a2a2c] text-billar-gray hover:text-white'}`}>{cat.nombre}</button>)}
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 content-start scrollbar-thin scrollbar-thumb-[#2a2a2c]">
              {filteredProducts.map(prod => (
                <button key={prod.id_producto} onClick={() => handleAddProduct(prod)} className="bg-[#1a1a1c] border border-[#2a2a2c] hover:border-billar-primary/50 hover:shadow-[0_0_15px_rgba(220, 38, 38,0.15)] rounded-2xl p-4 flex flex-col items-center justify-between aspect-square transition-all active:scale-95 group">
                  <div className="w-16 h-16 rounded-xl bg-black/40 flex items-center justify-center mb-3 group-hover:bg-billar-primary/20 transition-colors overflow-hidden">
                    {prod.imagen_url ? (
                      <img src={prod.imagen_url} alt={prod.nombre} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                    ) : (
                      <Tag className="w-6 h-6 text-billar-gray group-hover:text-billar-primary transition-colors" />
                    )}
                  </div>
                  <div className="text-center w-full">
                    <h4 className="font-bold text-sm text-white leading-tight mb-1 line-clamp-2">{prod.nombre}</h4>
                    <p className="font-black text-billar-primary">Bs. {prod.precio_venta.toFixed(2)}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: Cobrar Checkout Final */}
      {isClosing && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-[#1a1a1c] border border-[#2a2a2c] w-full max-w-md rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200 shadow-2xl">
            <div className="p-6 border-b border-[#2a2a2c] text-center">
              <h3 className="font-black text-2xl text-white">Completar Venta</h3>
              <p className="text-sm text-billar-gray">Elige el método de pago</p>
            </div>
            <div className="p-6 space-y-6">
              <div className="bg-billar-primary/10 border border-billar-primary/30 p-6 rounded-2xl text-center space-y-2">
                <span className="text-sm text-billar-primary uppercase tracking-wider font-bold">Total a Cobrar</span>
                <div className="text-5xl font-black text-white">Bs. {totalCart.toFixed(2)}</div>
              </div>
              <div className="space-y-3">
                <label className="text-sm font-medium text-billar-gray block text-center">Método de Pago (Directo)</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['efectivo', 'qr'] as const).map((metodo) => (
                    <button key={metodo} onClick={() => setMetodoPago(metodo)} className={`p-4 border rounded-xl flex flex-col items-center gap-2 transition-all ${metodoPago === metodo ? "border-billar-primary bg-billar-primary/20 text-white" : "border-[#2a2a2c] bg-black/40 text-billar-gray hover:text-white hover:bg-[#2a2a2c]"}`}>
                      <Banknote className="w-6 h-6" />
                      <span className="text-xs font-bold capitalize">{metodo}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-[#2a2a2c] bg-black/40 flex gap-3">
              <button onClick={() => setIsClosing(false)} disabled={isProcessing} className="flex-1 py-3 rounded-xl border border-[#2a2a2c] hover:bg-[#2a2a2c] text-white font-bold transition-all">Volver</button>
              <button onClick={handleConfirmClose} disabled={isProcessing} className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(22,163,74,0.4)]">
                {isProcessing ? "Procesando..." : <><Check className="w-5 h-5" /> Confirmar</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
