import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import {
  Loader2, MapPin, Plus, Package, Boxes, X, AlertTriangle, Trash2,
  Warehouse, Send, ChevronRight, History, Truck, ShieldCheck, ShieldOff,
} from 'lucide-react'
import { PackagingRulesButton } from '@/components/packaging-rules-button'
import type {
  PublicHub, PublicLote, ProductMaster, HubType,
  HubStatus,
  LoteStatus,
  PublicInventoryBatch, PublicResource, PublicVehicle,
} from '@sos/shared'
import { useAuth } from '@/lib/auth/auth-context'
import { hasAnyRole, ROLES_VERIFY_HUBS } from '@/lib/session'
import { HubNeedsEditor } from '@/components/hub-needs-editor'
import { API_URL } from '@/lib/auth/config'
import { getToken } from '@/lib/auth/token-store'
import { useToast } from '@/components/ui/toast'
import { useScrollLock } from '@/lib/scroll-lock'

// ─── Helpers ────────────────────────────────────────────────────────────────

export function authHeaders(): HeadersInit {
  const token = getToken()
  const base: HeadersInit = { 'Content-Type': 'application/json' }
  return token ? { ...base, Authorization: `Bearer ${token}` } : base
}

async function readError(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => null) as { error?: string } | null
  return body?.error ?? fallback
}

export const HUB_TYPE_LABELS: Record<HubType, string> = {
  COLLECTION: 'Acopio (recolección)',
  DISPATCH: 'Base ZODI (salida)',
  DESTINATION: 'Destino (llegada)',
}

const LOTE_STATUS_META: Record<LoteStatus, { label: string; color: string }> = {
  EMBALADO: { label: 'Embalado', color: 'text-sky-400 bg-sky-400/10' },
  EN_TRANSITO: { label: 'En tránsito', color: 'text-yellow-400 bg-yellow-400/10' },
  ENTREGADO: { label: 'Entregado', color: 'text-emerald-400 bg-emerald-400/10' },
  RECIBIDO: { label: 'Recibido', color: 'text-teal-400 bg-teal-400/10' },
}

// ─── API ──────────────────────────────────────────────────────────────────────

async function changeHubStatus(d: { hubId: string; status: HubStatus }): Promise<PublicHub> {
  const res = await fetch(`${API_URL}/resources/hubs/${d.hubId}/status`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ status: d.status }),
  })
  if (!res.ok) throw new Error(await readError(res, 'No se pudo cambiar el estado del centro'))
  return (await res.json()).hub
}

export async function fetchHubById(hubId: string): Promise<PublicHub | null> {
  const res = await fetch(`${API_URL}/resources/hubs`, { headers: authHeaders() })
  if (!res.ok) throw new Error('No se pudo cargar el centro')
  const hubs: PublicHub[] = (await res.json()).hubs
  return hubs.find((h) => h.id === hubId) ?? null
}

export async function fetchHubResources(hubId: string): Promise<PublicResource[]> {
  const res = await fetch(`${API_URL}/resources/hubs/${hubId}/resources`, { headers: authHeaders() })
  if (!res.ok) throw new Error('No se pudieron cargar los recursos del centro')
  return (await res.json()).resources
}

async function fetchHubBatches(hubId: string): Promise<PublicInventoryBatch[]> {
  const res = await fetch(`${API_URL}/resources/hubs/${hubId}/batches`, { headers: authHeaders() })
  if (!res.ok) throw new Error('No se pudo cargar el histórico de ingresos')
  return (await res.json()).batches
}

async function addStockResource(d: {
  hubId: string; productId: string; quantity: number
}): Promise<PublicResource> {
  const res = await fetch(`${API_URL}/resources`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(d),
  })
  if (!res.ok) throw new Error(await readError(res, 'No se pudo registrar el stock'))
  return (await res.json()).resource
}

async function fetchHubs(): Promise<PublicHub[]> {
  const res = await fetch(`${API_URL}/resources/hubs`, { headers: authHeaders() })
  if (!res.ok) throw new Error('No se pudieron cargar los centros')
  return (await res.json()).hubs
}

