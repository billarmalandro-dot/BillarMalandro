"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BottomDock from "@/components/BottomDock";
import Link from "next/link";
import { ArrowLeft, RefreshCw, MapPin, CheckCircle, XCircle } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

interface Sucursal {
  id_sucursal: string;
  nombre: string;
}

interface Mesa {
  id_mesa: string;
  numero: number;
  nombre: string | null;
  tipo: string;
  id_sucursal: string;
  activo: boolean;
}

interface SesionMesa {
  id_mesa: string;
  estado: string;
}

export default function MesasDisponiblesPage() {
  const supabase = createClient();
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [sesionesAbiertas, setSesionesAbiertas] = useState<Set<string>>(new Set());
  const [activeSucursalId, setActiveSucursalId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      // Fetch Sucursales
      if (sucursales.length === 0) {
        const { data: sucursalesData } = await supabase
          .from("sucursales")
          .select("id_sucursal, nombre")
          .order("nombre");
        if (sucursalesData && sucursalesData.length > 0) {
          setSucursales(sucursalesData);
          if (!activeSucursalId) setActiveSucursalId(sucursalesData[0].id_sucursal);
        }
      }

      // Fetch Mesas
      const { data: mesasData } = await supabase
        .from("mesas")
        .select("id_mesa, numero, nombre, tipo, id_sucursal, activo")
        .eq("activo", true)
        .order("numero");
      
      if (mesasData) setMesas(mesasData);

      // Fetch Sesiones Abiertas
      const { data: sesionesData } = await supabase
        .from("sesiones_mesa")
        .select("id_mesa, estado")
        .eq("estado", "abierta");

      if (sesionesData) {
        const abiertas = new Set(sesionesData.map((s) => s.id_mesa));
        setSesionesAbiertas(abiertas);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchData(true);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const mesasToShow = mesas.filter((m) => m.id_sucursal === activeSucursalId);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto px-4 md:px-6 pt-32 pb-20 w-full relative z-0">
        <div className="mb-8 flex justify-between items-center">
          <Link href="/" className="inline-flex items-center text-billanga-primary hover:text-white transition-colors gap-2">
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Volver a la tienda</span>
            <span className="sm:hidden">Volver</span>
          </Link>

          <button 
            onClick={() => fetchData(true)}
            disabled={refreshing || loading}
            className="flex items-center gap-2 px-4 py-2 bg-[#121212] border border-[#2a2a2c] rounded-xl text-sm font-bold hover:bg-[#1a1a1c] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>

        <div className="space-y-10">
          <div className="text-center space-y-4">
            <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-billanga-primary to-green-400">
              Disponibilidad de Mesas
            </h1>
            <p className="text-billanga-gray max-w-2xl mx-auto text-sm md:text-base">
              Consulta en tiempo real qué mesas están libres en nuestras sucursales y ven a jugar sin hacer filas.
            </p>
          </div>

          {/* Sucursales Selector */}
          {sucursales.length > 1 && (
            <div className="flex justify-center gap-3 flex-wrap">
              {sucursales.map(sucursal => (
                <button
                  key={sucursal.id_sucursal}
                  onClick={() => setActiveSucursalId(sucursal.id_sucursal)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all ${
                    activeSucursalId === sucursal.id_sucursal 
                      ? 'bg-billanga-primary text-white shadow-[0_0_15px_rgba(220, 38, 38,0.3)]' 
                      : 'bg-[#121212] border border-[#2a2a2c] text-billanga-gray hover:text-white hover:border-billanga-primary/50'
                  }`}
                >
                  <MapPin className="w-4 h-4" />
                  {sucursal.nombre}
                </button>
              ))}
            </div>
          )}

          {/* Leyenda */}
          <div className="flex justify-center gap-6 text-sm font-medium">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></span>
              <span className="text-gray-300">Disponible</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"></span>
              <span className="text-gray-300">Ocupada</span>
            </div>
          </div>

          {/* Grid de Mesas */}
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="w-10 h-10 border-4 border-billanga-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : mesasToShow.length === 0 ? (
            <div className="text-center py-20 bg-[#121212] rounded-3xl border border-[#2a2a2c]">
              <p className="text-billanga-gray">No hay mesas registradas en esta sucursal.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
              {mesasToShow.map((mesa) => {
                const isOccupied = sesionesAbiertas.has(mesa.id_mesa);
                
                return (
                  <div 
                    key={mesa.id_mesa}
                    className={`relative p-5 rounded-2xl border transition-all duration-300 flex flex-col items-center justify-center min-h-[140px] ${
                      isOccupied 
                        ? 'bg-[#1a1111] border-red-900/50' 
                        : 'bg-[#111a14] border-green-900/50 hover:bg-[#15231a] hover:border-billanga-primary/50'
                    }`}
                  >
                    {/* Indicador superior derecho */}
                    <div className="absolute top-3 right-3">
                      {isOccupied ? (
                        <span className="flex h-3 w-3 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                        </span>
                      ) : (
                        <span className="flex h-3 w-3 relative">
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </span>
                      )}
                    </div>
                    
                    <h3 className="text-3xl font-black text-white mb-2">M-{mesa.numero}</h3>
                    {mesa.nombre && <p className="text-xs text-gray-400 font-bold mb-3 uppercase tracking-wider">{mesa.nombre}</p>}
                    
                    <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full ${
                      isOccupied 
                        ? 'bg-red-500/10 text-red-400' 
                        : 'bg-green-500/10 text-green-400'
                    }`}>
                      {isOccupied ? (
                        <>
                          <XCircle className="w-3 h-3" />
                          OCUPADA
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-3 h-3" />
                          DISPONIBLE
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Botón CTA Whatsapp */}
          <div className="pt-10 flex justify-center">
             <a 
              href="https://wa.me/59172665231" 
              target="_blank" 
              rel="noreferrer"
              className="px-8 py-4 bg-billanga-primary hover:bg-[#b81d24] text-white rounded-2xl font-black text-lg transition-all shadow-[0_0_20px_rgba(220, 38, 38,0.3)] hover:scale-105"
            >
              ¡Reserva tu mesa por WhatsApp!
            </a>
          </div>

        </div>
      </main>

      <Footer />
      <BottomDock />
    </div>
  );
}
