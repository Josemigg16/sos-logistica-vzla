-- Script para limpiar necesidades actuales y sembrar las prioridades del comunicado oficial (ZODI Portuguesa / La Guaira)
-- Para ejecutar en producción:
-- docker exec -i db psql -U sos -d sos_logistica < apps/api/src/infrastructure/persistence/exports/import_flyer_needs.sql

BEGIN;

-- 1. Limpiamos las necesidades anteriores (reemplazo total según el requerimiento)
DELETE FROM needs;

-- 2. Aseguramos que los productos existan en el catálogo maestro (products)
WITH seed_products (name, category, unit, description) AS (
  VALUES
    ('Porras grandes', 'Herramientas'::inventory_category, 'unidades', 'Porras grandes para remoción de escombros.'),
    ('Barras de fuerza', 'Herramientas'::inventory_category, 'unidades', 'Barras metálicas para hacer palanca en rescate.'),
    ('Guantes de protección y movilidad', 'Herramientas'::inventory_category, 'pares', 'Guantes de protección que permitan movilidad.'),
    ('Plástico negro por rollo', 'Abrigo y refugio'::inventory_category, 'rollos', 'Plástico negro por rollo para refugios improvisados.'),
    ('Mascarilla de protección respiratoria 3M', 'Herramientas'::inventory_category, 'unidades', 'Mascarilla de protección respiratoria 3M de alta eficiencia.'),
    ('Esmeriles a batería o motor', 'Herramientas'::inventory_category, 'unidades', 'Esmeriles a batería o motor para corte de metal y escombros.'),
    ('Agua potable', 'Víveres'::inventory_category, 'litros', 'Agua potable embotellada para consumo humano.'),
    ('Tapabocas', 'Higiene personal'::inventory_category, 'unidades', 'Tapabocas descartables/protectores básicos.'),
    ('Cizalla', 'Herramientas'::inventory_category, 'unidades', 'Cizalla para corte de alambres y metales.'),
    ('Lentes de seguridad', 'Herramientas'::inventory_category, 'unidades', 'Lentes de seguridad transparentes para protección ocular.'),
    ('Segueta', 'Herramientas'::inventory_category, 'unidades', 'Segueta manual para corte de metales.')
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
-- 3. Identificamos el hub objetivo de La Guaira o Portuguesa. Si no existe ninguno, tomamos el primero activo.
target_hub AS (
  SELECT id FROM hubs WHERE name ILIKE '%La Guaira%' AND status = 'ACTIVO'
  UNION ALL
  SELECT id FROM hubs WHERE name ILIKE '%Portuguesa%' AND status = 'ACTIVO'
  UNION ALL
  SELECT id FROM hubs WHERE status = 'ACTIVO'
  LIMIT 1
),
-- 4. Definimos las necesidades a crear basadas en el folleto con prioridad CRITICA / ALTA
seed_needs (product_name, meta, recibido, prioridad, descripcion) AS (
  VALUES
    ('Porras grandes', 100, 0, 'ALTA', 'Requerido para la Unidad de Tarea Especial en remoción.'),
    ('Barras de fuerza', 150, 0, 'ALTA', 'Requerido para la Unidad de Tarea Especial para palanca.'),
    ('Guantes de protección y movilidad', 500, 0, 'ALTA', 'Guantes que permitan movilidad para el personal en zona.'),
    ('Plástico negro por rollo', 200, 0, 'CRITICA', 'Plástico negro por rollo para refugios improvisados en La Guaira.'),
    ('Mascarilla de protección respiratoria 3M', 300, 0, 'CRITICA', 'Mascarillas 3M para protección de vías respiratorias.'),
    ('Esmeriles a batería o motor', 50, 0, 'ALTA', 'Esmeriles para corte rápido en estructuras colapsadas.'),
    ('Agua potable', 5000, 0, 'CRITICA', 'Agua potable indispensable para hidratación general.'),
    ('Tapabocas', 2000, 0, 'ALTA', 'Tapabocas descartables para protección en zona de desastre.'),
    ('Cizalla', 80, 0, 'ALTA', 'Cizallas de mano y de fuerza para corte de cabillas/cercas.'),
    ('Lentes de seguridad', 600, 0, 'ALTA', 'Lentes protectores para personal de rescate y voluntarios.'),
    ('Segueta', 150, 0, 'ALTA', 'Seguetas manuales para corte.')
)
-- 5. Insertamos las necesidades asociadas al hub objetivo
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
  gen_random_uuid(),
  (SELECT id FROM target_hub),
  ap.id,
  sn.meta,
  sn.recibido,
  sn.prioridad,
  sn.descripcion,
  'PUBLISHED'::need_status,
  now(),
  now(),
  now()
FROM seed_needs sn
INNER JOIN available_products ap ON ap.name = sn.product_name;

COMMIT;
