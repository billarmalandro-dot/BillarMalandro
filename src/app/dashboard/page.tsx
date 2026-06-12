import { TrendingUp, ShoppingCart, Users, AlertTriangle, Banknote, CreditCard, Smartphone, ArrowUpRight, PackageOpen, RefreshCw } from "lucide-react";
import { createClient } from "@/utils/supabase/server";

export const revalidate = 0; // Evitar almacenamiento en caché para tener datos en tiempo real

export default async function DashboardPage() {
  const supabase = await createClient();
  
  // Variables por defecto por si falla la base de datos o está vacía
  let ventasHoyCount = 0;
  let totalVentasHoy = 0;
  let ticketPromedio = 0;
  let cajerosActivos = 0;
  let alertasStockCount = 0;
  
  let efectivoTotal = 0;
  let tarjetaTotal = 0;
  let qrTotal = 0;
  let mixtaTotal = 0;
  let gananciaMesasTotal = 0;
  let productosSueltosTotal = 0;
  let productosMesaTotal = 0;
  
  let ultimasVentas: any[] = [];
  let topProductos: any[] = [];
  let databaseError = false;
  let errorMessage = "";

  try {
    const { data: { user } } = await supabase.auth.getUser();
    let dbUser: any = null;
    if (user) {
      const { data } = await supabase.from("usuarios").select("*, roles(nombre)").eq("auth_id", user.id).single();
      dbUser = data;
    }

    // Calcular inicio de día (00:00:00) estrictamente en la zona horaria de Bolivia (UTC-4)
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/La_Paz',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    
    const parts = formatter.formatToParts(now);
    const month = parts.find(p => p.type === 'month')?.value;
    const day = parts.find(p => p.type === 'day')?.value;
    const year = parts.find(p => p.type === 'year')?.value;
    
    // Las 00:00:00 en Bolivia (UTC-4) corresponden a las 04:00:00 en UTC
    let inicioFiltroISO = `${year}-${month}-${day}T04:00:00.000Z`;
    let userIdFiltro = null;
    let isCajaCerradaCajero = false;

    // Si es cajero, verificar su caja actual
    if (dbUser && dbUser.roles?.nombre === 'cajero') {
      userIdFiltro = dbUser.id_usuario;
      
      const { data: lastArqueo } = await supabase
        .from("arqueos")
        .select("tipo, created_at")
        .eq("id_usuario", dbUser.id_usuario)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastArqueo && lastArqueo.tipo === 'apertura') {
        inicioFiltroISO = lastArqueo.created_at; // Mostrar desde que abrió su caja
      } else {
        isCajaCerradaCajero = true; // No tiene caja abierta, mostrar en 0
      }
    }

    // 1. Obtener ventas del día (o del turno del cajero)
    let ventasQuery = supabase
      .from("ventas")
      .select("total, metodo_pago, estado, id_sesion, venta_items(cantidad, precio_unitario)")
      .gte("created_at", inicioFiltroISO);

    if (userIdFiltro) {
      ventasQuery = ventasQuery.eq("id_usuario", userIdFiltro);
    }

    const { data: ventasHoy, error: ventasError } = isCajaCerradaCajero 
      ? { data: [], error: null } 
      : await ventasQuery;

    if (ventasError) throw ventasError;

    if (ventasHoy) {
      const ventasValidas = ventasHoy.filter(v => v.estado === 'completada');
      ventasHoyCount = ventasValidas.length;
      totalVentasHoy = ventasValidas.reduce((sum, v) => sum + Number(v.total || 0), 0);
      ticketPromedio = ventasHoyCount > 0 ? totalVentasHoy / ventasHoyCount : 0;

      // Desglose por método de pago y ganancias de mesas
      ventasValidas.forEach(v => {
        const totalNum = Number(v.total || 0);
        if (v.metodo_pago === 'efectivo') efectivoTotal += totalNum;
        else if (v.metodo_pago === 'tarjeta') tarjetaTotal += totalNum;
        else if (v.metodo_pago === 'qr') qrTotal += totalNum;
        else mixtaTotal += totalNum; // mixta, fiado, etc.

        // Calcular productos vendidos y ganancia de mesas
        const costoProductos = (v.venta_items || []).reduce((acc: number, item: any) => {
          return acc + (Number(item.cantidad) * Number(item.precio_unitario));
        }, 0);

        if (v.id_sesion) {
          // Venta de mesa: separar tiempo vs productos
          productosMesaTotal += costoProductos;
          gananciaMesasTotal += Math.max(0, totalNum - costoProductos);
        } else {
          // Venta directa sin mesa: todo es producto suelto
          productosSueltosTotal += totalNum;
        }
      });
    }

    // 2. Obtener alertas de stock (stock < stock_minimo)
    const { data: invData, error: invError } = await supabase
      .from("inventario")
      .select("stock, stock_minimo");

    if (invError) throw invError;

    if (invData) {
      alertasStockCount = invData.filter(i => Number(i.stock) < Number(i.stock_minimo)).length;
    }

    // 3. Obtener cajeros activos (usuarios con rol cajero/admin en la sucursal activa)
    const { data: staffData, error: staffError } = await supabase
      .from("usuario_sucursal")
      .select("id_usuario_sucursal")
      .eq("activo", true);

    if (staffError) throw staffError;
    if (staffData) {
      cajerosActivos = staffData.length;
    }

    // 4. Últimas 5 ventas con relaciones a usuario (cajero) y cliente
    if (isCajaCerradaCajero) {
      ultimasVentas = [];
    } else {
      let vListQuery = supabase
        .from("ventas")
        .select(`
          id_venta,
          created_at,
          total,
          metodo_pago,
          estado,
          usuarios:id_usuario (nombre),
          clientes:id_cliente (nombre)
        `)
        .gte("created_at", inicioFiltroISO)
        .order("created_at", { ascending: false })
        .limit(5);

      if (userIdFiltro) {
        vListQuery = vListQuery.eq("id_usuario", userIdFiltro);
      }

      const { data: vList, error: vListError } = await vListQuery;

      if (!vListError && vList) {
        ultimasVentas = vList;
      } else {
        // Fallback si la relación falla o no hay datos
        let vListFallbackQuery = supabase
          .from("ventas")
          .select("id_venta, created_at, total, metodo_pago, estado")
          .gte("created_at", inicioFiltroISO)
          .order("created_at", { ascending: false })
          .limit(5);

        if (userIdFiltro) {
          vListFallbackQuery = vListFallbackQuery.eq("id_usuario", userIdFiltro);
        }

        const { data: vListFallback } = await vListFallbackQuery;
        
        if (vListFallback) {
          ultimasVentas = vListFallback.map(v => ({
            ...v,
            usuarios: { nombre: "Sistema" },
            clientes: { nombre: "Cliente General" }
          }));
        }
      }
    }

  } catch (err: any) {
    console.error("Error al cargar datos del Dashboard:", err.message);
    databaseError = true;
    errorMessage = err.message || "Error desconocido al conectar con Supabase.";
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Banner de error de base de datos */}
      {databaseError && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 shrink-0 text-red-500 mt-0.5" />
            <div>
              <h4 className="font-bold text-white">¿No ves datos reales de la base de datos?</h4>
              <p className="text-sm text-billar-gray mt-1">
                La conexión falló o las tablas aún no han sido creadas. Asegúrate de ejecutar el archivo SQL en el editor SQL de Supabase.
              </p>
              <p className="text-xs text-red-400/80 font-mono mt-1">Detalle: {errorMessage}</p>
            </div>
          </div>
          <a 
            href="/dashboard"
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2 self-start md:self-auto"
          >
            <RefreshCw className="w-4 h-4 animate-spin-hover" />
            Reintentar
          </a>
        </div>
      )}

      {/* Primer Fila: KPIs Principales */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Ventas del Día */}
        <div className="bg-[#1a1a1c] border border-[#2a2a2c] border-t-4 border-t-billar-primary rounded-xl p-5 relative overflow-hidden group hover:bg-[#202022] transition-all duration-300 shadow-md">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-billar-gray text-xs font-bold tracking-wider uppercase">Ventas del Día</h3>
            <TrendingUp className="w-5 h-5 text-[#2a2a2c] group-hover:text-billar-primary transition-colors" />
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            Bs. {totalVentasHoy.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-billar-gray">{ventasHoyCount} ticket(s) emitidos</p>
        </div>

        {/* Ganancia de Mesas */}
        <div className="bg-[#1a1a1c] border border-[#2a2a2c] border-t-4 border-t-purple-500 rounded-xl p-6 relative overflow-hidden group hover:bg-[#202022] transition-all duration-300 shadow-md">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-billar-gray text-xs font-bold tracking-wider uppercase">Ingresos Mesas</h3>
            <div className="p-1 bg-[#2a2a2c] rounded-md group-hover:bg-purple-500/20 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-billar-gray group-hover:text-purple-500"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="14" x2="23" y2="14"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="14" x2="4" y2="14"></line></svg>
            </div>
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            Bs. {gananciaMesasTotal.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-billar-gray">Exclusivo tiempo de billar</p>
        </div>

        {/* Productos Vendidos Sueltos */}
        <div className="bg-[#1a1a1c] border border-[#2a2a2c] border-t-4 border-t-cyan-500 rounded-xl p-5 relative overflow-hidden group hover:bg-[#202022] transition-all duration-300 shadow-md">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-billar-gray text-xs font-bold tracking-wider uppercase">Producto Suelto</h3>
            <PackageOpen className="w-5 h-5 text-[#2a2a2c] group-hover:text-cyan-500 transition-colors" />
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            Bs. {productosSueltosTotal.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-billar-gray">Venta directa sin mesa</p>
        </div>

        {/* Productos Vendidos en Mesa */}
        <div className="bg-[#1a1a1c] border border-[#2a2a2c] border-t-4 border-t-amber-500 rounded-xl p-5 relative overflow-hidden group hover:bg-[#202022] transition-all duration-300 shadow-md">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-billar-gray text-xs font-bold tracking-wider uppercase">Producto en Mesa</h3>
            <ShoppingCart className="w-5 h-5 text-[#2a2a2c] group-hover:text-amber-500 transition-colors" />
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            Bs. {productosMesaTotal.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-billar-gray">Consumo durante sesión</p>
        </div>
      </div>

      {/* Segunda Fila: Info adicional */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#1a1a1c] border border-[#2a2a2c] border-t-4 border-t-yellow-500 rounded-xl p-5 relative overflow-hidden group hover:bg-[#202022] transition-all duration-300 shadow-md">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-billar-gray text-xs font-bold tracking-wider uppercase">Ticket Promedio</h3>
            <ShoppingCart className="w-5 h-5 text-[#2a2a2c] group-hover:text-yellow-500 transition-colors" />
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            Bs. {ticketPromedio.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-billar-gray">Por venta completada</p>
        </div>

        {/* Cajeros Activos */}
        <div className="bg-[#1a1a1c] border border-[#2a2a2c] border-t-4 border-t-green-500 rounded-xl p-5 relative overflow-hidden group hover:bg-[#202022] transition-all duration-300 shadow-md">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-billar-gray text-xs font-bold tracking-wider uppercase">Cajeros Activos</h3>
            <Users className="w-5 h-5 text-[#2a2a2c] group-hover:text-green-500 transition-colors" />
          </div>
          <div className="text-3xl font-bold text-white mb-1">{cajerosActivos}</div>
          <p className="text-xs text-billar-gray">Personal en turno activo</p>
        </div>

        {/* Alertas de Stock */}
        <div className={`bg-[#1a1a1c] border border-[#2a2a2c] border-t-4 rounded-xl p-5 relative overflow-hidden group hover:bg-[#202022] transition-all duration-300 shadow-md ${alertasStockCount > 0 ? 'border-t-orange-500' : 'border-t-green-500'}`}>
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-billar-gray text-xs font-bold tracking-wider uppercase">Alertas de Stock</h3>
            <AlertTriangle className={`w-5 h-5 text-[#2a2a2c] group-hover:text-orange-500 transition-colors ${alertasStockCount > 0 ? 'text-orange-500 animate-pulse' : ''}`} />
          </div>
          <div className="text-3xl font-bold text-white mb-1">{alertasStockCount}</div>
          <p className="text-xs text-billar-gray">Productos bajo el mínimo</p>
        </div>
      </div>

      {/* Segunda Fila: Recaudación por método */}
      <div>
        <h2 className="text-base font-bold text-white mb-4">Recaudación por método — Hoy</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Efectivo */}
          <div className="bg-[#1a1a1c] border border-[#2a2a2c] rounded-xl p-5 hover:bg-[#202022] transition-colors shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center mb-4">
              <Banknote className="w-5 h-5 text-green-500" />
            </div>
            <h3 className="text-billar-gray text-sm mb-1">Efectivo</h3>
            <div className="text-2xl font-bold text-white">
              Bs. {efectivoTotal.toLocaleString("es-BO", { minimumFractionDigits: 2 })}
            </div>
          </div>

          {/* Tarjeta */}
          <div className="bg-[#1a1a1c] border border-[#2a2a2c] rounded-xl p-5 hover:bg-[#202022] transition-colors shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4">
              <CreditCard className="w-5 h-5 text-blue-500" />
            </div>
            <h3 className="text-billar-gray text-sm mb-1">Tarjeta</h3>
            <div className="text-2xl font-bold text-white">
              Bs. {tarjetaTotal.toLocaleString("es-BO", { minimumFractionDigits: 2 })}
            </div>
          </div>

          {/* QR / Billetera */}
          <div className="bg-[#1a1a1c] border border-[#2a2a2c] rounded-xl p-5 hover:bg-[#202022] transition-colors shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center mb-4">
              <Smartphone className="w-5 h-5 text-yellow-500" />
            </div>
            <h3 className="text-billar-gray text-sm mb-1">QR / Billetera</h3>
            <div className="text-2xl font-bold text-white">
              Bs. {qrTotal.toLocaleString("es-BO", { minimumFractionDigits: 2 })}
            </div>
          </div>

          {/* Otros (Mixto/Fiado) */}
          <div className="bg-[#1a1a1c] border border-[#2a2a2c] rounded-xl p-5 hover:bg-[#202022] transition-colors shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center mb-4">
              <ArrowUpRight className="w-5 h-5 text-orange-500" />
            </div>
            <h3 className="text-billar-gray text-sm mb-1">Otros / Mixto</h3>
            <div className="text-2xl font-bold text-white">
              Bs. {mixtaTotal.toLocaleString("es-BO", { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      {/* Tercera Fila: Tablas Inferiores */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Últimas Ventas */}
        <div className="lg:col-span-2 bg-[#1a1a1c] border border-[#2a2a2c] rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-base font-bold text-white">Últimas ventas</h2>
            <button className="px-4 py-1.5 rounded-lg border border-[#2a2a2c] text-sm text-billar-gray hover:text-white hover:bg-[#2a2a2c] transition-colors">
              Ver todo
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#2a2a2c] text-xs font-bold text-billar-gray tracking-wider uppercase">
                  <th className="pb-3 pl-4">Código / ID</th>
                  <th className="pb-3">Fecha/Hora</th>
                  <th className="pb-3">Cajero</th>
                  <th className="pb-3">Método</th>
                  <th className="pb-3">Total</th>
                  <th className="pb-3">Estado</th>
                </tr>
              </thead>
              <tbody>
                {ultimasVentas.length > 0 ? (
                  ultimasVentas.map((venta) => (
                    <tr key={venta.id_venta} className="border-b border-[#2a2a2c]/50 hover:bg-white/5 transition-colors text-sm text-white">
                      <td className="py-3 pl-4 font-mono text-xs max-w-[120px] truncate">{venta.id_venta}</td>
                      <td className="py-3">
                        {new Date(venta.created_at).toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="py-3 text-billar-gray">{venta.usuarios?.nombre || "Sistema"}</td>
                      <td className="py-3 capitalize text-xs">{venta.metodo_pago}</td>
                      <td className="py-3 font-bold">Bs. {Number(venta.total).toFixed(2)}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          venta.estado === 'completada' ? 'bg-green-500/20 text-green-400' :
                          venta.estado === 'pendiente' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {venta.estado}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-billar-gray text-sm">
                      Sin ventas registradas hoy
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Productos */}
        <div className="bg-[#1a1a1c] border border-[#2a2a2c] rounded-xl p-6 flex flex-col shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-base font-bold text-white">Top productos hoy</h2>
            <button className="px-4 py-1.5 rounded-lg border border-[#2a2a2c] text-sm text-billar-gray hover:text-white hover:bg-[#2a2a2c] transition-colors">
              Reportes
            </button>
          </div>
          
          <div className="flex-1 flex flex-col items-center justify-center text-billar-gray/50 mt-4">
            <PackageOpen className="w-12 h-12 mb-3 text-billar-gray/30" />
            <span className="text-sm">Sin datos de ventas hoy</span>
          </div>
        </div>

      </div>

    </div>
  );
}
