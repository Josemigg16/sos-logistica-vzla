import { Activity, Mountain, ArrowDown, ArrowRight } from 'lucide-react';

interface EmergencyStats {
  total: number;
  criticas: number;
}

interface EmergencySelectorProps {
  statsLaGuaira: EmergencyStats;
  statsChabasquén: EmergencyStats;
  selectedEmergency: 'TODAS' | 'LA_GUAIRA' | 'CHABASKEN';
  onSelectEmergency: (emergency: 'TODAS' | 'LA_GUAIRA' | 'CHABASKEN') => void;
  onScrollToNeeds: () => void;
}

export function EmergencySelector({
  statsLaGuaira,
  statsChabasquén,
  selectedEmergency,
  onSelectEmergency,
  onScrollToNeeds,
}: EmergencySelectorProps) {
  
  const handleSelect = (emergency: 'LA_GUAIRA' | 'CHABASKEN') => {
    onSelectEmergency(emergency);
    // Un pequeño delay para que el estado se actualice antes de hacer scroll
    setTimeout(() => {
      onScrollToNeeds();
    }, 50);
  };

  return (
    <section className="mb-10 w-full animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <h2
          className="text-white/90 leading-tight"
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontStyle: 'italic',
            fontWeight: 800,
            fontSize: 'clamp(1.4rem, 4vw, 2rem)',
          }}
        >
          FRENTES DE EMERGENCIA ACTIVOS
        </h2>
        
        {selectedEmergency !== 'TODAS' && (
          <button
            onClick={() => onSelectEmergency('TODAS')}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 active:scale-[0.97] transition-all duration-200 text-xs font-semibold text-[#C8DCF0]/70 hover:text-white cursor-pointer min-h-[38px] sm:min-h-0"
          >
            Ver todos los frentes
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full">
        {/* CARD LA GUAIRA */}
        <article
          onClick={() => handleSelect('LA_GUAIRA')}
          className={`
            relative p-5 sm:p-6 rounded-2xl border cursor-pointer group flex flex-col justify-between min-h-[240px] overflow-hidden
            transition-all duration-300 active:scale-[0.985] md:active:scale-[0.99]
            ${selectedEmergency === 'LA_GUAIRA'
              ? 'border-[#4A89C0] bg-[#152D46]/85 shadow-[0_8px_32px_rgba(43,95,142,0.4)]'
              : 'border-[#2B5F8E]/30 bg-[#152D46]/40 hover:border-[#2B5F8E]/65 hover:bg-[#152D46]/60 hover:shadow-[0_4px_20px_rgba(43,95,142,0.15)]'
            }
          `}
        >
          {/* Subtle light glow */}
          <div className="absolute -right-16 -top-16 w-36 h-36 rounded-full bg-[#2B5F8E]/15 blur-2xl group-hover:bg-[#2B5F8E]/25 transition-all duration-500" />
          
          <div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-[#2B5F8E]/25 text-[#C8DCF0] border border-[#2B5F8E]/40 shrink-0">
                  <Activity className="w-6 h-6" strokeWidth={1.8} />
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-[#C8DCF0]/50 uppercase tracking-[0.15em] leading-none">
                    Frente Sísmico
                  </span>
                  <h3
                    className="text-white text-xl sm:text-2xl leading-none mt-1"
                    style={{
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontStyle: 'italic',
                      fontWeight: 800,
                    }}
                  >
                    LA GUAIRA
                  </h3>
                </div>
              </div>

              {/* Status Badge */}
              <div className="self-start sm:self-auto">
                <span className="px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider bg-[#2B5F8E]/20 text-[#C8DCF0] border-[#2B5F8E]/30">
                  Terremoto
                </span>
              </div>
            </div>

            <p className="text-white/60 text-xs sm:text-[13px] leading-relaxed mb-6 max-w-xl">
              Zonas afectadas por sismos de gran magnitud y réplicas. Colapso de infraestructuras y daños en servicios esenciales. Prioridad en insumos de primeros auxilios, agua potable, iluminación y soporte de rescate.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-4 border-t border-[#2B5F8E]/15 mt-auto">
            {/* Stats row */}
            <div className="flex gap-5">
              <div>
                <span className="block text-[18px] sm:text-xl font-bold text-white leading-none font-mono">
                  {statsLaGuaira.total}
                </span>
                <span className="text-[10px] text-white/40 uppercase tracking-wide font-medium">
                  Necesidades
                </span>
              </div>
              {statsLaGuaira.criticas > 0 && (
                <div>
                  <span className="block text-[18px] sm:text-xl font-bold text-[#C8DCF0] leading-none font-mono">
                    {statsLaGuaira.criticas}
                  </span>
                  <span className="text-[10px] text-[#C8DCF0]/70 uppercase tracking-wide font-bold">
                    Críticas
                  </span>
                </div>
              )}
            </div>

            {/* CTA Link (convertido a botón real en móvil para touch-target y para evitar colisiones) */}
            <div className="flex items-center justify-center sm:justify-end gap-1.5 px-3 py-2 sm:p-0 rounded-lg bg-[#2B5F8E]/20 sm:bg-transparent border border-[#2B5F8E]/35 sm:border-none text-xs font-bold text-[#C8DCF0] uppercase tracking-wider group-hover:text-white group-hover:bg-[#2B5F8E]/30 transition-all duration-200">
              <span>Ver Necesidades</span>
              <ArrowDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform duration-300" />
            </div>
          </div>
        </article>

        {/* CARD CHABASQUÉN */}
        <article
          onClick={() => handleSelect('CHABASKEN')}
          className={`
            relative p-5 sm:p-6 rounded-2xl border cursor-pointer group flex flex-col justify-between min-h-[240px] overflow-hidden
            transition-all duration-300 active:scale-[0.985] md:active:scale-[0.99]
            ${selectedEmergency === 'CHABASKEN'
              ? 'border-emerald-500/50 bg-[#102e1c]/80 shadow-[0_8px_32px_rgba(16,46,28,0.5)]'
              : 'border-[#2B5F8E]/30 bg-[#152D46]/40 hover:border-emerald-500/35 hover:bg-[#102e1c]/20 hover:shadow-[0_4px_20px_rgba(16,46,28,0.2)]'
            }
          `}
        >
          {/* Subtle light glow */}
          <div className="absolute -right-16 -top-16 w-36 h-36 rounded-full bg-emerald-500/5 blur-2xl group-hover:bg-emerald-500/15 transition-all duration-500" />

          <div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 shrink-0">
                  <Mountain className="w-6 h-6" strokeWidth={1.8} />
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-emerald-400/50 uppercase tracking-[0.15em] leading-none">
                    Frente de Montaña
                  </span>
                  <h3
                    className="text-white text-xl sm:text-2xl leading-none mt-1"
                    style={{
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontStyle: 'italic',
                      fontWeight: 800,
                    }}
                  >
                    CHABASQUÉN
                  </h3>
                </div>
              </div>

              {/* Status Badge */}
              <div className="self-start sm:self-auto">
                <span className="px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider bg-emerald-500/10 text-emerald-300 border-emerald-500/20">
                  Inundaciones
                </span>
              </div>
            </div>

            <p className="text-white/60 text-xs sm:text-[13px] leading-relaxed mb-6 max-w-xl">
              Poblaciones de la zona alta cafetalera en Portuguesa aisladas por el desborde de ríos y derrumbes viales. Urgen alimentos y abrigo para las familias.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-4 border-t border-emerald-500/10 mt-auto">
            {/* Stats row */}
            <div className="flex gap-5">
              <div>
                <span className="block text-[18px] sm:text-xl font-bold text-white leading-none font-mono">
                  {statsChabasquén.total}
                </span>
                <span className="text-[10px] text-white/40 uppercase tracking-wide font-medium">
                  Necesidades
                </span>
              </div>
              {statsChabasquén.criticas > 0 && (
                <div>
                  <span className="block text-[18px] sm:text-xl font-bold text-emerald-300 leading-none font-mono">
                    {statsChabasquén.criticas}
                  </span>
                  <span className="text-[10px] text-emerald-300/80 uppercase tracking-wide font-bold">
                    Críticas
                  </span>
                </div>
              )}
            </div>

            {/* CTA Link (convertido a botón real en móvil para touch-target y para evitar colisiones) */}
            <div className="flex items-center justify-center sm:justify-end gap-1.5 px-3 py-2 sm:p-0 rounded-lg bg-emerald-500/10 sm:bg-transparent border border-emerald-500/20 sm:border-none text-xs font-bold text-emerald-300 uppercase tracking-wider group-hover:text-white group-hover:bg-emerald-500/25 transition-all duration-200">
              <span>Ver Necesidades</span>
              <ArrowDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform duration-300" />
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
