"use client";

import { useState, useEffect } from "react";
import { 
  Package, Search, PlusCircle, ArrowUpRight, ArrowDownRight, 
  AlertTriangle, RefreshCw, Layers, Edit3, Check, X, Trash2,
  Save, Tag
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import ImageUploader from "@/components/ImageUploader";

interface Categoria {
  id_categoria: string;
  nombre: string;
  descripcion: string | null;
}

interface Producto {
  id_producto: string;
  id_categoria: string;
  nombre: string;
  descripcion: string | null;
  imagen_url: string | null;
  codigo: string | null;
  precio_venta: number;
  precio_costo: number | null;
  activo: boolean;
}

interface InventarioItem {
  id_inventario: string;
  id_sucursal: string;
  id_producto: string;
  stock: number;
  stock_minimo: number;
  productos: Producto;
}

interface MovimientoItem {
  id_movimiento: string;
  tipo: 'entrada' | 'salida' | 'ajuste' | 'devolucion' | 'transferencia';
  cantidad: number;
  stock_antes: number;
  stock_despues: number;
  motivo: string | null;
  created_at: string;
  productos: { nombre: string };
}

export default function InventarioPage() {
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState("");
  
  const [inventario, setInventario] = useState<InventarioItem[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [allProducts, setAllProducts] = useState<Producto[]>([]);
  const [recentMovements, setRecentMovements] = useState<MovimientoItem[]>([]);
  
  const [activeSucursalId, setActiveSucursalId] = useState<string>("");
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Filtros
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  // Vista activa: 'stock' | 'productos' | 'categorias'
  const [activeView, setActiveView] = useState<'stock' | 'productos' | 'categorias'>('stock');

  // Modal de Ajuste de Stock
  const [isAdjustingStock, setIsAdjustingStock] = useState(false);
  const [selectedInvItem, setSelectedInvItem] = useState<InventarioItem | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<'entrada' | 'salida'>('entrada');
  const [adjustmentQuantity, setAdjustmentQuantity] = useState(1);
  const [adjustmentReason, setAdjustmentReason] = useState("");

  // Modal de Crear/Editar Producto
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Producto | null>(null);
  const [productForm, setProductForm] = useState({ 
    nombre: "", descripcion: "", imagen_url: "", codigo: "", precio_venta: "", precio_costo: "", id_categoria: "", stock_inicial: "0" 
  });

  // Modal de Crear/Editar Categoría
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Categoria | null>(null);
  const [categoryForm, setCategoryForm] = useState({ nombre: "", descripcion: "" });

  const supabase = createClient();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    setDbError("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: dbUser } = await supabase.from("usuarios").select("id_usuario, nombre").eq("auth_id", user.id).single();
        setCurrentUser(dbUser || { id_usuario: user.id, nombre: user.email?.split("@")[0] || "Admin" });
      }

      const { data: sucursales, error: sucError } = await supabase.from("sucursales").select("id_sucursal");
      if (sucError) throw sucError;
      let sucursalId = "";
      if (sucursales && sucursales.length > 0) {
        sucursalId = sucursales[0].id_sucursal;
        setActiveSucursalId(sucursalId);
      }

      // Categorías
      const { data: catData, error: catError } = await supabase.from("categorias").select("*");
      if (catError) throw catError;
      setCategorias(catData || []);

      // Todos los Productos
      const { data: prodData, error: prodError } = await supabase.from("productos").select("*").order("nombre");
      if (prodError) throw prodError;
      setAllProducts(prodData || []);

      // Inventario
      if (sucursalId) {
        const { data: invData, error: invError } = await supabase
          .from("inventario")
          .select(`id_inventario, id_sucursal, id_producto, stock, stock_minimo, productos:id_producto (id_producto, id_categoria, nombre, descripcion, imagen_url, codigo, precio_venta, precio_costo, activo)`)
          .eq("id_sucursal", sucursalId);
        if (invError) throw invError;

        const normalizedInv = (invData || []).map((item: any) => {
          const prodObj = Array.isArray(item.productos) ? (item.productos[0] || null) : (item.productos || null);
          return { id_inventario: item.id_inventario, id_sucursal: item.id_sucursal, id_producto: item.id_producto, stock: item.stock, stock_minimo: item.stock_minimo, productos: prodObj };
        });
        setInventario(normalizedInv as InventarioItem[]);

        // Movimientos recientes
        const { data: movData } = await supabase
          .from("movimientos_inventario")
          .select(`id_movimiento, tipo, cantidad, stock_antes, stock_despues, motivo, created_at, productos:id_producto (nombre)`)
          .eq("id_sucursal", sucursalId)
          .order("created_at", { ascending: false })
          .limit(10);
        
        const normalizedMovs = (movData || []).map((mov: any) => {
          const prodObj = Array.isArray(mov.productos) ? (mov.productos[0] || null) : (mov.productos || null);
          return { id_movimiento: mov.id_movimiento, tipo: mov.tipo, cantidad: mov.cantidad, stock_antes: mov.stock_antes, stock_despues: mov.stock_despues, motivo: mov.motivo, created_at: mov.created_at, productos: prodObj };
        });
        setRecentMovements(normalizedMovs as MovimientoItem[]);
      }

    } catch (err: any) {
      console.error("Error al cargar inventario:", err);
      setDbError(err.message || "Error al conectar con la tabla de inventario.");
    } finally {
      setLoading(false);
    }
  };

  // --- Filtrado ---
  const filteredItems = inventario.filter(item => {
    const p = item.productos;
    if (!p) return false;
    const matchesSearch = p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) || (p.codigo && p.codigo.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === "all" || p.id_categoria === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredProducts = allProducts.filter(p => {
    const matchesSearch = p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) || (p.codigo && p.codigo.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === "all" || p.id_categoria === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // --- Ajuste de Stock ---
  const handleOpenAdjustClick = (item: InventarioItem) => {
    setSelectedInvItem(item);
    setAdjustmentQuantity(1);
    setAdjustmentReason("");
    setIsAdjustingStock(true);
  };

  const handleSaveAdjustment = async () => {
    if (!selectedInvItem || !activeSucursalId || !currentUser) return;
    try {
      const isEntrada = adjustmentType === 'entrada';
      const cantidadOp = Number(adjustmentQuantity);
      const stockAntes = Number(selectedInvItem.stock);
      const stockDespues = isEntrada ? stockAntes + cantidadOp : Math.max(0, stockAntes - cantidadOp);

      await supabase.from("inventario").update({ stock: stockDespues }).eq("id_inventario", selectedInvItem.id_inventario);
      await supabase.from("movimientos_inventario").insert({
        id_inventario: selectedInvItem.id_inventario,
        id_sucursal: activeSucursalId,
        id_producto: selectedInvItem.id_producto,
        tipo: isEntrada ? 'entrada' : 'salida',
        cantidad: cantidadOp,
        stock_antes: stockAntes,
        stock_despues: stockDespues,
        motivo: adjustmentReason || (isEntrada ? "Entrada manual" : "Salida manual"),
        created_by: currentUser.id_usuario
      });

      setInventario(prev => prev.map(item => item.id_inventario === selectedInvItem.id_inventario ? { ...item, stock: stockDespues } : item));
      setIsAdjustingStock(false);
      setSelectedInvItem(null);
      loadData(); // Refresh movements
    } catch (err: any) {
      alert("Error al ajustar inventario: " + err.message);
    }
  };

  // --- CRUD Producto ---
  const openNewProduct = () => {
    setEditingProduct(null);
    setProductForm({ nombre: "", descripcion: "", imagen_url: "", codigo: "", precio_venta: "", precio_costo: "", id_categoria: categorias[0]?.id_categoria || "", stock_inicial: "0" });
    setIsProductModalOpen(true);
  };

  const openEditProduct = (prod: Producto) => {
    setEditingProduct(prod);
    setProductForm({
      nombre: prod.nombre,
      descripcion: prod.descripcion || "",
      imagen_url: prod.imagen_url || "",
      codigo: prod.codigo || "",
      precio_venta: String(prod.precio_venta),
      precio_costo: prod.precio_costo ? String(prod.precio_costo) : "",
      id_categoria: prod.id_categoria,
      stock_inicial: "0"
    });
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async () => {
    if (!productForm.nombre || !productForm.precio_venta || !productForm.id_categoria) {
      alert("Nombre, precio de venta y categoría son obligatorios."); return;
    }

    try {
      if (editingProduct) {
        // Actualizar
        const { error } = await supabase.from("productos").update({
          nombre: productForm.nombre,
          descripcion: productForm.descripcion || null,
          imagen_url: productForm.imagen_url || null,
          codigo: productForm.codigo || null,
          precio_venta: Number(productForm.precio_venta),
          precio_costo: productForm.precio_costo ? Number(productForm.precio_costo) : null,
          id_categoria: productForm.id_categoria,
          updated_at: new Date().toISOString(),
          updated_by: currentUser?.id_usuario || null
        }).eq("id_producto", editingProduct.id_producto);
        if (error) throw error;
      } else {
        // Crear
        const { data: newProd, error } = await supabase.from("productos").insert({
          nombre: productForm.nombre,
          descripcion: productForm.descripcion || null,
          imagen_url: productForm.imagen_url || null,
          codigo: productForm.codigo || null,
          precio_venta: Number(productForm.precio_venta),
          precio_costo: productForm.precio_costo ? Number(productForm.precio_costo) : null,
          id_categoria: productForm.id_categoria,
          activo: true,
          created_by: currentUser?.id_usuario || null,
          updated_by: currentUser?.id_usuario || null
        }).select().single();
        if (error) throw error;

        // Auto-crear entrada de inventario si hay sucursal
        if (newProd && activeSucursalId) {
          const stockInicial = Number(productForm.stock_inicial) || 0;
          const { data: newInv, error: invError } = await supabase.from("inventario").insert({
            id_sucursal: activeSucursalId,
            id_producto: newProd.id_producto,
            stock: stockInicial,
            stock_minimo: 5
          }).select().single();

          if (invError) throw new Error("Producto creado, pero falló el inventario: " + invError.message);

          if (stockInicial > 0 && newInv) {
            await supabase.from("movimientos_inventario").insert({
              id_inventario: newInv.id_inventario,
              id_sucursal: activeSucursalId,
              id_producto: newProd.id_producto,
              tipo: 'entrada',
              cantidad: stockInicial,
              stock_antes: 0,
              stock_despues: stockInicial,
              motivo: 'Stock inicial',
              created_by: currentUser?.id_usuario || null
            });
          }
        }
      }

      setIsProductModalOpen(false);
      setEditingProduct(null);
      loadData();
    } catch (err: any) {
      alert("Error al guardar producto: " + err.message);
    }
  };

  const handleToggleProduct = async (prod: Producto) => {
    try {
      await supabase.from("productos").update({ activo: !prod.activo }).eq("id_producto", prod.id_producto);
      loadData();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  // --- CRUD Categoría ---
  const openCreateCategory = () => {
    setEditingCategory(null);
    setCategoryForm({ nombre: "", descripcion: "" });
    setIsCategoryModalOpen(true);
  };

  const openEditCategory = (cat: Categoria) => {
    setEditingCategory(cat);
    setCategoryForm({ nombre: cat.nombre, descripcion: cat.descripcion || "" });
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.nombre) { alert("El nombre de la categoría es obligatorio."); return; }
    try {
      if (editingCategory) {
        await supabase.from("categorias").update({ nombre: categoryForm.nombre, descripcion: categoryForm.descripcion || null }).eq("id_categoria", editingCategory.id_categoria);
      } else {
        await supabase.from("categorias").insert({ nombre: categoryForm.nombre, descripcion: categoryForm.descripcion || null });
      }
      setIsCategoryModalOpen(false);
      setEditingCategory(null);
      loadData();
    } catch (err: any) {
      alert("Error al guardar categoría: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-billar-gray">
        <RefreshCw className="w-10 h-10 animate-spin text-billar-primary mb-4" />
        <p className="text-sm">Cargando inventario y productos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Package className="w-7 h-7 text-billar-primary" />
            Inventario & Productos
          </h2>
          <p className="text-sm text-billar-gray">Gestiona productos, categorías y stock de tu sucursal.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadData} className="flex items-center gap-2 px-4 py-2 border border-[#2a2a2c] hover:bg-[#2a2a2c] text-white rounded-lg text-sm transition-all">
            <RefreshCw className="w-4 h-4" /> Refrescar
          </button>
        </div>
      </div>

      {dbError && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 shrink-0 text-red-500 mt-0.5" />
          <div>
            <h4 className="font-bold text-white">Error de Carga</h4>
            <p className="text-sm text-billar-gray mt-1">{dbError}</p>
          </div>
        </div>
      )}

      {/* Tabs de Vista */}
      <div className="flex gap-2 bg-[#1a1a1c] border border-[#2a2a2c] p-1.5 rounded-xl w-fit">
        {[
          { key: 'stock' as const, label: 'Control de Stock', icon: Layers },
          { key: 'productos' as const, label: 'Productos', icon: Tag },
          { key: 'categorias' as const, label: 'Categorías', icon: Package },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveView(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeView === tab.key 
                ? 'bg-billar-primary text-white shadow-[0_0_12px_rgba(220, 38, 38,0.3)]' 
                : 'text-billar-gray hover:text-white hover:bg-[#2a2a2c]'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Barra de Filtros */}
      <div className="bg-[#1a1a1c] border border-[#2a2a2c] p-4 rounded-xl flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-billar-gray/50" />
          <input 
            type="text" placeholder="Buscar producto o código..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/40 border border-[#2a2a2c] rounded-lg py-2 pl-10 pr-4 text-sm text-white placeholder:text-billar-gray/50 focus:outline-none focus:border-billar-primary transition-all"
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full md:w-44 bg-black/40 border border-[#2a2a2c] rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-billar-primary">
            <option value="all">Todas las Categorías</option>
            {categorias.map(cat => (
              <option key={cat.id_categoria} value={cat.id_categoria}>{cat.nombre}</option>
            ))}
          </select>
          {activeView === 'productos' && (
            <button onClick={openNewProduct} className="flex items-center gap-2 px-4 py-2 bg-billar-primary hover:bg-billar-primary-dark text-white rounded-lg text-sm font-bold transition-all whitespace-nowrap">
              <PlusCircle className="w-4 h-4" /> Nuevo Producto
            </button>
          )}
          {activeView === 'categorias' && (
            <button onClick={openCreateCategory} className="flex items-center gap-2 px-4 py-2 bg-billar-primary hover:bg-billar-primary-dark text-white rounded-lg text-sm font-bold transition-all whitespace-nowrap">
              <PlusCircle className="w-4 h-4" /> Nueva Categoría
            </button>
          )}
        </div>
      </div>

      {/* ====== VISTA: CONTROL DE STOCK ====== */}
      {activeView === 'stock' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2">
            <div className="bg-[#1a1a1c] border border-[#2a2a2c] rounded-xl overflow-hidden shadow-md">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#2a2a2c] text-xs font-bold text-billar-gray tracking-wider uppercase bg-[#141416]/50">
                      <th className="py-4 pl-6">Producto</th>
                      <th className="py-4">Código</th>
                      <th className="py-4 text-right">Precio Venta</th>
                      <th className="py-4 text-center">Mínimo</th>
                      <th className="py-4 text-center">Stock</th>
                      <th className="py-4 pr-6 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.length > 0 ? filteredItems.map((item) => {
                      const p = item.productos;
                      const isBajo = Number(item.stock) < Number(item.stock_minimo);
                      return (
                        <tr key={item.id_inventario} className="border-b border-[#2a2a2c]/40 hover:bg-white/[0.02] transition-colors text-sm text-white">
                          <td className="py-4 pl-6">
                            <div className="flex flex-col">
                              <span className="font-bold">{p?.nombre}</span>
                              <span className="text-[10px] text-billar-gray mt-0.5">{categorias.find(c => c.id_categoria === p?.id_categoria)?.nombre || "Sin Cat."}</span>
                            </div>
                          </td>
                          <td className="py-4 font-mono text-xs text-billar-gray">{p?.codigo || "—"}</td>
                          <td className="py-4 text-right font-semibold">Bs. {Number(p?.precio_venta).toFixed(2)}</td>
                          <td className="py-4 text-center text-billar-gray">{Number(item.stock_minimo).toFixed(0)}</td>
                          <td className="py-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <span className={`font-mono font-bold text-base ${isBajo ? "text-orange-500" : "text-white"}`}>{Number(item.stock).toFixed(0)}</span>
                              {isBajo && <AlertTriangle className="w-4 h-4 text-orange-500 animate-pulse" />}
                            </div>
                          </td>
                          <td className="py-4 pr-6 text-center">
                            <button onClick={() => handleOpenAdjustClick(item)} className="px-3 py-1.5 bg-[#2a2a2c] hover:bg-billar-primary hover:text-white rounded-lg text-xs font-bold transition-all text-billar-gray">
                              Ajustar
                            </button>
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr><td colSpan={6} className="py-12 text-center text-billar-gray text-sm">No hay productos en el inventario de esta sucursal.<br/><span className="text-xs">Crea un producto primero en la pestaña de &quot;Productos&quot;.</span></td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Historial de Movimientos */}
          <div>
            <div className="bg-[#1a1a1c] border border-[#2a2a2c] rounded-xl p-6 shadow-sm">
              <h3 className="font-bold text-white text-base mb-4 flex items-center gap-2"><Layers className="w-5 h-5 text-billar-primary" /> Movimientos Recientes</h3>
              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                {recentMovements.length > 0 ? recentMovements.map((mov) => {
                  const isEntrada = mov.tipo === 'entrada' || mov.tipo === 'devolucion';
                  return (
                    <div key={mov.id_movimiento} className="p-3 bg-black/20 border border-[#2a2a2c]/60 rounded-lg flex justify-between items-start gap-2 text-xs">
                      <div className="space-y-1">
                        <div className="font-bold text-white line-clamp-1">{mov.productos?.nombre}</div>
                        <div className="text-[10px] text-billar-gray">{new Date(mov.created_at).toLocaleString("es-BO", { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                        {mov.motivo && <div className="text-[10px] text-billar-gray italic line-clamp-1">&quot;{mov.motivo}&quot;</div>}
                      </div>
                      <div className="text-right">
                        <div className={`font-bold flex items-center gap-1 justify-end ${isEntrada ? "text-green-400" : "text-red-400"}`}>
                          {isEntrada ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                          <span>{isEntrada ? "+" : "-"}{Number(mov.cantidad).toFixed(0)} u</span>
                        </div>
                        <div className="text-[9px] text-billar-gray mt-1">Stock: {Number(mov.stock_despues).toFixed(0)}</div>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="py-12 text-center text-billar-gray/40">Sin movimientos registrados</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====== VISTA: PRODUCTOS ====== */}
      {activeView === 'productos' && (
        <div className="bg-[#1a1a1c] border border-[#2a2a2c] rounded-xl overflow-hidden shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#2a2a2c] text-xs font-bold text-billar-gray tracking-wider uppercase bg-[#141416]/50">
                  <th className="py-4 pl-6">Producto</th>
                  <th className="py-4">Código</th>
                  <th className="py-4">Categoría</th>
                  <th className="py-4 text-right">Precio Venta</th>
                  <th className="py-4 text-right">Precio Costo</th>
                  <th className="py-4 text-center">Estado</th>
                  <th className="py-4 pr-6 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length > 0 ? filteredProducts.map((prod) => (
                  <tr key={prod.id_producto} className="border-b border-[#2a2a2c]/40 hover:bg-white/[0.02] transition-colors text-sm text-white">
                    <td className="py-4 pl-6 font-bold">{prod.nombre}</td>
                    <td className="py-4 font-mono text-xs text-billar-gray">{prod.codigo || "—"}</td>
                    <td className="py-4 text-billar-gray text-xs">{categorias.find(c => c.id_categoria === prod.id_categoria)?.nombre || "—"}</td>
                    <td className="py-4 text-right font-semibold">Bs. {Number(prod.precio_venta).toFixed(2)}</td>
                    <td className="py-4 text-right text-billar-gray">{prod.precio_costo ? `Bs. ${Number(prod.precio_costo).toFixed(2)}` : "—"}</td>
                    <td className="py-4 text-center">
                      <button onClick={() => handleToggleProduct(prod)} className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase transition-all ${prod.activo ? "bg-green-500/10 text-green-500 hover:bg-green-500/20" : "bg-red-500/10 text-red-400 hover:bg-red-500/20"}`}>
                        {prod.activo ? "Activo" : "Inactivo"}
                      </button>
                    </td>
                    <td className="py-4 pr-6 text-center">
                      <button onClick={() => openEditProduct(prod)} className="px-3 py-1.5 bg-[#2a2a2c] hover:bg-billar-primary hover:text-white rounded-lg text-xs font-bold transition-all text-billar-gray inline-flex items-center gap-1">
                        <Edit3 className="w-3 h-3" /> Editar
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={7} className="py-12 text-center text-billar-gray text-sm">No hay productos creados aún.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ====== VISTA: CATEGORÍAS ====== */}
      {activeView === 'categorias' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categorias.map(cat => {
            const productCount = allProducts.filter(p => p.id_categoria === cat.id_categoria).length;
            return (
              <div key={cat.id_categoria} className="bg-[#1a1a1c] border border-[#2a2a2c] rounded-xl p-5 hover:border-white/20 transition-all group">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-white text-lg">{cat.nombre}</h3>
                    <p className="text-xs text-billar-gray mt-1 line-clamp-2">{cat.descripcion || "Sin descripción"}</p>
                  </div>
                  <button onClick={() => openEditCategory(cat)} className="p-2 hover:bg-[#2a2a2c] rounded-lg text-billar-gray opacity-0 group-hover:opacity-100 transition-all">
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>
                <div className="mt-4 pt-4 border-t border-[#2a2a2c] flex items-center gap-2">
                  <Tag className="w-4 h-4 text-billar-primary" />
                  <span className="text-sm text-billar-gray"><strong className="text-white">{productCount}</strong> productos</span>
                </div>
              </div>
            );
          })}
          {categorias.length === 0 && (
            <div className="col-span-full py-16 text-center text-billar-gray">No hay categorías creadas aún.</div>
          )}
        </div>
      )}

      {/* ====== MODAL: Ajuste de Stock ====== */}
      {isAdjustingStock && selectedInvItem && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1c] border border-[#2a2a2c] w-full max-w-md rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-[#2a2a2c] flex justify-between items-center">
              <h3 className="font-bold text-lg text-white">Ajustar Inventario</h3>
              <button onClick={() => { setIsAdjustingStock(false); setSelectedInvItem(null); }} className="p-2 hover:bg-[#2a2a2c] rounded-full text-billar-gray"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-black/35 p-4 rounded-xl">
                <span className="text-[10px] uppercase text-billar-gray font-bold tracking-wider">Producto:</span>
                <h4 className="font-bold text-white text-base mt-1">{selectedInvItem.productos.nombre}</h4>
                <div className="flex justify-between items-center mt-3 text-xs text-billar-gray">
                  <span>Stock Actual: <strong>{Number(selectedInvItem.stock).toFixed(0)} u</strong></span>
                  <span>Mínimo: <strong>{Number(selectedInvItem.stock_minimo).toFixed(0)} u</strong></span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setAdjustmentType('entrada')} className={`py-2 px-4 border rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all ${adjustmentType === 'entrada' ? "border-green-500 bg-green-500/10 text-green-400" : "border-[#2a2a2c] text-billar-gray hover:text-white"}`}>
                  <ArrowUpRight className="w-4 h-4" /> Entrada
                </button>
                <button onClick={() => setAdjustmentType('salida')} className={`py-2 px-4 border rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all ${adjustmentType === 'salida' ? "border-red-500 bg-red-500/10 text-red-400" : "border-[#2a2a2c] text-billar-gray hover:text-white"}`}>
                  <ArrowDownRight className="w-4 h-4" /> Salida
                </button>
              </div>
              <div>
                <label className="text-sm font-medium text-billar-gray block mb-1">Cantidad</label>
                <input type="number" min={1} value={adjustmentQuantity} onChange={(e) => setAdjustmentQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-black/40 border border-[#2a2a2c] rounded-lg py-2.5 px-3 text-white focus:outline-none focus:border-billar-primary font-mono" />
              </div>
              <div>
                <label className="text-sm font-medium text-billar-gray block mb-1">Motivo (opcional)</label>
                <textarea rows={2} placeholder="Ej: Reposición de stock" value={adjustmentReason} onChange={(e) => setAdjustmentReason(e.target.value)}
                  className="w-full bg-black/40 border border-[#2a2a2c] rounded-lg py-2.5 px-3 text-white placeholder:text-billar-gray/50 focus:outline-none focus:border-billar-primary text-sm" />
              </div>
            </div>
            <div className="p-6 border-t border-[#2a2a2c] bg-black/20 flex gap-3">
              <button onClick={() => { setIsAdjustingStock(false); setSelectedInvItem(null); }} className="flex-1 py-2.5 rounded-lg border border-[#2a2a2c] hover:bg-[#2a2a2c] text-white font-bold text-sm">Cancelar</button>
              <button onClick={handleSaveAdjustment} className="flex-1 py-2.5 rounded-lg bg-billar-primary hover:bg-billar-primary-dark text-white font-bold text-sm flex items-center justify-center gap-2"><Check className="w-4 h-4" /> Aplicar</button>
            </div>
          </div>
        </div>
      )}

      {/* ====== MODAL: Crear/Editar Producto ====== */}
      {isProductModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1c] border border-[#2a2a2c] w-full max-w-lg rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-[#2a2a2c] flex justify-between items-center">
              <h3 className="font-bold text-lg text-white">{editingProduct ? "Editar Producto" : "Nuevo Producto"}</h3>
              <button onClick={() => setIsProductModalOpen(false)} className="p-2 hover:bg-[#2a2a2c] rounded-full text-billar-gray"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="text-sm font-medium text-billar-gray block mb-1">Nombre del Producto *</label>
                <input type="text" value={productForm.nombre} onChange={(e) => setProductForm(prev => ({ ...prev, nombre: e.target.value }))}
                  placeholder="Ej: Cerveza Polar Pilsen 330ml"
                  className="w-full bg-black/40 border border-[#2a2a2c] rounded-lg py-2.5 px-3 text-white focus:outline-none focus:border-billar-primary" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-billar-gray block mb-1">Código</label>
                  <input type="text" value={productForm.codigo} onChange={(e) => setProductForm(prev => ({ ...prev, codigo: e.target.value }))}
                    placeholder="Ej: CER001"
                    className="w-full bg-black/40 border border-[#2a2a2c] rounded-lg py-2.5 px-3 text-white focus:outline-none focus:border-billar-primary font-mono" />
                </div>
                <div>
                  <label className="text-sm font-medium text-billar-gray block mb-1">Categoría *</label>
                  <select value={productForm.id_categoria} onChange={(e) => setProductForm(prev => ({ ...prev, id_categoria: e.target.value }))}
                    className="w-full bg-black/40 border border-[#2a2a2c] rounded-lg py-2.5 px-3 text-white focus:outline-none focus:border-billar-primary">
                    <option value="">Seleccionar...</option>
                    {categorias.map(cat => (
                      <option key={cat.id_categoria} value={cat.id_categoria}>{cat.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-billar-gray block mb-1">Descripción (Para el cliente)</label>
                <textarea rows={2} value={productForm.descripcion} onChange={(e) => setProductForm(prev => ({ ...prev, descripcion: e.target.value }))}
                  placeholder="Ej: Cerveza bien fría ideal para disfrutar..."
                  className="w-full bg-black/40 border border-[#2a2a2c] rounded-lg py-2.5 px-3 text-white placeholder:text-billar-gray/50 focus:outline-none focus:border-billar-primary text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium text-billar-gray block mb-1">Imagen del Producto (Opcional)</label>
                <ImageUploader 
                  value={productForm.imagen_url} 
                  onChange={(url) => setProductForm(prev => ({ ...prev, imagen_url: url }))} 
                  folder="productos"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-billar-gray block mb-1">Precio Venta (Bs.) *</label>
                  <input type="number" step="0.01" min="0" value={productForm.precio_venta} onChange={(e) => setProductForm(prev => ({ ...prev, precio_venta: e.target.value }))}
                    placeholder="0.00"
                    className="w-full bg-black/40 border border-[#2a2a2c] rounded-lg py-2.5 px-3 text-white focus:outline-none focus:border-billar-primary font-mono" />
                </div>
                <div>
                  <label className="text-sm font-medium text-billar-gray block mb-1">Precio Costo (Bs.)</label>
                  <input type="number" step="0.01" min="0" value={productForm.precio_costo} onChange={(e) => setProductForm(prev => ({ ...prev, precio_costo: e.target.value }))}
                    placeholder="0.00"
                    className="w-full bg-black/40 border border-[#2a2a2c] rounded-lg py-2.5 px-3 text-white focus:outline-none focus:border-billar-primary font-mono" />
                </div>
              </div>
              {!editingProduct && (
                <div>
                  <label className="text-sm font-medium text-billar-gray block mb-1">Stock Inicial</label>
                  <input type="number" min="0" value={productForm.stock_inicial} onChange={(e) => setProductForm(prev => ({ ...prev, stock_inicial: e.target.value }))}
                    placeholder="0"
                    className="w-full bg-black/40 border border-[#2a2a2c] rounded-lg py-2.5 px-3 text-white focus:outline-none focus:border-billar-primary font-mono" />
                </div>
              )}
            </div>
            <div className="p-6 border-t border-[#2a2a2c] bg-black/20 flex gap-3">
              <button onClick={() => setIsProductModalOpen(false)} className="flex-1 py-2.5 rounded-lg border border-[#2a2a2c] hover:bg-[#2a2a2c] text-white font-bold text-sm">Cancelar</button>
              <button onClick={handleSaveProduct} className="flex-1 py-2.5 rounded-lg bg-billar-primary hover:bg-billar-primary-dark text-white font-bold text-sm flex items-center justify-center gap-2"><Save className="w-4 h-4" /> {editingProduct ? "Guardar Cambios" : "Crear Producto"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ====== MODAL: Crear/Editar Categoría ====== */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1c] border border-[#2a2a2c] w-full max-w-md rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-[#2a2a2c] flex justify-between items-center">
              <h3 className="font-bold text-lg text-white">{editingCategory ? "Editar Categoría" : "Nueva Categoría"}</h3>
              <button onClick={() => setIsCategoryModalOpen(false)} className="p-2 hover:bg-[#2a2a2c] rounded-full text-billar-gray"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-billar-gray block mb-1">Nombre *</label>
                <input type="text" value={categoryForm.nombre} onChange={(e) => setCategoryForm(prev => ({ ...prev, nombre: e.target.value }))}
                  placeholder="Ej: Cervezas Importadas"
                  className="w-full bg-black/40 border border-[#2a2a2c] rounded-lg py-2.5 px-3 text-white focus:outline-none focus:border-billar-primary" />
              </div>
              <div>
                <label className="text-sm font-medium text-billar-gray block mb-1">Descripción</label>
                <textarea rows={3} value={categoryForm.descripcion} onChange={(e) => setCategoryForm(prev => ({ ...prev, descripcion: e.target.value }))}
                  placeholder="Ej: Cervezas internacionales premium"
                  className="w-full bg-black/40 border border-[#2a2a2c] rounded-lg py-2.5 px-3 text-white placeholder:text-billar-gray/50 focus:outline-none focus:border-billar-primary text-sm" />
              </div>
            </div>
            <div className="p-6 border-t border-[#2a2a2c] bg-black/20 flex gap-3">
              <button onClick={() => setIsCategoryModalOpen(false)} className="flex-1 py-2.5 rounded-lg border border-[#2a2a2c] hover:bg-[#2a2a2c] text-white font-bold text-sm">Cancelar</button>
              <button onClick={handleSaveCategory} className="flex-1 py-2.5 rounded-lg bg-billar-primary hover:bg-billar-primary-dark text-white font-bold text-sm flex items-center justify-center gap-2"><Save className="w-4 h-4" /> {editingCategory ? "Guardar" : "Crear Categoría"}</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
