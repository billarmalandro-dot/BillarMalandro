"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, Info, AlertTriangle, CheckCircle, X, CheckCheck } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

interface Notificacion {
  id_notificacion: string;
  titulo: string;
  mensaje: string;
  tipo: "info" | "warning" | "success" | string;
  leida: boolean;
  created_at: string;
}

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notificacion[]>([]);
  const supabase = createClient();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifs();
    
    // Configurar suscripción en tiempo real si existe la tabla
    const channel = supabase
      .channel('realtime_notifs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificaciones' }, (payload) => {
        setNotifs(prev => [payload.new as Notificacion, ...prev]);
      })
      .subscribe();

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchNotifs = async () => {
    try {
      const { data, error } = await supabase
        .from('notificaciones')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (data) setNotifs(data);
      if (error) {
        // Fallback local visual si no existe la tabla
        setNotifs([
          {
            id_notificacion: "demo-1",
            titulo: "Inventario Bajo",
            mensaje: "Quedan solo 5 unidades de Cerveza Corona.",
            tipo: "warning",
            leida: false,
            created_at: new Date().toISOString()
          },
          {
            id_notificacion: "demo-2",
            titulo: "Nuevo Pedido",
            mensaje: "La mesa 4 acaba de solicitar 2 cervezas Huari.",
            tipo: "success",
            leida: false,
            created_at: new Date().toISOString()
          }
        ]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const unreadCount = notifs.filter(n => !n.leida).length;

  const markAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifs(prev => prev.map(n => n.id_notificacion === id ? { ...n, leida: true } : n));
    try {
      await supabase.from('notificaciones').update({ leida: true }).eq('id_notificacion', id);
    } catch (e) {}
  };

  const markAllAsRead = async () => {
    setNotifs(prev => prev.map(n => ({ ...n, leida: true })));
    try {
      await supabase.from('notificaciones').update({ leida: true }).eq('leida', false);
    } catch (e) {}
  };

  const getIcon = (tipo: string) => {
    switch (tipo) {
      case "warning": return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case "success": return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      default: return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Botón de Campana */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full bg-[#2a2a2c] hover:bg-[#3a3a3c] transition-colors active:scale-95"
      >
        <Bell className="w-5 h-5 text-white" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-4 h-4 bg-billar-primary text-white text-[9px] font-bold rounded-full border-2 border-[#1a1a1c] flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Menú Desplegable */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 bg-[#1a1a1c] border border-white/10 rounded-2xl shadow-2xl z-50 animate-in slide-in-from-top-2 overflow-hidden">
          <div className="p-4 border-b border-[#2a2a2c] flex justify-between items-center bg-[#121212]">
            <h3 className="font-bold text-white text-sm">Notificaciones</h3>
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                className="text-xs text-billar-gray hover:text-white flex items-center gap-1 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Marcar leídas
              </button>
            )}
          </div>
          
          <div className="max-h-80 overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="p-8 text-center text-billar-gray flex flex-col items-center">
                <Bell className="w-8 h-8 opacity-20 mb-2" />
                <p className="text-sm">No tienes notificaciones nuevas.</p>
              </div>
            ) : (
              <div className="flex flex-col">
                {notifs.map(n => (
                  <div 
                    key={n.id_notificacion} 
                    className={`p-4 border-b border-[#2a2a2c] last:border-0 hover:bg-white/5 transition-colors relative group ${!n.leida ? 'bg-billar-primary/5' : ''}`}
                  >
                    <div className="flex gap-3 items-start">
                      <div className="mt-0.5">{getIcon(n.tipo)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className={`text-sm truncate ${!n.leida ? 'font-bold text-white' : 'font-medium text-billar-gray'}`}>
                            {n.titulo}
                          </h4>
                          <span className="text-[10px] text-billar-gray whitespace-nowrap">
                            {new Date(n.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                        <p className={`text-xs mt-1 line-clamp-2 ${!n.leida ? 'text-gray-300' : 'text-billar-gray/70'}`}>
                          {n.mensaje}
                        </p>
                      </div>
                    </div>
                    {!n.leida && (
                      <button 
                        onClick={(e) => markAsRead(n.id_notificacion, e)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#2a2a2c] hover:bg-[#3a3a3c] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border border-white/10"
                        title="Marcar como leída"
                      >
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
