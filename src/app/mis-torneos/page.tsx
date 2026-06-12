"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Trophy, Calendar, Users, Award, ChevronRight, AlertCircle, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function MisTorneosPage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [cliente, setCliente] = useState<any>(null);
  
  const [torneosActivos, setTorneosActivos] = useState<any[]>([]);
  const [misTorneos, setMisTorneos] = useState<any[]>([]);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.push("/login");
        return;
      }
      setUser(authUser);

      // Buscar cliente
      const { data: clientData } = await supabase
        .from("clientes")
        .select("id_cliente, puntos_fidelidad")
        .eq("auth_id", authUser.id)
        .maybeSingle();

      if (clientData) {
        setCliente(clientData);

        // Cargar torneos en los que está inscrito
        const { data: inscripciones } = await supabase
          .from("participantes_torneo")
          .select(`
            id_participante,
            estado_pago,
            posicion_final,
            torneos (
              id_torneo,
              nombre,
              fecha_inicio,
              premio_estimado,
              estado
            )
          `)
          .eq("id_cliente", clientData.id_cliente)
          .order("created_at", { ascending: false });

        if (inscripciones) {
          setMisTorneos(inscripciones.map(i => ({ ...i, torneo: Array.isArray(i.torneos) ? i.torneos[0] : i.torneos })));
        }
      }

      // Cargar todos los torneos próximos y en curso (donde no esté inscrito)
      const { data: activos } = await supabase
        .from("torneos")
        .select("*")
        .in("estado", ["proximo", "en_curso"])
        .order("fecha_inicio", { ascending: true });

      if (activos) {
        setTorneosActivos(activos);
      }
    } catch (error) {
      console.error("Error cargando torneos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInscribirse = async (idTorneo: string) => {
    if (!cliente) return alert("Debes tener una cuenta de cliente para inscribirte.");
    
    try {
      const { error } = await supabase
        .from("participantes_torneo")
        .insert({
          id_torneo: idTorneo,
          id_cliente: cliente.id_cliente,
          estado_pago: "pendiente"
        });

      if (error) {
        if (error.code === '23505') {
          alert("Ya estás inscrito en este torneo.");
        } else {
          throw error;
        }
      } else {
        alert("¡Inscripción exitosa! Pasa por caja para pagar tu registro.");
        loadData();
      }
    } catch (err: any) {
      alert("Error al inscribirse: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex flex-col items-center justify-center text-billar-gray">
        <RefreshCw className="w-10 h-10 animate-spin text-billar-primary mb-4" />
        <p>Cargando campeonatos...</p>
      </div>
    );
  }

  const formatDate = (isoString: string) => {
    return new Intl.DateTimeFormat("es-BO", {
      day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit"
    }).format(new Date(isoString));
  };

  // Filtrar torneos activos para no mostrar a los que ya está inscrito
  const torneosDisponibles = torneosActivos.filter(
    t => !misTorneos.some(m => m.torneo?.id_torneo === t.id_torneo)
  );

  return (
    <div className="min-h-screen pt-24 pb-12 px-5 max-w-5xl mx-auto animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-white flex items-center gap-3">
            <Trophy className="w-8 h-8 md:w-10 md:h-10 text-billar-primary" />
            Zona de Torneos
          </h1>
          <p className="text-billar-gray mt-2">Compite, gana respeto y acumula Puntos Malandro.</p>
        </div>
        
        {cliente && (
          <div className="glass-panel px-4 py-2 rounded-xl flex items-center gap-3 border border-billar-primary/20 shadow-[0_0_15px_rgba(220, 38, 38,0.15)]">
            <Award className="w-5 h-5 text-yellow-500" />
            <div>
              <p className="text-[10px] text-billar-gray uppercase font-bold tracking-wider">Tus Puntos</p>
              <p className="text-lg font-black text-white">{cliente.puntos_fidelidad} Pts</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Mis Torneos */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
            <Award className="w-5 h-5 text-billar-primary" /> Mis Competiciones
          </h2>
          
          {misTorneos.length === 0 ? (
            <div className="glass-panel p-8 rounded-2xl text-center border border-white/5">
              <Trophy className="w-12 h-12 text-billar-gray mx-auto mb-3 opacity-30" />
              <p className="text-billar-gray">No estás inscrito en ningún torneo activo.</p>
              <p className="text-xs text-billar-gray/70 mt-1">¡Revisa los próximos torneos a la derecha y únete!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {misTorneos.map((inscripcion) => {
                const torneo = inscripcion.torneo;
                if (!torneo) return null;
                return (
                  <div key={inscripcion.id_participante} className="glass-panel p-5 rounded-2xl border border-white/10 hover:border-billar-primary/30 transition-all group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-billar-primary/5 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-billar-primary/10 transition-all" />
                    
                    <div className="flex justify-between items-start mb-3 relative z-10">
                      <div>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full mb-2 inline-block ${
                          torneo.estado === 'proximo' ? 'bg-blue-500/10 text-blue-400' :
                          torneo.estado === 'en_curso' ? 'bg-yellow-500/10 text-yellow-500 animate-pulse' :
                          'bg-billar-gray/20 text-billar-gray'
                        }`}>
                          {torneo.estado.replace('_', ' ')}
                        </span>
                        <h3 className="text-lg font-bold text-white">{torneo.nombre}</h3>
                      </div>
                    </div>
                    
                    <div className="space-y-2 mb-4 relative z-10">
                      <p className="text-xs text-billar-gray flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5" /> {formatDate(torneo.fecha_inicio)}
                      </p>
                      <p className="text-xs text-billar-gray flex items-center gap-2">
                        <Trophy className="w-3.5 h-3.5 text-yellow-500/70" /> Premio: Bs. {torneo.premio_estimado}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-white/5 flex justify-between items-center relative z-10">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${inscripcion.estado_pago === 'pagado' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                        <span className="text-xs text-billar-gray uppercase font-bold tracking-wider">
                          Pago: {inscripcion.estado_pago}
                        </span>
                      </div>
                      
                      {inscripcion.posicion_final && (
                        <div className="bg-yellow-500/20 px-3 py-1 rounded-lg border border-yellow-500/30">
                          <span className="text-xs font-bold text-yellow-500">
                            Puesto: #{inscripcion.posicion_final}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Torneos Disponibles */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
            <Calendar className="w-5 h-5 text-billar-primary" /> Próximos Campeonatos
          </h2>

          {torneosDisponibles.length === 0 ? (
            <div className="glass-panel p-8 rounded-2xl text-center border border-white/5">
              <Calendar className="w-12 h-12 text-billar-gray mx-auto mb-3 opacity-30" />
              <p className="text-billar-gray">No hay nuevos torneos programados por ahora.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {torneosDisponibles.map((torneo) => (
                <div key={torneo.id_torneo} className="bg-[#1a1a1c] border border-[#2a2a2c] p-5 rounded-2xl flex flex-col sm:flex-row gap-4 items-center justify-between hover:border-billar-primary/30 transition-all">
                  <div className="w-full sm:w-2/3">
                    <h3 className="text-white font-bold text-lg mb-1">{torneo.nombre}</h3>
                    {torneo.descripcion && <p className="text-xs text-billar-gray mb-3 line-clamp-2">{torneo.descripcion}</p>}
                    
                    <div className="flex flex-wrap gap-3">
                      <span className="text-[11px] text-billar-gray flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded-md">
                        <Calendar className="w-3 h-3 text-billar-primary" /> {new Date(torneo.fecha_inicio).toLocaleDateString()}
                      </span>
                      <span className="text-[11px] text-billar-gray flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded-md">
                        <Users className="w-3 h-3 text-billar-primary" /> Inscripción: Bs. {torneo.costo_inscripcion}
                      </span>
                    </div>
                  </div>
                  
                  <div className="w-full sm:w-auto flex-shrink-0">
                    <button 
                      onClick={() => handleInscribirse(torneo.id_torneo)}
                      className="w-full sm:w-auto bg-billar-primary hover:bg-billar-primary-dark text-white text-sm font-bold py-2.5 px-5 rounded-xl transition-all shadow-[0_4px_15px_rgba(220, 38, 38,0.3)] hover:shadow-[0_6px_20px_rgba(220, 38, 38,0.4)] flex items-center justify-center gap-2"
                    >
                      Inscribirme <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