async function fetchLotes(hubId: string): Promise<PublicLote[]> {
  const res = await fetch(`${API_URL}/cargo/lotes?hubId=${hubId}`, { headers: authHeaders() })
  if (!res.ok) throw new Error('No se pudieron cargar los lotes')
  return (await res.json()).lotes
}

async function createLote(d: {
  hubOrigenId: string; hubDestinoId?: string; nota?: string
  items: { productId: string; cantidad: number; pesoKg?: number }[]
}): Promise<PublicLote> {
  const res = await fetch(`${API_URL}/cargo/lotes`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(d) })
  if (!res.ok) throw new Error(await readError(res, 'No se pudo crear el lote'))
  return (await res.json()).lote
}

async function assignVehicleToLote(d: { loteId: string; vehiculoId: string }): Promise<PublicLote> {
  const res = await fetch(`${API_URL}/cargo/lotes/${d.loteId}/assign`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ vehiculoId: d.vehiculoId }),
  })
  if (!res.ok) throw new Error(await readError(res, 'No se pudo asignar el vehículo'))
  return (await res.json()).lote
}

async function fetchAvailableVehicles(): Promise<PublicVehicle[]> {
  const res = await fetch(`${API_URL}/fleet/vehicles`, { headers: authHeaders() })
  if (!res.ok) throw new Error('No se pudieron cargar los vehículos')
  const vehicles: PublicVehicle[] = (await res.json()).vehicles ?? await res.clone().json()
  // El endpoint puede devolver { vehicles: [...] } o un array directo; defendemos ambas formas.
  const list = Array.isArray(vehicles) ? vehicles : []
  return list.filter((v) => v.estado === 'DISPONIBLE')
}

async function fetchProducts(): Promise<ProductMaster[]> {
  const res = await fetch(`${API_URL}/productos`, { headers: authHeaders() })
  if (!res.ok) throw new Error('No se pudieron cargar los productos')
  const data = await res.json()
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.products)) return data.products
  if (Array.isArray(data?.productos)) return data.productos
  if (Array.isArray(data?.data)) return data.data
  return []
}

// ─── Dashboard ─────────────────────────────────────────────────────────────────

export interface HubDashboardProps {
  hub: PublicHub
  /** Si true: muestra selector de vehículo al crear lote + botón "Asignar vehículo" en cada lote. */
  canManageVehicles: boolean
}

export function HubDashboard({ hub, canManageVehicles }: HubDashboardProps) {
  const { user } = useAuth()
  const canToggleStatus = hasAnyRole(user, ...ROLES_VERIFY_HUBS)

  return (
    <div className="flex flex-col gap-6">
      {/* Tarjeta del centro */}
      <div className="rounded-2xl border border-[#2B5F8E]/40 bg-[#152D46]/80 backdrop-blur-sm p-5 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[#2B5F8E] text-white shrink-0"><Warehouse className="w-6 h-6" /></div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold text-white truncate">{hub.name}</h2>
            <HubStatusBadge status={hub.status} />
          </div>
          <p className="text-sm text-white/50 truncate">{hub.address}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-[11px] text-white/40">
            <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{hub.latitude.toFixed(4)}, {hub.longitude.toFixed(4)}</span>
            <span>{HUB_TYPE_LABELS[hub.type]}</span>
            <span>{hub.contact}</span>
          </div>
        </div>
        {canToggleStatus && <HubStatusToggleButton hub={hub} />}
      </div>

      <PackagingRulesButton />
      <HubNeedsEditor hub={hub} />
      <InventorySection hub={hub} />
      <BatchesHistorySection hub={hub} />
      <LotesSection hub={hub} canManageVehicles={canManageVehicles} />
      <InputStyles />
    </div>
  )
}

function HubStatusBadge({ status }: { status: HubStatus }) {
  const active = status === 'ACTIVO'
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border ${
        active
          ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10'
          : 'text-amber-300 border-amber-400/30 bg-amber-400/10'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-400' : 'bg-amber-400'}`} />
      {active ? 'Activo' : 'Pendiente'}
    </span>
  )
}

