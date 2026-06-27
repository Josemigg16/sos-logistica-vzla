import { createFileRoute, Navigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  Loader2,
  AlertTriangle,
  Truck,
  ChevronDown,
  ChevronUp,
  Package,
  ArrowRight,
  ShieldCheck,
  ClipboardList,
  RefreshCw,
  X,
  FileText
} from 'lucide-react'
import type { PublicVehicle, PublicLote } from '@sos/shared'
import { useAuth } from '@/lib/auth/auth-context'
import { hasAnyRole, ROLES_COORDINATE_HUB } from '@/lib/session'
import { API_URL } from '@/lib/auth/config'
import { getToken } from '@/lib/auth/token-store'
import { createPortal } from 'react-dom'

export const Route = createFileRoute('/admin/traspaso')({ component: TraspasoGate })

function TraspasoGate() {
  const { user } = useAuth()
  if (!hasAnyRole(user, ...ROLES_COORDINATE_HUB)) return <Navigate to="/admin" />
  return <TraspasoCargaPage />
}

// ─── API Helpers ─────────────────────────────────────────────────────────────

function authHeaders(): HeadersInit {
  const token = getToken()
  return {
    'Content-Type': 'application/json',
    Authorization: token ? `Bearer ${token}` : '',
  }
}

async function readError(res: Response, defaultMsg: string): Promise<string> {
  try {
    const data = await res.json()
    return data.error || defaultMsg
  } catch {
    return defaultMsg
  }
}

async function fetchVehicles(): Promise<PublicVehicle[]> {
  const res = await fetch(`${API_URL}/fleet/vehicles`, { headers: authHeaders() })
  if (!res.ok) throw new Error('No se pudieron cargar los vehículos')
  return (await res.json()).vehicles
}

async function fetchLotesAll(): Promise<PublicLote[]> {
  const res = await fetch(`${API_URL}/cargo/lotes`, { headers: authHeaders() })
  if (!res.ok) throw new Error('No se pudieron cargar los lotes')
  return (await res.json()).lotes
}

async function transferLoteToVehicle(d: {
  loteId: string
  vehiculoDestinoId: string
  motivo: string
}): Promise<PublicLote> {
  const res = await fetch(`${API_URL}/cargo/lotes/${d.loteId}/transfer`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ vehiculoDestinoId: d.vehiculoDestinoId, motivo: d.motivo }),
  })
  if (!res.ok) throw new Error(await readError(res, 'No se pudo traspasar el lote'))
  return (await res.json()).lote
}

// ─── Componente Principal ──────────────────────────────────────────────────────

