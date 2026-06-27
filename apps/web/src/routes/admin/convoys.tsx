import { createFileRoute, Navigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo, useRef, useState } from 'react'
import {
  Plus,
  X,
  Loader2,
  AlertTriangle,
  Truck,
  ShieldUser,
  Send,
  CheckCircle2,
  Ban,
  ArrowRight,
  MapPin,
} from 'lucide-react'
import type {
  PublicConvoy,
  ConvoyStatus,
  PublicHub,
  PublicVehicle,
  PublicEscort,
  CreateConvoyRequest,
} from '@sos/shared'
import { useAuth } from '@/lib/auth/auth-context'
import { hasAnyRole, ROLES_MANAGE_CONVOYS } from '@/lib/session'
import { API_URL } from '@/lib/auth/config'
import { getToken } from '@/lib/auth/token-store'
import { FormSheet } from '@/components/ui/form-sheet'

export const Route = createFileRoute('/admin/convoys')({ component: ConvoysGate })

function ConvoysGate() {
  const { user } = useAuth()
  if (!hasAnyRole(user, ...ROLES_MANAGE_CONVOYS)) return <Navigate to="/admin" />
  return <AdminConvoysPage />
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function authHeaders(): HeadersInit {
  const token = getToken()
  const base: HeadersInit = { 'Content-Type': 'application/json' }
  return token ? { ...base, Authorization: `Bearer ${token}` } : base
}

async function readError(res: Response, fallback: string): Promise<string> {
  const body = (await res.json().catch(() => null)) as { error?: string } | null
  return body?.error ?? fallback
}

const STATUS_LABELS: Record<ConvoyStatus, string> = {
  PLANIFICADO: 'Planificada',
  EN_RUTA: 'En ruta',
  ENTREGADO: 'Entregada',
  CANCELADO: 'Cancelada',
}

const STATUS_COLORS: Record<ConvoyStatus, string> = {
  PLANIFICADO: 'text-sky-300 bg-sky-400/10',
  EN_RUTA: 'text-amber-300 bg-amber-400/10',
  ENTREGADO: 'text-emerald-300 bg-emerald-400/10',
  CANCELADO: 'text-red-300 bg-red-400/10',
}

// ─── API ──────────────────────────────────────────────────────────────────────

async function fetchConvoys(status: ConvoyStatus | 'TODAS'): Promise<PublicConvoy[]> {
  const qs = status === 'TODAS' ? '' : `?status=${status}`
  const res = await fetch(`${API_URL}/convoys${qs}`, { headers: authHeaders() })
  if (!res.ok) throw new Error('No se pudieron cargar las caravanas')
  return (await res.json()).convoys
}
async function fetchHubs(): Promise<PublicHub[]> {
  const res = await fetch(`${API_URL}/resources/hubs`, { headers: authHeaders() })
  if (!res.ok) throw new Error('No se pudieron cargar los centros')
  return (await res.json()).hubs
}
async function fetchVehicles(): Promise<PublicVehicle[]> {
  const res = await fetch(`${API_URL}/fleet/vehicles`, { headers: authHeaders() })
  if (!res.ok) throw new Error('No se pudieron cargar los vehículos')
  return (await res.json()).vehicles
}

async function planConvoy(d: CreateConvoyRequest): Promise<PublicConvoy> {
  const res = await fetch(`${API_URL}/convoys`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(d) })
  if (!res.ok) throw new Error(await readError(res, 'No se pudo planificar la caravana'))
  return (await res.json()).convoy
}
async function transitionConvoy(id: string, action: 'dispatch' | 'complete' | 'cancel'): Promise<PublicConvoy> {
  const res = await fetch(`${API_URL}/convoys/${id}/${action}`, { method: 'POST', headers: authHeaders() })
  if (!res.ok) throw new Error(await readError(res, 'No se pudo actualizar la caravana'))
  return (await res.json()).convoy
}
async function addVehicleToConvoy(id: string, vehicleId: string): Promise<PublicConvoy> {
  const res = await fetch(`${API_URL}/convoys/${id}/vehicles`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ vehicleId }) })
  if (!res.ok) throw new Error(await readError(res, 'No se pudo agregar el vehículo'))
  return (await res.json()).convoy
}

// ─── Página principal ─────────────────────────────────────────────────────────