function HubStatusToggleButton({ hub }: { hub: PublicHub }) {
  const qc = useQueryClient()
  const toast = useToast()
  const isActive = hub.status === 'ACTIVO'

  const mut = useMutation({
    mutationFn: changeHubStatus,
    onSuccess: (updated) => {
      qc.setQueryData<PublicHub | null>(['hub', updated.id], updated)
      qc.invalidateQueries({ queryKey: ['hub', updated.id] })
      qc.invalidateQueries({ queryKey: ['centros'] })
      qc.invalidateQueries({ queryKey: ['hubs-all'] })
      toast.success(
        updated.status === 'ACTIVO' ? 'Centro verificado' : 'Centro desactivado',
        updated.status === 'ACTIVO'
          ? `"${updated.name}" ya aparece en el mapa público.`
          : `"${updated.name}" dejó de aparecer en el mapa público.`,
      )
    },
    onError: (e: Error) => toast.error('No se pudo actualizar el estado', e.message),
  })

  return (
    <button
      type="button"
      onClick={() => mut.mutate({ hubId: hub.id, status: isActive ? 'INACTIVO' : 'ACTIVO' })}
      disabled={mut.isPending}
      className={`shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed ${
        isActive
          ? 'bg-amber-400/10 border-amber-400/30 text-amber-200 hover:bg-amber-400/20'
          : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/25'
      }`}
      title={isActive ? 'Desactivar centro' : 'Verificar y activar centro'}
    >
      {mut.isPending ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : isActive ? (
        <ShieldOff className="w-3.5 h-3.5" />
      ) : (
        <ShieldCheck className="w-3.5 h-3.5" />
      )}
      {isActive ? 'Desactivar' : 'Verificar y activar'}
    </button>
  )
}

// ─── Inventario ────────────────────────────────────────────────────────────────

