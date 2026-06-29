-- Seed de prueba: 20 necesidades publicadas para validar UI/scroll del panel.
-- Re-ejecutable: usa IDs fijos + ON CONFLICT para actualizar sin duplicar.
-- Asigna todas las necesidades al primer hub ACTIVO disponible; si no hay hubs,
-- las crea con hub_id NULL para que igualmente aparezcan como "Centro Desconocido".

BEGIN;

WITH seed_products (name, category, unit, description) AS (
  VALUES
    ('Agua embotellada', 'Víveres'::inventory_category, 'litros', 'Agua purificada apta para el consumo humano.'),
    ('Arroz blanco', 'Víveres'::inventory_category, 'kg', 'Alimento base para raciones diarias.'),
    ('Harina de maíz precocida', 'Víveres'::inventory_category, 'kg', 'Harina precocida para la elaboración de arepas.'),
    ('Enlatados varios (atún/sardina)', 'Víveres'::inventory_category, 'unidades', 'Proteína enlatada lista para consumir.'),
    ('Leche en polvo', 'Víveres'::inventory_category, 'kg', 'Leche completa deshidratada.'),
    ('Acetaminofén 500mg', 'Medicamentos'::inventory_category, 'tabletas', 'Analgésico y antipirético esencial.'),
    ('Suero fisiológico oral', 'Medicamentos'::inventory_category, 'sobres', 'Sales de rehidratación oral para deshidratación.'),
    ('Gasas médicas estériles', 'Medicamentos'::inventory_category, 'paquetes', 'Material de curación estéril.'),
    ('Jabón de baño', 'Higiene personal'::inventory_category, 'unidades', 'Jabón corporal para aseo personal.'),
    ('Papel higiénico', 'Higiene personal'::inventory_category, 'rollos', 'Rollos de papel higiénico familiar.'),
    ('Toallas sanitarias', 'Higiene personal'::inventory_category, 'paquetes', 'Artículos de higiene femenina.'),
    ('Frazadas térmicas', 'Abrigo y refugio'::inventory_category, 'unidades', 'Mantas de alta retención térmica.'),
    ('Colchonetas', 'Abrigo y refugio'::inventory_category, 'unidades', 'Colchonetas de espuma para pernocta básica.'),
    ('Carpa de campaña (4 personas)', 'Abrigo y refugio'::inventory_category, 'unidades', 'Refugio temporal impermeable.'),
    ('Linternas recargables', 'Herramientas'::inventory_category, 'unidades', 'Linternas LED con carga solar o USB.'),
    ('Pilas AA / AAA', 'Herramientas'::inventory_category, 'unidades', 'Pilas alcalinas de repuesto.'),
    ('Palas metálicas', 'Herramientas'::inventory_category, 'unidades', 'Herramienta de excavación.'),
    ('Cloro concentrado', 'Productos de limpieza'::inventory_category, 'litros', 'Desinfectante clorado para higienización.'),
    ('Bolsas de basura resistentes', 'Productos de limpieza'::inventory_category, 'paquetes', 'Bolsas plásticas de alta capacidad.'),
    ('Pañales para bebés (M / G)', 'Artículos para bebés y grupos vulnerables'::inventory_category, 'unidades', 'Pañales desechables infantiles.')
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
target_hub AS (
  SELECT id
  FROM hubs
  WHERE status = 'ACTIVO'
  ORDER BY is_informal ASC, created_at ASC
  LIMIT 1
),
seed_needs (id, product_name, meta, recibido, prioridad, descripcion, days_from_now) AS (
  VALUES
    ('10000000-0000-0000-0000-000000000001'::uuid, 'Agua embotellada', 2000, 120, 'CRITICA', 'Prioridad máxima para familias afectadas por lluvias.', 0),
    ('10000000-0000-0000-0000-000000000002'::uuid, 'Arroz blanco', 600, 80, 'ALTA', 'Raciones secas para centros de distribución.', 1),
    ('10000000-0000-0000-0000-000000000003'::uuid, 'Harina de maíz precocida', 800, 150, 'ALTA', 'Alimento base de alta rotación.', 1),
    ('10000000-0000-0000-0000-000000000004'::uuid, 'Enlatados varios (atún/sardina)', 500, 40, 'CRITICA', 'Proteína lista para consumir.', 0),
    ('10000000-0000-0000-0000-000000000005'::uuid, 'Leche en polvo', 300, 20, 'CRITICA', 'Apoyo nutricional para niños y adultos mayores.', 0),
    ('10000000-0000-0000-0000-000000000006'::uuid, 'Acetaminofén 500mg', 1000, 90, 'ALTA', 'Medicamento básico para atención primaria.', 2),
    ('10000000-0000-0000-0000-000000000007'::uuid, 'Suero fisiológico oral', 700, 60, 'CRITICA', 'Rehidratación para personas vulnerables.', 0),
    ('10000000-0000-0000-0000-000000000008'::uuid, 'Gasas médicas estériles', 450, 30, 'ALTA', 'Material de curación para brigadas médicas.', 2),
    ('10000000-0000-0000-0000-000000000009'::uuid, 'Jabón de baño', 900, 120, 'MEDIA', 'Higiene personal en refugios temporales.', 3),
    ('10000000-0000-0000-0000-000000000010'::uuid, 'Papel higiénico', 1200, 160, 'MEDIA', 'Consumo básico para centros activos.', 3),
    ('10000000-0000-0000-0000-000000000011'::uuid, 'Toallas sanitarias', 800, 75, 'ALTA', 'Higiene menstrual para mujeres afectadas.', 1),
    ('10000000-0000-0000-0000-000000000012'::uuid, 'Frazadas térmicas', 350, 25, 'CRITICA', 'Abrigo nocturno para damnificados.', 0),
    ('10000000-0000-0000-0000-000000000013'::uuid, 'Colchonetas', 260, 18, 'ALTA', 'Descanso básico en refugios.', 2),
    ('10000000-0000-0000-0000-000000000014'::uuid, 'Carpa de campaña (4 personas)', 80, 5, 'ALTA', 'Refugio temporal para familias desplazadas.', 2),
    ('10000000-0000-0000-0000-000000000015'::uuid, 'Linternas recargables', 500, 0, 'CRITICA', 'Zonas con fallas eléctricas requieren iluminación.', 0),
    ('10000000-0000-0000-0000-000000000016'::uuid, 'Pilas AA / AAA', 1000, 40, 'ALTA', 'Repuesto para radios y linternas.', 1),
    ('10000000-0000-0000-0000-000000000017'::uuid, 'Palas metálicas', 120, 8, 'MEDIA', 'Apoyo para remoción ligera y limpieza.', 4),
    ('10000000-0000-0000-0000-000000000018'::uuid, 'Cloro concentrado', 650, 35, 'ALTA', 'Desinfección de agua, pisos y superficies.', 1),
    ('10000000-0000-0000-0000-000000000019'::uuid, 'Bolsas de basura resistentes', 700, 60, 'MEDIA', 'Manejo de residuos en puntos de atención.', 4),
    ('10000000-0000-0000-0000-000000000020'::uuid, 'Pañales para bebés (M / G)', 1500, 90, 'CRITICA', 'Necesidad sensible para bebés y familias vulnerables.', 0)
)
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
  (SELECT id FROM target_hub),
  ap.id,
  sn.meta,
  sn.recibido,
  sn.prioridad,
  sn.descripcion,
  'PUBLISHED'::need_status,
  now() + (sn.days_from_now * INTERVAL '1 day'),
  now(),
  now()
FROM seed_needs sn
INNER JOIN available_products ap ON ap.name = sn.product_name
ON CONFLICT (id) DO UPDATE SET
  hub_id = EXCLUDED.hub_id,
  product_id = EXCLUDED.product_id,
  meta = EXCLUDED.meta,
  recibido = EXCLUDED.recibido,
  prioridad = EXCLUDED.prioridad,
  descripcion = EXCLUDED.descripcion,
  status = EXCLUDED.status,
  fecha_necesidad = EXCLUDED.fecha_necesidad,
  updated_at = now();

COMMIT;
