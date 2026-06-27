import { createFileRoute, Navigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  AlertTriangle,
  Truck,
  User,
  Tag,
} from 'lucide-react'
import type { PublicVehicleType, PublicVehicle, PublicDriver, VehicleStatus } from '@sos/shared'
import { useAuth } from '@/lib/auth/auth-context'
import { hasAnyRole, ROLES_MANAGE_FLEET } from '@/lib/session'
import { useToast } from '@/components/ui/toast'
import { API_URL } from '@/lib/auth/config'
import { getToken } from '@/lib/auth/token-store'
import { FormSheet } from '@/components/ui/form-sheet'
import { readApiError } from '@/lib/api-errors'

export const Route = createFileRoute('/admin/fleet')({ component: FleetGate })

function FleetGate() {
  const { user } = useAuth()
  if (!hasAnyRole(user, ...ROLES_MANAGE_FLEET)) return <Navigate to="/admin" />
  return <AdminFleetPage />
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function authHeaders(): HeadersInit {
  const token = getToken()
  const base: HeadersInit = { 'Content-Type': 'application/json' }
  return token ? { ...base, Authorization: `Bearer ${token}` } : base
}

const FLEET_FIELD_LABELS: Record<string, string> = {
  nombre: 'Nombre',
  apellido: 'Apellido',
  descripcion: 'Descripción',
  placa: 'Placa',
  modelo: 'Modelo',
  capacidadCargaKg: 'Capacidad de carga',
  tipoVehiculoId: 'Tipo de vehículo',
  choferId: 'Chofer',
  centroOrigenId: 'Centro de origen',
  estado: 'Estado',
  cedula: 'Cédula',
  licencia: 'Licencia',
  telefono: 'Teléfono',
  disponible: 'Disponibilidad',
}

const readError = (res: Response, fallback: string) => readApiError(res, fallback, FLEET_FIELD_LABELS)

const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  DISPONIBLE: 'Disponible',
  EN_RUTA: 'En ruta',
  FUERA_DE_SERVICIO: 'Fuera de servicio',
}

// ─── API: Tipos de Vehículo ───────────────────────────────────────────────────

async function fetchVehicleTypes(): Promise<PublicVehicleType[]> {
  const res = await fetch(`${API_URL}/fleet/vehicle-types`, { headers: authHeaders() })
  if (!res.ok) throw new Error('No se pudieron cargar los tipos')
  return (await res.json()).vehicleTypes
}
async function createVehicleType(d: { nombre: string; descripcion: string }): Promise<PublicVehicleType> {
  const res = await fetch(`${API_URL}/fleet/vehicle-types`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(d) })
  if (!res.ok) throw new Error(await readError(res, 'No se pudo crear'))
  return (await res.json()).vehicleType
}
async function updateVehicleType(id: string, d: { nombre?: string; descripcion?: string }): Promise<PublicVehicleType> {
  const res = await fetch(`${API_URL}/fleet/vehicle-types/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(d) })
  if (!res.ok) throw new Error(await readError(res, 'No se pudo actualizar'))
  return (await res.json()).vehicleType
}
async function deleteVehicleType(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/fleet/vehicle-types/${id}`, { method: 'DELETE', headers: authHeaders() })
  if (!res.ok) throw new Error(await readError(res, 'No se pudo eliminar'))
}

// ─── API: Vehículos ───────────────────────────────────────────────────────────

async function fetchVehicles(): Promise<PublicVehicle[]> {
  const res = await fetch(`${API_URL}/fleet/vehicles`, { headers: authHeaders() })
  if (!res.ok) throw new Error('No se pudieron cargar los vehículos')
  return (await res.json()).vehicles
}
async function createVehicle(d: { placa: string; modelo: string; capacidadCargaKg: number; tipoVehiculoId?: string }): Promise<PublicVehicle> {
  const res = await fetch(`${API_URL}/fleet/vehicles`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(d) })
  if (!res.ok) throw new Error(await readError(res, 'No se pudo crear'))
  return (await res.json()).vehicle
}
async function updateVehicle(id: string, d: { modelo?: string; estado?: VehicleStatus; choferId?: string | null }): Promise<PublicVehicle> {
  const res = await fetch(`${API_URL}/fleet/vehicles/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(d) })
  if (!res.ok) throw new Error(await readError(res, 'No se pudo actualizar'))
  return (await res.json()).vehicle
}
async function deleteVehicle(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/fleet/vehicles/${id}`, { method: 'DELETE', headers: authHeaders() })
  if (!res.ok) throw new Error(await readError(res, 'No se pudo eliminar'))
}

