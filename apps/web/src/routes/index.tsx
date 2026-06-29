import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import {
  Heart,
  TrendingUp,
  Package,
  Sparkles,
} from 'lucide-react';

import { SupportContactBlock } from '@/components/hub-pending-verification';
import { useAuth } from '@/lib/auth/auth-context';
import logotipo from '@/assets/branding/white-logotipo.webp';
import centrosData from '@/data/centros.json';

import { PRIORIDAD_CONFIG } from '@/lib/home/homeConstants';
import { getPct, daysFromNow, fmt, getEmergencyLocation } from '@/lib/home/homeHelpers';
import { HomeHero } from '@/components/Home/HomeHero';
import { ProgressBar } from '@/components/Home/ProgressBar';
import { NeedCard } from '@/components/Home/NeedCard';
import type { NecesidadAgrupada } from '@/components/Home/NeedCard';
import { StatBadge } from '@/components/Home/StatBadge';
import { RotatingMessage } from '@/components/Home/RotatingMessage';
import { EmergencySelector } from '@/components/Home/EmergencySelector';

interface NecesidadApi {
  id: string;
  nombre: string;
  categoria: string;
  unidad: string;
  meta: number;
  recibido: number;
  prioridad: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA';
  descripcion: string;
  ultimaActualizacion: string;
  fechaNecesidad: string;
  hubId?: string;
  hubName?: string;
}

export const Route = createFileRoute('/')({
  component: NecesidadesPage,
});

