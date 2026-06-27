import { createFileRoute, Navigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useMemo, useRef } from 'react'
import {
  Loader2, MapPin, Plus, Package, Boxes, X, AlertTriangle, Trash2,
  Warehouse, Send, ChevronRight, History,
} from 'lucide-react'
import type {
  PublicHub, PublicLote, ProductMaster, HubType,
  LoteStatus,
  PublicInventoryBatch, PublicHubStockLine, PublicResource,
} from '@sos/shared'
import { HUB_TYPES } from '@sos/shared'
import { useAuth } from '@/lib/auth/auth-context'
import { hasAnyRole } from '@/lib/session'
import { API_URL } from '@/lib/auth/config'
import { getToken } from '@/lib/auth/token-store'
import { Map as MapView, MapControls, MapMarker } from '@/components/ui/map'
import { useToast } from '@/components/ui/toast'
import { FormSheet } from '@/components/ui/form-sheet'

export const Route = createFileRoute('/admin/coordinator')({ component: CoordinatorGate })

function CoordinatorGate() {
  const { user } = useAuth()
  if (!hasAnyRole(user, 'HUB_COORDINATOR', 'ADMIN', 'MANAGER')) return <Navigate to="/admin" />
  return <CoordinatorPage />
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function authHeaders(): HeadersInit {
  const token = getToken()
  const base: HeadersInit = { 'Content-Type': 'application/json' }
  return token ? { ...base, Authorization: `Bearer ${token}` } : base
}

async function readError(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => null) as { error?: string } | null
  return body?.error ?? fallback
}

const HUB_TYPE_LABELS: Record<HubType, string> = {
  COLLECTION: 'Acopio (recolección)',
  DISPATCH: 'Despacho (salida)',
  DESTINATION: 'Destino (llegada)',
}

const LOTE_STATUS_META: Record<LoteStatus, { label: string; color: string }> = {
  EMBALADO: { label: 'Embalado', color: 'text-sky-400 bg-sky-400/10' },
  EN_TRANSITO: { label: 'En tránsito', color: 'text-yellow-400 bg-yellow-400/10' },
  ENTREGADO: { label: 'Entregado', color: 'text-emerald-400 bg-emerald-400/10' },
}

// ─── API ──────────────────────────────────────────────────────────────────────

async function fetchMyHub(): Promise<PublicHub | null> {
  const res = await fetch(`${API_URL}/resources/my-hub`, { headers: authHeaders() })
  if (!res.ok) throw new Error('No se pudo cargar tu centro de acopio')
  return (await res.json()).hub
}
async function registerMyHub(d: {
  name: string; address: string; contact: string; type: HubType; latitude: number; longitude: number
}): Promise<PublicHub> {
  const res = await fetch(`${API_URL}/resources/my-hub`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(d) })
  if (!res.ok) throw new Error(await readError(res, 'No se pudo registrar el centro'))
  return (await res.json()).hub
}
async function fetchHubStock(hubId: string): Promise<PublicHubStockLine[]> {
  const res = await fetch(`${API_URL}/resources/hubs/${hubId}/stock`, { headers: authHeaders() })
  if (!res.ok) throw new Error('No se pudo cargar el inventario')
  return (await res.json()).stock
}
async function fetchHubResources(hubId: string): Promise<PublicResource[]> {
  const res = await fetch(`${API_URL}/resources/hubs/${hubId}/resources`, { headers: authHeaders() })
  if (!res.ok) throw new Error('No se pudieron cargar los recursos del centro')
  return (await res.json()).resources
}
async function fetchHubBatches(hubId: string): Promise<PublicInventoryBatch[]> {
  const res = await fetch(`${API_URL}/resources/hubs/${hubId}/batches`, { headers: authHeaders() })
  if (!res.ok) throw new Error('No se pudo cargar el histórico de ingresos')
  return (await res.json()).batches
}
async function registerInventoryBatch(d: {
  hubId: string; productId: string; quantityBatches: number
}): Promise<PublicInventoryBatch> {
  const res = await fetch(`${API_URL}/resources/hubs/${d.hubId}/batches`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ productId: d.productId, quantityBatches: d.quantityBatches }),
  })
  if (!res.ok) throw new Error(await readError(res, 'No se pudo registrar el lote'))
  return (await res.json()).batch
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