// ─── API: Choferes ────────────────────────────────────────────────────────────

async function fetchDrivers(): Promise<PublicDriver[]> {
  const res = await fetch(`${API_URL}/fleet/drivers`, { headers: authHeaders() })
  if (!res.ok) throw new Error('No se pudieron cargar los choferes')
  return (await res.json()).drivers
}
async function createDriver(d: { nombre: string; apellido: string; cedula: string; licencia: string; telefono: string }): Promise<PublicDriver> {
  const res = await fetch(`${API_URL}/fleet/drivers`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(d) })
  if (!res.ok) throw new Error(await readError(res, 'No se pudo crear'))
  return (await res.json()).driver
}
async function updateDriver(id: string, d: { nombre?: string; apellido?: string; licencia?: string; telefono?: string; disponible?: boolean }): Promise<PublicDriver> {
  const res = await fetch(`${API_URL}/fleet/drivers/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(d) })
  if (!res.ok) throw new Error(await readError(res, 'No se pudo actualizar'))
  return (await res.json()).driver
}
async function deleteDriver(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/fleet/drivers/${id}`, { method: 'DELETE', headers: authHeaders() })
  if (!res.ok) throw new Error(await readError(res, 'No se pudo eliminar'))
}

// ─── Página principal ─────────────────────────────────────────────────────────

type Tab = 'vehicle-types' | 'vehicles' | 'drivers'

function AdminFleetPage() {
  const [tab, setTab] = useState<Tab>('vehicles')

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-6xl mx-auto lg:mx-0">
      <div className="mb-6 sm:mb-8">
        <span className="text-[11px] font-bold text-[#C8DCF0]/60 uppercase tracking-[0.15em]">
          Gestión interna
        </span>
        <h1
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontStyle: 'italic',
            fontWeight: 800,
            fontSize: 'clamp(2rem, 4vw, 3rem)',
            lineHeight: 1,
          }}
          className="text-white mt-1"
        >
          FLOTA
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-[#152D46]/60 rounded-xl p-1 border border-[#2B5F8E]/30 w-fit">
        {([
          // CRUD de tipos de vehículos deshabilitado: el tipo de vehículo es fijo
          // y es sembrado por la base de datos como "Carga y Transporte" para toda la flota de carga.
          // { id: 'vehicle-types', label: 'Tipos', icon: <Tag className="w-3.5 h-3.5" /> },
          { id: 'vehicles', label: 'Vehículos', icon: <Truck className="w-3.5 h-3.5" /> },
          { id: 'drivers', label: 'Choferes', icon: <User className="w-3.5 h-3.5" /> },
        ] as { id: Tab; label: string; icon: React.ReactNode }[]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              tab === t.id
                ? 'bg-[#2B5F8E] text-white shadow-[0_2px_8px_rgba(43,95,142,0.4)]'
                : 'text-white/50 hover:text-white hover:bg-[#2B5F8E]/20'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* {tab === 'vehicle-types' && <VehicleTypesTab />} */}
      {tab === 'vehicles' && <VehiclesTab />}
      {tab === 'drivers' && <DriversTab />}

      <FleetStyles />
    </div>
  )
}

function FleetStyles() {
  return (
    <style>{`.fleet-input{width:100%;padding:0.6rem 0.85rem;background:rgba(255,255,255,0.04);border:1px solid rgba(43,95,142,0.4);border-radius:0.5rem;color:white;font-size:0.875rem}.fleet-input:focus{outline:none;border-color:rgba(74,137,192,0.8);background:rgba(255,255,255,0.06)}.fleet-input option{background:#0F2337}`}</style>
  )
}

// ─── Shared UI components ─────────────────────────────────────────────────────

