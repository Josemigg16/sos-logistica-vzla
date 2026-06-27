import { createFileRoute, Navigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  Loader2,
  AlertTriangle,
  Truck,
  Warehouse,
  ChevronDown,
  ChevronUp,
  Package,
  Plus,
  ArrowRight,
  ShieldCheck,
  ClipboardList
} from 'lucide-react'
import type { PublicVehicle, PublicLote } from '@sos/shared'
import { useAuth } from '@/lib/auth/auth-context'
import { hasAnyRole, ROLES_COORDINATE_HUB } from '@/lib/session'
import { API_URL } from '@/lib/auth/config'
import { getToken } from '@/lib/auth/token-store'

export const Route = createFileRoute('/admin/cargar')({ component: CargarGate })

function CargarGate() {
  const { user } = useAuth()
  if (!hasAnyRole(user, ...ROLES_COORDINATE_HUB)) return <Navigate to="/admin" />
  return <CargarVehiculoPage />
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

async function assignVehicleToLote(d: { loteId: string; vehiculoId: string }): Promise<PublicLote> {
  const res = await fetch(`${API_URL}/cargo/lotes/${d.loteId}/assign`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ vehiculoId: d.vehiculoId }),
  })
  if (!res.ok) throw new Error(await readError(res, 'No se pudo cargar el lote al vehículo'))
  return (await res.json()).lote
}

// ─── Componente Principal ──────────────────────────────────────────────────────

