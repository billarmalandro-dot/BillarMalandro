-- =========================================================================================
-- SCRIPT DE INSERCIÓN DE DATOS - CATEGORÍAS Y PRODUCTOS
-- Ejecuta este script en el SQL Editor de Supabase para poblar tu catálogo.
-- =========================================================================================

-- 1. INSERTAR CATEGORÍAS
INSERT INTO public.categorias (nombre, descripcion) VALUES
  ('Cervezas', 'Cervezas nacionales e importadas'),
  ('Refrescos y Jugos', 'Gaseosas, aguas y jugos'),
  ('Snacks', 'Papas fritas, maní, pipocas'),
  ('Licores y Tragos', 'Ron, fernet, singani y combinados'),
  ('Alquiler de Mesas', 'Servicios de tiempo en mesas de billar'),
  ('Cigarros', 'Cigarros y tabaco'),
  ('Tragos', 'Tragos y bebidas preparadas')
ON CONFLICT (nombre) DO UPDATE 
SET descripcion = EXCLUDED.descripcion;

-- 2. INSERTAR PRODUCTOS
INSERT INTO public.productos (nombre, id_categoria, precio_venta, precio_costo, activo, codigo, descripcion)
VALUES
  -- Cervezas
  ('Burguesa', (SELECT id_categoria FROM public.categorias WHERE nombre = 'Cervezas'), 25.00, 0.00, true, 'BUR-001', 'Cerveza Burguesa'),
  ('Corona 355ml', (SELECT id_categoria FROM public.categorias WHERE nombre = 'Cervezas'), 30.00, 0.00, true, 'COR-355', 'Cerveza Corona 355ml'),
  ('Conti', (SELECT id_categoria FROM public.categorias WHERE nombre = 'Cervezas'), 20.00, 0.00, true, 'CON-001', 'Cerveza Continental'),
  ('combo conti', (SELECT id_categoria FROM public.categorias WHERE nombre = 'Cervezas'), 55.00, 0.00, true, 'CMB-CON', 'Combo de Cerveza Continental'),
  ('Combo Paceña', (SELECT id_categoria FROM public.categorias WHERE nombre = 'Cervezas'), 100.00, 0.00, true, 'CMB-PAC', 'Combo de Cerveza Paceña'),
  ('Huari', (SELECT id_categoria FROM public.categorias WHERE nombre = 'Cervezas'), 30.00, 0.00, true, 'HUA-001', 'Cerveza Huari'),
  ('Paceña 710ml', (SELECT id_categoria FROM public.categorias WHERE nombre = 'Cervezas'), 25.00, 0.00, true, 'PAC-710', 'Cerveza Paceña 710ml'),
  ('Paceña Botellín', (SELECT id_categoria FROM public.categorias WHERE nombre = 'Cervezas'), 10.00, 0.00, true, 'PAC-BOT', 'Cerveza Paceña Botellín'),

  -- Refrescos y Jugos
  ('Coca Cola 2L', (SELECT id_categoria FROM public.categorias WHERE nombre = 'Refrescos y Jugos'), 20.00, 0.00, true, 'COC-2L', 'Gaseosa Coca Cola 2 Litros'),
  ('Coca Cola Popular', (SELECT id_categoria FROM public.categorias WHERE nombre = 'Refrescos y Jugos'), 10.00, 0.00, true, 'COC-POP', 'Gaseosa Coca Cola Popular'),
  ('coca cola 3 lt', (SELECT id_categoria FROM public.categorias WHERE nombre = 'Refrescos y Jugos'), 30.00, 0.00, true, 'COC-3L', 'Gaseosa Coca Cola 3 Litros'),
  ('agua de 2 lt', (SELECT id_categoria FROM public.categorias WHERE nombre = 'Refrescos y Jugos'), 15.00, 0.00, true, 'AGU-2L', 'Agua de 2 Litros'),
  ('Ciclon', (SELECT id_categoria FROM public.categorias WHERE nombre = 'Refrescos y Jugos'), 10.00, 0.00, true, 'CIC-001', 'Bebida Energizante Ciclón'),
  ('Power azul', (SELECT id_categoria FROM public.categorias WHERE nombre = 'Refrescos y Jugos'), 12.00, 0.00, true, 'POW-AZU', 'Powerade Azul'),
  ('Coca Cola, sprite, fanta Popular', (SELECT id_categoria FROM public.categorias WHERE nombre = 'Refrescos y Jugos'), 10.00, 0.00, true, 'GAS-POP', 'Gaseosas Populares (Coca Cola, Sprite, Fanta)'),
  ('Red Bull Pequeño', (SELECT id_categoria FROM public.categorias WHERE nombre = 'Refrescos y Jugos'), 30.00, 0.00, true, 'REB-PEQ', 'Bebida Energizante Red Bull Pequeño'),
  ('Power Rojo', (SELECT id_categoria FROM public.categorias WHERE nombre = 'Refrescos y Jugos'), 12.00, 0.00, true, 'POW-ROJ', 'Powerade Rojo'),
  ('Monster', (SELECT id_categoria FROM public.categorias WHERE nombre = 'Refrescos y Jugos'), 30.00, 0.00, true, 'MON-001', 'Bebida Energizante Monster'),
  ('Agua personal', (SELECT id_categoria FROM public.categorias WHERE nombre = 'Refrescos y Jugos'), 8.00, 0.00, true, 'AGU-PER', 'Agua Mineral Personal'),
  ('Agua con gas', (SELECT id_categoria FROM public.categorias WHERE nombre = 'Refrescos y Jugos'), 10.00, 0.00, true, 'AGU-GAS', 'Agua con Gas'),
  ('Sprite Personal', (SELECT id_categoria FROM public.categorias WHERE nombre = 'Refrescos y Jugos'), 10.00, 0.00, true, 'SPR-PER', 'Gaseosa Sprite Personal'),

  -- Snacks
  ('Papas sabor churrasco', (SELECT id_categoria FROM public.categorias WHERE nombre = 'Snacks'), 5.00, 0.00, true, 'PAP-CHU', 'Papas Fritas sabor Churrasco'),
  ('papas picantes', (SELECT id_categoria FROM public.categorias WHERE nombre = 'Snacks'), 5.00, 0.00, true, 'PAP-PIC', 'Papas Fritas Picantes'),
  ('Push', (SELECT id_categoria FROM public.categorias WHERE nombre = 'Snacks'), 1.00, 0.00, true, 'PSH-001', 'Caramelo Push'),
  ('Nikolo', (SELECT id_categoria FROM public.categorias WHERE nombre = 'Snacks'), 5.00, 0.00, true, 'NIK-001', 'Chocolate Nikolo'),
  ('coca cuartilla', (SELECT id_categoria FROM public.categorias WHERE nombre = 'Snacks'), 50.00, 0.00, true, 'COC-CUA', 'Hojas de Coca Cuartilla'),
  ('coca 1,2 cuartilla', (SELECT id_categoria FROM public.categorias WHERE nombre = 'Snacks'), 30.00, 0.00, true, 'COC-12C', 'Hojas de Coca Media Cuartilla'),
  ('Grosso', (SELECT id_categoria FROM public.categorias WHERE nombre = 'Snacks'), 1.00, 0.00, true, 'GRO-001', 'Chicle Grosso'),
  ('Baton', (SELECT id_categoria FROM public.categorias WHERE nombre = 'Snacks'), 5.00, 0.00, true, 'BAT-001', 'Chocolate Baton'),
  ('Clorets', (SELECT id_categoria FROM public.categorias WHERE nombre = 'Snacks'), 1.00, 0.00, true, 'CLO-001', 'Chicles Clorets'),
  ('Beldent negro o verde', (SELECT id_categoria FROM public.categorias WHERE nombre = 'Snacks'), 10.00, 0.00, true, 'BEL-NV', 'Chicle Beldent Negro o Verde'),
  ('Nachos verdes', (SELECT id_categoria FROM public.categorias WHERE nombre = 'Snacks'), 5.00, 0.00, true, 'NAC-VER', 'Nachos bolsa verde'),
  ('Chupete', (SELECT id_categoria FROM public.categorias WHERE nombre = 'Snacks'), 2.00, 0.00, true, 'CHU-001', 'Chupete dulce'),
  ('bom bon', (SELECT id_categoria FROM public.categorias WHERE nombre = 'Snacks'), 5.00, 0.00, true, 'BON-BON', 'Chocolate Bon o Bon'),

  -- Licores y Tragos
  ('combo flor de caña 1lt', (SELECT id_categoria FROM public.categorias WHERE nombre = 'Licores y Tragos'), 180.00, 0.00, true, 'CMB-FDC', 'Combo de Ron Flor de Caña 1 Litro'),
  ('combo fernet', (SELECT id_categoria FROM public.categorias WHERE nombre = 'Licores y Tragos'), 200.00, 0.00, true, 'CMB-FER', 'Combo de Fernet Branca'),
  ('four loko', (SELECT id_categoria FROM public.categorias WHERE nombre = 'Licores y Tragos'), 50.00, 0.00, true, 'FOU-LOK', 'Bebida Four Loko'),
  ('Combo Singani Casa Real', (SELECT id_categoria FROM public.categorias WHERE nombre = 'Licores y Tragos'), 150.00, 0.00, true, 'CMB-SCR', 'Combo de Singani Casa Real'),
  ('Ice 51', (SELECT id_categoria FROM public.categorias WHERE nombre = 'Licores y Tragos'), 25.00, 0.00, true, 'ICE-51', 'Bebida 51 Ice'),

  -- Tragos
  ('vaso roto', (SELECT id_categoria FROM public.categorias WHERE nombre = 'Tragos'), 10.00, 0.00, true, 'VAS-ROT', 'Shot Vaso Roto'),
  ('Vaso de flor de caña y fernet', (SELECT id_categoria FROM public.categorias WHERE nombre = 'Tragos'), 30.00, 0.00, true, 'VAS-FDF', 'Vaso servido de Flor de Caña o Fernet'),

  -- Cigarros
  ('Encendedor', (SELECT id_categoria FROM public.categorias WHERE nombre = 'Cigarros'), 5.00, 0.00, true, 'ENC-001', 'Encendedor para cigarros'),
  ('Cigarro Unidad', (SELECT id_categoria FROM public.categorias WHERE nombre = 'Cigarros'), 2.00, 0.00, true, 'CIG-UNI', 'Cigarro suelto por unidad'),
  ('camel active chico (caja)', (SELECT id_categoria FROM public.categorias WHERE nombre = 'Cigarros'), 15.00, 0.00, true, 'CAM-ACT', 'Caja de cigarros Camel Active chico'),
  ('Black', (SELECT id_categoria FROM public.categorias WHERE nombre = 'Cigarros'), 10.00, 0.00, true, 'BLK-001', 'Cigarros Black'),
  ('Cigarro doble active sandia', (SELECT id_categoria FROM public.categorias WHERE nombre = 'Cigarros'), 30.00, 0.00, true, 'CIG-DAS', 'Cigarros doble active sandía'),

  -- Alquiler de Mesas
  ('Hora de Billar (Normal)', (SELECT id_categoria FROM public.categorias WHERE nombre = 'Alquiler de Mesas'), 30.00, 0.00, true, 'HOR-BIL', 'Servicio de alquiler por hora de billar')
ON CONFLICT (codigo) DO UPDATE 
SET 
  nombre = EXCLUDED.nombre,
  precio_venta = EXCLUDED.precio_venta,
  precio_costo = EXCLUDED.precio_costo,
  id_categoria = EXCLUDED.id_categoria,
  descripcion = EXCLUDED.descripcion;
