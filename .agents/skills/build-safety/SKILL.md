---
name: build-safety
description: Guidelines for preventing build failures in Docker, TypeScript compilation errors in frontend, and shadowing native objects like Map.
---

# Build Safety & Compilation Prevention

This skill provides guidelines to prevent build errors when creating Docker images or compiling the `@sos/web` app.

## Why did the build fail?
Vite runs a fast development server that transpiles TypeScript without performing type checks. This means code with TypeScript errors runs fine in development but fails during the production build step (`bun --filter @sos/web build`) or inside the `web.Dockerfile`.

## Common Pitfalls & How to Avoid Them

### 1. Shadowing Native Objects (e.g., `Map`)
Avoid importing custom components or utilities with the exact same name as native JavaScript globals unless you qualify the global.
- **Problem**:
  ```typescript
  import { Map, MapMarker } from '@/components/ui/map'
  
  // This fails because Map refers to the React component, not the JS Map
  const productById = new Map(products.map(p => [p.id, p]))
  ```
- **Solutions**:
  1. Use `globalThis.Map` or `window.Map` for the native constructor:
     ```typescript
     const productById = new globalThis.Map(products.map(p => [p.id, p]))
     ```
  2. Or import the component with an alias:
     ```typescript
     import { Map as MapComponent } from '@/components/ui/map'
     ```

### 2. Missing Endpoint/Resource Fetching Functions
Ensure all query functions used in `useQuery` (like `fetchHubResources`) are fully defined, typed, and imported in the route file.

### 3. Missing `ZODI_BASE` in Mappings
When introducing new values to a shared enum/union type (like `HubType` from `@sos/shared`), ensure all frontend Records mapping those types (like `HUB_TYPE_LABELS` mapping `HubType -> string`) are updated to handle the new value.

## Verification Checklist Before Building/Deploying
Before running `docker compose up -d --build` or committing changes, run the build locally to catch TypeScript errors:
```bash
bun --filter @sos/web build
```
Or build everything:
```bash
bun build
```
