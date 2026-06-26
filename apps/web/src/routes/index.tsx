import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import {
  Heart,
  TrendingUp,
  Package,
  MapPin,
  Clock,
  ChevronRight,
  Pill,
  Wheat,
  Baby,
  Shirt,
  Wrench,
  SprayCan,
  Wind,
  Sparkles,
  CalendarClock,
} from 'lucide-react'

import isologo from '@/assets/branding/white-isologo.webp'

export const Route = createFileRoute('/')({
  component: NecesidadesPage,
})

// --- Types ---
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
  fechaNecesidad: string // ISO date — cuando se necesita para
}

// --- Date helpers ---
function daysFromNow(iso: string): number {
  const target = new Date(iso)
  target.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function urgencyLabel(iso: string): { text: string; urgent: boolean; overdue: boolean } {
  const days = daysFromNow(iso)
  if (days < 0) return { text: 'Vencido', urgent: true, overdue: true }
  if (days === 0) return { text: 'Se necesita HOY', urgent: true, overdue: false }
  if (days === 1) return { text: 'Se necesita MAÑANA', urgent: true, overdue: false }
  if (days <= 3) return { text: `En ${days} días`, urgent: true, overdue: false }
  return { text: `Para el ${new Date(iso).toLocaleDateString('es-VE', { day: 'numeric', month: 'short' })}`, urgent: false, overdue: false }
}

function todayPlus(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

// --- Mock data ---
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
    fechaNecesidad: todayPlus(0),
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
    fechaNecesidad: todayPlus(1),
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
    fechaNecesidad: todayPlus(1),
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
    fechaNecesidad: todayPlus(0),
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
    fechaNecesidad: todayPlus(3),
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
    fechaNecesidad: todayPlus(4),
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
    fechaNecesidad: todayPlus(2),
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
    fechaNecesidad: todayPlus(7),
  },
]

// --- Rotating messages ---
const MENSAJES_ACTIVOS = [
  'Cada litro de agua que donas salva una familia esta noche.',
  'Hoy hay bebés durmiendo en albergues. Tus pañales importan.',
  'Una frazada puede ser la diferencia entre el frío y la esperanza.',
  'No existe donación pequeña cuando alguien lo necesita todo.',
  'Detrás de cada número hay una persona esperando.',
  'Tu gesto hoy puede ser el recuerdo más importante de alguien.',
  'La solidaridad no tiene monto mínimo. Solo corazón.',
]

const MENSAJES_CUBIERTOS = [
  'Esta necesidad está cubierta por ahora — pero el mañana también importa.',
  'La meta se alcanzó. Cualquier donación extra queda en reserva para los próximos días.',
  'Gracias a quienes donaron. Si quieres ayudar, considera los ítems que aún faltan.',
  'Lo que sobra hoy salva vidas mañana. Las reservas también cuentan.',
]

