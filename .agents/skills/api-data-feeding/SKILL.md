---
name: api-data-feeding
description: Instructions and reference for feeding center and transport data into the backend API for the SOS Logística system. Triggers when developers ask about API endpoints, data synchronization, feeding data, or webhook/POST integrations.
---

# Alimentar Datos al Backend - SOS Logística

Esta skill contiene la documentación, especificaciones y ejemplos para alimentar de datos el backend de **SOS Logística** a través de la API.

## Endpoints Disponibles

La API corre por defecto en `http://localhost:3000`.

### 1. Obtener Centros (`GET /api/centros`)
Retorna el listado completo de todos los centros de acopio, salidas y destinos registrados.

- **URL:** `http://localhost:3000/api/centros`
- **Método:** `GET`
- **Respuesta Exitosa (200 OK):**
  ```json
  [
    {
      "id": "1",
      "nombre": "Centro de Acopio Central - Caracas",
      "direccion": "Av. Francisco de Miranda, Altamira, Caracas",
      "contacto": "+58 212 555 0199",
      "responsable": "Dra. Sofía Mendoza",
      "coordenadas": [-66.8482, 10.4961],
      "tipo": "acopio",
      "inventario": {
        "Víveres": 85,
        "Medicamentos": 100
      }
    }
  ]
  ```

### 2. Crear o Actualizar un Centro (`POST /api/centros`)
Crea un nuevo centro o actualiza uno existente si coincide el `id`.

- **URL:** `http://localhost:3000/api/centros`
- **Método:** `POST`
- **Headers:** `Content-Type: application/json`
- **Cuerpo (JSON):**
  Debe cumplir con el esquema Zod `centroSchema` del paquete `@sos/shared`.
  ```json
  {
    "id": "5",
    "nombre": "Centro de Acopio Redoma de Araure",
    "direccion": "Redoma de Araure, Araure, Portuguesa",
    "contacto": "+58 255 555 0123",
    "responsable": "Lic. Marcos Dávila",
    "coordenadas": [-69.22162, 9.58324],
    "tipo": "acopio",
    "inventario": {
      "Víveres": 70,
      "Herramientas": 50,
      "Higiene personal": 65,
      "Medicamentos": 45,
      "Productos de limpieza": 80,
      "Abrigo y refugio": 35,
      "Artículos para bebés y grupos vulnerables": 90
    },
    "metadata": {
      "observaciones": "Ubicado al lado de la estación de servicio",
      "capacidad_m3": 150
    }
  }
  ```

- **Respuesta Exitosa (200 OK):**
  ```json
  {
    "success": true,
    "centro": { ... }
  }
  ```

- **Respuesta de Error (400 Bad Request):**
  Si los datos no coinciden con el esquema (por ejemplo, tipo incorrecto o formato de coordenadas inválido):
  ```json
  {
    "error": "Datos inválidos",
    "details": { ... }
  }
  ```

---

## Cómo Alimentar Datos (Ejemplos)

### Script con Bun / Fetch (JavaScript/TypeScript)
```typescript
import { Centro } from "@sos/shared";

const nuevoCentro: Centro = {
  id: "6",
  nombre: "Puerto Cabello - Salida de Carga",
  direccion: "Muelle 5, Puerto Cabello, Carabobo",
  contacto: "+58 242 555 9876",
  responsable: "Cap. Ramón Silva",
  coordenadas: [-68.0125, 10.4842],
  tipo: "salida",
  inventario: {
    "Víveres": 100,
    "Herramientas": 90
  },
  metadata: {
    "operador": "Bolipuertos"
  }
};

const response = await fetch("http://localhost:3000/api/centros", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(nuevoCentro),
});

const result = await response.json();
console.log(result);
```

### Comando cURL (Línea de comando)
```bash
curl -X POST http://localhost:3000/api/centros \
  -H "Content-Type: application/json" \
  -d '{
    "id": "7",
    "nombre": "Acopio Destino San Cristóbal",
    "direccion": "Av. 19 de Abril, San Cristóbal, Táchira",
    "contacto": "+58 276 555 4321",
    "responsable": "Dra. Carmen Useche",
    "coordenadas": [-72.2250, 7.7667],
    "tipo": "destino",
    "inventario": {
      "Medicamentos": 85,
      "Víveres": 40
    }
  }'
```
