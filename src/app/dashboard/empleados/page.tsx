"use client";

import { useState, useEffect } from "react";
import {
  Users, UserPlus, Edit3, Shield, RefreshCw, Search,
  AlertTriangle, X, Check, Save, Mail, Trash2
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import ImageUploader from "@/components/ImageUploader";

interface Rol {
  id_rol: string;
  nombre: string;
  descripcion: string;
  nivel: number;
}

interface Empleado {
  id_usuario: string;
  nombre: string;
  email: string;
  id_rol: string;
  activo: boolean;
  created_at: string;
  avatar_url?: string;
  id_sucursal?: string;
  roles?: {
    nombre: string;
    nivel: number;
  };
}

export default function EmpleadosPage() {
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState("");
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [sucursales, setSucursales] = useState<any[]>([]);

  // Filtros
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRol, setSelectedRol] = useState("all");

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmpleado, setEditingEmpleado] = useState<Empleado | null>(null);
  const [formData, setFormData] = useState({ nombre: "", email: "", id_rol: "", avatar_url: "", id_sucursal: "", password: "" });
  const [mostrarInactivos, setMostrarInactivos] = useState(false);

  const supabase = createClient();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    setDbError("");
    try {
      const { data: rolesData, error: rolesError } = await supabase.from("roles").select("*").order("nivel", { ascending: false });
      if (rolesError) throw rolesError;
      setRoles(rolesData || []);

      const { data: sucData, error: sucError } = await supabase.from("sucursales").select("id_sucursal, nombre").eq("activo", true);
      if (sucError) throw sucError;
      setSucursales(sucData || []);

      const { data: empData, error: empError } = await supabase
        .from("usuarios")
        .select(`*, roles:id_rol(id_rol, nombre, nivel, descripcion), usuario_sucursal(id_sucursal)`)
        .order("created_at", { ascending: false });
      
      if (empError) throw empError;

      const normalized = (empData || []).map((e: any) => ({
        ...e,
        roles: Array.isArray(e.roles) ? e.roles[0] : e.roles,
        id_sucursal: Array.isArray(e.usuario_sucursal) && e.usuario_sucursal.length > 0 ? e.usuario_sucursal[0].id_sucursal : ""
      }));
      setEmpleados(normalized);
    } catch (err: any) {
      console.error(err);
      setDbError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingEmpleado(null);
    setFormData({ nombre: "", email: "", id_rol: roles[0]?.id_rol || "", avatar_url: "", id_sucursal: "", password: "" });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (emp: Empleado) => {
    setEditingEmpleado(emp);
    setFormData({ nombre: emp.nombre, email: emp.email, id_rol: emp.id_rol || "", avatar_url: emp.avatar_url || "", id_sucursal: emp.id_sucursal || "", password: "" });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.nombre || !formData.email || !formData.id_rol) {
      alert("Nombre, email y rol son obligatorios"); return;
    }

    try {
      let idUsuario = "";
      if (editingEmpleado) {
        // Actualizar sin tocar password ni email de Auth (por ahora solo perfil)
        const { error, data } = await supabase.from("usuarios").update({
          nombre: formData.nombre,
          email: formData.email,
          id_rol: formData.id_rol,
          avatar_url: formData.avatar_url || null
        }).eq("id_usuario", editingEmpleado.id_usuario).select();
        if (error) throw error;
        idUsuario = editingEmpleado.id_usuario;
        
        if (idUsuario) {
          if (formData.id_sucursal) {
            const { data: usData } = await supabase.from("usuario_sucursal").select("id_usuario_sucursal").eq("id_usuario", idUsuario);
            if (usData && usData.length > 0) {
              await supabase.from("usuario_sucursal").update({ id_sucursal: formData.id_sucursal, id_rol: formData.id_rol }).eq("id_usuario", idUsuario);
            } else {
              await supabase.from("usuario_sucursal").insert({ id_usuario: idUsuario, id_sucursal: formData.id_sucursal, id_rol: formData.id_rol });
            }
          } else {
            await supabase.from("usuario_sucursal").delete().eq("id_usuario", idUsuario);
          }
        }
      } else {
        // Crear usando nuestra nueva API Segura
        if (!formData.password) {
          alert("Debe asignar una contraseña para el nuevo empleado");
          return;
        }

        const res = await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData)
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Error al crear el usuario");
      }

      setIsModalOpen(false);
      setEditingEmpleado(null);
      loadData();
    } catch (err: any) {
      alert("Error al guardar: " + err.message);
    }
  };

  const handleToggleActivo = async (emp: Empleado) => {
    try {
      await supabase.from("usuarios").update({ activo: !emp.activo }).eq("id_usuario", emp.id_usuario);
      loadData();
    } catch (err: any) { alert("Error: " + err.message); }
  };

  const filtered = empleados.filter(e => {
    if (!mostrarInactivos && !e.activo) return false;
    if (selectedRol !== "all" && e.id_rol !== selectedRol) return false;
    if (searchQuery && !e.nombre.toLowerCase().includes(searchQuery.toLowerCase()) && !e.email.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const activosCount = empleados.filter(e => e.activo).length;

  if (loading) {
    return (<div className="flex flex-col items-center justify-center py-24 text-billar-gray"><RefreshCw className="w-10 h-10 animate-spin text-billar-primary mb-4" /><p className="text-sm">Cargando empleados...</p></div>);
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Users className="w-7 h-7 text-billar-primary" /> Gestión de Empleados</h2>
          <p className="text-sm text-billar-gray">Administra el personal, sus roles y accesos al sistema.</p>
        </div>
        <button onClick={loadData} className="flex items-center gap-2 px-4 py-2 border border-[#2a2a2c] hover:bg-[#2a2a2c] text-white rounded-lg text-sm transition-all"><RefreshCw className="w-4 h-4" /> Refrescar</button>
      </div>

      {dbError && (<div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl flex items-start gap-3"><AlertTriangle className="w-6 h-6 shrink-0" /><div><h4 className="font-bold text-white">Error</h4><p className="text-sm">{dbError}</p></div></div>)}

      {/* Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-[#1a1a1c] border border-[#2a2a2c] rounded-xl p-5">
          <div className="flex items-center gap-3"><div className="p-2.5 bg-billar-primary/10 rounded-xl"><Users className="w-5 h-5 text-billar-primary" /></div><div><p className="text-xs text-billar-gray">Empleados Activos</p><p className="text-2xl font-black text-white">{activosCount} <span className="text-sm font-normal text-billar-gray">/ {empleados.length}</span></p></div></div>
        </div>
        <div className="bg-[#1a1a1c] border border-[#2a2a2c] rounded-xl p-5">
          <div className="flex items-center gap-3"><div className="p-2.5 bg-blue-500/10 rounded-xl"><Shield className="w-5 h-5 text-blue-400" /></div><div><p className="text-xs text-billar-gray">Roles Configurables</p><p className="text-2xl font-black text-white">{roles.length}</p></div></div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-[#1a1a1c] border border-[#2a2a2c] p-4 rounded-xl flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-4 items-center flex-1">
          <div className="relative w-full max-w-xs"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-billar-gray/50" /><input type="text" placeholder="Buscar por nombre o email..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-black/40 border border-[#2a2a2c] rounded-lg py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-billar-primary" /></div>
          <select value={selectedRol} onChange={e => setSelectedRol(e.target.value)} className="bg-black/40 border border-[#2a2a2c] rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-billar-primary">
            <option value="all">Todos los Roles</option>
            {roles.map(r => (<option key={r.id_rol} value={r.id_rol}>{r.nombre}</option>))}
          </select>
          <label className="flex items-center gap-2 text-sm text-billar-gray cursor-pointer ml-2">
            <input type="checkbox" checked={mostrarInactivos} onChange={e => setMostrarInactivos(e.target.checked)} className="rounded border-[#2a2a2c] text-billar-primary bg-black/40" />
            Mostrar inactivos
          </label>
        </div>
        <button onClick={handleOpenCreate} className="flex items-center gap-2 px-4 py-2 bg-billar-primary hover:bg-billar-primary-dark text-white rounded-lg text-sm font-bold transition-all whitespace-nowrap"><UserPlus className="w-4 h-4" /> Nuevo Empleado</button>
      </div>

      {/* Tabla */}
      <div className="bg-[#1a1a1c] border border-[#2a2a2c] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead><tr className="border-b border-[#2a2a2c] text-xs font-bold text-billar-gray tracking-wider uppercase bg-[#141416]/50">
              <th className="py-4 pl-6">Empleado</th><th className="py-4">Rol / Nivel</th><th className="py-4 text-center">Estado</th><th className="py-4">Ingreso</th><th className="py-4 pr-6 text-center">Acciones</th>
            </tr></thead>
            <tbody>
              {filtered.length > 0 ? filtered.map(emp => (
                <tr key={emp.id_usuario} className="border-b border-[#2a2a2c]/40 hover:bg-white/[0.02] transition-colors text-sm text-white">
                  <td className="py-3 pl-6">
                    <div className="flex items-center gap-3">
                      {emp.avatar_url ? (
                        <img src={emp.avatar_url} alt="Avatar" className="w-8 h-8 rounded-full object-cover border border-[#2a2a2c]" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-billar-primary/20 text-billar-primary flex items-center justify-center font-bold text-xs border border-billar-primary/30">
                          {emp.nombre.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="font-bold">{emp.nombre}</div>
                        <div className="text-xs text-billar-gray flex items-center gap-1 mt-0.5"><Mail className="w-3 h-3" /> {emp.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3">
                    <div className="capitalize">{emp.roles?.nombre || "—"}</div>
                    <div className="text-[10px] text-billar-gray">Nivel: {emp.roles?.nivel || 0}</div>
                  </td>
                  <td className="py-3 text-center">
                    <button onClick={() => handleToggleActivo(emp)} className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase transition-all ${emp.activo ? "bg-green-500/10 text-green-500 hover:bg-green-500/20" : "bg-red-500/10 text-red-400 hover:bg-red-500/20"}`}>
                      {emp.activo ? "Activo" : "Inactivo"}
                    </button>
                  </td>
                  <td className="py-3 text-xs text-billar-gray">{new Date(emp.created_at).toLocaleDateString("es-BO")}</td>
                  <td className="py-3 pr-6 text-center">
                    <button onClick={() => handleOpenEdit(emp)} className="px-3 py-1.5 bg-[#2a2a2c] hover:bg-billar-primary hover:text-white rounded-lg text-xs font-bold transition-all text-billar-gray inline-flex items-center gap-1"><Edit3 className="w-3 h-3" /> Editar</button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={5} className="py-12 text-center text-billar-gray text-sm">No se encontraron empleados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal CRUD */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1c] border border-[#2a2a2c] w-full max-w-md rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-[#2a2a2c] flex justify-between items-center shrink-0"><h3 className="font-bold text-lg text-white">{editingEmpleado ? "Editar Empleado" : "Nuevo Empleado"}</h3><button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-[#2a2a2c] rounded-full text-billar-gray"><X className="w-5 h-5" /></button></div>
            <div className="p-6 space-y-4 overflow-y-auto">
              {!editingEmpleado && (
                <div className="bg-blue-500/10 border border-blue-500/30 p-3 rounded-xl text-xs text-blue-400 flex gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <p>Al crear este empleado, se generará su cuenta automáticamente con la contraseña que elijas a continuación. ¡Podrá iniciar sesión inmediatamente!</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-billar-gray block mb-1">Foto de Perfil (Opcional)</label>
                <div className="w-48 mx-auto">
                  <ImageUploader 
                    value={formData.avatar_url} 
                    onChange={(url) => setFormData({ ...formData, avatar_url: url })} 
                    folder="avatares"
                  />
                </div>
              </div>
              <div><label className="text-sm font-medium text-billar-gray block mb-1">Nombre Completo *</label><input type="text" value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} placeholder="Ej: Juan Pérez" className="w-full bg-black/40 border border-[#2a2a2c] rounded-lg py-2.5 px-3 text-white focus:outline-none focus:border-billar-primary" /></div>
              <div><label className="text-sm font-medium text-billar-gray block mb-1">Email *</label><input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="juan@ejemplo.com" className="w-full bg-black/40 border border-[#2a2a2c] rounded-lg py-2.5 px-3 text-white focus:outline-none focus:border-billar-primary" /></div>
              
              {!editingEmpleado && (
                <div><label className="text-sm font-medium text-billar-gray block mb-1">Contraseña *</label><input type="text" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} placeholder="Contraseña para ingresar" className="w-full bg-black/40 border border-[#2a2a2c] rounded-lg py-2.5 px-3 text-white focus:outline-none focus:border-billar-primary" /></div>
              )}
              <div>
                <label className="text-sm font-medium text-billar-gray block mb-1">Rol *</label>
                <select value={formData.id_rol} onChange={e => setFormData({ ...formData, id_rol: e.target.value })} className="w-full bg-black/40 border border-[#2a2a2c] rounded-lg py-2.5 px-3 text-white focus:outline-none focus:border-billar-primary capitalize">
                  {roles.map(r => (<option key={r.id_rol} value={r.id_rol}>{r.nombre}</option>))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-billar-gray block mb-1">Sucursal Asignada</label>
                <select value={formData.id_sucursal} onChange={e => setFormData({ ...formData, id_sucursal: e.target.value })} className="w-full bg-black/40 border border-[#2a2a2c] rounded-lg py-2.5 px-3 text-white focus:outline-none focus:border-billar-primary">
                  <option value="">Sin Sucursal (Flotante o Admin)</option>
                  {sucursales.map(s => (<option key={s.id_sucursal} value={s.id_sucursal}>{s.nombre}</option>))}
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-[#2a2a2c] bg-black/20 flex gap-3 shrink-0">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 rounded-lg border border-[#2a2a2c] hover:bg-[#2a2a2c] text-white font-bold text-sm">Cancelar</button>
              <button onClick={handleSave} className="flex-1 py-2.5 rounded-lg bg-billar-primary hover:bg-billar-primary-dark text-white font-bold text-sm flex items-center justify-center gap-2"><Save className="w-4 h-4" /> {editingEmpleado ? "Guardar" : "Crear"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
