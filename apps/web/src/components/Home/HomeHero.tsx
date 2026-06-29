import { Link } from '@tanstack/react-router';
import { ChevronRight, HandHeart, Warehouse, Package } from 'lucide-react';
import logotipo from '@/assets/branding/white-logotipo.webp';

interface HomeHeroProps {
  isAuthenticated: boolean;
  hubCtaTo: string;
}

export function HomeHero({ isAuthenticated, hubCtaTo }: HomeHeroProps) {
  return (
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
            onClick={() => localStorage.setItem("map_intro_force", "1")}
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

      {/* Desktop-only full-width band — "Normas de embalaje" PDF */}
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
  );
}
