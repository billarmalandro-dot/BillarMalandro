import { Plus, ShoppingCart } from "lucide-react";
import Image from "next/image";

// Datos de ejemplo para mostrar antes de conectar con Supabase
const EJEMPLOS_PRODUCTOS = [
  {
    id: "1",
    nombre: "Cerveza Corona Extra",
    categoria: "Bebidas",
    precio: 35.00,
    imagen: "https://images.unsplash.com/photo-1532634922-8fe0b757fb13?w=500&q=80",
  },
  {
    id: "2",
    nombre: "Whisky Jack Daniel's",
    categoria: "Licores",
    precio: 850.00,
    imagen: "https://images.unsplash.com/photo-1527061011665-3652c757a4d4?w=500&q=80",
  },
  {
    id: "3",
    nombre: "Alitas BBQ (10 pz)",
    categoria: "Snacks",
    precio: 120.00,
    imagen: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=500&q=80",
  },
  {
    id: "4",
    nombre: "Nachos con Queso y Carne",
    categoria: "Snacks",
    precio: 95.00,
    imagen: "https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=500&q=80",
  },
  {
    id: "5",
    nombre: "Tequila Don Julio 70",
    categoria: "Licores",
    precio: 1200.00,
    imagen: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=500&q=80",
  },
  {
    id: "6",
    nombre: "Refresco Coca-Cola 355ml",
    categoria: "Bebidas",
    precio: 25.00,
    imagen: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&q=80",
  }
];

interface CatalogoListProps {
  searchQuery?: string;
}

export default function CatalogoList({ searchQuery = "" }: CatalogoListProps) {
  const filteredProducts = EJEMPLOS_PRODUCTOS.filter((producto) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      producto.nombre.toLowerCase().includes(query) ||
      producto.categoria.toLowerCase().includes(query)
    );
  });

  return (
    <section id="menu" className="w-full max-w-7xl mx-auto py-20 px-6">
      <div className="flex flex-col md:flex-row justify-between items-end mb-12">
        <div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-billanga-gray mb-4">
            Nuestro <span className="text-billanga-primary">Catálogo</span>
          </h2>
          <p className="text-billanga-gray text-lg max-w-xl">
            Acompaña tu juego con las mejores bebidas y snacks. Pide directamente desde la comodidad de tu mesa.
          </p>
        </div>
        
        {/* Filtros de ejemplo */}
        <div className="flex gap-3 mt-6 md:mt-0">
          <button className="px-5 py-2 rounded-full bg-billanga-primary text-white font-bold text-sm">Todos</button>
          <button className="px-5 py-2 rounded-full glass-panel hover:bg-white/10 text-white font-medium text-sm transition-colors">Bebidas</button>
          <button className="px-5 py-2 rounded-full glass-panel hover:bg-white/10 text-white font-medium text-sm transition-colors">Snacks</button>
        </div>
      </div>

      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProducts.map((producto) => (
            <div key={producto.id} className="glass-panel rounded-2xl overflow-hidden group flex flex-col transition-all duration-300 hover:shadow-[0_0_20px_rgba(220, 38, 38,0.2)] hover:-translate-y-1 border border-white/5 hover:border-billanga-primary/50">
              {/* Contenedor de Imagen */}
              <div className="relative h-64 w-full bg-black/50 overflow-hidden">
                <Image 
                  src={producto.imagen}
                  alt={producto.nombre}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-cover group-hover:scale-110 transition-transform duration-500 opacity-80 group-hover:opacity-100"
                />
                <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-md px-3 py-1 rounded text-xs font-bold text-billanga-gray uppercase tracking-wider">
                  {producto.categoria}
                </div>
              </div>
              
              {/* Información */}
              <div className="p-6 flex flex-col flex-grow">
                <h3 className="text-xl font-bold text-white mb-2">{producto.nombre}</h3>
                <div className="flex items-center justify-between mt-auto pt-4">
                  <span className="text-2xl font-black text-billanga-primary">
                    ${producto.precio.toFixed(2)}
                  </span>
                  <button className="w-10 h-10 rounded-full bg-white/10 hover:bg-billanga-primary flex items-center justify-center text-white transition-colors">
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 glass-panel rounded-2xl border border-white/5 max-w-lg mx-auto">
          <p className="text-billanga-gray text-lg font-semibold">No se encontraron productos para &quot;{searchQuery}&quot;</p>
          <p className="text-xs text-billanga-gray/60 mt-2">Prueba con otra palabra clave como bebidas, snacks, corona o tequila.</p>
        </div>
      )}
    </section>
  );
}
