"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LogOut, User as UserIcon, Settings, Menu, X, LayoutDashboard,
  Users, CircleDot, ShoppingCart, Wallet, UserCheck, Package, BarChart3,
  Store, Utensils, Clock, Bell, Trash2, LayoutTemplate, Trophy, Truck, UserCircle, ShieldAlert, ArrowLeft, Eye
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import NotificationBell from "@/components/NotificationBell";

interface UserProfile {
  nombre: string;
  email: string;
  rolNombre: string;
  rolNivel: number;
  avatarUrl?: string;
}

const PROFILE_CACHE_KEY = "billar_malandro_staff_profile";

function getCachedProfile(): UserProfile | null {
  try {
    if (typeof window === "undefined") return null;
    const cached = sessionStorage.getItem(PROFILE_CACHE_KEY);
    if (cached) return JSON.parse(cached);
  } catch {}
  return null;
}

function setCachedProfile(profile: UserProfile) {
  try {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
    }
  } catch {}
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  // Siempre inicializar igual para evitar hydration mismatch
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Cargar caché inmediatamente en el cliente
    const cached = getCachedProfile();
    if (cached) {
      setUserProfile(cached);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadUserProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (!cancelled) router.push("/login");
          return;
        }

        const { data: userData, error } = await supabase
          .from("usuarios")
          .select(`
            nombre,
            email,
            avatar_url,
            roles (
              nombre,
              nivel
            )
          `)
          .eq("auth_id", user.id)
          .maybeSingle();

        if (cancelled) return;

        if (error || !userData) {
          console.error("Error or no user data in dashboard layout:", error);
          router.push("/");
          return;
        }

        const rolInfo = userData.roles as any;
        const profile: UserProfile = {
          nombre: userData.nombre,
          email: userData.email,
          avatarUrl: userData.avatar_url || undefined,
          rolNombre: rolInfo?.nombre || "Sin Rol",
          rolNivel: rolInfo?.nivel || 0,
        };

        setUserProfile(profile);
        setCachedProfile(profile);
      } catch (err) {
        console.error("Failed to load user profile in layout:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadUserProfile();
    return () => { cancelled = true; };
  }, []); // Sin dependencias innecesarias

  const handleSignOut = async () => {
    console.log("Cerrando sesión desde Panel Administrativo...");
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Error al cerrar sesión con Supabase:", err);
    }

    try {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem(PROFILE_CACHE_KEY);
        localStorage.clear();
        sessionStorage.clear();
      }
    } catch (cleanErr) {
      console.error("Error al limpiar almacenamiento de sesión:", cleanErr);
    }

    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  };

  const menuItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, minLevel: 2 },
    { href: "/dashboard/mesas", label: "Mesas", icon: CircleDot, minLevel: 1 },
    { href: "/dashboard/pedidos", label: "Monitor de Barra", icon: Utensils, minLevel: 1 },
    { href: "/dashboard/ventas", label: "Ventas", icon: ShoppingCart, minLevel: 2 },
    { href: "/dashboard/caja", label: "Caja", icon: Wallet, minLevel: 2 },
    { href: "/dashboard/empleados", label: "Empleados", icon: Users, minLevel: 4 },
    { href: "/dashboard/asistencia", label: "Asistencia", icon: Clock, minLevel: 1 },
    { href: "/dashboard/clientes", label: "Clientes", icon: UserCheck, minLevel: 2 },
    { href: "/dashboard/campeonatos", label: "Campeonatos", icon: Trophy, minLevel: 3 },
    { href: "/dashboard/avisos", label: "Portada / Ofertas", icon: LayoutTemplate, minLevel: 1 },
    { href: "/dashboard/compras", label: "Compras", icon: Truck, minLevel: 3 },
    { href: "/dashboard/inventario", label: "Inventario", icon: Package, minLevel: 3 },
    { href: "/dashboard/reportes", label: "Reportes", icon: BarChart3, minLevel: 3 },
    { href: "/dashboard/sucursales", label: "Sucursales", icon: Store, minLevel: 4 },
  ];

  const userLevel = userProfile?.rolNivel || 0;
  const filteredMenuItems = menuItems.filter(item => userLevel >= item.minLevel);
  const matchedItem = [...menuItems]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => pathname === item.href || pathname.startsWith(item.href + "/"));
  const hasAccess = !matchedItem || userLevel >= matchedItem.minLevel;

  const getHeaderTitle = () => {
    if (pathname === "/dashboard") return "Panel Principal";
    const item = [...menuItems]
      .sort((a, b) => b.href.length - a.href.length)
      .find(i => pathname === i.href || pathname.startsWith(i.href + "/"));
    if (item) return item.label;
    if (pathname === "/dashboard/perfil") return "Mi Perfil";
    if (pathname === "/dashboard/configuracion") return "Configuración";
    return "Dashboard";
  };

  // Solo mostrar pantalla completa de carga si NO hay caché (primera vez absoluta)
  if (loading && !userProfile) {
    return (
      <div className="flex h-screen bg-[#121212] items-center justify-center text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-t-billar-primary border-r-transparent border-b-transparent border-l-transparent animate-spin duration-1000"></div>
            <div className="absolute inset-0 rounded-full border-4 border-white/5"></div>
          </div>
          <p className="text-xs font-semibold tracking-widest text-billar-gray animate-pulse">
            CARGANDO DATOS DEL PERSONAL...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] bg-[#121212] font-[family-name:var(--font-geist-sans)] text-white overflow-hidden relative">
      
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50 w-64 bg-[#1a1a1c] border-r border-[#2a2a2c] flex flex-col h-full transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}>
        {/* Sidebar Header */}
        <div className="h-20 px-6 flex items-center justify-between border-b border-[#2a2a2c] shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="relative w-10 h-10">
              <img src="/logo_transparente.png" alt="Logo Billar El Malandro" className="w-full h-full object-contain drop-shadow-md" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-sm tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-billar-gray">
                EL MALANDRO
              </span>
              <span className="text-[10px] text-billar-primary font-semibold tracking-widest -mt-0.5">
                STAFF HUB
              </span>
            </div>
          </Link>
          <button 
            className="p-1 text-billar-gray hover:text-white md:hidden hover:bg-[#2a2a2c] rounded-lg transition-colors"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 scrollbar-hide">
          <ul className="space-y-1 px-3">
            {filteredMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link 
                    href={item.href} 
                    onClick={() => setIsMobileMenuOpen(false)} 
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all ${
                      isActive 
                        ? "bg-billar-primary/10 text-billar-primary border border-billar-primary/20 shadow-sm" 
                        : "text-billar-gray hover:text-white hover:bg-[#2a2a2c]"
                    }`}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    <span className="text-sm">{item.label}</span>
                  </Link>
                </li>
              );
            })}
            
            <li className="pt-4 mt-4 border-t border-[#2a2a2c]">
              <Link 
                href="/dashboard/perfil" 
                onClick={() => setIsMobileMenuOpen(false)} 
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all ${
                  pathname === "/dashboard/perfil" 
                    ? "bg-billar-primary/10 text-billar-primary border border-billar-primary/20" 
                    : "text-billar-gray hover:text-white hover:bg-[#2a2a2c]"
                }`}
              >
                <UserCircle className="w-5 h-5" />
                <span className="text-sm">Mi Perfil</span>
              </Link>
            </li>
            
            {userLevel >= 4 && (
              <li>
                <Link 
                  href="/dashboard/configuracion" 
                  onClick={() => setIsMobileMenuOpen(false)} 
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all ${
                    pathname === "/dashboard/configuracion" 
                      ? "bg-billar-primary/10 text-billar-primary border border-billar-primary/20" 
                      : "text-billar-gray hover:text-white hover:bg-[#2a2a2c]"
                  }`}
                >
                  <Settings className="w-5 h-5" />
                  <span className="text-sm">Configuración</span>
                </Link>
              </li>
            )}

            <li className="pt-2 mt-2 border-t border-[#2a2a2c]/50">
              <Link 
                href="/" 
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-billar-gray hover:text-white hover:bg-[#2a2a2c] transition-all"
              >
                <Store className="w-5 h-5 text-billar-primary" />
                <span className="text-sm">Ver Tienda</span>
              </Link>
            </li>
          </ul>
        </nav>

        {/* User Profile Footer */}
        <div className="p-4 border-t border-[#2a2a2c]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-billar-primary flex items-center justify-center text-sm font-bold uppercase shadow-inner">
                {userProfile?.nombre.substring(0, 1) || "U"}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium truncate max-w-[125px]">
                  {userProfile?.nombre || "Usuario"}
                </span>
                <span className="text-[10px] text-billar-primary font-bold uppercase tracking-wider">
                  {userProfile?.rolNombre}
                </span>
              </div>
            </div>
            <button 
              onClick={handleSignOut}
              className="p-2 hover:bg-[#2a2a2c] rounded-lg transition-colors text-billar-gray hover:text-white active:scale-90"
              title="Cerrar Sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden w-full">
        {/* Header */}
        <header className="h-20 px-4 md:px-8 flex items-center justify-between border-b border-[#2a2a2c] bg-[#1a1a1c]/50 backdrop-blur-sm z-10 shrink-0">
          <div className="flex items-center gap-3">
            <button 
              className="p-2 md:hidden text-billar-gray hover:text-white hover:bg-[#2a2a2c] rounded-lg transition-colors"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-xl md:text-2xl font-bold">{getHeaderTitle()}</h1>
              <p className="text-xs md:text-sm text-billar-gray capitalize hidden sm:block">
                {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 md:gap-6">
            <Link 
              href="/" 
              className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-billar-gray hover:text-white transition-all text-xs md:text-sm font-semibold group"
            >
              <Eye className="w-4 h-4 md:w-5 md:h-5 text-billar-primary group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline">Ver Tienda</span>
            </Link>

            <NotificationBell />
            
            <div className="flex items-center gap-3">
              <span className="text-sm text-billar-gray hidden sm:inline">
                Hola, <strong className="text-white">{userProfile?.nombre.split(" ")[0] || "Staff"}</strong>
              </span>
              <div className="w-8 h-8 rounded-full bg-billar-primary flex items-center justify-center text-sm font-bold uppercase">
                {userProfile?.nombre.substring(0, 1) || "U"}
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Route Authorization Shield */}
        {!hasAccess ? (
          <div className="flex-1 flex items-center justify-center p-6 md:p-8 bg-[#121212]">
            <div className="max-w-md w-full bg-[#1a1a1c] border border-white/10 rounded-2xl p-8 text-center shadow-2xl relative overflow-hidden group">
              {/* Subtle background red glow */}
              <div className="absolute -top-12 -left-12 w-48 h-48 bg-billar-primary/10 rounded-full blur-3xl pointer-events-none group-hover:bg-billar-primary/20 transition-all duration-700" />
              
              <div className="w-16 h-16 bg-billar-primary/10 border border-billar-primary/20 text-billar-primary rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                <ShieldAlert className="w-8 h-8" />
              </div>
              
              <h2 className="text-2xl font-bold text-white mb-3">Acceso Restringido</h2>
              <p className="text-sm text-billar-gray mb-6 leading-relaxed">
                Este módulo requiere un nivel de autorización superior (**Nivel {matchedItem?.minLevel}**). Tu rol actual (**{userProfile?.rolNombre}**) posee **Nivel {userLevel}**.
              </p>
              
              <div className="h-[1px] bg-white/5 w-full my-6" />
              
              <button 
                onClick={() => {
                  if (userLevel >= 2) {
                    router.push("/dashboard");
                  } else {
                    router.push("/dashboard/mesas");
                  }
                }}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-billar-primary to-[#b81d24] hover:from-[#d32f2f] hover:to-billar-primary text-white text-sm font-semibold shadow-lg shadow-billar-primary/20 transition-all duration-300 transform active:scale-95"
              >
                <ArrowLeft className="w-4 h-4" />
                Volver a mi sección segura
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 md:p-8 scrollbar-hide">
            {children}
          </div>
        )}
      </main>
    </div>
  );
}
