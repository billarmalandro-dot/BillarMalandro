import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BottomDock from "@/components/BottomDock";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TerminosPage() {
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
              Términos y Condiciones
            </h1>
            <p className="text-billar-gray">Última actualización: Junio de 2026</p>
          </div>

          <div className="bg-[#121212] p-8 rounded-3xl border border-[#2a2a2c] space-y-8 text-billar-gray leading-relaxed">
            
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white">1. Aceptación de los Términos</h2>
              <p>Al acceder y utilizar el sitio web de Billar Malandro, así como al realizar pedidos a través de nuestra plataforma, aceptas estar sujeto a estos términos y condiciones. Si no estás de acuerdo con alguna parte de estos términos, no podrás utilizar nuestros servicios.</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white">2. Uso de las Instalaciones</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>El uso de las mesas de billar está sujeto a disponibilidad.</li>
                <li>Se requiere tratar el equipo (mesas, tacos, bolas) con cuidado y respeto. Cualquier daño intencional será cobrado al usuario.</li>
                <li>Nos reservamos el derecho de admisión y permanencia.</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white">3. Pedidos a través del Sistema</h2>
              <p>Los pedidos realizados a través de la plataforma web en el local son definitivos. El pago de los mismos deberá realizarse según las indicaciones del personal (al momento de la entrega o al finalizar su estadía, según las políticas internas).</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white">4. Edad Mínima</h2>
              <p>Para el consumo de bebidas alcohólicas dentro del establecimiento, es indispensable ser mayor de edad y presentar un documento de identidad válido si el personal lo requiere.</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-white">5. Modificaciones</h2>
              <p>Billar Malandro se reserva el derecho de modificar estos términos en cualquier momento. Las modificaciones entrarán en vigor inmediatamente después de su publicación en este sitio web.</p>
            </section>

          </div>
        </div>
      </main>

      <Footer />
      <BottomDock />
    </div>
  );
}
