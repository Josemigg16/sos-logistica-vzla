# Mapa Público — Centros de Acopio Humanitario

## Qué estamos construyendo

Mapa público interactivo que muestra centros de acopio humanitario con su información y el inventario de donaciones recibidas.

---

## Decisiones tomadas

### Flujo de datos
- Toda la comunicación es por API
- Un panel admin externo hace POST con la data
- El mapa es solo lectura pública
- Se incluye data de ejemplo en JSON, fácilmente intercambiable

### Categorías de inventario
- Víveres
- Herramientas
- Higiene personal
- Medicamentos
- Productos de limpieza
- Abrigo y refugio
- Artículos para bebés y grupos vulnerables

### Features del mapa
- Markers por centro de acopio
- Click/touch en marker → info del centro (nombre, dirección, contactos)
- Vista del inventario por categoría al abrir un centro

### Stack
- Frontend: React 19 + Vite + mapcn (MapLibre GL) + Tailwind + shadcn/ui
- Backend: Hono + Bun
- Shared: Zod

---

### Persistencia de datos
Robusto — Drizzle + DB (según arquitectura del proyecto)
