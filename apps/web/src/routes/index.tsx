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

import { SupportContactBlock } from '@/components/hub-pending-verification'
import { useAuth } from '@/lib/auth/auth-context'
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
  const [year, month, day] = iso.split('-').map(Number)
  const target = new Date(year, month - 1, day)
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
  
  const [year, month, day] = iso.split('-').map(Number)
  const targetDate = new Date(year, month - 1, day)
  return {
    text: `Para el ${targetDate.toLocaleDateString('es-VE', { day: 'numeric', month: 'short' })}`,
    urgent: false,
    overdue: false,
  }
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
function timeAgo(iso?: string) {
  if (!iso) return 'hace 0 min'
  const time = new Date(iso).getTime()
  if (isNaN(time)) return 'hace 0 min'
  const mins = Math.floor((Date.now() - time) / 60000)
  if (isNaN(mins) || mins < 0) return 'hace 0 min'
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
        {nec.meta > 0 ? (
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
        ) : (
          <div className="flex flex-col gap-2 pt-1">
            <div className="flex items-center justify-between">
              <span className={`text-[11px] ${cfg.dimText}`}>Recibido hasta la fecha:</span>
              <span
                className={`font-black tabular-nums ${cfg.textColor}`}
                style={{ fontFamily: "'Barlow Condensed', sans-serif", fontStyle: 'italic', fontSize: '1.4rem' }}
              >
                {fmt(nec.recibido)} {nec.unidad}
              </span>
            </div>
            <span className={`text-[10px] italic ${cfg.dimText} opacity-80`}>Necesidad continua (sin meta fija)</span>
          </div>
        )}

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
function StatBadge({ value, label, highlight, to }: { value: string | number; label: string; highlight?: boolean; to?: string }) {
  const base = `flex flex-col items-center px-4 py-3 rounded-xl border ${
    highlight
      ? 'bg-[#2B5F8E] border-[#4A89C0]/50 shadow-[0_4px_16px_rgba(43,95,142,0.4)]'
      : 'bg-[#152D46] border-[#2B5F8E]/30'
  }`
  const inner = (
    <>
      <span
        className="font-black tabular-nums text-white leading-none"
        style={{ fontFamily: "'Barlow Condensed', sans-serif", fontStyle: 'italic', fontSize: '1.5rem' }}
      >
        {value}
      </span>
      <span className="text-[10px] text-white/50 font-medium mt-1 whitespace-nowrap">{label}</span>
    </>
  )

  if (to) {
    return (
      <Link
        to={to}
        className={`${base} group cursor-pointer hover:border-[#4A89C0]/70 hover:bg-[#1E4A6E] hover:shadow-[0_4px_16px_rgba(74,137,192,0.3)] active:scale-[0.97] transition-[transform,background-color,border-color,box-shadow] duration-200`}
      >
        {inner}
      </Link>
    )
  }

  return <div className={base}>{inner}</div>
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
      setTimeout(() => {
        setIdx(i => (i + 1) % pool.length)
        setVisible(true)
      }, 400)
    }, 5000)
    return () => clearInterval(iv)
  }, [pool.length])

  return (
    <div className="min-h-[3rem] flex items-center justify-center max-w-md mx-auto">
      <p
        className="text-sm text-white/60 text-center italic leading-relaxed transition-opacity duration-300"
        style={{ opacity: visible ? 1 : 0 }}
      >
        "{pool[idx % pool.length]}"
      </p>
    </div>
  )
}

