import { createFileRoute, Navigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect, useMemo } from 'react'
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
  CalendarClock,
  Package,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  MapPin,
  ChevronDown,
} from 'lucide-react'
import { useAuth } from '@/lib/auth/auth-context'
import { hasAnyRole, ROLES_MANAGE_NEEDS } from '@/lib/session'
import { type ProductMaster } from '@sos/shared'

export const Route = createFileRoute('/admin/needs')({
  component: NeedsGate,
})

function NeedsGate() {
  const { user } = useAuth()
  if (!hasAnyRole(user, ...ROLES_MANAGE_NEEDS)) {
    return <Navigate to="/admin" />
  }
  return <AdminNeedsPage />
}

// --- Types ---
type Priority = 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA'

interface Need {
  id: string
  hubId: string
  hubName: string
  productId: string
  nombre: string
  categoria: string
  unidad: string
  meta: number
  recibido: number
  prioridad: Priority
  descripcion: string
  ultimaActualizacion: string
  fechaNecesidad: string
}

type NeedDraft = Omit<Need, 'id' | 'ultimaActualizacion' | 'hubName' | 'productId'> & {
  hubId: string
}

const CATEGORIES = [
  'Víveres',
  'Medicamentos',
  'Higiene personal',
  'Productos de limpieza',
  'Abrigo y refugio',
  'Herramientas',
  'Artículos para bebés y grupos vulnerables',
] as const

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 'CRITICA', label: 'Crítica' },
  { value: 'ALTA', label: 'Alta' },
  { value: 'MEDIA', label: 'Media' },
  { value: 'BAJA', label: 'Baja' },
]

const PRIORITY_STYLES: Record<Priority, string> = {
  CRITICA: 'bg-white text-[#0F2337] border-white',
  ALTA: 'bg-[#4A89C0] text-white border-[#4A89C0]',
  MEDIA: 'bg-[#2B5F8E] text-white border-[#2B5F8E]',
  BAJA: 'bg-[#152D46] text-[#C8DCF0] border-[#2B5F8E]/40',
}

function todayIso(): string {
  return new Date().toISOString().split('T')[0]
}

function getPct(received: number, goal: number) {
  return Math.min(Math.round((received / goal) * 100), 100)
}

// --- API client ---
import { API_URL } from '@/lib/auth/config'
import { getToken } from '@/lib/auth/token-store'

function authHeaders(): HeadersInit {
  const token = getToken()
  const base: HeadersInit = { 'Content-Type': 'application/json' }
  return token ? { ...base, Authorization: `Bearer ${token}` } : base
}

async function fetchNeeds(): Promise<Need[]> {
  const res = await fetch(`${API_URL}/needs`)
  if (!res.ok) throw new Error('No se pudieron cargar las necesidades')
  return res.json()
}

async function createNeed(draft: NeedDraft): Promise<Need> {
  const res = await fetch(`${API_URL}/needs`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(draft),
  })
  if (!res.ok) throw new Error('No se pudo crear la necesidad')
  return res.json()
}