// --- Helpers ---
function getPct(recibido: number, meta: number) {
  return Math.min(Math.round((recibido / meta) * 100), 100)
}
function fmt(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return n.toString()
}
function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 60) return `hace ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  return `hace ${Math.floor(hrs / 24)}d`
}

// Urgency through contrast + typography — no red/orange
const PRIORIDAD_CONFIG = {
  CRITICA: {
    label: 'Crítica',
    barColor: 'bg-white',
    barBg: 'bg-white/15',
    textColor: 'text-white',
    dimText: 'text-white/70',
    cardBg: 'bg-[#2B5F8E]',
    cardBorder: 'border-[#4A89C0]/40',
    badgeBg: 'bg-white/20 text-white border-white/30',
    iconBg: 'bg-white/15 text-white',
    glow: 'shadow-[0_8px_32px_rgba(43,95,142,0.5)]',
    topAccent: true,
    divider: 'border-white/15',
  },
  ALTA: {
    label: 'Alta',
    barColor: 'bg-[#4A89C0]',
    barBg: 'bg-white/10',
    textColor: 'text-white',
    dimText: 'text-white/60',
    cardBg: 'bg-[#1E4A6E]/90',
    cardBorder: 'border-[#2B5F8E]/50',
    badgeBg: 'bg-[#4A89C0]/20 text-[#C8DCF0] border-[#4A89C0]/40',
    iconBg: 'bg-[#2B5F8E]/60 text-[#C8DCF0]',
    glow: 'shadow-[0_4px_20px_rgba(15,35,55,0.5)]',
    topAccent: false,
    divider: 'border-white/10',
  },
  MEDIA: {
    label: 'Media',
    barColor: 'bg-[#4A89C0]/70',
    barBg: 'bg-white/8',
    textColor: 'text-white',
    dimText: 'text-white/50',
    cardBg: 'bg-[#152D46]/90',
    cardBorder: 'border-[#2B5F8E]/25',
    badgeBg: 'bg-[#2B5F8E]/25 text-[#C8DCF0]/80 border-[#2B5F8E]/30',
    iconBg: 'bg-[#2B5F8E]/30 text-[#C8DCF0]/80',
    glow: 'shadow-[0_2px_12px_rgba(15,35,55,0.4)]',
    topAccent: false,
    divider: 'border-white/8',
  },
  BAJA: {
    label: 'Baja',
    barColor: 'bg-[#4A89C0]/50',
    barBg: 'bg-white/5',
    textColor: 'text-white/80',
    dimText: 'text-white/40',
    cardBg: 'bg-[#0F2337]/80',
    cardBorder: 'border-[#2B5F8E]/15',
    badgeBg: 'bg-[#2B5F8E]/15 text-[#C8DCF0]/60 border-[#2B5F8E]/20',
    iconBg: 'bg-[#2B5F8E]/20 text-[#C8DCF0]/60',
    glow: '',
    topAccent: false,
    divider: 'border-white/6',
  },
}

const CATEGORIA_ICON: Record<string, React.ReactNode> = {
  'Víveres': <Wheat className="w-5 h-5" />,
  'Medicamentos': <Pill className="w-5 h-5" />,
  'Higiene personal': <SprayCan className="w-5 h-5" />,
  'Productos de limpieza': <Wind className="w-5 h-5" />,
  'Abrigo y refugio': <Shirt className="w-5 h-5" />,
  'Herramientas': <Wrench className="w-5 h-5" />,
  'Artículos para bebés y grupos vulnerables': <Baby className="w-5 h-5" />,
}

// --- Animated progress bar ---
function ProgressBar({ pct, barColor, barBg }: { pct: number; barColor: string; barBg: string }) {
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), 120)
    return () => clearTimeout(t)
  }, [pct])
  return (
    <div className={`relative w-full h-1.5 rounded-full overflow-hidden ${barBg}`}>
      <div
        className={`absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out ${barColor}`}
        style={{ width: `${width}%` }}
      />
    </div>
  )
}

// --- Need card ---
function NeedCard({ nec, index }: { nec: Necesidad; index: number }) {
  const cfg = PRIORIDAD_CONFIG[nec.prioridad]
  const pct = getPct(nec.recibido, nec.meta)
  const missing = nec.meta - nec.recibido
  const isCovered = pct >= 100
  const urgency = urgencyLabel(nec.fechaNecesidad)

  return (
    <article
      className={`
        relative rounded-xl border flex flex-col gap-0
        ${cfg.cardBg} ${cfg.cardBorder} ${cfg.glow}
        transition-all duration-300 hover:brightness-110
        overflow-hidden
      `}
      style={{ animationDelay: `${index * 55}ms` }}
    >
      {/* Top accent stripe for CRITICA */}
      {cfg.topAccent && (
        <div className="absolute top-0 inset-x-0 h-[2px] bg-white/60" />
      )}

      {/* Diagonal texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{ backgroundImage: 'repeating-linear-gradient(45deg, white 0px, white 1px, transparent 1px, transparent 10px)' }}
      />

      {/* ── FECHA URGENCY BANNER — top of card, visually loud ── */}
      <div className={`relative flex items-center gap-2 px-4 py-2 ${
        urgency.overdue
          ? 'bg-white/25'
          : urgency.urgent
            ? nec.prioridad === 'CRITICA' ? 'bg-white/15' : 'bg-[#2B5F8E]/40'
            : 'bg-white/5'
      } border-b ${cfg.divider}`}>
        <CalendarClock className={`w-3.5 h-3.5 shrink-0 ${urgency.urgent ? cfg.textColor : cfg.dimText}`} />
        <span
          className={`font-black uppercase tracking-wide ${urgency.urgent ? cfg.textColor : cfg.dimText}`}
          style={{ fontFamily: "'Barlow Condensed', sans-serif", fontStyle: 'italic', fontSize: urgency.urgent ? '0.85rem' : '0.78rem' }}
        >
          {urgency.text}
        </span>
        {isCovered && (
          <span className="ml-auto text-[10px] font-bold text-white/50 bg-white/10 px-2 py-0.5 rounded-full border border-white/15">
            Meta cubierta
          </span>
        )}
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="flex flex-col gap-4 p-5 relative">

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center w-10 h-10 rounded-lg shrink-0 ${cfg.iconBg}`}>
              {CATEGORIA_ICON[nec.categoria] ?? <Package className="w-5 h-5" />}
            </div>
            <div>
              <h3
                className={`leading-tight ${cfg.textColor}`}
                style={{ fontFamily: "'Barlow Condensed', sans-serif", fontStyle: 'italic', fontWeight: 700, fontSize: '1.1rem', letterSpacing: '0.01em' }}
              >
                {nec.nombre}
              </h3>
              <span className={`text-[11px] font-medium ${cfg.dimText}`}>{nec.categoria}</span>
            </div>
          </div>
          <span className={`shrink-0 px-2.5 py-1 rounded-md text-[10px] font-bold border uppercase tracking-wide ${cfg.badgeBg}`}>
            {cfg.label}
          </span>
        </div>

        {/* Description */}
        <p className={`text-[12px] leading-relaxed ${cfg.dimText}`}>{nec.descripcion}</p>

        {/* Progress */}
        <div className="flex flex-col gap-2">
          <div className="flex items-end justify-between">
            <div>
              <span
                className={`font-black tabular-nums leading-none ${isCovered ? cfg.textColor : cfg.textColor}`}
                style={{ fontFamily: "'Barlow Condensed', sans-serif", fontStyle: 'italic', fontSize: '2rem' }}
              >
                {pct}%
              </span>
              <span className={`text-[11px] ml-1.5 ${cfg.dimText}`}>cubierto</span>
            </div>
            <div className="text-right">
              {isCovered ? (
                <span className={`text-[11px] font-semibold ${cfg.dimText}`}>¡Meta alcanzada!</span>
              ) : (
                <>
                  <span
                    className={`font-bold tabular-nums ${cfg.textColor}`}
                    style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.85rem' }}
                  >
                    {fmt(missing)}
                  </span>
                  <span className={`text-[11px] ${cfg.dimText}`}> {nec.unidad} faltan</span>
                </>
              )}
            </div>
          </div>
          <ProgressBar pct={pct} barColor={cfg.barColor} barBg={cfg.barBg} />
          <div className={`flex justify-between text-[10px] ${cfg.dimText}`}>
            <span>{fmt(nec.recibido)} recibidos</span>
            <span>meta {fmt(nec.meta)}</span>
          </div>
        </div>

        {/* Footer row */}
        <div className={`flex items-center justify-between pt-1 border-t ${cfg.divider}`}>
          <div className="flex items-center gap-1.5">
            <Clock className={`w-3 h-3 shrink-0 ${cfg.dimText}`} />
            <span className={`text-[10px] ${cfg.dimText}`}>Actualizado {timeAgo(nec.ultimaActualizacion)}</span>
          </div>
          {isCovered && (
            <span className={`text-[10px] italic ${cfg.dimText}`}>Toda donación adicional suma como reserva</span>
          )}
        </div>
      </div>
    </article>
  )
}

