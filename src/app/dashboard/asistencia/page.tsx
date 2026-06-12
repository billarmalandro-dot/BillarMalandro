"use client";

import { useState, useEffect } from "react";
import { 
  Clock, LogIn, LogOut, Calendar, CheckCircle2, 
  AlertTriangle, RefreshCw, UserCheck 
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export default function AsistenciaPage() {
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeSucursalId, setActiveSucursalId] = useState("");
  
  // Estado de asistencia del día
  const [asistenciaActual, setAsistenciaActual] = useState<any>(null);
  const [historial, setHistorial] = useState<any[]>([]);
  
  const [isProcessing, setIsProcessing] = useState(false);

  const supabase = createClient();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    setDbError("");
    try {
      // 1. Obtener usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No estás autenticado");

      const { data: dbUser } = await supabase
        .from("usuarios")
        .select("id_usuario, nombre")
        .eq("auth_id", user.id)
        .single();
        
      if (!dbUser) throw new Error("Usuario no encontrado en la base de datos");
      setCurrentUser(dbUser);

      // 2. Obtener sucursal actual
      const { data: sucursales } = await supabase.from("sucursales").select("id_sucursal");
      const sucursalId = sucursales?.[0]?.id_sucursal || "";
      setActiveSucursalId(sucursalId);

      // 3. Buscar registro de asistencia de HOY
      const hoy = new Date().toISOString().slice(0, 10);
      
      const { data: asistenciaHoy } = await supabase
        .from("asistencias")
        .select("*")
        .eq("id_usuario", dbUser.id_usuario)
        .eq("fecha", hoy)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      setAsistenciaActual(asistenciaHoy);

      // 4. Historial de asistencias de los últimos 7 días
      const { data: historialData } = await supabase
        .from("asistencias")
        .select("*")
        .eq("id_usuario", dbUser.id_usuario)
        .order("fecha", { ascending: false })
        .limit(7);

      setHistorial(historialData || []);

    } catch (err: any) {
      console.error(err);
      setDbError(err.message || "Error al cargar la asistencia.");
    } finally {
      setLoading(false);
    }
  };

  const handleMarcarEntrada = async () => {
    if (!currentUser || !activeSucursalId) return;
    setIsProcessing(true);
    try {
      const hoy = new Date().toISOString().slice(0, 10);
      
      await supabase.from("asistencias").insert({
        id_usuario: currentUser.id_usuario,
        id_sucursal: activeSucursalId,
        fecha: hoy,
        hora_entrada: new Date().toISOString(),
        observaciones: "Entrada regular"
      });
      
      // Notificación al admin
      await supabase.from("notificaciones").insert({
        titulo: "Inicio de Turno",
        mensaje: `${currentUser.nombre} ha marcado su ENTRADA y ha iniciado su turno.`,
        tipo: "info"
      });

      await loadData();
    } catch (err: any) {
      alert("Error marcando entrada: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMarcarSalida = async () => {
    if (!asistenciaActual || !currentUser) return;
    setIsProcessing(true);
    try {
      const salida = new Date();
      const entrada = new Date(asistenciaActual.hora_entrada);
      const horasTrabajadas = (salida.getTime() - entrada.getTime()) / (1000 * 60 * 60);

      await supabase.from("asistencias").update({
        hora_salida: salida.toISOString(),
        horas_trabajadas: Number(horasTrabajadas.toFixed(2))
      }).eq("id_asistencia", asistenciaActual.id_asistencia);
      
      // Notificación al admin
      await supabase.from("notificaciones").insert({
        titulo: "Fin de Turno",
        mensaje: `${currentUser.nombre} ha marcado su SALIDA. Horas trabajadas: ${horasTrabajadas.toFixed(2)} horas.`,
        tipo: "warning"
      });

      await loadData();
    } catch (err: any) {
      alert("Error marcando salida: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-billanga-gray">
        <RefreshCw className="w-10 h-10 animate-spin text-billanga-primary mb-4" />
        <p className="text-sm">Cargando módulo de asistencia...</p>
      </div>
    );
  }

  // Si no hay registro, o el último ya tiene hora_salida, el usuario NO está trabajando ahora.
  const estaTrabajando = asistenciaActual && !asistenciaActual.hora_salida;
  const hoyStr = new Date().toLocaleDateString("es-BO", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <UserCheck className="w-7 h-7 text-billanga-primary" /> 
            Control de Asistencia
          </h2>
          <p className="text-sm text-billanga-gray">
            Registra tu hora de entrada y salida (Turno de {currentUser?.nombre})
          </p>
        </div>
      </div>

      {dbError && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 shrink-0" />
          <div>
            <h4 className="font-bold text-white">Error</h4>
            <p className="text-sm">{dbError}</p>
          </div>
        </div>
      )}

      {/* Panel Principal */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Tarjeta de Reloj Checador */}
        <div className={`border rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-6 ${estaTrabajando ? "bg-[#1a1a1c] border-billanga-primary/30 shadow-[0_0_30px_rgba(220, 38, 38,0.1)]" : "bg-[#1a1a1c] border-[#2a2a2c]"}`}>
          
          <div className="space-y-2">
            <h3 className="text-lg text-billanga-gray capitalize">{hoyStr}</h3>
            <p className="text-4xl font-black text-white font-mono">
              {new Date().toLocaleTimeString("es-BO", { hour: '2-digit', minute:'2-digit' })}
            </p>
          </div>

          <div className="w-full max-w-xs space-y-4">
            {estaTrabajando ? (
              <>
                <div className="bg-green-500/10 border border-green-500/30 text-green-400 p-4 rounded-xl flex flex-col items-center gap-2">
                  <CheckCircle2 className="w-8 h-8" />
                  <p className="font-bold">Turno Iniciado</p>
                  <p className="text-xs text-green-400/80">Entraste a las {new Date(asistenciaActual.hora_entrada).toLocaleTimeString("es-BO", { hour: '2-digit', minute:'2-digit' })}</p>
                </div>
                
                <button 
                  onClick={handleMarcarSalida}
                  disabled={isProcessing}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-xl font-bold transition-all shadow-lg"
                >
                  {isProcessing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <LogOut className="w-5 h-5" />}
                  Finalizar Turno
                </button>
              </>
            ) : (
              <>
                {asistenciaActual?.hora_salida && (
                  <div className="bg-blue-500/10 border border-blue-500/30 text-blue-400 p-4 rounded-xl text-sm mb-4">
                    <p>Turno finalizado a las {new Date(asistenciaActual.hora_salida).toLocaleTimeString("es-BO", { hour: '2-digit', minute:'2-digit' })}</p>
                    <p className="font-bold">{asistenciaActual.horas_trabajadas} horas registradas.</p>
                  </div>
                )}
                <button 
                  onClick={handleMarcarEntrada}
                  disabled={isProcessing}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-billanga-primary hover:bg-billanga-primary-dark disabled:opacity-50 text-white rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(220, 38, 38,0.3)]"
                >
                  {isProcessing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
                  Iniciar Turno
                </button>
                {asistenciaActual?.hora_salida && (
                  <p className="text-xs text-billanga-gray">¿Turno doble o regreso de descanso? Puedes volver a iniciar.</p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Historial Reciente */}
        <div className="bg-[#1a1a1c] border border-[#2a2a2c] rounded-2xl overflow-hidden flex flex-col">
          <div className="p-5 border-b border-[#2a2a2c]">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-billanga-primary" /> 
              Tus últimos turnos
            </h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2">
            {historial.length > 0 ? (
              <div className="space-y-2">
                {historial.map((reg) => (
                  <div key={reg.id_asistencia} className="p-4 rounded-xl hover:bg-white/[0.02] border border-transparent hover:border-[#2a2a2c] transition-all flex items-center justify-between">
                    <div>
                      <p className="text-white font-bold text-sm">
                        {new Date(reg.fecha).toLocaleDateString("es-BO", { weekday: 'short', day: 'numeric', month: 'short' })}
                      </p>
                      <p className="text-xs text-billanga-gray mt-1 flex items-center gap-2">
                        <span className="flex items-center gap-1 text-green-400">
                          <LogIn className="w-3 h-3" /> 
                          {new Date(reg.hora_entrada).toLocaleTimeString("es-BO", { hour: '2-digit', minute:'2-digit' })}
                        </span>
                        <span>-</span>
                        {reg.hora_salida ? (
                          <span className="flex items-center gap-1 text-orange-400">
                            <LogOut className="w-3 h-3" /> 
                            {new Date(reg.hora_salida).toLocaleTimeString("es-BO", { hour: '2-digit', minute:'2-digit' })}
                          </span>
                        ) : (
                          <span className="text-billanga-gray/50 italic">En curso...</span>
                        )}
                      </p>
                    </div>
                    {reg.horas_trabajadas && (
                      <div className="text-right">
                        <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 font-mono font-bold text-xs">
                          {reg.horas_trabajadas} hrs
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center text-billanga-gray">
                <Clock className="w-8 h-8 mb-3 opacity-20" />
                <p className="text-sm">No hay registros recientes.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
