import { createFileRoute, Navigate, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useRef } from 'react'
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
  MapPin,
  Loader2,
  AlertTriangle,
  User,
  Phone,
  Layers,
} from 'lucide-react'
import { useAuth } from '@/lib/auth/auth-context'
import { hasAnyRole, ROLES_MANAGE_HUBS } from '@/lib/session'
import { useToast } from '@/components/ui/toast'
import { FormSheet } from '@/components/ui/form-sheet'
import type { Centro, HubStatus, TipoCentro } from '@sos/shared'
import { API_URL } from '@/lib/auth/config'
import { getToken } from '@/lib/auth/token-store'
import centrosData from '@/data/centros.json'
import { Map, MapControls, MapMarker } from '@/components/ui/map'

export const Route = createFileRoute('/admin/hubs')({
  component: HubsGate,
})

function HubsGate() {
  const { user } = useAuth()
  if (!hasAnyRole(user, ...ROLES_MANAGE_HUBS)) {
    return <Navigate to="/admin" />
  }
  return <AdminHubsPage />
}

// --- Constants ---
const INVENTORY_CATEGORIES = [
  'Víveres',
  'Medicamentos',
  'Higiene personal',
  'Productos de limpieza',
  'Abrigo y refugio',
  'Herramientas',
  'Artículos para bebés y grupos vulnerables',
] as const

const TIPOS_CENTRO: { value: TipoCentro; label: string; color: string }[] = [
  { value: 'acopio', label: 'Acopio Periférico', color: 'text-blue-400 border-blue-500/30 bg-blue-500/10' },
  { value: 'salida', label: 'Base ZODI (Salida)', color: 'text-red-400 border-red-500/30 bg-red-500/10' },
  { value: 'destino', label: 'Centro Destino (Llegada)', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
]

function authHeaders(): HeadersInit {
  const token = getToken()
  const base: HeadersInit = { 'Content-Type': 'application/json' }
  return token ? { ...base, Authorization: `Bearer ${token}` } : base
}

// --- API Client ---
async function fetchHubs(): Promise<Centro[]> {
  try {
    const res = await fetch(`${API_URL}/centros`)
    if (!res.ok) throw new Error('API error')
    return res.json()
  } catch {
    return centrosData as unknown as Centro[]
  }
}

async function tryFetch(input: RequestInfo, init?: RequestInit): Promise<Response | null> {
  try {
    return await fetch(input, init)
  } catch {
    return null
  }
}

async function createHub(hub: Centro): Promise<Centro> {
  const res = await tryFetch(`${API_URL}/centros`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(hub),
  })
  if (!res) throw new Error('No se pudo conectar con el servidor')
  if (!res.ok) {
    const body = await res.json().catch(() => null) as { error?: string } | null
    throw new Error(body?.error ?? 'No se pudo registrar el centro')
  }
  const data = await res.json()
  if (!data.success || !data.centro) throw new Error('Respuesta inválida del servidor')
  return data.centro
}

