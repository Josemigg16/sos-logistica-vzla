import { createFileRoute, Link, Navigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Heart,
  Plus,
  MapPin,
  CalendarClock,
  ArrowLeft,
  ChevronDown,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Inbox,
  Package,
} from 'lucide-react'
import { API_URL } from '@/lib/auth/config'
import { getToken } from '@/lib/auth/token-store'
import { useAuth } from '@/lib/auth/auth-context'
import { hasAnyRole, ROLES_MANAGE_NEEDS } from '@/lib/session'
import logotipo from '@/assets/branding/white-logotipo.webp'
import { INVENTORY_CATEGORIES } from '@sos/shared'

export const Route = createFileRoute('/needs-register')({
  component: NeedsRegisterGate,
})

function NeedsRegisterGate() {
  const { status, user } = useAuth()

  if (status === 'loading') {
    return (
      <div
        className="min-h-dvh flex items-center justify-center"
        style={{ background: 'linear-gradient(160deg, #152D46 0%, #0F2337 50%, #0A1B2A 100%)' }}
      >
        <Loader2 className="w-7 h-7 animate-spin text-[#4A89C0]" strokeWidth={2.5} />
      </div>
    )
  }

  if (status === 'unauthenticated' || !user) return <Navigate to="/login" />
  if (!hasAnyRole(user, ...ROLES_MANAGE_NEEDS)) return <Navigate to="/" />

  return <NeedsRegisterPage />
}

interface Center {
  id: string
  nombre: string
  direccion: string
  contacto: string
  tipo: string
}

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
  prioridad: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA'
  descripcion: string
  fechaNecesidad: string
}

const PRIORITIES = [
  { value: 'CRITICA', label: 'Crítica' },
  { value: 'ALTA', label: 'Alta' },
  { value: 'MEDIA', label: 'Media' },
  { value: 'BAJA', label: 'Baja' },
]

const PRIORITY_STYLES: Record<string, string> = {
  CRITICA: 'bg-red-500/10 text-red-400 border-red-500/20',
  ALTA: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  MEDIA: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  BAJA: 'bg-white/5 text-white/50 border-white/10',
}

function authHeaders(): HeadersInit {
  const token = getToken()
  const base: HeadersInit = { 'Content-Type': 'application/json' }
  return token ? { ...base, Authorization: `Bearer ${token}` } : base
}

