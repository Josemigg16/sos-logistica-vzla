import { createFileRoute, Navigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import {
  Plus,
  X,
  Loader2,
  AlertTriangle,
  Pencil,
  ShieldCheck,
  Ban,
  MapPin,
  Flame,
} from 'lucide-react'
import type {
  PublicIncident,
  CreateIncidentRequest,
  UpdateIncidentRequest,
  PriorityName,
  IncidentStatusName,
} from '@sos/shared'
import { PRIORITIES } from '@sos/shared'
import { useAuth } from '@/lib/auth/auth-context'
import { hasAnyRole, ROLES_MANAGE_INCIDENTS } from '@/lib/session'
import { API_URL } from '@/lib/auth/config'
import { getToken } from '@/lib/auth/token-store'
import { readApiError } from '@/lib/api-errors'
import { FormSheet } from '@/components/ui/form-sheet'

export const Route = createFileRoute('/admin/incidents')({ component: IncidentsGate })

function IncidentsGate() {
  const { user } = useAuth()
  if (!hasAnyRole(user, ...ROLES_MANAGE_INCIDENTS)) return <Navigate to="/admin" />
  return <AdminIncidentsPage />
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function authHeaders(): HeadersInit {
  const token = getToken()
  const base: HeadersInit = { 'Content-Type': 'application/json' }
  return token ? { ...base, Authorization: `Bearer ${token}` } : base
}

const FIELD_LABELS: Record<string, string> = {
  title: 'Título',
  description: 'Descripción',
  type: 'Tipo',
  priority: 'Prioridad',
  zone: 'Zona',
  latitude: 'Latitud',
  longitude: 'Longitud',
  status: 'Estado',
}

const PRIORITY_LABELS: Record<PriorityName, string> = {
  CRITICAL: 'Crítica',
  HIGH: 'Alta',
  MEDIUM: 'Media',
  LOW: 'Baja',
}

const STATUS_LABELS: Record<IncidentStatusName, string> = {
  ACTIVE: 'Activa',
  CONTAINED: 'Contenida',
  CLOSED: 'Cerrada',
}

const PRIORITY_COLORS: Record<PriorityName, string> = {
  CRITICAL: 'text-red-200 bg-red-500/15',
  HIGH: 'text-orange-200 bg-orange-500/15',
  MEDIUM: 'text-amber-200 bg-amber-400/15',
  LOW: 'text-sky-200 bg-sky-400/15',
}

const STATUS_COLORS: Record<IncidentStatusName, string> = {
  ACTIVE: 'text-red-300 bg-red-400/10',
  CONTAINED: 'text-amber-300 bg-amber-400/10',
  CLOSED: 'text-white/50 bg-white/5',
}

// ─── API ──────────────────────────────────────────────────────────────────────

async function fetchIncidents(): Promise<PublicIncident[]> {
  const res = await fetch(`${API_URL}/incidents`, { headers: authHeaders() })
  if (!res.ok) throw new Error('No se pudieron cargar las emergencias')
  return ((await res.json()) as { incidents: PublicIncident[] }).incidents
}

async function createIncident(d: CreateIncidentRequest): Promise<PublicIncident> {
  const res = await fetch(`${API_URL}/incidents`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(d),
  })
  if (!res.ok) throw new Error(await readApiError(res, 'No se pudo crear la emergencia', FIELD_LABELS))
  return ((await res.json()) as { incident: PublicIncident }).incident
}

async function updateIncident(id: string, d: UpdateIncidentRequest): Promise<PublicIncident> {
  const res = await fetch(`${API_URL}/incidents/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(d),
  })
  if (!res.ok) throw new Error(await readApiError(res, 'No se pudo actualizar la emergencia', FIELD_LABELS))
  return ((await res.json()) as { incident: PublicIncident }).incident
}

// ─── Página principal ─────────────────────────────────────────────────────────

const FILTERS: { id: IncidentStatusName | 'TODAS'; label: string }[] = [
  { id: 'TODAS', label: 'Todas' },
  { id: 'ACTIVE', label: 'Activas' },
  { id: 'CONTAINED', label: 'Contenidas' },
  { id: 'CLOSED', label: 'Cerradas' },
]

function AdminIncidentsPage() {
  const qc = useQueryClient()
  const [filter, setFilter] = useState<IncidentStatusName | 'TODAS'>('TODAS')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<PublicIncident | null>(null)
  const [confirming, setConfirming] = useState<{ incident: PublicIncident; status: 'CONTAINED' | 'CLOSED' } | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const { data: incidents = [], isLoading } = useQuery({ queryKey: ['incidents'], queryFn: fetchIncidents })

  const visible = useMemo(
    () => (filter === 'TODAS' ? incidents : incidents.filter((i) => i.status === filter)),
    [incidents, filter],
  )

  const invalidate = () => qc.invalidateQueries({ queryKey: ['incidents'] })
  const onError = (e: Error) => setErrorMsg(e.message)

  const createMut = useMutation({
    mutationFn: createIncident,
    onSuccess: () => { invalidate(); setCreating(false); setErrorMsg(null) },
    onError,
  })
  const editMut = useMutation({
    mutationFn: ({ id, d }: { id: string; d: UpdateIncidentRequest }) => updateIncident(id, d),
    onSuccess: () => { invalidate(); setEditing(null); setErrorMsg(null) },
    onError,
  })
  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: IncidentStatusName }) => updateIncident(id, { status }),
    onSuccess: () => { invalidate(); setConfirming(null) },
    onError,
  })

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-6xl mx-auto lg:mx-0">
      <div className="mb-6 sm:mb-8">
        <span className="text-[11px] font-bold text-[#C8DCF0]/60 uppercase tracking-[0.15em]">Respuesta a desastres</span>
        <h1
          style={{ fontFamily: "'Barlow Condensed', sans-serif", fontStyle: 'italic', fontWeight: 800, fontSize: 'clamp(2rem, 4vw, 3rem)', lineHeight: 1 }}
          className="text-white mt-1"
        >
          EMERGENCIAS
        </h1>
      </div>

      {/* Filtros por estado */}
      <div className="flex flex-wrap gap-1 mb-6 bg-[#152D46]/60 rounded-xl p-1 border border-[#2B5F8E]/30 w-fit">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors duration-200 ${
              filter === f.id
                ? 'bg-[#2B5F8E] text-white shadow-[0_2px_8px_rgba(43,95,142,0.4)]'
                : 'text-white/50 hover:text-white hover:bg-[#2B5F8E]/20'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-white/50">
          <span className="tabular-nums">{visible.length}</span> {visible.length === 1 ? 'emergencia' : 'emergencias'}
        </p>
        <button
          onClick={() => { setCreating(true); setErrorMsg(null) }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-[#0F2337] font-bold shadow-[0_4px_16px_rgba(255,255,255,0.15)] hover:shadow-[0_8px_24px_rgba(255,255,255,0.25)] active:scale-[0.96] transition-[transform,box-shadow]"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", fontStyle: 'italic' }}
        >
          <Plus className="w-4 h-4" strokeWidth={3} />
          NUEVA EMERGENCIA
        </button>
      </div>

      {errorMsg && (
        <div className="mb-4 px-4 py-3 rounded-xl border border-white/20 bg-white/10 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-white shrink-0" />
          <span className="text-sm text-white flex-1">{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-white/60 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-white/40">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Cargando...
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-white/40">
          <Flame className="w-10 h-10 text-white/20" />
          <p className="text-sm">No hay emergencias {filter !== 'TODAS' ? STATUS_LABELS[filter].toLowerCase() + 's' : 'registradas'}</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-[#2B5F8E]/40 bg-[#152D46]/60 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2B5F8E]/40">
                {['Emergencia', 'Tipo', 'Zona', 'Prioridad', 'Estado', 'Acciones'].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-[#C8DCF0]/60 uppercase tracking-wider whitespace-nowrap last:text-right">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2B5F8E]/20">
              {visible.map((inc, i) => (
                <tr
                  key={inc.id}
                  className="hover:bg-[#2B5F8E]/10 transition-colors incident-row"
                  style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                >
                  <td className="px-5 py-3 max-w-[280px]">
                    <p className="font-medium text-white truncate">{inc.title}</p>
                    <p className="text-xs text-white/40 truncate">{inc.description}</p>
                  </td>
                  <td className="px-5 py-3 text-white/70 whitespace-nowrap">{inc.type}</td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center gap-1.5 text-white/70 whitespace-nowrap">
                      <MapPin className="w-3.5 h-3.5 text-[#C8DCF0]/50 shrink-0" />
                      {inc.zone}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${PRIORITY_COLORS[inc.priority]}`}>
                      {PRIORITY_LABELS[inc.priority]}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[inc.status]}`}>
                      {STATUS_LABELS[inc.status]}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <RowActions
                      incident={inc}
                      onEdit={() => { setEditing(inc); setErrorMsg(null) }}
                      onContain={() => setConfirming({ incident: inc, status: 'CONTAINED' })}
                      onClose={() => setConfirming({ incident: inc, status: 'CLOSED' })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creating && (
        <IncidentFormModal
          mode="create"
          onClose={() => setCreating(false)}
          onSubmit={(d) => createMut.mutate(d)}
          isSubmitting={createMut.isPending}
          errorMsg={errorMsg}
          onDismissError={() => setErrorMsg(null)}
        />
      )}

      {editing && (
        <IncidentFormModal
          mode="edit"
          incident={editing}
          onClose={() => setEditing(null)}
          onSubmit={(d) => editMut.mutate({ id: editing.id, d })}
          isSubmitting={editMut.isPending}
          errorMsg={errorMsg}
          onDismissError={() => setErrorMsg(null)}
        />
      )}

      {confirming && (
        <ConfirmStatusModal
          incident={confirming.incident}
          status={confirming.status}
          onConfirm={() => statusMut.mutate({ id: confirming.incident.id, status: confirming.status })}
          onCancel={() => setConfirming(null)}
          isSubmitting={statusMut.isPending}
        />
      )}

      <IncidentStyles />
    </div>
  )
}

// ─── Acciones por fila ────────────────────────────────────────────────────────

function RowActions({ incident, onEdit, onContain, onClose }: {
  incident: PublicIncident
  onEdit: () => void
  onContain: () => void
  onClose: () => void
}) {
  return (
    <div className="flex items-center justify-end gap-2 whitespace-nowrap">
      <ActionPill icon={<Pencil className="w-3.5 h-3.5" />} label="Editar" onClick={onEdit} tone="neutral" />
      {incident.status === 'ACTIVE' && (
        <ActionPill icon={<ShieldCheck className="w-3.5 h-3.5" />} label="Contener" onClick={onContain} tone="warning" />
      )}
      {incident.status !== 'CLOSED' && (
        <ActionPill icon={<Ban className="w-3.5 h-3.5" />} label="Cerrar" onClick={onClose} tone="danger" />
      )}
    </div>
  )
}

function ActionPill({ icon, label, onClick, tone, disabled }: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  tone: 'primary' | 'warning' | 'danger' | 'neutral'
  disabled?: boolean
}) {
  const tones: Record<typeof tone, string> = {
    primary: 'text-white bg-[#2B5F8E] hover:bg-[#356da3]',
    warning: 'text-amber-200 bg-amber-500/15 hover:bg-amber-500/25',
    danger: 'text-red-200 bg-red-500/10 hover:bg-red-500/20',
    neutral: 'text-white/70 bg-white/5 hover:bg-white/10',
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50 active:scale-[0.96] transition-[transform,background-color] duration-150 ${tones[tone]}`}
    >
      {icon}
      {label}
    </button>
  )
}