async function updateNeed(id: string, draft: NeedDraft): Promise<Need> {
  const res = await fetch(`${API_URL}/needs/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(draft),
  })
  if (!res.ok) throw new Error('No se pudo actualizar la necesidad')
  return res.json()
}

async function deleteNeed(id: string): Promise<string> {
  const res = await fetch(`${API_URL}/needs/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('No se pudo eliminar la necesidad')
  return id
}

// --- Page ---
function AdminNeedsPage() {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<Need | null>(null)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<Need | null>(null)

  const { data: needs = [], isLoading } = useQuery({
    queryKey: ['necesidades'],
    queryFn: fetchNeeds,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['necesidades'] })

  const createMutation = useMutation({
    mutationFn: createNeed,
    onSuccess: () => { invalidate(); setCreating(false) },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, draft }: { id: string; draft: NeedDraft }) => updateNeed(id, draft),
    onSuccess: () => { invalidate(); setEditing(null) },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteNeed,
    onSuccess: () => { invalidate(); setDeleting(null) },
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
            NECESIDADES ACTIVAS
          </h1>
          <p className="text-sm text-white/50 max-w-lg">
            Crea, edita o cierra los requerimientos que la ciudadanía ve en el panel público.
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
          NUEVA NECESIDAD
        </button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-white/40">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Cargando...
        </div>
      ) : needs.length === 0 ? (
        <EmptyState onCreate={() => setCreating(true)} />
      ) : (
        <div className="rounded-2xl border border-[#2B5F8E]/40 bg-[#152D46]/60 backdrop-blur-sm overflow-hidden">
          {/* Desktop table — only on wide screens */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2B5F8E]/40 text-[10px] font-bold text-white/40 uppercase tracking-wider">
                  <th className="text-left px-5 py-3">Ítem</th>
                  <th className="text-left px-5 py-3">Centro</th>
                  <th className="text-left px-5 py-3">Categoría</th>
                  <th className="text-left px-5 py-3">Prioridad</th>
                  <th className="text-left px-5 py-3">Fecha</th>
                  <th className="text-left px-5 py-3">Progreso</th>
                  <th className="text-right px-5 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {needs.map((need) => (
                  <NeedRow
                    key={need.id}
                    need={need}
                    onEdit={() => setEditing(need)}
                    onDelete={() => setDeleting(need)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards — phones & tablets */}
          <div className="lg:hidden flex flex-col divide-y divide-[#2B5F8E]/30">
            {needs.map((need) => (
              <NeedMobileCard
                key={need.id}
                need={need}
                onEdit={() => setEditing(need)}
                onDelete={() => setDeleting(need)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {creating && (
        <NeedFormModal
          onClose={() => setCreating(false)}
          onSubmit={(draft) => createMutation.mutate(draft)}
          isSubmitting={createMutation.isPending}
          title="Nueva necesidad"
        />
      )}
      {editing && (
        <NeedFormModal
          initial={editing}
          onClose={() => setEditing(null)}
          onSubmit={(draft) => updateMutation.mutate({ id: editing.id, draft })}
          isSubmitting={updateMutation.isPending}
          title="Editar necesidad"
        />
      )}
      {deleting && (
        <DeleteConfirmModal
          need={deleting}
          onCancel={() => setDeleting(null)}
          onConfirm={() => deleteMutation.mutate(deleting.id)}
          isDeleting={deleteMutation.isPending}
        />
      )}
    </div>
  )
}

// --- Row ---
function NeedRow({ need, onEdit, onDelete }: { need: Need; onEdit: () => void; onDelete: () => void }) {
  const pct = getPct(need.recibido, need.meta)
  const isCovered = pct >= 100

  return (
    <tr className="border-b border-[#2B5F8E]/20 last:border-b-0 hover:bg-[#2B5F8E]/15 transition-colors duration-150">
      <td className="px-5 py-4">
        <div className="font-semibold text-white text-[13px]">{need.nombre}</div>
        <div className="text-[11px] text-white/40 mt-0.5 line-clamp-1">{need.descripcion}</div>
      </td>
      <td className="px-5 py-4 text-[12px] text-white/70 font-medium">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-[#4A89C0] shrink-0" />
          <span>{need.hubName || 'Global'}</span>
        </div>
      </td>
      <td className="px-5 py-4 text-[12px] text-white/60">{need.categoria}</td>
      <td className="px-5 py-4">
        <span
          className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border ${PRIORITY_STYLES[need.prioridad]}`}
        >
          {PRIORITIES.find((p) => p.value === need.prioridad)?.label}
        </span>
      </td>
      <td className="px-5 py-4">
        <div className="flex items-center gap-1.5 text-[12px] text-white/70 tabular-nums">
          <CalendarClock className="w-3 h-3 text-white/40 shrink-0" />
          {new Date(need.fechaNecesidad).toLocaleDateString('es-VE', { day: 'numeric', month: 'short' })}
        </div>
      </td>
      <td className="px-5 py-4 min-w-[140px]">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className={`h-full rounded-full transition-[width] duration-500 ${isCovered ? 'bg-white' : 'bg-[#4A89C0]'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[11px] font-bold text-white tabular-nums">{pct}%</span>
          {isCovered && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-white/30 tabular-nums">
          <span>{need.recibido.toLocaleString('es-VE')}</span>
          <span>{need.meta.toLocaleString('es-VE')} {need.unidad}</span>
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

// --- Mobile card ---
function NeedMobileCard({ need, onEdit, onDelete }: { need: Need; onEdit: () => void; onDelete: () => void }) {
  const pct = getPct(need.recibido, need.meta)
  const isCovered = pct >= 100

  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-white text-sm truncate">{need.nombre}</h3>
          <div className="flex items-center gap-1 text-[10px] text-[#4A89C0] mt-0.5 mb-1 font-semibold">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{need.hubName || 'Global'}</span>
          </div>
          <p className="text-[11px] text-white/40">{need.categoria}</p>
        </div>
        <span
          className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border ${PRIORITY_STYLES[need.prioridad]}`}
        >
          {PRIORITIES.find((p) => p.value === need.prioridad)?.label}
        </span>
      </div>

      <div className="flex items-center gap-2 text-[11px] text-white/60 mb-2">
        <CalendarClock className="w-3 h-3 text-white/40" />
        <span className="tabular-nums">
          {new Date(need.fechaNecesidad).toLocaleDateString('es-VE', { day: 'numeric', month: 'short' })}
        </span>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className={`h-full rounded-full ${isCovered ? 'bg-white' : 'bg-[#4A89C0]'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-[11px] font-bold text-white tabular-nums">{pct}%</span>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onEdit}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#2B5F8E]/40 border border-[#2B5F8E]/60 text-white/90 text-[11px] font-semibold hover:bg-[#2B5F8E]/60 active:scale-[0.97] transition-[transform,background-color] duration-200"
        >
          <Pencil className="w-3 h-3" /> Editar
        </button>
        <button
          onClick={onDelete}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 border border-white/15 text-white/60 text-[11px] font-semibold hover:bg-white/10 hover:text-white active:scale-[0.97] transition-[transform,background-color,color] duration-200"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}

// --- Icon button ---
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

// --- Empty state ---
function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center rounded-2xl border border-dashed border-[#2B5F8E]/40 bg-[#152D46]/40">
      <Package className="w-12 h-12 text-white/15 mb-4" />
      <h3 className="text-white font-bold text-base mb-1.5">No hay necesidades registradas</h3>
      <p className="text-white/40 text-xs max-w-xs mb-5">
        Crea la primera necesidad para que aparezca en el panel público.
      </p>
      <button
        onClick={onCreate}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-[#0F2337] font-bold text-[12px] uppercase tracking-wide active:scale-[0.96] transition-transform duration-200"
        style={{ fontFamily: "'Barlow Condensed', sans-serif", fontStyle: 'italic', letterSpacing: '0.05em' }}
      >
        <Plus className="w-4 h-4" strokeWidth={3} />
        Crear necesidad
      </button>
    </div>
  )
}

// --- Form modal ---
function NeedFormModal({
  initial,
  onClose,
  onSubmit,
  isSubmitting,
  title,
}: {
  initial?: Need
  onClose: () => void
  onSubmit: (draft: NeedDraft) => void
  isSubmitting: boolean
  title: string
}) {
  const [draft, setDraft] = useState<NeedDraft>({
    nombre: initial?.nombre ?? '',
    categoria: initial?.categoria ?? CATEGORIES[0],
    unidad: initial?.unidad ?? '',
    meta: initial?.meta ?? 0,
    recibido: initial?.recibido ?? 0,
    prioridad: initial?.prioridad ?? 'ALTA',
    descripcion: initial?.descripcion ?? '',
    fechaNecesidad: initial?.fechaNecesidad ?? todayIso(),
    hubId: initial?.hubId ?? '',
  })

  const [showSuggestions, setShowSuggestions] = useState(false)

  const { data: centers = [] } = useQuery<any[]>({
    queryKey: ['centros'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/centros`)
      if (!res.ok) throw new Error('API error')
      return res.json()
    },
  })

  const { data: products = [] } = useQuery<ProductMaster[]>({
    queryKey: ['productos'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/productos`)
      if (!res.ok) throw new Error('Error al cargar productos')
      return res.json()
    },
  })

  const suggestions = useMemo(() => {
    if (!draft.nombre.trim()) return []
    return products.filter(
      (prod) =>
        prod.name.toLowerCase().includes(draft.nombre.toLowerCase()) &&
        prod.name.toLowerCase() !== draft.nombre.toLowerCase()
    ).slice(0, 5)
  }, [products, draft.nombre])

  const selectProduct = (prod: ProductMaster) => {
    setDraft({
      ...draft,
      nombre: prod.name,
      categoria: prod.category,
      unidad: prod.unit,
    })
    setShowSuggestions(false)
  }

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft.nombre.trim() || !draft.unidad.trim() || draft.meta <= 0) return
    onSubmit(draft)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full md:max-w-xl bg-[#0F2337] border border-[#2B5F8E]/50 rounded-t-2xl md:rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between p-5 border-b border-[#2B5F8E]/30 sticky top-0 bg-[#0F2337] z-10">
          <h2
            className="text-white"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", fontStyle: 'italic', fontWeight: 700, fontSize: '1.4rem' }}
          >
            {title.toUpperCase()}
          </h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-white/50 hover:text-white hover:bg-white/10 active:scale-[0.96] transition-[transform,background-color,color] duration-200"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          <Field label="Centro de Acopio" required>
            <div className="relative">
              <select
                value={draft.hubId}
                onChange={(e) => setDraft({ ...draft, hubId: e.target.value })}
                required
                disabled={!!initial}
                className="w-full px-3 py-2.5 rounded-xl bg-[#0F2337]/90 border border-[#2B5F8E]/40 text-xs text-white focus:outline-none focus:border-[#4A89C0]/50 appearance-none cursor-pointer"
              >
                <option value="">Selecciona el centro...</option>
                {centers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-white/40 absolute right-3 top-3.5 pointer-events-none" />
            </div>
          </Field>

          <Field label="Nombre del ítem" required hint="Escribe para buscar sugerencias en el catálogo">
            <div className="relative">
              <input
                type="text"
                value={draft.nombre}
                onChange={(e) => {
                  setDraft({ ...draft, nombre: e.target.value })
                  setShowSuggestions(true)
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => {
                  setTimeout(() => setShowSuggestions(false), 200)
                }}
                required
                maxLength={120}
                className="input"
                placeholder="ej. Agua potable"
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 mt-1 z-50 rounded-lg border border-[#2B5F8E]/50 bg-[#0F2337] shadow-xl overflow-hidden max-h-48 overflow-y-auto">
                  {suggestions.map((prod) => (
                    <button
                      key={prod.id}
                      type="button"
                      onClick={() => selectProduct(prod)}
                      className="w-full text-left px-3 py-2 text-xs text-white/80 hover:text-white hover:bg-[#2B5F8E]/40 border-b border-[#2B5F8E]/10 last:border-0 flex items-center justify-between cursor-pointer"
                    >
                      <span>{prod.name}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-white/50">
                        {prod.category} • {prod.unit}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Categoría" required>
              <select
                value={draft.categoria}
                onChange={(e) => setDraft({ ...draft, categoria: e.target.value })}
                className="input"
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>

            <Field label="Prioridad" required>
              <select
                value={draft.prioridad}
                onChange={(e) => setDraft({ ...draft, prioridad: e.target.value as Priority })}
                className="input"
              >
                {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Field label="Unidad" required>
              <input
                type="text"
                value={draft.unidad}
                onChange={(e) => setDraft({ ...draft, unidad: e.target.value })}
                required
                maxLength={32}
                className="input"
                placeholder="litros, kg…"
              />
            </Field>
            <Field label="Meta" required>
              <input
                type="number"
                min={1}
                value={draft.meta || ''}
                onChange={(e) => setDraft({ ...draft, meta: Number(e.target.value) })}
                required
                className="input tabular-nums"
              />
            </Field>
            <Field label="Recibido">
              <input
                type="number"
                min={0}
                value={draft.recibido || 0}
                onChange={(e) => setDraft({ ...draft, recibido: Number(e.target.value) })}
                className="input tabular-nums"
              />
            </Field>
          </div>

          <Field label="Fecha de necesidad" required hint="Cuándo se necesita para">
            <input
              type="date"
              value={draft.fechaNecesidad}
              onChange={(e) => setDraft({ ...draft, fechaNecesidad: e.target.value })}
              required
              className="input"
            />
          </Field>

          <Field label="Descripción" hint="Contexto visible en el panel público">
            <textarea
              value={draft.descripcion}
              onChange={(e) => setDraft({ ...draft, descripcion: e.target.value })}
              rows={3}
              maxLength={300}
              className="input resize-none"
              placeholder="Ej. Agua purificada para consumo humano en zonas sin servicio."
            />
          </Field>

          {/* Submit */}
          <div className="flex gap-2 pt-3 border-t border-[#2B5F8E]/30">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white/70 font-semibold text-sm hover:bg-white/10 active:scale-[0.97] transition-[transform,background-color] duration-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white text-[#0F2337] font-bold text-sm active:scale-[0.97] transition-transform duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", fontStyle: 'italic', letterSpacing: '0.04em' }}
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {initial ? 'GUARDAR CAMBIOS' : 'CREAR NECESIDAD'}
            </button>
          </div>
        </form>
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
  )
}

// --- Field wrapper ---
function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold text-white/70 flex items-center gap-1.5">
        {label}
        {required && <span className="text-[#C8DCF0]">*</span>}
        {hint && <span className="text-[10px] font-normal text-white/40 ml-1">— {hint}</span>}
      </span>
      {children}
    </label>
  )
}

// --- Delete confirm ---
function DeleteConfirmModal({
  need,
  onCancel,
  onConfirm,
  isDeleting,
}: {
  need: Need
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
          ¿ELIMINAR ESTA NECESIDAD?
        </h3>
        <p className="text-sm text-white/60 text-center mb-1">
          <span className="font-semibold text-white">{need.nombre}</span>
        </p>
        <p className="text-xs text-white/40 text-center mb-5">
          Esta acción no se puede deshacer. La necesidad dejará de mostrarse en el panel público.
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
