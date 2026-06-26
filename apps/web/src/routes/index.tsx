import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState, useEffect, useRef } from 'react'
import {
  Heart,
  AlertTriangle,
  TrendingUp,
  Package,
  MapPin,
  Clock,
  ChevronRight,
  Droplets,
  Pill,
  Wheat,
  Baby,
  Shirt,
  Wrench,
  SprayCan,
  Wind,
  Sparkles,
} from 'lucide-react'

export const Route = createFileRoute('/')({
  component: NecesidadesPage,
})

// --- Tipos ---
interface Necesidad {
  id: string
  nombre: string
  categoria: string
  unidad: string
  meta: number
  recibido: number
  prioridad: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA'
  descripcion: string
  ultimaActualizacion: string
}

// --- Mock fallback ---
const MOCK_NECESIDADES: Necesidad[] = [
  {
    id: 'nec-001',
    nombre: 'Agua potable',
    categoria: 'Víveres',
    unidad: 'litros',
    meta: 10000,
    recibido: 3200,
    prioridad: 'CRITICA',
    descripcion: 'Agua purificada para consumo humano en zonas sin servicio.',
    ultimaActualizacion: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: 'nec-002',
    nombre: 'Acetaminofén 500mg',
    categoria: 'Medicamentos',
    unidad: 'tabletas',
    meta: 50000,
    recibido: 18000,
    prioridad: 'CRITICA',
    descripcion: 'Analgésico esencial para centros de atención médica improvisados.',
    ultimaActualizacion: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  },
  {
    id: 'nec-003',
    nombre: 'Arroz blanco',
    categoria: 'Víveres',
    unidad: 'kg',
    meta: 5000,
    recibido: 2800,
    prioridad: 'ALTA',
    descripcion: 'Alimento base para raciones diarias en albergues.',
    ultimaActualizacion: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: 'nec-004',
    nombre: 'Pañales desechables',
    categoria: 'Artículos para bebés y grupos vulnerables',
    unidad: 'unidades',
    meta: 8000,
    recibido: 1100,
    prioridad: 'CRITICA',
    descripcion: 'Tallas medianas y grandes para bebés en albergues.',
    ultimaActualizacion: new Date(Date.now() - 1000 * 60 * 200).toISOString(),
  },
  {
    id: 'nec-005',
    nombre: 'Frazadas / mantas',
    categoria: 'Abrigo y refugio',
    unidad: 'unidades',
    meta: 3000,
    recibido: 2200,
    prioridad: 'MEDIA',
    descripcion: 'Para familias evacuadas en zonas altas con bajas temperaturas.',
    ultimaActualizacion: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
  },
  {
    id: 'nec-006',
    nombre: 'Jabón de baño',
    categoria: 'Higiene personal',
    unidad: 'unidades',
    meta: 6000,
    recibido: 4500,
    prioridad: 'MEDIA',
    descripcion: 'Barras de jabón para higiene personal en albergues.',
    ultimaActualizacion: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
  },
  {
    id: 'nec-007',
    nombre: 'Linternas y pilas',
    categoria: 'Herramientas',
    unidad: 'kits',
    meta: 1500,
    recibido: 320,
    prioridad: 'ALTA',
    descripcion: 'Kits de iluminación para zonas sin electricidad.',
    ultimaActualizacion: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    id: 'nec-008',
    nombre: 'Cloro / desinfectante',
    categoria: 'Productos de limpieza',
    unidad: 'litros',
    meta: 2000,
    recibido: 1600,
    prioridad: 'BAJA',
    descripcion: 'Desinfectante para limpieza de espacios colectivos.',
    ultimaActualizacion: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
  },
]

// --- Mensajes emotivos rotativos ---
const MENSAJES_EMOTIVOS = [
  'Cada litro de agua que donas salva una familia esta noche.',
  'Hoy hay bebés durmiendo en albergues. Tus pañales importan.',
  'Una frazada puede ser la diferencia entre el frío y la esperanza.',
  'No existe donación pequeña cuando alguien lo necesita todo.',
  'Detrás de cada número hay una persona esperando.',
  'Tu gesto hoy puede ser el recuerdo más importante de alguien.',
  'La solidaridad no tiene monto mínimo. Solo corazón.',
  'Aunque la meta parezca lejos, cada aporte nos acerca.',
]

// --- Helpers ---
function getPorcentaje(recibido: number, meta: number) {
  return Math.min(Math.round((recibido / meta) * 100), 100)
}

function formatNumero(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return n.toString()
}

