import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BottomDock from "@/components/BottomDock";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function QuienesSomosPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto px-6 pt-32 pb-24 w-full relative z-0">
        <div className="mb-10">
          <Link href="/" className="inline-flex items-center text-billar-primary hover:text-white transition-colors gap-2">
            <ArrowLeft className="w-5 h-5" />
            Volver a la tienda
          </Link>
        </div>

        <div className="space-y-12">
          <div className="text-center space-y-6">
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-billar-primary to-green-400">
              Quiénes Somos
            </h1>
            <p className="text-xl text-billar-gray leading-relaxed max-w-2xl mx-auto">
              El lugar donde la pasión por el billar, los buenos momentos y la excelente compañía se encuentran.
            </p>
          </div>

          <div className="bg-[#121212] p-8 md:p-12 rounded-3xl border border-[#2a2a2c] space-y-8 shadow-2xl relative overflow-hidden">
            {/* Decoración de fondo */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-billar-primary/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
            
            <section className="space-y-4 relative z-10">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <span className="w-8 h-1 bg-billar-primary rounded-full"></span>
                Nuestra Historia
              </h2>
              <p className="text-billar-gray leading-relaxed text-lg">
                Billar Malandro nació con una misión clara: ofrecer el mejor ambiente de la ciudad para los verdaderos amantes del billar y para aquellos que simplemente buscan relajarse después de un largo día. Más que un local de juegos, somos un punto de encuentro donde se forjan amistades y se comparten risas.
              </p>
            </section>

            <section className="space-y-4 relative z-10">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <span className="w-8 h-1 bg-billar-primary rounded-full"></span>
                Nuestras Instalaciones
              </h2>
              <p className="text-billar-gray leading-relaxed text-lg">
                Contamos con mesas profesionales de máxima calidad, cuidadosamente mantenidas para garantizar un juego preciso y fluido. Nuestro espacio está diseñado con una iluminación perfecta y asientos cómodos, creando una atmósfera inmersiva tipo "Dark Theme" que invita a quedarse por horas.
              </p>
            </section>

            <section className="space-y-4 relative z-10">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <span className="w-8 h-1 bg-billar-primary rounded-full"></span>
                Más que Billar
              </h2>
              <p className="text-billar-gray leading-relaxed text-lg">
                Acompaña tus partidas con nuestro catálogo de cervezas siempre heladas, licores seleccionados y snacks deliciosos. Nuestro personal está dedicado a brindarte un servicio rápido y amable, llevando tus pedidos directamente a tu mesa para que no interrumpas tu juego.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
      <BottomDock />
    </div>
  );
}