// --- Main page ---
function NecesidadesPage() {
  const apiUrl = import.meta.env.VITE_API_URL ?? '/api'
  const { status: authStatus } = useAuth()
  const isAuthenticated = authStatus === 'authenticated'
  const hubCtaTo = isAuthenticated ? '/admin' : '/map'
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
          {/* Top bar: brand + login discreto */}
          <div className="flex items-center justify-between gap-4 mb-10">
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

            {!isAuthenticated && (
              <Link
                to="/login"
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg bg-white/5 border border-white/15 hover:bg-white/10 hover:border-white/25 active:scale-[0.97] transition-[transform,background-color,border-color] duration-200 text-[11px] font-semibold text-white/65 hover:text-white leading-tight text-right"
              >
                <span>
                  Ya tengo mi<br className="sm:hidden" /> centro registrado
                </span>
                <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-70" />
              </Link>
            )}
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
                VENEZUELA<br />
                <span style={{ color: '#C8DCF0' }}>TE NECESITA</span>
              </h1>
              <p className="text-sm text-white/50 max-w-lg leading-relaxed mb-6">
                Dona lo que puedas o suma tu centro de acopio. Cada gesto llega directo a quien más lo necesita.
              </p>

              <Link
                to="/map"
                className="group relative flex items-center gap-4 p-5 rounded-2xl overflow-hidden mb-3 border border-white/30 bg-white shadow-[0_8px_32px_rgba(255,255,255,0.15)] hover:bg-[#C8DCF0] hover:shadow-[0_12px_40px_rgba(255,255,255,0.25)] active:scale-[0.98] transition-[transform,box-shadow,background-color] duration-300"
              >
                <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-transparent via-black/5 to-transparent -translate-x-full -translate-y-full group-hover:translate-x-full group-hover:translate-y-full transition-transform duration-1000 ease-out" />
                <HandHeart className="relative w-6 h-6 text-[#0F2337] shrink-0" strokeWidth={2.2} />
                <div className="relative flex-1 min-w-0">
                  <span className="block text-[#0F2337] leading-[0.95] tracking-tight" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontStyle: 'italic', fontWeight: 800, fontSize: 'clamp(1.1rem, 1.8vw, 1.35rem)' }}>
                    QUIERO AYUDAR
                  </span>
                  <span className="block text-[11px] text-[#0F2337]/55 mt-1 font-medium leading-snug">
                    Encuentra dónde y cómo donar cerca de ti
                  </span>
                </div>
                <ChevronRight className="relative w-5 h-5 text-[#0F2337] group-hover:translate-x-1 transition-transform duration-300 shrink-0" strokeWidth={2.5} />
              </Link>

              <Link
                to={hubCtaTo}
                className="group relative flex items-center gap-4 p-5 rounded-2xl overflow-hidden border border-white/30 bg-white shadow-[0_8px_32px_rgba(255,255,255,0.15)] hover:bg-[#C8DCF0] hover:shadow-[0_12px_40px_rgba(255,255,255,0.25)] active:scale-[0.98] transition-[transform,box-shadow,background-color] duration-300"
              >
                <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-transparent via-black/5 to-transparent -translate-x-full -translate-y-full group-hover:translate-x-full group-hover:translate-y-full transition-transform duration-1000 ease-out" />
                <Warehouse className="relative w-6 h-6 text-[#0F2337] shrink-0" strokeWidth={2.2} />
                <div className="relative flex-1 min-w-0">
                  <span className="block text-[#0F2337] leading-[0.95] tracking-tight" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontStyle: 'italic', fontWeight: 800, fontSize: 'clamp(1.1rem, 1.8vw, 1.35rem)' }}>
                    TENGO UN CENTRO DE ACOPIO
                  </span>
                  <span className="block text-[11px] text-[#0F2337]/55 mt-1 font-medium leading-snug">
                    {isAuthenticated
                      ? 'Ir al panel de gestión'
                      : 'Encuentra el tuyo en el mapa o regístralo'}
                  </span>
                </div>
                <ChevronRight className="relative w-5 h-5 text-[#0F2337] group-hover:translate-x-1 transition-transform duration-300 shrink-0" strokeWidth={2.5} />
              </Link>

            </div>

            {/* CTA stack — Normas de embalaje (mobile) */}
            <div className="flex flex-col gap-4 w-full lg:w-[320px]">

            {/* Tertiary CTA — "Normas de embalaje" → PDF (only on mobile here; desktop renders as full-width band below) */}
            <a
              href="/NORMAS DE EMBALAJE .pdf"
              download="NORMAS DE EMBALAJE .pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="lg:hidden group relative flex items-center gap-4 p-5 rounded-2xl overflow-hidden
                         border border-[#2B5F8E]/30 bg-gradient-to-br from-[#152D46]/80 to-[#0F2337]/90
                         shadow-[0_4px_24px_rgba(15,35,55,0.5)]
                         hover:border-[#2B5F8E]/60 hover:shadow-[0_8px_32px_rgba(74,137,192,0.3)]
                         active:scale-[0.98] transition-[transform,box-shadow,border-color] duration-300"
            >
              <Package className="relative w-6 h-6 text-white shrink-0" strokeWidth={2.2} />

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
                  NORMAS DE<br />EMBALAJE (PDF)
                </span>
                <span className="block text-[11px] text-white/55 mt-1 font-medium leading-snug">
                  Descarga las guías de preparación y entrega
                </span>
              </div>

              <ChevronRight className="relative w-5 h-5 text-[#C8DCF0] group-hover:translate-x-1 transition-transform duration-300 shrink-0" strokeWidth={2.5} />
            </a>

            </div>
          </div>

          {/* ── Desktop-only full-width band — "Normas de embalaje" PDF ── */}
          <a
            href="/NORMAS DE EMBALAJE .pdf"
            download="NORMAS DE EMBALAJE .pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden lg:flex group relative items-center gap-5 px-6 py-4 rounded-2xl overflow-hidden
                       border border-[#2B5F8E]/30 bg-gradient-to-r from-[#152D46]/80 via-[#1E4A6E]/70 to-[#0F2337]/90
                       shadow-[0_4px_24px_rgba(15,35,55,0.5)]
                       hover:border-[#2B5F8E]/60 hover:shadow-[0_8px_32px_rgba(74,137,192,0.3)]
                       active:scale-[0.99] transition-[transform,box-shadow,border-color] duration-300"
          >
            <Package className="relative w-5 h-5 text-white shrink-0" strokeWidth={2.2} />

            <div className="relative flex flex-1 items-baseline gap-3 min-w-0">
              <span
                className="text-white leading-none tracking-tight whitespace-nowrap"
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontStyle: 'italic',
                  fontWeight: 800,
                  fontSize: '1.5rem',
                }}
              >
                NORMAS DE EMBALAJE
              </span>
              <span className="text-[11px] text-[#C8DCF0]/60 font-semibold uppercase tracking-wider whitespace-nowrap">
                PDF
              </span>
              <span className="text-[12px] text-white/55 font-medium leading-snug truncate">
                Descarga las guías de preparación y entrega para tus donaciones
              </span>
            </div>

            <div className="relative flex items-center gap-1.5 text-[11px] font-bold text-[#C8DCF0] uppercase tracking-wider shrink-0">
              <span>Descargar</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" strokeWidth={3} />
            </div>
          </a>
        </header>

        {/* ── NEEDS SECTION ── */}
        <div className="mb-5">
          <h2
            className="text-white/90 leading-tight mb-1"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", fontStyle: 'italic', fontWeight: 800, fontSize: 'clamp(1.4rem, 4vw, 2rem)' }}
          >
            LO QUE MÁS NECESITAMOS HOY
          </h2>
          <p className="text-sm text-white/45 font-medium">
            Necesidades urgentes de los centros de acopio activos, ordenadas por urgencia. Se actualizan en tiempo real con cada donación.
          </p>
        </div>

        {/* Filters */}
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

        {/* Needs grid */}
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

        {/* ── CAMPAIGN SUMMARY ── unified panel: stats + progress + motivational strip */}
        <section className="mt-12 p-5 sm:p-6 rounded-2xl border border-[#2B5F8E]/40 bg-[#152D46]/80 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="w-4 h-4 text-[#C8DCF0]/60" />
            <h2 className="text-[11px] font-bold text-[#C8DCF0]/60 uppercase tracking-[0.15em]">Resumen de campaña</h2>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <StatBadge value={fmt(totalRecibido)} label="donaciones recibidas" highlight />
            <StatBadge value={(centrosData as unknown[]).length} label="centros de acopio activos" to="/map" />
          </div>

          {/* Overall progress */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-white/50">Progreso general</span>
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

          {/* Motivational strip — folded in */}
          <div className="mt-5 pt-5 border-t border-[#2B5F8E]/20 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-[#C8DCF0]/60" />
              <span className="text-[10px] font-bold text-[#C8DCF0]/60 uppercase tracking-[0.15em]">Cada gesto importa</span>
              <Sparkles className="w-3.5 h-3.5 text-[#C8DCF0]/60" />
            </div>
            <RotatingMessage hasCovered={hasCovered} />
          </div>
        </section>

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

          <div className="mb-8 flex flex-col items-center gap-2">
            <span className="text-[10px] font-bold text-[#C8DCF0]/60 uppercase tracking-[0.15em]">
              ¿Necesitas ayuda?
            </span>
            <SupportContactBlock message="Hola, escribo desde la página de SOS Logística y necesito ayuda." />
            <span className="text-[10.5px] text-white/40 leading-relaxed max-w-xs">
              Coordina donaciones, centros o resuelve dudas con nuestro equipo.
            </span>
          </div>

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
