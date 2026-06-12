"use client";

import { useState, useEffect } from "react";
import {
  BarChart3, Calendar, Download, RefreshCw, AlertTriangle,
  TrendingUp, ShoppingBag, Banknote, Users
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export default function ReportesPage() {
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState("");
  const [ventas, setVentas] = useState<any[]>([]);

  // Filtros
  const [rangoFechas, setRangoFechas] = useState("mes"); // hoy, semana, mes, año
  
  const supabase = createClient();

  useEffect(() => { loadData(); }, [rangoFechas]);

  const loadData = async () => {
    setLoading(true);
    setDbError("");
    try {
      const hoy = new Date();
      let fechaInicio = new Date();
      
      switch (rangoFechas) {
        case "hoy": fechaInicio.setHours(0,0,0,0); break;
        case "semana": fechaInicio.setDate(hoy.getDate() - 7); break;
        case "mes": fechaInicio.setMonth(hoy.getMonth() - 1); break;
        case "año": fechaInicio.setFullYear(hoy.getFullYear() - 1); break;
      }

      const { data: vData, error: vError } = await supabase
        .from("ventas")
        .select(`
          id_venta, total, metodo_pago, estado, created_at,
          venta_items(cantidad, subtotal, productos:id_producto(nombre, id_categoria, precio_costo))
        `)
        .eq("estado", "completada")
        .gte("created_at", fechaInicio.toISOString());
      
      if (vError) throw vError;
      setVentas(vData || []);

    } catch (err: any) {
      console.error(err);
      setDbError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- Kpis ---
  let totalIngresos = 0;
  let ingresosProductos = 0;
  let costoProductos = 0;

  ventas.forEach(v => {
    totalIngresos += Number(v.total);
    let subProductosVenta = 0;

    (v.venta_items || []).forEach((item: any) => {
      subProductosVenta += Number(item.subtotal);
      
      const prod = Array.isArray(item.productos) ? item.productos[0] : item.productos;
      if (prod) {
        const pCosto = Number(prod.precio_costo || 0);
        costoProductos += (pCosto * Number(item.cantidad));
      }
    });

    ingresosProductos += subProductosVenta;
  });

  const ingresosMesas = Math.max(0, totalIngresos - ingresosProductos);
  const gananciaProductos = Math.max(0, ingresosProductos - costoProductos);
  
  const totalVentas = ventas.length;
  const ticketPromedio = totalVentas > 0 ? totalIngresos / totalVentas : 0;
  
  // Metodos de pago
  const metodos = ventas.reduce((acc, v) => {
    acc[v.metodo_pago] = (acc[v.metodo_pago] || 0) + Number(v.total);
    return acc;
  }, {} as Record<string, number>);

  // Productos mas vendidos (rentabilidad)
  const productosMap = new Map<string, { nombre: string, cantidad: number, ingresos: number, costo: number, ganancia: number }>();
  ventas.forEach(v => {
    (v.venta_items || []).forEach((item: any) => {
      const prod = Array.isArray(item.productos) ? item.productos[0] : item.productos;
      if (!prod) return;
      const key = prod.nombre;
      const current = productosMap.get(key) || { nombre: key, cantidad: 0, ingresos: 0, costo: 0, ganancia: 0 };
      
      current.cantidad += Number(item.cantidad);
      current.ingresos += Number(item.subtotal);
      const itemCosto = Number(prod.precio_costo || 0) * Number(item.cantidad);
      current.costo += itemCosto;
      current.ganancia = current.ingresos - current.costo;
      
      productosMap.set(key, current);
    });
  });
  const topProductos = Array.from(productosMap.values()).sort((a, b) => b.ganancia - a.ganancia).slice(0, 5);

  if (loading) {
    return (<div className="flex flex-col items-center justify-center py-24 text-billar-gray"><RefreshCw className="w-10 h-10 animate-spin text-billar-primary mb-4" /><p className="text-sm">Generando reportes...</p></div>);
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2"><BarChart3 className="w-7 h-7 text-billar-primary" /> Reportes & Estadísticas</h2>
          <p className="text-sm text-billar-gray">Métricas financieras y rendimiento de ventas de la sucursal.</p>
        </div>
        <div className="flex gap-2">
          <select value={rangoFechas} onChange={e => setRangoFechas(e.target.value)} className="bg-black/40 border border-[#2a2a2c] rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-billar-primary">
            <option value="hoy">Hoy</option><option value="semana">Últimos 7 días</option><option value="mes">Último mes</option><option value="año">Último año</option>
          </select>
          <button onClick={loadData} className="p-2 border border-[#2a2a2c] hover:bg-[#2a2a2c] text-white rounded-lg transition-all"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      {dbError && (<div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl flex items-start gap-3"><AlertTriangle className="w-6 h-6 shrink-0" /><div><h4 className="font-bold text-white">Error</h4><p className="text-sm">{dbError}</p></div></div>)}

      {/* KPIs Principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1a1a1c] border border-[#2a2a2c] rounded-xl p-5">
          <div className="flex items-center gap-3"><div className="p-3 bg-green-500/10 rounded-xl"><TrendingUp className="w-6 h-6 text-green-500" /></div><div><p className="text-xs text-billar-gray uppercase tracking-wider">Ingresos Globales</p><p className="text-2xl font-black text-white mt-1">Bs. {totalIngresos.toFixed(2)}</p></div></div>
        </div>
        <div className="bg-[#1a1a1c] border border-[#2a2a2c] rounded-xl p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 opacity-10"><BarChart3 className="w-16 h-16 text-billar-primary" /></div>
          <div className="flex items-center gap-3 relative z-10"><div className="p-3 bg-billar-primary/10 rounded-xl"><Calendar className="w-6 h-6 text-billar-primary" /></div><div><p className="text-xs text-billar-gray uppercase tracking-wider">Ingresos Mesas</p><p className="text-2xl font-black text-white mt-1">Bs. {ingresosMesas.toFixed(2)}</p></div></div>
        </div>
        <div className="bg-[#1a1a1c] border border-[#2a2a2c] rounded-xl p-5">
          <div className="flex items-center gap-3"><div className="p-3 bg-blue-500/10 rounded-xl"><ShoppingBag className="w-6 h-6 text-blue-400" /></div><div><p className="text-xs text-billar-gray uppercase tracking-wider">Venta Productos</p><p className="text-2xl font-black text-white mt-1">Bs. {ingresosProductos.toFixed(2)}</p></div></div>
        </div>
        <div className="bg-[#1a1a1c] border border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.1)] rounded-xl p-5">
           <div className="flex items-center gap-3"><div className="p-3 bg-green-500/20 rounded-xl"><Banknote className="w-6 h-6 text-green-400" /></div><div><p className="text-xs text-green-400 font-bold uppercase tracking-wider">Ganancia Neta (Prod)</p><p className="text-2xl font-black text-white mt-1">Bs. {gananciaProductos.toFixed(2)}</p></div></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Productos Top */}
        <div className="bg-[#1a1a1c] border border-[#2a2a2c] rounded-xl p-6">
          <h3 className="font-bold text-white text-base mb-4">Top Rentabilidad de Productos</h3>
          <div className="space-y-4">
            {topProductos.length > 0 ? topProductos.map((p, i) => (
              <div key={i} className="flex justify-between items-center bg-black/20 p-3 rounded-lg border border-[#2a2a2c]/50">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded bg-[#2a2a2c] text-xs font-bold flex items-center justify-center text-billar-gray">{i + 1}</div>
                  <div>
                    <span className="text-sm font-bold text-white block">{p.nombre}</span>
                    <span className="text-xs text-billar-gray">{p.cantidad} unidades vendidas</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-green-400">+Bs. {p.ganancia.toFixed(2)} <span className="text-[10px] text-billar-gray font-normal block">Ganancia Neta</span></div>
                </div>
              </div>
            )) : (
               <div className="py-8 text-center text-billar-gray/50 text-sm">No hay datos de productos en este periodo.</div>
            )}
          </div>
        </div>

        {/* Métodos de pago */}
        <div className="bg-[#1a1a1c] border border-[#2a2a2c] rounded-xl p-6">
          <h3 className="font-bold text-white text-base mb-4">Ingresos por Método de Pago</h3>
          <div className="space-y-4">
             {Object.entries(metodos).length > 0 ? Object.entries(metodos).sort((a: [string, any], b: [string, any]) => (b[1] as number) - (a[1] as number)).map(([metodo, monto]: [string, any], i) => {
               const percentage = ((monto / totalIngresos) * 100).toFixed(1);
               return (
                 <div key={i} className="space-y-1">
                   <div className="flex justify-between text-sm">
                     <span className="capitalize text-white font-bold">{metodo}</span>
                     <span className="text-billar-gray">Bs. {monto.toFixed(2)} <span className="text-xs ml-1">({percentage}%)</span></span>
                   </div>
                   <div className="w-full bg-[#2a2a2c] rounded-full h-2">
                     <div className="bg-billar-primary h-2 rounded-full" style={{ width: `${percentage}%` }}></div>
                   </div>
                 </div>
               );
             }) : (
               <div className="py-8 text-center text-billar-gray/50 text-sm">No hay datos financieros en este periodo.</div>
             )}
          </div>
        </div>
      </div>

    </div>
  );
}
