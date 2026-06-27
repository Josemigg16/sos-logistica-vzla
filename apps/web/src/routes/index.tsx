import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { Map, MapMarker } from '@/components/ui/map'
import centrosData from '@/data/centros.json'
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
  HandHeart,
  Warehouse,
} from 'lucide-react'

import logotipo from '@/assets/branding/white-logotipo.webp'

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
  if (meta <= 0) return 0
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
  const apiUrl = import.meta.env.VITE_API_URL ?? '/api'
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
      const res = await fetch(`${apiUrl}/needs`)
      if (!res.ok) throw new Error('API error')
      return res.json()
    },
  })

  const necesidades = data ?? []
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
          {/* Top bar: brand + "En vivo" badge */}
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3">
              <img
                src={logotipo}
                alt="Portuguesa Unida"
                className="h-14 w-auto object-contain"
                style={{ filter: 'drop-shadow(0 2px 12px rgba(43,95,142,0.5))' }}
              />
              <div className="hidden sm:block w-px h-8 bg-white/10" />
              <span className="hidden sm:block text-[11px] text-white/35 font-medium leading-tight max-w-[90px]">
                Ayuda humanitaria · Portuguesa
              </span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2B5F8E]/40 border border-[#4A89C0]/30">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C8DCF0] animate-pulse" />
              <span className="text-[10px] font-bold text-[#C8DCF0] uppercase tracking-wider">En vivo</span>
            </div>
          </div>

          {/* Hero row: title on the left, big CTA on the right */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 lg:gap-12 items-start mb-8">

            {/* Title block */}
            <div>
              <h1
                className="text-white leading-[0.92] tracking-tight mb-5"
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
              <p className="text-sm text-white/50 max-w-lg leading-relaxed mb-6">
                Estas son las necesidades urgentes de los centros de acopio activos.
                Cada donación se registra y actualiza estas cifras en tiempo real.
              </p>

              {/* Stats */}
              <div className="flex flex-wrap gap-2 mb-4">
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
            </div>

            {/* CTA stack — "Quiero ayudar" + "Tengo un centro de acopio" */}
            <div className="flex flex-col gap-4 w-full lg:w-[320px]">

            {/* Big CTA block — real MapLibre map preview as background */}
            <Link
              to="/map"
              className="group relative flex flex-col justify-between gap-5 p-6 lg:p-7 rounded-2xl overflow-hidden
                         shadow-[0_8px_40px_rgba(15,35,55,0.6)]
                         hover:shadow-[0_16px_60px_rgba(74,137,192,0.4)]
                         active:scale-[0.98] transition-[transform,box-shadow] duration-300
                         w-full min-h-[240px]
                         border border-[#4A89C0]/30 bg-[#0F2337]"
            >
              {/* Real interactive map preview — disabled pointer events so the whole card is the link */}
              <div className="pointer-events-none absolute inset-0 z-0">
                <Map
                  center={[-69.7, 9.05]}
                  zoom={6.3}
                  theme="dark"
                  className="w-full h-full"
                >
                  {(centrosData as unknown as Array<{ id: string; coordenadas: [number, number]; tipo: string }>).map((c) => (
                    <MapMarker
                      key={c.id}
                      coordinates={c.coordenadas}
                      color={
                        c.tipo === 'acopio' ? '#3b82f6' :
                        c.tipo === 'salida' ? '#ef4444' :
                        c.tipo === 'destino' ? '#22c55e' :
                        '#3b82f6'
                      }
                    />
                  ))}
                </Map>
              </div>

              {/* Brand-tinted overlay for text legibility */}
              <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-br from-[#0F2337]/85 via-[#0F2337]/55 to-[#2B5F8E]/70" />

              {/* Top decorative stripe */}
              <div className="pointer-events-none absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#4A89C0] via-[#C8DCF0] to-[#4A89C0] z-[2]" />

              {/* Shimmer on hover */}
              <span className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-br from-transparent via-white/15 to-transparent -translate-x-full -translate-y-full group-hover:translate-x-full group-hover:translate-y-full transition-transform duration-1000 ease-out" />

              {/* Top row: icon + tag */}
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white text-[#0F2337] shadow-[0_4px_16px_rgba(0,0,0,0.4)]">
                  <HandHeart className="w-6 h-6" strokeWidth={2.4} />
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/30 backdrop-blur-md border border-white/20">
                  <MapPin className="w-3 h-3 text-[#C8DCF0]" />
                  <span className="text-[10px] font-bold text-[#C8DCF0] uppercase tracking-[0.1em]">
                    Explora
                  </span>
                </div>
              </div>

              {/* Big headline */}
              <div className="relative z-10">
                <span
                  className="block text-white leading-[0.95] tracking-tight"
                  style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontStyle: 'italic',
                    fontWeight: 800,
                    fontSize: 'clamp(1.7rem, 2.6vw, 2.2rem)',
                    textShadow: '0 2px 16px rgba(15,35,55,0.85)',
                  }}
                >
                  QUIERO<br />AYUDAR
                </span>
                <span
                  className="block text-[12px] text-white/85 mt-2 font-medium leading-snug"
                  style={{ textShadow: '0 1px 8px rgba(15,35,55,0.85)' }}
                >
                  Ver los centros de acopio cercanos y cómo donar
                </span>
              </div>

              {/* Bottom row */}
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C8DCF0] animate-pulse" />
                  <span className="text-[10px] font-semibold text-[#C8DCF0]/90" style={{ textShadow: '0 1px 6px rgba(15,35,55,0.8)' }}>
                    {(centrosData as unknown[]).length} centros activos
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-bold text-white uppercase tracking-wider" style={{ textShadow: '0 1px 6px rgba(15,35,55,0.8)' }}>
                  <span>Ir al mapa</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" strokeWidth={3} />
                </div>
              </div>
            </Link>

            {/* Secondary CTA — "Tengo un centro de acopio" → /register */}
            <Link
              to="/register"
              className="group relative flex items-center gap-4 p-5 rounded-2xl overflow-hidden
                         border border-[#4A89C0]/30 bg-gradient-to-br from-[#152D46] to-[#0F2337]
                         shadow-[0_4px_24px_rgba(15,35,55,0.5)]
                         hover:border-[#4A89C0]/60 hover:shadow-[0_8px_32px_rgba(74,137,192,0.3)]
                         active:scale-[0.98] transition-[transform,box-shadow,border-color] duration-300"
            >
              {/* Shimmer on hover */}
              <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-transparent via-white/10 to-transparent -translate-x-full -translate-y-full group-hover:translate-x-full group-hover:translate-y-full transition-transform duration-1000 ease-out" />

              <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-[#2B5F8E] text-[#C8DCF0] shadow-[0_4px_16px_rgba(43,95,142,0.5)] shrink-0">
                <Warehouse className="w-6 h-6" strokeWidth={2.2} />
              </div>

              <div className="relative flex-1 min-w-0">
                <span
                  className="block text-white leading-[0.95] tracking-tight"
                  style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontStyle: 'italic',
                    fontWeight: 800,
                    fontSize: 'clamp(1.1rem, 1.8vw, 1.35rem)',
                  }}
                >
                  TENGO UN CENTRO<br />DE ACOPIO
                </span>
                <span className="block text-[11px] text-white/55 mt-1 font-medium leading-snug">
                  Regístralo y publica tus necesidades
                </span>
              </div>

              <ChevronRight className="relative w-5 h-5 text-[#C8DCF0] group-hover:translate-x-1 transition-transform duration-300 shrink-0" strokeWidth={2.5} />
            </Link>

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

          {/* Footer CTA — same as header */}
          <Link
            to="/map"
            className="group inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-white text-[#0F2337] font-bold uppercase tracking-wide shadow-[0_8px_32px_rgba(255,255,255,0.15)] hover:shadow-[0_12px_40px_rgba(255,255,255,0.25)] hover:bg-[#C8DCF0] active:scale-[0.96] transition-[transform,box-shadow,background-color] duration-200 mb-8"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", fontStyle: 'italic', fontSize: '1.05rem', letterSpacing: '0.05em' }}
          >
            <HandHeart className="w-5 h-5" strokeWidth={2.5} />
            <span>Quiero ayudar ahora</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>

          <div className="flex items-center justify-center gap-3 text-[11px] text-white/20">
            <img src={logotipo} alt="Portuguesa Unida" className="h-5 w-auto opacity-30 object-contain" />
            <span>·</span>
            <span>Ayuda humanitaria · Portuguesa</span>
          </div>
        </footer>
      </div>
    </div>
  )
}
