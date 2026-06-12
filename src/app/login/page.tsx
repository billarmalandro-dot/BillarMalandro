"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { ArrowLeft, Mail, Lock, AlertCircle, Loader2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
      setError("Correo y contraseña son obligatorios.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // Verificar si es staff y obtener su nivel de rol
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: staffData } = await supabase
        .from("usuarios")
        .select(`
          id_usuario,
          id_rol,
          activo,
          roles (
            nivel
          )
        `)
        .eq("auth_id", user.id)
        .maybeSingle();

      if (staffData) {
        if (staffData.activo === false) {
          await supabase.auth.signOut();
          setError("Cuenta inválida. Tu acceso ha sido desactivado.");
          setLoading(false);
          return;
        }

        const rolObj = staffData.roles ? (Array.isArray(staffData.roles) ? staffData.roles[0] : staffData.roles) : null;
        const level = rolObj?.nivel || 0;

        if (level >= 2) {
          router.push("/dashboard");
        } else {
          router.push("/dashboard/mesas");
        }
      } else {
        // Verificar si es cliente y está activo
        const { data: clientData } = await supabase
          .from("clientes")
          .select("activo")
          .eq("auth_id", user.id)
          .maybeSingle();

        if (clientData && clientData.activo === false) {
          await supabase.auth.signOut();
          setError("Cuenta inválida. Tu acceso ha sido desactivado.");
          setLoading(false);
          return;
        }

        router.push("/");
      }
      router.refresh();
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden font-[family-name:var(--font-geist-sans)] px-4">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-billanga-primary opacity-10 blur-[100px] rounded-full pointer-events-none" />

      {/* Botón regresar */}
      <Link href="/" className="absolute top-6 left-6 text-billanga-gray hover:text-white flex items-center gap-2 transition-colors z-20">
        <ArrowLeft className="w-5 h-5" />
        <span>Volver al inicio</span>
      </Link>

      <div className="glass-panel w-full max-w-md p-8 md:p-10 rounded-2xl z-10 animate-in fade-in zoom-in-95 duration-500">
        
        {/* Header del Form */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-billanga-primary relative mb-4">
            <Image 
              src="/logo_transparente.png" 
              alt="Logo Billar El Malandro" 
              fill 
              sizes="64px"
              className="object-cover"
            />
          </div>
          <h2 className="text-2xl font-bold text-white text-center">Bienvenido de vuelta</h2>
          <p className="text-billanga-gray text-sm mt-2 text-center">Ingresa a tu cuenta para continuar</p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-5">
          
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-sm p-3 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-billanga-gray block">Correo Electrónico</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-billanga-gray/50" />
              <input 
                type="email" 
                name="email"
                placeholder="tu@email.com" 
                className="w-full bg-black/40 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white placeholder:text-billanga-gray/50 focus:outline-none focus:border-billanga-primary focus:ring-1 focus:ring-billanga-primary transition-all"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-billanga-gray block">Contraseña</label>
              <Link href="#" className="text-xs text-billanga-primary hover:text-billanga-primary-dark transition-colors">¿Olvidaste tu contraseña?</Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-billanga-gray/50" />
              <input 
                type="password"
                name="password" 
                placeholder="••••••••" 
                className="w-full bg-black/40 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white placeholder:text-billanga-gray/50 focus:outline-none focus:border-billanga-primary focus:ring-1 focus:ring-billanga-primary transition-all"
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 rounded-lg bg-billanga-primary hover:bg-billanga-primary-dark text-white font-bold transition-all shadow-[0_0_15px_rgba(220, 38, 38,0.3)] hover:shadow-[0_0_25px_rgba(220, 38, 38,0.5)] mt-4 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Iniciando sesión...
              </>
            ) : (
              'Iniciar Sesión'
            )}
          </button>
        </form>

        {/* Footer del Form */}
        <p className="text-center text-sm text-billanga-gray mt-8">
          ¿No tienes una cuenta? <Link href="/registro" className="text-white hover:text-billanga-primary transition-colors font-medium">Regístrate aquí</Link>
        </p>
      </div>
    </div>
  );
}