// --- Summary stat ---
function StatBadge({ value, label, highlight }: { value: string | number; label: string; highlight?: boolean }) {
  return (
    <div className={`flex flex-col items-center px-4 py-3 rounded-xl border ${
      highlight
        ? 'bg-[#2B5F8E] border-[#4A89C0]/50 shadow-[0_4px_16px_rgba(43,95,142,0.4)]'
        : 'bg-[#152D46] border-[#2B5F8E]/30'
    }`}>
      <span
        className="font-black tabular-nums text-white leading-none"
        style={{ fontFamily: "'Barlow Condensed', sans-serif", fontStyle: 'italic', fontSize: '1.5rem' }}
      >
        {value}
      </span>
      <span className="text-[10px] text-white/50 font-medium mt-1 whitespace-nowrap">{label}</span>
    </div>
  )
}

// --- Rotating message (context-aware) ---
function RotatingMessage({ hasCovered }: { hasCovered: boolean }) {
  const pool = hasCovered
    ? [...MENSAJES_ACTIVOS, ...MENSAJES_CUBIERTOS]
    : MENSAJES_ACTIVOS
  const [idx, setIdx] = useState(0)
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    const iv = setInterval(() => {
      setVisible(false)
      setTimeout(() => { setIdx(i => (i + 1) % pool.length); setVisible(true) }, 350)
    }, 5000)
    return () => clearInterval(iv)
  }, [pool.length])
  return (
    <p
      className="text-sm text-white/60 text-center italic leading-relaxed max-w-md mx-auto transition-opacity duration-350"
      style={{ opacity: visible ? 1 : 0 }}
    >
      "{pool[idx % pool.length]}"
    </p>
  )
}

