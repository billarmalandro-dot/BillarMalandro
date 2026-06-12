"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Clock, CheckCircle, XCircle, Utensils, RefreshCw, ChefHat, BellRing, PackageCheck } from "lucide-react";

export default function PedidosMonitorPage() {
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    loadData();

    // 1. Suscribirse a cambios en tiempo real en la tabla pedidos
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pedidos' },
        (payload) => {
          console.log("¡Cambio detectado en pedidos!", payload);
          // Opcional: Reproducir sonido de campanilla (Bell)
          loadData(); // Refrescar para obtener los items y datos anidados actualizados
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadData = async () => {
    try {
      // Obtener pedidos de las últimas 24 horas (o del día)
      const ayer = new Date();
      ayer.setHours(ayer.getHours() - 24);

      const { data, error } = await supabase
        .from("pedidos")
        .select(`
          *,
          clientes(nombre),
          pedido_items(
            id_pedido_item,
            cantidad,
            subtotal,
            productos(nombre, imagen_url)
          )
        `)
        .gte("created_at", ayer.toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPedidos(data || []);
    } catch (err: any) {
      console.error("Error al cargar pedidos:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateEstado = async (id_pedido: string, nuevoEstado: string) => {
    // 1. Actualización optimista (UI instantánea)
    setPedidos(prev => prev.map(p => p.id_pedido === id_pedido ? { ...p, estado: nuevoEstado } : p));

    try {
      const { error } = await supabase
        .from("pedidos")
        .update({ estado: nuevoEstado })
        .eq("id_pedido", id_pedido);
      
      if (error) {
        // 2. Si falla, revertimos recargando los datos reales
        loadData();
        throw error;
      }
      // Si tiene éxito, loadData() también se llamará por el Realtime Channel en el fondo para asegurar sincronización
    } catch (err: any) {
      alert("Error actualizando estado: " + err.message);
    }
  };

  // Clasificar pedidos por columnas (Kanban)
  const pendientes = pedidos.filter(p => p.estado === 'pendiente');
  const enPreparacion = pedidos.filter(p => p.estado === 'preparacion' || p.estado === 'listo');
  const historial = pedidos.filter(p => p.estado === 'entregado' || p.estado === 'cancelado');

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-billar-gray">
        <RefreshCw className="w-12 h-12 animate-spin text-billar-primary mb-4" />
        <p>Cargando monitor de barra...</p>
      </div>
    );
  }

  // Tarjeta de Pedido Reutilizable
  const PedidoCard = ({ p }: { p: any }) => (
    <div className="bg-[#1a1a1c] border border-[#2a2a2c] rounded-2xl p-5 shadow-lg flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2">
      {/* Cabecera del ticket */}
      <div className="flex justify-between items-start border-b border-white/5 pb-3">
        <div>
          <h3 className="font-black text-xl text-white">Mesa {p.numero_mesa || "Barra"}</h3>
          <p className="text-sm text-billar-gray mt-0.5">Cliente: <span className="text-white/80 font-medium">{p.clientes?.nombre || "Anónimo"}</span></p>
        </div>
        <div className="text-right">
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${
            p.estado === 'pendiente' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
            p.estado === 'entregado' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
            p.estado === 'cancelado' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
            'bg-blue-500/20 text-blue-400 border-blue-500/30'
          }`}>
            {p.estado}
          </span>
          <p className="text-[11px] text-billar-gray mt-2 font-mono">
            {new Date(p.created_at).toLocaleTimeString("es-ES", { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>

      {/* Items del pedido */}
      <div className="space-y-3 flex-1">
        {p.pedido_items?.map((item: any) => (
          <div key={item.id_pedido_item} className="flex justify-between items-center bg-black/40 p-2 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="bg-[#2a2a2c] text-white w-6 h-6 flex items-center justify-center rounded text-xs font-bold shrink-0">
                {item.cantidad}x
              </span>
              <span className="text-sm font-medium text-white/90 line-clamp-1">{item.productos?.nombre}</span>
            </div>
            <span className="text-xs font-bold text-billar-gray shrink-0">Bs. {Number(item.subtotal).toFixed(2)}</span>
          </div>
        ))}
      </div>

      {/* Footer del ticket (Total y Acciones) */}
      <div className="border-t border-white/5 pt-3 mt-auto">
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm text-billar-gray font-bold">TOTAL</span>
          <span className="text-lg font-black text-billar-primary">Bs. {Number(p.total).toFixed(2)}</span>
        </div>

        {/* Acciones según el estado */}
        <div className="grid grid-cols-2 gap-2">
          {p.estado === 'pendiente' && (
            <>
              <button onClick={() => updateEstado(p.id_pedido, 'cancelado')} className="py-2 bg-[#2a2a2c] hover:bg-red-500/20 text-billar-gray hover:text-red-500 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5">
                <XCircle className="w-3.5 h-3.5" /> Cancelar
              </button>
              <button onClick={() => updateEstado(p.id_pedido, 'preparacion')} className="py-2 bg-billar-primary hover:bg-[#b81d24] text-white rounded-xl text-xs font-bold shadow-lg shadow-billar-primary/20 transition-all active:scale-95 flex items-center justify-center gap-1.5">
                <ChefHat className="w-3.5 h-3.5" /> Preparar
              </button>
            </>
          )}

          {(p.estado === 'preparacion' || p.estado === 'listo') && (
            <button onClick={() => updateEstado(p.id_pedido, 'entregado')} className="col-span-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/20 transition-all active:scale-95 flex items-center justify-center gap-1.5">
              <PackageCheck className="w-4 h-4" /> Entregado en Mesa
            </button>
          )}

          {p.estado === 'entregado' && (
            <div className="col-span-2 py-2 text-center text-emerald-500 text-xs font-bold flex items-center justify-center gap-1">
              <CheckCircle className="w-4 h-4" /> Pedido Completado
            </div>
          )}

          {p.estado === 'cancelado' && (
            <div className="col-span-2 py-2 text-center text-red-500 text-xs font-bold flex items-center justify-center gap-1 opacity-80">
              <XCircle className="w-4 h-4" /> Pedido Cancelado
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Utensils className="w-6 h-6 text-billar-primary" />
            Monitor de Pedidos (Barra)
          </h1>
          <p className="text-sm text-billar-gray mt-1">Los nuevos pedidos de los clientes aparecerán aquí automáticamente en tiempo real.</p>
        </div>
        <div className="flex items-center gap-2 bg-[#1a1a1c] border border-billar-primary/30 px-4 py-2 rounded-xl">
          <div className="w-2 h-2 rounded-full bg-billar-primary animate-pulse"></div>
          <span className="text-xs font-bold text-white tracking-widest uppercase">EN VIVO</span>
        </div>
      </div>

      {/* Grid Kanban */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        
        {/* Columna Pendientes */}
        <div className="bg-[#121212] border border-[#2a2a2c] rounded-3xl p-4 flex flex-col gap-4 min-h-[60vh]">
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <h2 className="font-bold text-white flex items-center gap-2">
              <BellRing className="w-4 h-4 text-yellow-500" /> Nuevos / Pendientes
            </h2>
            <span className="bg-yellow-500/20 text-yellow-500 text-xs font-black px-2 py-0.5 rounded-full">{pendientes.length}</span>
          </div>
          {pendientes.length === 0 && <p className="text-center text-sm text-billar-gray py-10">No hay pedidos nuevos.</p>}
          <div className="space-y-4">
            {pendientes.map(p => <PedidoCard key={p.id_pedido} p={p} />)}
          </div>
        </div>

        {/* Columna En Preparación */}
        <div className="bg-[#121212] border border-[#2a2a2c] rounded-3xl p-4 flex flex-col gap-4 min-h-[60vh]">
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <h2 className="font-bold text-white flex items-center gap-2">
              <ChefHat className="w-4 h-4 text-blue-500" /> En Preparación
            </h2>
            <span className="bg-blue-500/20 text-blue-500 text-xs font-black px-2 py-0.5 rounded-full">{enPreparacion.length}</span>
          </div>
          {enPreparacion.length === 0 && <p className="text-center text-sm text-billar-gray py-10">Barra libre por ahora.</p>}
          <div className="space-y-4">
            {enPreparacion.map(p => <PedidoCard key={p.id_pedido} p={p} />)}
          </div>
        </div>

        {/* Columna Historial (Entregados y Cancelados) */}
        <div className="bg-[#121212] border border-[#2a2a2c] rounded-3xl p-4 flex flex-col gap-4 min-h-[60vh] opacity-80">
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <h2 className="font-bold text-white flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-emerald-500" /> Historial (Hoy)
            </h2>
            <span className="bg-emerald-500/20 text-emerald-500 text-xs font-black px-2 py-0.5 rounded-full">{historial.length}</span>
          </div>
          {historial.length === 0 && <p className="text-center text-sm text-billar-gray py-10">Aún no hay historial.</p>}
          <div className="space-y-4">
            {historial.map(p => <PedidoCard key={p.id_pedido} p={p} />)}
          </div>
        </div>

      </div>
    </div>
  );
}