async function deleteInventoryBatch(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/resources/batches/${id}`, { method: 'DELETE', headers: authHeaders() })
  if (!res.ok) throw new Error(await readError(res, 'No se pudo eliminar el lote'))
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
async function fetchProducts(): Promise<ProductMaster[]> {
  const res = await fetch(`${API_URL}/productos`, { headers: authHeaders() })
  if (!res.ok) throw new Error('No se pudieron cargar los productos')
  const data = await res.json()
  // El endpoint debería devolver un array directo, pero defendemos contra
  // formas envueltas tipo { products: [...] } o { data: [...] }.
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.products)) return data.products
  if (Array.isArray(data?.productos)) return data.productos
  if (Array.isArray(data?.data)) return data.data
  return []
}

// ─── Página ─────────────────────────────────────────────────────────────────

function CoordinatorPage() {
  const { data: hub, isLoading } = useQuery({ queryKey: ['my-hub'], queryFn: fetchMyHub })

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-5xl mx-auto lg:mx-0">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Warehouse className="w-4 h-4 text-[#C8DCF0]/60" />
          <span className="text-[11px] font-bold text-[#C8DCF0]/60 uppercase tracking-[0.15em]">Coordinación de centro</span>
        </div>
        <h1
          className="text-white leading-[0.95] tracking-tight"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", fontStyle: 'italic', fontWeight: 800, fontSize: 'clamp(2rem, 5vw, 3rem)' }}
        >
          MI CENTRO DE ACOPIO
        </h1>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24"><Loader2 className="w-7 h-7 animate-spin text-[#4A89C0]" /></div>
      ) : !hub ? (
        <RegisterHubSection />
      ) : (
        <HubDashboard hub={hub} />
      )}
    </div>
  )
}

// ─── Registro del centro ──────────────────────────────────────────────────────

function RegisterHubSection() {
  const qc = useQueryClient()
  const toast = useToast()
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [contact, setContact] = useState('')
  const [type, setType] = useState<HubType>('COLLECTION')
  const [lat, setLat] = useState('9.5832')
  const [lng, setLng] = useState('-69.2216')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const mut = useMutation({
    mutationFn: registerMyHub,
    onSuccess: (hub) => {
      qc.invalidateQueries({ queryKey: ['my-hub'] })
      toast.success('Centro registrado', `"${hub.name}" quedó vinculado a tu cuenta.`)
    },
    onError: (e: Error) => {
      setErrorMsg(e.message)
      toast.error('No se pudo registrar el centro', e.message)
    },
  })

  const latNum = parseFloat(lat) || 9.5832
  const lngNum = parseFloat(lng) || -69.2216

  return (
    <div className="rounded-2xl border border-[#2B5F8E]/40 bg-[#152D46]/80 backdrop-blur-sm p-6 max-w-2xl">
      <div className="flex items-center gap-2 mb-1">
        <Plus className="w-5 h-5 text-[#4A89C0]" />
        <h2 className="text-lg font-bold text-white">Registra tu centro de acopio</h2>
      </div>
      <p className="text-sm text-white/50 mb-5">Aún no tienes un centro asociado. Completá los datos y marcá su ubicación en el mapa.</p>

      {errorMsg && <ErrorBanner msg={errorMsg} onDismiss={() => setErrorMsg(null)} />}

      <form
        onSubmit={(e) => { e.preventDefault(); setErrorMsg(null); mut.mutate({ name, address, contact, type, latitude: latNum, longitude: lngNum }) }}
        className="flex flex-col gap-4"
      >
        <Field label="Nombre del centro"><input required minLength={3} className="coord-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="ej: Centro Catia" /></Field>
        <Field label="Dirección"><input required className="coord-input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="ej: Av. Principal, sector..." /></Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Contacto"><input required className="coord-input" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="ej: 0414-1234567" /></Field>
          <Field label="Tipo de centro">
            <select className="coord-input" value={type} onChange={(e) => setType(e.target.value as HubType)}>
              {HUB_TYPES.map((t) => <option key={t} value={t}>{HUB_TYPE_LABELS[t]}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Latitud"><input required type="number" step="any" className="coord-input font-mono" value={lat} onChange={(e) => setLat(e.target.value)} /></Field>
          <Field label="Longitud"><input required type="number" step="any" className="coord-input font-mono" value={lng} onChange={(e) => setLng(e.target.value)} /></Field>
        </div>

        <div className="w-full h-56 rounded-xl overflow-hidden border border-[#2B5F8E]/30 relative">
          <MapView
            center={[lngNum, latNum]}
            zoom={8}
            onClick={(lngLat) => { setLng(lngLat[0].toFixed(5)); setLat(lngLat[1].toFixed(5)) }}
            className="w-full h-full"
          >
            <MapControls />
            <MapMarker coordinates={[lngNum, latNum]} color="#22c55e" active />
          </MapView>
          <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-[#0F2337]/90 text-[10px] text-white/70 border border-[#2B5F8E]/40 pointer-events-none">
            Hacé clic en el mapa para marcar la ubicación
          </div>
        </div>

        <button
          type="submit"
          disabled={mut.isPending}
          className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 font-bold uppercase tracking-wide text-[#0F2337] hover:bg-[#C8DCF0] active:scale-[0.98] transition disabled:opacity-70"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", fontStyle: 'italic', letterSpacing: '0.05em' }}
        >
          {mut.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
          Registrar centro
        </button>
      </form>
      <InputStyles />
    </div>
  )
}

// ─── Dashboard del centro ─────────────────────────────────────────────────────

function HubDashboard({ hub }: { hub: PublicHub }) {
  return (
    <div className="flex flex-col gap-6">
      {/* Tarjeta del centro */}
      <div className="rounded-2xl border border-[#2B5F8E]/40 bg-[#152D46]/80 backdrop-blur-sm p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[#2B5F8E] text-white shrink-0"><Warehouse className="w-6 h-6" /></div>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold text-white truncate">{hub.name}</h2>
          <p className="text-sm text-white/50 truncate">{hub.address}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-[11px] text-white/40">
            <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{hub.latitude.toFixed(4)}, {hub.longitude.toFixed(4)}</span>
            <span>{HUB_TYPE_LABELS[hub.type]}</span>
            <span>{hub.contact}</span>
          </div>
        </div>
      </div>

      <InventorySection hub={hub} />
      <BatchesHistorySection hub={hub} />
      <LotesSection hub={hub} />
      <InputStyles />
    </div>
  )
}

// ─── Inventario (stock agregado por producto) ────────────────────────────────

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

  const snapshot = JSON.stringify({ productId, quantity })
  const baselineRef = useRef<string | null>(null)
  if (baselineRef.current === null) baselineRef.current = snapshot
  const isDirty = baselineRef.current !== snapshot

  return (
    <FormSheet
      title="Sumar stock al inventario"
      size="md"
      isDirty={isDirty}
      isSubmitting={mut.isPending}
      onClose={onClose}
      onSubmit={submit}
      footer={(requestClose) => (
        <ModalActions onCancel={requestClose} isSubmitting={mut.isPending} label="SUMAR" />
      )}
    >
      <div className="flex flex-col gap-4">
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
      </div>
    </FormSheet>
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
        <p className="text-sm text-white/40 py-6 text-center">Todavía no registraste ningún ingreso.</p>
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

function LotesSection({ hub }: { hub: PublicHub }) {
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
        <p className="text-sm text-white/40 py-6 text-center">No has clasificado lotes todavía.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {lotes.map((lote) => <LoteCard key={lote.id} lote={lote} />)}
        </div>
      )}

      {creating && (
        <CreateLoteModal
          hub={hub}
          onClose={() => setCreating(false)}
          onDone={() => { qc.invalidateQueries({ queryKey: ['hub-lotes', hub.id] }); setCreating(false) }}
        />
      )}
    </section>
  )
}

function LoteCard({ lote }: { lote: PublicLote }) {
  const meta = LOTE_STATUS_META[lote.estado]
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
      {lote.vehiculoPlaca && <p className="text-[11px] text-white/40">Vehículo: <span className="font-mono text-white/60">{lote.vehiculoPlaca}</span></p>}
      {lote.nota && <p className="text-[11px] text-white/40 italic mt-1">“{lote.nota}”</p>}
    </div>
  )
}

interface DraftItem { productId: string; cantidad: string }

function CreateLoteModal({ hub, onClose, onDone }: { hub: PublicHub; onClose: () => void; onDone: () => void }) {
  const { user } = useAuth()
  const [items, setItems] = useState<DraftItem[]>([{ productId: '', cantidad: '' }])
  const [hubDestinoId, setHubDestinoId] = useState('')
  const [nota, setNota] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const toast = useToast()

  const { data: stock = [] } = useQuery({ queryKey: ['hub-resources', hub.id], queryFn: () => fetchHubResources(hub.id) })
  const { data: hubs = [] } = useQuery({ queryKey: ['hubs-all'], queryFn: fetchHubs })

  // Solo productos efectivamente en stock del centro.
  const stocked = stock.filter((r) => r.productId && r.quantity > 0)
  const byProduct = Object.fromEntries(stocked.map((r) => [r.productId as string, r]))

  const mut = useMutation({
    mutationFn: createLote,
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
    mut.mutate({ hubOrigenId: hub.id, hubDestinoId: hubDestinoId || undefined, nota: nota || undefined, items: validItems })
  }

  // ZODI_SENDER reparte desde su base de salida hacia centros DESTINATION
  // (puntos de llegada). El resto de coordinadores envían su carga hacia las
  // bases de salida (DISPATCH) para que ZODI la despache.
  const destinoTipo: HubType = user?.role === 'ZODI_SENDER' ? 'DESTINATION' : 'DISPATCH'
  const destinos = hubs.filter((h) => h.id !== hub.id && h.type === destinoTipo)
  const hayDestinos = destinos.length > 0
  const destinoLabel = user?.role === 'ZODI_SENDER' ? 'Centro de destino (llegada)' : 'Base ZODI de salida'

  const snapshot = JSON.stringify({ items, hubDestinoId, nota })
  const baselineRef = useRef<string | null>(null)
  if (baselineRef.current === null) baselineRef.current = snapshot
  const isDirty = baselineRef.current !== snapshot

  return (
    <FormSheet
      title="Nuevo lote"
      size="xl"
      isDirty={isDirty}
      isSubmitting={mut.isPending}
      onClose={onClose}
      onSubmit={submit}
      footer={(requestClose) => (
        <ModalActions onCancel={requestClose} isSubmitting={mut.isPending} label="CREAR LOTE" icon={<Send className="w-4 h-4" />} />
      )}
    >
      <div className="flex flex-col gap-4">
        {errorMsg && <ErrorBanner msg={errorMsg} onDismiss={() => setErrorMsg(null)} />}

        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/50 mb-2">Productos del lote</label>
          {stocked.length === 0 ? (
            <p className="text-sm text-white/40 rounded-lg border border-dashed border-[#2B5F8E]/40 px-3 py-4 text-center">
              No hay productos en tu inventario. Sumá stock antes de armar un lote.
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

        <Field label="Nota (opcional)">
          <textarea className="coord-input min-h-[64px] resize-y" maxLength={500} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Instrucciones, fragilidad, prioridad…" />
        </Field>
      </div>
    </FormSheet>
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

function ModalActions({ onCancel, isSubmitting, label, icon }: { onCancel: () => void; isSubmitting: boolean; label: string; icon?: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={onCancel}
        className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white/70 text-sm font-semibold hover:bg-white/10 transition cursor-pointer"
      >
        Cancelar
      </button>
      <button
        type="submit"
        disabled={isSubmitting}
        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#0F2337] text-sm font-bold hover:bg-[#C8DCF0] active:scale-[0.98] transition disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
      >
        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
        {label}
      </button>
    </div>
  )
}

function InputStyles() {
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