function tiempoRelativo(isoString: string) {
  const diff = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `hace ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  return `hace ${Math.floor(hrs / 24)}d`
}

const PRIORIDAD_CONFIG = {
  CRITICA: {
    label: 'Crítica',
    barColor: 'bg-red-500',
    glowColor: 'shadow-red-500/40',
    textColor: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    dotColor: 'bg-red-400',
    badgeBg: 'bg-red-500/15 text-red-300 border-red-500/30',
  },
  ALTA: {
    label: 'Alta',
    barColor: 'bg-orange-500',
    glowColor: 'shadow-orange-500/30',
    textColor: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/25',
    dotColor: 'bg-orange-400',
    badgeBg: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  },
  MEDIA: {
    label: 'Media',
    barColor: 'bg-amber-400',
    glowColor: 'shadow-amber-400/20',
    textColor: 'text-amber-400',
    bgColor: 'bg-amber-400/8',
    borderColor: 'border-amber-400/20',
    dotColor: 'bg-amber-400',
    badgeBg: 'bg-amber-400/15 text-amber-300 border-amber-400/25',
  },
  BAJA: {
    label: 'Baja',
    barColor: 'bg-emerald-500',
    glowColor: 'shadow-emerald-500/20',
    textColor: 'text-emerald-400',
    bgColor: 'bg-emerald-500/8',
    borderColor: 'border-emerald-500/20',
    dotColor: 'bg-emerald-400',
    badgeBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
  },
}

const CATEGORIA_ICONO: Record<string, React.ReactNode> = {
  Víveres: <Wheat className="w-5 h-5" />,
  Medicamentos: <Pill className="w-5 h-5" />,
  'Higiene personal': <SprayCan className="w-5 h-5" />,
  'Productos de limpieza': <Wind className="w-5 h-5" />,
  'Abrigo y refugio': <Shirt className="w-5 h-5" />,
  Herramientas: <Wrench className="w-5 h-5" />,
  'Artículos para bebés y grupos vulnerables': <Baby className="w-5 h-5" />,
}

// --- Barra de progreso animada ---
function BarraProgreso({
  porcentaje,
  barColor,
}: {
  porcentaje: number
  barColor: string
}) {
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setWidth(porcentaje), 80)
    return () => clearTimeout(t)
  }, [porcentaje])

  return (
    <div className="relative w-full h-2 rounded-full bg-white/5 overflow-hidden">
      <div
        className={`absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out ${barColor}`}
        style={{ width: `${width}%` }}
      />
    </div>
  )
}

// --- Tarjeta de necesidad ---
function TarjetaNecesidad({ nec, index }: { nec: Necesidad; index: number }) {
  const cfg = PRIORIDAD_CONFIG[nec.prioridad]
  const pct = getPorcentaje(nec.recibido, nec.meta)
  const falta = nec.meta - nec.recibido

  return (
    <article
      className={`
        relative rounded-2xl border p-5 flex flex-col gap-4
        bg-white/[0.03] ${cfg.borderColor} backdrop-blur-sm
        transition-all duration-300
        hover:bg-white/[0.06] hover:border-white/20 hover:shadow-xl ${cfg.glowColor}
        group
      `}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Prioridad CRITICA: borde superior pulsante */}
      {nec.prioridad === 'CRITICA' && (
        <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-red-500/70 to-transparent" />
      )}

      {/* Header tarjeta */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${cfg.bgColor} ${cfg.textColor} shrink-0`}>
            {CATEGORIA_ICONO[nec.categoria] ?? <Package className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white leading-tight">{nec.nombre}</h3>
            <span className="text-[11px] text-white/40 font-medium">{nec.categoria}</span>
          </div>
        </div>

        <span className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wide ${cfg.badgeBg}`}>
          {cfg.label}
        </span>
      </div>

      {/* Descripción */}
      <p className="text-[12px] text-white/50 leading-relaxed">{nec.descripcion}</p>

      {/* Progreso */}
      <div className="flex flex-col gap-2">
        <div className="flex items-end justify-between">
          <div>
            <span className="text-2xl font-black text-white tabular-nums leading-none">
              {pct}%
            </span>
            <span className="text-[11px] text-white/40 ml-1.5">cubierto</span>
          </div>
          <div className="text-right">
            <span className={`text-xs font-bold tabular-nums ${cfg.textColor}`}>
              {formatNumero(falta)}
            </span>
            <span className="text-[11px] text-white/40"> {nec.unidad} faltan</span>
          </div>
        </div>

        <BarraProgreso porcentaje={pct} barColor={cfg.barColor} />

        <div className="flex items-center justify-between text-[10px] text-white/30">
          <span>{formatNumero(nec.recibido)} recibidos</span>
          <span>meta: {formatNumero(nec.meta)}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-1.5 pt-1 border-t border-white/5">
        <Clock className="w-3 h-3 text-white/25 shrink-0" />
        <span className="text-[10px] text-white/30">Actualizado {tiempoRelativo(nec.ultimaActualizacion)}</span>
      </div>
    </article>
  )
}

// --- Stat summary header ---
function StatBadge({ value, label, urgent }: { value: string | number; label: string; urgent?: boolean }) {
  return (
    <div className={`flex flex-col items-center px-5 py-3 rounded-xl border ${urgent ? 'bg-red-500/10 border-red-500/25' : 'bg-white/5 border-white/10'}`}>
      <span className={`text-xl font-black tabular-nums ${urgent ? 'text-red-400' : 'text-white'}`}>{value}</span>
      <span className="text-[10px] text-white/40 font-medium mt-0.5 whitespace-nowrap">{label}</span>
    </div>
  )
}

// --- Mensaje emotivo rotativo ---
function MensajeEmotivo() {
  const [idx, setIdx] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setIdx(i => (i + 1) % MENSAJES_EMOTIVOS.length)
        setVisible(true)
      }, 400)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <p
      className="text-sm text-white/60 text-center italic leading-relaxed max-w-md mx-auto transition-opacity duration-400"
      style={{ opacity: visible ? 1 : 0 }}
    >
      "{MENSAJES_EMOTIVOS[idx]}"
    </p>
  )
}

// --- Página principal ---
function NecesidadesPage() {
  const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
  const [filtro, setFiltro] = useState<'TODAS' | 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA'>('TODAS')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    document.documentElement.classList.add('dark')
    const t = setTimeout(() => setMounted(true), 100)
    return () => clearTimeout(t)
  }, [])

  const { data, isLoading } = useQuery<Necesidad[]>({
    queryKey: ['necesidades'],
    queryFn: async () => {
      const res = await fetch(`${apiUrl}/api/necesidades`)
      if (!res.ok) throw new Error('API error')
      return res.json()
    },
    placeholderData: MOCK_NECESIDADES,
  })

  const necesidades = data ?? MOCK_NECESIDADES

  const criticas = necesidades.filter(n => n.prioridad === 'CRITICA').length
  const totalMeta = necesidades.reduce((s, n) => s + n.meta, 0)
  const totalRecibido = necesidades.reduce((s, n) => s + n.recibido, 0)
  const pctGeneral = getPorcentaje(totalRecibido, totalMeta)

  const filtradas =
    filtro === 'TODAS' ? necesidades : necesidades.filter(n => n.prioridad === filtro)

  const ordenadas = [...filtradas].sort((a, b) => {
    const ord = { CRITICA: 0, ALTA: 1, MEDIA: 2, BAJA: 3 }
    return ord[a.prioridad] - ord[b.prioridad]
  })

  return (
    <div
      className="min-h-dvh w-full overflow-x-hidden"
      style={{
        background: 'radial-gradient(ellipse 120% 80% at 50% -10%, hsl(0 60% 8% / 0.9) 0%, hsl(240 15% 4%) 60%)',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Grain texture overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '200px',
        }}
      />

      {/* Glow top left decorativo */}
      <div className="pointer-events-none fixed top-0 left-0 w-96 h-96 rounded-full bg-red-600/10 blur-[120px] -translate-x-1/2 -translate-y-1/2 z-0" />
      <div className="pointer-events-none fixed bottom-0 right-0 w-80 h-80 rounded-full bg-orange-500/8 blur-[100px] translate-x-1/4 translate-y-1/4 z-0" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8 md:px-8 md:py-12">

        {/* HERO HEADER */}
        <header
          className="mb-10 transition-all duration-700"
          style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(16px)' }}
        >
          {/* Nav top */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-red-500/20 text-red-400">
                <Heart className="w-4.5 h-4.5" style={{ width: '18px', height: '18px' }} />
              </div>
              <div>
                <span className="block text-xs font-bold text-white/80 tracking-tight leading-none">SOS Logística</span>
                <span className="block text-[10px] text-white/35 mt-0.5 leading-none">Venezuela</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                to="/map"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/60 text-xs font-medium hover:bg-white/10 hover:text-white/80 transition-all duration-200 group"
              >
                <MapPin className="w-3.5 h-3.5" />
                Ver mapa
                <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                <span className="text-[10px] font-bold text-red-300 uppercase tracking-wider">En vivo</span>
              </div>
            </div>
          </div>

          {/* Título */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-[11px] font-bold text-red-400 uppercase tracking-[0.15em]">Respuesta de emergencia activa</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white leading-[1.05] tracking-tight mb-4" style={{ fontFamily: '"Syne", system-ui, sans-serif' }}>
              Lo que más<br />
              <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #f87171 0%, #fb923c 100%)' }}>
                necesitamos hoy
              </span>
            </h1>
            <p className="text-sm text-white/50 max-w-lg leading-relaxed">
              Estas son las necesidades urgentes de los centros de acopio activos.
              Cada donación se registra en tiempo real y actualiza estas cifras.
            </p>
          </div>

          {/* Stats resumen */}
          <div className="flex flex-wrap gap-2 mb-6">
            <StatBadge value={criticas} label="necesidades críticas" urgent />
            <StatBadge value={necesidades.length} label="ítems activos" />
            <StatBadge value={`${pctGeneral}%`} label="cubierto en total" />
            <StatBadge value={formatNumero(totalRecibido)} label="unidades recibidas" />
          </div>

          {/* Progreso general */}
          <div className="p-4 rounded-2xl border border-white/8 bg-white/[0.03] backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-white/40" />
                <span className="text-xs font-semibold text-white/60">Progreso general de la campaña</span>
              </div>
              <span className="text-sm font-black text-white tabular-nums">{pctGeneral}%</span>
            </div>
            <BarraProgreso
              porcentaje={pctGeneral}
              barColor="bg-gradient-to-r from-orange-500 to-red-500"
            />
            <div className="flex justify-between mt-1.5 text-[10px] text-white/25">
              <span>{formatNumero(totalRecibido)} unidades recibidas</span>
              <span>meta: {formatNumero(totalMeta)}</span>
            </div>
          </div>
        </header>

        {/* MENSAJE EMOTIVO */}
        <div
          className="mb-10 py-5 px-6 rounded-2xl border border-white/8 bg-gradient-to-r from-white/[0.02] to-white/[0.04] backdrop-blur-sm text-center transition-all duration-700"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(12px)',
            transitionDelay: '150ms',
          }}
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-orange-400/70" />
            <span className="text-[10px] font-bold text-orange-400/70 uppercase tracking-[0.15em]">Cada gesto importa</span>
            <Sparkles className="w-3.5 h-3.5 text-orange-400/70" />
          </div>
          <MensajeEmotivo />
        </div>

        {/* FILTROS */}
        <div
          className="flex flex-wrap gap-2 mb-6 transition-all duration-700"
          style={{
            opacity: mounted ? 1 : 0,
            transitionDelay: '200ms',
          }}
        >
          {(['TODAS', 'CRITICA', 'ALTA', 'MEDIA', 'BAJA'] as const).map(p => {
            const active = filtro === p
            const cfg = p === 'TODAS' ? null : PRIORIDAD_CONFIG[p]
            return (
              <button
                key={p}
                onClick={() => setFiltro(p)}
                className={`
                  px-4 py-1.5 rounded-full text-[11px] font-semibold border transition-all duration-200 active:scale-[0.97] cursor-pointer
                  ${active
                    ? cfg
                      ? `${cfg.bgColor} ${cfg.textColor} ${cfg.borderColor} shadow-lg`
                      : 'bg-white/10 text-white border-white/20 shadow-lg'
                    : 'bg-white/[0.03] text-white/40 border-white/8 hover:bg-white/8 hover:text-white/70 hover:border-white/15'
                  }
                `}
              >
                {p === 'TODAS' ? 'Todas' : PRIORIDAD_CONFIG[p].label}
                {p !== 'TODAS' && (
                  <span className={`ml-1.5 tabular-nums ${active ? 'opacity-80' : 'opacity-50'}`}>
                    {necesidades.filter(n => n.prioridad === p).length}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* GRID DE NECESIDADES */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-white/8 bg-white/[0.03] h-52 animate-pulse" />
            ))}
          </div>
        ) : ordenadas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Package className="w-12 h-12 text-white/15 mb-4" />
            <p className="text-white/40 text-sm">No hay necesidades con ese filtro actualmente.</p>
          </div>
        ) : (
          <div
            className="grid grid-cols-1 md:grid-cols-2 gap-4 transition-all duration-700"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(20px)',
              transitionDelay: '250ms',
            }}
          >
            {ordenadas.map((nec, i) => (
              <TarjetaNecesidad key={nec.id} nec={nec} index={i} />
            ))}
          </div>
        )}

        {/* FOOTER CTA */}
        <footer
          className="mt-14 pt-10 border-t border-white/8 text-center transition-all duration-700"
          style={{
            opacity: mounted ? 1 : 0,
            transitionDelay: '400ms',
          }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-orange-500/20 bg-orange-500/8 mb-5">
            <Heart className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-xs font-semibold text-orange-300">Las necesidades de hoy pueden ser las de mañana</span>
          </div>
          <p className="text-white/35 text-xs max-w-sm mx-auto leading-relaxed mb-8">
            Aunque una necesidad esté cubierta hoy, los centros siguen abiertos
            y las familias siguen llegando. Cualquier donación adicional se convierte en reserva estratégica.
          </p>
          <div className="flex items-center justify-center gap-3 text-[11px] text-white/20">
            <span>SOS Logística Venezuela</span>
            <span>·</span>
            <Link to="/map" className="hover:text-white/50 transition-colors flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              Ver centros en el mapa
            </Link>
          </div>
        </footer>
      </div>
    </div>
  )
}
