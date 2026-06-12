import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BottomDock from "@/components/BottomDock";
import Link from "next/link";
import { ArrowLeft, Trophy } from "lucide-react";

export default function TorneosPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto px-6 pt-32 pb-24 w-full relative z-0">
        <div className="w-full mb-10">
          <Link href="/" className="inline-flex items-center text-billar-primary hover:text-white transition-colors gap-2">
            <ArrowLeft className="w-5 h-5" />
            Volver a la tienda
          </Link>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center space-y-6 text-center w-full py-12 bg-[#121212] rounded-3xl border border-[#2a2a2c] shadow-2xl relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-billar-primary/5 rounded-full blur-3xl pointer-events-none"></div>
          
          <Trophy className="w-24 h-24 text-billar-primary mb-4 relative z-10 animate-pulse" />
          
          <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-billar-primary to-green-400 relative z-10">
            Próximamente
          </h1>
          
          <p className="text-xl text-billar-gray leading-relaxed max-w-md mx-auto relative z-10">
            Estamos preparando los mejores torneos y eventos para ti. ¡Mantente atento a nuestras redes sociales para más novedades!
          </p>
        </div>
      </main>

      <Footer />
      <BottomDock />
    </div>
  );
}
