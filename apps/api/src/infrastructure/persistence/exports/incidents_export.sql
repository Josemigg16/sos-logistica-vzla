-- Export de la tabla `incidents` (esquema + datos)
-- Generado desde postgresql://***@localhost:5432/sos_logistica
-- Filas exportadas: 2

BEGIN;

-- Datos
INSERT INTO "incidents" ("id", "title", "description", "type", "priority", "status", "zone", "latitude", "longitude", "reported_by_id", "created_at", "updated_at") VALUES ('00000000-0000-0000-0000-000000000001', 'Terremoto Central - La Guaira & Caracas', 'Respuesta logística y coordinación de ayuda humanitaria ciudadana para mitigar los daños y abastecer a los refugios.', 'Terremoto', 'CRITICAL', 'ACTIVE', 'La Guaira / Caracas', 10.6012, -66.9312, NULL, '2026-06-28T23:09:19.087Z', '2026-06-28T23:09:19.087Z');
INSERT INTO "incidents" ("id", "title", "description", "type", "priority", "status", "zone", "latitude", "longitude", "reported_by_id", "created_at", "updated_at") VALUES ('00000000-0000-0000-0000-000000000002', 'Lluvias y Desbordamientos - Municipio Unda (Chabasquén)', 'Inundaciones y afectaciones por lluvias torrenciales en el Municipio Unda, afectando vialidad y viviendas.', 'Lluvias', 'HIGH', 'ACTIVE', 'Municipio Unda, Chabasquén', 9.4312, -69.952, NULL, '2026-06-28T23:09:19.090Z', '2026-06-28T23:09:19.090Z');

COMMIT;
