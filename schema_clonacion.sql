-- =========================================================================================
-- SCRIPT DE CLONACIÓN DE BASE DE DATOS - BILLAR
-- Ejecuta este script en el SQL Editor de tu nuevo proyecto de Supabase.
-- =========================================================================================

-- 1. HABILITAR EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. CREAR TIPOS DE DATOS (ENUMS)
-- Estos tipos son necesarios para las columnas USER-DEFINED
DO $$ BEGIN
    CREATE TYPE public.tipo_mesa AS ENUM ('pool', 'carambola', 'snooker');
    CREATE TYPE public.tipo_dia_tarifa AS ENUM ('todos', 'lunes_viernes', 'fin_semana');
    CREATE TYPE public.estado_sesion AS ENUM ('abierta', 'cerrada', 'pausada');
    CREATE TYPE public.metodo_pago AS ENUM ('efectivo', 'tarjeta', 'transferencia', 'qr');
    CREATE TYPE public.estado_venta AS ENUM ('completada', 'anulada', 'pendiente');
    CREATE TYPE public.estado_pedido AS ENUM ('pendiente', 'preparacion', 'listo', 'entregado', 'cancelado');
    CREATE TYPE public.tipo_pedido AS ENUM ('online', 'local');
    CREATE TYPE public.tipo_novedad AS ENUM ('noticia', 'oferta', 'evento');
    CREATE TYPE public.modalidad_camp AS ENUM ('eliminacion_simple', 'liguilla', 'doble_eliminacion');
    CREATE TYPE public.estado_campeonato AS ENUM ('proximo', 'en_curso', 'finalizado', 'cancelado');
    CREATE TYPE public.estado_pago_insc AS ENUM ('pendiente', 'pagado');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. CREAR TABLAS INDEPENDIENTES (Sin llaves foráneas a otras tablas)
CREATE TABLE IF NOT EXISTS public.sucursales (
  id_sucursal uuid NOT NULL DEFAULT uuid_generate_v4(),
  nombre character varying NOT NULL,
  direccion character varying,
  telefono character varying,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  CONSTRAINT sucursales_pkey PRIMARY KEY (id_sucursal)
);

CREATE TABLE IF NOT EXISTS public.categorias (
  id_categoria uuid NOT NULL DEFAULT uuid_generate_v4(),
  nombre character varying NOT NULL UNIQUE,
  descripcion text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  CONSTRAINT categorias_pkey PRIMARY KEY (id_categoria)
);

CREATE TABLE IF NOT EXISTS public.roles (
  id_rol uuid NOT NULL DEFAULT uuid_generate_v4(),
  nombre character varying NOT NULL UNIQUE,
  descripcion text,
  nivel smallint NOT NULL DEFAULT 1 CHECK (nivel >= 1 AND nivel <= 5),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT roles_pkey PRIMARY KEY (id_rol)
);

CREATE TABLE IF NOT EXISTS public.permisos (
  id_permiso uuid NOT NULL DEFAULT uuid_generate_v4(),
  codigo character varying NOT NULL UNIQUE,
  descripcion text,
  modulo character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT permisos_pkey PRIMARY KEY (id_permiso)
);

CREATE TABLE IF NOT EXISTS public.clientes (
  id_cliente uuid NOT NULL DEFAULT uuid_generate_v4(),
  auth_id uuid UNIQUE,
  nombre character varying NOT NULL,
  email character varying,
  telefono character varying,
  direccion text,
  puntos_fidelidad integer NOT NULL DEFAULT 0 CHECK (puntos_fidelidad >= 0),
  activo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  avatar_url text,
  CONSTRAINT clientes_pkey PRIMARY KEY (id_cliente)
);

CREATE TABLE IF NOT EXISTS public.notificaciones (
  id_notificacion uuid NOT NULL DEFAULT gen_random_uuid(),
  titulo character varying NOT NULL,
  mensaje text NOT NULL,
  tipo character varying DEFAULT 'info'::character varying,
  leida boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notificaciones_pkey PRIMARY KEY (id_notificacion)
);

