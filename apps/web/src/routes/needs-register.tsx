import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
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
  Search,
} from 'lucide-react'
import { API_URL } from '@/lib/auth/config'
import logotipo from '@/assets/branding/white-logotipo.webp'
import { INVENTORY_CATEGORIES } from '@sos/shared'

export const Route = createFileRoute('/needs-register')({
  component: PublicNeedsRegisterPage,
})

interface Center {
  id: string
  nombre: string
  direccion: string
  contacto: string
  tipo: string
}

interface Product {
  id: string
  name: string
  category: string
  unit: string
  description: string
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

function PublicNeedsRegisterPage() {
  const queryClient = useQueryClient()
  const [selectedHubId, setSelectedHubId] = useState<string>('')
  const [itemQuery, setItemQuery] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isCreatingCustomProduct, setIsCreatingCustomProduct] = useState(false)
  const [customCategory, setCustomCategory] = useState(INVENTORY_CATEGORIES[0])
  const [showSuggestions, setShowSuggestions] = useState(false)

  const [meta, setMeta] = useState<number>(0)
  const [prioridad, setPrioridad] = useState('ALTA')
  const [descripcion, setDescripcion] = useState('')
  const [fechaNecesidad, setFechaNecesidad] = useState(
    new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString().split('T')[0]
  )

  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // 1. Fetch Centers (filter to 'acopio' / collection centers)
  const { data: centers = [], isLoading: loadingCenters } = useQuery<Center[]>({
    queryKey: ['centros'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/centros`)
      if (!res.ok) throw new Error('API error')
      const all = await res.json()
      return all.filter((c: Center) => c.tipo === 'acopio')
    },
  })

  // 2. Fetch Catalog Products
  const { data: catalogProducts = [], isLoading: loadingProducts } = useQuery<Product[]>({
    queryKey: ['productos'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/productos`)
      if (!res.ok) throw new Error('API error')
      return res.json()
    },
  })

  // 3. Fetch Needs for Selected Hub
  const { data: activeNeeds = [], isLoading: loadingNeeds, refetch: refetchNeeds } = useQuery<Need[]>({
    queryKey: ['necesidades', selectedHubId],
    queryFn: async () => {
      if (!selectedHubId) return []
      const res = await fetch(`${API_URL}/api/necesidades?hubId=${selectedHubId}`)
      if (!res.ok) throw new Error('API error')
      return res.json()
    },
    enabled: !!selectedHubId,
  })

  // Autocomplete Suggestions
  const suggestions = useMemo(() => {
    if (!itemQuery.trim()) return []
    const filtered = catalogProducts.filter((p) =>
      p.name.toLowerCase().includes(itemQuery.toLowerCase())
    )
    return filtered.slice(0, 5)
  }, [catalogProducts, itemQuery])

  // Submit Need Mutation
  const createNeedMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch(`${API_URL}/api/necesidades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Fallo al registrar la necesidad')
      }
      return res.json()
    },
    onSuccess: () => {
      setSuccessMsg('¡Requerimiento registrado con éxito!')
      setErrorMsg('')
      refetchNeeds()
      // Reset form
      setItemQuery('')
      setSelectedProduct(null)
      setIsCreatingCustomProduct(false)
      setMeta(0)
      setDescripcion('')
      queryClient.invalidateQueries({ queryKey: ['productos'] }) // Refresh catalog
      setTimeout(() => setSuccessMsg(''), 5000)
    },
    onError: (err: any) => {
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
    if (!selectedProduct && !isCreatingCustomProduct) {
      setErrorMsg('Debe seleccionar un producto válido del catálogo o crear uno nuevo.')
      return
    }
    if (meta <= 0) {
      setErrorMsg('La cantidad requerida debe ser mayor a 0.')
      return
    }

    const payload = {
      hubId: selectedHubId,
      nombre: isCreatingCustomProduct ? itemQuery : selectedProduct?.name,
      categoria: isCreatingCustomProduct ? customCategory : selectedProduct?.category,
      meta,
      prioridad,
      descripcion,
      fechaNecesidad,
    }

    createNeedMutation.mutate(payload)
  }

  const selectedCenter = centers.find((c) => c.id === selectedHubId)

  return (
    <div
      className="min-h-dvh w-full overflow-x-hidden text-white pb-20 relative"
      style={{ background: 'linear-gradient(160deg, #152D46 0%, #0F2337 50%, #0A1B2A 100%)' }}
    >
      {/* Decorative Grid */}
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
        {/* Navigation back */}
        <div className="mb-6 flex justify-between items-center">
          <Link
            to="/"
            className="flex items-center gap-2 text-xs font-semibold text-[#C8DCF0]/60 hover:text-white transition-colors duration-200"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Volver a la página principal
          </Link>
          <img
            src={logotipo}
            alt="Portuguesa Unida"
            className="h-10 w-auto object-contain opacity-80"
          />
        </div>

        {/* Header Title */}
        <div className="mb-8">
          <span className="text-[10px] font-bold text-[#C8DCF0]/50 uppercase tracking-[0.15em] mb-1 block">
            Coordinación sin Registro
          </span>
          <h1
            className="leading-[0.95] tracking-tight mb-2 italic font-black text-white"
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 'clamp(2rem, 5vw, 3.2rem)',
            }}
          >
            REPORTAR NECESIDADES DE UN CENTRO
          </h1>
          <p className="text-xs text-white/50 max-w-2xl leading-relaxed">
            Si representás a un centro de acopio activo, podés reportar de forma directa los insumos que se requieren con urgencia. El listado se actualizará inmediatamente en el panel público de donaciones.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-6 items-start">
          {/* Form Side */}
          <div className="rounded-2xl border border-[#2B5F8E]/40 bg-[#152D46]/60 backdrop-blur-sm p-5 shadow-xl">
            <h2 className="text-sm font-bold text-[#C8DCF0] mb-4 flex items-center gap-2">
              <Heart className="w-4 h-4 text-[#4A89C0]" />
              Formulario de Requerimiento
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
                  <select
                    value={selectedHubId}
                    onChange={(e) => {
                      setSelectedHubId(e.target.value)
                      // Reset product selections
                      setItemQuery('')
                      setSelectedProduct(null)
                      setIsCreatingCustomProduct(false)
                    }}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0F2337]/80 border border-[#2B5F8E]/40 text-xs text-white focus:outline-none focus:border-[#4A89C0]/50 appearance-none cursor-pointer"
                  >
                    <option value="">Selecciona el centro de acopio...</option>
                    {centers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre} ({c.direccion})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-white/40 absolute right-3 top-3.5 pointer-events-none" />
                </div>
              </div>

              {selectedHubId && (
                <>
                  {/* Select Product */}
                  <div>
                    <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider block mb-1.5">
                      Suministro Requerido
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={itemQuery}
                        onChange={(e) => {
                          setItemQuery(e.target.value)
                          setSelectedProduct(null)
                          setIsCreatingCustomProduct(false)
                          setShowSuggestions(true)
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        placeholder="Escribe el nombre del insumo (ej. Harina, Gasas...)"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#0F2337]/80 border border-[#2B5F8E]/40 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#4A89C0]/50"
                      />

                      {showSuggestions && (
                        <div className="absolute left-0 right-0 mt-1 z-50 rounded-xl border border-[#2B5F8E]/50 bg-[#0F2337] shadow-xl overflow-hidden max-h-56 overflow-y-auto">
                          {suggestions.map((prod) => (
                            <button
                              key={prod.id}
                              type="button"
                              onClick={() => {
                                setSelectedProduct(prod)
                                setItemQuery(prod.name)
                                setIsCreatingCustomProduct(false)
                                setShowSuggestions(false)
                              }}
                              className="w-full text-left px-4 py-2.5 text-xs text-white/80 hover:text-white hover:bg-[#2B5F8E]/40 border-b border-[#2B5F8E]/10 last:border-0 flex items-center justify-between cursor-pointer"
                            >
                              <span>{prod.name}</span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-white/40 font-mono">
                                {prod.category} • {prod.unit}
                              </span>
                            </button>
                          ))}

                          {itemQuery.trim().length > 1 &&
                            !catalogProducts.some(
                              (p) => p.name.toLowerCase() === itemQuery.trim().toLowerCase()
                            ) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setIsCreatingCustomProduct(true)
                                  setSelectedProduct(null)
                                  setShowSuggestions(false)
                                }}
                                className="w-full text-left px-4 py-2.5 text-xs text-[#4A89C0] hover:text-white hover:bg-[#2B5F8E]/40 border-t border-[#2B5F8E]/20 flex items-center gap-1.5 font-bold cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                Crear nuevo suministro: "{itemQuery}"
                              </button>
                            )}
                        </div>
                      )}
                    </div>

                    {/* Show dynamic creation info */}
                    {selectedProduct && (
                      <div className="mt-2 text-[10px] text-white/50 flex items-center gap-1">
                        <span className="font-bold text-[#4A89C0]">Producto Oficial:</span>
                        <span>
                          {selectedProduct.category} (se mide en {selectedProduct.unit})
                        </span>
                      </div>
                    )}

                    {isCreatingCustomProduct && (
                      <div className="mt-3 p-3 rounded-xl border border-[#2B5F8E]/30 bg-[#2B5F8E]/15 flex flex-col gap-2 animate-fadeIn">
                        <span className="text-[10px] font-bold text-[#C8DCF0] uppercase tracking-wider">
                          Configurar nuevo suministro
                        </span>
                        <div>
                          <label className="text-[9px] font-semibold text-white/40 block mb-1">
                            Categoría del Producto
                          </label>
                          <select
                            value={customCategory}
                            onChange={(e) => setCustomCategory(e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg bg-[#0F2337]/90 border border-[#2B5F8E]/40 text-xs text-white focus:outline-none cursor-pointer"
                          >
                            {INVENTORY_CATEGORIES.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="text-[10px] text-white/40 leading-snug">
                          💡 **Regla de Medida**:
                          {customCategory === 'Medicamentos' ? (
                            <span className="text-red-400 font-bold"> Se medirá por Cajas (unidades).</span>
                          ) : (
                            <span className="text-[#4A89C0] font-bold"> Se medirá por Peso (kg).</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Quantity & Priority */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider block mb-1.5">
                        Cantidad Requerida
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={meta === 0 ? '' : meta}
                          onChange={(e) => setMeta(Number(e.target.value))}
                          placeholder="ej. 500"
                          required
                          className="w-full px-3 py-2 rounded-xl bg-[#0F2337]/80 border border-[#2B5F8E]/40 text-xs text-white focus:outline-none focus:border-[#4A89C0]/50"
                        />
                        <span className="absolute right-3.5 top-2.5 text-[10px] text-white/30 font-bold font-mono">
                          {isCreatingCustomProduct
                            ? customCategory === 'Medicamentos'
                              ? 'cajas'
                              : 'kg'
                            : selectedProduct
                              ? selectedProduct.unit
                              : ''}
                        </span>
                      </div>
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

                  {/* Limit Date & Description */}
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
                    <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider block mb-1.5 font-sans">
                      Descripción o Instrucciones (Opcional)
                    </label>
                    <textarea
                      value={descripcion}
                      onChange={(e) => setDescripcion(e.target.value)}
                      placeholder="Indique especificaciones adicionales o condiciones de entrega..."
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
                        Registrando requerimiento...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" strokeWidth={3} />
                        Registrar requerimiento
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
              <span>Necesidades del Centro</span>
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
                  Elija un centro en el formulario para poder visualizar los suministros que ya han sido solicitados.
                </p>
              </div>
            ) : loadingNeeds ? (
              <div className="flex flex-col items-center justify-center py-20 text-white/30">
                <Loader2 className="w-6 h-6 animate-spin mb-2" />
                <span className="text-[10px]">Cargando requerimientos...</span>
              </div>
            ) : activeNeeds.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-white/25">
                <Inbox className="w-10 h-10 mb-3 text-white/10" />
                <p className="text-xs font-semibold">Sin requerimientos activos</p>
                <p className="text-[10px] max-w-xs mt-1 leading-relaxed">
                  Este centro no tiene necesidades registradas aún. ¡Agrega la primera completando el formulario!
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
                        <div>
                          <h4 className="font-bold text-white text-[13px]">{need.nombre}</h4>
                          <span className="text-[9px] text-white/40">{need.categoria}</span>
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

                      <div className="border-t border-[#2B5F8E]/10 pt-2.5 flex items-center justify-between">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[9px] text-white/30">Meta del centro</span>
                          <span className="text-[11px] font-bold text-white/90">
                            {need.meta} {need.unidad}
                          </span>
                        </div>
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-[9px] text-white/30 font-mono flex items-center gap-1">
                            <CalendarClock className="w-3 h-3" />
                            Límite: {new Date(need.fechaNecesidad).toLocaleDateString('es-VE', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </span>
                          <span className="text-[10px] font-bold text-[#4A89C0]">
                            Recibido: {pct}%
                          </span>
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