// --- Main page ---
function NecesidadesPage() {
  const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
  const [filter, setFilter] = useState<'TODAS' | 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA'>('TODAS')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    document.documentElement.classList.add('dark')
    const t = setTimeout(() => setMounted(true), 80)
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
  const pctGeneral = getPct(totalRecibido, totalMeta)
  const hasCovered = necesidades.some(n => getPct(n.recibido, n.meta) >= 100)

  const filtered = filter === 'TODAS' ? necesidades : necesidades.filter(n => n.prioridad === filter)
  const ORDER = { CRITICA: 0, ALTA: 1, MEDIA: 2, BAJA: 3 }
  // Sort: first by urgency (days), then by priority
  const sorted = [...filtered].sort((a, b) => {
    const dA = daysFromNow(a.fechaNecesidad)
    const dB = daysFromNow(b.fechaNecesidad)
    if (dA !== dB) return dA - dB
    return ORDER[a.prioridad] - ORDER[b.prioridad]
  })

  return (
    <div
      className="min-h-dvh w-full overflow-x-hidden"
      style={{ background: 'linear-gradient(160deg, #152D46 0%, #0F2337 50%, #0A1B2A 100%)' }}
    >
      {/* Grid pattern */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(43,95,142,0.07) 1px, transparent 1px),
            linear-gradient(90deg, rgba(43,95,142,0.07) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
      />
      <div className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-64 rounded-full bg-[#2B5F8E]/20 blur-[80px] z-0" />

      <div
        className="relative z-10 max-w-5xl mx-auto px-4 py-8 md:px-8 md:py-12"
        style={{ opacity: mounted ? 1 : 0, transition: 'opacity 0.5s ease' }}
      >

        {/* ── HEADER ── */}
        <header className="mb-10">
          <div className="flex items-center justify-between mb-8">

            {/* Brand logo — isologo completo sobre fondo transparente */}
            <div className="flex items-center gap-3">
              <img
                src={isologo}
                alt="Portuguesa Unida"
                className="h-14 w-auto object-contain"
                style={{ filter: 'drop-shadow(0 2px 12px rgba(43,95,142,0.5))' }}
              />
              <div className="hidden sm:block w-px h-8 bg-white/10" />
              <span className="hidden sm:block text-[11px] text-white/35 font-medium leading-tight max-w-[90px]">
                Ayuda humanitaria · Portuguesa
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Link
                to="/map"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2B5F8E]/30 border border-[#2B5F8E]/50 text-white/70 text-xs font-medium hover:bg-[#2B5F8E]/50 hover:text-white transition-all duration-200 group"
              >
                <MapPin className="w-3.5 h-3.5" />
                Ver mapa
                <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#2B5F8E]/40 border border-[#4A89C0]/30">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C8DCF0] animate-pulse" />
                <span className="text-[10px] font-bold text-[#C8DCF0] uppercase tracking-wider">En vivo</span>
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="mb-6">
            <h1
              className="text-white leading-[0.95] tracking-tight mb-4"
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontStyle: 'italic',
                fontWeight: 800,
                fontSize: 'clamp(2.6rem, 7vw, 4.5rem)',
              }}
            >
              LO QUE MÁS<br />
              <span style={{ color: '#C8DCF0' }}>NECESITAMOS HOY</span>
            </h1>
            <p className="text-sm text-white/50 max-w-lg leading-relaxed">
              Estas son las necesidades urgentes de los centros de acopio activos.
              Cada donación se registra y actualiza estas cifras en tiempo real.
            </p>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-2 mb-6">
            <StatBadge value={criticas} label="necesidades críticas" highlight />
            <StatBadge value={necesidades.length} label="ítems activos" />
            <StatBadge value={`${pctGeneral}%`} label="cubierto en total" />
            <StatBadge value={fmt(totalRecibido)} label="unidades recibidas" />
          </div>

          {/* Overall progress */}
          <div className="p-4 rounded-xl border border-[#2B5F8E]/40 bg-[#152D46]/80 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-white/40" />
                <span className="text-xs font-semibold text-white/50">Progreso general de la campaña</span>
              </div>
              <span
                className="font-black text-white tabular-nums"
                style={{ fontFamily: "'Barlow Condensed', sans-serif", fontStyle: 'italic', fontSize: '1.1rem' }}
              >
                {pctGeneral}%
              </span>
            </div>
            <ProgressBar pct={pctGeneral} barColor="bg-[#4A89C0]" barBg="bg-white/10" />
            <div className="flex justify-between mt-1.5 text-[10px] text-white/25">
              <span>{fmt(totalRecibido)} unidades recibidas</span>
              <span>meta: {fmt(totalMeta)}</span>
            </div>
          </div>
        </header>

        {/* ── MOTIVATIONAL BANNER ── */}
        <div className="mb-8 py-5 px-6 rounded-xl border border-[#2B5F8E]/30 bg-[#2B5F8E]/10 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-[#C8DCF0]/60" />
            <span className="text-[10px] font-bold text-[#C8DCF0]/60 uppercase tracking-[0.15em]">Cada gesto importa</span>
            <Sparkles className="w-3.5 h-3.5 text-[#C8DCF0]/60" />
          </div>
          <RotatingMessage hasCovered={hasCovered} />
        </div>

        {/* ── FILTERS ── */}
        <div className="flex flex-wrap gap-2 mb-6">
          {(['TODAS', 'CRITICA', 'ALTA', 'MEDIA', 'BAJA'] as const).map(p => {
            const active = filter === p
            return (
              <button
                key={p}
                onClick={() => setFilter(p)}
                className={`
                  px-4 py-1.5 rounded-lg text-[11px] font-semibold border transition-all duration-200 active:scale-[0.97] cursor-pointer
                  ${active
                    ? 'bg-[#2B5F8E] text-white border-[#4A89C0]/50 shadow-[0_2px_12px_rgba(43,95,142,0.4)]'
                    : 'bg-[#152D46]/60 text-white/40 border-[#2B5F8E]/20 hover:bg-[#2B5F8E]/20 hover:text-white/70 hover:border-[#2B5F8E]/40'
                  }
                `}
              >
                {p === 'TODAS' ? 'Todas' : PRIORIDAD_CONFIG[p].label}
                {p !== 'TODAS' && (
                  <span className={`ml-1.5 tabular-nums ${active ? 'opacity-70' : 'opacity-40'}`}>
                    {necesidades.filter(n => n.prioridad === p).length}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* ── NEEDS GRID ── */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-[#2B5F8E]/20 bg-[#152D46]/50 h-52 animate-pulse" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Package className="w-12 h-12 text-white/15 mb-4" />
            <p className="text-white/40 text-sm">No hay necesidades con ese filtro.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sorted.map((nec, i) => <NeedCard key={nec.id} nec={nec} index={i} />)}
          </div>
        )}

        {/* ── FOOTER ── */}
        <footer className="mt-14 pt-10 border-t border-[#2B5F8E]/20 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#2B5F8E]/30 bg-[#2B5F8E]/15 mb-5">
            <Heart className="w-3.5 h-3.5 text-[#C8DCF0]/70" />
            <span className="text-xs font-semibold text-[#C8DCF0]/70">
              {hasCovered
                ? 'Lo que ya no se necesita hoy puede ser lo de mañana'
                : 'Cualquier donación, por pequeña que sea, cuenta'}
            </span>
          </div>
          <p className="text-white/30 text-xs max-w-sm mx-auto leading-relaxed mb-8">
            {hasCovered
              ? 'Aunque algunas metas ya están cubiertas, los centros siguen activos y las familias siguen llegando. Lo que sobre hoy se convierte en reserva para mañana.'
              : 'Los centros de acopio están activos y recibiendo donaciones todos los días. Cada ítem entregado actualiza estas cifras en tiempo real.'}
          </p>
          <div className="flex items-center justify-center gap-3 text-[11px] text-white/20">
            <img src={isologo} alt="Portuguesa Unida" className="h-5 w-auto opacity-30 object-contain" />
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