-- 4. CREAR TABLAS DEPENDIENTES (Nivel 1)
CREATE TABLE IF NOT EXISTS public.rol_permisos (
  id_rol_permiso uuid NOT NULL DEFAULT uuid_generate_v4(),
  id_rol uuid NOT NULL,
  id_permiso uuid NOT NULL,
  CONSTRAINT rol_permisos_pkey PRIMARY KEY (id_rol_permiso),
  CONSTRAINT rol_permisos_id_rol_fkey FOREIGN KEY (id_rol) REFERENCES public.roles(id_rol),
  CONSTRAINT rol_permisos_id_permiso_fkey FOREIGN KEY (id_permiso) REFERENCES public.permisos(id_permiso)
);

CREATE TABLE IF NOT EXISTS public.usuarios (
  id_usuario uuid NOT NULL DEFAULT uuid_generate_v4(),
  auth_id uuid UNIQUE,
  nombre character varying NOT NULL,
  email character varying NOT NULL UNIQUE,
  avatar_url text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  created_by uuid,
  id_rol uuid,
  CONSTRAINT usuarios_pkey PRIMARY KEY (id_usuario),
  CONSTRAINT usuarios_id_rol_fkey FOREIGN KEY (id_rol) REFERENCES public.roles(id_rol)
);

CREATE TABLE IF NOT EXISTS public.cajas (
  id_caja uuid NOT NULL DEFAULT uuid_generate_v4(),
  id_sucursal uuid NOT NULL,
  nombre character varying NOT NULL,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT cajas_pkey PRIMARY KEY (id_caja),
  CONSTRAINT cajas_id_sucursal_fkey FOREIGN KEY (id_sucursal) REFERENCES public.sucursales(id_sucursal)
);

CREATE TABLE IF NOT EXISTS public.mesas (
  id_mesa uuid NOT NULL DEFAULT uuid_generate_v4(),
  id_sucursal uuid NOT NULL,
  numero smallint NOT NULL CHECK (numero > 0),
  nombre character varying,
  tipo public.tipo_mesa NOT NULL DEFAULT 'pool'::tipo_mesa,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  CONSTRAINT mesas_pkey PRIMARY KEY (id_mesa),
  CONSTRAINT mesas_id_sucursal_fkey FOREIGN KEY (id_sucursal) REFERENCES public.sucursales(id_sucursal)
);

CREATE TABLE IF NOT EXISTS public.tarifas (
  id_tarifa uuid NOT NULL DEFAULT uuid_generate_v4(),
  id_sucursal uuid NOT NULL,
  nombre character varying NOT NULL,
  precio_hora numeric NOT NULL CHECK (precio_hora >= 0::numeric),
  tipo_dia public.tipo_dia_tarifa NOT NULL DEFAULT 'todos'::tipo_dia_tarifa,
  hora_inicio time without time zone,
  hora_fin time without time zone,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT tarifas_pkey PRIMARY KEY (id_tarifa),
  CONSTRAINT tarifas_id_sucursal_fkey FOREIGN KEY (id_sucursal) REFERENCES public.sucursales(id_sucursal)
);

CREATE TABLE IF NOT EXISTS public.pedidos (
  id_pedido uuid NOT NULL DEFAULT uuid_generate_v4(),
  id_cliente uuid NOT NULL,
  id_sucursal uuid NOT NULL,
  total numeric NOT NULL DEFAULT 0 CHECK (total >= 0::numeric),
  estado public.estado_pedido NOT NULL DEFAULT 'pendiente'::estado_pedido,
  tipo public.tipo_pedido NOT NULL DEFAULT 'online'::tipo_pedido,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  numero_mesa character varying,
  CONSTRAINT pedidos_pkey PRIMARY KEY (id_pedido),
  CONSTRAINT pedidos_id_cliente_fkey FOREIGN KEY (id_cliente) REFERENCES public.clientes(id_cliente),
  CONSTRAINT pedidos_id_sucursal_fkey FOREIGN KEY (id_sucursal) REFERENCES public.sucursales(id_sucursal)
);

