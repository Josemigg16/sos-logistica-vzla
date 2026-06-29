import { CalendarClock, Package } from 'lucide-react';
import { PRIORIDAD_CONFIG, CATEGORIA_ICON } from '@/lib/home/homeConstants';
import { getPct, urgencyLabel, fmt } from '@/lib/home/homeHelpers';
import { ProgressBar } from './ProgressBar';

export interface Necesidad {
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
}

interface NeedCardProps {
  nec: Necesidad;
  index: number;
}

export function NeedCard({ nec, index }: NeedCardProps) {
  const cfg = PRIORIDAD_CONFIG[nec.prioridad];
  const pct = getPct(nec.recibido, nec.meta);
  const missing = nec.meta - nec.recibido;
  const isCovered = pct >= 100;
  const urgency = urgencyLabel(nec.fechaNecesidad);
  const IconComponent = CATEGORIA_ICON[nec.categoria] ?? Package;

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

      {/* FECHA URGENCY BANNER — top of card */}
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

      {/* MAIN CONTENT */}
      <div className="flex flex-col gap-4 p-5 relative">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center w-10 h-10 rounded-lg shrink-0 ${cfg.iconBg}`}>
              <IconComponent className="w-5 h-5" />
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
                  className="font-black tabular-nums leading-none text-white"
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
                    <span className={`text-[10px] ml-1.5 font-medium ${cfg.dimText}`}>faltan de {fmt(nec.meta)} {nec.unidad}</span>
                  </>
                )}
              </div>
            </div>
            <ProgressBar pct={pct} barColor={cfg.barColor} barBg={cfg.barBg} />
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <p className={`text-[10px] font-semibold uppercase tracking-wider ${cfg.dimText}`}>Donación Recibida</p>
            <p className={`text-[15px] font-bold ${cfg.textColor}`}>
              {nec.recibido} {nec.unidad} <span className="text-[11px] font-normal opacity-70">(Consumo continuo)</span>
            </p>
          </div>
        )}
      </div>
    </article>
  );
}