function NeedsRegisterPage() {
  const queryClient = useQueryClient()
  const [selectedHubId, setSelectedHubId] = useState<string>('')
  const [tipoInsumo, setTipoInsumo] = useState<string>(INVENTORY_CATEGORIES[0])
  const [meta, setMeta] = useState<number>(0)
  const [prioridad, setPrioridad] = useState('ALTA')
  const [descripcion, setDescripcion] = useState('')
  const [fechaNecesidad, setFechaNecesidad] = useState(
    new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString().split('T')[0]
  )
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const { data: centers = [], isLoading: loadingCenters } = useQuery<Center[]>({
    queryKey: ['centros'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/centros`)
      if (!res.ok) throw new Error('API error')
      const all = await res.json()
      return all.filter((c: Center) => c.tipo === 'acopio')
    },
  })

  const { data: activeNeeds = [], isLoading: loadingNeeds, refetch: refetchNeeds } = useQuery<Need[]>({
    queryKey: ['necesidades', selectedHubId],
    queryFn: async () => {
      if (!selectedHubId) return []
      const res = await fetch(`${API_URL}/necesidades?hubId=${selectedHubId}`)
      if (!res.ok) throw new Error('API error')
      return res.json()
    },
    enabled: !!selectedHubId,
  })

  const createNeedMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch(`${API_URL}/necesidades`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Fallo al registrar la solicitud')
      }
      return res.json()
    },
    onSuccess: () => {
      setSuccessMsg('¡Solicitud registrada con éxito!')
      setErrorMsg('')
      refetchNeeds()
      setMeta(0)
      setDescripcion('')
      queryClient.invalidateQueries({ queryKey: ['necesidades'] })
      setTimeout(() => setSuccessMsg(''), 5000)
    },
    onError: (err: Error) => {
      setErrorMsg(err.message)
      setSuccessMsg('')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedHubId) {
      setErrorMsg('Debe seleccionar un centro de acopio.')
      return
    }
    if (meta <= 0) {
      setErrorMsg('La cantidad requerida debe ser mayor a 0.')
      return
    }

    createNeedMutation.mutate({
      hubId: selectedHubId,
      nombre: tipoInsumo,
      categoria: tipoInsumo,
      meta,
      prioridad,
      descripcion,
      fechaNecesidad,
    })
  }

  const selectedCenter = centers.find((c) => c.id === selectedHubId)

  return (
    <div
      className="min-h-dvh w-full overflow-x-hidden text-white pb-20 relative"
      style={{ background: 'linear-gradient(160deg, #152D46 0%, #0F2337 50%, #0A1B2A 100%)' }}
    >
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(rgba(43,95,142,0.07) 1px, transparent 1px),
            linear-gradient(90deg, rgba(43,95,142,0.07) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-6 md:py-10">
        <div className="mb-6 flex justify-between items-center">
          <Link
            to="/"
            className="flex items-center gap-2 text-xs font-semibold text-[#C8DCF0]/60 hover:text-white transition-colors duration-200"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Volver al panel público
          </Link>
          <img
            src={logotipo}
            alt="Portuguesa Unida"
            className="h-10 w-auto object-contain opacity-80"
          />
        </div>

        <div className="mb-8">
          <span className="text-[10px] font-bold text-[#C8DCF0]/50 uppercase tracking-[0.15em] mb-1 block">
            Coordinación ZODI
          </span>
          <h1
            className="leading-[0.95] tracking-tight mb-2 italic font-black text-white"
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 'clamp(2rem, 5vw, 3.2rem)',
            }}
          >
            SOLICITAR INSUMOS PARA UN CENTRO
          </h1>
          <p className="text-xs text-white/50 max-w-2xl leading-relaxed">
            Registrá el tipo de insumo que necesita el centro de acopio con su nivel de prioridad. La solicitud aparecerá de inmediato en el panel público de donaciones.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-6 items-start">
          {/* Form Side */}
          <div className="rounded-2xl border border-[#2B5F8E]/40 bg-[#152D46]/60 backdrop-blur-sm p-5 shadow-xl">
            <h2 className="text-sm font-bold text-[#C8DCF0] mb-4 flex items-center gap-2">
              <Heart className="w-4 h-4 text-[#4A89C0]" />
              Solicitud de Insumos
            </h2>

            {successMsg && (
              <div className="mb-4 p-3 rounded-xl border border-green-500/30 bg-green-500/10 text-green-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {successMsg}
              </div>
            )}

            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Select Hub */}
              <div>
                <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider block mb-1.5">
                  Centro de Acopio
                </label>
                <div className="relative">
                  {loadingCenters ? (
                    <div className="w-full px-3 py-2.5 rounded-xl bg-[#0F2337]/80 border border-[#2B5F8E]/40 text-xs text-white/40 flex items-center gap-2">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Cargando centros...
                    </div>
                  ) : (
                    <select
                      value={selectedHubId}
                      onChange={(e) => setSelectedHubId(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-[#0F2337]/80 border border-[#2B5F8E]/40 text-xs text-white focus:outline-none focus:border-[#4A89C0]/50 appearance-none cursor-pointer"
                    >
                      <option value="">Selecciona el centro de acopio...</option>
                      {centers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre} ({c.direccion})
                        </option>
                      ))}
                    </select>
                  )}
                  <ChevronDown className="w-4 h-4 text-white/40 absolute right-3 top-3.5 pointer-events-none" />
                </div>
              </div>

              {selectedHubId && (
                <>
                  {/* Tipo de Insumo */}
                  <div>
                    <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider block mb-1.5">
                      Tipo de Insumo
                    </label>
                    <div className="relative">
                      <select
                        value={tipoInsumo}
                        onChange={(e) => setTipoInsumo(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl bg-[#0F2337]/80 border border-[#2B5F8E]/40 text-xs text-white focus:outline-none focus:border-[#4A89C0]/50 appearance-none cursor-pointer"
                      >
                        {INVENTORY_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-white/40 absolute right-3 top-3.5 pointer-events-none" />
                    </div>
                  </div>

                  {/* Quantity & Priority */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider block mb-1.5">
                        Cantidad Requerida
                      </label>
                      <input
                        type="number"
                        value={meta === 0 ? '' : meta}
                        onChange={(e) => setMeta(Number(e.target.value))}
                        placeholder="ej. 500"
                        min={1}
                        required
                        className="w-full px-3 py-2 rounded-xl bg-[#0F2337]/80 border border-[#2B5F8E]/40 text-xs text-white focus:outline-none focus:border-[#4A89C0]/50"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider block mb-1.5">
                        Prioridad
                      </label>
                      <select
                        value={prioridad}
                        onChange={(e) => setPrioridad(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#0F2337]/80 border border-[#2B5F8E]/40 text-xs text-white focus:outline-none focus:border-[#4A89C0]/50 cursor-pointer"
                      >
                        {PRIORITIES.map((p) => (
                          <option key={p.value} value={p.value}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Limit Date */}
                  <div>
                    <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider block mb-1.5">
                      ¿Para cuándo se necesita?
                    </label>
                    <input
                      type="date"
                      value={fechaNecesidad}
                      onChange={(e) => setFechaNecesidad(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl bg-[#0F2337]/80 border border-[#2B5F8E]/40 text-xs text-white focus:outline-none focus:border-[#4A89C0]/50"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider block mb-1.5">
                      Descripción o Especificaciones (Opcional)
                    </label>
                    <textarea
                      value={descripcion}
                      onChange={(e) => setDescripcion(e.target.value)}
                      placeholder="Indicá especificaciones adicionales, marcas, condiciones de entrega..."
                      rows={3}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0F2337]/80 border border-[#2B5F8E]/40 text-xs text-white focus:outline-none focus:border-[#4A89C0]/50 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={createNeedMutation.isPending}
                    className="w-full py-3 rounded-xl bg-white text-[#0F2337] font-bold text-xs uppercase tracking-wider
                               hover:bg-[#C8DCF0] active:scale-[0.98] transition-all duration-200 cursor-pointer
                               flex items-center justify-center gap-2 mt-2"
                  >
                    {createNeedMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Registrando solicitud...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" strokeWidth={3} />
                        Registrar solicitud
                      </>
                    )}
                  </button>
                </>
              )}
            </form>
          </div>

          {/* Active Needs List Side */}
          <div className="rounded-2xl border border-[#2B5F8E]/30 bg-[#152D46]/35 p-5 min-h-[300px]">
            <h2 className="text-sm font-bold text-white/80 mb-4 flex items-center justify-between">
              <span>Solicitudes del Centro</span>
              {selectedCenter && (
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#4A89C0]/20 text-[#4A89C0] border border-[#4A89C0]/30 font-mono">
                  {selectedCenter.nombre}
                </span>
              )}
            </h2>

            {!selectedHubId ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-white/30">
                <MapPin className="w-10 h-10 mb-3 text-white/10" />
                <p className="text-xs font-semibold">Seleccione un centro de acopio</p>
                <p className="text-[10px] max-w-xs mt-1 leading-relaxed">
                  Elija un centro para ver los insumos que ya han sido solicitados.
                </p>
              </div>
            ) : loadingNeeds ? (
              <div className="flex flex-col items-center justify-center py-20 text-white/30">
                <Loader2 className="w-6 h-6 animate-spin mb-2" />
                <span className="text-[10px]">Cargando solicitudes...</span>
              </div>
            ) : activeNeeds.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-white/25">
                <Inbox className="w-10 h-10 mb-3 text-white/10" />
                <p className="text-xs font-semibold">Sin solicitudes activas</p>
                <p className="text-[10px] max-w-xs mt-1 leading-relaxed">
                  Este centro no tiene solicitudes de insumos aún.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3 max-h-[460px] overflow-y-auto pr-1">
                {activeNeeds.map((need) => {
                  const pct = Math.min(Math.round((need.recibido / need.meta) * 100), 100)
                  return (
                    <div
                      key={need.id}
                      className="p-4 rounded-xl border border-[#2B5F8E]/20 bg-[#0F2337]/50 backdrop-blur-sm flex flex-col gap-2.5"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-[#4A89C0] shrink-0" />
                          <div>
                            <h4 className="font-bold text-white text-[13px]">{need.nombre}</h4>
                            <span className="text-[9px] text-white/40">{need.categoria}</span>
                          </div>
                        </div>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${
                            PRIORITY_STYLES[need.prioridad]
                          }`}
                        >
                          {need.prioridad}
                        </span>
                      </div>

                      {need.descripcion && (
                        <p className="text-[10px] text-white/50 leading-relaxed bg-black/10 p-2 rounded border border-white/5">
                          {need.descripcion}
                        </p>
                      )}

                      <div className="border-t border-[#2B5F8E]/10 pt-2.5">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[9px] text-white/30">
                            Meta: {need.meta} {need.unidad}
                          </span>
                          <span className="text-[10px] font-bold text-[#4A89C0]">
                            {pct}% cubierto
                          </span>
                        </div>
                        <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#4A89C0]"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="flex items-center gap-1 mt-1.5 text-[9px] text-white/30">
                          <CalendarClock className="w-3 h-3" />
                          Límite: {new Date(need.fechaNecesidad).toLocaleDateString('es-VE', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
