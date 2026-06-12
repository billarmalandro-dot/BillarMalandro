"use client";

import { useState, useEffect } from "react";
import { 
  Trophy, Plus, Users, Search, AlertTriangle, 
  RefreshCw, CheckCircle, Clock, Calendar, ChevronRight, X
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import ImageUploader from "@/components/ImageUploader";

export default function CampeonatosPage() {
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState("");
  const [campeonatos, setCampeonatos] = useState<any[]>([]);
  const [activeSucursalId, setActiveSucursalId] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Modal Crear
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    fecha_inicio: "",
    cupo_maximo: "16",
    precio_inscripcion: "0",
    premio: "",
    imagen_url: ""
  });

  // Modal Inscripciones
  const [activeCampeonato, setActiveCampeonato] = useState<any>(null);
  const [inscripciones, setInscripciones] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [isRegistering, setIsRegistering] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState("");
  const [estadoPago, setEstadoPago] = useState("pendiente");

  const supabase = createClient();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    setDbError("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: dbUser } = await supabase.from("usuarios").select("id_usuario").eq("auth_id", user.id).single();
        setCurrentUser(dbUser);
      }

      const { data: sucursales } = await supabase.from("sucursales").select("id_sucursal");
      const sucursalId = sucursales?.[0]?.id_sucursal || "";
      setActiveSucursalId(sucursalId);

      const { data: camps, error } = await supabase
        .from("campeonatos")
        .select("*")
        .eq("id_sucursal", sucursalId)
        .order("fecha_inicio", { ascending: false });

      if (error) throw error;
      setCampeonatos(camps || []);
      
    } catch (err: any) {
      setDbError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.nombre || !formData.fecha_inicio || !activeSucursalId) return;
    try {
      const { error } = await supabase.from("campeonatos").insert({
        id_sucursal: activeSucursalId,
        nombre: formData.nombre,
        descripcion: formData.descripcion,
        fecha_inicio: formData.fecha_inicio,
        cupo_maximo: parseInt(formData.cupo_maximo) || null,
        precio_inscripcion: Number(formData.precio_inscripcion),
        premio: formData.premio || null,
        imagen_url: formData.imagen_url || null,
        created_by: currentUser?.id_usuario,
        estado: "proximo"
      });

      if (error) throw error;
      setIsCreating(false);
      setFormData({
        nombre: "", descripcion: "", fecha_inicio: "", 
        cupo_maximo: "16", precio_inscripcion: "0", premio: "", imagen_url: ""
      });
      loadData();
    } catch (err: any) {
      alert("Error creando campeonato: " + err.message);
    }
  };

  const loadInscripciones = async (camp: any) => {
    setActiveCampeonato(camp);
    try {
      const [inscReq, clientesReq] = await Promise.all([
        supabase.from("inscripciones").select("*, clientes(nombre, telefono)").eq("id_campeonato", camp.id_campeonato),
        supabase.from("clientes").select("id_cliente, nombre, telefono").eq("activo", true)
      ]);
      
      setInscripciones(inscReq.data || []);
      setClientes(clientesReq.data || []);
      setIsRegistering(true);
    } catch (err: any) {
      alert("Error cargando inscripciones: " + err.message);
    }
  };

  const handleRegisterClient = async () => {
    if (!selectedCliente || !activeCampeonato) return;
    try {
      const { error } = await supabase.from("inscripciones").insert({
        id_campeonato: activeCampeonato.id_campeonato,
        id_cliente: selectedCliente,
        estado_pago: estadoPago
      });

      if (error) throw error;
      
      // Recargar inscripciones
      const { data } = await supabase.from("inscripciones").select("*, clientes(nombre, telefono)").eq("id_campeonato", activeCampeonato.id_campeonato);
      setInscripciones(data || []);
      setSelectedCliente("");
    } catch (err: any) {
      if (err.message.includes("unique")) alert("Este cliente ya está inscrito.");
      else alert("Error: " + err.message);
    }
  };

  const toggleEstadoPago = async (id_inscripcion: string, currentState: string) => {
    try {
      const newState = currentState === "pagado" ? "pendiente" : "pagado";
      await supabase.from("inscripciones").update({ estado_pago: newState }).eq("id_inscripcion", id_inscripcion);
      
      setInscripciones(inscripciones.map(i => i.id_inscripcion === id_inscripcion ? { ...i, estado_pago: newState } : i));
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Trophy className="w-7 h-7 text-billar-primary" /> 
            Campeonatos y Torneos
          </h2>
          <p className="text-sm text-billar-gray">
            Crea torneos de billar y gestiona las inscripciones.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={loadData} className="p-2 border border-[#2a2a2c] hover:bg-[#2a2a2c] text-white rounded-xl transition-all">
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button 
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-4 py-2 bg-billar-primary hover:bg-billar-primary-dark text-white rounded-xl text-sm font-bold transition-all shadow-[0_0_20px_rgba(220, 38, 38,0.3)]"
          >
            <Plus className="w-4 h-4" /> Nuevo Torneo
          </button>
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

      {/* Grid de Campeonatos */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-12 text-center text-billar-gray">Cargando torneos...</div>
        ) : campeonatos.length > 0 ? (
          campeonatos.map((camp) => (
            <div key={camp.id_campeonato} className="bg-[#1a1a1c] border border-[#2a2a2c] rounded-2xl p-6 hover:border-billar-primary/50 transition-all flex flex-col group">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl ${camp.estado === "proximo" ? "bg-blue-500/10 text-blue-400" : camp.estado === "en_curso" ? "bg-green-500/10 text-green-400" : "bg-[#2a2a2c] text-billar-gray"}`}>
                    <Trophy className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white leading-tight">{camp.nombre}</h3>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-billar-gray">{camp.estado.replace("_", " ")}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3 mb-6 flex-1">
                <div className="flex items-center gap-2 text-sm text-billar-gray">
                  <Calendar className="w-4 h-4 text-billar-primary" />
                  <span>{new Date(camp.fecha_inicio).toLocaleDateString("es-BO")}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-billar-gray">
                  <Users className="w-4 h-4 text-billar-primary" />
                  <span>Cupo Máximo: {camp.cupo_maximo || "Ilimitado"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-billar-gray">
                  <span className="font-bold text-green-400">Bs. {camp.precio_inscripcion}</span>
                  <span>/ Inscripción</span>
                </div>
                {camp.premio && (
                  <p className="text-sm text-billar-gray bg-[#2a2a2c]/50 p-2 rounded-lg italic">
                    Premio: {camp.premio}
                  </p>
                )}
              </div>

              <button 
                onClick={() => loadInscripciones(camp)}
                className="w-full flex items-center justify-between px-4 py-3 bg-[#2a2a2c] hover:bg-billar-primary text-white rounded-xl text-sm font-bold transition-all group-hover:shadow-[0_0_20px_rgba(220, 38, 38,0.2)]"
              >
                <span>Ver Inscripciones</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ))
        ) : (
          <div className="col-span-full py-12 text-center text-billar-gray border border-dashed border-[#2a2a2c] rounded-2xl">
            <Trophy className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="text-sm">No hay torneos registrados.</p>
          </div>
        )}
      </div>

      {/* Modal Crear */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1c] border border-[#2a2a2c] w-full max-w-lg rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-[#2a2a2c] flex justify-between items-center">
              <h3 className="font-bold text-lg text-white">Nuevo Torneo</h3>
              <button onClick={() => setIsCreating(false)} className="p-2 hover:bg-[#2a2a2c] rounded-full text-billar-gray"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-billar-gray block mb-1">Nombre del Torneo *</label>
                <input type="text" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className="w-full bg-black/40 border border-[#2a2a2c] rounded-lg py-2.5 px-3 text-white focus:border-billar-primary outline-none" placeholder="Ej: Torneo Relámpago Bola 8" />
              </div>
              <div>
                <label className="text-sm font-medium text-billar-gray block mb-1">Banner del Torneo (Opcional)</label>
                <ImageUploader 
                  value={formData.imagen_url} 
                  onChange={(url) => setFormData({ ...formData, imagen_url: url })} 
                  folder="campeonatos"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-billar-gray block mb-1">Fecha Inicio *</label>
                  <input type="date" value={formData.fecha_inicio} onChange={e => setFormData({...formData, fecha_inicio: e.target.value})} className="w-full bg-black/40 border border-[#2a2a2c] rounded-lg py-2.5 px-3 text-white focus:border-billar-primary outline-none [color-scheme:dark]" />
                </div>
                <div>
                  <label className="text-sm font-medium text-billar-gray block mb-1">Cupo Máximo</label>
                  <input type="number" value={formData.cupo_maximo} onChange={e => setFormData({...formData, cupo_maximo: e.target.value})} className="w-full bg-black/40 border border-[#2a2a2c] rounded-lg py-2.5 px-3 text-white focus:border-billar-primary outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-billar-gray block mb-1">Costo Inscripción (Bs.)</label>
                  <input type="number" step="0.01" value={formData.precio_inscripcion} onChange={e => setFormData({...formData, precio_inscripcion: e.target.value})} className="w-full bg-black/40 border border-[#2a2a2c] rounded-lg py-2.5 px-3 text-white focus:border-billar-primary outline-none" />
                </div>
                <div>
                  <label className="text-sm font-medium text-billar-gray block mb-1">Premio</label>
                  <input type="text" value={formData.premio} onChange={e => setFormData({...formData, premio: e.target.value})} className="w-full bg-black/40 border border-[#2a2a2c] rounded-lg py-2.5 px-3 text-white focus:border-billar-primary outline-none" placeholder="Ej: 1000 Bs + Trofeo" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-billar-gray block mb-1">Descripción</label>
                <textarea rows={2} value={formData.descripcion} onChange={e => setFormData({...formData, descripcion: e.target.value})} className="w-full bg-black/40 border border-[#2a2a2c] rounded-lg py-2.5 px-3 text-white focus:border-billar-primary outline-none" placeholder="Reglas, formato..." />
              </div>
            </div>
            <div className="p-6 border-t border-[#2a2a2c] bg-black/20 flex gap-3">
              <button onClick={() => setIsCreating(false)} className="flex-1 py-2.5 rounded-lg border border-[#2a2a2c] hover:bg-[#2a2a2c] text-white font-bold text-sm">Cancelar</button>
              <button onClick={handleCreate} className="flex-1 py-2.5 rounded-lg bg-billar-primary hover:bg-billar-primary-dark text-white font-bold text-sm">Crear Torneo</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Inscripciones */}
      {isRegistering && activeCampeonato && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1c] border border-[#2a2a2c] w-full max-w-2xl rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-[#2a2a2c] flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-bold text-lg text-white">Inscripciones</h3>
                <p className="text-xs text-billar-primary font-bold uppercase">{activeCampeonato.nombre}</p>
              </div>
              <button onClick={() => setIsRegistering(false)} className="p-2 hover:bg-[#2a2a2c] rounded-full text-billar-gray"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="p-6 bg-black/20 border-b border-[#2a2a2c] shrink-0">
              <h4 className="text-sm font-bold text-white mb-3">Inscribir Nuevo Jugador</h4>
              <div className="flex flex-col sm:flex-row gap-3">
                <select 
                  value={selectedCliente} 
                  onChange={e => setSelectedCliente(e.target.value)}
                  className="flex-1 bg-black/40 border border-[#2a2a2c] rounded-lg py-2.5 px-3 text-white focus:border-billar-primary outline-none text-sm"
                >
                  <option value="">-- Seleccionar Cliente --</option>
                  {clientes.map(c => (
                    <option key={c.id_cliente} value={c.id_cliente}>{c.nombre} {c.telefono ? `(${c.telefono})` : ""}</option>
                  ))}
                </select>
                <select
                  value={estadoPago}
                  onChange={e => setEstadoPago(e.target.value)}
                  className="bg-black/40 border border-[#2a2a2c] rounded-lg py-2.5 px-3 text-white focus:border-billar-primary outline-none text-sm"
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="pagado">Pagado</option>
                </select>
                <button 
                  onClick={handleRegisterClient}
                  className="px-4 py-2.5 bg-billar-primary hover:bg-billar-primary-dark text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Inscribir
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-0">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-[#1a1a1c]">
                  <tr className="border-b border-[#2a2a2c] text-xs font-bold text-billar-gray tracking-wider uppercase">
                    <th className="py-3 pl-6">Jugador</th>
                    <th className="py-3 text-center">Estado Pago</th>
                    <th className="py-3 pr-6 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {inscripciones.length > 0 ? (
                    inscripciones.map((ins, i) => (
                      <tr key={ins.id_inscripcion} className="border-b border-[#2a2a2c]/40 hover:bg-white/[0.02]">
                        <td className="py-3 pl-6">
                          <div className="flex items-center gap-3">
                            <span className="text-billar-gray font-mono text-xs w-4">{i + 1}.</span>
                            <div>
                              <p className="text-sm font-bold text-white">{ins.clientes?.nombre}</p>
                              <p className="text-[10px] text-billar-gray">{ins.clientes?.telefono || "Sin cel"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 text-center">
                          <button 
                            onClick={() => toggleEstadoPago(ins.id_inscripcion, ins.estado_pago)}
                            className={`px-3 py-1 text-xs font-bold uppercase rounded-full border transition-all ${
                              ins.estado_pago === 'pagado' 
                                ? "bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20" 
                                : "bg-orange-500/10 border-orange-500/30 text-orange-400 hover:bg-orange-500/20"
                            }`}
                          >
                            {ins.estado_pago}
                          </button>
                        </td>
                        <td className="py-3 pr-6 text-right text-xs text-billar-gray">
                          {new Date(ins.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-sm text-billar-gray">
                        No hay jugadores inscritos aún.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="p-4 border-t border-[#2a2a2c] bg-black/20 flex justify-between items-center text-sm">
              <span className="text-billar-gray">Total Inscritos:</span>
              <span className="font-bold text-white text-lg">{inscripciones.length} / {activeCampeonato.cupo_maximo || "∞"}</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
