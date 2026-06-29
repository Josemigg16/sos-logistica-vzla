import { z } from "zod";

/**
 * Resources bounded context — inventario y disponibilidad.
 * Un `Hub` es un punto operativo humanitario; un `Resource` es un bien disponible en él.
 * Las categorías de inventario son labels de UI (en español, por diseño).
 */

export const HUB_TYPES = ["COLLECTION", "DISPATCH", "DESTINATION", "SHELTER"] as const;
export const hubTypeSchema = z.enum(HUB_TYPES);
export type HubType = z.infer<typeof hubTypeSchema>;

export const HUB_STATUSES = ["ACTIVO", "INACTIVO"] as const;
export const hubStatusSchema = z.enum(HUB_STATUSES);
export type HubStatus = z.infer<typeof hubStatusSchema>;

// Catálogo de categorías de inventario. Valores = labels de UI en español.
export const INVENTORY_CATEGORIES = [
  "Víveres",
  "Medicamentos",
  "Higiene personal",
  "Abrigo y refugio",
  "Herramientas",
  "Productos de limpieza",
  "Artículos para bebés y grupos vulnerables",
] as const;
export const inventoryCategorySchema = z.enum(INVENTORY_CATEGORIES);
export type InventoryCategoryName = z.infer<typeof inventoryCategorySchema>;

export const NEED_STATUSES = ["DRAFT", "PUBLISHED"] as const;
export type NeedStatus = (typeof NEED_STATUSES)[number];

// Operational needs declared at the hub level (transport, labor, fuel, etc.).
// Distinct from the per-product `needs` table — these are coarse-grained signals
// for the public map ("este centro necesita transporte").
export const HUB_NEED_TYPES = ["TRANSPORT", "LABOR", "FUEL", "OTHER"] as const;
export const hubNeedTypeSchema = z.enum(HUB_NEED_TYPES);
export type HubNeedType = z.infer<typeof hubNeedTypeSchema>;

export const hubNeedSchema = z.object({
  type: hubNeedTypeSchema,
  note: z.string().trim().max(280).optional(),
});
export type HubNeed = z.infer<typeof hubNeedSchema>;

const hubNeedsArraySchema = z
  .array(hubNeedSchema)
  .default([])
  .refine(
    (needs) => new Set(needs.map((n) => n.type)).size === needs.length,
    { message: "No se permiten necesidades duplicadas del mismo tipo" },
  );

// Body de los endpoints PUT /resources/my-hub/needs y PUT /resources/hubs/:id/needs.
export const updateHubNeedsSchema = z.object({
  needs: z.array(hubNeedSchema).refine(
    (needs) => new Set(needs.map((n) => n.type)).size === needs.length,
    { message: "No se permiten necesidades duplicadas del mismo tipo" },
  ),
});
export type UpdateHubNeedsRequest = z.infer<typeof updateHubNeedsSchema>;

export const createProductSchema = z.object({
  name: z.string().trim().min(1).max(160),
  category: inventoryCategorySchema,
  unit: z.string().trim().min(1).max(40),
  description: z.string().default(""),
});
export type CreateProductRequest = z.infer<typeof createProductSchema>;

export const updateProductSchema = z.object({
  name: z.string().trim().min(1).max(160),
  category: inventoryCategorySchema,
  unit: z.string().trim().min(1).max(40),
  description: z.string().default(""),
});
export type UpdateProductRequest = z.infer<typeof updateProductSchema>;

export const createHubSchema = z.object({
  name: z.string().trim().min(3).max(160),
  address: z.string().trim().min(1).max(255),
  contact: z.string().trim().min(1).max(120),
  type: hubTypeSchema,
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  status: hubStatusSchema.optional(),
  isInformal: z.boolean().optional().default(false),
  needs: hubNeedsArraySchema,
});
export type CreateHubRequest = z.infer<typeof createHubSchema>;

export const stockResourceSchema = z.object({
  hubId: z.string().uuid(),
  productId: z.string().uuid(),
  quantity: z.number().int().min(0),
});
export type StockResourceRequest = z.infer<typeof stockResourceSchema>;

export interface PublicHub {
  id: string;
  name: string;
  address: string;
  contact: string;
  type: HubType;
  status: HubStatus;
  latitude: number;
  longitude: number;
  coordinatorId: string | null;
  createdAt: string;
  isInformal: boolean;
  needs: HubNeed[];
}

export interface PublicResource {
  id: string;
  hubId: string;
  productId: string | null;
  productName: string;
  category: InventoryCategoryName;
  quantity: number;
  unit: string;
  updatedAt: string;
}

export interface ProductMaster {
  id: string;
  name: string;
  category: InventoryCategoryName;
  unit: string;
  description: string;
}

