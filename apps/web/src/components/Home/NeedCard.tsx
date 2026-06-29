import { CalendarClock, Package, Building2 } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { PRIORIDAD_CONFIG, CATEGORIA_ICON } from '@/lib/home/homeConstants';
import { getPct, urgencyLabel, fmt } from '@/lib/home/homeHelpers';
import { ProgressBar } from './ProgressBar';

export interface NecesidadHub {
  hubId: string;
  hubName: string;
  meta: number;
  recibido: number;
  prioridad: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA';
}

export interface NecesidadAgrupada {
  id: string;
  nombre: string;
  categoria: string;
  unidad: string;
  prioridad: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA';
  descripcion: string;
  fechaNecesidad: string;
  hubs: NecesidadHub[];
}

interface NeedCardProps {
  nec: NecesidadAgrupada;
  index: number;
}

export function NeedCard({ nec, index }: NeedCardProps) {
  const cfg = PRIORIDAD_CONFIG[nec.prioridad];
  
  // Consolidar estadísticas de todos los hubs vinculados
  const totalMeta = nec.hubs.reduce((acc, h) => acc + h.meta, 0);
  const totalRecibido = nec.hubs.reduce((acc, h) => acc + h.recibido, 0);
  const pct = getPct(totalRecibido, totalMeta);
  const missing = totalMeta - totalRecibido;
  const isCovered = pct >= 100;
  
  const urgency = urgencyLabel(nec.fechaNecesidad);
  const IconComponent = CATEGORIA_ICON[nec.categoria] ?? Package;

  // Clasificar y consolidar hubs para La Guaira respetando el flujo de recolección
  let hubsRender: {
    hubId: string;
    hubName: string;
    meta: number;
    recibido: number;
    prioridad: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA';
    isGroup?: boolean;
    count?: number;
  }[] = [];

  const isLaGuairaEmergency = nec.hubs.some(h => h.hubName.toLowerCase().includes('guaira'));

  if (isLaGuairaEmergency) {
    // Puntos de salida (Origen/Despacho en Portuguesa)
    const puntosSalida = nec.hubs.filter(h => 
      h.hubName.toLowerCase().includes('salida') ||
      h.hubName.toLowerCase().includes('zodi') ||
      h.hubName.toLowerCase().includes('base de operaciones')
    );
    
    // Centros de Acopio en general (donde el donante entrega localmente en Portuguesa)
    const centrosAcopioGeneral = nec.hubs.filter(h => 
      !h.hubName.toLowerCase().includes('salida') &&
      !h.hubName.toLowerCase().includes('zodi') &&
      !h.hubName.toLowerCase().includes('base de operaciones')
    );

    // Añadir puntos de salida individuales (donde se consolida la carga para el despacho final)
    hubsRender.push(...puntosSalida);

    // Consolidar todos los centros de acopio generales bajo un único ítem virtual
    if (centrosAcopioGeneral.length > 0) {
      const sumMeta = centrosAcopioGeneral.reduce((acc, h) => acc + h.meta, 0);
      const sumRecibido = centrosAcopioGeneral.reduce((acc, h) => acc + h.recibido, 0);
      
      const ORDER_PRIORIDAD = { CRITICA: 0, ALTA: 1, MEDIA: 2, BAJA: 3 };
      let maxPrioridad: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA' = 'BAJA';
      for (const h of centrosAcopioGeneral) {
        if (ORDER_PRIORIDAD[h.prioridad] < ORDER_PRIORIDAD[maxPrioridad]) {
          maxPrioridad = h.prioridad;
        }
      }

      hubsRender.push({
        hubId: 'centros-acopio-group',
        hubName: `Centros de Acopio locales (${centrosAcopioGeneral.length} ubicaciones)`,
        meta: sumMeta,
        recibido: sumRecibido,
        prioridad: maxPrioridad,
        isGroup: true,
        count: centrosAcopioGeneral.length
      });
    }
  } else {
    // Para Chabasquén u otras emergencias con pocos centros, los dejamos individuales
    hubsRender = nec.hubs;
  }

  return (
    <article
      className={`
        relative rounded-xl border flex flex-col gap-0
        ${cfg.cardBg} ${cfg.cardBorder} ${cfg.glow}
        transition-all duration-300 hover:brightness-[1.03]
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
            Metas cubiertas
          </span>
        )}
      </div>

      {/* MAIN CONTENT */}
      <div className="flex flex-col gap-4 p-4 sm:p-5 relative">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center w-10 h-10 rounded-lg shrink-0 ${cfg.iconBg}`}>
              <IconComponent className="w-5 h-5" />
            </div>
            <div>
              <h3
                className={`leading-tight ${cfg.textColor}`}
                style={{ fontFamily: "'Barlow Condensed', sans-serif", fontStyle: 'italic', fontWeight: 700, fontSize: '1.15rem', letterSpacing: '0.01em' }}
              >
                {nec.nombre}
              </h3>
              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                <span className={`text-[11px] font-medium ${cfg.dimText}`}>{nec.categoria}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-row items-center gap-1.5 shrink-0">
            <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold border uppercase tracking-wide ${cfg.badgeBg}`}>
              {cfg.label}
            </span>
          </div>
        </div>

        {/* Description */}
        <p className={`text-[12px] leading-relaxed ${cfg.dimText}`}>{nec.descripcion}</p>

        {/* Consolidado Progress */}
        {totalMeta > 0 ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-end justify-between">
              <div>
                <span
                  className="font-black tabular-nums leading-none text-white"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif", fontStyle: 'italic', fontSize: '1.8rem' }}
                >
                  {pct}%
                </span>
                <span className={`text-[11px] ml-1.5 ${cfg.dimText}`}>cubierto en total</span>
              </div>
              <div className="text-right">
                {isCovered ? (
                  <span className={`text-[11px] font-semibold ${cfg.dimText}`}>¡Metas alcanzadas!</span>
                ) : (
                  <>
                    <span
                      className={`font-bold tabular-nums ${cfg.textColor}`}
                      style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.85rem' }}
                    >
                      {fmt(missing)}
                    </span>
                    <span className={`text-[10px] ml-1.5 font-medium ${cfg.dimText}`}>faltan de {fmt(totalMeta)} {nec.unidad}</span>
                  </>
                )}
              </div>
            </div>
            <ProgressBar pct={pct} barColor={cfg.barColor} barBg={cfg.barBg} />
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <p className={`text-[10px] font-semibold uppercase tracking-wider ${cfg.dimText}`}>Donación Recibida (Consolidado)</p>
            <p className={`text-[15px] font-bold ${cfg.textColor}`}>
              {totalRecibido} {nec.unidad} <span className="text-[11px] font-normal opacity-70">(Consumo continuo)</span>
            </p>
          </div>
        )}

        {/* RECEPTORS LIST */}
        <div className={`mt-2 pt-3 border-t ${cfg.divider} flex flex-col gap-2`}>
          <div className="flex items-center gap-1.5 mb-1">
            <Building2 className={`w-3.5 h-3.5 ${cfg.dimText}`} />
            <span className={`text-[10px] font-bold uppercase tracking-wider ${cfg.dimText}`}>
              ¿Dónde llevarlo? ({hubsRender.length} {hubsRender.length === 1 ? 'opción' : 'opciones'} de entrega)
            </span>
          </div>
          
          <div className="flex flex-col gap-2 max-h-48 overflow-y-auto no-scrollbar">
            {hubsRender.map((hub) => {
              const hubPct = getPct(hub.recibido, hub.meta);
              const hubMissing = hub.meta - hub.recibido;
              const hubIsCovered = hubPct >= 100;
              const hubCfg = PRIORIDAD_CONFIG[hub.prioridad];
              
              const handleHubClick = () => {
                localStorage.setItem('map_intro_force', '1');
                if (!hub.isGroup) {
                  localStorage.setItem('map_selected_hub_id', hub.hubId);
                }
              };
              
              return (
                <Link 
                  key={hub.hubId} 
                  to="/map"
                  onClick={handleHubClick}
                  className={`flex flex-col gap-1.5 p-2.5 rounded-lg border transition-all duration-200 active:scale-[0.98] ${
                    hub.isGroup
                      ? nec.prioridad === 'CRITICA'
                        ? 'bg-white/20 border-white/30 hover:bg-white/25 hover:border-white/50 shadow-sm'
                        : 'bg-[#2B5F8E]/40 border-[#2B5F8E]/30 hover:bg-[#2B5F8E]/55 hover:border-[#2B5F8E]/50'
                      : nec.prioridad === 'CRITICA' 
                        ? 'bg-white/10 border-white/15 hover:bg-white/15 hover:border-white/30' 
                        : 'bg-[#152D46]/60 border-[#2B5F8E]/20 hover:bg-[#152D46]/80 hover:border-[#2B5F8E]/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-white truncate" title={hub.hubName}>
                      {hub.hubName}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold border uppercase tracking-wider shrink-0 ${
                      nec.prioridad === 'CRITICA'
                        ? 'bg-white/20 text-white border-white/30'
                        : hubCfg.badgeBg
                    }`}>
                      {hubCfg.label}
                    </span>
                  </div>
                  
                  {hub.meta > 0 ? (
                    <div className="flex items-center justify-between text-[10px]">
                      <span className={nec.prioridad === 'CRITICA' ? 'text-white/80' : 'text-white/60'}>
                        {hubPct}% cubierto {hub.isGroup ? 'en total' : ''}
                      </span>
                      <span className="font-mono text-white/95">
                        {hubIsCovered ? 'Cubierto' : `Faltan ${fmt(hubMissing)} ${nec.unidad}`}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] font-semibold text-white/80">
                      Consumo continuo · {hub.recibido} {nec.unidad} recibidos
                    </span>
                  )}
                  {/* Mini Progress Bar */}
                  {hub.meta > 0 && (
                    <ProgressBar 
                      pct={hubPct} 
                      barColor={nec.prioridad === 'CRITICA' ? 'bg-white' : 'bg-[#4A89C0]'} 
                      barBg={nec.prioridad === 'CRITICA' ? 'bg-white/20' : 'bg-white/10'} 
                    />
                  )}
                  {hub.isGroup && (
                    <span className="text-[9px] text-white/60 leading-normal mt-0.5 block italic border-t border-white/10 pt-1">
                      Nota: Podes entregar en cualquier centro de acopio local o directamente en el punto de salida para su despacho final.
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </article>
  );
}
