-- Script para registrar refugios y necesidades para el desastre de Chabasquén (Municipio Unda)
-- Para ejecutar en producción:
-- docker exec -i db psql -U sos -d sos_logistica < apps/api/src/infrastructure/persistence/exports/import_chabasquen_needs.sql

BEGIN;

-- 1. Asegurar que los productos existan en el catálogo maestro
WITH seed_products (name, category, unit, description) AS (
  VALUES
    ('Colchonetas', 'Abrigo y refugio'::inventory_category, 'unidades', 'Colchonetas de espuma para pernocta básica.'),
    ('Sábanas', 'Abrigo y refugio'::inventory_category, 'unidades', 'Sábanas individuales y juegos de cama.'),
    ('Cobijas', 'Abrigo y refugio'::inventory_category, 'unidades', 'Cobijas y mantas térmicas.'),
    ('Alimentos no perecederos', 'Víveres'::inventory_category, 'unidades', 'Víveres y alimentos no perecederos variados.'),
    ('Agua potable', 'Víveres'::inventory_category, 'litros', 'Agua potable embotellada para consumo humano.')
),
upserted_products AS (
  INSERT INTO products (name, category, unit, description)
  SELECT name, category, unit, description
  FROM seed_products
  ON CONFLICT (name) DO UPDATE SET
    category = EXCLUDED.category,
    unit = EXCLUDED.unit,
    description = EXCLUDED.description
  RETURNING id, name
),
available_products AS (
  SELECT id, name FROM upserted_products
  UNION
  SELECT p.id, p.name
  FROM products p
  INNER JOIN seed_products sp ON sp.name = p.name
),

-- 2. Registrar/actualizar los dos refugios (hubs de tipo SHELTER) en Chabasquén
upserted_hubs AS (
  INSERT INTO hubs (id, name, address, contact, type, status, latitude, longitude, is_informal)
  VALUES
    (
      '44444444-4444-4444-4444-444444444444', 
      'Iglesia Nstra Sra. de los Dolores', 
      'Frente a la Plaza Bolívar, Chabasquén, Municipio Unda, Portuguesa', 
      'No registrado', 
      'SHELTER'::hub_type, 
      'ACTIVO'::hub_status, 
      9.4312, 
      -69.9520, 
      false
    ),
    (
      '44444444-4444-4444-4444-444444444445', 
      'Gimnasio Cubierto de Chabasquén', 
      'Av. Principal Chabasquén, Municipio Unda, Portuguesa', 
      'No registrado', 
      'SHELTER'::hub_type, 
      'ACTIVO'::hub_status, 
      9.4320, 
      -69.9515, 
      false
    )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    address = EXCLUDED.address,
    type = EXCLUDED.type,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude
  RETURNING id
),

-- 3. Definir la matriz de necesidades por refugio (ID fijo, ID del refugio, Nombre del producto, Meta, Prioridad, Descripción)
seed_needs (id, hub_id, product_name, meta, prioridad, descripcion) AS (
  VALUES
    -- Iglesia Nstra Sra. de los Dolores
    ('baba0000-0000-0000-0000-000000000001'::uuid, '44444444-4444-4444-4444-444444444444'::uuid, 'Colchonetas', 80, 'CRITICA', 'Colchonetas para personas refugiadas en la Iglesia.'),
    ('baba0000-0000-0000-0000-000000000002'::uuid, '44444444-4444-4444-4444-444444444444'::uuid, 'Sábanas', 120, 'ALTA', 'Juegos de sábanas limpios.'),
    ('baba0000-0000-0000-0000-000000000003'::uuid, '44444444-4444-4444-4444-444444444444'::uuid, 'Cobijas', 120, 'ALTA', 'Mantas y cobijas de abrigo.'),
    ('baba0000-0000-0000-0000-000000000004'::uuid, '44444444-4444-4444-4444-444444444444'::uuid, 'Alimentos no perecederos', 400, 'CRITICA', 'Alimentos no perecederos para cocina comunitaria.'),
    ('baba0000-0000-0000-0000-000000000005'::uuid, '44444444-4444-4444-4444-444444444444'::uuid, 'Agua potable', 800, 'CRITICA', 'Agua potable embotellada.'),

    -- Gimnasio Cubierto de Chabasquén
    ('baba0000-0000-0000-0000-000000000006'::uuid, '44444444-4444-4444-4444-444444444445'::uuid, 'Colchonetas', 150, 'CRITICA', 'Colchonetas de pernocta para el Gimnasio Cubierto.'),
    ('baba0000-0000-0000-0000-000000000007'::uuid, '44444444-4444-4444-4444-444444444445'::uuid, 'Sábanas', 200, 'ALTA', 'Sábanas individuales.'),
    ('baba0000-0000-0000-0000-000000000008'::uuid, '44444444-4444-4444-4444-444444444445'::uuid, 'Cobijas', 200, 'ALTA', 'Cobijas y mantas.'),
    ('baba0000-0000-0000-0000-000000000009'::uuid, '44444444-4444-4444-4444-444444444445'::uuid, 'Alimentos no perecederos', 600, 'CRITICA', 'Víveres no perecederos para raciones del gimnasio.'),
    ('baba0000-0000-0000-0000-000000000010'::uuid, '44444444-4444-4444-4444-444444444445'::uuid, 'Agua potable', 1500, 'CRITICA', 'Agua para hidratación de las familias.')
)

-- 4. Registrar/actualizar las necesidades
INSERT INTO needs (
  id,
  hub_id,
  product_id,
  meta,
  recibido,
  prioridad,
  descripcion,
  status,
  fecha_necesidad,
  created_at,
  updated_at
)
SELECT
  sn.id,
  sn.hub_id,
  ap.id,
  sn.meta,
  0,
  sn.prioridad,
  sn.descripcion,
  'PUBLISHED'::need_status,
  now(),
  now(),
  now()
FROM seed_needs sn
INNER JOIN available_products ap ON ap.name = sn.product_name
ON CONFLICT (id) DO UPDATE SET
  hub_id = EXCLUDED.hub_id,
  product_id = EXCLUDED.product_id,
  meta = EXCLUDED.meta,
  prioridad = EXCLUDED.prioridad,
  descripcion = EXCLUDED.descripcion,
  updated_at = now();

COMMIT;