function TraspasoCargaPage() {
  const qc = useQueryClient()
  const [origenVehicleId, setOrigenVehicleId] = useState('')
  const [destinoVehicleId, setDestinoVehicleId] = useState('')
  const [expandedLotes, setExpandedLotes] = useState<Record<string, boolean>>({})
  const [loteToTransfer, setLoteToTransfer] = useState<PublicLote | null>(null)
  const [motivo, setMotivo] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const { data: vehicles = [], isLoading: loadingVehicles } = useQuery({
    queryKey: ['fleet-vehicles'],
    queryFn: fetchVehicles
  })

  const { data: lotes = [], isLoading: loadingLotes } = useQuery({
    queryKey: ['cargo-lotes-all'],
    queryFn: fetchLotesAll
  })

  const transferMut = useMutation({
    mutationFn: transferLoteToVehicle,
    onSuccess: (newLote) => {
      setSuccessMsg(`Lote traspasado exitosamente al vehículo con placa ${newLote.vehiculoPlaca}`)
      setErrorMsg(null)
      setLoteToTransfer(null)
      setMotivo('')
      qc.invalidateQueries({ queryKey: ['cargo-lotes-all'] })
      qc.invalidateQueries({ queryKey: ['fleet-vehicles'] })
    },
    onError: (e: Error) => {
      setErrorMsg(e.message)
      setSuccessMsg(null)
      setLoteToTransfer(null)
      setMotivo('')
    }
  })

  const toggleExpand = (id: string) => {
    setExpandedLotes((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  // Filtrar vehículos de origen y destino
  const origenVehicle = vehicles.find((v) => v.id === origenVehicleId)
  const destinoVehicle = vehicles.find((v) => v.id === destinoVehicleId)

  // Obtener lotes en tránsito en el vehículo origen
  const lotesOnOrigen = lotes.filter((l) => l.vehiculoId === origenVehicleId && l.estado === 'EN_TRANSITO')
  const origenWeight = lotesOnOrigen.reduce((sum, l) => sum + (l.pesoTotalKg || 0), 0)

  // Obtener lotes en tránsito en el vehículo destino
  const lotesOnDestino = lotes.filter((l) => l.vehiculoId === destinoVehicleId && l.estado === 'EN_TRANSITO')
  const destinoWeight = lotesOnDestino.reduce((sum, l) => sum + (l.pesoTotalKg || 0), 0)

  const assignDestinoWeightExceeded = (loteWeight: number) => {
    if (!destinoVehicle) return false
    return destinoWeight + loteWeight > destinoVehicle.capacidadCargaKg
  }

  const handleOpenTransferModal = (lote: PublicLote) => {
    if (!destinoVehicleId) {
      setErrorMsg('Por favor selecciona un vehículo de destino primero.')
      return
    }
    if (destinoVehicleId === origenVehicleId) {
      setErrorMsg('El vehículo de destino debe ser diferente del origen.')
      return
    }
    if (destinoVehicle && !destinoVehicle.choferId) {
      setErrorMsg('El vehículo de destino debe tener un chofer asignado.')
      return
    }
    // Verificar exceso de capacidad en destino antes de abrir
    if (destinoWeight + lote.pesoTotalKg > (destinoVehicle?.capacidadCargaKg || 0)) {
      setErrorMsg('El peso del lote supera la capacidad restante del vehículo de destino.')
      return
    }
    setLoteToTransfer(lote)
    setErrorMsg(null)
  }

  const handleExecuteTransfer = (e: React.FormEvent) => {
    e.preventDefault()
    if (!loteToTransfer) return
    if (motivo.trim().length < 3) {
      alert('Por favor ingresa un motivo válido (mínimo 3 caracteres).')
      return
    }
    transferMut.mutate({
      loteId: loteToTransfer.id,
      vehiculoDestinoId: destinoVehicleId,
      motivo: motivo.trim()
    })
  }

  const isLoading = loadingVehicles || loadingLotes

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <RefreshCw className="w-6 h-6 text-[#4A89C0]" /> Traspaso de Carga
        </h1>
        <p className="text-sm text-white/50 mt-1">
          Traspasa lotes de carga que se encuentran en tránsito de un vehículo a otro.
        </p>
      </div>

      {errorMsg && (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span className="flex-1">{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-red-300/60 hover:text-red-300 font-bold">&times;</button>
        </div>
      )}

      {successMsg && (
        <div className="flex items-start gap-2.5 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
          <ShieldCheck className="w-5 h-5 shrink-0" />
          <span className="flex-1">{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-green-300/60 hover:text-green-300 font-bold">&times;</button>
        </div>
      )}

      {/* ─── Grid de Selección de Vehículos (Origen y Destino) ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Vehículo de Origen */}
        <div className="rounded-2xl border border-[#2B5F8E]/40 bg-[#152D46]/80 backdrop-blur-sm p-5 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-white/50">Vehículo de Origen (En Tránsito)</span>
            {loadingVehicles ? (
              <div className="coord-input flex items-center gap-2 text-white/50"><Loader2 className="w-4 h-4 animate-spin text-[#4A89C0]" /> Cargando flota…</div>
            ) : (
              <select
                className="coord-input"
                value={origenVehicleId}
                onChange={(e) => {
                  setOrigenVehicleId(e.target.value)
                  setErrorMsg(null)
                  setSuccessMsg(null)
                }}
              >
                <option value="">Seleccionar vehículo de origen…</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.modelo} [Placa: {v.placa}] - Capacidad: {v.capacidadCargaKg} kg
                  </option>
                ))}
              </select>
            )}
          </label>

          {origenVehicle && (
            <div className="p-4 rounded-xl bg-[#0F2337]/60 border border-[#2B5F8E]/30 text-sm flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-white/90">{origenVehicle.modelo}</span>
                <span className="font-mono px-2 py-0.5 rounded text-xs bg-[#2B5F8E]/40 text-white/70">{origenVehicle.placa}</span>
              </div>
              <div className="text-xs text-white/50">
                Chofer: <span className="text-white/70 font-medium">{origenVehicle.choferId ? 'Asignado' : '⚠️ Sin chofer'}</span>
              </div>
              <div className="mt-1">
                <div className="flex justify-between text-xs text-white/60 mb-1">
                  <span>Carga actual:</span>
                  <span className="font-semibold">{origenWeight} kg / {origenVehicle.capacidadCargaKg} kg</span>
                </div>
                <div className="w-full bg-[#152D46] rounded-full h-2 overflow-hidden border border-[#2B5F8E]/20">
                  <div className="bg-[#4A89C0] h-full" style={{ width: `${Math.min(100, (origenWeight / origenVehicle.capacidadCargaKg) * 100)}%` }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Vehículo de Destino */}
        <div className="rounded-2xl border border-[#2B5F8E]/40 bg-[#152D46]/80 backdrop-blur-sm p-5 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-white/50">Vehículo de Destino (Receptor)</span>
            {loadingVehicles ? (
              <div className="coord-input flex items-center gap-2 text-white/50"><Loader2 className="w-4 h-4 animate-spin text-[#4A89C0]" /> Cargando flota…</div>
            ) : (
              <select
                className="coord-input"
                value={destinoVehicleId}
                onChange={(e) => {
                  setDestinoVehicleId(e.target.value)
                  setErrorMsg(null)
                  setSuccessMsg(null)
                }}
              >
                <option value="">Seleccionar vehículo de destino…</option>
                {vehicles
                  .filter((v) => v.id !== origenVehicleId)
                  .map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.modelo} [Placa: {v.placa}] - Capacidad: {v.capacidadCargaKg} kg {!v.choferId ? ' (⚠️ Sin chofer)' : ''}
                    </option>
                  ))}
              </select>
            )}
          </label>

          {destinoVehicle && (
            <div className="p-4 rounded-xl bg-[#0F2337]/60 border border-[#2B5F8E]/30 text-sm flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-white/90">{destinoVehicle.modelo}</span>
                <span className="font-mono px-2 py-0.5 rounded text-xs bg-[#2B5F8E]/40 text-white/70">{destinoVehicle.placa}</span>
              </div>
              <div className="text-xs text-white/50">
                Chofer: <span className={destinoVehicle.choferId ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold bg-amber-400/10 px-1.5 py-0.5 rounded'}>
                  {destinoVehicle.choferId ? 'Asignado' : '⚠️ Sin chofer (Requiere chofer)'}
                </span>
              </div>
              <div className="mt-1">
                <div className="flex justify-between text-xs text-white/60 mb-1">
                  <span>Carga actual:</span>
                  <span className="font-semibold">{destinoWeight} kg / {destinoVehicle.capacidadCargaKg} kg</span>
                </div>
                <div className="w-full bg-[#152D46] rounded-full h-2 overflow-hidden border border-[#2B5F8E]/20">
                  <div className="bg-emerald-500 h-full" style={{ width: `${Math.min(100, (destinoWeight / destinoVehicle.capacidadCargaKg) * 100)}%` }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Lotes en Tránsito del Vehículo de Origen ─── */}
      <div>
        <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-3">
          <ClipboardList className="w-5 h-5 text-[#4A89C0]" /> Lotes en Tránsito del Vehículo de Origen
        </h2>

        {isLoading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-[#4A89C0]" />
          </div>
        ) : !origenVehicleId ? (
          <div className="text-center py-10 border border-dashed border-[#2B5F8E]/30 rounded-2xl bg-[#152D46]/20 text-white/40 text-sm">
            Selecciona un vehículo de origen para listar la carga en tránsito.
          </div>
        ) : lotesOnOrigen.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-[#2B5F8E]/30 rounded-2xl bg-[#152D46]/30">
            <Package className="w-8 h-8 mx-auto text-white/20 mb-2" />
            <p className="text-sm text-white/50">Este vehículo no posee ningún lote de carga en tránsito.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lotesOnOrigen.map((lote) => {
              const expanded = !!expandedLotes[lote.id]
              return (
                <div
                  key={lote.id}
                  className="rounded-xl border border-[#2B5F8E]/30 bg-[#152D46]/50 flex flex-col overflow-hidden"
                >
                  {/* Cabecera Lote */}
                  <div className="p-4 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-mono font-bold text-white/70 bg-[#2B5F8E]/40 px-2 py-0.5 rounded">
                          Lote: {lote.id.slice(0, 8)}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-[#4A89C0] bg-[#4A89C0]/10 border border-[#4A89C0]/20 px-1.5 py-0.5 rounded">
                          {lote.estado}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-white/60 mt-2 truncate">
                        Origen: <span className="text-white/80">{lote.hubOrigenNombre}</span>
                      </p>
                      <p className="text-xs font-medium text-white/60 mt-1 truncate">
                        Destino: <span className="text-white/80">{lote.hubDestinoNombre || 'Sin destino'}</span>
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleExpand(lote.id)}
                      className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition shrink-0"
                    >
                      {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Detalles Expandidos */}
                  {expanded && (
                    <div className="px-4 pb-3 pt-1 border-t border-[#2B5F8E]/20 bg-[#0F2337]/40">
                      <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2">Productos ({lote.items.length})</h4>
                      <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                        {lote.items.map((it) => (
                          <div key={it.id} className="flex justify-between items-center text-xs text-white/80 px-2.5 py-1.5 rounded bg-[#152D46]/40">
                            <span className="truncate pr-2">{it.productName}</span>
                            <span className="font-mono font-semibold shrink-0 text-white">×{it.cantidad}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Barra de Acciones */}
                  <div className="p-3 border-t border-[#2B5F8E]/20 bg-[#0F2337]/20 flex items-center justify-between gap-3 mt-auto shrink-0">
                    <span className="text-[11px] text-white/40">
                      Peso: <span className="font-mono font-medium text-white/60">{lote.pesoTotalKg || 0} kg</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenTransferModal(lote)}
                      disabled={!destinoVehicleId || assignDestinoWeightExceeded(lote.pesoTotalKg) || transferMut.isPending}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-[#C8DCF0] text-[#0F2337] active:scale-[0.97] transition disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                    >
                      <ArrowRight className="w-3.5 h-3.5" /> Traspasar
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>



      {/* ─── Modal de Motivo de Traspaso ─── */}
      {loteToTransfer &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A1A2A]/80 backdrop-blur-md p-4 animate-modal-overlay">
            <div className="relative flex flex-col w-full max-w-md bg-[#152D46] border border-[#2B5F8E]/50 rounded-2xl shadow-[0_20px_60px_-20px_rgba(0,0,0,0.7)] overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#2B5F8E]/30 shrink-0">
                <h3 className="font-bold text-white text-base">Motivo de Traspaso</h3>
                <button
                  onClick={() => setLoteToTransfer(null)}
                  className="flex items-center justify-center w-8 h-8 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleExecuteTransfer} className="p-5 flex flex-col gap-4">
                <div className="p-3 bg-[#0F2337]/60 border border-[#2B5F8E]/30 rounded-xl text-xs text-white/70">
                  <p className="font-semibold text-white/90">Traspaso de Lote:</p>
                  <p className="font-mono mt-1 text-white/55">{loteToTransfer.id}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-white/60">{origenVehicle?.placa}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-white/40" />
                    <span className="text-emerald-400 font-semibold">{destinoVehicle?.placa}</span>
                  </div>
                </div>

                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-white/50 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" /> Motivo del Traspaso
                  </span>
                  <textarea
                    required
                    className="coord-input min-h-[90px] resize-y"
                    maxLength={500}
                    placeholder="Describe el motivo del traspaso (ej. falla mecánica, optimización de ruta, etc.)"
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                  />
                </label>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setLoteToTransfer(null)}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white/70 text-sm font-semibold hover:bg-white/10 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={transferMut.isPending}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#0F2337] text-sm font-bold hover:bg-[#C8DCF0] active:scale-[0.98] transition disabled:opacity-70"
                  >
                    {transferMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    Confirmar
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      <style>{`
        .coord-input {
          width: 100%;
          padding: 0.625rem 0.875rem;
          background-color: #0F2337;
          border: 1px solid rgba(43,95,142,0.4);
          border-radius: 0.75rem;
          color: white;
          font-size: 0.875rem;
          outline: none;
          transition: border-color 0.15s ease;
        }
        .coord-input:focus {
          border-color: #4A89C0;
        }
        .coord-input option {
          background-color: #0F2337;
          color: white;
        }
        @keyframes modal-overlay-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-modal-overlay {
          animation: modal-overlay-in 160ms ease-out;
        }
      `}</style>
    </div>
  )
}