-- 5. CREAR TABLAS DEPENDIENTES (Nivel 2 - Requieren usuarios u otras previas)
CREATE TABLE IF NOT EXISTS public.productos (
  id_producto uuid NOT NULL DEFAULT uuid_generate_v4(),
  id_categoria uuid NOT NULL,
  nombre character varying NOT NULL,
  codigo character varying UNIQUE,
  precio_venta numeric NOT NULL CHECK (precio_venta >= 0::numeric),
  precio_costo numeric CHECK (precio_costo >= 0::numeric),
  imagen_url text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  created_by uuid,
  updated_by uuid,
  descripcion text,
  CONSTRAINT productos_pkey PRIMARY KEY (id_producto),
  CONSTRAINT productos_id_categoria_fkey FOREIGN KEY (id_categoria) REFERENCES public.categorias(id_categoria),
  CONSTRAINT fk_productos_created_by FOREIGN KEY (created_by) REFERENCES public.usuarios(id_usuario),
  CONSTRAINT fk_productos_updated_by FOREIGN KEY (updated_by) REFERENCES public.usuarios(id_usuario)
);

CREATE TABLE IF NOT EXISTS public.usuario_sucursal (
  id_usuario_sucursal uuid NOT NULL DEFAULT uuid_generate_v4(),
  id_usuario uuid NOT NULL,
  id_sucursal uuid,
  id_rol uuid NOT NULL,
  es_flotante boolean NOT NULL DEFAULT false,
  activo boolean NOT NULL DEFAULT true,
  fecha_inicio date NOT NULL DEFAULT CURRENT_DATE,
  fecha_fin date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT usuario_sucursal_pkey PRIMARY KEY (id_usuario_sucursal),
  CONSTRAINT usuario_sucursal_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario),
  CONSTRAINT usuario_sucursal_id_sucursal_fkey FOREIGN KEY (id_sucursal) REFERENCES public.sucursales(id_sucursal),
  CONSTRAINT usuario_sucursal_id_rol_fkey FOREIGN KEY (id_rol) REFERENCES public.roles(id_rol)
);

CREATE TABLE IF NOT EXISTS public.permiso_override (
  id_permiso_override uuid NOT NULL DEFAULT uuid_generate_v4(),
  id_usuario uuid NOT NULL,
  id_permiso uuid NOT NULL,
  concedido boolean NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  CONSTRAINT permiso_override_pkey PRIMARY KEY (id_permiso_override),
  CONSTRAINT permiso_override_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario),
  CONSTRAINT permiso_override_id_permiso_fkey FOREIGN KEY (id_permiso) REFERENCES public.permisos(id_permiso),
  CONSTRAINT permiso_override_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.usuarios(id_usuario)
);

CREATE TABLE IF NOT EXISTS public.arqueos (
  id_arqueo uuid NOT NULL DEFAULT uuid_generate_v4(),
  id_caja uuid NOT NULL,
  id_sucursal uuid NOT NULL,
  id_usuario uuid NOT NULL,
  tipo character varying NOT NULL,
  monto_inicial numeric CHECK (monto_inicial >= 0::numeric),
  monto_final numeric CHECK (monto_final >= 0::numeric),
  diferencia numeric DEFAULT (COALESCE(monto_final, (0)::numeric) - COALESCE(monto_inicial, (0)::numeric)),
  observacion text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT arqueos_pkey PRIMARY KEY (id_arqueo),
  CONSTRAINT arqueos_id_caja_fkey FOREIGN KEY (id_caja) REFERENCES public.cajas(id_caja),
  CONSTRAINT arqueos_id_sucursal_fkey FOREIGN KEY (id_sucursal) REFERENCES public.sucursales(id_sucursal),
  CONSTRAINT arqueos_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario)
);

CREATE TABLE IF NOT EXISTS public.movimientos_caja (
  id_mov_caja uuid NOT NULL DEFAULT uuid_generate_v4(),
  id_caja uuid NOT NULL,
  id_sucursal uuid NOT NULL,
  id_usuario uuid NOT NULL,
  tipo character varying NOT NULL,
  monto numeric NOT NULL CHECK (monto > 0::numeric),
  descripcion text,
  referencia_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT movimientos_caja_pkey PRIMARY KEY (id_mov_caja),
  CONSTRAINT movimientos_caja_id_caja_fkey FOREIGN KEY (id_caja) REFERENCES public.cajas(id_caja),
  CONSTRAINT movimientos_caja_id_sucursal_fkey FOREIGN KEY (id_sucursal) REFERENCES public.sucursales(id_sucursal),
  CONSTRAINT movimientos_caja_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario)
);