async function deleteHub(id: string): Promise<string> {
  await tryFetch(`${API_URL}/centros/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  return id
}

// --- Main Page Component ---
function AdminHubsPage() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<Centro | null>(null)

  const { data: hubs = [], isLoading } = useQuery({
    queryKey: ['centros'],
    queryFn: fetchHubs,
    placeholderData: centrosData as unknown as Centro[],
    staleTime: Infinity,
  })

  const createMutation = useMutation({
    mutationFn: createHub,
    onSuccess: (created) => {
      queryClient.setQueryData<Centro[]>(['centros'], (prev = []) => {
        const existingIndex = prev.findIndex((item) => item.id === created.id)
        if (existingIndex > -1) {
          return prev.map((item) => (item.id === created.id ? created : item))
        }
        return [...prev, created]
      })
      setCreating(false)
      toast.success('Centro registrado', `"${created.nombre}" está disponible en logística.`)
    },
    onError: (e: Error) => toast.error('No se pudo registrar el centro', e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteHub,
    onSuccess: (deletedId) => {
      const name = deleting?.nombre
      queryClient.setQueryData<Centro[]>(['centros'], (prev = []) =>
        prev.filter((h) => h.id !== deletedId)
      )
      setDeleting(null)
      toast.success('Centro eliminado', name ? `"${name}" fue dado de baja.` : 'Fue dado de baja.')
    },
    onError: (e: Error) => toast.error('No se pudo eliminar', e.message),
  })

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-6xl mx-auto lg:mx-0">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6 sm:mb-8 flex-wrap">
        <div>
          <span className="text-[11px] font-bold text-[#C8DCF0]/60 uppercase tracking-[0.15em] mb-2 block">
            Gestión interna
          </span>
          <h1
            className="text-white leading-[0.95] tracking-tight mb-2"
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontStyle: 'italic',
              fontWeight: 800,
              fontSize: 'clamp(2rem, 4vw, 3rem)',
            }}
          >
            LOGISTICA
          </h1>
          <p className="text-sm text-white/50 max-w-lg">
            Registra nuevos centros de acopio, bases de distribución ZODI o puntos destino, y edita sus niveles de inventario.
          </p>
        </div>

        <button
          onClick={() => setCreating(true)}
          className="group flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-[#0F2337] font-bold
                     shadow-[0_4px_16px_rgba(255,255,255,0.15)]
                     hover:shadow-[0_8px_24px_rgba(255,255,255,0.25)] hover:bg-[#C8DCF0]
                     active:scale-[0.96] transition-[transform,box-shadow,background-color] duration-200"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", fontStyle: 'italic', fontSize: '0.95rem', letterSpacing: '0.05em' }}
        >
          <Plus className="w-4 h-4" strokeWidth={3} />
          NUEVO CENTRO
        </button>
      </div>

      {/* List / Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-white/40">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Cargando...
        </div>
      ) : hubs.length === 0 ? (
        <EmptyState onCreate={() => setCreating(true)} />
      ) : (
        <div className="rounded-2xl border border-[#2B5F8E]/40 bg-[#152D46]/60 backdrop-blur-sm overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-[#2B5F8E]/40 text-[10px] font-bold text-white/40 uppercase tracking-wider">
                  <th className="px-5 py-3">Nombre</th>
                  <th className="px-5 py-3">Tipo</th>
                  <th className="px-5 py-3">Responsable / Contacto</th>
                  <th className="px-5 py-3">Ubicación</th>
                  <th className="px-5 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {hubs.map((hub) => (
                  <HubRow
                    key={hub.id}
                    hub={hub}
                    onEdit={() => navigate({ to: '/admin/hubs/$hubId', params: { hubId: hub.id } })}
                    onDelete={() => setDeleting(hub)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden flex flex-col divide-y divide-[#2B5F8E]/30">
            {hubs.map((hub) => (
              <HubMobileCard
                key={hub.id}
                hub={hub}
                onEdit={() => navigate({ to: '/admin/hubs/$hubId', params: { hubId: hub.id } })}
                onDelete={() => setDeleting(hub)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {creating && (
        <HubFormModal
          onClose={() => setCreating(false)}
          onSubmit={(newHub) => createMutation.mutate(newHub)}
          isSubmitting={createMutation.isPending}
          title="Nuevo centro de acopio"
        />
      )}

      {deleting && (
        <DeleteConfirmModal
          hub={deleting}
          onCancel={() => setDeleting(null)}
          onConfirm={() => deleteMutation.mutate(deleting.id)}
          isDeleting={deleteMutation.isPending}
        />
      )}
    </div>
  )
}

// --- Subcomponents ---

function HubRow({ hub, onEdit, onDelete }: { hub: Centro; onEdit: () => void; onDelete: () => void }) {
  const tipoInfo = TIPOS_CENTRO.find((t) => t.value === hub.tipo)

  return (
    <tr className="border-b border-[#2B5F8E]/20 last:border-b-0 hover:bg-[#2B5F8E]/15 transition-colors duration-150">
      <td className="px-5 py-4">
        <div className="font-semibold text-white text-[13px]">{hub.nombre}</div>
        <div className="text-[11px] text-white/40 mt-0.5 line-clamp-1">{hub.direccion}</div>
      </td>
      <td className="px-5 py-4">
        <div className="flex flex-col items-start gap-1">
          <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border ${tipoInfo?.color ?? ''}`}>
            {tipoInfo?.label ?? hub.tipo}
          </span>
          <div className="flex flex-wrap gap-1">
            <StatusBadge estado={hub.estado} />
            {hub.isInformal ? (
              <span className="inline-block px-2 py-0.5 rounded-md text-[9px] font-semibold uppercase tracking-wide border border-amber-500/30 bg-amber-500/10 text-amber-300">
                Informal
              </span>
            ) : (
              <span className="inline-block px-2 py-0.5 rounded-md text-[9px] font-semibold uppercase tracking-wide border border-blue-500/30 bg-blue-500/10 text-blue-300">
                Interno
              </span>
            )}
          </div>
        </div>
      </td>
      <td className="px-5 py-4">
        <div className="text-[12px] text-white/70 flex items-center gap-1">
          <User className="w-3.5 h-3.5 text-white/30 shrink-0" />
          {hub.responsable}
        </div>
        <div className="text-[10px] text-white/40 mt-0.5 flex items-center gap-1">
          <Phone className="w-3.5 h-3.5 text-white/20 shrink-0" />
          {hub.contacto}
        </div>
      </td>
      <td className="px-5 py-4 text-[11px] text-white/60 tabular-nums">
        <div className="flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5 text-white/30" />
          {hub.coordenadas[1].toFixed(5)}, {hub.coordenadas[0].toFixed(5)}
        </div>
      </td>
      <td className="px-5 py-4">
        <div className="flex items-center justify-end gap-1">
          <IconButton onClick={onEdit} label="Editar"><Pencil className="w-3.5 h-3.5" /></IconButton>
          <IconButton onClick={onDelete} label="Eliminar" variant="danger"><Trash2 className="w-3.5 h-3.5" /></IconButton>
        </div>
      </td>
    </tr>
  )
}

