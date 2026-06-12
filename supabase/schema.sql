-- ============================================================
--  SISTEMA DE GESTIÓN INTEGRAL DE BILLAR  v2
--  Stack: Next.js + PostgreSQL (Supabase) + Vercel
--  Convención: PK = id_{tabla}
--  EJECUTAR ESTE ARCHIVO EN EL SQL EDITOR DE SUPABASE
-- ============================================================

-- Limpiar tablas previas para evitar colisiones y asegurar esquema actualizado
DROP TABLE IF EXISTS inscripciones CASCADE;
DROP TABLE IF EXISTS campeonatos CASCADE;
DROP TABLE IF EXISTS novedades CASCADE;
DROP TABLE IF EXISTS pedido_items CASCADE;
DROP TABLE IF EXISTS pedidos CASCADE;
DROP TABLE IF EXISTS clientes CASCADE;
DROP TABLE IF EXISTS venta_items CASCADE;
DROP TABLE IF EXISTS ventas CASCADE;
DROP TABLE IF EXISTS sesiones_mesa CASCADE;
DROP TABLE IF EXISTS movimientos_caja CASCADE;
DROP TABLE IF EXISTS arqueos CASCADE;
DROP TABLE IF EXISTS cajas CASCADE;
DROP TABLE IF EXISTS permiso_override CASCADE;
DROP TABLE IF EXISTS usuario_sucursal CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;
DROP TABLE IF EXISTS rol_permisos CASCADE;
DROP TABLE IF EXISTS permisos CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS tarifas CASCADE;
DROP TABLE IF EXISTS mesas CASCADE;
DROP TABLE IF EXISTS movimientos_inventario CASCADE;
DROP TABLE IF EXISTS inventario CASCADE;
DROP TABLE IF EXISTS productos CASCADE;
DROP TABLE IF EXISTS categorias CASCADE;
DROP TABLE IF EXISTS sucursales CASCADE;

-- Limpiar tipos ENUM previos
DROP TYPE IF EXISTS tipo_mesa CASCADE;
DROP TYPE IF EXISTS tipo_dia_tarifa CASCADE;
DROP TYPE IF EXISTS estado_sesion CASCADE;
DROP TYPE IF EXISTS estado_venta CASCADE;
DROP TYPE IF EXISTS metodo_pago CASCADE;
DROP TYPE IF EXISTS estado_pedido CASCADE;
DROP TYPE IF EXISTS tipo_pedido CASCADE;
DROP TYPE IF EXISTS tipo_novedad CASCADE;
DROP TYPE IF EXISTS estado_campeonato CASCADE;
DROP TYPE IF EXISTS modalidad_camp CASCADE;
DROP TYPE IF EXISTS estado_pago_insc CASCADE;
DROP TYPE IF EXISTS tipo_movimiento CASCADE;
DROP TYPE IF EXISTS tipo_mov_caja CASCADE;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE tipo_mesa         AS ENUM ('pool', 'snooker', 'americana', 'carambola');
CREATE TYPE tipo_dia_tarifa   AS ENUM ('todos', 'semana', 'finde', 'feriado');
CREATE TYPE estado_sesion     AS ENUM ('abierta', 'cerrada', 'cancelada');
CREATE TYPE estado_venta      AS ENUM ('completada', 'anulada', 'pendiente');
CREATE TYPE metodo_pago       AS ENUM ('efectivo', 'tarjeta', 'qr', 'fiado', 'mixto');
CREATE TYPE estado_pedido     AS ENUM ('pendiente', 'confirmado', 'enviado', 'entregado', 'cancelado');
CREATE TYPE tipo_pedido       AS ENUM ('online', 'presencial');
CREATE TYPE tipo_novedad      AS ENUM ('noticia', 'oferta', 'evento', 'campeonato');
CREATE TYPE estado_campeonato AS ENUM ('proximo', 'en_curso', 'finalizado', 'cancelado');
CREATE TYPE modalidad_camp    AS ENUM ('eliminacion_simple', 'doble_eliminacion', 'round_robin', 'grupos');
CREATE TYPE estado_pago_insc  AS ENUM ('pendiente', 'pagado', 'devuelto');
CREATE TYPE tipo_movimiento   AS ENUM ('entrada', 'salida', 'ajuste', 'devolucion', 'transferencia');
CREATE TYPE tipo_mov_caja     AS ENUM ('apertura', 'cierre', 'ingreso', 'egreso', 'arqueo');