CREATE TABLE IF NOT EXISTS public.sesiones_mesa (
  id_sesion uuid NOT NULL DEFAULT uuid_generate_v4(),
  id_mesa uuid NOT NULL,
  id_tarifa uuid NOT NULL,
  id_usuario uuid NOT NULL,
  id_sucursal uuid NOT NULL,
  inicio timestamp with time zone NOT NULL DEFAULT now(),
  fin timestamp with time zone,
  total_tiempo numeric CHECK (total_tiempo >= 0::numeric),
  estado public.estado_sesion NOT NULL DEFAULT 'abierta'::estado_sesion,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  modalidad character varying DEFAULT 'abierto'::character varying,
  tiempo_fijo_minutos integer DEFAULT 0,
  costo_partida numeric DEFAULT 0,
  CONSTRAINT sesiones_mesa_pkey PRIMARY KEY (id_sesion),
  CONSTRAINT sesiones_mesa_id_mesa_fkey FOREIGN KEY (id_mesa) REFERENCES public.mesas(id_mesa),
  CONSTRAINT sesiones_mesa_id_tarifa_fkey FOREIGN KEY (id_tarifa) REFERENCES public.tarifas(id_tarifa),
  CONSTRAINT sesiones_mesa_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario),
  CONSTRAINT sesiones_mesa_id_sucursal_fkey FOREIGN KEY (id_sucursal) REFERENCES public.sucursales(id_sucursal)
);

CREATE TABLE IF NOT EXISTS public.novedades (
  id_novedad uuid NOT NULL DEFAULT uuid_generate_v4(),
  id_sucursal uuid,
  titulo character varying NOT NULL,
  contenido text,
  tipo public.tipo_novedad NOT NULL DEFAULT 'noticia'::tipo_novedad,
  imagen_url text,
  activo boolean NOT NULL DEFAULT true,
  publicado_en timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  created_by uuid,
  CONSTRAINT novedades_pkey PRIMARY KEY (id_novedad),
  CONSTRAINT novedades_id_sucursal_fkey FOREIGN KEY (id_sucursal) REFERENCES public.sucursales(id_sucursal),
  CONSTRAINT novedades_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.usuarios(id_usuario)
);

CREATE TABLE IF NOT EXISTS public.campeonatos (
  id_campeonato uuid NOT NULL DEFAULT uuid_generate_v4(),
  id_sucursal uuid NOT NULL,
  nombre character varying NOT NULL,
  descripcion text,
  fecha_inicio date NOT NULL,
  fecha_fin date,
  cupo_maximo smallint CHECK (cupo_maximo > 0),
  precio_inscripcion numeric NOT NULL DEFAULT 0 CHECK (precio_inscripcion >= 0::numeric),
  premio text,
  modalidad public.modalidad_camp NOT NULL DEFAULT 'eliminacion_simple'::modalidad_camp,
  estado public.estado_campeonato NOT NULL DEFAULT 'proximo'::estado_campeonato,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  created_by uuid,
  imagen_url text,
  CONSTRAINT campeonatos_pkey PRIMARY KEY (id_campeonato),
  CONSTRAINT campeonatos_id_sucursal_fkey FOREIGN KEY (id_sucursal) REFERENCES public.sucursales(id_sucursal),
  CONSTRAINT campeonatos_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.usuarios(id_usuario)
);

CREATE TABLE IF NOT EXISTS public.asistencias (
  id_asistencia uuid NOT NULL DEFAULT uuid_generate_v4(),
  id_usuario uuid NOT NULL,
  id_sucursal uuid NOT NULL,
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  hora_entrada timestamp with time zone NOT NULL DEFAULT now(),
  hora_salida timestamp with time zone,
  horas_trabajadas numeric,
  observaciones text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT asistencias_pkey PRIMARY KEY (id_asistencia),
  CONSTRAINT asistencias_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario),
  CONSTRAINT asistencias_id_sucursal_fkey FOREIGN KEY (id_sucursal) REFERENCES public.sucursales(id_sucursal)
);