function NecesidadesPage() {
  const apiUrl = import.meta.env.VITE_API_URL ?? '/api';
  const { status: authStatus } = useAuth();
  const isAuthenticated = authStatus === 'authenticated';
  const hubCtaTo = isAuthenticated ? '/admin' : '/map';
  const [filter, setFilter] = useState<'TODAS' | 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA'>('TODAS');
  const [emergencyFilter, setEmergencyFilter] = useState<'TODAS' | 'LA_GUAIRA' | 'CHABASKEN'>('TODAS');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add('dark');
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

  const { data, isLoading } = useQuery<NecesidadApi[]>({
    queryKey: ['necesidades'],
    queryFn: async () => {
      const res = await fetch(`${apiUrl}/needs`);
      if (!res.ok) throw new Error('API error');
      return res.json();
    },
  });

  const necesidades = data ?? [];

  const necesidadesLaGuaira = necesidades.filter(n => getEmergencyLocation(n.hubName) === 'LA_GUAIRA');
  const necesidadesChabasquen = necesidades.filter(n => getEmergencyLocation(n.hubName) === 'CHABASKEN');

  const statsLaGuaira = {
    total: necesidadesLaGuaira.length,
    criticas: necesidadesLaGuaira.filter(n => n.prioridad === 'CRITICA').length,
  };

  const statsChabasquén = {
    total: necesidadesChabasquen.length,
    criticas: necesidadesChabasquen.filter(n => n.prioridad === 'CRITICA').length,
  };

  const handleScrollToNeeds = () => {
    const el = document.getElementById('necesidades-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const filteredByEmergency = emergencyFilter === 'TODAS'
    ? necesidades
    : necesidades.filter(n => getEmergencyLocation(n.hubName) === emergencyFilter);

  // Agrupar necesidades idénticas por su nombre (ej: "Agua mineral")
  const agrupadasMap = new Map<string, NecesidadAgrupada>();
  for (const n of filteredByEmergency) {
    const key = n.nombre.toLowerCase().trim();
    if (!agrupadasMap.has(key)) {
      agrupadasMap.set(key, {
        id: n.id,
        nombre: n.nombre,
        categoria: n.categoria,
        unidad: n.unidad,
        prioridad: n.prioridad,
        descripcion: n.descripcion,
        fechaNecesidad: n.fechaNecesidad,
        hubs: [],
      });
    }
    const grp = agrupadasMap.get(key)!;
    
    if (n.hubId && n.hubName) {
      grp.hubs.push({
        hubId: n.hubId,
        hubName: n.hubName,
        meta: n.meta,
        recibido: n.recibido,
        prioridad: n.prioridad,
      });
    }

    // Tomar la prioridad más crítica
    const ORDER_PRIORIDAD = { CRITICA: 0, ALTA: 1, MEDIA: 2, BAJA: 3 };
    if (ORDER_PRIORIDAD[n.prioridad] < ORDER_PRIORIDAD[grp.prioridad]) {
      grp.prioridad = n.prioridad;
    }

    // Tomar la fecha de necesidad más urgente
    if (n.fechaNecesidad < grp.fechaNecesidad) {
      grp.fechaNecesidad = n.fechaNecesidad;
    }
  }

  const necesidadesAgrupadas = Array.from(agrupadasMap.values());

  const filtered = filter === 'TODAS'
    ? necesidadesAgrupadas
    : necesidadesAgrupadas.filter(n => n.prioridad === filter);

  const totalMeta = filteredByEmergency.reduce((s, n) => s + n.meta, 0);
  const totalRecibido = filteredByEmergency.reduce((s, n) => s + n.recibido, 0);
  const pctGeneral = getPct(totalRecibido, totalMeta);
  const hasCovered = filteredByEmergency.some(n => getPct(n.recibido, n.meta) >= 100);

  const ORDER = { CRITICA: 0, ALTA: 1, MEDIA: 2, BAJA: 3 };
  
  // Sort: first by urgency (days), then by priority
  const sorted = [...filtered].sort((a, b) => {
    const dA = daysFromNow(a.fechaNecesidad);
    const dB = daysFromNow(b.fechaNecesidad);
    if (dA !== dB) return dA - dB;
    return ORDER[a.prioridad] - ORDER[b.prioridad];
  });

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
        <HomeHero isAuthenticated={isAuthenticated} hubCtaTo={hubCtaTo} />

        {/* ── EMERGENCY SELECTOR (FRENTES ACTIVOS) ── */}
        <EmergencySelector
          statsLaGuaira={statsLaGuaira}
          statsChabasquén={statsChabasquén}
          selectedEmergency={emergencyFilter}
          onSelectEmergency={setEmergencyFilter}
          onScrollToNeeds={handleScrollToNeeds}
        />

        {/* ── NEEDS SECTION ── */}
        <div id="necesidades-section" className="mb-5 scroll-mt-6">
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

        {/* Filters Box */}
        <div className="flex flex-col gap-4 mb-6 bg-[#152D46]/40 p-4 rounded-xl border border-[#2B5F8E]/25">
          {/* Emergency Filters */}
          <div>
            <span className="text-[10px] font-bold text-[#C8DCF0]/50 uppercase tracking-[0.12em] block mb-2">
              Emergencia / Región
            </span>
            <div className="flex flex-wrap gap-2">
              {(['TODAS', 'LA_GUAIRA', 'CHABASKEN'] as const).map(e => {
                const active = emergencyFilter === e;
                let label = 'Todas';
                let activeStyles = 'bg-[#2B5F8E] text-white border-[#4A89C0]/50 shadow-[0_2px_12px_rgba(43,95,142,0.4)]';
                
                if (e === 'LA_GUAIRA') {
                  label = 'La Guaira';
                } else if (e === 'CHABASKEN') {
                  label = 'Chabasquén';
                  if (active) {
                    activeStyles = 'bg-[#1E4D2B] text-white border-[#2E7D32]/50 shadow-[0_2px_12px_rgba(46,125,50,0.4)]';
                  }
                }
                
                const count = e === 'TODAS'
                  ? necesidades.length
                  : necesidades.filter(n => getEmergencyLocation(n.hubName) === e).length;

                return (
                  <button
                    key={e}
                    onClick={() => {
                      setEmergencyFilter(e);
                    }}
                    className={`
                      px-4 py-2.5 sm:py-1.5 rounded-lg text-[11px] font-bold border transition-all duration-200 active:scale-[0.97] cursor-pointer
                      ${active
                        ? activeStyles
                        : 'bg-[#152D46]/60 text-white/40 border-[#2B5F8E]/20 hover:bg-[#2B5F8E]/20 hover:text-white/70 hover:border-[#2B5F8E]/40'
                      }
                    `}
                  >
                    {label}
                    <span className={`ml-1.5 tabular-nums ${active ? 'opacity-70' : 'opacity-40'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-[#2B5F8E]/15 w-full" />

          {/* Priority Filters */}
          <div>
            <span className="text-[10px] font-bold text-[#C8DCF0]/50 uppercase tracking-[0.12em] block mb-2">
              Prioridad de ayuda
            </span>
            <div className="flex flex-wrap gap-2">
              {(['TODAS', 'CRITICA', 'ALTA', 'MEDIA', 'BAJA'] as const).map(p => {
                const active = filter === p;
                const count = p === 'TODAS' 
                  ? filteredByEmergency.length 
                  : filteredByEmergency.filter(n => n.prioridad === p).length;

                return (
                  <button
                    key={p}
                    onClick={() => setFilter(p)}
                    className={`
                      px-4 py-2.5 sm:py-1.5 rounded-lg text-[11px] font-semibold border transition-all duration-200 active:scale-[0.97] cursor-pointer
                      ${active
                        ? 'bg-[#2B5F8E] text-white border-[#4A89C0]/50 shadow-[0_2px_12px_rgba(43,95,142,0.4)]'
                        : 'bg-[#152D46]/60 text-white/40 border-[#2B5F8E]/20 hover:bg-[#2B5F8E]/20 hover:text-white/70 hover:border-[#2B5F8E]/40'
                      }
                    `}
                  >
                    {p === 'TODAS' ? 'Todas' : PRIORIDAD_CONFIG[p].label}
                    <span className={`ml-1.5 tabular-nums ${active ? 'opacity-70' : 'opacity-40'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
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

        {/* ── CAMPAIGN SUMMARY ── */}
        <section className="mt-12 p-5 sm:p-6 rounded-2xl border border-[#2B5F8E]/40 bg-[#152D46]/80 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="w-4 h-4 text-[#C8DCF0]/60" />
            <h2 className="text-[11px] font-bold text-[#C8DCF0]/60 uppercase tracking-[0.15em]">Resumen de campaña</h2>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <StatBadge value={fmt(totalRecibido)} label="donaciones recibidas" highlight />
            <StatBadge
              value={
                emergencyFilter === 'TODAS'
                  ? centrosData.length
                  : new Set(filteredByEmergency.map(n => n.hubId).filter(Boolean)).size || 1
              }
              label="centros de acopio activos"
              to="/map"
            />
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

          {/* Motivational strip */}
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
            <SupportContactBlock message="Hola, escribo desde la página de Portuguesa Unida y necesito ayuda." />
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
  );
}
