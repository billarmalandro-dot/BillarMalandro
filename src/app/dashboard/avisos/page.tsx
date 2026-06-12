"use client";

import { useState, useEffect } from "react";
import {
  Megaphone, PlusCircle, Edit3, Trash2, RefreshCw, AlertTriangle,
  X, Save, Check, Image as ImageIcon
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import ImageUploader from "@/components/ImageUploader";

interface Novedad {
  id_novedad: string;
  titulo: string;
  contenido: string | null;
  tipo: string;
  imagen_url: string | null;
  activo: boolean;
  publicado_en: string;
  created_at: string;
}

export default function AvisosPage() {
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState("");
  const [novedades, setNovedades] = useState<Novedad[]>([]);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNovedad, setEditingNovedad] = useState<Novedad | null>(null);
  const [formData, setFormData] = useState({ titulo: "", contenido: "", tipo: "noticia", imagen_url: "" });

  const supabase = createClient();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    setDbError("");
    try {
      const { data, error } = await supabase.from("novedades").select("*").order("publicado_en", { ascending: false });
      if (error) throw error;
      setNovedades(data || []);
    } catch (err: any) {
      console.error(err);
      setDbError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingNovedad(null);
    setFormData({ titulo: "", contenido: "", tipo: "noticia", imagen_url: "" });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (nov: Novedad) => {
    setEditingNovedad(nov);
    setFormData({ titulo: nov.titulo, contenido: nov.contenido || "", tipo: nov.tipo, imagen_url: nov.imagen_url || "" });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.titulo) { alert("El título es obligatorio"); return; }
    try {
      if (editingNovedad) {
        const { error } = await supabase.from("novedades").update({
          titulo: formData.titulo, contenido: formData.contenido || null, tipo: formData.tipo, imagen_url: formData.imagen_url || null
        }).eq("id_novedad", editingNovedad.id_novedad);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("novedades").insert({
          titulo: formData.titulo, contenido: formData.contenido || null, tipo: formData.tipo, imagen_url: formData.imagen_url || null
        });
        if (error) throw error;
      }
      setIsModalOpen(false);
      setEditingNovedad(null);
      loadData();
    } catch (err: any) { alert("Error al guardar: " + err.message); }
  };

  const handleToggleActivo = async (nov: Novedad) => {
    try {
      await supabase.from("novedades").update({ activo: !nov.activo }).eq("id_novedad", nov.id_novedad);
      loadData();
    } catch (err: any) { alert("Error: " + err.message); }
  };

  const handleDelete = async (nov: Novedad) => {
    if (!confirm("¿Seguro que deseas eliminar este aviso permanentemente?")) return;
    try {
      await supabase.from("novedades").delete().eq("id_novedad", nov.id_novedad);
      loadData();
    } catch (err: any) { alert("Error al eliminar: " + err.message); }
  };

  if (loading) {
    return (<div className="flex flex-col items-center justify-center py-24 text-billar-gray"><RefreshCw className="w-10 h-10 animate-spin text-billar-primary mb-4" /><p className="text-sm">Cargando promociones...</p></div>);
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Megaphone className="w-7 h-7 text-billar-primary" /> 
            Portada y Promociones
          </h2>
          <p className="text-sm text-billar-gray">
            Publica banners, ofertas o fotos promocionales que los clientes verán al entrar al catálogo.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={loadData} className="p-2 border border-[#2a2a2c] hover:bg-[#2a2a2c] text-white rounded-xl transition-all">
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button onClick={handleOpenCreate} className="px-4 py-2 bg-billar-primary hover:bg-billar-primary-dark text-white rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-lg shadow-billar-primary/20">
            <PlusCircle className="w-5 h-5" /> Nueva Promo
          </button>
        </div>
      </div>

      {dbError && (<div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl flex items-start gap-3"><AlertTriangle className="w-6 h-6 shrink-0" /><div><h4 className="font-bold text-white">Error</h4><p className="text-sm">{dbError}</p></div></div>)}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {novedades.length > 0 ? novedades.map(nov => (
          <div key={nov.id_novedad} className="bg-[#1a1a1c] border border-[#2a2a2c] rounded-xl overflow-hidden flex flex-col group">
            {nov.imagen_url ? (
              <div className="h-40 w-full overflow-hidden relative">
                {!nov.activo && <div className="absolute inset-0 bg-black/60 z-10"></div>}
                <img src={nov.imagen_url} alt={nov.titulo} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase z-20 ${nov.tipo === 'promocion' ? 'bg-orange-500 text-white' : 'bg-blue-500 text-white'}`}>
                  {nov.tipo}
                </div>
              </div>
            ) : (
              <div className="h-24 w-full bg-[#2a2a2c]/50 flex items-center justify-center relative">
                {!nov.activo && <div className="absolute inset-0 bg-black/60 z-10"></div>}
                <ImageIcon className="w-8 h-8 text-billar-gray/50" />
                <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase z-20 ${nov.tipo === 'promocion' ? 'bg-orange-500 text-white' : 'bg-blue-500 text-white'}`}>
                  {nov.tipo}
                </div>
              </div>
            )}
            <div className="p-5 flex flex-col flex-1 relative">
              {!nov.activo && <div className="absolute inset-0 bg-black/50 z-10"></div>}
              <div className="relative z-20 flex-1">
                <h3 className="font-bold text-lg text-white line-clamp-1">{nov.titulo}</h3>
                <p className="text-xs text-billar-gray mt-1 line-clamp-2">{nov.contenido || "Sin contenido"}</p>
                <div className="mt-4 text-[10px] text-billar-gray">Publicado: {new Date(nov.publicado_en).toLocaleDateString("es-BO")}</div>
              </div>
              <div className="mt-4 pt-4 border-t border-[#2a2a2c] flex justify-between items-center relative z-20">
                <button onClick={() => handleToggleActivo(nov)} className={`text-xs font-bold transition-all ${nov.activo ? "text-green-500 hover:text-green-400" : "text-billar-gray hover:text-white"}`}>
                  {nov.activo ? "Visible al público" : "Oculto"}
                </button>
                <div className="flex gap-1">
                  <button onClick={() => handleOpenEdit(nov)} className="p-1.5 hover:bg-[#2a2a2c] rounded-lg text-billar-gray hover:text-white transition-all"><Edit3 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(nov)} className="p-1.5 hover:bg-red-500/10 rounded-lg text-billar-gray hover:text-red-400 transition-all"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          </div>
        )) : null}
        {novedades.length === 0 && (
          <div className="col-span-full py-24 text-center text-billar-gray">
            No hay promociones o portadas publicadas.
          </div>
        )}
      </div>

      {/* Modal CRUD */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1c] border border-[#2a2a2c] w-full max-w-lg rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-[#2a2a2c] flex justify-between items-center">
              <h3 className="font-bold text-lg text-white">{editingNovedad ? "Editar Promo" : "Nueva Promo para Portada"}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-[#2a2a2c] rounded-full text-billar-gray"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div><label className="text-sm font-medium text-billar-gray block mb-1">Título *</label><input type="text" value={formData.titulo} onChange={e => setFormData({ ...formData, titulo: e.target.value })} placeholder="Ej: ¡2x1 en Cervezas!" className="w-full bg-black/40 border border-[#2a2a2c] rounded-lg py-2.5 px-3 text-white focus:outline-none focus:border-billar-primary" /></div>
              <div><label className="text-sm font-medium text-billar-gray block mb-1">Tipo</label><select value={formData.tipo} onChange={e => setFormData({ ...formData, tipo: e.target.value })} className="w-full bg-black/40 border border-[#2a2a2c] rounded-lg py-2.5 px-3 text-white focus:outline-none focus:border-billar-primary"><option value="noticia">Noticia</option><option value="oferta">Promoción</option><option value="evento">Evento</option></select></div>
              <div><label className="text-sm font-medium text-billar-gray block mb-1">Contenido descriptivo</label><textarea rows={3} value={formData.contenido} onChange={e => setFormData({ ...formData, contenido: e.target.value })} placeholder="Detalles de la promoción..." className="w-full bg-black/40 border border-[#2a2a2c] rounded-lg py-2.5 px-3 text-white placeholder:text-billar-gray/50 focus:outline-none focus:border-billar-primary text-sm" /></div>
              <div>
                <label className="text-sm font-medium text-billar-gray block mb-1">Imagen (Portada de la Promo)</label>
                <ImageUploader 
                  value={formData.imagen_url} 
                  onChange={(url) => setFormData({ ...formData, imagen_url: url })} 
                  folder="avisos"
                />
              </div>
            </div>
            <div className="p-6 border-t border-[#2a2a2c] bg-black/20 flex gap-3">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 rounded-lg border border-[#2a2a2c] hover:bg-[#2a2a2c] text-white font-bold text-sm">Cancelar</button>
              <button onClick={handleSave} className="flex-1 py-2.5 rounded-lg bg-billar-primary hover:bg-billar-primary-dark text-white font-bold text-sm flex items-center justify-center gap-2"><Save className="w-4 h-4" /> {editingNovedad ? "Guardar" : "Publicar"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
