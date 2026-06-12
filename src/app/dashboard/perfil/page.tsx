"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { User, Shield, Mail, Check, AlertCircle, KeyRound } from "lucide-react";

interface UserProfile {
  id: string;
  nombre: string;
  email: string;
  rolNombre: string;
  rolNivel: number;
}

export default function PerfilPage() {
  const supabase = createClient();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [formNombre, setFormNombre] = useState("");
  const [formPassword, setFormPassword] = useState("");
  
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function loadProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: userData, error } = await supabase
          .from("usuarios")
          .select(`
            id_usuario,
            nombre,
            email,
            roles (
              nombre,
              nivel
            )
          `)
          .eq("auth_id", user.id)
          .maybeSingle();

        if (error) throw error;

        if (userData) {
          const rolInfo = userData.roles as any;
          setProfile({
            id: userData.id_usuario,
            nombre: userData.nombre,
            email: userData.email,
            rolNombre: rolInfo?.nombre || "Sin Rol",
            rolNivel: rolInfo?.nivel || 0
          });
          setFormNombre(userData.nombre);
        }
      } catch (err: any) {
        console.error("Error loading profile:", err);
        setErrorMsg("No se pudo cargar la información de tu perfil.");
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [supabase]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNombre.trim()) {
      setErrorMsg("El nombre no puede estar vacío.");
      return;
    }

    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      if (profile) {
        const { error } = await supabase
          .from("usuarios")
          .update({
            nombre: formNombre.trim(),
            updated_at: new Date().toISOString()
          })
          .eq("id_usuario", profile.id);

        if (error) throw error;
        
        setProfile(prev => prev ? { ...prev, nombre: formNombre.trim() } : null);
        setSuccessMsg("¡Nombre actualizado correctamente!");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error al actualizar el perfil.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formPassword.length < 6) {
      setErrorMsg("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const { error } = await supabase.auth.updateUser({
        password: formPassword
      });

      if (error) throw error;

      setFormPassword("");
      setSuccessMsg("¡Contraseña actualizada con éxito!");
    } catch (err: any) {
      setErrorMsg(err.message || "Error al cambiar la contraseña.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-t-billar-primary border-white/10 animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row items-center gap-6 p-8 bg-[#1a1a1c] border border-[#2a2a2c] rounded-2xl relative overflow-hidden group">
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-billar-primary/5 rounded-full blur-3xl pointer-events-none" />
        
        {/* Avatar */}
        <div className="w-24 h-24 rounded-full bg-billar-primary flex items-center justify-center font-black text-4xl shadow-lg shadow-billar-primary/20 transform group-hover:scale-105 transition-transform duration-300 select-none">
          {profile?.nombre.substring(0, 1).toUpperCase()}
        </div>
        
        {/* User Quick Info */}
        <div className="flex-1 text-center md:text-left">
          <h2 className="text-2xl font-bold text-white mb-1">{profile?.nombre}</h2>
          <p className="text-sm text-billar-gray mb-3 flex items-center justify-center md:justify-start gap-2">
            <Mail className="w-4 h-4 text-billar-primary" />
            {profile?.email}
          </p>
          
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-billar-primary/10 border border-billar-primary/20 text-billar-primary text-xs font-bold uppercase tracking-wider">
            <Shield className="w-3.5 h-3.5" />
            {profile?.rolNombre} (Nivel {profile?.rolNivel})
          </div>
        </div>
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="p-4 bg-green-500/10 border border-green-500/30 text-green-400 rounded-xl flex items-center gap-3">
          <Check className="w-5 h-5 text-green-500 shrink-0" />
          <span className="text-sm">{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <span className="text-sm">{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Edit Profile Form */}
        <div className="bg-[#1a1a1c] border border-[#2a2a2c] rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-billar-primary" />
            Datos Personales
          </h3>
          
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-billar-gray uppercase tracking-wider mb-2">
                Nombre Completo
              </label>
              <input 
                type="text" 
                value={formNombre}
                onChange={(e) => setFormNombre(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#121212] border border-[#2a2a2c] rounded-xl text-white placeholder-white/20 text-sm focus:border-billar-primary focus:outline-none transition-colors"
                placeholder="Ingresa tu nombre completo"
                required
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-billar-primary hover:bg-[#b81d24] text-white text-sm font-semibold shadow-lg shadow-billar-primary/10 transition-colors disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Guardar Cambios"}
            </button>
          </form>
        </div>

        {/* Change Password Form */}
        <div className="bg-[#1a1a1c] border border-[#2a2a2c] rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-billar-primary" />
            Seguridad
          </h3>
          
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-billar-gray uppercase tracking-wider mb-2">
                Nueva Contraseña
              </label>
              <input 
                type="password" 
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#121212] border border-[#2a2a2c] rounded-xl text-white placeholder-white/20 text-sm focus:border-billar-primary focus:outline-none transition-colors"
                placeholder="Mínimo 6 caracteres"
                required
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-billar-primary hover:bg-[#b81d24] text-white text-sm font-semibold shadow-lg shadow-billar-primary/10 transition-colors disabled:opacity-50"
            >
              {saving ? "Actualizando..." : "Cambiar Contraseña"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