const FILTERS: { id: ConvoyStatus | 'TODAS'; label: string }[] = [
  { id: 'TODAS', label: 'Todas' },
  { id: 'PLANIFICADO', label: 'Planificadas' },
  { id: 'EN_RUTA', label: 'En ruta' },
  { id: 'ENTREGADO', label: 'Entregadas' },
  { id: 'CANCELADO', label: 'Canceladas' },
]

function AdminConvoysPage() {
  const qc = useQueryClient()
  const [filter, setFilter] = useState<ConvoyStatus | 'TODAS'>('TODAS')
  const [planning, setPlanning] = useState(false)
  const [addingTo, setAddingTo] = useState<PublicConvoy | null>(null)
  const [cancelling, setCancelling] = useState<PublicConvoy | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const { data: convoys = [], isLoading } = useQuery({ queryKey: ['convoys', filter], queryFn: () => fetchConvoys(filter) })
  const { data: hubs = [] } = useQuery({ queryKey: ['convoy-hubs'], queryFn: fetchHubs })
  const { data: vehicles = [] } = useQuery({ queryKey: ['convoy-vehicles'], queryFn: fetchVehicles })
  const hubsMap = useMemo(() => Object.fromEntries(hubs.map((h) => [h.id, h.name])), [hubs])
  const vehiclesMap = useMemo(() => Object.fromEntries(vehicles.map((v) => [v.id, v.placa])), [vehicles])

  const invalidate = () => qc.invalidateQueries({ queryKey: ['convoys'] })
  const onError = (e: Error) => setErrorMsg(e.message)

  const planMut = useMutation({ mutationFn: planConvoy, onSuccess: () => { invalidate(); setPlanning(false); setErrorMsg(null) }, onError })
  const dispatchMut = useMutation({ mutationFn: (id: string) => transitionConvoy(id, 'dispatch'), onSuccess: invalidate, onError })
  const completeMut = useMutation({ mutationFn: (id: string) => transitionConvoy(id, 'complete'), onSuccess: invalidate, onError })
  const cancelMut = useMutation({ mutationFn: (id: string) => transitionConvoy(id, 'cancel'), onSuccess: () => { invalidate(); setCancelling(null) }, onError })
  const addVehicleMut = useMutation({
    mutationFn: ({ id, vehicleId }: { id: string; vehicleId: string }) => addVehicleToConvoy(id, vehicleId),
    onSuccess: () => { invalidate(); setAddingTo(null); setErrorMsg(null) },
    onError,
  })

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-6xl mx-auto lg:mx-0">
      <div className="mb-6 sm:mb-8">
        <span className="text-[11px] font-bold text-[#C8DCF0]/60 uppercase tracking-[0.15em]">Coordinación ZODI</span>
        <h1
          style={{ fontFamily: "'Barlow Condensed', sans-serif", fontStyle: 'italic', fontWeight: 800, fontSize: 'clamp(2rem, 4vw, 3rem)', lineHeight: 1 }}
          className="text-white mt-1"
        >
          CARAVANAS
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
          <span className="tabular-nums">{convoys.length}</span> {convoys.length === 1 ? 'caravana' : 'caravanas'}
        </p>
        <button
          onClick={() => { setPlanning(true); setErrorMsg(null) }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-[#0F2337] font-bold shadow-[0_4px_16px_rgba(255,255,255,0.15)] hover:shadow-[0_8px_24px_rgba(255,255,255,0.25)] active:scale-[0.96] transition-[transform,box-shadow]"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", fontStyle: 'italic' }}
        >
          <Plus className="w-4 h-4" strokeWidth={3} />
          NUEVA CARAVANA
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
      ) : convoys.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-white/40">
          <Truck className="w-10 h-10 text-white/20" />
          <p className="text-sm">No hay caravanas {filter !== 'TODAS' ? STATUS_LABELS[filter].toLowerCase() : 'registradas'}</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-[#2B5F8E]/40 bg-[#152D46]/60 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2B5F8E]/40">
                {['Ruta', 'Escolta', 'Vehículos', 'Estado', 'Acciones'].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-[#C8DCF0]/60 uppercase tracking-wider whitespace-nowrap last:text-right">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2B5F8E]/20">
              {convoys.map((c, i) => (
                <tr
                  key={c.id}
                  className="hover:bg-[#2B5F8E]/10 transition-colors convoy-row"
                  style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2 text-white whitespace-nowrap">
                      <MapPin className="w-3.5 h-3.5 text-[#C8DCF0]/50 shrink-0" />
                      <span className="font-medium">{hubsMap[c.origenId] ?? '—'}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-white/30 shrink-0" />
                      <span className="font-medium">{hubsMap[c.destinoId] ?? '—'}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2 text-white/80 whitespace-nowrap">
                      <ShieldUser className="w-3.5 h-3.5 text-[#C8DCF0]/50 shrink-0" />
                      <span>
                        {c.escoltaNombre}
                        {c.escoltaCedula && (
                          <span className="text-[#C8DCF0]/40 text-xs font-mono ml-1.5">
                            ({c.escoltaCedula})
                          </span>
                        )}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className="inline-flex items-center gap-1.5 text-white/70"
                      title={c.vehicleIds.map((id) => vehiclesMap[id] ?? id.slice(0, 8)).join(', ')}
                    >
                      <Truck className="w-3.5 h-3.5 text-[#C8DCF0]/50" />
                      <span className="tabular-nums font-semibold">{c.vehicleIds.length}</span>
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[c.status]}`}>
                      {STATUS_LABELS[c.status]}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <RowActions
                      convoy={c}
                      busy={dispatchMut.isPending || completeMut.isPending}
                      onDispatch={() => dispatchMut.mutate(c.id)}
                      onComplete={() => completeMut.mutate(c.id)}
                      onAddVehicle={() => { setAddingTo(c); setErrorMsg(null) }}
                      onCancel={() => setCancelling(c)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {planning && (
        <PlanConvoyModal
          dispatchHubs={hubs.filter((h) => h.type === 'DISPATCH' && h.status === 'ACTIVO')}
          destinationHubs={hubs.filter((h) => h.type === 'DESTINATION' && h.status === 'ACTIVO')}
          vehicles={vehicles}
          onClose={() => setPlanning(false)}
          onSubmit={(d) => planMut.mutate(d)}
          isSubmitting={planMut.isPending}
          errorMsg={errorMsg}
          onDismissError={() => setErrorMsg(null)}
        />
      )}

      {addingTo && (
        <AddVehicleModal
          convoy={addingTo}
          vehicles={vehicles.filter((v) => !addingTo.vehicleIds.includes(v.id))}
          onClose={() => setAddingTo(null)}
          onSubmit={(vehicleId) => addVehicleMut.mutate({ id: addingTo.id, vehicleId })}
          isSubmitting={addVehicleMut.isPending}
          errorMsg={errorMsg}
          onDismissError={() => setErrorMsg(null)}
        />
      )}

      {cancelling && (
        <ConfirmCancelModal
          route={`${hubsMap[cancelling.origenId] ?? '—'} → ${hubsMap[cancelling.destinoId] ?? '—'}`}
          onConfirm={() => cancelMut.mutate(cancelling.id)}
          onCancel={() => setCancelling(null)}
          isSubmitting={cancelMut.isPending}
        />
      )}

      <ConvoyStyles />
    </div>
  )
}

// ─── Acciones por fila ────────────────────────────────────────────────────────

function RowActions({ convoy, busy, onDispatch, onComplete, onAddVehicle, onCancel }: {
  convoy: PublicConvoy
  busy: boolean
  onDispatch: () => void
  onComplete: () => void
  onAddVehicle: () => void
  onCancel: () => void
}) {
  if (convoy.status === 'ENTREGADO' || convoy.status === 'CANCELADO') {
    return <span className="block text-right text-white/30">—</span>
  }
  return (
    <div className="flex items-center justify-end gap-2 whitespace-nowrap">
      {convoy.status === 'PLANIFICADO' && (
        <>
          <ActionPill icon={<Plus className="w-3.5 h-3.5" />} label="Vehículo" onClick={onAddVehicle} tone="neutral" />
          <ActionPill icon={<Send className="w-3.5 h-3.5" />} label="Despachar" onClick={onDispatch} tone="primary" disabled={busy} />
        </>
      )}
      {convoy.status === 'EN_RUTA' && (
        <ActionPill icon={<CheckCircle2 className="w-3.5 h-3.5" />} label="Completar" onClick={onComplete} tone="success" disabled={busy} />
      )}
      <ActionPill icon={<Ban className="w-3.5 h-3.5" />} label="Cancelar" onClick={onCancel} tone="danger" />
    </div>
  )
}

function ActionPill({ icon, label, onClick, tone, disabled }: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  tone: 'primary' | 'success' | 'danger' | 'neutral'
  disabled?: boolean
}) {
  const tones: Record<typeof tone, string> = {
    primary: 'text-white bg-[#2B5F8E] hover:bg-[#356da3]',
    success: 'text-emerald-200 bg-emerald-500/15 hover:bg-emerald-500/25',
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

// ─── Componentes de modal compartidos ─────────────────────────────────────────

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/70 backdrop-blur-sm convoy-backdrop">
      <div className="w-full md:max-w-md bg-[#0F2337] border border-[#2B5F8E]/50 rounded-t-2xl md:rounded-2xl max-h-[90dvh] overflow-y-auto convoy-modal">
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

// ─── Modal: Planificar caravana ───────────────────────────────────────────────

function PlanConvoyModal({ dispatchHubs, destinationHubs, vehicles, onClose, onSubmit, isSubmitting, errorMsg, onDismissError }: {
  dispatchHubs: PublicHub[]
  destinationHubs: PublicHub[]
  vehicles: PublicVehicle[]
  onClose: () => void
  onSubmit: (d: CreateConvoyRequest) => void
  isSubmitting: boolean
  errorMsg: string | null
  onDismissError: () => void
}) {
  const [origenId, setOrigenId] = useState('')
  const [destinoId, setDestinoId] = useState('')
  const [escoltaNombre, setEscoltaNombre] = useState('')
  const [escoltaCedula, setEscoltaCedula] = useState('')
  const [vehicleIds, setVehicleIds] = useState<string[]>([])

  const toggleVehicle = (id: string) =>
    setVehicleIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]))

  const canSubmit = origenId && destinoId && escoltaNombre && vehicleIds.length > 0
  const isDirty = Boolean(origenId || destinoId || escoltaNombre || escoltaCedula || vehicleIds.length)

  return (
    <FormSheet
      title="Nueva caravana"
      isDirty={isDirty}
      isSubmitting={isSubmitting}
      onClose={onClose}
      onSubmit={(e) => {
        e.preventDefault()
        if (canSubmit) {
          onSubmit({
            origenId,
            destinoId,
            escoltaNombre,
            escoltaCedula: escoltaCedula.trim() || null,
            vehicleIds,
          })
        }
      }}
      size="md"
      footer={(requestClose) => (
        <ModalActions onCancel={requestClose} isSubmitting={isSubmitting} disabled={!canSubmit} label="PLANIFICAR" />
      )}
    >
      <div className="flex flex-col gap-4">
        {errorMsg && <InlineError msg={errorMsg} onDismiss={onDismissError} />}

        <Field label="Centro de salida" hint="Solo centros de despacho">
          <select required className="convoy-input" value={origenId} onChange={(e) => setOrigenId(e.target.value)}>
            <option value="">Seleccionar origen</option>
            {dispatchHubs.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        </Field>

        <Field label="Centro de destino" hint="Solo centros de destino">
          <select required className="convoy-input" value={destinoId} onChange={(e) => setDestinoId(e.target.value)}>
            <option value="">Seleccionar destino</option>
            {destinationHubs.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        </Field>

        <Field label="Nombre del escolta">
          <input
            required
            type="text"
            className="convoy-input"
            placeholder="Ej. Juan Pérez"
            value={escoltaNombre}
            onChange={(e) => setEscoltaNombre(e.target.value)}
          />
        </Field>

        <Field label="Cédula del escolta" hint="Opcional">
          <input
            type="text"
            className="convoy-input"
            placeholder="Ej. V-12345678"
            value={escoltaCedula}
            onChange={(e) => setEscoltaCedula(e.target.value)}
          />
        </Field>

        <Field label="Vehículos" hint={`${vehicleIds.length} seleccionado${vehicleIds.length === 1 ? '' : 's'} · mínimo 1`}>
          {vehicles.length === 0 ? (
            <p className="text-sm text-white/40 py-2">No hay vehículos registrados en la flota.</p>
          ) : (
            <div className="max-h-44 overflow-y-auto rounded-lg border border-[#2B5F8E]/40 divide-y divide-[#2B5F8E]/20">
              {vehicles.map((v) => {
                const checked = vehicleIds.includes(v.id)
                return (
                  <label
                    key={v.id}
                    className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${checked ? 'bg-[#2B5F8E]/20' : 'hover:bg-white/5'}`}
                  >
                    <input type="checkbox" className="convoy-check" checked={checked} onChange={() => toggleVehicle(v.id)} />
                    <span className="font-mono font-bold text-white text-sm">{v.placa}</span>
                    <span className="text-white/50 text-xs truncate">{v.modelo}</span>
                  </label>
                )
              })}
            </div>
          )}
        </Field>

      </div>
    </FormSheet>
  )
}

