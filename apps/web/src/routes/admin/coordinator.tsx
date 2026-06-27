import { createFileRoute, Navigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Loader2, Plus, X, AlertTriangle, Warehouse } from 'lucide-react'
import type { PublicHub, HubType } from '@sos/shared'
import { HUB_TYPES } from '@sos/shared'
import { useAuth } from '@/lib/auth/auth-context'
import { hasAnyRole } from '@/lib/session'
import { API_URL } from '@/lib/auth/config'
import { Map as MapView, MapControls, MapMarker } from '@/components/ui/map'
import { useToast } from '@/components/ui/toast'
import {
  HubDashboard,
  InputStyles,
  HUB_TYPE_LABELS,
  authHeaders,
} from '@/components/hub-dashboard'

export const Route = createFileRoute('/admin/coordinator')({ component: CoordinatorGate })

function CoordinatorGate() {
  const { user } = useAuth()
  if (!hasAnyRole(user, 'HUB_COORDINATOR', 'ADMIN', 'MANAGER')) return <Navigate to="/admin" />
  return <CoordinatorPage />
}

// ─── API ──────────────────────────────────────────────────────────────────────

async function readError(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => null) as { error?: string } | null
  return body?.error ?? fallback
}

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

// ─── Página ─────────────────────────────────────────────────────────────────

function CoordinatorPage() {
  const { user } = useAuth()
  const { data: hub, isLoading } = useQuery({ queryKey: ['my-hub'], queryFn: fetchMyHub })

  // El coordinador NO asigna vehículos — eso queda para ADMIN/MANAGER/ZODI_SENDER
  // desde la pantalla de Logística. Aunque un admin entre acá, no muestra el flujo
  // de vehículo: para eso usa /admin/hubs/$hubId.
  const canManageVehicles = user?.role === 'ZODI_SENDER' || user?.role === 'ADMIN' || user?.role === 'MANAGER'

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
        <HubDashboard hub={hub} canManageVehicles={canManageVehicles} />
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

      {errorMsg && (
        <div className="flex items-start gap-2 rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-300 mb-4">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span className="flex-1">{errorMsg}</span>
          <button type="button" onClick={() => setErrorMsg(null)} className="text-red-300/60 hover:text-red-300"><X className="w-4 h-4" /></button>
        </div>
      )}

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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-white/50">{label}</span>
      {children}
    </label>
  )
}