function HubMobileCard({ hub, onEdit, onDelete }: { hub: Centro; onEdit: () => void; onDelete: () => void }) {
  const tipoInfo = TIPOS_CENTRO.find((t) => t.value === hub.tipo)

  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-white text-sm truncate">{hub.nombre}</h3>
          <p className="text-[11px] text-white/40 line-clamp-1">{hub.direccion}</p>
        </div>
        <div className="shrink-0 flex flex-col items-end gap-1">
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border ${tipoInfo?.color ?? ''}`}>
            {tipoInfo?.label ?? hub.tipo}
          </span>
          <StatusBadge estado={hub.estado} />
          {hub.isInformal ? (
            <span className="inline-block px-2 py-0.5 rounded-md text-[9px] font-semibold uppercase tracking-wide border border-amber-500/30 bg-amber-500/10 text-amber-300">
              Informal
            </span>
          ) : (
            <span className="inline-block px-2 py-0.5 rounded-md text-[9px] font-semibold uppercase tracking-wide border border-blue-500/30 bg-blue-500/10 text-blue-300">
              Interno
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px] text-white/60 mb-3 bg-[#152D46]/40 p-2.5 rounded-lg border border-[#2B5F8E]/20">
        <div>
          <span className="text-[9px] text-white/30 uppercase tracking-wider block">Responsable</span>
          <span className="truncate block mt-0.5">{hub.responsable}</span>
        </div>
        <div>
          <span className="text-[9px] text-white/30 uppercase tracking-wider block">Coordenadas</span>
          <span className="truncate block mt-0.5 font-mono">{hub.coordenadas[1].toFixed(4)}, {hub.coordenadas[0].toFixed(4)}</span>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onEdit}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#2B5F8E]/40 border border-[#2B5F8E]/60 text-white/90 text-[11px] font-semibold hover:bg-[#2B5F8E]/60 active:scale-[0.97] transition-[transform,background-color] duration-200"
        >
          <Pencil className="w-3.5 h-3.5" /> Editar
        </button>
        <button
          onClick={onDelete}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 border border-white/15 text-white/60 text-[11px] font-semibold hover:bg-white/10 hover:text-white active:scale-[0.97] transition-[transform,background-color,color] duration-200"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center rounded-2xl border border-dashed border-[#2B5F8E]/40 bg-[#152D46]/40">
      <MapPin className="w-12 h-12 text-white/15 mb-4" />
      <h3 className="text-white font-bold text-base mb-1.5">No hay centros registrados</h3>
      <p className="text-white/40 text-xs max-w-xs mb-5">
        Crea el primer centro de acopio o base ZODI para que figure en el mapa interactivo.
      </p>
      <button
        onClick={onCreate}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-[#0F2337] font-bold text-[12px] uppercase tracking-wide active:scale-[0.96] transition-transform duration-200"
        style={{ fontFamily: "'Barlow Condensed', sans-serif", fontStyle: 'italic', letterSpacing: '0.05em' }}
      >
        <Plus className="w-4 h-4" strokeWidth={3} />
        Registrar Centro
      </button>
    </div>
  )
}

// --- Hub Form Modal ---
function HubFormModal({
  initial,
  onClose,
  onSubmit,
  isSubmitting,
  title,
}: {
  initial?: Centro
  onClose: () => void
  onSubmit: (hub: Centro) => void
  isSubmitting: boolean
  title: string
}) {
  const [nombre, setNombre] = useState(initial?.nombre ?? '')
  const [direccion, setDireccion] = useState(initial?.direccion ?? '')
  const [contacto, setContacto] = useState(initial?.contacto ?? '')
  const [responsable, setResponsable] = useState(initial?.responsable ?? '')
  const [tipo, setTipo] = useState<TipoCentro>(initial?.tipo ?? 'acopio')
  const [estado, setEstado] = useState<HubStatus>(initial?.estado ?? 'ACTIVO')
  const [isInformal, setIsInformal] = useState<boolean>(initial?.isInformal ?? false)

  // Coordenadas iniciales (centro de Portuguesa o del centro seleccionado)
  const [latitud, setLatitud] = useState<string>(initial?.coordenadas ? initial.coordenadas[1].toString() : '9.5832')
  const [longitud, setLongitud] = useState<string>(initial?.coordenadas ? initial.coordenadas[0].toString() : '-69.2216')

  // Inicializar inventario
  const [inventario, setInventario] = useState<Record<string, number>>(() => {
    const current = initial?.inventario ?? {}
    const initInv: Record<string, number> = {}
    INVENTORY_CATEGORIES.forEach((cat) => {
      initInv[cat] = current[cat] ?? 0
    })
    return initInv
  })

  // Dirty tracking: baseline capturada en el primer render (valores iniciales).
  const snapshot = JSON.stringify({ nombre, direccion, contacto, responsable, tipo, estado, latitud, longitud, inventario, isInformal })
  const baselineRef = useRef<string | null>(null)
  if (baselineRef.current === null) baselineRef.current = snapshot
  const isDirty = baselineRef.current !== snapshot

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre.trim() || !direccion.trim() || !contacto.trim() || !responsable.trim()) return

    const lat = parseFloat(latitud)
    const lng = parseFloat(longitud)
    if (isNaN(lat) || isNaN(lng)) return

    onSubmit({
      id: initial?.id ?? crypto.randomUUID(),
      nombre,
      direccion,
      contacto,
      responsable,
      tipo,
      estado,
      coordenadas: [lng, lat],
      inventario,
      isInformal,
      needs: initial?.needs ?? [],
      verificacion: initial?.verificacion,
      metadata: initial?.metadata,
    })
  }

  return (
    <FormSheet
      title={title}
      isDirty={isDirty}
      isSubmitting={isSubmitting}
      onClose={onClose}
      onSubmit={handleSubmit}
      size="xl"
      footer={(requestClose) => (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={requestClose}
            className="flex-1 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white/70 font-semibold text-sm hover:bg-white/10 active:scale-[0.97] transition-[transform,background-color] duration-200 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white text-[#0F2337] font-bold text-sm active:scale-[0.97] transition-transform duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", fontStyle: 'italic', letterSpacing: '0.04em' }}
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {initial ? 'GUARDAR CAMBIOS' : 'REGISTRAR CENTRO'}
          </button>
        </div>
      )}
    >
      <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nombre del Centro" required>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                maxLength={120}
                className="input"
                placeholder="ej. Centro de Acopio Central Portuguesa"
              />
            </Field>

            <Field label="Tipo de Centro" required>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TipoCentro)}
                className="input"
              >
                {TIPOS_CENTRO.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Tipo de Registro / Clasificación">
            <div className="flex items-center gap-6 p-4 rounded-xl border border-[#2B5F8E]/30 bg-[#152D46]/20">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="radio"
                  name="isInformal"
                  checked={!isInformal}
                  onChange={() => setIsInformal(false)}
                  className="w-4 h-4 text-blue-500 bg-white/5 border-white/20 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white uppercase tracking-wide">Interno (Con Usuario)</span>
                  <span className="text-[10px] text-white/40 mt-0.5">Requiere un coordinador con credenciales de acceso</span>
                </div>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="radio"
                  name="isInformal"
                  checked={isInformal}
                  onChange={() => setIsInformal(true)}
                  className="w-4 h-4 text-blue-500 bg-white/5 border-white/20 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white uppercase tracking-wide">Informal (Informativo)</span>
                  <span className="text-[10px] text-white/40 mt-0.5">Punto en el mapa de carácter meramente informativo</span>
                </div>
              </label>
            </div>
          </Field>

          <Field label="Estado operativo">
            <div className="grid grid-cols-2 gap-2">
              {(['ACTIVO', 'INACTIVO'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setEstado(s)}
                  className={`px-4 py-2.5 rounded-lg text-sm font-semibold border transition-colors duration-150 ${
                    estado === s
                      ? s === 'ACTIVO'
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200'
                        : 'bg-red-500/15 border-red-500/40 text-red-200'
                      : 'bg-white/5 border-[#2B5F8E]/40 text-white/50 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {s === 'ACTIVO' ? 'Activo' : 'Inactivo'}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Dirección Física" required>
            <input
              type="text"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              required
              maxLength={200}
              className="input"
              placeholder="Dirección exacta o punto de referencia"
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Coordinador / Responsable" required>
              <input
                type="text"
                value={responsable}
                onChange={(e) => setResponsable(e.target.value)}
                required
                maxLength={100}
                className="input"
                placeholder="Nombre completo"
              />
            </Field>

            <Field label="Contacto (WhatsApp / Celular)" required hint="ej. +58 412 123 4567">
              <input
                type="text"
                value={contacto}
                onChange={(e) => setContacto(e.target.value)}
                required
                maxLength={32}
                className="input"
                placeholder="+58 ..."
              />
            </Field>
          </div>

          <div className="border-t border-[#2B5F8E]/20 pt-4">
            <div className="flex items-center gap-1.5 mb-3 text-[11px] font-bold text-[#C8DCF0]/50 uppercase tracking-[0.1em]">
              <MapPin className="w-3.5 h-3.5 text-[#C8DCF0]/50" />
              Coordenadas Geográficas
            </div>
            <div className="grid grid-cols-2 gap-4 mb-3">
              <Field label="Latitud" required hint="Rango Venezuela: 0 a 13">
                <input
                  type="number"
                  step="any"
                  min="0"
                  max="15"
                  value={latitud}
                  onChange={(e) => setLatitud(e.target.value)}
                  required
                  className="input font-mono"
                  placeholder="ej. 9.5832"
                />
              </Field>

              <Field label="Longitud" required hint="Rango Venezuela: -73 a -59">
                <input
                  type="number"
                  step="any"
                  min="-75"
                  max="-55"
                  value={longitud}
                  onChange={(e) => setLongitud(e.target.value)}
                  required
                  className="input font-mono"
                  placeholder="ej. -69.2216"
                />
              </Field>
            </div>

            {/* Mapa interactivo para seleccionar coordenadas */}
            <div className="w-full h-48 rounded-lg overflow-hidden border border-[#2B5F8E]/30 relative">
              <Map
                center={[parseFloat(longitud) || -69.2216, parseFloat(latitud) || 9.5832]}
                zoom={8}
                onClick={(lngLat) => {
                  setLongitud(lngLat[0].toFixed(5))
                  setLatitud(lngLat[1].toFixed(5))
                }}
                className="w-full h-full"
              >
                <MapControls />
                <MapMarker
                  coordinates={[parseFloat(longitud) || -69.2216, parseFloat(latitud) || 9.5832]}
                  color={
                    tipo === 'salida' ? '#ef4444' :
                    tipo === 'destino' ? '#22c55e' :
                    '#3b82f6' // acopio
                  }
                  active={true}
                />
              </Map>
              <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-[#0F2337]/90 text-[10px] text-white/70 border border-[#2B5F8E]/40 pointer-events-none">
                Haz clic en el mapa para marcar la ubicación
              </div>
            </div>
          </div>

          {/* Inventario Sliders */}
          <div className="border-t border-[#2B5F8E]/20 pt-4">
            <div className="flex items-center gap-1.5 mb-3 text-[11px] font-bold text-[#C8DCF0]/50 uppercase tracking-[0.1em]">
              <Layers className="w-3.5 h-3.5 text-[#C8DCF0]/50" />
              Inventario Inicial por Categoría
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              {INVENTORY_CATEGORIES.map((cat) => (
                <div key={cat} className="flex flex-col gap-1">
                  <div className="flex justify-between text-[11px] font-medium text-white/80">
                    <span className="truncate">{cat}</span>
                    <span className="font-mono text-[#C8DCF0]">{inventario[cat]}%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={inventario[cat]}
                      onChange={(e) =>
                        setInventario({
                          ...inventario,
                          [cat]: parseInt(e.target.value, 10),
                        })
                      }
                      className="w-full accent-[#4A89C0] bg-white/10 h-1.5 rounded-lg appearance-none cursor-pointer"
                    />
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={inventario[cat]}
                      onChange={(e) => {
                        const val = Math.min(Math.max(parseInt(e.target.value, 10) || 0, 0), 100)
                        setInventario({
                          ...inventario,
                          [cat]: val,
                        })
                      }}
                      className="w-14 px-1.5 py-0.5 text-center text-xs text-white rounded bg-white/5 border border-[#2B5F8E]/40 font-mono"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

        <style>{`
          .input {
            width: 100%;
            padding: 0.6rem 0.85rem;
            background: rgba(255,255,255,0.04);
            border: 1px solid rgba(43,95,142,0.4);
            border-radius: 0.5rem;
            color: white;
            font-size: 0.875rem;
            font-family: 'DM Sans', system-ui, sans-serif;
            transition: border-color 200ms, background-color 200ms;
          }
          .input:focus {
            outline: none;
            border-color: rgba(74,137,192,0.8);
            background: rgba(255,255,255,0.06);
          }
          .input::placeholder { color: rgba(255,255,255,0.3); }
          .input option { background: #0F2337; }
        `}</style>
      </div>
    </FormSheet>
  )
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 w-full">
      <span className="text-[11px] font-semibold text-white/70 flex items-center gap-1.5">
        {label}
        {required && <span className="text-[#C8DCF0]">*</span>}
        {hint && <span className="text-[10px] font-normal text-white/40 ml-1">— {hint}</span>}
      </span>
      {children}
    </label>
  )
}

// --- Delete Confirm Modal ---
function DeleteConfirmModal({
  hub,
  onCancel,
  onConfirm,
  isDeleting,
}: {
  hub: Centro
  onCancel: () => void
  onConfirm: () => void
  isDeleting: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onCancel}>
      <div
        className="w-full max-w-sm bg-[#0F2337] border border-[#2B5F8E]/50 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/10 text-white mb-4 mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h3
          className="text-white text-center mb-2"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", fontStyle: 'italic', fontWeight: 700, fontSize: '1.3rem' }}
        >
          ¿ELIMINAR ESTE CENTRO?
        </h3>
        <p className="text-sm text-white/60 text-center mb-1">
          <span className="font-semibold text-white">{hub.nombre}</span>
        </p>
        <p className="text-xs text-white/40 text-center mb-5">
          Esta acción no se puede deshacer y el centro dejará de mostrarse en el mapa interactivo.
        </p>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white/70 font-semibold text-sm hover:bg-white/10 active:scale-[0.97] transition-[transform,background-color] duration-200"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-white text-[#0F2337] font-bold text-sm active:scale-[0.97] transition-transform duration-200 disabled:opacity-50"
          >
            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Eliminar
          </button>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ estado }: { estado?: HubStatus }) {
  const active = estado !== 'INACTIVO'
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border ${
        active
          ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10'
          : 'text-red-300 border-red-500/30 bg-red-500/10'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-400' : 'bg-red-400'}`} />
      {active ? 'Activo' : 'Inactivo'}
    </span>
  )
}

function IconButton({
  onClick,
  label,
  children,
  variant = 'default',
}: {
  onClick: () => void
  label: string
  children: React.ReactNode
  variant?: 'default' | 'danger'
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex items-center justify-center w-8 h-8 rounded-lg active:scale-[0.96] transition-[transform,background-color,color] duration-200 ${
        variant === 'danger'
          ? 'text-white/40 hover:text-white hover:bg-white/10'
          : 'text-[#C8DCF0]/70 hover:text-[#C8DCF0] hover:bg-[#2B5F8E]/40'
      }`}
    >
      {children}
    </button>
  )
}