function ErrorBanner({ msg, onDismiss }: { msg: string; onDismiss: () => void }) {
  return (
    <div className="mb-4 px-4 py-3 rounded-xl border border-white/20 bg-white/10 flex items-center gap-2">
      <AlertTriangle className="w-4 h-4 text-white shrink-0" />
      <span className="text-sm text-white flex-1">{msg}</span>
      <button onClick={onDismiss} className="text-white/60 hover:text-white">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

function LoadingRows() {
  return (
    <div className="flex items-center justify-center py-20 text-white/40">
      <Loader2 className="w-6 h-6 animate-spin mr-2" />
      Cargando...
    </div>
  )
}

function EmptyRow({ label, onCreate }: { label: string; onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-white/40">
      <p className="text-sm">No hay {label} registrados</p>
      <button
        onClick={onCreate}
        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#2B5F8E]/40 text-sm text-white/60 hover:text-white hover:border-[#2B5F8E] transition-colors"
      >
        <Plus className="w-4 h-4" />
        Agregar {label}
      </button>
    </div>
  )
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-[#0F2337] font-bold shadow-[0_4px_16px_rgba(255,255,255,0.15)] hover:shadow-[0_8px_24px_rgba(255,255,255,0.25)] active:scale-[0.96] transition-all"
      style={{ fontFamily: "'Barlow Condensed', sans-serif", fontStyle: 'italic' }}
    >
      <Plus className="w-4 h-4" strokeWidth={3} />
      {label}
    </button>
  )
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full md:max-w-md bg-[#0F2337] border border-[#2B5F8E]/50 rounded-t-2xl md:rounded-2xl max-h-[90dvh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-[#2B5F8E]/30 sticky top-0 bg-[#0F2337]">
          <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontStyle: 'italic', fontWeight: 700 }} className="text-white text-lg">
            {title.toUpperCase()}
          </h2>
          <button onClick={onClose} className="text-white/50 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
        <style>{`.fleet-input{width:100%;padding:0.6rem 0.85rem;background:rgba(255,255,255,0.04);border:1px solid rgba(43,95,142,0.4);border-radius:0.5rem;color:white;font-size:0.875rem}.fleet-input:focus{outline:none;border-color:rgba(74,137,192,0.8);background:rgba(255,255,255,0.06)}.fleet-input option{background:#0F2337}`}</style>
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

function ModalActions({ onCancel, isSubmitting, label = 'GUARDAR' }: { onCancel: () => void; isSubmitting: boolean; label?: string }) {
  return (
    <div className="flex gap-3 pt-2">
      <button type="button" onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-[#2B5F8E]/40 text-sm text-white/60 hover:text-white hover:border-[#2B5F8E] transition-colors">
        Cancelar
      </button>
      <button type="submit" disabled={isSubmitting} className="flex-1 py-2.5 rounded-xl bg-white text-[#0F2337] font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.97] transition-transform">
        {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
        {label}
      </button>
    </div>
  )
}

function DeleteConfirm({ name, onConfirm, onCancel, isSubmitting }: { name: string; onConfirm: () => void; onCancel: () => void; isSubmitting: boolean }) {
  return (
    <ModalShell title="Confirmar eliminación" onClose={onCancel}>
      <div className="p-5 flex flex-col gap-4">
        <div className="flex items-start gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-white/80">¿Eliminar <span className="font-bold text-white">{name}</span>? Esta acción no se puede deshacer.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-[#2B5F8E]/40 text-sm text-white/60 hover:text-white transition-colors">Cancelar</button>
          <button onClick={onConfirm} disabled={isSubmitting} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.97] transition-transform">
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            ELIMINAR
          </button>
        </div>
      </div>
    </ModalShell>
  )
}

function TableShell({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#2B5F8E]/40 bg-[#152D46]/60 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#2B5F8E]/40">
            {headers.map((h) => (
              <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-[#C8DCF0]/60 uppercase tracking-wider first:rounded-tl-2xl last:rounded-tr-2xl">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#2B5F8E]/20">{children}</tbody>
      </table>
    </div>
  )
}

function ActionButtons({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-center justify-end gap-1">
      <button onClick={onEdit} className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-[#2B5F8E]/30 transition-colors" title="Editar">
        <Pencil className="w-3.5 h-3.5" />
      </button>
      <button onClick={onDelete} className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Eliminar">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// ─── Tab: Tipos de Vehículo ───────────────────────────────────────────────────

function VehicleTypesTab() {
  const qc = useQueryClient()
  const toast = useToast()
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<PublicVehicleType | null>(null)
  const [deleting, setDeleting] = useState<PublicVehicleType | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const { data: types = [], isLoading } = useQuery({ queryKey: ['fleet-vehicle-types'], queryFn: fetchVehicleTypes })

  const closeAll = () => { qc.invalidateQueries({ queryKey: ['fleet-vehicle-types'] }); setCreating(false); setEditing(null); setErrorMsg(null) }
  const onError = (e: Error) => { setErrorMsg(e.message); toast.error('Hubo un problema', e.message) }

  const createMut = useMutation({
    mutationFn: createVehicleType,
    onSuccess: (t) => { closeAll(); toast.success('Tipo creado', `"${t.nombre}" se agregó a la flota.`) },
    onError,
  })
  const updateMut = useMutation({
    mutationFn: ({ id, d }: { id: string; d: { nombre?: string; descripcion?: string } }) => updateVehicleType(id, d),
    onSuccess: (t) => { closeAll(); toast.success('Tipo actualizado', `Se guardaron los cambios de "${t.nombre}".`) },
    onError,
  })
  const deleteMut = useMutation({
    mutationFn: deleteVehicleType,
    onSuccess: () => {
      const name = deleting?.nombre
      qc.invalidateQueries({ queryKey: ['fleet-vehicle-types'] })
      setDeleting(null)
      toast.success('Tipo eliminado', name ? `"${name}" fue dado de baja.` : 'Fue dado de baja.')
    },
    onError,
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-white/50">{types.length} tipos registrados</p>
        <AddButton label="NUEVO TIPO" onClick={() => { setCreating(true); setErrorMsg(null) }} />
      </div>

      {errorMsg && <ErrorBanner msg={errorMsg} onDismiss={() => setErrorMsg(null)} />}

      {isLoading ? <LoadingRows /> : types.length === 0 ? (
        <EmptyRow label="tipos de vehículo" onCreate={() => setCreating(true)} />
      ) : (
        <TableShell headers={['Nombre', 'Descripción', 'Acciones']}>
          {types.map((t) => (
            <tr key={t.id} className="hover:bg-[#2B5F8E]/10 transition-colors">
              <td className="px-5 py-3 font-medium text-white">{t.nombre}</td>
              <td className="px-5 py-3 text-white/60">{t.descripcion || '—'}</td>
              <td className="px-5 py-3"><ActionButtons onEdit={() => { setEditing(t); setErrorMsg(null) }} onDelete={() => setDeleting(t)} /></td>
            </tr>
          ))}
        </TableShell>
      )}

      {creating && <VehicleTypeModal title="Nuevo tipo" onClose={() => setCreating(false)} onSubmit={(d) => createMut.mutate(d)} isSubmitting={createMut.isPending} errorMsg={errorMsg} onDismissError={() => setErrorMsg(null)} />}
      {editing && <VehicleTypeModal title="Editar tipo" initial={editing} onClose={() => setEditing(null)} onSubmit={(d) => updateMut.mutate({ id: editing.id, d })} isSubmitting={updateMut.isPending} errorMsg={errorMsg} onDismissError={() => setErrorMsg(null)} />}
      {deleting && <DeleteConfirm name={deleting.nombre} onConfirm={() => deleteMut.mutate(deleting.id)} onCancel={() => setDeleting(null)} isSubmitting={deleteMut.isPending} />}
    </div>
  )
}

function VehicleTypeModal({ title, initial, onClose, onSubmit, isSubmitting, errorMsg, onDismissError }: {
  title: string; initial?: PublicVehicleType; onClose: () => void
  onSubmit: (d: { nombre: string; descripcion: string }) => void
  isSubmitting: boolean; errorMsg: string | null; onDismissError: () => void
}) {
  const [nombre, setNombre] = useState(initial?.nombre ?? '')
  const [descripcion, setDescripcion] = useState(initial?.descripcion ?? '')

  const snapshot = JSON.stringify({ nombre, descripcion })
  const baselineRef = useRef<string | null>(null)
  if (baselineRef.current === null) baselineRef.current = snapshot
  const isDirty = baselineRef.current !== snapshot

  return (
    <FormSheet
      title={title}
      isDirty={isDirty}
      isSubmitting={isSubmitting}
      onClose={onClose}
      onSubmit={(e) => { e.preventDefault(); onSubmit({ nombre, descripcion }) }}
      size="md"
      footer={(requestClose) => (
        <ModalActions onCancel={requestClose} isSubmitting={isSubmitting} label={initial ? 'GUARDAR' : 'CREAR'} />
      )}
    >
      <div className="flex flex-col gap-4">
        {errorMsg && <ErrorBanner msg={errorMsg} onDismiss={onDismissError} />}
        <Field label="Nombre" hint="ej: Camión, Camioneta, Furgón">
          <input required className="fleet-input" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre del tipo" />
        </Field>
        <Field label="Descripción">
          <input className="fleet-input" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Descripción opcional" />
        </Field>
      </div>
    </FormSheet>
  )
}

// ─── Tab: Vehículos ───────────────────────────────────────────────────────────

function VehiclesTab() {
  const qc = useQueryClient()
  const toast = useToast()
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<PublicVehicle | null>(null)
  const [deleting, setDeleting] = useState<PublicVehicle | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const { data: vehicles = [], isLoading } = useQuery({ queryKey: ['fleet-vehicles'], queryFn: fetchVehicles })
  const { data: types = [] } = useQuery({ queryKey: ['fleet-vehicle-types'], queryFn: fetchVehicleTypes })
  const { data: drivers = [] } = useQuery({ queryKey: ['fleet-drivers'], queryFn: fetchDrivers })

  const closeAll = () => { qc.invalidateQueries({ queryKey: ['fleet-vehicles'] }); setCreating(false); setEditing(null); setErrorMsg(null) }
  const onError = (e: Error) => { setErrorMsg(e.message); toast.error('Hubo un problema', e.message) }

  const createMut = useMutation({
    mutationFn: createVehicle,
    onSuccess: (v) => { closeAll(); toast.success('Vehículo registrado', `"${v.placa}" se sumó a la flota.`) },
    onError,
  })
  const updateMut = useMutation({
    mutationFn: ({ id, d }: { id: string; d: Parameters<typeof updateVehicle>[1] }) => updateVehicle(id, d),
    onSuccess: (v) => { closeAll(); toast.success('Vehículo actualizado', `Se guardaron los cambios de "${v.placa}".`) },
    onError,
  })
  const deleteMut = useMutation({
    mutationFn: deleteVehicle,
    onSuccess: () => {
      const placa = deleting?.placa
      qc.invalidateQueries({ queryKey: ['fleet-vehicles'] })
      setDeleting(null)
      toast.success('Vehículo eliminado', placa ? `"${placa}" fue dado de baja.` : 'Fue dado de baja.')
    },
    onError,
  })

  const typesMap = Object.fromEntries(types.map((t) => [t.id, t.nombre]))
  const driversMap = Object.fromEntries(drivers.map((d) => [d.id, `${d.nombre} ${d.apellido}`]))

  const STATUS_COLORS: Record<VehicleStatus, string> = {
    DISPONIBLE: 'text-emerald-400 bg-emerald-400/10',
    EN_RUTA: 'text-yellow-400 bg-yellow-400/10',
    FUERA_DE_SERVICIO: 'text-red-400 bg-red-400/10',
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-white/50">{vehicles.length} vehículos registrados</p>
        <AddButton label="NUEVO VEHÍCULO" onClick={() => { setCreating(true); setErrorMsg(null) }} />
      </div>

      {errorMsg && <ErrorBanner msg={errorMsg} onDismiss={() => setErrorMsg(null)} />}

      {isLoading ? <LoadingRows /> : vehicles.length === 0 ? (
        <EmptyRow label="vehículos" onCreate={() => setCreating(true)} />
      ) : (
        <TableShell headers={['Placa', 'Modelo', 'Tipo', 'Capacidad', 'Chofer', 'Estado', 'Acciones']}>
          {vehicles.map((v) => (
            <tr key={v.id} className="hover:bg-[#2B5F8E]/10 transition-colors">
              <td className="px-5 py-3 font-mono font-bold text-white">{v.placa}</td>
              <td className="px-5 py-3 text-white/80">{v.modelo}</td>
              <td className="px-5 py-3 text-white/60">{v.tipoVehiculoId ? typesMap[v.tipoVehiculoId] ?? '—' : '—'}</td>
              <td className="px-5 py-3 text-white/60">{v.capacidadCargaKg} kg</td>
              <td className="px-5 py-3 text-white/60">{v.choferId ? driversMap[v.choferId] ?? '—' : '—'}</td>
              <td className="px-5 py-3">
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[v.estado]}`}>
                  {VEHICLE_STATUS_LABELS[v.estado]}
                </span>
              </td>
              <td className="px-5 py-3"><ActionButtons onEdit={() => { setEditing(v); setErrorMsg(null) }} onDelete={() => setDeleting(v)} /></td>
            </tr>
          ))}
        </TableShell>
      )}

      {creating && <VehicleModal title="Nuevo vehículo" types={types} onClose={() => setCreating(false)} onSubmit={(d) => createMut.mutate(d)} isSubmitting={createMut.isPending} errorMsg={errorMsg} onDismissError={() => setErrorMsg(null)} />}
      {editing && <VehicleEditModal title="Editar vehículo" vehicle={editing} drivers={drivers} onClose={() => setEditing(null)} onSubmit={(d) => updateMut.mutate({ id: editing.id, d })} isSubmitting={updateMut.isPending} errorMsg={errorMsg} onDismissError={() => setErrorMsg(null)} />}
      {deleting && <DeleteConfirm name={deleting.placa} onConfirm={() => deleteMut.mutate(deleting.id)} onCancel={() => setDeleting(null)} isSubmitting={deleteMut.isPending} />}
    </div>
  )
}

function VehicleModal({ title, types, onClose, onSubmit, isSubmitting, errorMsg, onDismissError }: {
  title: string; types: PublicVehicleType[]; onClose: () => void
  onSubmit: (d: { placa: string; modelo: string; capacidadCargaKg: number; tipoVehiculoId?: string }) => void
  isSubmitting: boolean; errorMsg: string | null; onDismissError: () => void
}) {
  const [placa, setPlaca] = useState('')
  const [modelo, setModelo] = useState('')
  const [capacidad, setCapacidad] = useState('')
  const [tipoId, setTipoId] = useState('')

  const isDirty = Boolean(placa || modelo || capacidad || tipoId)

  return (
    <FormSheet
      title={title}
      isDirty={isDirty}
      isSubmitting={isSubmitting}
      onClose={onClose}
      onSubmit={(e) => { e.preventDefault(); onSubmit({ placa, modelo, capacidadCargaKg: Number(capacidad), tipoVehiculoId: tipoId || undefined }) }}
      size="md"
      footer={(requestClose) => (
        <ModalActions onCancel={requestClose} isSubmitting={isSubmitting} label="CREAR" />
      )}
    >
      <div className="flex flex-col gap-4">
        {errorMsg && <ErrorBanner msg={errorMsg} onDismiss={onDismissError} />}
        <Field label="Placa" hint="ej: ABC-123"><input required className="fleet-input" value={placa} onChange={(e) => setPlaca(e.target.value.toUpperCase())} placeholder="ABC-123" /></Field>
        <Field label="Modelo"><input required className="fleet-input" value={modelo} onChange={(e) => setModelo(e.target.value)} placeholder="ej: Ford F-150" /></Field>
        <Field label="Capacidad de carga (kg)"><input required type="number" min="1" className="fleet-input" value={capacidad} onChange={(e) => setCapacidad(e.target.value)} placeholder="ej: 1000" /></Field>
        <Field label="Tipo de vehículo">
          <select className="fleet-input" value={tipoId} onChange={(e) => setTipoId(e.target.value)}>
            <option value="">Sin tipo</option>
            {types.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
          </select>
        </Field>
      </div>
    </FormSheet>
  )
}

function VehicleEditModal({ title, vehicle, drivers, onClose, onSubmit, isSubmitting, errorMsg, onDismissError }: {
  title: string; vehicle: PublicVehicle; drivers: PublicDriver[]; onClose: () => void
  onSubmit: (d: { modelo?: string; estado?: VehicleStatus; choferId?: string | null }) => void
  isSubmitting: boolean; errorMsg: string | null; onDismissError: () => void
}) {
  const [modelo, setModelo] = useState(vehicle.modelo)
  const [estado, setEstado] = useState<VehicleStatus>(vehicle.estado)
  const [choferId, setChoferId] = useState(vehicle.choferId ?? '')

  const snapshot = JSON.stringify({ modelo, estado, choferId })
  const baselineRef = useRef<string | null>(null)
  if (baselineRef.current === null) baselineRef.current = snapshot
  const isDirty = baselineRef.current !== snapshot

  return (
    <FormSheet
      title={title}
      isDirty={isDirty}
      isSubmitting={isSubmitting}
      onClose={onClose}
      onSubmit={(e) => { e.preventDefault(); onSubmit({ modelo, estado, choferId: choferId || null }) }}
      size="md"
      footer={(requestClose) => (
        <ModalActions onCancel={requestClose} isSubmitting={isSubmitting} />
      )}
    >
      <div className="flex flex-col gap-4">
        {errorMsg && <ErrorBanner msg={errorMsg} onDismiss={onDismissError} />}
        <Field label="Modelo"><input required className="fleet-input" value={modelo} onChange={(e) => setModelo(e.target.value)} /></Field>
        <Field label="Estado">
          <select className="fleet-input" value={estado} onChange={(e) => setEstado(e.target.value as VehicleStatus)}>
            {(['DISPONIBLE', 'EN_RUTA', 'FUERA_DE_SERVICIO'] as VehicleStatus[]).map((s) => (
              <option key={s} value={s}>{VEHICLE_STATUS_LABELS[s]}</option>
            ))}
          </select>
        </Field>
        <Field label="Chofer asignado">
          <select className="fleet-input" value={choferId} onChange={(e) => setChoferId(e.target.value)}>
            <option value="">Sin chofer</option>
            {drivers.map((d) => <option key={d.id} value={d.id}>{d.nombre} {d.apellido}</option>)}
          </select>
        </Field>
      </div>
    </FormSheet>
  )
}

// ─── Tab: Choferes ────────────────────────────────────────────────────────────

function DriversTab() {
  const qc = useQueryClient()
  const toast = useToast()
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<PublicDriver | null>(null)
  const [deleting, setDeleting] = useState<PublicDriver | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const { data: drivers = [], isLoading } = useQuery({ queryKey: ['fleet-drivers'], queryFn: fetchDrivers })

  const closeAll = () => { qc.invalidateQueries({ queryKey: ['fleet-drivers'] }); setCreating(false); setEditing(null); setErrorMsg(null) }
  const onError = (e: Error) => { setErrorMsg(e.message); toast.error('Hubo un problema', e.message) }

  const createMut = useMutation({
    mutationFn: createDriver,
    onSuccess: (d) => { closeAll(); toast.success('Chofer registrado', `${d.nombre} ${d.apellido} ya forma parte de la flota.`) },
    onError,
  })
  const updateMut = useMutation({
    mutationFn: ({ id, d }: { id: string; d: Parameters<typeof updateDriver>[1] }) => updateDriver(id, d),
    onSuccess: (d) => { closeAll(); toast.success('Chofer actualizado', `Se guardaron los cambios de ${d.nombre} ${d.apellido}.`) },
    onError,
  })
  const deleteMut = useMutation({
    mutationFn: deleteDriver,
    onSuccess: () => {
      const name = deleting ? `${deleting.nombre} ${deleting.apellido}` : null
      qc.invalidateQueries({ queryKey: ['fleet-drivers'] })
      setDeleting(null)
      toast.success('Chofer eliminado', name ? `${name} fue dado de baja.` : 'Fue dado de baja.')
    },
    onError,
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-white/50">{drivers.length} choferes registrados</p>
        <AddButton label="NUEVO CHOFER" onClick={() => { setCreating(true); setErrorMsg(null) }} />
      </div>

      {errorMsg && <ErrorBanner msg={errorMsg} onDismiss={() => setErrorMsg(null)} />}

      {isLoading ? <LoadingRows /> : drivers.length === 0 ? (
        <EmptyRow label="choferes" onCreate={() => setCreating(true)} />
      ) : (
        <TableShell headers={['Chofer', 'Cédula', 'Licencia', 'Teléfono', 'Disponible', 'Acciones']}>
          {drivers.map((d) => (
            <tr key={d.id} className="hover:bg-[#2B5F8E]/10 transition-colors">
              <td className="px-5 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#2B5F8E] flex items-center justify-center text-xs font-bold text-white shrink-0">
                    {d.nombre.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium text-white">{d.nombre} {d.apellido}</span>
                </div>
              </td>
              <td className="px-5 py-3 text-white/60 font-mono text-xs">{d.cedula}</td>
              <td className="px-5 py-3 text-white/80 font-mono text-xs">{d.licencia}</td>
              <td className="px-5 py-3 text-white/60">{d.telefono}</td>
              <td className="px-5 py-3">
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${d.disponible ? 'text-emerald-400 bg-emerald-400/10' : 'text-red-400 bg-red-400/10'}`}>
                  {d.disponible ? 'Disponible' : 'No disponible'}
                </span>
              </td>
              <td className="px-5 py-3"><ActionButtons onEdit={() => { setEditing(d); setErrorMsg(null) }} onDelete={() => setDeleting(d)} /></td>
            </tr>
          ))}
        </TableShell>
      )}

      {creating && <DriverCreateModal onClose={() => setCreating(false)} onSubmit={(d) => createMut.mutate(d)} isSubmitting={createMut.isPending} errorMsg={errorMsg} onDismissError={() => setErrorMsg(null)} />}
      {editing && <DriverEditModal driver={editing} onClose={() => setEditing(null)} onSubmit={(d) => updateMut.mutate({ id: editing.id, d })} isSubmitting={updateMut.isPending} errorMsg={errorMsg} onDismissError={() => setErrorMsg(null)} />}
      {deleting && <DeleteConfirm name={`${deleting.nombre} ${deleting.apellido}`} onConfirm={() => deleteMut.mutate(deleting.id)} onCancel={() => setDeleting(null)} isSubmitting={deleteMut.isPending} />}
    </div>
  )
}

function DriverCreateModal({ onClose, onSubmit, isSubmitting, errorMsg, onDismissError }: {
  onClose: () => void
  onSubmit: (d: { nombre: string; apellido: string; cedula: string; licencia: string; telefono: string }) => void
  isSubmitting: boolean; errorMsg: string | null; onDismissError: () => void
}) {
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [cedula, setCedula] = useState('')
  const [licencia, setLicencia] = useState('')
  const [telefono, setTelefono] = useState('')

  const isDirty = Boolean(nombre || apellido || cedula || licencia || telefono)

  return (
    <FormSheet
      title="Nuevo chofer"
      isDirty={isDirty}
      isSubmitting={isSubmitting}
      onClose={onClose}
      onSubmit={(e) => { e.preventDefault(); onSubmit({ nombre, apellido, cedula, licencia, telefono }) }}
      size="md"
      footer={(requestClose) => (
        <ModalActions onCancel={requestClose} isSubmitting={isSubmitting} label="CREAR CHOFER" />
      )}
    >
      <div className="flex flex-col gap-4">
        {errorMsg && <ErrorBanner msg={errorMsg} onDismiss={onDismissError} />}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nombre"><input required className="fleet-input" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="ej: Juan" /></Field>
          <Field label="Apellido"><input required className="fleet-input" value={apellido} onChange={(e) => setApellido(e.target.value)} placeholder="ej: Pérez" /></Field>
        </div>
        <Field label="Cédula"><input required className="fleet-input" value={cedula} onChange={(e) => setCedula(e.target.value)} placeholder="ej: V-12345678" /></Field>
        <Field label="Nro. de licencia"><input required className="fleet-input" value={licencia} onChange={(e) => setLicencia(e.target.value)} placeholder="ej: Grado 5 - 12345678" /></Field>
        <Field label="Teléfono"><input required className="fleet-input" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="ej: 0414-1234567" /></Field>
      </div>
    </FormSheet>
  )
}

function DriverEditModal({ driver, onClose, onSubmit, isSubmitting, errorMsg, onDismissError }: {
  driver: PublicDriver; onClose: () => void
  onSubmit: (d: { nombre?: string; apellido?: string; licencia?: string; telefono?: string; disponible?: boolean }) => void
  isSubmitting: boolean; errorMsg: string | null; onDismissError: () => void
}) {
  const [nombre, setNombre] = useState(driver.nombre)
  const [apellido, setApellido] = useState(driver.apellido)
  const [licencia, setLicencia] = useState(driver.licencia)
  const [telefono, setTelefono] = useState(driver.telefono)
  const [disponible, setDisponible] = useState(driver.disponible)

  const snapshot = JSON.stringify({ nombre, apellido, licencia, telefono, disponible })
  const baselineRef = useRef<string | null>(null)
  if (baselineRef.current === null) baselineRef.current = snapshot
  const isDirty = baselineRef.current !== snapshot

  return (
    <FormSheet
      title="Editar chofer"
      isDirty={isDirty}
      isSubmitting={isSubmitting}
      onClose={onClose}
      onSubmit={(e) => { e.preventDefault(); onSubmit({ nombre, apellido, licencia, telefono, disponible }) }}
      size="md"
      footer={(requestClose) => (
        <ModalActions onCancel={requestClose} isSubmitting={isSubmitting} />
      )}
    >
      <div className="flex flex-col gap-4">
        {errorMsg && <ErrorBanner msg={errorMsg} onDismiss={onDismissError} />}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nombre"><input required className="fleet-input" value={nombre} onChange={(e) => setNombre(e.target.value)} /></Field>
          <Field label="Apellido"><input required className="fleet-input" value={apellido} onChange={(e) => setApellido(e.target.value)} /></Field>
        </div>
        <Field label="Nro. de licencia"><input required className="fleet-input" value={licencia} onChange={(e) => setLicencia(e.target.value)} /></Field>
        <Field label="Teléfono"><input required className="fleet-input" value={telefono} onChange={(e) => setTelefono(e.target.value)} /></Field>
        <Field label="Disponibilidad">
          <select className="fleet-input" value={disponible ? 'true' : 'false'} onChange={(e) => setDisponible(e.target.value === 'true')}>
            <option value="true">Disponible</option>
            <option value="false">No disponible</option>
          </select>
        </Field>
      </div>
    </FormSheet>
  )
}