// ─── Modal: Agregar vehículo ──────────────────────────────────────────────────

function AddVehicleModal({ convoy, vehicles, onClose, onSubmit, isSubmitting, errorMsg, onDismissError }: {
  convoy: PublicConvoy
  vehicles: PublicVehicle[]
  onClose: () => void
  onSubmit: (vehicleId: string) => void
  isSubmitting: boolean
  errorMsg: string | null
  onDismissError: () => void
}) {
  const [vehicleId, setVehicleId] = useState('')
  return (
    <FormSheet
      title="Agregar vehículo"
      isDirty={Boolean(vehicleId)}
      isSubmitting={isSubmitting}
      onClose={onClose}
      onSubmit={(e) => { e.preventDefault(); if (vehicleId) onSubmit(vehicleId) }}
      size="md"
      footer={(requestClose) => (
        <ModalActions onCancel={requestClose} isSubmitting={isSubmitting} disabled={!vehicleId} label="AGREGAR" />
      )}
    >
      <div className="flex flex-col gap-4">
        {errorMsg && <InlineError msg={errorMsg} onDismiss={onDismissError} />}
        <p className="text-sm text-white/50">
          La caravana tiene <span className="tabular-nums font-semibold text-white/80">{convoy.vehicleIds.length}</span> vehículo
          {convoy.vehicleIds.length === 1 ? '' : 's'}. Solo se pueden agregar mientras está planificada.
        </p>
        <Field label="Vehículo a sumar">
          {vehicles.length === 0 ? (
            <p className="text-sm text-white/40 py-2">No quedan vehículos disponibles para sumar.</p>
          ) : (
            <select required className="convoy-input" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
              <option value="">Seleccionar vehículo</option>
              {vehicles.map((v) => <option key={v.id} value={v.id}>{v.placa} — {v.modelo}</option>)}
            </select>
          )}
        </Field>
      </div>
    </FormSheet>
  )
}