CREATE TABLE IF NOT EXISTS public.configuracion (
  id_configuracion uuid NOT NULL DEFAULT uuid_generate_v4(),
  id_usuario uuid,
  nombre_negocio character varying NOT NULL DEFAULT 'Billar El Malandro'::character varying,
  moneda character varying NOT NULL DEFAULT 'Bs.'::character varying,
  tarifa_hora_mesa numeric NOT NULL DEFAULT 30.00,
  sonidos_activados boolean NOT NULL DEFAULT true,
  impresion_automatica boolean NOT NULL DEFAULT false,
  modo_nocturno boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT configuracion_pkey PRIMARY KEY (id_configuracion),
  CONSTRAINT configuracion_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario)
);

CREATE TABLE IF NOT EXISTS public.torneos (
  id_torneo uuid NOT NULL DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  descripcion text,
  fecha_inicio timestamp with time zone NOT NULL,
  fecha_fin timestamp with time zone,
  costo_inscripcion numeric DEFAULT 0,
  premio_estimado numeric DEFAULT 0,
  estado text DEFAULT 'proximo'::text CHECK (estado = ANY (ARRAY['proximo'::text, 'en_curso'::text, 'finalizado'::text, 'cancelado'::text])),
  puntos_recompensa integer DEFAULT 0,
  creado_por uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT torneos_pkey PRIMARY KEY (id_torneo),
  CONSTRAINT torneos_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES public.usuarios(id_usuario)
);

-- 6. CREAR TABLAS DEPENDIENTES (Nivel 3)
CREATE TABLE IF NOT EXISTS public.inventario (
  id_inventario uuid NOT NULL DEFAULT uuid_generate_v4(),
  id_sucursal uuid NOT NULL,
  id_producto uuid NOT NULL,
  stock numeric NOT NULL DEFAULT 0 CHECK (stock >= 0::numeric),
  stock_minimo numeric NOT NULL DEFAULT 5 CHECK (stock_minimo >= 0::numeric),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT inventario_pkey PRIMARY KEY (id_inventario),
  CONSTRAINT inventario_id_sucursal_fkey FOREIGN KEY (id_sucursal) REFERENCES public.sucursales(id_sucursal),
  CONSTRAINT inventario_id_producto_fkey FOREIGN KEY (id_producto) REFERENCES public.productos(id_producto)
);

CREATE TABLE IF NOT EXISTS public.ventas (
  id_venta uuid NOT NULL DEFAULT uuid_generate_v4(),
  id_sucursal uuid NOT NULL,
  id_sesion uuid,
  id_usuario uuid NOT NULL,
  id_cliente uuid,
  total numeric NOT NULL DEFAULT 0 CHECK (total >= 0::numeric),
  metodo_pago public.metodo_pago NOT NULL DEFAULT 'efectivo'::metodo_pago,
  estado public.estado_venta NOT NULL DEFAULT 'completada'::estado_venta,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  created_by uuid,
  CONSTRAINT ventas_pkey PRIMARY KEY (id_venta),
  CONSTRAINT ventas_id_sucursal_fkey FOREIGN KEY (id_sucursal) REFERENCES public.sucursales(id_sucursal),
  CONSTRAINT ventas_id_sesion_fkey FOREIGN KEY (id_sesion) REFERENCES public.sesiones_mesa(id_sesion),
  CONSTRAINT ventas_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario),
  CONSTRAINT ventas_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.usuarios(id_usuario),
  CONSTRAINT fk_ventas_cliente FOREIGN KEY (id_cliente) REFERENCES public.clientes(id_cliente)
);

CREATE TABLE IF NOT EXISTS public.pedido_items (
  id_pedido_item uuid NOT NULL DEFAULT uuid_generate_v4(),
  id_pedido uuid NOT NULL,
  id_producto uuid NOT NULL,
  cantidad numeric NOT NULL CHECK (cantidad > 0::numeric),
  precio_unitario numeric NOT NULL CHECK (precio_unitario >= 0::numeric),
  subtotal numeric DEFAULT (cantidad * precio_unitario),
  CONSTRAINT pedido_items_pkey PRIMARY KEY (id_pedido_item),
  CONSTRAINT pedido_items_id_pedido_fkey FOREIGN KEY (id_pedido) REFERENCES public.pedidos(id_pedido),
  CONSTRAINT pedido_items_id_producto_fkey FOREIGN KEY (id_producto) REFERENCES public.productos(id_producto)
);