// ─── Componentes compartidos ──────────────────────────────────────────────────

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/70 backdrop-blur-sm incident-backdrop">
      <div className="w-full md:max-w-md bg-[#0F2337] border border-[#2B5F8E]/50 rounded-t-2xl md:rounded-2xl max-h-[90dvh] overflow-y-auto incident-modal">
        <div className="flex items-center justify-between p-5 border-b border-[#2B5F8E]/30 sticky top-0 bg-[#0F2337] z-10">
          <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontStyle: 'italic', fontWeight: 700 }} className="text-white text-lg">
            {title.toUpperCase()}
          </h2>
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-[#C8DCF0]/70 uppercase tracking-wide">{label}</label>
      {children}
      {hint && <span className="text-[11px] text-white/30">{hint}</span>}
    </div>
  )
}

function InlineError({ msg, onDismiss }: { msg: string; onDismiss: () => void }) {
  return (
    <div className="px-4 py-3 rounded-xl border border-white/20 bg-white/10 flex items-center gap-2">
      <AlertTriangle className="w-4 h-4 text-white shrink-0" />
      <span className="text-sm text-white flex-1">{msg}</span>
      <button type="button" onClick={onDismiss} className="text-white/60 hover:text-white"><X className="w-4 h-4" /></button>
    </div>
  )
}