// ─── Modal: Confirmar cancelación ─────────────────────────────────────────────

function ConfirmCancelModal({ route, onConfirm, onCancel, isSubmitting }: { route: string; onConfirm: () => void; onCancel: () => void; isSubmitting: boolean }) {
  return (
    <ModalShell title="Cancelar caravana" onClose={onCancel}>
      <div className="p-5 flex flex-col gap-4">
        <div className="flex items-start gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-white/80">¿Cancelar la caravana <span className="font-bold text-white">{route}</span>? Esta acción no se puede deshacer.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-[#2B5F8E]/40 text-sm text-white/60 hover:text-white transition-colors">Volver</button>
          <button onClick={onConfirm} disabled={isSubmitting} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.97] transition-transform">
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            CANCELAR CARAVANA
          </button>
        </div>
      </div>
    </ModalShell>
  )
}

// ─── Estilos locales ──────────────────────────────────────────────────────────

function ConvoyStyles() {
  return (
    <style>{`
      .convoy-input{width:100%;padding:0.6rem 0.85rem;background:rgba(255,255,255,0.04);border:1px solid rgba(43,95,142,0.4);border-radius:0.5rem;color:white;font-size:0.875rem;transition:border-color 150ms ease,background-color 150ms ease}
      .convoy-input:focus{outline:none;border-color:rgba(74,137,192,0.8);background:rgba(255,255,255,0.06)}
      .convoy-input option{background:#0F2337}
      .convoy-check{width:1rem;height:1rem;accent-color:#4A89C0;cursor:pointer}
      .convoy-row{animation:convoy-row-in 280ms cubic-bezier(0.23,1,0.32,1) both}
      .convoy-modal{animation:convoy-modal-in 220ms cubic-bezier(0.23,1,0.32,1) both}
      .convoy-backdrop{animation:convoy-fade-in 180ms ease both}
      @keyframes convoy-row-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
      @keyframes convoy-modal-in{from{opacity:0;transform:translateY(8px) scale(0.97)}to{opacity:1;transform:translateY(0) scale(1)}}
      @keyframes convoy-fade-in{from{opacity:0}to{opacity:1}}
      @media (prefers-reduced-motion: reduce){
        .convoy-row,.convoy-modal,.convoy-backdrop{animation:convoy-fade-in 180ms ease both}
      }
    `}</style>
  )
}
