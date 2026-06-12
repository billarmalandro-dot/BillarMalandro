"use client";

import { useState, useEffect } from "react";
import { LayoutGrid, Receipt, Home, ShoppingCart, Share2, X } from "lucide-react";

const InstagramIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    {...props}
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.455 5.703 1.456h.004c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

export default function BottomDock() {
  const [showRedes, setShowRedes] = useState(false);
  const [showPedidosInfo, setShowPedidosInfo] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      if (typeof window === "undefined") return;
      if (showRedes || showPedidosInfo) return;

      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY && currentScrollY > 80) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY, showRedes, showPedidosInfo]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      {/* Dock Bar Container - Visible solo en móviles (md:hidden) */}
      <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-sm md:hidden transition-all duration-300 ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-28 opacity-0 pointer-events-none"
      }`}>
        {/* Capsule glass design similar to uploaded image */}
        <div className="relative bg-[#141416]/95 backdrop-blur-md rounded-2xl py-3 px-5 flex items-center justify-between shadow-[0_12px_40px_rgba(0,0,0,0.9)] border border-white/10">
          
          {/* Left 1: Catálogo */}
          <button 
            onClick={() => scrollToSection("menu")} 
            className="flex flex-col items-center gap-1.5 text-billanga-gray hover:text-white active:scale-95 transition-all flex-1"
          >
            <LayoutGrid className="w-5 h-5" />
            <span className="text-[9px] font-semibold tracking-wide">Catálogo</span>
          </button>

          {/* Left 2: Mis Pedidos */}
          <button 
            onClick={() => setShowPedidosInfo(true)}
            className="flex flex-col items-center gap-1.5 text-billanga-gray hover:text-white active:scale-95 transition-all flex-1 text-center"
          >
            <Receipt className="w-5 h-5" />
            <span className="text-[9px] font-semibold tracking-wide">Mis Pedidos</span>
          </button>

          {/* Center: Inicio (Floating Circle Button) */}
          <div className="relative -mt-8 flex flex-col items-center flex-1 z-50">
            <button 
              onClick={scrollToTop}
              className="w-14 h-14 rounded-full bg-gradient-to-br from-billanga-primary to-billanga-primary-dark text-white flex items-center justify-center shadow-[0_0_20px_rgba(220, 38, 38,0.5)] hover:shadow-[0_0_25px_rgba(220, 38, 38,0.7)] hover:scale-105 transition-all duration-300 border border-white/20 active:scale-95"
            >
              <Home className="w-6 h-6" />
            </button>
            <span className="text-[10px] font-bold text-white mt-1.5">Inicio</span>
          </div>

          {/* Right 1: Carrito */}
          <button 
            onClick={() => {
              if (window.location.pathname === '/') {
                window.dispatchEvent(new CustomEvent('open-cart'));
              } else {
                window.location.href = '/#menu';
              }
            }}
            className="flex flex-col items-center gap-1.5 text-billanga-gray hover:text-white active:scale-95 transition-all flex-1"
          >
            <div className="relative">
              <ShoppingCart className="w-5 h-5" />
              <span className="absolute -top-1 -right-1.5 w-3.5 h-3.5 bg-billanga-primary rounded-full text-[8px] font-bold flex items-center justify-center text-white border border-[#141416]">
                0
              </span>
            </div>
            <span className="text-[9px] font-semibold tracking-wide">Carrito</span>
          </button>

          {/* Right 2: Redes */}
          <button 
            onClick={() => setShowRedes(true)}
            className="flex flex-col items-center gap-1.5 text-billanga-gray hover:text-white active:scale-95 transition-all flex-1"
          >
            <Share2 className="w-5 h-5" />
            <span className="text-[9px] font-semibold tracking-wide">Redes</span>
          </button>

        </div>
      </div>

      {/* Modal Redes Sociales */}
      {showRedes && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-xs rounded-2xl border border-white/10 p-6 flex flex-col items-center text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center w-full pb-2 border-b border-white/5">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Nuestras Redes</h3>
              <button 
                onClick={() => setShowRedes(false)}
                className="text-billanga-gray hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full pt-2">
              <a 
                href="https://instagram.com" 
                target="_blank" 
                rel="noreferrer"
                className="flex flex-col items-center gap-2 p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5 group hover:border-billanga-primary/40"
              >
                <InstagramIcon className="w-6 h-6 text-pink-500 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-semibold text-white">Instagram</span>
              </a>
              <a 
                href="https://wa.me/59172665231" 
                target="_blank" 
                rel="noreferrer"
                className="flex flex-col items-center gap-2 p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5 group hover:border-emerald-500/40"
              >
                <WhatsAppIcon className="w-6 h-6 text-emerald-500 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-semibold text-white">WhatsApp</span>
              </a>
            </div>
            
            <p className="text-[10px] text-billanga-gray pt-2">
              Billanga © {new Date().getFullYear()}
            </p>
          </div>
        </div>
      )}

      {/* Modal Pedidos Info */}
      {showPedidosInfo && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-xs rounded-2xl border border-white/10 p-6 flex flex-col items-center text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-billanga-primary/10 flex items-center justify-center border border-billanga-primary/20 mb-2">
              <Receipt className="w-6 h-6 text-billanga-primary" />
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Mis Pedidos y Consumos</h3>
              <p className="text-xs text-billanga-gray leading-relaxed">
                ¡Muy pronto! Podrás escanear el código QR de tu mesa para ordenar comida y bebidas directamente desde tu móvil y ver tus consumos aquí.
              </p>
            </div>

            <button 
              onClick={() => setShowPedidosInfo(false)}
              className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg text-xs font-bold transition-colors mt-2"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}
