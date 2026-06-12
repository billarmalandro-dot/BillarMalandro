"use client";

import { useState, useEffect, useRef } from "react";
import {
  Landmark, DollarSign, ArrowUpRight, ArrowDownRight, Lock, Unlock,
  RefreshCw, Plus, AlertTriangle, X, Check, Clock, Printer
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import TicketCierre, { TicketCierreData } from "@/components/TicketCierre";

export default function CajaPage() {
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeSucursalId, setActiveSucursalId] = useState("");
  const [cajaId, setCajaId] = useState("");
  const [sucursalNombre, setSucursalNombre] = useState("");

  // Estado de caja
  const [cajaAbierta, setCajaAbierta] = useState(false);
  const [arqueoActual, setArqueoActual] = useState<any>(null);
  const [movimientos, setMovimientos] = useState<any[]>([]);
  const [ventasTurno, setVentasTurno] = useState<any[]>([]);
  
  // Totales Calculados
  const [totalIngresos, setTotalIngresos] = useState(0); // manual + ventas
  const [totalEfectivo, setTotalEfectivo] = useState(0);
  const [totalQr, setTotalQr] = useState(0);
  const [totalEgresos, setTotalEgresos] = useState(0);
  const [totalVentasMesas, setTotalVentasMesas] = useState(0);
  const [totalVentasProductos, setTotalVentasProductos] = useState(0);

  // Modales
  const [isOpeningCaja, setIsOpeningCaja] = useState(false);
  const [montoInicial, setMontoInicial] = useState("");
  const [isClosingCaja, setIsClosingCaja] = useState(false);
  const [montoFinal, setMontoFinal] = useState("");
  const [observacionCierre, setObservacionCierre] = useState("");
  const [isAddingMov, setIsAddingMov] = useState(false);
  const [movTipo, setMovTipo] = useState<'ingreso' | 'egreso'>('ingreso');
  const [movMonto, setMovMonto] = useState("");
  const [movDescripcion, setMovDescripcion] = useState("");

  // Ticket
  const [ticketData, setTicketData] = useState<TicketCierreData | null>(null);
  const ticketRef = useRef<HTMLDivElement>(null);

  const supabase = createClient();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    setDbError("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let dbUser: any = null;
      if (user) {
        const { data } = await supabase.from("usuarios").select("id_usuario, nombre").eq("auth_id", user.id).single();
        dbUser = data || { id_usuario: user.id, nombre: user.email?.split("@")[0] || "Admin" };
        setCurrentUser(dbUser);
      }
      if (!dbUser) { setLoading(false); return; }

      const { data: sucursales } = await supabase.from("sucursales").select("id_sucursal, nombre");
      const sucursal = sucursales?.[0];
      const sucursalId = sucursal?.id_sucursal || "";
      setActiveSucursalId(sucursalId);
      setSucursalNombre(sucursal?.nombre || "El Malandro");

      // Obtener o crear caja
      let { data: cajas } = await supabase.from("cajas").select("*").eq("id_sucursal", sucursalId).eq("activo", true);
      let caja = cajas?.[0];
      if (!caja && sucursalId) {
        const { data: newCaja } = await supabase.from("cajas").insert({ id_sucursal: sucursalId, nombre: "Caja Principal", activo: true }).select().single();
        caja = newCaja;
      }
      if (caja) setCajaId(caja.id_caja);

      if (caja) {
        const hoy = new Date().toISOString().slice(0, 10);
        
        // Verificar si ESTE CAJERO tiene un arqueo de apertura sin cierre
        const { data: lastArqueo } = await supabase
          .from("arqueos")
          .select("*")
          .eq("id_caja", caja.id_caja)
          .eq("id_usuario", dbUser.id_usuario)
          .eq("tipo", "apertura")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        let aperturaTime = hoy + "T00:00:00";
        let isAbierta = false;

        if (lastArqueo) {
          // Buscar si hay un cierre posterior de ESTE CAJERO
          const { data: cierrePost } = await supabase
            .from("arqueos")
            .select("*")
            .eq("id_caja", caja.id_caja)
            .eq("id_usuario", dbUser.id_usuario)
            .eq("tipo", "cierre")
            .gt("created_at", lastArqueo.created_at)
            .limit(1)
            .maybeSingle();

          if (!cierrePost) {
            setCajaAbierta(true);
            setArqueoActual(lastArqueo);
            aperturaTime = lastArqueo.created_at;
            isAbierta = true;
          } else {
            setCajaAbierta(false);
            setArqueoActual(null);
          }
        } else {
          setCajaAbierta(false);
          setArqueoActual(null);
        }

        // Si la caja está abierta, buscar movimientos y ventas desde la apertura
        if (isAbierta) {
          const { data: movsData } = await supabase
            .from("movimientos_caja")
            .select("*")
            .eq("id_caja", caja.id_caja)
            .eq("id_usuario", dbUser.id_usuario)
            .gte("created_at", aperturaTime)
            .order("created_at", { ascending: false });

          const movs = movsData || [];
          setMovimientos(movs);
          
          const { data: ventasData } = await supabase
            .from("ventas")
            .select(`
              *,
              venta_items ( cantidad, precio_unitario, subtotal, productos (nombre) ),
              sesiones_mesa ( total_tiempo, mesas (tipo), tarifas (nombre, es_promocion) )
            `)
            .eq("id_sucursal", sucursalId)
            .eq("id_usuario", dbUser.id_usuario)
            .eq("estado", "completada")
            .gte("created_at", aperturaTime);
            
          const ventas = ventasData || [];
          setVentasTurno(ventas);

          // Sumatorias Manuales (Movimientos)
          const ingresosManuales = movs.filter((m: any) => m.tipo === 'ingreso');
          const egresosManuales = movs.filter((m: any) => m.tipo === 'egreso');
          
          const tIngresosManuales = ingresosManuales.reduce((s: number, m: any) => s + Number(m.monto), 0);
          const tEgresos = egresosManuales.reduce((s: number, m: any) => s + Number(m.monto), 0);
          
          // Sumatorias Ventas
          let tVentas = 0;
          let vEfectivo = 0;
          let vQr = 0;
          let tVentasProductos = 0;
          let tVentasMesas = 0;

          ventas.forEach(v => {
            const t = Number(v.total);
            tVentas += t;
            
            // Efectivo vs QR
            if (v.metodo_pago === 'efectivo' || v.metodo_pago === 'mixto') vEfectivo += t; // Simplificación
            else vQr += t;
            
            // Prod vs Mesa
            let subtotalProd = 0;
            if (v.venta_items) {
              v.venta_items.forEach((item: any) => {
                subtotalProd += Number(item.subtotal);
              });
            }
            tVentasProductos += subtotalProd;
            tVentasMesas += (t - subtotalProd); // El restante es la mesa
          });

          // Efectivo y QR de ingresos manuales
          const efManual = ingresosManuales.filter((m: any) => !m.descripcion?.toUpperCase().includes('QR')).reduce((s: number, m: any) => s + Number(m.monto), 0);
          const qrManual = ingresosManuales.filter((m: any) => m.descripcion?.toUpperCase().includes('QR')).reduce((s: number, m: any) => s + Number(m.monto), 0);
          
          setTotalIngresos(tVentas + tIngresosManuales);
          setTotalEfectivo(vEfectivo + efManual);
          setTotalQr(vQr + qrManual);
          setTotalEgresos(tEgresos);
          setTotalVentasProductos(tVentasProductos);
          setTotalVentasMesas(tVentasMesas);
        } else {
          setMovimientos([]);
          setVentasTurno([]);
          setTotalIngresos(0); setTotalEfectivo(0); setTotalQr(0); setTotalEgresos(0);
          setTotalVentasProductos(0); setTotalVentasMesas(0);
        }
      }
    } catch (err: any) {
      console.error(err);
      setDbError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAbrirCaja = async () => {
    if (!montoInicial || !cajaId || !currentUser || !activeSucursalId) return;
    try {
      await supabase.from("arqueos").insert({
        id_caja: cajaId, id_sucursal: activeSucursalId, id_usuario: currentUser.id_usuario,
        tipo: "apertura", monto_inicial: Number(montoInicial), observacion: "Apertura de caja"
      });
      await supabase.from("movimientos_caja").insert({
        id_caja: cajaId, id_sucursal: activeSucursalId, id_usuario: currentUser.id_usuario,
        tipo: "apertura", monto: Number(montoInicial), descripcion: "Apertura de caja"
      });
      setIsOpeningCaja(false);
      setMontoInicial("");
      loadData();
    } catch (err: any) { alert("Error: " + err.message); }
  };

  const saldoActual = Number(arqueoActual?.monto_inicial || 0) + totalIngresos - totalEgresos;

  const handleCerrarCaja = async () => {
    if (!montoFinal || !cajaId || !currentUser || !activeSucursalId) return;
    try {
      const cierreData = {
        id_caja: cajaId, id_sucursal: activeSucursalId, id_usuario: currentUser.id_usuario,
        tipo: "cierre", monto_inicial: Number(arqueoActual?.monto_inicial || 0), monto_final: Number(montoFinal),
        observacion: observacionCierre || "Cierre de caja"
      };

      await supabase.from("arqueos").insert(cierreData);
      await supabase.from("movimientos_caja").insert({
        id_caja: cajaId, id_sucursal: activeSucursalId, id_usuario: currentUser.id_usuario,
        tipo: "cierre", monto: Number(montoFinal), descripcion: "Cierre de caja"
      });

      // Generar Reporte Z
      generarTicketZ(cierreData);

      setIsClosingCaja(false);
      setMontoFinal("");
      setObservacionCierre("");
      loadData();
    } catch (err: any) { alert("Error al cerrar caja: " + err.message); }
  };

  const generarTicketZ = (cierreData: any) => {
    // Agrupar productos
    const productMap = new Map<string, { nombre: string, pu: number, cant: number, sub: number }>();
    ventasTurno.forEach(v => {
      if (v.venta_items) {
        v.venta_items.forEach((item: any) => {
          const name = item.productos?.nombre || "Producto";
          const pu = Number(item.precio_unitario || 0);
          const key = `${name}|${pu}`;
          
          const curr = productMap.get(key) || { nombre: name, pu, cant: 0, sub: 0 };
          productMap.set(key, {
            ...curr,
            cant: curr.cant + Number(item.cantidad),
            sub: curr.sub + Number(item.subtotal)
          });
        });
      }
    });

    const desgloseProductos = Array.from(productMap.values()).map(vals => ({
      nombre: vals.nombre,
      cantidad: vals.cant,
      precioUnitario: vals.pu,
      subtotal: vals.sub
    }));

    // Agrupar Mesas
    const mesasMap = new Map<string, { tiempo: number, sub: number }>();
    ventasTurno.forEach(v => {
      const subProd = v.venta_items ? v.venta_items.reduce((s: number, i: any) => s + Number(i.subtotal), 0) : 0;
      const subMesa = Number(v.total) - subProd;
      
      if (subMesa > 0 && v.sesiones_mesa) {
        // En ventas, puede venir como array o como obj. Verificamos:
        const sesion = Array.isArray(v.sesiones_mesa) ? v.sesiones_mesa[0] : v.sesiones_mesa;
        if (sesion) {
          let label = sesion.mesas?.tipo || "billar";
          if (sesion.tarifas?.es_promocion) {
            label = `${sesion.tarifas.nombre}`;
          }
          
          const t = Number(sesion.total_tiempo || 0);
          const curr = mesasMap.get(label) || { tiempo: 0, sub: 0 };
          mesasMap.set(label, { tiempo: curr.tiempo + t, sub: curr.sub + subMesa });
        }
      }
    });

    const desgloseMesas = Array.from(mesasMap.entries()).map(([tipo, vals]) => ({
      tipo,
      tiempoTotal: vals.tiempo.toFixed(1) + "h",
      subtotal: vals.sub
    }));

    const ingresosAdicionales = movimientos.filter((m: any) => m.tipo === 'ingreso').reduce((s: number, m: any) => s + Number(m.monto), 0);

    const data: TicketCierreData = {
      sucursalNombre: sucursalNombre,
      cajeroNombre: currentUser?.nombre || "Cajero",
      fechaApertura: arqueoActual?.created_at || new Date().toISOString(),
      fechaCierre: new Date().toISOString(),
      montoInicial: Number(arqueoActual?.monto_inicial || 0),
      totalVentasProductos: totalVentasProductos,
      totalVentasMesas: totalVentasMesas,
      totalIngresosAdicionales: ingresosAdicionales,
      totalEgresos: totalEgresos,
      saldoEstimado: saldoActual,
      montoCierreReal: cierreData.monto_final,
      diferencia: cierreData.monto_final - saldoActual,
      observacion: cierreData.observacion,
      desgloseProductos,
      desgloseMesas,
      metodosPago: {
        efectivo: totalEfectivo,
        qr: totalQr
      }
    };

    setTicketData(data);
  };

  const handleAddMovimiento = async () => {
    if (!movMonto || !cajaId || !currentUser || !activeSucursalId) return;
    try {
      await supabase.from("movimientos_caja").insert({
        id_caja: cajaId, id_sucursal: activeSucursalId, id_usuario: currentUser.id_usuario,
        tipo: movTipo, monto: Number(movMonto), descripcion: movDescripcion || (movTipo === 'ingreso' ? "Ingreso manual" : "Egreso manual")
      });
      setIsAddingMov(false);
      setMovMonto("");
      setMovDescripcion("");
      loadData();
    } catch (err: any) { alert("Error: " + err.message); }
  };

  if (loading) {
    return (<div className="flex flex-col items-center justify-center py-24 text-billanga-gray"><RefreshCw className="w-10 h-10 animate-spin text-billanga-primary mb-4" /><p className="text-sm">Cargando control de caja...</p></div>);
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">
      
      {/* Modal de Ticket Z (sobre todo) */}
      {ticketData && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[100] flex flex-col items-center overflow-y-auto p-4 print:bg-white print:p-0">
          <button 
            onClick={() => setTicketData(null)}
            className="absolute top-4 right-4 p-2 bg-[#2a2a2c] hover:bg-red-500/20 text-white hover:text-red-400 rounded-full transition-all print:hidden z-10"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="text-center mt-2 mb-3 print:hidden shrink-0">
            <h2 className="text-lg font-bold text-white mb-1">Turno Cerrado Exitosamente</h2>
            <p className="text-billanga-gray text-sm">Aquí tienes el ticket de cierre Z.</p>
          </div>

          <TicketCierre data={ticketData} ref={ticketRef} />
          <div className="h-4 shrink-0" />
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Landmark className="w-7 h-7 text-billanga-primary" /> Control de Caja</h2>
          <p className="text-sm text-billanga-gray">Apertura, cierre y movimientos de caja diarios.</p>
        </div>
        <button onClick={loadData} className="flex items-center gap-2 px-4 py-2 border border-[#2a2a2c] hover:bg-[#2a2a2c] text-white rounded-lg text-sm transition-all"><RefreshCw className="w-4 h-4" /> Refrescar</button>
      </div>

      {dbError && (<div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl flex items-start gap-3 print:hidden"><AlertTriangle className="w-6 h-6 shrink-0" /><div><h4 className="font-bold text-white">Error</h4><p className="text-sm">{dbError}</p></div></div>)}

      {/* Estado de Caja */}
      <div className={`border rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 print:hidden ${cajaAbierta ? "bg-green-500/5 border-green-500/30" : "bg-[#1a1a1c] border-[#2a2a2c]"}`}>
        <div className="flex items-center gap-4">
          <div className={`p-4 rounded-2xl ${cajaAbierta ? "bg-green-500/10" : "bg-[#2a2a2c]"}`}>
            {cajaAbierta ? <Unlock className="w-8 h-8 text-green-500" /> : <Lock className="w-8 h-8 text-billanga-gray" />}
          </div>
          <div>
            <h3 className="text-xl font-black text-white">{cajaAbierta ? "Caja Abierta" : "Caja Cerrada"}</h3>
            <p className="text-sm text-billanga-gray">
              {cajaAbierta ? `Apertura: ${new Date(arqueoActual?.created_at).toLocaleString("es-BO")} — Monto inicial: Bs. ${Number(arqueoActual?.monto_inicial || 0).toFixed(2)}` : "No hay una caja abierta actualmente."}
            </p>
          </div>
        </div>
        {cajaAbierta ? (
          <div className="flex gap-3">
            <button onClick={() => { setMovTipo('ingreso'); setIsAddingMov(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-xl text-sm font-bold transition-all"><Plus className="w-4 h-4" /> Ingreso</button>
            <button onClick={() => { setMovTipo('egreso'); setIsAddingMov(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-sm font-bold transition-all"><ArrowDownRight className="w-4 h-4" /> Egreso</button>
            <button onClick={() => setIsClosingCaja(true)} className="flex items-center gap-2 px-4 py-2.5 bg-billanga-primary hover:bg-billanga-primary-dark text-white rounded-xl text-sm font-bold transition-all"><Lock className="w-4 h-4" /> Cerrar Caja</button>
          </div>
        ) : (
          <button onClick={() => setIsOpeningCaja(true)} className="flex items-center gap-2 px-6 py-3 bg-billanga-primary hover:bg-billanga-primary-dark text-white rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(220, 38, 38,0.3)]"><Unlock className="w-5 h-5" /> Abrir Caja</button>
        )}
      </div>

      {/* Resumen Rápido */}
      {cajaAbierta && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 print:hidden">
          {/* Tarjeta de Ingresos con Desglose */}
          <div className="bg-[#1a1a1c] border border-[#2a2a2c] rounded-2xl p-6 flex items-start gap-4 transition-all hover:border-[#3a3a3c]">
            <div className="p-3 bg-green-500/10 rounded-xl mt-1">
              <ArrowUpRight className="w-6 h-6 text-green-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-billanga-gray mb-1">Total Ingresos</p>
              <h3 className="text-3xl font-black text-green-500 tracking-tight">Bs. {totalIngresos.toFixed(2)}</h3>
              
              <div className="mt-4 pt-4 border-t border-[#2a2a2c] flex justify-between">
                <div>
                  <p className="text-xs text-billanga-gray">Efectivo</p>
                  <p className="text-sm font-bold text-white">Bs. {totalEfectivo.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-billanga-gray">QR / Transf.</p>
                  <p className="text-sm font-bold text-white">Bs. {totalQr.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-[#1a1a1c] border border-[#2a2a2c] rounded-xl p-5">
            <div className="flex items-center gap-3"><div className="p-2.5 bg-red-500/10 rounded-xl"><ArrowDownRight className="w-5 h-5 text-red-400" /></div><div><p className="text-xs text-billanga-gray">Total Egresos</p><p className="text-2xl font-black text-red-400">Bs. {totalEgresos.toFixed(2)}</p></div></div>
          </div>
          <div className="bg-[#1a1a1c] border border-[#2a2a2c] rounded-xl p-5">
            <div className="flex items-center gap-3"><div className="p-2.5 bg-blue-500/10 rounded-xl"><DollarSign className="w-5 h-5 text-blue-400" /></div><div><p className="text-xs text-billanga-gray">Saldo Estimado</p><p className="text-2xl font-black text-white">Bs. {saldoActual.toFixed(2)}</p></div></div>
          </div>
        </div>
      )}

      {/* Movimientos del Día */}
      <div className="bg-[#1a1a1c] border border-[#2a2a2c] rounded-xl overflow-hidden print:hidden">
        <div className="p-5 border-b border-[#2a2a2c]"><h3 className="font-bold text-white flex items-center gap-2"><Clock className="w-5 h-5 text-billanga-primary" /> Movimientos del Turno</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead><tr className="border-b border-[#2a2a2c] text-xs font-bold text-billanga-gray tracking-wider uppercase bg-[#141416]/50">
              <th className="py-3 pl-6">Hora</th><th className="py-3">Tipo</th><th className="py-3 text-right">Monto</th><th className="py-3 pr-6">Descripción</th>
            </tr></thead>
            <tbody>
              {movimientos.length > 0 ? movimientos.map((m: any) => {
                const isPositive = m.tipo === 'ingreso' || m.tipo === 'apertura';
                return (
                  <tr key={m.id_mov_caja} className="border-b border-[#2a2a2c]/40 hover:bg-white/[0.02] transition-colors text-sm">
                    <td className="py-3 pl-6 text-billanga-gray text-xs">{new Date(m.created_at).toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" })}</td>
                    <td className="py-3"><span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${isPositive ? "bg-green-500/10 text-green-500" : m.tipo === 'cierre' ? "bg-blue-500/10 text-blue-400" : "bg-red-500/10 text-red-400"}`}>{m.tipo}</span></td>
                    <td className={`py-3 text-right font-bold ${isPositive ? "text-green-400" : "text-red-400"}`}>{isPositive ? "+" : "-"} Bs. {Number(m.monto).toFixed(2)}</td>
                    <td className="py-3 pr-6 text-billanga-gray text-xs truncate max-w-[200px]">{m.descripcion || "—"}</td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={4} className="py-12 text-center text-billanga-gray text-sm">No hay movimientos manuales registrados en este turno.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Abrir Caja */}
      {isOpeningCaja && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1c] border border-[#2a2a2c] w-full max-w-md rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-[#2a2a2c] flex justify-between items-center"><h3 className="font-bold text-lg text-white">Abrir Caja</h3><button onClick={() => setIsOpeningCaja(false)} className="p-2 hover:bg-[#2a2a2c] rounded-full text-billanga-gray"><X className="w-5 h-5" /></button></div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-billanga-gray">Ingresa el monto con el que se abre la caja (fondo de cambio).</p>
              <div><label className="text-sm font-medium text-billanga-gray block mb-1">Monto Inicial (Bs.)</label><input type="number" step="0.01" min="0" value={montoInicial} onChange={e => setMontoInicial(e.target.value)} placeholder="0.00" className="w-full bg-black/40 border border-[#2a2a2c] rounded-lg py-3 px-4 text-white text-2xl font-mono focus:outline-none focus:border-billanga-primary text-center" /></div>
            </div>
            <div className="p-6 border-t border-[#2a2a2c] bg-black/20 flex gap-3">
              <button onClick={() => setIsOpeningCaja(false)} className="flex-1 py-2.5 rounded-lg border border-[#2a2a2c] hover:bg-[#2a2a2c] text-white font-bold text-sm">Cancelar</button>
              <button onClick={handleAbrirCaja} className="flex-1 py-2.5 rounded-lg bg-green-600 hover:bg-green-500 text-white font-bold text-sm flex items-center justify-center gap-2"><Unlock className="w-4 h-4" /> Abrir Caja</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Cerrar Caja */}
      {isClosingCaja && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1c] border border-[#2a2a2c] w-full max-w-md rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-[#2a2a2c] flex justify-between items-center"><h3 className="font-bold text-lg text-white">Cerrar Caja</h3><button onClick={() => setIsClosingCaja(false)} className="p-2 hover:bg-[#2a2a2c] rounded-full text-billanga-gray"><X className="w-5 h-5" /></button></div>
            <div className="p-6 space-y-4">
              <div className="bg-black/30 p-4 rounded-xl grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-billanga-gray text-xs block">Monto Inicial</span><span className="text-white font-bold">Bs. {Number(arqueoActual?.monto_inicial || 0).toFixed(2)}</span></div>
                <div><span className="text-billanga-gray text-xs block">Saldo Estimado</span><span className="text-white font-bold">Bs. {saldoActual.toFixed(2)}</span></div>
              </div>
              <div><label className="text-sm font-medium text-billanga-gray block mb-1">Monto Final Contado (Bs.)</label><input type="number" step="0.01" min="0" value={montoFinal} onChange={e => setMontoFinal(e.target.value)} placeholder="0.00" className="w-full bg-black/40 border border-[#2a2a2c] rounded-lg py-3 px-4 text-white text-2xl font-mono focus:outline-none focus:border-billanga-primary text-center" /></div>
              {montoFinal && (<div className={`p-3 rounded-lg text-center font-bold text-sm ${Number(montoFinal) - saldoActual >= 0 ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>Diferencia: Bs. {(Number(montoFinal) - saldoActual).toFixed(2)}</div>)}
              <div><label className="text-sm font-medium text-billanga-gray block mb-1">Observación (opcional)</label><textarea rows={2} value={observacionCierre} onChange={e => setObservacionCierre(e.target.value)} placeholder="Notas del cierre..." className="w-full bg-black/40 border border-[#2a2a2c] rounded-lg py-2.5 px-3 text-white placeholder:text-billanga-gray/50 focus:outline-none focus:border-billanga-primary text-sm" /></div>
            </div>
            <div className="p-6 border-t border-[#2a2a2c] bg-black/20 flex gap-3">
              <button onClick={() => setIsClosingCaja(false)} className="flex-1 py-2.5 rounded-lg border border-[#2a2a2c] hover:bg-[#2a2a2c] text-white font-bold text-sm">Cancelar</button>
              <button onClick={handleCerrarCaja} className="flex-1 py-2.5 rounded-lg bg-billanga-primary hover:bg-billanga-primary-dark text-white font-bold text-sm flex items-center justify-center gap-2"><Lock className="w-4 h-4" /> Cerrar y Generar Reporte</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Agregar Movimiento */}
      {isAddingMov && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1c] border border-[#2a2a2c] w-full max-w-md rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-[#2a2a2c] flex justify-between items-center"><h3 className="font-bold text-lg text-white">Registrar {movTipo === 'ingreso' ? 'Ingreso' : 'Egreso'}</h3><button onClick={() => setIsAddingMov(false)} className="p-2 hover:bg-[#2a2a2c] rounded-full text-billanga-gray"><X className="w-5 h-5" /></button></div>
            <div className="p-6 space-y-4">
              <div><label className="text-sm font-medium text-billanga-gray block mb-1">Monto (Bs.)</label><input type="number" step="0.01" min="0.01" value={movMonto} onChange={e => setMovMonto(e.target.value)} placeholder="0.00" className="w-full bg-black/40 border border-[#2a2a2c] rounded-lg py-3 px-4 text-white text-xl font-mono focus:outline-none focus:border-billanga-primary text-center" /></div>
              <div><label className="text-sm font-medium text-billanga-gray block mb-1">Descripción</label><input type="text" value={movDescripcion} onChange={e => setMovDescripcion(e.target.value)} placeholder="Ej: Pago a proveedor, Vuelto cliente..." className="w-full bg-black/40 border border-[#2a2a2c] rounded-lg py-2.5 px-3 text-white focus:outline-none focus:border-billanga-primary" /></div>
            </div>
            <div className="p-6 border-t border-[#2a2a2c] bg-black/20 flex gap-3">
              <button onClick={() => setIsAddingMov(false)} className="flex-1 py-2.5 rounded-lg border border-[#2a2a2c] hover:bg-[#2a2a2c] text-white font-bold text-sm">Cancelar</button>
              <button onClick={handleAddMovimiento} className={`flex-1 py-2.5 rounded-lg text-white font-bold text-sm flex items-center justify-center gap-2 ${movTipo === 'ingreso' ? "bg-green-600 hover:bg-green-500" : "bg-orange-600 hover:bg-orange-500"}`}><Check className="w-4 h-4" /> Registrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
