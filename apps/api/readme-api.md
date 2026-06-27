# SOS Logística API — Documentación

Este documento detalla la estructura, arquitectura, endpoints y procedimientos para operar y desarrollar el backend de **SOS Logística**. 

El backend está construido con un stack de alto rendimiento y tipado seguro:
*   **Runtime**: [Bun](https://bun.sh/)
*   **Framework HTTP**: [Hono](https://hono.dev/)
*   **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
*   **Base de Datos**: PostgreSQL
*   **Validación**: Zod

---

## 🏗️ Arquitectura del Sistema

El proyecto sigue los principios de **Clean Architecture** y **Domain-Driven Design (DDD)** para mantener el desacoplamiento entre las capas de infraestructura (HTTP, base de datos) y la lógica pura del negocio (entidades, casos de uso).

### Estructura de Directorios

```
apps/api/
├── index.ts                     # Entrypoint del servidor Hono
├── drizzle.config.ts            # Configuración para Drizzle Kit
├── src/
│   ├── domain/                  # Entidades puras y reglas de negocio sin dependencias de frameworks
│   │   ├── identity/            # Dominio de autenticación, usuarios y roles
│   │   ├── resources/           # Dominio de hubs (centros) e inventario (resources)
│   │   └── operations/          # Dominio de caravanas (operations), asignaciones y viajes
│   │
│   ├── application/             # Casos de uso de la aplicación que coordinan las entidades
│   │   ├── identity/            # Iniciar sesión, registrar usuarios, refrescar tokens
│   │   ├── resources/           # Registrar centros (hubs), enlistar stock
│   │   └── operations/          # Planificar caravanas, asignar suministros a transporte
│   │
│   └── infrastructure/          # Detalles técnicos (Framework HTTP, DB Drizzle, password hashing)
│       ├── http/                # Rutas y controladores Hono de la API
│       ├── auth/                # Hashing de contraseñas con Bun.password
│       ├── persistence/         # Repositorios y esquemas Drizzle
│       │   ├── schema/          # Definición de tablas relacionales (users, sessions, hubs, operations, etc.)
│       │   ├── db.ts            # Instanciación y conector Bun SQL a PostgreSQL
│       │   └── seed-admin.ts    # Semilla para el usuario administrador e incidente activo por defecto
│       │
│       ├── identity.module.ts   # Composition root del módulo de usuarios
│       ├── resources.module.ts  # Composition root del módulo de recursos e inventario
│       └── operations.module.ts # Composition root del módulo de caravanas de transporte
```

---

## ⚡ Enfoque de Incidente Único

Para simplificar el alcance del proyecto, la gestión se restringe a **un único desastre natural (incidente) activo**. 

A nivel de base de datos, las caravanas (`operations`) requieren asociarse a un incidente activo. El script de inicialización (`seed`) crea un incidente por defecto e inmutable sobre el cual se realiza toda la logística:
*   **ID del Incidente por Defecto**: `00000000-0000-0000-0000-000000000001`
*   **Nombre del Incidente**: *"Terremoto Central - La Guaira & Caracas"*
*   **Zona**: *"La Guaira / Caracas"*
*   **Estado**: `ACTIVE`

---

## 🧭 Referencia de Endpoints

### 🔑 1. Autenticación (`/auth/*`)

Mapea la gestión de identidades y roles unificados.

#### `POST /auth/register` (Público)
Crea una nueva cuenta de usuario.
*   **Cuerpo (JSON)**:
    ```json
    {
      "username": "chofer_portuguesa",
      "password": "seguridadMaxima123",
      "role": "DRIVER",
      "email": "chofer@sos.org"
    }
    ```
*   **Respuesta (201 Created)**:
    ```json
    {
      "user": {
        "id": "e932b712-421b-4fa8-b210-ecb18cb17424",
        "username": "chofer_portuguesa",
        "role": "DRIVER",
        "email": "chofer@sos.org"
      }
    }
    ```

#### `POST /auth/login` (Público)
Inicia sesión y genera un par de tokens (JWT y Refresh Token). El refresh token se establece como una cookie `httpOnly` para evitar robos por XSS.
*   **Cuerpo (JSON)**:
    ```json
    {
      "username": "admin",
      "password": "changeme123"
    }
    ```
*   **Respuesta (200 OK)**:
    ```json
    {
      "accessToken": "eyJhbGciOi...",
      "user": {
        "id": "a123b456-7890-abcd-ef01-234567890abc",
        "username": "admin",
        "role": "ADMIN"
      }
    }
    ```

#### `POST /auth/refresh` (Público — Usa Cookies)
Renueva el token de acceso JWT leyendo la cookie `refreshToken` firmada.
*   **Respuesta (200 OK)**:
    ```json
    {
      "accessToken": "eyJhbGciOi..."
    }
    ```

#### `POST /auth/logout` (Público — Usa Cookies)
Revoca la sesión de la base de datos y elimina las cookies del navegador.

---

### 📦 2. Panel Público del Mapa (`/api/*`)

Estos endpoints alimentan de forma directa el mapa interactivo del frontend. Son públicos y no requieren JWT para permitir el monitoreo de la ciudadanía.

#### `GET /api/centros` (Público)
Obtiene todos los centros de acopio y sus niveles consolidados de suministros almacenados.
*   **Respuesta (200 OK)**:
    ```json
    [
      {
        "id": "11a2b33c-44d5-55e6-66f7-777777777777",
        "nombre": "Centro de Acopio Guanare",
        "direccion": "Av. Unda con Carrera 5, Galpón PC, Guanare",
        "contacto": "Protección Civil Portuguesa (+58-412-1234567)",
        "responsable": "Coordinador de Centro",
        "coordenadas": [-69.7421, 9.0421],
        "tipo": "acopio",
        "inventario": {
          "Víveres": 450,
          "Medicamentos": 120,
          "Herramientas": 35
        }
      }
    ]
    ```

#### `POST /api/centros` (Público/Integración)
Inserta o actualiza un centro con su inventario en la base de datos Drizzle. Traduce automáticamente los tipos de centros y categorías al formato de enums tipados en la BD.
*   **Cuerpo (JSON)**:
    ```json
    {
      "id": "11a2b33c-44d5-55e6-66f7-777777777777",
      "nombre": "Centro de Acopio Guanare",
      "direccion": "Av. Unda con Carrera 5, Galpón PC, Guanare",
      "contacto": "Protección Civil Portuguesa (+58-412-1234567)",
      "coordenadas": [-69.7421, 9.0421],
      "tipo": "acopio",
      "inventario": {
        "Víveres": 500,
        "Medicamentos": 150
      }
    }
    ```
*   **Respuesta (200 OK)**:
    ```json
    {
      "success": true,
      "centro": { ... }
    }
    ```

---

### 🚛 3. Recursos y Centros Internos (`/resources/*`)

Endpoints para operaciones internas de inventarios detallados.

#### `GET /resources/hubs` (Autenticado)
Lista técnica de todos los hubs (centros).
*   **Cabecera**: `Authorization: Bearer <JWT>`

#### `POST /resources/hubs` (Autenticado)
Crea un centro técnico (Hub) utilizando el esquema unificado.
*   **Cuerpo (JSON)**:
    ```json
    {
      "name": "Hub PC La Guaira",
      "address": "Terminal de Pasajeros de La Guaira",
      "contact": "Tlf: 0212-3312345",
      "type": "DISPATCH", 
      "latitude": 10.6021,
      "longitude": -66.9328
    }
    ```
    *Nota: `type` acepta `"COLLECTION"` (acopio), `"DISPATCH"` (salida/despacho) o `"DESTINATION"` (destino).*

#### `GET /resources/hubs/:hubId/resources` (Autenticado)
Obtiene el stock detallado por categorías de un centro.

#### `POST /resources/resources` (Autenticado)
Inyecta o actualiza stock para una categoría de insumos en un hub.
*   **Cuerpo (JSON)**:
    ```json
    {
      "hubId": "11a2b33c-44d5-55e6-66f7-777777777777",
      "category": "Medicamentos",
      "quantity": 250,
      "unit": "unidades"
    }
    ```

---

### 🏁 4. Caravanas y Operaciones (`/operations/*`)

Endpoints para planificar el transporte terrestre.

#### `GET /operations` (Autenticado)
Obtiene el listado de caravanas y misiones activas en carretera.

#### `POST /operations` (Autenticado)
Planifica una caravana vinculada al incidente activo por defecto.
*   **Cuerpo (JSON)**:
    ```json
    {
      "name": "Caravana de Suministros Portuguesa-La Guaira",
      "incidentId": "00000000-0000-0000-0000-000000000001",
      "zone": "Autopista Regional del Centro / CCS / La Guaira"
    }
    ```
*   **Respuesta (201 Created)**:
    ```json
    {
      "operation": {
        "id": "f83a8b41-e94c-4735-8ea1-60a61474ea47",
        "name": "Caravana de Suministros Portuguesa-La Guaira",
        "status": "PLANNED",
        "incidentId": "00000000-0000-0000-0000-000000000001",
        "zone": "Autopista Regional del Centro / CCS / La Guaira",
        "createdAt": "2026-06-26T21:45:00Z"
      }
    }
    ```

#### `POST /operations/:operationId/assignments` (Autenticado)
Asigna recursos (insumos cargados) a la caravana para el viaje.
*   **Cuerpo (JSON)**:
    ```json
    {
      "resourceId": "48b67123-5e92-411a-85d1-678cb2678124",
      "quantity": 300
    }
    ```

---

## 🛠️ Comandos Útiles de Desarrollo

Todos los comandos se corren desde la raíz del monorepo (`sos-logistica-vzla`):

*   **Levantar el Servidor de API en Caliente**:
    ```bash
    bun dev:api
    ```
*   **Generar Migraciones de Drizzle (Drizzle Kit)**:
    Detecta cambios en los esquemas relacionales y genera archivos SQL en `apps/api/drizzle/`:
    ```bash
    bun --filter @sos/api db:generate
    ```
*   **Aplicar Migraciones Pendientes en PostgreSQL**:
    ```bash
    bun --filter @sos/api db:migrate
    ```
*   **Correr Base de Datos Studio (Interfaz Web de Drizzle)**:
    ```bash
    bun --filter @sos/api db:studio
    ```
*   **Sembrar Administrador e Incidente Semilla**:
    Ejecuta el seed para sembrar la base de datos limpia:
    ```bash
    bun --filter @sos/api seed
    ```
*   **Ejecutar los Tests de la API (Bun Test)**:
    ```bash
    bun test
    ```