function InventorySection({ hub }: { hub: PublicHub }) {
  const qc = useQueryClient()
  const [adding, setAdding] = useState(false)
  const { data: stock = [], isLoading } = useQuery({
    queryKey: ['hub-resources', hub.id],
    queryFn: () => fetchHubResources(hub.id),
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['hub-resources', hub.id] })
    qc.invalidateQueries({ queryKey: ['hub-stock', hub.id] })
    qc.invalidateQueries({ queryKey: ['hub-batches', hub.id] })
  }

  return (
    <section className="rounded-2xl border border-[#2B5F8E]/40 bg-[#152D46]/80 backdrop-blur-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Boxes className="w-5 h-5 text-[#4A89C0]" />
          <h3 className="font-bold text-white">Inventario</h3>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2B5F8E]/40 border border-[#2B5F8E]/60 text-white text-xs font-semibold hover:bg-[#2B5F8E]/60 active:scale-[0.97] transition"
        >
          <Plus className="w-3.5 h-3.5" /> Registrar ingreso
        </button>
      </div>

      {isLoading ? (
        <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-[#4A89C0]" /></div>
      ) : stock.length === 0 ? (
        <p className="text-sm text-white/40 py-6 text-center">Sin inventario registrado. Empezá registrando el ingreso de un producto.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {stock.map((line) => (
            <div key={line.id} className="rounded-xl border border-[#2B5F8E]/30 bg-[#0F2337]/60 p-3">
              <p className="text-[11px] text-white/50 uppercase tracking-wider truncate">{line.category}</p>
              <p className="text-sm font-semibold text-white/90 truncate">{line.productName}</p>
              <p className="text-lg font-bold text-white mt-1">
                {line.quantity} <span className="text-xs font-normal text-white/50">{line.unit}</span>
              </p>
            </div>
          ))}
        </div>
      )}

      {adding && (
        <StockModal
          hubId={hub.id}
          onClose={() => setAdding(false)}
          onDone={() => { invalidate(); setAdding(false) }}
        />
      )}
    </section>
  )
}

function StockModal({ hubId, onClose, onDone }: { hubId: string; onClose: () => void; onDone: () => void }) {
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const toast = useToast()
  const { data: products = [], isLoading: loadingProducts } = useQuery({ queryKey: ['productos'], queryFn: fetchProducts })
  const mut = useMutation({
    mutationFn: addStockResource,
    onSuccess: (resource) => {
      const product = products.find((p) => p.id === resource.productId)
      toast.success(
        'Stock sumado',
        product ? `Se agregaron ${resource.quantity} ${product.unit} de "${product.name}" al inventario.` : 'El inventario se actualizó.',
      )
      onDone()
    },
    onError: (e: Error) => {
      setErrorMsg(e.message)
      toast.error('No se pudo registrar el stock', e.message)
    },
  })

  const safeProducts = Array.isArray(products) ? products : []
  const selected = safeProducts.find((p) => p.id === productId)

  const grouped = safeProducts.reduce<Record<string, ProductMaster[]>>((acc, p) => {
    (acc[p.category] ||= []).push(p)
    return acc
  }, {})

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    if (!productId) { setErrorMsg('Seleccioná un producto del catálogo.'); return }
    const n = Number(quantity)
    if (!Number.isInteger(n) || n <= 0) { setErrorMsg('La cantidad debe ser un entero positivo.'); return }
    mut.mutate({ hubId, productId, quantity: n })
  }

  return (
    <ModalShell title="Sumar stock al inventario" onClose={onClose}>
      <form onSubmit={submit} className="p-5 flex flex-col gap-4">
        {errorMsg && <ErrorBanner msg={errorMsg} onDismiss={() => setErrorMsg(null)} />}
        <Field label="Producto">
          {loadingProducts ? (
            <div className="coord-input flex items-center gap-2 text-white/50"><Loader2 className="w-4 h-4 animate-spin" /> Cargando catálogo…</div>
          ) : (
            <select required className="coord-input" value={productId} onChange={(e) => setProductId(e.target.value)}>
              <option value="">Seleccionar producto…</option>
              {Object.entries(grouped).map(([cat, prods]) => (
                <optgroup key={cat} label={cat}>
                  {prods.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </optgroup>
              ))}
            </select>
          )}
        </Field>
        {selected && (
          <div className="flex items-center gap-2 text-[11px] text-white/50">
            <span className="px-2 py-0.5 rounded-md bg-[#2B5F8E]/20">{selected.category}</span>
            <span>Unidad: <span className="text-white/70 font-medium">{selected.unit}</span></span>
          </div>
        )}
        <Field label={`Cantidad${selected ? ` (${selected.unit})` : ''}`}>
          <input
            required
            type="number"
            min="1"
            className="coord-input"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="ej: 50"
          />
        </Field>
        <ModalActions onCancel={onClose} isSubmitting={mut.isPending} label="SUMAR" />
      </form>
    </ModalShell>
  )
}

// ─── Histórico de ingresos ────────────────────────────────────────────────────

function BatchesHistorySection({ hub }: { hub: PublicHub }) {
  const { data: batches = [], isLoading } = useQuery({
    queryKey: ['hub-batches', hub.id],
    queryFn: () => fetchHubBatches(hub.id),
  })
  const { data: products } = useQuery({ queryKey: ['productos'], queryFn: fetchProducts })
  const productById = useMemo(() => {
    const map = new Map<string, ProductMaster>()
    if (!Array.isArray(products)) return map
    for (const p of products) {
      if (p && typeof p === 'object' && typeof p.id === 'string') {
        map.set(p.id, p)
      }
    }
    return map
  }, [products])

  return (
    <section className="rounded-2xl border border-[#2B5F8E]/40 bg-[#152D46]/80 backdrop-blur-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <History className="w-5 h-5 text-[#4A89C0]" />
        <h3 className="font-bold text-white">Histórico de ingresos</h3>
      </div>

      {isLoading ? (
        <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-[#4A89C0]" /></div>
      ) : batches.length === 0 ? (
        <p className="text-sm text-white/40 py-6 text-center">Todavía no se registró ningún ingreso.</p>
      ) : (
        <div className="flex flex-col divide-y divide-[#2B5F8E]/20">
          {batches.map((b) => {
            const product = productById.get(b.productId)
            return (
              <div key={b.id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white truncate">{product?.name ?? b.productId}</p>
                  <p className="text-[11px] text-white/40">
                    {new Date(b.receivedAt).toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' })}
                  </p>
                </div>
                <span className="text-sm font-mono text-white/80 shrink-0">
                  {b.quantityBatches} {product?.unit ?? 'unidades'}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

// ─── Lotes ──────────────────────────────────────────────────────────────────

function LotesSection({ hub, canManageVehicles }: { hub: PublicHub; canManageVehicles: boolean }) {
  const qc = useQueryClient()
  const [creating, setCreating] = useState(false)
  const { data: lotes = [], isLoading } = useQuery({ queryKey: ['hub-lotes', hub.id], queryFn: () => fetchLotes(hub.id) })

  return (
    <section className="rounded-2xl border border-[#2B5F8E]/40 bg-[#152D46]/80 backdrop-blur-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2"><Package className="w-5 h-5 text-[#4A89C0]" /><h3 className="font-bold text-white">Lotes para transporte</h3></div>
        <button onClick={() => setCreating(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-[#0F2337] text-xs font-bold hover:bg-[#C8DCF0] active:scale-[0.97] transition">
          <Plus className="w-3.5 h-3.5" /> Nuevo lote
        </button>
      </div>

      {isLoading ? (
        <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-[#4A89C0]" /></div>
      ) : lotes.length === 0 ? (
        <p className="text-sm text-white/40 py-6 text-center">No hay lotes registrados todavía.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {lotes.map((lote) => <LoteCard key={lote.id} lote={lote} hubId={hub.id} canManageVehicles={canManageVehicles} />)}
        </div>
      )}

      {creating && (
        <CreateLoteModal
          hub={hub}
          canManageVehicles={canManageVehicles}
          onClose={() => setCreating(false)}
          onDone={() => { qc.invalidateQueries({ queryKey: ['hub-lotes', hub.id] }); setCreating(false) }}
        />
      )}
    </section>
  )
}

function LoteCard({ lote, hubId, canManageVehicles }: { lote: PublicLote; hubId: string; canManageVehicles: boolean }) {
  const meta = LOTE_STATUS_META[lote.estado]
  const [assigning, setAssigning] = useState(false)
  const qc = useQueryClient()

  const canAssign = canManageVehicles && !lote.vehiculoId && lote.estado === 'EMBALADO'

  return (
    <div className="rounded-xl border border-[#2B5F8E]/30 bg-[#0F2337]/60 p-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${meta.color}`}>{meta.label}</span>
        <span className="text-[11px] text-white/40 font-mono">{lote.pesoTotalKg} kg</span>
      </div>
      <div className="flex items-center gap-1.5 text-sm text-white/80 mb-2">
        <span className="truncate">{lote.hubOrigenNombre}</span>
        {lote.hubDestinoNombre && <><ChevronRight className="w-3.5 h-3.5 text-white/30 shrink-0" /><span className="truncate">{lote.hubDestinoNombre}</span></>}
      </div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {lote.items.map((it) => (
          <span key={it.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#2B5F8E]/20 text-[11px] text-white/70">
            {it.productName} <span className="font-mono text-white/50">×{it.cantidad}</span>
          </span>
        ))}
      </div>
      {lote.vehiculoPlaca && (
        <p className="text-[11px] text-white/40 flex items-center gap-1">
          <Truck className="w-3 h-3" />
          Vehículo: <span className="font-mono text-white/60">{lote.vehiculoPlaca}</span>
        </p>
      )}
      {lote.nota && <p className="text-[11px] text-white/40 italic mt-1">"{lote.nota}"</p>}

      {canAssign && (
        <button
          type="button"
          onClick={() => setAssigning(true)}
          className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2B5F8E]/40 border border-[#2B5F8E]/60 text-white text-xs font-semibold hover:bg-[#2B5F8E]/60 active:scale-[0.97] transition"
        >
          <Truck className="w-3.5 h-3.5" /> Asignar vehículo
        </button>
      )}

      {assigning && (
        <AssignVehicleModal
          loteId={lote.id}
          onClose={() => setAssigning(false)}
          onDone={() => {
            qc.invalidateQueries({ queryKey: ['hub-lotes', hubId] })
            setAssigning(false)
          }}
        />
      )}
    </div>
  )
}

function AssignVehicleModal({ loteId, onClose, onDone }: { loteId: string; onClose: () => void; onDone: () => void }) {
  const [vehiculoId, setVehiculoId] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const toast = useToast()
  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ['fleet-vehicles-available'],
    queryFn: fetchAvailableVehicles,
  })

  const mut = useMutation({
    mutationFn: assignVehicleToLote,
    onSuccess: (lote) => {
      toast.success('Vehículo asignado', lote.vehiculoPlaca ? `Lote despachado en vehículo ${lote.vehiculoPlaca}.` : 'El lote quedó en tránsito.')
      onDone()
    },
    onError: (e: Error) => {
      setErrorMsg(e.message)
      toast.error('No se pudo asignar el vehículo', e.message)
    },
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    if (!vehiculoId) { setErrorMsg('Seleccioná un vehículo disponible.'); return }
    mut.mutate({ loteId, vehiculoId })
  }

  return (
    <ModalShell title="Asignar vehículo al lote" onClose={onClose}>
      <form onSubmit={submit} className="p-5 flex flex-col gap-4">
        {errorMsg && <ErrorBanner msg={errorMsg} onDismiss={() => setErrorMsg(null)} />}
        <Field label="Vehículo disponible">
          {isLoading ? (
            <div className="coord-input flex items-center gap-2 text-white/50"><Loader2 className="w-4 h-4 animate-spin" /> Cargando flota…</div>
          ) : vehicles.length === 0 ? (
            <p className="coord-input flex items-center text-white/50 text-xs">
              No hay vehículos disponibles en este momento.
            </p>
          ) : (
            <select required className="coord-input" value={vehiculoId} onChange={(e) => setVehiculoId(e.target.value)}>
              <option value="">Seleccionar vehículo…</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.placa} — {v.modelo} ({v.capacidadCargaKg} kg)
                </option>
              ))}
            </select>
          )}
        </Field>
        <p className="text-[11px] text-white/40 -mt-1">
          Al asignar un vehículo, el lote pasa a estado "En tránsito".
        </p>
        <ModalActions onCancel={onClose} isSubmitting={mut.isPending} label="ASIGNAR" icon={<Truck className="w-4 h-4" />} />
      </form>
    </ModalShell>
  )
}

interface DraftItem { productId: string; cantidad: string }

function CreateLoteModal({ hub, canManageVehicles, onClose, onDone }: {
  hub: PublicHub
  canManageVehicles: boolean
  onClose: () => void
  onDone: () => void
}) {
  const { user } = useAuth()
  const [items, setItems] = useState<DraftItem[]>([{ productId: '', cantidad: '' }])
  const [hubDestinoId, setHubDestinoId] = useState('')
  const [vehiculoId, setVehiculoId] = useState('')
  const [nota, setNota] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const toast = useToast()

  const { data: stock = [] } = useQuery({ queryKey: ['hub-resources', hub.id], queryFn: () => fetchHubResources(hub.id) })
  const { data: hubs = [] } = useQuery({ queryKey: ['hubs-all'], queryFn: fetchHubs })
  const { data: vehicles = [] } = useQuery({
    queryKey: ['fleet-vehicles-available'],
    queryFn: fetchAvailableVehicles,
    enabled: canManageVehicles,
  })

  // Solo productos efectivamente en stock del centro.
  const stocked = stock.filter((r) => r.productId && r.quantity > 0)
  const byProduct = Object.fromEntries(stocked.map((r) => [r.productId as string, r]))

  const mut = useMutation({
    mutationFn: async (input: {
      hubOrigenId: string; hubDestinoId?: string; nota?: string
      items: { productId: string; cantidad: number }[]
      vehiculoId?: string
    }) => {
      // Crear lote primero. Si hay vehículo asignado y rol lo permite, asignar después.
      const lote = await createLote({
        hubOrigenId: input.hubOrigenId,
        hubDestinoId: input.hubDestinoId,
        nota: input.nota,
        items: input.items,
      })
      if (input.vehiculoId) {
        try {
          return await assignVehicleToLote({ loteId: lote.id, vehiculoId: input.vehiculoId })
        } catch (e) {
          // El lote ya fue creado; la asignación falló. Avisamos pero no perdemos el lote.
          const msg = e instanceof Error ? e.message : 'error desconocido'
          toast.error('Lote creado, pero no se pudo asignar vehículo', msg)
          return lote
        }
      }
      return lote
    },
    onSuccess: (lote) => {
      toast.success(
        'Lote creado',
        lote.hubDestinoNombre ? `Listo para envío a "${lote.hubDestinoNombre}".` : 'El lote quedó disponible para transporte.',
      )
      onDone()
    },
    onError: (e: Error) => {
      setErrorMsg(e.message)
      toast.error('No se pudo crear el lote', e.message)
    },
  })

  const setItem = (i: number, patch: Partial<DraftItem>) => setItems((prev) => prev.map((it, idx) => idx === i ? { ...it, ...patch } : it))
  const addItem = () => setItems((prev) => [...prev, { productId: '', cantidad: '' }])
  const removeItem = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    const validItems = items
      .filter((it) => it.productId && Number(it.cantidad) > 0)
      .map((it) => ({ productId: it.productId, cantidad: Number(it.cantidad) }))
    if (validItems.length === 0) { setErrorMsg('Agregá al menos un producto con cantidad.'); return }
    mut.mutate({
      hubOrigenId: hub.id,
      hubDestinoId: hubDestinoId || undefined,
      nota: nota || undefined,
      items: validItems,
      vehiculoId: vehiculoId || undefined,
    })
  }

  // ZODI_SENDER reparte desde su base ZODI (DISPATCH) hacia centros DESTINATION
  // de llegada. El resto de coordinadores envían su carga hacia bases ZODI
  // (DISPATCH) para que ZODI la distribuya.
  const destinoTipo: HubType = user?.role === 'ZODI_SENDER' ? 'DESTINATION' : 'DISPATCH'
  const destinos = hubs.filter((h) => h.id !== hub.id && h.type === destinoTipo)
  const hayDestinos = destinos.length > 0
  const destinoLabel = user?.role === 'ZODI_SENDER' ? 'Centro de destino (llegada)' : 'Base ZODI de salida'

  return (
    <ModalShell title="Nuevo lote" onClose={onClose} wide>
      <form onSubmit={submit} className="p-5 flex flex-col gap-4">
        {errorMsg && <ErrorBanner msg={errorMsg} onDismiss={() => setErrorMsg(null)} />}

        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/50 mb-2">Productos del lote</label>
          {stocked.length === 0 ? (
            <p className="text-sm text-white/40 rounded-lg border border-dashed border-[#2B5F8E]/40 px-3 py-4 text-center">
              No hay productos en este inventario. Suma stock antes de armar un lote.
            </p>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                {items.map((it, i) => {
                  const sel = it.productId ? byProduct[it.productId] : undefined
                  return (
                    <div key={i} className="grid grid-cols-[minmax(0,1fr)_6.5rem_auto] gap-2 items-center">
                      <select className="coord-input" style={{ minWidth: 0 }} value={it.productId} onChange={(e) => setItem(i, { productId: e.target.value })}>
                        <option value="">Seleccionar producto…</option>
                        {stocked.map((r) => <option key={r.id} value={r.productId as string}>{r.productName} ({r.quantity} {r.unit})</option>)}
                      </select>
                      <input type="number" min="1" max={sel?.quantity} className="coord-input" style={{ minWidth: 0 }} placeholder="Cant." value={it.cantidad} onChange={(e) => setItem(i, { cantidad: e.target.value })} />
                      <button type="button" onClick={() => removeItem(i)} disabled={items.length === 1} className="p-2 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-400/10 disabled:opacity-30 transition"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  )
                })}
              </div>
              <button type="button" onClick={addItem} className="mt-2 flex items-center gap-1 text-xs text-[#4A89C0] hover:text-[#C8DCF0] transition"><Plus className="w-3.5 h-3.5" /> Agregar producto</button>
            </>
          )}
        </div>

        <Field label={`${destinoLabel} (opcional)`}>
          {hayDestinos ? (
            <select className="coord-input" value={hubDestinoId} onChange={(e) => setHubDestinoId(e.target.value)}>
              <option value="">Sin definir</option>
              {destinos.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          ) : (
            <p className="coord-input flex items-center text-white/50 text-xs">
              {user?.role === 'ZODI_SENDER'
                ? 'Aún no hay centros de destino (llegada) registrados.'
                : 'Aún no hay bases ZODI registradas para envío.'}
            </p>
          )}
        </Field>

        {canManageVehicles && (
          <Field label="Vehículo asignado (opcional)">
            {vehicles.length === 0 ? (
              <p className="coord-input flex items-center text-white/50 text-xs">
                No hay vehículos disponibles. Puedes asignar uno más tarde.
              </p>
            ) : (
              <select className="coord-input" value={vehiculoId} onChange={(e) => setVehiculoId(e.target.value)}>
                <option value="">Sin asignar (queda Embalado)</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.placa} — {v.modelo} ({v.capacidadCargaKg} kg)
                  </option>
                ))}
              </select>
            )}
          </Field>
        )}

        <Field label="Nota (opcional)">
          <textarea className="coord-input min-h-[64px] resize-y" maxLength={500} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Instrucciones, fragilidad, prioridad…" />
        </Field>

        <ModalActions onCancel={onClose} isSubmitting={mut.isPending} label="CREAR LOTE" icon={<Send className="w-4 h-4" />} />
      </form>
    </ModalShell>
  )
}

// ─── UI compartida ─────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-white/50">{label}</span>
      {children}
    </label>
  )
}

function ErrorBanner({ msg, onDismiss }: { msg: string; onDismiss: () => void }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-300">
      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
      <span className="flex-1">{msg}</span>
      <button type="button" onClick={onDismiss} className="text-red-300/60 hover:text-red-300"><X className="w-4 h-4" /></button>
    </div>
  )
}

function ModalShell({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  useScrollLock(true)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-[#0A1A2A]/80 backdrop-blur-md p-0 sm:p-4 animate-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={`relative flex flex-col w-full ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'} max-h-[calc(100dvh-2rem)] sm:max-h-[85vh] bg-[#152D46] border border-[#2B5F8E]/50 rounded-t-2xl sm:rounded-2xl shadow-[0_20px_60px_-20px_rgba(0,0,0,0.7)] animate-modal-panel overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2B5F8E]/30 shrink-0">
          <h3 className="font-bold text-white text-base">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="flex items-center justify-center w-8 h-8 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>
      </div>
      <ModalAnimations />
    </div>,
    document.body,
  )
}

function ModalActions({ onCancel, isSubmitting, label, icon }: { onCancel: () => void; isSubmitting: boolean; label: string; icon?: React.ReactNode }) {
  return (
    <div className="sticky bottom-0 -mx-5 -mb-5 mt-2 flex gap-3 px-5 py-4 border-t border-[#2B5F8E]/30 bg-[#152D46]/95 backdrop-blur-sm">
      <button
        type="button"
        onClick={onCancel}
        className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white/70 text-sm font-semibold hover:bg-white/10 transition"
      >
        Cancelar
      </button>
      <button
        type="submit"
        disabled={isSubmitting}
        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#0F2337] text-sm font-bold hover:bg-[#C8DCF0] active:scale-[0.98] transition disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
        {label}
      </button>
    </div>
  )
}

function ModalAnimations() {
  return (
    <style>{`
      @keyframes modal-overlay-in {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes modal-panel-in {
        from { opacity: 0; transform: translateY(8px) scale(0.98); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      .animate-modal-overlay { animation: modal-overlay-in 160ms ease-out; }
      .animate-modal-panel { animation: modal-panel-in 200ms cubic-bezier(0.16, 1, 0.3, 1); }
      @media (max-width: 639px) {
        @keyframes modal-panel-in-mobile {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-modal-panel { animation: modal-panel-in-mobile 240ms cubic-bezier(0.16, 1, 0.3, 1); }
      }
      @media (prefers-reduced-motion: reduce) {
        .animate-modal-overlay, .animate-modal-panel { animation: none; }
      }
    `}</style>
  )
}

export function InputStyles() {
  return (
    <style>{`
      .coord-input {
        width: 100%;
        border-radius: 0.75rem;
        border: 1px solid rgba(43,95,142,0.4);
        background: rgba(15,35,55,0.7);
        padding: 0.625rem 0.875rem;
        font-size: 0.875rem;
        color: white;
        outline: none;
        transition: border-color 150ms, box-shadow 150ms;
      }
      .coord-input::placeholder { color: rgba(255,255,255,0.25); }
      .coord-input:focus { border-color: #4A89C0; box-shadow: 0 0 0 2px rgba(74,137,192,0.3); }
    `}</style>
  )
}