CREATE TABLE IF NOT EXISTS public.inscripciones (
  id_inscripcion uuid NOT NULL DEFAULT uuid_generate_v4(),
  id_campeonato uuid NOT NULL,
  id_cliente uuid NOT NULL,
  estado_pago public.estado_pago_insc NOT NULL DEFAULT 'pendiente'::estado_pago_insc,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT inscripciones_pkey PRIMARY KEY (id_inscripcion),
  CONSTRAINT inscripciones_id_campeonato_fkey FOREIGN KEY (id_campeonato) REFERENCES public.campeonatos(id_campeonato),
  CONSTRAINT inscripciones_id_cliente_fkey FOREIGN KEY (id_cliente) REFERENCES public.clientes(id_cliente)
);

CREATE TABLE IF NOT EXISTS public.participantes_torneo (
  id_participante uuid NOT NULL DEFAULT gen_random_uuid(),
  id_torneo uuid NOT NULL,
  id_cliente uuid NOT NULL,
  estado_pago text DEFAULT 'pendiente'::text CHECK (estado_pago = ANY (ARRAY['pendiente'::text, 'pagado'::text])),
  posicion_final integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT participantes_torneo_pkey PRIMARY KEY (id_participante),
  CONSTRAINT participantes_torneo_id_torneo_fkey FOREIGN KEY (id_torneo) REFERENCES public.torneos(id_torneo),
  CONSTRAINT participantes_torneo_id_cliente_fkey FOREIGN KEY (id_cliente) REFERENCES public.clientes(id_cliente)
);

-- 7. CREAR TABLAS DEPENDIENTES (Nivel 4)
CREATE TABLE IF NOT EXISTS public.movimientos_inventario (
  id_movimiento uuid NOT NULL DEFAULT uuid_generate_v4(),
  id_inventario uuid NOT NULL,
  id_sucursal uuid NOT NULL,
  id_producto uuid NOT NULL,
  tipo character varying NOT NULL,
  cantidad numeric NOT NULL CHECK (cantidad > 0::numeric),
  stock_antes numeric NOT NULL CHECK (stock_antes >= 0::numeric),
  stock_despues numeric NOT NULL CHECK (stock_despues >= 0::numeric),
  motivo text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  CONSTRAINT movimientos_inventario_pkey PRIMARY KEY (id_movimiento),
  CONSTRAINT movimientos_inventario_id_inventario_fkey FOREIGN KEY (id_inventario) REFERENCES public.inventario(id_inventario),
  CONSTRAINT movimientos_inventario_id_sucursal_fkey FOREIGN KEY (id_sucursal) REFERENCES public.sucursales(id_sucursal),
  CONSTRAINT movimientos_inventario_id_producto_fkey FOREIGN KEY (id_producto) REFERENCES public.productos(id_producto),
  CONSTRAINT fk_movinv_created_by FOREIGN KEY (created_by) REFERENCES public.usuarios(id_usuario)
);

CREATE TABLE IF NOT EXISTS public.venta_items (
  id_venta_item uuid NOT NULL DEFAULT uuid_generate_v4(),
  id_venta uuid NOT NULL,
  id_producto uuid NOT NULL,
  cantidad numeric NOT NULL CHECK (cantidad > 0::numeric),
  precio_unitario numeric NOT NULL CHECK (precio_unitario >= 0::numeric),
  subtotal numeric DEFAULT (cantidad * precio_unitario),
  CONSTRAINT venta_items_pkey PRIMARY KEY (id_venta_item),
  CONSTRAINT venta_items_id_venta_fkey FOREIGN KEY (id_venta) REFERENCES public.ventas(id_venta),
  CONSTRAINT venta_items_id_producto_fkey FOREIGN KEY (id_producto) REFERENCES public.productos(id_producto)
);

-- 8. CONFIGURACIÓN DEL BUCKET PARA AVATARES (STORAGE)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Avatar images are publicly accessible') THEN
        CREATE POLICY "Avatar images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can upload their own avatars') THEN
        CREATE POLICY "Users can upload their own avatars" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can update their own avatars') THEN
        CREATE POLICY "Users can update their own avatars" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can delete their own avatars') THEN
        CREATE POLICY "Users can delete their own avatars" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars');
    END IF;
END $$;