-- ============================================================
-- BLOQUE 1: INFRAESTRUCTURA BASE
-- ============================================================

CREATE TABLE sucursales (
  id_sucursal   UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre        VARCHAR(100) NOT NULL,
  direccion     VARCHAR(255),
  telefono      VARCHAR(20),
  activo        BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

CREATE TABLE categorias (
  id_categoria  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre        VARCHAR(80)  NOT NULL UNIQUE,
  descripcion   TEXT,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

CREATE TABLE productos (
  id_producto   UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_categoria  UUID        NOT NULL REFERENCES categorias(id_categoria) ON DELETE RESTRICT,
  nombre        VARCHAR(150) NOT NULL,
  codigo        VARCHAR(50)  UNIQUE,
  precio_venta  NUMERIC(10,2) NOT NULL CHECK (precio_venta >= 0),
  precio_costo  NUMERIC(10,2)          CHECK (precio_costo >= 0),
  imagen_url    TEXT,
  activo        BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  created_by    UUID,
  updated_by    UUID
);

CREATE TABLE inventario (
  id_inventario UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_sucursal   UUID        NOT NULL REFERENCES sucursales(id_sucursal)  ON DELETE RESTRICT,
  id_producto   UUID        NOT NULL REFERENCES productos(id_producto)   ON DELETE RESTRICT,
  stock         NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (stock >= 0),
  stock_minimo  NUMERIC(10,2) NOT NULL DEFAULT 5 CHECK (stock_minimo >= 0),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (id_sucursal, id_producto)
);

CREATE TABLE movimientos_inventario (
  id_movimiento   UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_inventario   UUID          NOT NULL REFERENCES inventario(id_inventario) ON DELETE RESTRICT,
  id_sucursal     UUID          NOT NULL REFERENCES sucursales(id_sucursal)   ON DELETE RESTRICT,
  id_producto     UUID          NOT NULL REFERENCES productos(id_producto)    ON DELETE RESTRICT,
  tipo            tipo_movimiento NOT NULL,
  cantidad        NUMERIC(10,2)  NOT NULL CHECK (cantidad > 0),
  stock_antes     NUMERIC(10,2)  NOT NULL CHECK (stock_antes >= 0),
  stock_despues   NUMERIC(10,2)  NOT NULL CHECK (stock_despues >= 0),
  motivo          TEXT,
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  created_by      UUID
);

CREATE TABLE mesas (
  id_mesa       UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_sucursal   UUID        NOT NULL REFERENCES sucursales(id_sucursal) ON DELETE RESTRICT,
  numero        SMALLINT    NOT NULL CHECK (numero > 0),
  nombre        VARCHAR(60),
  tipo          tipo_mesa   NOT NULL DEFAULT 'pool',
  activo        BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  UNIQUE (id_sucursal, numero)
);

CREATE TABLE tarifas (
  id_tarifa     UUID             PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_sucursal   UUID             NOT NULL REFERENCES sucursales(id_sucursal) ON DELETE RESTRICT,
  nombre        VARCHAR(80)      NOT NULL,
  precio_hora   NUMERIC(10,2)    NOT NULL CHECK (precio_hora >= 0),
  tipo_dia      tipo_dia_tarifa  NOT NULL DEFAULT 'todos',
  hora_inicio   TIME,
  hora_fin      TIME,
  horas_pagadas INT              NOT NULL DEFAULT 0,
  horas_regalo  INT              NOT NULL DEFAULT 0,
  activo        BOOLEAN          NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_tarifa_horas CHECK (
    hora_inicio IS NULL OR hora_fin IS NULL OR hora_fin > hora_inicio
  )
);

-- ============================================================
-- BLOQUE 2: ACCESO INTERNO
-- ============================================================

CREATE TABLE roles (
  id_rol        UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre        VARCHAR(50)  NOT NULL UNIQUE,
  descripcion   TEXT,
  nivel         SMALLINT     NOT NULL DEFAULT 1 CHECK (nivel BETWEEN 1 AND 5),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE permisos (
  id_permiso    UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo        VARCHAR(80)  NOT NULL UNIQUE,
  descripcion   TEXT,
  modulo        VARCHAR(50)  NOT NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE rol_permisos (
  id_rol_permiso UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_rol         UUID NOT NULL REFERENCES roles(id_rol)     ON DELETE CASCADE,
  id_permiso     UUID NOT NULL REFERENCES permisos(id_permiso) ON DELETE CASCADE,
  UNIQUE (id_rol, id_permiso)
);

-- ============================================================
-- USUARIOS (Staff interno) - Conectado a Supabase Auth
-- auth_id es el puente entre auth.users y esta tabla
-- ============================================================

CREATE TABLE usuarios (
  id_usuario    UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id       UUID         UNIQUE,  -- Referencia a auth.users(id) de Supabase
  id_rol        UUID         REFERENCES roles(id_rol) ON DELETE SET NULL, -- Rol del empleado
  nombre        VARCHAR(120)  NOT NULL,
  email         VARCHAR(255)  NOT NULL UNIQUE,
  avatar_url    TEXT,
  activo        BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  created_by    UUID
);

ALTER TABLE productos ADD CONSTRAINT fk_productos_created_by FOREIGN KEY (created_by) REFERENCES usuarios(id_usuario) ON DELETE SET NULL;
ALTER TABLE productos ADD CONSTRAINT fk_productos_updated_by FOREIGN KEY (updated_by) REFERENCES usuarios(id_usuario) ON DELETE SET NULL;
ALTER TABLE movimientos_inventario ADD CONSTRAINT fk_movinv_created_by FOREIGN KEY (created_by) REFERENCES usuarios(id_usuario) ON DELETE SET NULL;

CREATE TABLE usuario_sucursal (
  id_usuario_sucursal UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_usuario          UUID    NOT NULL REFERENCES usuarios(id_usuario)   ON DELETE CASCADE,
  id_sucursal         UUID             REFERENCES sucursales(id_sucursal) ON DELETE RESTRICT,
  id_rol              UUID    NOT NULL REFERENCES roles(id_rol)           ON DELETE RESTRICT,
  es_flotante         BOOLEAN NOT NULL DEFAULT FALSE,
  activo              BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_inicio        DATE    NOT NULL DEFAULT CURRENT_DATE,
  fecha_fin           DATE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_us_fechas CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_inicio)
);

CREATE UNIQUE INDEX uq_usuario_sucursal_activo_idx
  ON usuario_sucursal (id_usuario, id_sucursal)
  WHERE activo = TRUE;

CREATE TABLE permiso_override (
  id_permiso_override UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_usuario          UUID    NOT NULL REFERENCES usuarios(id_usuario)  ON DELETE CASCADE,
  id_permiso          UUID    NOT NULL REFERENCES permisos(id_permiso)  ON DELETE CASCADE,
  concedido           BOOLEAN NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by          UUID             REFERENCES usuarios(id_usuario)  ON DELETE SET NULL,
  UNIQUE (id_usuario, id_permiso)
);

-- ============================================================
-- BLOQUE 3: CAJA
-- ============================================================

CREATE TABLE cajas (
  id_caja       UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_sucursal   UUID        NOT NULL REFERENCES sucursales(id_sucursal) ON DELETE RESTRICT,
  nombre        VARCHAR(60)  NOT NULL,
  activo        BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE arqueos (
  id_arqueo     UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_caja       UUID        NOT NULL REFERENCES cajas(id_caja)       ON DELETE RESTRICT,
  id_sucursal   UUID        NOT NULL REFERENCES sucursales(id_sucursal) ON DELETE RESTRICT,
  id_usuario    UUID        NOT NULL REFERENCES usuarios(id_usuario)  ON DELETE RESTRICT,
  tipo          tipo_mov_caja NOT NULL,
  monto_inicial NUMERIC(10,2)          CHECK (monto_inicial >= 0),
  monto_final   NUMERIC(10,2)          CHECK (monto_final >= 0),
  diferencia    NUMERIC(10,2) GENERATED ALWAYS AS (
                  COALESCE(monto_final, 0) - COALESCE(monto_inicial, 0)
                ) STORED,
  observacion   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE movimientos_caja (
  id_mov_caja   UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_caja       UUID          NOT NULL REFERENCES cajas(id_caja)        ON DELETE RESTRICT,
  id_sucursal   UUID          NOT NULL REFERENCES sucursales(id_sucursal) ON DELETE RESTRICT,
  id_usuario    UUID          NOT NULL REFERENCES usuarios(id_usuario)   ON DELETE RESTRICT,
  tipo          tipo_mov_caja NOT NULL,
  monto         NUMERIC(10,2)  NOT NULL CHECK (monto > 0),
  descripcion   TEXT,
  referencia_id UUID,
  created_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- ============================================================
-- BLOQUE 4: OPERACIÓN
-- ============================================================

CREATE TABLE sesiones_mesa (
  id_sesion     UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_mesa       UUID          NOT NULL REFERENCES mesas(id_mesa)         ON DELETE RESTRICT,
  id_tarifa     UUID          NOT NULL REFERENCES tarifas(id_tarifa)     ON DELETE RESTRICT,
  id_usuario    UUID          NOT NULL REFERENCES usuarios(id_usuario)   ON DELETE RESTRICT,
  id_sucursal   UUID          NOT NULL REFERENCES sucursales(id_sucursal) ON DELETE RESTRICT,
  inicio        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  fin           TIMESTAMPTZ,
  total_tiempo  NUMERIC(6,2)           CHECK (total_tiempo >= 0),
  estado        estado_sesion  NOT NULL DEFAULT 'abierta',
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_sesion_fin CHECK (fin IS NULL OR fin > inicio)
);

CREATE UNIQUE INDEX uq_mesa_una_sesion_abierta
  ON sesiones_mesa (id_mesa)
  WHERE estado = 'abierta';

CREATE TABLE ventas (
  id_venta      UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_sucursal   UUID          NOT NULL REFERENCES sucursales(id_sucursal) ON DELETE RESTRICT,
  id_sesion     UUID                   REFERENCES sesiones_mesa(id_sesion) ON DELETE RESTRICT,
  id_usuario    UUID          NOT NULL REFERENCES usuarios(id_usuario)    ON DELETE RESTRICT,
  id_cliente    UUID,
  total         NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  metodo_pago   metodo_pago   NOT NULL DEFAULT 'efectivo',
  estado        estado_venta  NOT NULL DEFAULT 'completada',
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  created_by    UUID                   REFERENCES usuarios(id_usuario)    ON DELETE SET NULL
);

CREATE TABLE venta_items (
  id_venta_item   UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_venta        UUID          NOT NULL REFERENCES ventas(id_venta)      ON DELETE CASCADE,
  id_producto     UUID          NOT NULL REFERENCES productos(id_producto) ON DELETE RESTRICT,
  cantidad        NUMERIC(8,2)  NOT NULL CHECK (cantidad > 0),
  precio_unitario NUMERIC(10,2) NOT NULL CHECK (precio_unitario >= 0),
  subtotal        NUMERIC(10,2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED
);

-- ============================================================
-- BLOQUE 5: PORTAL PÚBLICO (CLIENTES)
-- Conectado a Supabase Auth via auth_id
-- ============================================================

CREATE TABLE clientes (
  id_cliente       UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id          UUID         UNIQUE,  -- Referencia a auth.users(id) de Supabase
  nombre           VARCHAR(120)  NOT NULL,
  email            VARCHAR(255),
  telefono         VARCHAR(20),
  direccion        TEXT,
  puntos_fidelidad INT           NOT NULL DEFAULT 0 CHECK (puntos_fidelidad >= 0),
  activo           BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ
);

CREATE UNIQUE INDEX uq_cliente_email
  ON clientes (email)
  WHERE email IS NOT NULL;

ALTER TABLE ventas
  ADD CONSTRAINT fk_ventas_cliente
  FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente) ON DELETE SET NULL;

CREATE TABLE pedidos (
  id_pedido     UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_cliente    UUID          NOT NULL REFERENCES clientes(id_cliente)    ON DELETE RESTRICT,
  id_sucursal   UUID          NOT NULL REFERENCES sucursales(id_sucursal)  ON DELETE RESTRICT,
  total         NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  estado        estado_pedido  NOT NULL DEFAULT 'pendiente',
  tipo          tipo_pedido    NOT NULL DEFAULT 'online',
  created_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

CREATE TABLE pedido_items (
  id_pedido_item  UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_pedido       UUID          NOT NULL REFERENCES pedidos(id_pedido)     ON DELETE CASCADE,
  id_producto     UUID          NOT NULL REFERENCES productos(id_producto)  ON DELETE RESTRICT,
  cantidad        NUMERIC(8,2)  NOT NULL CHECK (cantidad > 0),
  precio_unitario NUMERIC(10,2) NOT NULL CHECK (precio_unitario >= 0),
  subtotal        NUMERIC(10,2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED
);

CREATE TABLE novedades (
  id_novedad    UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_sucursal   UUID                   REFERENCES sucursales(id_sucursal) ON DELETE SET NULL,
  titulo        VARCHAR(200)   NOT NULL,
  contenido     TEXT,
  tipo          tipo_novedad   NOT NULL DEFAULT 'noticia',
  imagen_url    TEXT,
  activo        BOOLEAN        NOT NULL DEFAULT TRUE,
  publicado_en  TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  created_by    UUID                   REFERENCES usuarios(id_usuario) ON DELETE SET NULL
);

CREATE TABLE campeonatos (
  id_campeonato      UUID             PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_sucursal        UUID             NOT NULL REFERENCES sucursales(id_sucursal) ON DELETE RESTRICT,
  nombre             VARCHAR(150)      NOT NULL,
  descripcion        TEXT,
  fecha_inicio       DATE              NOT NULL,
  fecha_fin          DATE,
  cupo_maximo        SMALLINT                   CHECK (cupo_maximo > 0),
  precio_inscripcion NUMERIC(10,2)     NOT NULL DEFAULT 0 CHECK (precio_inscripcion >= 0),
  premio             TEXT,
  modalidad          modalidad_camp    NOT NULL DEFAULT 'eliminacion_simple',
  estado             estado_campeonato NOT NULL DEFAULT 'proximo',
  created_at         TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  deleted_at         TIMESTAMPTZ,
  created_by         UUID                       REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
  CONSTRAINT chk_camp_fechas CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_inicio)
);

CREATE TABLE inscripciones (
  id_inscripcion UUID             PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_campeonato  UUID             NOT NULL REFERENCES campeonatos(id_campeonato) ON DELETE CASCADE,
  id_cliente     UUID             NOT NULL REFERENCES clientes(id_cliente)       ON DELETE RESTRICT,
  estado_pago    estado_pago_insc NOT NULL DEFAULT 'pendiente',
  created_at     TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  UNIQUE (id_campeonato, id_cliente)
);

-- ============================================================
-- BLOQUE 6: DATOS SEMILLA
-- ============================================================

INSERT INTO roles (nombre, descripcion, nivel) VALUES
  ('superadmin', 'Acceso total, todas las sucursales', 5),
  ('admin',      'Administrador de su sucursal',       4),
  ('supervisor', 'Supervisa operaciones y personal',   3),
  ('cajero',     'Gestiona ventas y caja',             2),
  ('mesero',     'Atiende mesas y toma pedidos',       1);

INSERT INTO permisos (codigo, descripcion, modulo) VALUES
  ('sucursales.ver',        'Ver sucursales',             'sucursales'),
  ('sucursales.gestionar',  'Crear y editar sucursales',  'sucursales'),
  ('mesas.ver',             'Ver estado de mesas',        'mesas'),
  ('mesas.gestionar',       'Abrir y cerrar sesiones',    'mesas'),
  ('mesas.configurar',      'Crear y editar mesas',       'mesas'),
  ('ventas.crear',          'Registrar ventas',           'ventas'),
  ('ventas.ver',            'Ver historial de ventas',    'ventas'),
  ('ventas.anular',         'Anular una venta',           'ventas'),
  ('inventario.ver',        'Ver inventario',             'inventario'),
  ('inventario.gestionar',  'Editar stock y productos',   'inventario'),
  ('empleados.ver',         'Ver lista de empleados',     'empleados'),
  ('empleados.gestionar',   'Crear y editar empleados',   'empleados'),
  ('campeonatos.ver',       'Ver campeonatos',            'campeonatos'),
  ('campeonatos.gestionar', 'Crear y editar campeonatos', 'campeonatos'),
  ('reportes.ver',          'Ver reportes básicos',       'reportes'),
  ('reportes.avanzados',    'Ver reportes avanzados',     'reportes'),
  ('caja.abrir',            'Abrir y cerrar caja',        'caja'),
  ('caja.ver',              'Ver movimientos de caja',    'caja'),
  ('novedades.gestionar',   'Publicar novedades',         'novedades'),
  ('pedidos.gestionar',     'Gestionar pedidos online',   'pedidos');

-- Asignar TODOS los permisos al rol superadmin
INSERT INTO rol_permisos (id_rol, id_permiso)
SELECT r.id_rol, p.id_permiso
FROM roles r, permisos p
WHERE r.nombre = 'superadmin';

-- Sucursal de ejemplo
INSERT INTO sucursales (nombre, direccion, telefono)
VALUES ('Billar Malandro - Sede Principal', 'Dirección Principal', '0412-1234567');

-- Categorías de ejemplo
INSERT INTO categorias (nombre, descripcion) VALUES
  ('Cervezas',  'Cervezas nacionales e importadas'),
  ('Licores',   'Whisky, ron, vodka y más'),
  ('Snacks',    'Pasapalos y comida rápida'),
  ('Refrescos', 'Bebidas no alcohólicas');

-- ============================================================
-- BLOQUE 7: ÍNDICES
-- ============================================================

CREATE INDEX idx_productos_categoria       ON productos(id_categoria);
CREATE INDEX idx_inventario_sucursal       ON inventario(id_sucursal);
CREATE INDEX idx_inventario_producto       ON inventario(id_producto);
CREATE INDEX idx_movinv_inventario         ON movimientos_inventario(id_inventario);
CREATE INDEX idx_movinv_sucursal           ON movimientos_inventario(id_sucursal);
CREATE INDEX idx_movinv_created_at         ON movimientos_inventario(created_at);
CREATE INDEX idx_mesas_sucursal            ON mesas(id_sucursal);
CREATE INDEX idx_usuario_sucursal_usuario  ON usuario_sucursal(id_usuario);
CREATE INDEX idx_usuario_sucursal_sucursal ON usuario_sucursal(id_sucursal);
CREATE INDEX idx_sesiones_mesa             ON sesiones_mesa(id_mesa);
CREATE INDEX idx_sesiones_estado           ON sesiones_mesa(estado);
CREATE INDEX idx_sesiones_sucursal         ON sesiones_mesa(id_sucursal);
CREATE INDEX idx_ventas_sucursal           ON ventas(id_sucursal);
CREATE INDEX idx_ventas_sesion             ON ventas(id_sesion);
CREATE INDEX idx_ventas_created_at         ON ventas(created_at);
CREATE INDEX idx_ventas_cliente            ON ventas(id_cliente);
CREATE INDEX idx_venta_items_venta         ON venta_items(id_venta);
CREATE INDEX idx_cajas_sucursal            ON cajas(id_sucursal);
CREATE INDEX idx_arqueos_caja              ON arqueos(id_caja);
CREATE INDEX idx_movcaja_caja              ON movimientos_caja(id_caja);
CREATE INDEX idx_movcaja_created_at        ON movimientos_caja(created_at);
CREATE INDEX idx_pedidos_cliente           ON pedidos(id_cliente);
CREATE INDEX idx_pedidos_estado            ON pedidos(estado);
CREATE INDEX idx_pedidos_sucursal          ON pedidos(id_sucursal);
CREATE INDEX idx_pedido_items_pedido       ON pedido_items(id_pedido);
CREATE INDEX idx_novedades_tipo            ON novedades(tipo);
CREATE INDEX idx_novedades_sucursal        ON novedades(id_sucursal);
CREATE INDEX idx_novedades_activo          ON novedades(activo);
CREATE INDEX idx_campeonatos_sucursal      ON campeonatos(id_sucursal);
CREATE INDEX idx_campeonatos_estado        ON campeonatos(estado);
CREATE INDEX idx_inscripciones_campeonato  ON inscripciones(id_campeonato);
CREATE INDEX idx_inscripciones_cliente     ON inscripciones(id_cliente);
CREATE INDEX idx_usuarios_auth_id          ON usuarios(auth_id);
CREATE INDEX idx_clientes_auth_id          ON clientes(auth_id);

CREATE INDEX idx_sucursales_activas   ON sucursales(id_sucursal) WHERE deleted_at IS NULL;
CREATE INDEX idx_productos_activos    ON productos(id_producto)  WHERE deleted_at IS NULL;
CREATE INDEX idx_mesas_activas        ON mesas(id_mesa)          WHERE deleted_at IS NULL;
CREATE INDEX idx_usuarios_activos     ON usuarios(id_usuario)    WHERE deleted_at IS NULL;

-- ============================================================
-- BLOQUE 8: TRIGGER AUTOMÁTICO
-- Cuando un cliente se registra via Supabase Auth,
-- automáticamente se crea su registro en la tabla "clientes"
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  -- Verificar si el email ya existe en la tabla de usuarios (staff interno pre-creado)
  IF EXISTS (SELECT 1 FROM public.usuarios WHERE email = NEW.email) THEN
    UPDATE public.usuarios
    SET auth_id = NEW.id,
        nombre = COALESCE(NEW.raw_user_meta_data ->> 'nombre', nombre)
    WHERE email = NEW.email;
  ELSE
    -- Si no existe, es un cliente normal
    INSERT INTO public.clientes (auth_id, nombre, email, telefono)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data ->> 'nombre', 'Sin nombre'),
      NEW.email,
      NEW.raw_user_meta_data ->> 'telefono'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- BLOQUE 9: RLS (Row Level Security)
-- Protege las tablas para que solo usuarios autenticados accedan
-- ============================================================

-- Función auxiliar para verificar si el usuario logueado es empleado activo
CREATE OR REPLACE FUNCTION public.es_empleado()
RETURNS boolean 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.usuarios 
    WHERE auth_id = auth.uid() AND activo = true
  );
END;
$$;

ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE sucursales ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS PARA CLIENTES
-- Los clientes solo pueden ver/editar su propio perfil
CREATE POLICY "Clientes ven su propio perfil"
  ON clientes FOR SELECT
  USING (auth.uid() = auth_id);

CREATE POLICY "Clientes editan su propio perfil"
  ON clientes FOR UPDATE
  USING (auth.uid() = auth_id);

-- Los empleados pueden ver, insertar y editar todos los clientes
CREATE POLICY "Empleados ven todos los clientes"
  ON clientes FOR SELECT
  USING (public.es_empleado());

CREATE POLICY "Empleados insertan clientes"
  ON clientes FOR INSERT
  WITH CHECK (public.es_empleado());

CREATE POLICY "Empleados editan todos los clientes"
  ON clientes FOR UPDATE
  USING (public.es_empleado())
  WITH CHECK (public.es_empleado());

-- POLÍTICAS PARA PRODUCTOS
-- Productos visibles para todos (catálogo público)
CREATE POLICY "Productos visibles para todos"
  ON productos FOR SELECT
  USING (true);

CREATE POLICY "Empleados gestionan productos"
  ON productos FOR ALL
  USING (public.es_empleado())
  WITH CHECK (public.es_empleado());

-- POLÍTICAS PARA CATEGORÍAS
-- Categorías visibles para todos (catálogo público)
CREATE POLICY "Categorias visibles para todos"
  ON categorias FOR SELECT
  USING (true);

CREATE POLICY "Empleados gestionan categorias"
  ON categorias FOR ALL
  USING (public.es_empleado())
  WITH CHECK (public.es_empleado());

-- POLÍTICAS PARA SUCURSALES
-- Sucursales visibles para todos (catálogo público)
CREATE POLICY "Sucursales visibles para todos"
  ON sucursales FOR SELECT
  USING (true);

CREATE POLICY "Empleados gestionan sucursales"
  ON sucursales FOR ALL
  USING (public.es_empleado())
  WITH CHECK (public.es_empleado());