function CargarVehiculoPage() {
  const qc = useQueryClient()
  const [selectedVehicleId, setSelectedVehicleId] = useState('')
  const [expandedLotes, setExpandedLotes] = useState<Record<string, boolean>>({})
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

  const assignMut = useMutation({
    mutationFn: assignVehicleToLote,
    onSuccess: (newLote) => {
      setSuccessMsg(`Lote cargado exitosamente al vehículo con placa ${newLote.vehiculoPlaca}`)
      setErrorMsg(null)
      qc.invalidateQueries({ queryKey: ['cargo-lotes-all'] })
      qc.invalidateQueries({ queryKey: ['fleet-vehicles'] })
    },
    onError: (e: Error) => {
      setErrorMsg(e.message)
      setSuccessMsg(null)
    }
  })

  // Obtener vehículo seleccionado
  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId)

  // Filtrar lotes disponibles (estado "EMBALADO")
  const availableLotes = lotes.filter((l) => l.estado === 'EMBALADO')

  // Agrupar lotes por centro de acopio de origen
  const lotesByHub = availableLotes.reduce<Record<string, { hubName: string; items: PublicLote[] }>>((acc, lote) => {
    const hubId = lote.hubOrigenId
    if (!acc[hubId]) {
      acc[hubId] = { hubName: lote.hubOrigenNombre, items: [] }
    }
    acc[hubId].items.push(lote)
    return acc
  }, {})

  // Calcular peso actual cargado en el vehículo seleccionado basándose en los lotes en tránsito
  const lotesOnSelectedVehicle = lotes.filter((l) => l.vehiculoId === selectedVehicleId && l.estado === 'EN_TRANSITO')
  const currentWeightLoaded = lotesOnSelectedVehicle.reduce((sum, l) => sum + (l.pesoTotalKg || 0), 0)

  const toggleExpand = (id: string) => {
    setExpandedLotes((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const handleLoadLote = (loteId: string) => {
    if (!selectedVehicleId) {
      setErrorMsg('Por favor selecciona un vehículo primero.')
      return
    }
    if (selectedVehicle && !selectedVehicle.choferId) {
      setErrorMsg('No se puede asignar un lote a un vehículo sin chofer asignado.')
      return
    }
    assignMut.mutate({ loteId, vehiculoId: selectedVehicleId })
  }

  const isLoading = loadingVehicles || loadingLotes

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Truck className="w-6 h-6 text-[#4A89C0]" /> Cargar Vehículo
        </h1>
        <p className="text-sm text-white/50 mt-1">
          Selecciona un vehículo de carga y asignale lotes embalados en origen para iniciar el tránsito.
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

      {/* ─── Bloque de Selección de Vehículo ─── */}
      <div className="rounded-2xl border border-[#2B5F8E]/40 bg-[#152D46]/80 backdrop-blur-sm p-5 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-white/50">Vehículo de Carga</span>
          {loadingVehicles ? (
            <div className="coord-input flex items-center gap-2 text-white/50">
              <Loader2 className="w-4 h-4 animate-spin text-[#4A89C0]" /> Cargando flota de transporte…
            </div>
          ) : (
            <select
              className="coord-input"
              value={selectedVehicleId}
              onChange={(e) => {
                setSelectedVehicleId(e.target.value)
                setErrorMsg(null)
                setSuccessMsg(null)
              }}
            >
              <option value="">Seleccionar vehículo…</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.modelo} [Placa: {v.placa}] - Capacidad: {v.capacidadCargaKg} kg {!v.choferId ? ' (⚠️ Sin chofer)' : ''}
                </option>
              ))}
            </select>
          )}
        </label>

        {selectedVehicle && (
          <div className="p-4 rounded-xl bg-[#0F2337]/60 border border-[#2B5F8E]/30 text-sm flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="font-semibold text-white/90">{selectedVehicle.modelo}</span>
                <span className="ml-2 font-mono px-2 py-0.5 rounded text-xs bg-[#2B5F8E]/40 text-white/70">
                  {selectedVehicle.placa}
                </span>
              </div>
              {!selectedVehicle.choferId ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-amber-400 font-medium bg-amber-400/10 border border-amber-400/20 px-2.5 py-1 rounded-lg">
                  <AlertTriangle className="w-3.5 h-3.5" /> No asignable — Requiere chofer
                </span>
              ) : (
                <span className="text-xs text-white/50">
                  Estado: <span className="font-semibold text-emerald-400">{selectedVehicle.estado}</span>
                </span>
              )}
            </div>

            {/* Barra de capacidad */}
            <div>
              <div className="flex items-center justify-between text-xs text-white/60 mb-1.5">
                <span>Capacidad de carga utilizada:</span>
                <span className="font-semibold">
                  {currentWeightLoaded} kg / {selectedVehicle.capacidadCargaKg} kg
                </span>
              </div>
              <div className="w-full bg-[#152D46] rounded-full h-3 overflow-hidden border border-[#2B5F8E]/20">
                <div
                  className={`h-full transition-all duration-300 ${
                    currentWeightLoaded > selectedVehicle.capacidadCargaKg
                      ? 'bg-red-500'
                      : currentWeightLoaded > selectedVehicle.capacidadCargaKg * 0.9
                      ? 'bg-amber-500'
                      : 'bg-[#4A89C0]'
                  }`}
                  style={{ width: `${Math.min(100, (currentWeightLoaded / selectedVehicle.capacidadCargaKg) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── Sección de Lotes Disponibles ─── */}
      <div>
        <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-3">
          <ClipboardList className="w-5 h-5 text-[#4A89C0]" /> Lotes Disponibles para Carga
        </h2>

        {isLoading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-[#4A89C0]" />
          </div>
        ) : Object.keys(lotesByHub).length === 0 ? (
          <div className="text-center py-12 border border-dashed border-[#2B5F8E]/30 rounded-2xl bg-[#152D46]/30">
            <Package className="w-8 h-8 mx-auto text-white/20 mb-2" />
            <p className="text-sm text-white/50">No hay lotes embalados listos para cargar en ningún centro.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {Object.entries(lotesByHub).map(([hubId, { hubName, items: hubItems }]) => (
              <div key={hubId} className="flex flex-col gap-3">
                <div className="flex items-center gap-2 border-b border-[#2B5F8E]/30 pb-1.5 mt-2">
                  <Warehouse className="w-4 h-4 text-[#4A89C0]" />
                  <h3 className="font-semibold text-white/80 text-sm">{hubName}</h3>
                  <span className="text-xs text-white/40">({hubItems.length} {hubItems.length === 1 ? 'lote' : 'lotes'})</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {hubItems.map((lote) => {
                    const expanded = !!expandedLotes[lote.id]
                    return (
                      <div
                        key={lote.id}
                        className="rounded-xl border border-[#2B5F8E]/30 bg-[#152D46]/50 hover:bg-[#152D46]/75 transition flex flex-col overflow-hidden"
                      >
                        {/* Cabecera del Lote */}
                        <div className="p-4 flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-mono font-bold text-white/70 bg-[#2B5F8E]/40 px-2 py-0.5 rounded">
                                Lote: {lote.id.slice(0, 8)}
                              </span>
                              <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-1.5 py-0.5 rounded">
                                {lote.estado}
                              </span>
                            </div>
                            <p className="text-xs font-medium text-white/70 mt-2 truncate flex items-center gap-1">
                              Destino: <ArrowRight className="w-3.5 h-3.5 text-white/40" /> <span className="text-[#C8DCF0]">{lote.hubDestinoNombre || 'Sin destino'}</span>
                            </p>
                            {lote.nota && (
                              <p className="text-[11px] text-white/40 italic mt-1.5 truncate">
                                “{lote.nota}”
                              </p>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => toggleExpand(lote.id)}
                            className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition shrink-0"
                            title={expanded ? 'Colapsar detalles' : 'Expandir detalles'}
                          >
                            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>

                        {/* Detalle Expandido */}
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

                        {/* Botón de Acción de Carga */}
                        <div className="p-3 border-t border-[#2B5F8E]/20 bg-[#0F2337]/20 flex items-center justify-between gap-3 mt-auto shrink-0">
                          <span className="text-[11px] text-white/40">
                            Peso estimado: <span className="font-mono font-medium text-white/60">{lote.pesoTotalKg || 0} kg</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleLoadLote(lote.id)}
                            disabled={!selectedVehicleId || (selectedVehicle && !selectedVehicle.choferId) || assignMut.isPending}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-[#C8DCF0] text-[#0F2337] active:scale-[0.97] transition disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                          >
                            {assignMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                            Cargar
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
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
      `}</style>
    </div>
  )
}
