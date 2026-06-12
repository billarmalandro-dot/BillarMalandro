"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { 
  ShoppingCart, User, Menu, X, Shield, LogOut, 
  Trophy, LogIn, UserPlus, Award, ShoppingBag, UserCircle, MapPin,
  Search, ArrowLeft} from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export default function Navbar({ hideMobileMenu = false }: { hideMobileMenu?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isStaff, setIsStaff] = useState(false);
  const [staffRoleName, setStaffRoleName] = useState("");
  const [staffRoleLevel, setStaffRoleLevel] = useState(0);
  const [clientPoints, setClientPoints] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [searchVal, setSearchVal] = useState("");
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      setSearchVal(params.get("q") || "");
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (typeof window === "undefined") return;
      if (isOpen || isSearchExpanded) return;

      const currentScrollY = window.scrollY;

      if (window.innerWidth < 768) {
        if (currentScrollY > lastScrollY && currentScrollY > 80) {
          setIsVisible(false);
        } else {
          setIsVisible(true);
        }
      } else {
        setIsVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY, isOpen, isSearchExpanded]);

  const handleSearch = (value: string) => {
    setSearchVal(value);
    const params = new URLSearchParams(window.location.search);
    if (value) {
      params.set("q", value);
    } else {
      params.delete("q");
    }
    router.push(`/?${params.toString()}`, { scroll: false });
  };

  const supabase = createClient();

  useEffect(() => {
    const checkUser = async () => {
      setLoading(true);
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        setUser(authUser);
        // Verificar si es empleado/admin en la tabla usuarios
        const { data: staffData } = await supabase
          .from("usuarios")
          .select(`
            id_rol,
            avatar_url,
            roles (
              nombre,
              nivel
            )
          `)
          .eq("auth_id", authUser.id)
          .maybeSingle();
        
        const rolObj = staffData?.roles ? (Array.isArray(staffData.roles) ? staffData.roles[0] : staffData.roles) : null;
        const hasRole = !!staffData?.id_rol && (rolObj?.nivel || 0) > 0;

        setIsStaff(hasRole);
        setStaffRoleName(rolObj?.nombre || "");
        setStaffRoleLevel(rolObj?.nivel || 0);

        if (!hasRole) {
          const { data: clientData } = await supabase
            .from("clientes")
            .select("puntos_fidelidad, avatar_url")
            .eq("auth_id", authUser.id)
            .maybeSingle();
          setClientPoints(clientData?.puntos_fidelidad || 0);
          setAvatarUrl(clientData?.avatar_url || null);
        } else {
          setAvatarUrl(staffData?.avatar_url || null);
        }
      } else {
        setUser(null);
        setIsStaff(false);
        setStaffRoleName("");
        setStaffRoleLevel(0);
        setClientPoints(0);
        setAvatarUrl(null);
      }
      setLoading(false);
    };

    checkUser();

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        const { data: staffData } = await supabase
          .from("usuarios")
          .select(`
            id_rol,
            avatar_url,
            roles (
              nombre,
              nivel
            )
          `)
          .eq("auth_id", session.user.id)
          .maybeSingle();

        const rolObj = staffData?.roles ? (Array.isArray(staffData.roles) ? staffData.roles[0] : staffData.roles) : null;
        const hasRole = !!staffData?.id_rol && (rolObj?.nivel || 0) > 0;

        setIsStaff(hasRole);
        setStaffRoleName(rolObj?.nombre || "");
        setStaffRoleLevel(rolObj?.nivel || 0);

        if (!hasRole) {
          const { data: clientData } = await supabase
            .from("clientes")
            .select("puntos_fidelidad, avatar_url")
            .eq("auth_id", session.user.id)
            .maybeSingle();
          setClientPoints(clientData?.puntos_fidelidad || 0);
          setAvatarUrl(clientData?.avatar_url || null);
        } else {
          setAvatarUrl(staffData?.avatar_url || null);
        }
      } else {
        setUser(null);
        setIsStaff(false);
        setStaffRoleName("");
        setStaffRoleLevel(0);
        setClientPoints(0);
        setAvatarUrl(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    console.log("Iniciando Cerrar Sesión...");
    try {
      // 1. Cerrar sesión en el cliente de Supabase (borra cookies de navegador y sesión activa)
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Error al cerrar sesión con Supabase:", err);
    }

    try {
      // 2. Limpieza manual de cookies de Supabase (por si el server-side auth se atasca)
      if (typeof document !== "undefined") {
        const cookies = document.cookie.split("; ");
        for (let c of cookies) {
          const [name] = c.split("=");
          if (name.startsWith("sb-")) {
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
          }
        }
      }
      
      // Limpieza de local y session storage
      if (typeof window !== "undefined") {
        localStorage.clear();
        sessionStorage.clear();
      }
    } catch (cleanErr) {
      console.error("Error al limpiar almacenamiento de sesión:", cleanErr);
    }

    // 3. Forzar redirección con router de Next.js
    router.push("/");
    router.refresh();
  };

  return (
    <header className={`fixed top-4 left-0 right-0 z-50 flex items-center justify-between py-3 px-5 md:px-8 max-w-6xl mx-auto w-[92%] rounded-2xl bg-[#0f0f11]/85 backdrop-blur-md border border-white/10 shadow-2xl transition-all duration-300 ${
      isVisible ? "translate-y-0 opacity-100" : "-translate-y-28 opacity-0"
    }`}>
      {isSearchExpanded && (
        <div className="absolute inset-0 bg-[#0f0f11]/95 z-50 flex items-center px-4 md:px-8 gap-3 animate-in fade-in slide-in-from-top-2 duration-200 rounded-2xl">
          <button 
            onClick={() => setIsSearchExpanded(false)}
            className="p-2 text-billanga-gray hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 flex items-center relative bg-white/5 border border-white/10 focus-within:border-billanga-primary/50 rounded-full">
            <Search className="absolute left-4 w-4 h-4 text-billanga-gray" />
            <input 
              type="text"
              placeholder="Buscar bebidas, snacks, poleras..."
              value={searchVal}
              autoFocus
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-11 pr-10 py-2 bg-transparent text-white placeholder-billanga-gray text-xs focus:outline-none"
            />
            {searchVal && (
              <button onClick={() => handleSearch("")} className="absolute right-4 text-billanga-gray hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
      <Link href="/" className="font-bold text-xl md:text-2xl tracking-tighter text-billanga-white flex items-center gap-3 hover:opacity-90 transition-opacity">
        <div className="relative w-8 h-8 md:w-10 md:h-10">
          <Image 
            src="/logo_transparente.png" 
            alt="Logo Billar El Malandro" 
            fill 
            sizes="40px"
            className="object-contain"
            priority
          />
        </div>
        <div className="font-black tracking-tight">
          <span className="text-billanga-primary">BILLAR</span> MALANDRO
        </div>
      </Link>
      
      {/* Desktop Search & Nav */}
      <div className="hidden md:flex items-center gap-4 lg:gap-6">
        <nav className="flex gap-2 items-center text-sm font-semibold text-billanga-gray">
          <Link href="/" className="px-4 py-2 rounded-full hover:bg-white/5 transition-all text-billanga-white">Inicio</Link>
          <Link href="#torneos" className="px-4 py-2 rounded-full hover:bg-white/5 hover:text-white transition-all">Torneos</Link>
          <Link href="#menu" className="px-4 py-2 rounded-full hover:bg-white/5 hover:text-white transition-all">Catálogo</Link>
        </nav>
        
        {/* Lupa para PC */}
        <div className="relative flex items-center w-44 lg:w-56 bg-white/5 border border-white/10 focus-within:border-billanga-primary/50 rounded-full transition-all duration-300">
          <Search className="absolute left-3.5 w-4 h-4 text-billanga-gray" />
          <input 
            type="text"
            placeholder="Buscar..."
            value={searchVal}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-8 py-1.5 bg-transparent text-white placeholder-billanga-gray text-xs focus:outline-none"
          />
          {searchVal && (
            <button onClick={() => handleSearch("")} className="absolute right-3 text-billanga-gray hover:text-white transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Acciones */}
      <div className="flex items-center gap-3 md:gap-4">
        {/* Botón Lupa en Móvil */}
        <button 
          onClick={() => setIsSearchExpanded(true)}
          className="md:hidden p-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 text-billanga-gray hover:text-white active:scale-95 transition-all shadow-md"
        >
          <Search className="w-5 h-5" />
        </button>

        <button className="hidden md:block relative p-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all group hover:scale-105 active:scale-95 shadow-md">
          <ShoppingCart className="w-6 h-6 md:w-7 md:h-7 text-billanga-gray group-hover:text-white transition-colors" />
          <span className="absolute -top-1 -right-1 w-4 h-4 md:w-4.5 md:h-4.5 bg-billanga-primary rounded-full text-[9px] md:text-[10px] font-bold flex items-center justify-center text-white border border-[#0f0f11]">
            0
          </span>
        </button>
        
        {!loading && (
          <div className="relative group block" onMouseLeave={() => setIsProfileOpen(false)}>
            {/* Botón de Perfil */}
            <button 
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2.5 p-2 pr-4 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-sm font-semibold hover:scale-105 active:scale-95 shadow-md"
            >
              {user ? (
                avatarUrl ? (
                  <div className="w-9 h-9 rounded-full bg-[#2a2a2c] flex items-center justify-center border border-white/5 overflow-hidden shadow-md">
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-billanga-primary to-billanga-primary-dark flex items-center justify-center font-bold text-white shadow-md text-sm">
                    {user.email?.charAt(0).toUpperCase()}
                  </div>
                )
              ) : (
                <div className="w-9 h-9 rounded-full bg-[#2a2a2c] flex items-center justify-center text-billanga-gray border border-white/5">
                  <UserCircle className="w-5.5 h-5.5" />
                </div>
              )}
              <span className="text-xs text-white max-w-[120px] truncate">
                {user ? user.email?.split("@")[0] : "Mi Cuenta"}
              </span>
            </button>
            
            {/* Menú Desplegable Dropdown */}
            <div className={`absolute right-0 mt-2 w-56 md:w-64 rounded-xl glass-panel py-3 transition-all duration-300 shadow-2xl z-50 border border-white/10 ${isProfileOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible translate-y-2 md:group-hover:opacity-100 md:group-hover:visible md:group-hover:translate-y-0'}`}>
              {user ? (
                // ------------------ MENÚ PARA USUARIOS REGISTRADOS ------------------
                <div className="flex flex-col">
                  {/* Info de Usuario */}
                  <div className="px-4 py-2 border-b border-white/5 pb-3 mb-2">
                    <p className="text-[10px] text-billanga-gray tracking-wider uppercase">Sesión activa</p>
                    <p className="text-sm font-bold text-white truncate">{user.email}</p>
                    {isStaff ? (
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-white font-bold bg-billanga-primary px-2.5 py-1 rounded-full w-max shadow-md shadow-billanga-primary/10">
                        <Shield className="w-3.5 h-3.5 text-white" />
                        <span>{staffRoleName || "Personal"}</span>
                      </div>
                    ) : (
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-billanga-primary font-semibold bg-billanga-primary/10 px-2 py-0.5 rounded-full w-max">
                        <Award className="w-3.5 h-3.5" />
                        <span>{clientPoints} Puntos Malandro</span>
                      </div>
                    )}
                  </div>

                  {/* Enlaces de Cuenta para Clientes */}
                  {!isStaff ? (
                    <>
                      <Link href="/perfil" className="flex items-center gap-3 px-4 py-2.5 text-sm text-billanga-gray hover:text-white hover:bg-white/5 transition-colors">
                        <UserCircle className="w-4 h-4 text-billanga-primary" />
                        Mi Perfil / Datos
                      </Link>
                      <Link href="/mis-torneos" className="flex items-center gap-3 px-4 py-2.5 text-sm text-billanga-gray hover:text-white hover:bg-white/5 transition-colors">
                        <Trophy className="w-4 h-4 text-billanga-primary" />
                        Mis Torneos
                      </Link>
                      <Link href="#pedidos" className="flex items-center gap-3 px-4 py-2.5 text-sm text-billanga-gray hover:text-white hover:bg-white/5 transition-colors">
                        <ShoppingBag className="w-4 h-4 text-billanga-primary" />
                        Mis Pedidos
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link 
                        href={staffRoleLevel >= 2 ? "/dashboard" : "/dashboard/mesas"} 
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-white bg-billanga-primary/15 hover:bg-billanga-primary/25 border border-billanga-primary/35 rounded-lg mx-2 my-1.5 transition-all font-bold shadow-md shadow-billanga-primary/10"
                      >
                        <Shield className="w-4 h-4 text-billanga-primary animate-pulse" />
                        Panel Administrativo
                      </Link>
                    </>
                  )}

                  {/* Cierre de Sesión */}
                  <div className="h-px bg-white/5 my-1" />
                  <button 
                    onClick={handleSignOut} 
                    className="w-full text-left flex items-center gap-3 px-4 py-2.5 text-sm text-billanga-gray hover:text-white hover:bg-billanga-primary/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4 text-billanga-primary" />
                    Cerrar Sesión
                  </button>
                </div>
              ) : (
                // ------------------ MENÚ PARA USUARIOS INVITADOS ------------------
                <div className="flex flex-col">
                  <div className="px-4 py-2 mb-2">
                    <p className="text-sm font-bold text-white">¡Bienvenido!</p>
                    <p className="text-xs text-billanga-gray mt-0.5">Inicia sesión para registrarte en torneos y acumular puntos.</p>
                  </div>

                  <div className="px-3 pb-2 space-y-2">
                    <Link 
                      href="/login" 
                      className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-bold text-white bg-billanga-primary hover:bg-billanga-primary-dark rounded-lg transition-colors shadow-lg shadow-billanga-primary/20"
                    >
                      <LogIn className="w-4 h-4" />
                      Iniciar Sesión
                    </Link>
                    <Link 
                      href="/registro" 
                      className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-bold text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
                    >
                      <UserPlus className="w-4 h-4" />
                      Registrarse
                    </Link>
                  </div>

                  <div className="h-px bg-white/5 my-1" />
                  <Link href="/mis-torneos" className="flex items-center gap-3 px-4 py-2 text-xs text-billanga-gray hover:text-white hover:bg-white/5 transition-colors">
                    <Trophy className="w-3.5 h-3.5 text-billanga-primary" />
                    Torneos Activos
                  </Link>
                  <Link href="#sucursales" className="flex items-center gap-3 px-4 py-2 text-xs text-billanga-gray hover:text-white hover:bg-white/5 transition-colors">
                    <MapPin className="w-3.5 h-3.5 text-billanga-primary" />
                    Nuestras Sucursales
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mobile Menu Button */}
        {!hideMobileMenu && (
          <button 
            className="md:hidden p-2 text-billanga-gray hover:text-white transition-colors"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        )}
      </div>

      {/* Mobile Nav Dropdown */}
      {!hideMobileMenu && isOpen && (
        <div className="absolute top-full left-0 w-full glass-panel border-t border-white/10 p-4 flex flex-col gap-3 shadow-xl md:hidden animate-in slide-in-from-top-2 z-50">
          <Link href="/" onClick={() => setIsOpen(false)} className="text-white font-medium p-2 hover:bg-white/5 rounded-lg flex items-center gap-2">
            Inicio
          </Link>
          <Link href="/mis-torneos" onClick={() => setIsOpen(false)} className="text-billanga-gray font-medium p-2 hover:bg-white/5 hover:text-white rounded-lg">
            Torneos
          </Link>
          <Link href="#menu" onClick={() => setIsOpen(false)} className="text-billanga-gray font-medium p-2 hover:bg-white/5 hover:text-white rounded-lg">
            Catálogo
          </Link>
          
          <div className="h-px bg-white/10 w-full my-2" />
          
          {user ? (
            <div className="flex flex-col gap-2">
              <div className="px-2 py-1 mb-1">
                <p className="text-[10px] text-billanga-gray uppercase">Sesión activa</p>
                <p className="text-xs font-bold text-white truncate">{user.email}</p>
                {isStaff ? (
                  <p className="text-[11px] text-white font-bold mt-1 flex items-center gap-1 bg-billanga-primary px-2.5 py-0.5 rounded-full w-max shadow-md">
                    <Shield className="w-3.5 h-3.5 text-white" /> {staffRoleName || "Personal"}
                  </p>
                ) : (
                  <p className="text-[11px] text-billanga-primary font-bold mt-1 flex items-center gap-1">
                    <Award className="w-3.5 h-3.5" /> {clientPoints} Puntos Malandro
                  </p>
                )}
              </div>

              {!isStaff ? (
                <>
                  <Link href="/perfil" onClick={() => setIsOpen(false)} className="text-billanga-gray font-medium p-2 hover:bg-white/5 hover:text-white rounded-lg flex items-center gap-2">
                    <UserCircle className="w-4 h-4 text-billanga-primary" /> Mi Perfil
                  </Link>
                  <Link href="/mis-torneos" onClick={() => setIsOpen(false)} className="text-billanga-gray font-medium p-2 hover:bg-white/5 hover:text-white rounded-lg flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-billanga-primary" /> Mis Torneos
                  </Link>
                  <Link href="#pedidos" onClick={() => setIsOpen(false)} className="text-billanga-gray font-medium p-2 hover:bg-white/5 hover:text-white rounded-lg flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-billanga-primary" /> Mis Pedidos
                  </Link>
                </>
              ) : (
                <Link 
                  href={staffRoleLevel >= 2 ? "/dashboard" : "/dashboard/mesas"} 
                  onClick={() => setIsOpen(false)} 
                  className="text-white font-bold p-2 bg-billanga-primary/20 border border-billanga-primary/35 rounded-lg text-center flex items-center justify-center gap-2 mt-1 shadow-md shadow-billanga-primary/5"
                >
                  <Shield className="w-4 h-4 text-billanga-primary animate-pulse" />
                  Panel Administrativo
                </Link>
              )}
              
              <button 
                onClick={() => { setIsOpen(false); handleSignOut(); }}
                className="text-billanga-gray font-medium p-2 border border-white/10 rounded-lg text-center flex items-center justify-center gap-2 mt-1 hover:bg-billanga-primary/10"
              >
                <LogOut className="w-4 h-4 text-billanga-primary" />
                Cerrar Sesión
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Link href="/login" onClick={() => setIsOpen(false)} className="text-white font-medium p-2 bg-billanga-primary rounded-lg text-center flex items-center justify-center gap-2">
                <LogIn className="w-4 h-4" /> Iniciar Sesión
              </Link>
              <Link href="/registro" onClick={() => setIsOpen(false)} className="text-billanga-gray font-medium p-2 border border-white/10 rounded-lg text-center flex items-center justify-center gap-2">
                <UserPlus className="w-4 h-4" /> Registrarse
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
