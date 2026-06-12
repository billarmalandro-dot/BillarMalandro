"use client";

import { useState, useEffect } from "react";
import { Truck, PlusCircle, Check, X, AlertTriangle, RefreshCw } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

interface Producto {
  id_producto: string;
  nombre: string;
  codigo: string | null;
  precio_costo: number | null;
}

interface Caja {
  id_caja: string;
  nombre: string;
}
export default function ComprasPage() {
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [productos, setProductos] = useState<Producto[]>([]);
  const [cajas, setCajas] = useState<Caja[]>([]);
  
  const [activeSucursalId, setActiveSucursalId] = useState<string>("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [sucursalesList, setSucursalesList] = useState<any[]>([]);
  const [userRoleNivel, setUserRoleNivel] = useState<number>(0);

  // Formulario
  const [selectedProductId, setSelectedProductId] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [costoTotal, setCostoTotal] = useState("");
  const [selectedCajaId, setSelectedCajaId] = useState("none"); // "none" means do not deduct from caja
  const [observaciones, setObservaciones] = useState("Compra de mercadería");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const supabase = createClient();

  useEffect(() => { loadData(); }, []);

  const loadData = async (targetSucursalId?: string) => {
    setLoading(true);
    setDbError("");
    setSuccessMsg("");
    try {
      let currentNivel = 0;
      let userAssignedSucursalId = "";

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: dbUser } = await supabase
          .from("usuarios")
          .select("*, roles:id_rol(nombre, nivel), usuario_sucursal(id_sucursal)")
          .eq("auth_id", user.id)
          .single();
        
        if (dbUser) {
          setCurrentUser(dbUser);
          const rolObj = Array.isArray(dbUser.roles) ? dbUser.roles[0] : dbUser.roles;
          currentNivel = rolObj?.nivel || 0;
          setUserRoleNivel(currentNivel);
          
          const usObj = Array.isArray(dbUser.usuario_sucursal) ? dbUser.usuario_sucursal[0] : dbUser.usuario_sucursal;
          userAssignedSucursalId = usObj?.id_sucursal || "";
        }
      }

      // Cargar todas las sucursales
      const { data: sucs, error: sucError } = await supabase.from("sucursales").select("id_sucursal, nombre").order("nombre");
      if (sucError) throw sucError;
      setSucursalesList(sucs || []);

      // Determinar la sucursal activa
      let sucursalId = targetSucursalId || activeSucursalId;
      if (!sucursalId) {
        if (currentNivel >= 4) {
          sucursalId = userAssignedSucursalId || sucs?.[0]?.id_sucursal || "";
        } else {
          sucursalId = userAssignedSucursalId || sucs?.[0]?.id_sucursal || "";
        }
      }
      setActiveSucursalId(sucursalId);

      // 2. Obtener productos activos
      const { data: prods, error: prodErr } = await supabase
        .from("productos")
        .select("id_producto, nombre, codigo, precio_costo")
        .eq("activo", true)
        .order("nombre");
      if (prodErr) throw prodErr;
      setProductos(prods || []);

      // 3. Obtener cajas de la sucursal seleccionada
      if (sucursalId) {
        const { data: cajasData, error: cajasErr } = await supabase
          .from("cajas")
          .select("id_caja, nombre")
          .eq("id_sucursal", sucursalId)
          .eq("activo", true);
        if (cajasErr) throw cajasErr;
        setCajas(cajasData || []);
      } else {
        setCajas([]);
      }

    } catch (err: any) {
      console.error("Error cargando datos de compras:", err);
      setDbError(err.message || "Error al conectar con la base de datos.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDbError("");
    setSuccessMsg("");
    setIsSubmitting(true);

    try {
      if (!selectedProductId || !cantidad || !costoTotal) {
        throw new Error("Por favor completa todos los campos obligatorios.");
      }

      const numCantidad = Number(cantidad);
      const numCosto = Number(costoTotal);
      if (numCantidad <= 0 || numCosto < 0) {
        throw new Error("La cantidad y costo deben ser mayores a 0.");
      }

      const productoObj = productos.find(p => p.id_producto === selectedProductId);
      if (!productoObj) throw new Error("Producto no encontrado.");

      // 1. Verificar inventario actual
      const { data: invData, error: invErr } = await supabase
        .from("inventario")
        .select("id_inventario, stock")
        .eq("id_sucursal", activeSucursalId)
        .eq("id_producto", selectedProductId)
        .maybeSingle();

      let stockAntes = 0;
      let idInventario = "";

      if (invData) {
        stockAntes = invData.stock;
        idInventario = invData.id_inventario;
      } else {
        // Si no existe, creamos el inventario
        const { data: newInv, error: newInvErr } = await supabase
          .from("inventario")
          .insert({
            id_sucursal: activeSucursalId,
            id_producto: selectedProductId,
            stock: 0,
            stock_minimo: 5
          })
          .select("id_inventario")
          .single();
        if (newInvErr) throw newInvErr;
        idInventario = newInv.id_inventario;
      }

      const stockDespues = stockAntes + numCantidad;

      // 2. Actualizar stock
      const { error: updErr } = await supabase
        .from("inventario")
        .update({ stock: stockDespues, updated_at: new Date().toISOString() })
        .eq("id_inventario", idInventario);
      if (updErr) throw updErr;

      // 3. Registrar Movimiento de Inventario
      const { error: movInvErr } = await supabase
        .from("movimientos_inventario")
        .insert({
          id_inventario: idInventario,
          id_sucursal: activeSucursalId,
          id_producto: selectedProductId,
          tipo: 'entrada',
          cantidad: numCantidad,
          stock_antes: stockAntes,
          stock_despues: stockDespues,
          motivo: observaciones,
          created_by: currentUser?.id_usuario
        });
      if (movInvErr) throw movInvErr;

      // 4. Registrar Movimiento de Caja (Egreso) si se seleccionó una caja
      if (selectedCajaId !== "none" && numCosto > 0) {
        const { error: cajaErr } = await supabase
          .from("movimientos_caja")
          .insert({
            id_caja: selectedCajaId,
            id_sucursal: activeSucursalId,
            id_usuario: currentUser?.id_usuario,
            tipo: 'egreso',
            monto: numCosto,
            descripcion: `Compra de inventario: ${productoObj.nombre}. Observación: ${observaciones}`
          });
        if (cajaErr) throw cajaErr;
      }

      // Éxito
      setSuccessMsg(`¡Se ha registrado la compra exitosamente! Stock actualizado: ${stockDespues}`);
      
      // Limpiar formulario
      setSelectedProductId("");
      setCantidad("1");
      setCostoTotal("");
      setObservaciones("Compra de mercadería");

    } catch (err: any) {
      console.error("Error al registrar compra:", err);
      setDbError(err.message || "Ocurrió un error al guardar la compra.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-100px)] items-center justify-center">
        <RefreshCw className="w-8 h-8 text-billar-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-8 pb-24">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Truck className="w-8 h-8 text-billar-primary" />
            Compras de Inventario
          </h1>
          <p className="text-billar-gray mt-1">Registra el ingreso de mercadería y bebidas, y opcionalmente descuenta el dinero de tu caja.</p>
        </div>

        <div className="flex items-center gap-2 bg-[#121212] p-2 rounded-xl border border-[#2a2a2c]">
          <span className="text-sm text-billar-gray font-medium px-2">Sucursal Destino:</span>
          {userRoleNivel >= 4 ? (
            <select
              value={activeSucursalId}
              onChange={(e) => {
                const newSucId = e.target.value;
                setActiveSucursalId(newSucId);
                loadData(newSucId);
              }}
              className="bg-black/40 border border-[#2a2a2c] rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-billar-primary"
            >
              {sucursalesList.map(s => (
                <option key={s.id_sucursal} value={s.id_sucursal}>{s.nombre}</option>
              ))}
            </select>
          ) : (
            <span className="bg-[#1a1a1c] border border-[#2a2a2c] rounded-lg py-2 px-4 text-sm text-white font-bold">
              {sucursalesList.find(s => s.id_sucursal === activeSucursalId)?.nombre || "Cargando..."}
            </span>
          )}
        </div>
      </div>

      {dbError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div className="text-red-200 text-sm">{dbError}</div>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-start gap-3">
          <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-emerald-200 text-sm">{successMsg}</div>
        </div>
      )}

      <div className="bg-[#121212] border border-[#2a2a2c] rounded-2xl p-6 md:p-8 max-w-2xl mx-auto shadow-2xl">
        <h2 className="text-xl font-bold text-white mb-6 border-b border-[#2a2a2c] pb-4">
          Registrar Nueva Compra
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-billar-gray block">Producto Comprado <span className="text-red-500">*</span></label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full bg-black/40 border border-[#2a2a2c] rounded-lg py-2.5 px-3 text-white focus:outline-none focus:border-billar-primary"
              required
            >
              <option value="">-- Seleccionar Producto --</option>
              {productos.map(p => (
                <option key={p.id_producto} value={p.id_producto}>
                  {p.nombre} {p.codigo ? `(${p.codigo})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-billar-gray block">Cantidad Entrante <span className="text-red-500">*</span></label>
              <input
                type="number"
                min="1"
                step="0.01"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                className="w-full bg-black/40 border border-[#2a2a2c] rounded-lg py-2.5 px-3 text-white focus:outline-none focus:border-billar-primary"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-billar-gray block">Costo Total (Bs.) <span className="text-red-500">*</span></label>
              <input
                type="number"
                min="0"
                step="0.10"
                placeholder="0.00"
                value={costoTotal}
                onChange={(e) => setCostoTotal(e.target.value)}
                className="w-full bg-black/40 border border-[#2a2a2c] rounded-lg py-2.5 px-3 text-white focus:outline-none focus:border-billar-primary"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-billar-gray block">Pagar con (Egreso de Caja)</label>
            <select
              value={selectedCajaId}
              onChange={(e) => setSelectedCajaId(e.target.value)}
              className="w-full bg-black/40 border border-[#2a2a2c] rounded-lg py-2.5 px-3 text-white focus:outline-none focus:border-billar-primary"
            >
              <option value="none">No descontar de ninguna caja del sistema</option>
              {cajas.map(c => (
                <option key={c.id_caja} value={c.id_caja}>
                  Descontar de: {c.nombre}
                </option>
              ))}
            </select>
            <p className="text-xs text-white/50">Si seleccionas una caja, se registrará un egreso por el monto del "Costo Total" automáticamente.</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-billar-gray block">Observaciones (Opcional)</label>
            <input
              type="text"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Ej: Proveedor Coca-Cola, Factura #1234"
              className="w-full bg-black/40 border border-[#2a2a2c] rounded-lg py-2.5 px-3 text-white focus:outline-none focus:border-billar-primary"
            />
          </div>

          <div className="pt-4 border-t border-[#2a2a2c]">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-billar-primary hover:bg-[#b81d24] text-white font-bold py-3 px-4 rounded-xl transition-all shadow-[0_0_15px_rgba(220, 38, 38,0.2)] hover:shadow-[0_0_20px_rgba(220, 38, 38,0.4)] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Registrando Compra...
                </>
              ) : (
                <>
                  <PlusCircle className="w-5 h-5" />
                  Guardar Compra e Ingresar al Inventario
                </>
              )}
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}