function ModalActions({ onCancel, isSubmitting, label, disabled }: { onCancel: () => void; isSubmitting: boolean; label: string; disabled?: boolean }) {
  return (
    <div className="flex gap-3 pt-2">
      <button type="button" onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-[#2B5F8E]/40 text-sm text-white/60 hover:text-white hover:border-[#2B5F8E] transition-colors">
        Cancelar
      </button>
      <button type="submit" disabled={isSubmitting || disabled} className="flex-1 py-2.5 rounded-xl bg-white text-[#0F2337] font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.97] transition-transform">
        {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
        {label}
      </button>
    </div>
  )
}

// ─── Modal: Crear / Editar emergencia ─────────────────────────────────────────

function IncidentFormModal({ mode, incident, onClose, onSubmit, isSubmitting, errorMsg, onDismissError }: {
  mode: 'create' | 'edit'
  incident?: PublicIncident
  onClose: () => void
  onSubmit: (d: CreateIncidentRequest) => void
  isSubmitting: boolean
  errorMsg: string | null
  onDismissError: () => void
}) {
  const [title, setTitle] = useState(incident?.title ?? '')
  const [description, setDescription] = useState(incident?.description ?? '')
  const [type, setType] = useState(incident?.type ?? '')
  const [priority, setPriority] = useState<PriorityName>(incident?.priority ?? 'HIGH')
  const [zone, setZone] = useState(incident?.zone ?? '')
  const [latitude, setLatitude] = useState(incident ? String(incident.latitude) : '')
  const [longitude, setLongitude] = useState(incident ? String(incident.longitude) : '')

  const lat = Number(latitude)
  const lng = Number(longitude)
  const coordsValid =
    latitude.trim() !== '' && longitude.trim() !== '' &&
    !Number.isNaN(lat) && !Number.isNaN(lng) &&
    lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180

  const canSubmit =
    title.trim().length >= 3 &&
    description.trim().length >= 1 &&
    type.trim().length >= 1 &&
    zone.trim().length >= 1 &&
    coordsValid

  const isDirty =
    mode === 'create'
      ? Boolean(title || description || type || zone || latitude || longitude)
      : title !== (incident?.title ?? '') ||
        description !== (incident?.description ?? '') ||
        type !== (incident?.type ?? '') ||
        priority !== (incident?.priority ?? 'HIGH') ||
        zone !== (incident?.zone ?? '') ||
        latitude !== String(incident?.latitude ?? '') ||
        longitude !== String(incident?.longitude ?? '')

  return (
    <FormSheet
      title={mode === 'create' ? 'Nueva emergencia' : 'Editar emergencia'}
      isDirty={isDirty}
      isSubmitting={isSubmitting}
      onClose={onClose}
      onSubmit={(e) => {
        e.preventDefault()
        if (canSubmit) {
          onSubmit({
            title: title.trim(),
            description: description.trim(),
            type: type.trim(),
            priority,
            zone: zone.trim(),
            latitude: lat,
            longitude: lng,
          })
        }
      }}
      size="md"
      footer={(requestClose) => (
        <ModalActions
          onCancel={requestClose}
          isSubmitting={isSubmitting}
          disabled={!canSubmit}
          label={mode === 'create' ? 'CREAR' : 'GUARDAR'}
        />
      )}
    >
      <div className="flex flex-col gap-4">
        {errorMsg && <InlineError msg={errorMsg} onDismiss={onDismissError} />}

        <Field label="Título" hint="Mínimo 3 caracteres">
          <input
            required
            type="text"
            className="incident-input"
            placeholder="Ej. Deslave en sector El Cerro"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>

        <Field label="Descripción">
          <textarea
            required
            rows={3}
            className="incident-input resize-none"
            placeholder="Describe la situación de la emergencia"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>

        <Field label="Tipo" hint="Texto libre, p. ej. Inundación, Incendio, Sismo">
          <input
            required
            type="text"
            className="incident-input"
            placeholder="Ej. Inundación"
            value={type}
            onChange={(e) => setType(e.target.value)}
          />
        </Field>

        <Field label="Prioridad">
          <select className="incident-input" value={priority} onChange={(e) => setPriority(e.target.value as PriorityName)}>
            {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
          </select>
        </Field>

        <Field label="Zona">
          <input
            required
            type="text"
            className="incident-input"
            placeholder="Ej. Municipio Guanare"
            value={zone}
            onChange={(e) => setZone(e.target.value)}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Latitud" hint="-90 a 90">
            <input
              required
              type="number"
              step="any"
              className="incident-input"
              placeholder="9.0419"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
            />
          </Field>
          <Field label="Longitud" hint="-180 a 180">
            <input
              required
              type="number"
              step="any"
              className="incident-input"
              placeholder="-69.7320"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
            />
          </Field>
        </div>
      </div>
    </FormSheet>
  )
}

// ─── Modal: Confirmar contener / cerrar ───────────────────────────────────────

function ConfirmStatusModal({ incident, status, onConfirm, onCancel, isSubmitting }: {
  incident: PublicIncident
  status: 'CONTAINED' | 'CLOSED'
  onConfirm: () => void
  onCancel: () => void
  isSubmitting: boolean
}) {
  const isClose = status === 'CLOSED'
  const verb = isClose ? 'cerrar' : 'contener'
  const title = isClose ? 'Cerrar emergencia' : 'Contener emergencia'
  const confirmLabel = isClose ? 'CERRAR EMERGENCIA' : 'CONTENER EMERGENCIA'

  return (
    <ModalShell title={title} onClose={onCancel}>
      <div className="p-5 flex flex-col gap-4">
        <div className={`flex items-start gap-3 p-3 rounded-xl border ${isClose ? 'bg-red-500/10 border-red-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
          {isClose
            ? <Ban className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            : <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />}
          <p className="text-sm text-white/80">
            ¿Marcar la emergencia <span className="font-bold text-white">{incident.title}</span> como{' '}
            <span className="font-bold text-white">{isClose ? 'cerrada' : 'contenida'}</span>?{' '}
            {isClose && 'Dejará de mostrarse en el mapa público.'}
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-[#2B5F8E]/40 text-sm text-white/60 hover:text-white transition-colors">Volver</button>
          <button
            onClick={onConfirm}
            disabled={isSubmitting}
            className={`flex-1 py-2.5 rounded-xl font-bold text-sm text-white disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.97] transition-transform ${isClose ? 'bg-red-500' : 'bg-amber-500'}`}
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
        <p className="sr-only">{verb}</p>
      </div>
    </ModalShell>
  )
}

// ─── Estilos locales ──────────────────────────────────────────────────────────

function IncidentStyles() {
  return (
    <style>{`
      .incident-input{width:100%;padding:0.6rem 0.85rem;background:rgba(255,255,255,0.04);border:1px solid rgba(43,95,142,0.4);border-radius:0.5rem;color:white;font-size:0.875rem;transition:border-color 150ms ease,background-color 150ms ease}
      .incident-input:focus{outline:none;border-color:rgba(74,137,192,0.8);background:rgba(255,255,255,0.06)}
      .incident-input option{background:#0F2337}
      .incident-row{animation:incident-row-in 280ms cubic-bezier(0.23,1,0.32,1) both}
      .incident-modal{animation:incident-modal-in 220ms cubic-bezier(0.23,1,0.32,1) both}
      .incident-backdrop{animation:incident-fade-in 180ms ease both}
      @keyframes incident-row-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
      @keyframes incident-modal-in{from{opacity:0;transform:translateY(8px) scale(0.97)}to{opacity:1;transform:translateY(0) scale(1)}}
      @keyframes incident-fade-in{from{opacity:0}to{opacity:1}}
      @media (prefers-reduced-motion: reduce){
        .incident-row,.incident-modal,.incident-backdrop{animation:incident-fade-in 180ms ease both}
      }
    `}</style>
  )
}
