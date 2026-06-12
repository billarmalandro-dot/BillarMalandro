"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { 
  User, Award, MapPin, Phone, Mail, Clock, 
  ShoppingBag, Shield, Edit2, Save, X, RefreshCw, Trophy, Camera
} from "lucide-react";

export default function PerfilPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [clienteData, setClienteData] = useState<any>(null);
  const [historialVentas, setHistorialVentas] = useState<any[]>([]);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    nombre: "",
    telefono: "",
    direccion: ""
  });

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser) {
        router.push("/login");
        return;
      }
      setUser(authUser);

      // Buscar si es un cliente
      const { data: cliente, error: clienteError } = await supabase
        .from("clientes")
        .select("*")
        .eq("auth_id", authUser.id)
        .maybeSingle();

      if (cliente) {
        setClienteData(cliente);
        setFormData({
          nombre: cliente.nombre || "",
          telefono: cliente.telefono || "",
          direccion: cliente.direccion || ""
        });

        // Obtener historial de ventas
        const { data: ventas } = await supabase
          .from("ventas")
          .select(`
            id_venta,
            total,
            estado,
            created_at,
            metodo_pago
          `)
          .eq("id_cliente", cliente.id_cliente)
          .order("created_at", { ascending: false })
          .limit(10);
        
        if (ventas) {
          setHistorialVentas(ventas);
        }
      } else {
        // Podría ser un usuario staff, buscar en usuarios
        const { data: staffData } = await supabase
          .from("usuarios")
          .select("nombre, email, id_rol, avatar_url, roles(nombre)")
          .eq("auth_id", authUser.id)
          .maybeSingle();
        
        if (staffData) {
          setClienteData({ ...staffData, isStaff: true });
          setFormData({
            nombre: staffData.nombre || "",
            telefono: "",
            direccion: ""
          });
        }
      }
    } catch (err) {
      console.error("Error al cargar perfil:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!clienteData || clienteData.isStaff) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("clientes")
        .update({
          nombre: formData.nombre,
          telefono: formData.telefono,
          direccion: formData.direccion
        })
        .eq("auth_id", user.id);

      if (error) throw error;
      
      setClienteData({ ...clienteData, ...formData });
      setIsEditing(false);
    } catch (err: any) {
      alert("Error al guardar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingAvatar(true);
    try {
      // Compresión básica con Canvas
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      
      const compressedBlob = await new Promise<Blob>((resolve, reject) => {
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 400;
          const MAX_HEIGHT = 400;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob(
            (blob) => {
              if (blob) resolve(blob);
              else reject(new Error("Error al comprimir"));
            },
            "image/webp",
            0.8
          );
        };
        img.onerror = reject;
        img.src = objectUrl;
      });

      const fileExt = "webp";
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Subir a Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, compressedBlob, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const avatarUrl = publicUrlData.publicUrl;

      // Actualizar DB
      const table = clienteData?.isStaff ? "usuarios" : "clientes";
      const { error: dbError } = await supabase
        .from(table)
        .update({ avatar_url: avatarUrl })
        .eq("auth_id", user.id);

      if (dbError) throw dbError;

      setClienteData({ ...clienteData, avatar_url: avatarUrl });
    } catch (err: any) {
      alert("Error al subir foto: " + err.message);
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex flex-col items-center justify-center text-billar-gray">
        <RefreshCw className="w-10 h-10 animate-spin text-billar-primary mb-4" />
        <p>Cargando tu perfil...</p>
      </div>
    );
  }

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat("es-BO", {
      day: "2-digit", month: "long", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    }).format(d);
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-5 max-w-5xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row gap-6">
        
        {/* Columna Izquierda: Tarjeta de Perfil */}
        <div className="w-full md:w-1/3 space-y-6">
          <div className="glass-panel p-8 rounded-3xl flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-billar-primary/20 to-transparent" />
            
            <div 
              onClick={() => !uploadingAvatar && fileInputRef.current?.click()}
              className="w-28 h-28 bg-[#1a1a1c] border-4 border-[#2a2a2c] hover:border-billar-primary/50 rounded-full flex items-center justify-center shadow-2xl relative z-10 mb-4 cursor-pointer group overflow-hidden transition-colors"
            >
              {clienteData?.avatar_url ? (
                <img src={clienteData.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-12 h-12 text-billar-gray" />
              )}
              
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {uploadingAvatar ? (
                  <RefreshCw className="w-6 h-6 text-white animate-spin" />
                ) : (
                  <>
                    <Camera className="w-6 h-6 text-white mb-1" />
                    <span className="text-[10px] text-white font-bold">Cambiar</span>
                  </>
                )}
              </div>
            </div>
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleAvatarUpload} 
            />
            
            <h2 className="text-2xl font-black text-white relative z-10">{clienteData?.nombre || "Usuario"}</h2>
            <p className="text-sm text-billar-gray mb-6 relative z-10">{user?.email}</p>

            {clienteData?.isStaff ? (
              <div className="flex items-center gap-2 bg-billar-primary/10 border border-billar-primary/30 px-4 py-2 rounded-xl text-billar-primary font-bold w-full justify-center">
                <Shield className="w-5 h-5" />
                <span>Personal: {Array.isArray(clienteData?.roles) ? clienteData?.roles[0]?.nombre : clienteData?.roles?.nombre || "Staff"}</span>
              </div>
            ) : (
              <div className="w-full bg-[#1a1a1c] border border-[#2a2a2c] rounded-2xl p-4 flex flex-col items-center gap-2 transition-all hover:border-billar-primary/50">
                <Trophy className="w-8 h-8 text-yellow-500 mb-1" />
                <span className="text-xs text-billar-gray font-bold uppercase tracking-widest">Nivel Actual</span>
                <span className="text-3xl font-black text-white flex items-center gap-2">
                  {clienteData?.puntos_fidelidad || 0}
                  <span className="text-sm text-billar-primary">Pts</span>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Columna Derecha: Datos y Actividad */}
        <div className="w-full md:w-2/3 space-y-6">
          
          {/* Tarjeta de Datos Personales */}
          <div className="glass-panel p-6 md:p-8 rounded-3xl">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/5">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <User className="w-6 h-6 text-billar-primary" /> Mis Datos
              </h3>
              {!clienteData?.isStaff && (
                <button 
                  onClick={() => setIsEditing(!isEditing)} 
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-billar-gray hover:text-white transition-all"
                >
                  {isEditing ? <X className="w-5 h-5" /> : <Edit2 className="w-5 h-5" />}
                </button>
              )}
            </div>

            <div className="space-y-5">
              <div>
                <label className="text-xs text-billar-gray uppercase font-bold tracking-wider mb-2 block flex items-center gap-2"><User className="w-3.5 h-3.5" /> Nombre Completo</label>
                {isEditing ? (
                  <input type="text" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className="w-full bg-black/40 border border-[#2a2a2c] rounded-xl py-3 px-4 text-white focus:outline-none focus:border-billar-primary transition-all" />
                ) : (
                  <p className="text-white bg-black/20 py-3 px-4 rounded-xl border border-transparent">{clienteData?.nombre || "—"}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="text-xs text-billar-gray uppercase font-bold tracking-wider mb-2 block flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> Correo Electrónico</label>
                  <p className="text-white bg-black/20 py-3 px-4 rounded-xl border border-transparent">{user?.email}</p>
                </div>
                <div>
                  <label className="text-xs text-billar-gray uppercase font-bold tracking-wider mb-2 block flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> Teléfono</label>
                  {isEditing ? (
                    <input type="text" value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} className="w-full bg-black/40 border border-[#2a2a2c] rounded-xl py-3 px-4 text-white focus:outline-none focus:border-billar-primary transition-all" />
                  ) : (
                    <p className="text-white bg-black/20 py-3 px-4 rounded-xl border border-transparent">{clienteData?.telefono || "—"}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs text-billar-gray uppercase font-bold tracking-wider mb-2 block flex items-center gap-2"><MapPin className="w-3.5 h-3.5" /> Dirección de Envío</label>
                {isEditing ? (
                  <textarea value={formData.direccion} onChange={e => setFormData({...formData, direccion: e.target.value})} className="w-full bg-black/40 border border-[#2a2a2c] rounded-xl py-3 px-4 text-white focus:outline-none focus:border-billar-primary transition-all min-h-[100px]" />
                ) : (
                  <p className="text-white bg-black/20 py-3 px-4 rounded-xl border border-transparent min-h-[60px]">{clienteData?.direccion || "—"}</p>
                )}
              </div>

              {isEditing && (
                <div className="pt-4 flex justify-end">
                  <button 
                    onClick={handleSave} 
                    disabled={saving}
                    className="flex items-center gap-2 bg-billar-primary hover:bg-billar-primary-dark text-white font-bold py-3 px-6 rounded-xl transition-all disabled:opacity-50"
                  >
                    {saving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    Guardar Cambios
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Historial de Compras (Solo para Clientes) */}
          {!clienteData?.isStaff && (
            <div className="glass-panel p-6 md:p-8 rounded-3xl">
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/5">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <ShoppingBag className="w-6 h-6 text-billar-primary" /> Historial de Compras
                </h3>
              </div>
              
              {historialVentas.length === 0 ? (
                <div className="text-center py-10 bg-black/20 rounded-2xl border border-white/5">
                  <Clock className="w-12 h-12 text-billar-gray mx-auto mb-3 opacity-50" />
                  <p className="text-billar-gray">Aún no tienes compras registradas.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {historialVentas.map(venta => (
                    <div key={venta.id_venta} className="bg-[#1a1a1c] border border-[#2a2a2c] p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-[#3a3a3c] transition-colors">
                      <div>
                        <p className="text-sm font-bold text-white mb-1">Pedido #{venta.id_venta.split("-")[0]}</p>
                        <p className="text-xs text-billar-gray flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDate(venta.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${venta.estado === 'completada' ? 'bg-green-500/10 text-green-500' : venta.estado === 'anulada' ? 'bg-red-500/10 text-red-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                          {venta.estado}
                        </span>
                        <p className="text-lg font-black text-white">Bs. {venta.total.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