export const PRODUCT_MASTER: ProductMaster[] = [
  // Víveres
  { id: "00000000-0000-0000-0001-000000000001", name: "Agua embotellada", category: "Víveres", unit: "litros", description: "Agua purificada apta para el consumo humano." },
  { id: "00000000-0000-0000-0001-000000000002", name: "Arroz blanco", category: "Víveres", unit: "kg", description: "Alimento base para raciones diarias." },
  { id: "00000000-0000-0000-0001-000000000003", name: "Harina de maíz precocida", category: "Víveres", unit: "kg", description: "Harina precocida para la elaboración de arepas." },
  { id: "00000000-0000-0000-0001-000000000004", name: "Pasta alimenticia", category: "Víveres", unit: "kg", description: "Pasta seca en presentaciones variadas." },
  { id: "00000000-0000-0000-0001-000000000005", name: "Aceite vegetal", category: "Víveres", unit: "litros", description: "Aceite de cocina para preparación de alimentos." },
  { id: "00000000-0000-0000-0001-000000000006", name: "Enlatados varios (atún/sardina)", category: "Víveres", unit: "unidades", description: "Proteína enlatada lista para consumir." },
  { id: "00000000-0000-0000-0001-000000000007", name: "Leche en polvo", category: "Víveres", unit: "kg", description: "Leche completa deshidratada." },
  { id: "00000000-0000-0000-0001-000000000008", name: "Caraotas negras", category: "Víveres", unit: "kg", description: "Granos negros secos ricos en proteínas." },
  { id: "00000000-0000-0000-0001-000000000009", name: "Azúcar refinada", category: "Víveres", unit: "kg", description: "Endulzante para preparaciones básicas." },

  // Medicamentos
  { id: "00000000-0000-0000-0002-000000000001", name: "Acetaminofén 500mg", category: "Medicamentos", unit: "tabletas", description: "Analgésico y antipirético esencial." },
  { id: "00000000-0000-0000-0002-000000000002", name: "Ibuprofeno 400mg", category: "Medicamentos", unit: "tabletas", description: "Antiinflamatorio no esteroideo." },
  { id: "00000000-0000-0000-0002-000000000003", name: "Amoxicilina 500mg", category: "Medicamentos", unit: "cápsulas", description: "Antibiótico bactericida de amplio espectro." },
  { id: "00000000-0000-0000-0002-000000000004", name: "Suero fisiológico oral", category: "Medicamentos", unit: "sobres", description: "Sales de rehidratación oral para deshidratación." },
  { id: "00000000-0000-0000-0002-000000000005", name: "Alcohol antiséptico", category: "Medicamentos", unit: "frascos", description: "Alcohol para desinfección de heridas y superficies." },
  { id: "00000000-0000-0000-0002-000000000006", name: "Gasas médicas estériles", category: "Medicamentos", unit: "paquetes", description: "Material de curación estéril." },
  { id: "00000000-0000-0000-0002-000000000007", name: "Paracetamol pediátrico", category: "Medicamentos", unit: "frascos", description: "Jarabe antipirético para niños." },
  { id: "00000000-0000-0000-0002-000000000008", name: "Vendas elásticas", category: "Medicamentos", unit: "unidades", description: "Vendas para soporte y compresión." },

  // Higiene personal
  { id: "00000000-0000-0000-0003-000000000001", name: "Jabón de baño", category: "Higiene personal", unit: "unidades", description: "Jabón corporal para aseo personal." },
  { id: "00000000-0000-0000-0003-000000000002", name: "Crema dental", category: "Higiene personal", unit: "tubos", description: "Pasta de dientes con flúor." },
  { id: "00000000-0000-0000-0003-000000000003", name: "Cepillo de dientes", category: "Higiene personal", unit: "unidades", description: "Cepillo dental de dureza media." },
  { id: "00000000-0000-0000-0003-000000000004", name: "Papel higiénico", category: "Higiene personal", unit: "rollos", description: "Rollos de papel higiénico familiar." },
  { id: "00000000-0000-0000-0003-000000000005", name: "Toallas sanitarias", category: "Higiene personal", unit: "paquetes", description: "Artículos de higiene femenina." },
  { id: "00000000-0000-0000-0003-000000000006", name: "Champú familiar", category: "Higiene personal", unit: "botellas", description: "Champú para limpieza del cabello." },
  { id: "00000000-0000-0000-0003-000000000007", name: "Pañitos húmedos", category: "Higiene personal", unit: "paquetes", description: "Pañitos para limpieza corporal rápida." },

  // Abrigo y refugio
  { id: "00000000-0000-0000-0004-000000000001", name: "Frazadas térmicas", category: "Abrigo y refugio", unit: "unidades", description: "Mantas de alta retención térmica." },
  { id: "00000000-0000-0000-0004-000000000002", name: "Colchonetas", category: "Abrigo y refugio", unit: "unidades", description: "Colchonetas de espuma para pernocta básica." },
  { id: "00000000-0000-0000-0004-000000000003", name: "Sábanas individuales", category: "Abrigo y refugio", unit: "unidades", description: "Juegos de sábanas sencillas." },
  { id: "00000000-0000-0000-0004-000000000004", name: "Almohadas", category: "Abrigo y refugio", unit: "unidades", description: "Almohadas de fibra sintética." },
  { id: "00000000-0000-0000-0004-000000000005", name: "Carpa de campaña (4 personas)", category: "Abrigo y refugio", unit: "unidades", description: "Refugio temporal impermeable." },
  { id: "00000000-0000-0000-0004-000000000006", name: "Sacos de dormir", category: "Abrigo y refugio", unit: "unidades", description: "Sacos térmicos individuales." },

  // Herramientas
  { id: "00000000-0000-0000-0005-000000000001", name: "Linternas recargables", category: "Herramientas", unit: "unidades", description: "Linternas LED con carga solar o USB." },
  { id: "00000000-0000-0000-0005-000000000002", name: "Pilas AA / AAA", category: "Herramientas", unit: "unidades", description: "Pilas alcalinas de repuesto." },
  { id: "00000000-0000-0000-0005-000000000003", name: "Cuerda de seguridad", category: "Herramientas", unit: "metros", description: "Cuerda de nylon de alta resistencia." },
  { id: "00000000-0000-0000-0005-000000000004", name: "Palas metálicas", category: "Herramientas", unit: "unidades", description: "Herramienta de excavación." },
  { id: "00000000-0000-0000-0005-000000000005", name: "Guantes de protección", category: "Herramientas", unit: "pares", description: "Guantes de carnaza o nitrilo para trabajo pesado." },
  { id: "00000000-0000-0000-0005-000000000006", name: "Kit de herramientas básico", category: "Herramientas", unit: "unidades", description: "Destornilladores, martillo, alicates." },
  { id: "00000000-0000-0000-0005-000000000007", name: "Cinta multipropósito (Tape)", category: "Herramientas", unit: "rollos", description: "Cinta adhesiva de alta resistencia e impermeable." },

  // Productos de limpieza
  { id: "00000000-0000-0000-0006-000000000001", name: "Cloro concentrado", category: "Productos de limpieza", unit: "litros", description: "Desinfectante clorado para higienización." },
  { id: "00000000-0000-0000-0006-000000000002", name: "Desinfectante líquido", category: "Productos de limpieza", unit: "litros", description: "Limpiador aromatizado para pisos y superficies." },
  { id: "00000000-0000-0000-0006-000000000003", name: "Detergente en polvo", category: "Productos de limpieza", unit: "kg", description: "Jabón para lavado de ropa y textiles." },
  { id: "00000000-0000-0000-0006-000000000004", name: "Jabón lavaplatos", category: "Productos de limpieza", unit: "unidades", description: "Crema o líquido lavaplatos." },
  { id: "00000000-0000-0000-0006-000000000005", name: "Escobas plásticas", category: "Productos de limpieza", unit: "unidades", description: "Escobas para barrer interiores y exteriores." },
  { id: "00000000-0000-0000-0006-000000000006", name: "Bolsas de basura resistentes", category: "Productos de limpieza", unit: "paquetes", description: "Bolsas plásticas de alta capacidad." },

  // Artículos para bebés y grupos vulnerables
  { id: "00000000-0000-0000-0007-000000000001", name: "Pañales para bebés (M / G)", category: "Artículos para bebés y grupos vulnerables", unit: "unidades", description: "Pañales desechables infantiles." },
  { id: "00000000-0000-0000-0007-000000000002", name: "Pañales para adultos (G / XG)", category: "Artículos para bebés y grupos vulnerables", unit: "unidades", description: "Pañales desechables geriátricos." },
  { id: "00000000-0000-0000-0007-000000000003", name: "Leche de fórmula maternizada", category: "Artículos para bebés y grupos vulnerables", unit: "botes", description: "Sustituto de leche materna para lactantes." },
  { id: "00000000-0000-0000-0007-000000000004", name: "Biberones de seguridad", category: "Artículos para bebés y grupos vulnerables", unit: "unidades", description: "Teteros de plástico libre de BPA." },
  { id: "00000000-0000-0000-0007-000000000005", name: "Alimento colado (compotas)", category: "Artículos para bebés y grupos vulnerables", unit: "unidades", description: "Colados de fruta o vegetales para bebés." },
  { id: "00000000-0000-0000-0007-000000000006", name: "Medicamentos geriátricos básicos", category: "Artículos para bebés y grupos vulnerables", unit: "unidades", description: "Vitaminas, analgésicos geriátricos y protectores gástricos." }
];
