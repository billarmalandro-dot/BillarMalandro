import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BottomDock from "@/components/BottomDock";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacidadPage() {
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
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-billar-primary to-green-400">
              Política de Privacidad
            </h1>
            <p className="text-billar-gray">Última actualización: Junio de 2026</p>
          </div>

          <div className="bg-[#121212] p-8 rounded-3xl border border-[#2a2a2c] space-y-8 text-billar-gray leading-relaxed">
            
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white">1. Información que Recopilamos</h2>
              <p>Al utilizar nuestra plataforma de pedidos digitales, podemos recopilar información no sensible como el número de la mesa en la que te encuentras y el detalle de tu pedido para facilitar el servicio dentro del local.</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white">2. Uso de la Información</h2>
              <p>La información recopilada se utiliza exclusivamente para:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Procesar y entregar tus pedidos de manera eficiente en tu mesa.</li>
                <li>Mejorar tu experiencia dentro de nuestro establecimiento.</li>
                <li>Análisis interno sobre preferencias de productos.</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white">3. Protección de Datos</h2>
              <p>Nos comprometemos a no vender, alquilar ni compartir tu información personal con terceros bajo ninguna circunstancia, garantizando que tus datos están seguros con nosotros.</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white">4. Cookies</h2>
              <p>Nuestro sistema puede utilizar cookies y almacenamiento local (Local Storage) para mantener tu sesión activa, recordar tu carrito de compras mientras navegas por el catálogo y mejorar la velocidad de carga de la aplicación.</p>
            </section>

          </div>
        </div>
      </main>

      <Footer />
      <BottomDock />
    </div>
  );
}
