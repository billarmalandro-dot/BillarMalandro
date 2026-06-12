"use client";

import { useState, useEffect } from "react";
import {
  Receipt, Search, Eye, XCircle, RefreshCw, Calendar,
  Banknote, TrendingUp, ShoppingBag, AlertTriangle, X, CreditCard,
  Plus, Lock
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import VentaDirectaPOS from "@/components/VentaDirectaPOS";

interface VentaRow {
  id_venta: string;
  total: number;
  metodo_pago: string;
  estado: string;
  created_at: string;
  sesiones_mesa: any;
  usuarios: any;
  venta_items: any[];
}

export default function VentasPage() {
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState("");
  const [ventas, setVentas] = useState<VentaRow[]>([]);
  const [isDirectPOSOpen, setIsDirectPOSOpen] = useState(false);
  const [cajaAbierta, setCajaAbierta] = useState(true);

  // Filtros
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("all");
  const [filtroMetodo, setFiltroMetodo] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Detalle
  const [selectedVenta, setSelectedVenta] = useState<VentaRow | null>(null);

  const supabase = createClient();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    setDbError("");
    try {
      // 0. Obtener usuario autenticado y su rol/nivel
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("No hay usuario autenticado.");
      
      const { data: dbUser } = await supabase
        .from("usuarios")
        .select("id_usuario, nombre, roles(nombre, nivel)")
        .eq("auth_id", user.id)
        .single();

      // 1. Obtener sucursal actual para revisar la caja
      const { data: sucursales } = await supabase.from("sucursales").select("id_sucursal");
      const sucursalId = sucursales?.[0]?.id_sucursal || "";

      // 2. Verificar Caja Abierta
      const { data: cajas } = await supabase.from("cajas").select("id_caja").eq("id_sucursal", sucursalId).eq("activo", true).limit(1).maybeSingle();
      if (cajas && dbUser) {
        const rolesData = dbUser.roles;
        const rolesObj = Array.isArray(rolesData) ? rolesData[0] : rolesData;
        const userNivel = rolesObj?.nivel || 0;
        const userRol = rolesObj?.nombre || "";

        if (userNivel >= 4) {
          // Admin y Superadmin pueden ver y operar siempre (by-pass de seguridad para supervisión)
          setCajaAbierta(true);
        } else if (userRol === 'cajero') {
          // Si es cajero, verificar que ESTE cajero específico tenga su caja abierta
          const { data: lastArqueo } = await supabase
            .from("arqueos")
            .select("*")
            .eq("id_caja", cajas.id_caja)
            .eq("id_usuario", dbUser.id_usuario)
            .eq("tipo", "apertura")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (lastArqueo) {
            const { data: cierrePost } = await supabase
              .from("arqueos")
              .select("*")
              .eq("id_caja", cajas.id_caja)
              .eq("id_usuario", dbUser.id_usuario)
              .eq("tipo", "cierre")
              .gt("created_at", lastArqueo.created_at)
              .limit(1)
              .maybeSingle();

            setCajaAbierta(!cierrePost);
          } else {
            setCajaAbierta(false);
          }
        } else {
          // Otros roles: verificar si hay al menos una caja abierta en general
          const { data: lastArqueo } = await supabase.from("arqueos").select("*").eq("id_caja", cajas.id_caja).eq("tipo", "apertura").order("created_at", { ascending: false }).limit(1).maybeSingle();
          if (lastArqueo) {
            const { data: cierrePost } = await supabase.from("arqueos").select("*").eq("id_caja", cajas.id_caja).eq("tipo", "cierre").gt("created_at", lastArqueo.created_at).limit(1).maybeSingle();
            setCajaAbierta(!cierrePost);
          } else {
            setCajaAbierta(false);
          }
        }
      } else {
        setCajaAbierta(false);
      }

      // 3. Cargar ventas
      let query = supabase
        .from("ventas")
        .select(`
          id_venta, total, metodo_pago, estado, created_at,
          sesiones_mesa:id_sesion(id_sesion, mesas:id_mesa(numero, nombre)),
          usuarios:id_usuario(nombre),
          venta_items(id_venta_item, cantidad, precio_unitario, subtotal, productos:id_producto(nombre))
        `)
        .order("created_at", { ascending: false })
        .limit(100);

      const { data, error } = await query;
      if (error) throw error;

      const normalized = (data || []).map((v: any) => ({
        ...v,
        sesiones_mesa: Array.isArray(v.sesiones_mesa) ? v.sesiones_mesa[0] : v.sesiones_mesa,
        usuarios: Array.isArray(v.usuarios) ? v.usuarios[0] : v.usuarios,
        venta_items: (v.venta_items || []).map((item: any) => ({
          ...item,
          productos: Array.isArray(item.productos) ? item.productos[0] : item.productos
        }))
      }));
      setVentas(normalized);
    } catch (err: any) {
      console.error(err);
      setDbError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAnular = async (venta: VentaRow) => {
    if (!confirm("¿Estás seguro de anular esta venta?")) return;
    try {
      await supabase.from("ventas").update({ estado: "anulada" }).eq("id_venta", venta.id_venta);
      loadData();
    } catch (err: any) { alert("Error: " + err.message); }
  };

  // Filtrado local
  const filtered = ventas.filter(v => {
    if (filtroEstado !== "all" && v.estado !== filtroEstado) return false;
    if (filtroMetodo !== "all" && v.metodo_pago !== filtroMetodo) return false;
    if (fechaDesde && new Date(v.created_at) < new Date(fechaDesde)) return false;
    if (fechaHasta && new Date(v.created_at) > new Date(fechaHasta + "T23:59:59")) return false;
    if (searchQuery && !v.id_venta.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Resumen del día
  const hoy = new Date().toISOString().slice(0, 10);
  const ventasHoy = ventas.filter(v => v.created_at.slice(0, 10) === hoy && v.estado === "completada");
  const ingresosHoy = ventasHoy.reduce((s, v) => s + Number(v.total), 0);
  const metodos = ventasHoy.reduce((acc: Record<string, number>, v) => { acc[v.metodo_pago] = (acc[v.metodo_pago] || 0) + 1; return acc; }, {});
  const metodoTop = Object.entries(metodos).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

  const estadoBadge = (estado: string) => {
    switch (estado) {
      case "completada": return "bg-green-500/10 text-green-500";
      case "pendiente": return "bg-yellow-500/10 text-yellow-500";
      case "anulada": return "bg-red-500/10 text-red-400";
      default: return "bg-[#2a2a2c] text-billanga-gray";
    }
  };

  if (loading) {
    return (<div className="flex flex-col items-center justify-center py-24 text-billanga-gray"><RefreshCw className="w-10 h-10 animate-spin text-billanga-primary mb-4" /><p className="text-sm">Cargando historial de ventas...</p></div>);
  }

  if (!cajaAbierta) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in zoom-in duration-500">
        <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
          <Lock className="w-12 h-12 text-billanga-primary" />
        </div>
        <h2 className="text-3xl font-black text-white mb-3">Caja Cerrada</h2>
        <p className="text-billanga-gray text-center max-w-md mb-8">
          Por razones de seguridad, no puedes acceder al módulo de ventas ni cobrar productos hasta que inicies tu turno y abras la caja.
        </p>
        <a href="/dashboard/caja" className="px-8 py-3 bg-billanga-primary hover:bg-billanga-primary-dark text-white font-bold rounded-xl flex items-center gap-2 shadow-[0_0_20px_rgba(220, 38, 38,0.4)] transition-all">
          Ir a Abrir Caja
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Receipt className="w-7 h-7 text-billanga-primary" /> Historial de Ventas</h2>
          <p className="text-sm text-billanga-gray">Revisa, filtra y gestiona todas las ventas registradas.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setIsDirectPOSOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-billanga-primary hover:bg-billanga-primary-dark text-white font-bold rounded-lg text-sm transition-all shadow-[0_0_15px_rgba(220, 38, 38,0.3)]"><Plus className="w-4 h-4" /> Venta Directa</button>
          <button onClick={loadData} className="flex items-center gap-2 px-4 py-2 border border-[#2a2a2c] hover:bg-[#2a2a2c] text-white rounded-lg text-sm transition-all"><RefreshCw className="w-4 h-4" /> Refrescar</button>
        </div>
      </div>

      {dbError && (<div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl flex items-start gap-3"><AlertTriangle className="w-6 h-6 shrink-0" /><div><h4 className="font-bold text-white">Error</h4><p className="text-sm">{dbError}</p></div></div>)}

      {/* Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#1a1a1c] border border-[#2a2a2c] rounded-xl p-5">
          <div className="flex items-center gap-3"><div className="p-2.5 bg-billanga-primary/10 rounded-xl"><ShoppingBag className="w-5 h-5 text-billanga-primary" /></div><div><p className="text-xs text-billanga-gray">Ventas Hoy</p><p className="text-2xl font-black text-white">{ventasHoy.length}</p></div></div>
        </div>
        <div className="bg-[#1a1a1c] border border-[#2a2a2c] rounded-xl p-5">
          <div className="flex items-center gap-3"><div className="p-2.5 bg-green-500/10 rounded-xl"><TrendingUp className="w-5 h-5 text-green-500" /></div><div><p className="text-xs text-billanga-gray">Ingresos Hoy</p><p className="text-2xl font-black text-white">Bs. {ingresosHoy.toFixed(2)}</p></div></div>
        </div>
        <div className="bg-[#1a1a1c] border border-[#2a2a2c] rounded-xl p-5">
          <div className="flex items-center gap-3"><div className="p-2.5 bg-blue-500/10 rounded-xl"><CreditCard className="w-5 h-5 text-blue-400" /></div><div><p className="text-xs text-billanga-gray">Método Más Usado</p><p className="text-2xl font-black text-white capitalize">{metodoTop}</p></div></div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-[#1a1a1c] border border-[#2a2a2c] p-4 rounded-xl flex flex-wrap gap-3 items-center">
        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-billanga-gray/50" /><input type="text" placeholder="Buscar por ID..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="bg-black/40 border border-[#2a2a2c] rounded-lg py-2 pl-10 pr-3 text-sm text-white w-44 focus:outline-none focus:border-billanga-primary" /></div>
        <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} className="bg-black/40 border border-[#2a2a2c] rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-billanga-primary" />
        <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} className="bg-black/40 border border-[#2a2a2c] rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-billanga-primary" />
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="bg-black/40 border border-[#2a2a2c] rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-billanga-primary">
          <option value="all">Todos los Estados</option><option value="completada">Completada</option><option value="pendiente">Pendiente</option><option value="anulada">Anulada</option>
        </select>
        <select value={filtroMetodo} onChange={e => setFiltroMetodo(e.target.value)} className="bg-black/40 border border-[#2a2a2c] rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-billanga-primary">
          <option value="all">Todos los Métodos</option><option value="efectivo">Efectivo</option><option value="tarjeta">Tarjeta</option><option value="qr">QR</option>
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-[#1a1a1c] border border-[#2a2a2c] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead><tr className="border-b border-[#2a2a2c] text-xs font-bold text-billanga-gray tracking-wider uppercase bg-[#141416]/50">
              <th className="py-4 pl-6">Fecha</th><th className="py-4">Mesa</th><th className="py-4">Atendió</th><th className="py-4 text-center">Items</th><th className="py-4 text-right">Total</th><th className="py-4 text-center">Método</th><th className="py-4 text-center">Estado</th><th className="py-4 pr-6 text-center">Acciones</th>
            </tr></thead>
            <tbody>
              {filtered.length > 0 ? filtered.map(v => {
                const mesa = v.sesiones_mesa?.mesas;
                const mesaInfo = Array.isArray(mesa) ? mesa[0] : mesa;
                return (
                  <tr key={v.id_venta} className="border-b border-[#2a2a2c]/40 hover:bg-white/[0.02] transition-colors text-sm text-white">
                    <td className="py-3 pl-6 text-xs"><div>{new Date(v.created_at).toLocaleDateString("es-BO")}</div><div className="text-billanga-gray">{new Date(v.created_at).toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" })}</div></td>
                    <td className="py-3">{mesaInfo ? `Mesa ${mesaInfo.numero}` : "—"}</td>
                    <td className="py-3 text-billanga-gray text-xs">{v.usuarios?.nombre || "—"}</td>
                    <td className="py-3 text-center"><span className="bg-[#2a2a2c] px-2 py-0.5 rounded-full text-xs font-bold">{v.venta_items?.length || 0}</span></td>
                    <td className="py-3 text-right font-bold">Bs. {Number(v.total).toFixed(2)}</td>
                    <td className="py-3 text-center"><span className="capitalize text-xs">{v.metodo_pago}</span></td>
                    <td className="py-3 text-center"><span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${estadoBadge(v.estado)}`}>{v.estado}</span></td>
                    <td className="py-3 pr-6 text-center flex gap-2 justify-center">
                      <button onClick={() => setSelectedVenta(v)} className="p-1.5 hover:bg-[#2a2a2c] rounded-lg text-billanga-gray hover:text-white transition-all" title="Ver detalle"><Eye className="w-4 h-4" /></button>
                      {v.estado === "completada" && <button onClick={() => handleAnular(v)} className="p-1.5 hover:bg-red-500/10 rounded-lg text-billanga-gray hover:text-red-400 transition-all" title="Anular"><XCircle className="w-4 h-4" /></button>}
                    </td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={8} className="py-12 text-center text-billanga-gray text-sm">No hay ventas registradas con estos filtros.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detalle */}
      {selectedVenta && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1c] border border-[#2a2a2c] w-full max-w-lg rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-[#2a2a2c] flex justify-between items-center">
              <h3 className="font-bold text-lg text-white">Detalle de Venta</h3>
              <button onClick={() => setSelectedVenta(null)} className="p-2 hover:bg-[#2a2a2c] rounded-full text-billanga-gray"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-billanga-gray text-xs block">Fecha</span><span className="text-white font-bold">{new Date(selectedVenta.created_at).toLocaleString("es-BO")}</span></div>
                <div><span className="text-billanga-gray text-xs block">Estado</span><span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${estadoBadge(selectedVenta.estado)}`}>{selectedVenta.estado}</span></div>
                <div><span className="text-billanga-gray text-xs block">Método de Pago</span><span className="text-white font-bold capitalize">{selectedVenta.metodo_pago}</span></div>
                <div><span className="text-billanga-gray text-xs block">Atendió</span><span className="text-white font-bold">{selectedVenta.usuarios?.nombre || "—"}</span></div>
              </div>
              <div className="border-t border-[#2a2a2c] pt-4">
                <h4 className="text-xs font-bold text-billanga-gray uppercase tracking-wider mb-3">Productos</h4>
                <div className="space-y-2">
                  {selectedVenta.venta_items?.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between items-center bg-black/30 p-3 rounded-lg text-sm">
                      <div><span className="text-white font-bold">{item.productos?.nombre || "Producto"}</span><span className="text-billanga-gray text-xs ml-2">x{Number(item.cantidad).toFixed(0)}</span></div>
                      <span className="font-bold text-white">Bs. {Number(item.subtotal).toFixed(2)}</span>
                    </div>
                  ))}
                  {(!selectedVenta.venta_items || selectedVenta.venta_items.length === 0) && <p className="text-billanga-gray text-sm text-center py-4">Solo tiempo de juego (sin productos adicionales)</p>}
                </div>
              </div>
              <div className="bg-billanga-primary/10 border border-billanga-primary/30 p-4 rounded-xl flex justify-between items-center">
                <span className="text-sm text-billanga-primary font-bold uppercase">Total</span>
                <span className="text-2xl font-black text-white">Bs. {Number(selectedVenta.total).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {isDirectPOSOpen && (
        <VentaDirectaPOS 
          onClose={() => setIsDirectPOSOpen(false)}
          onSuccess={() => { setIsDirectPOSOpen(false); loadData(); }}
        />
      )}
    </div>
  );
}
