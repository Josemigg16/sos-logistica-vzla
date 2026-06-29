import {
  Wheat,
  Pill,
  SprayCan,
  Wind,
  Shirt,
  Wrench,
  Baby
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const MENSAJES_ACTIVOS = [
  'Cada litro de agua que donas salva una familia esta noche.',
  'Hoy hay bebés durmiendo en albergues. Tus pañales importan.',
  'Una frazada puede ser la diferencia entre el frío y la esperanza.',
  'No existe donación pequeña cuando alguien lo necesita todo.',
  'Detrás de cada número hay una persona esperando.',
  'Tu gesto hoy puede ser el recuerdo más importante de alguien.',
  'La solidaridad no tiene monto mínimo. Solo corazón.',
];

export const MENSAJES_CUBIERTOS = [
  'Esta necesidad está cubierta por ahora — pero el mañana también importa.',
  'La meta se alcanzó. Cualquier donación extra queda en reserva para los próximos días.',
  'Gracias a quienes donaron. Si quieres ayudar, considera los ítems que aún faltan.',
  'Lo que sobra hoy salva vidas mañana. Las reservas también cuentan.',
];

export interface PrioridadStyle {
  label: string;
  barColor: string;
  barBg: string;
  textColor: string;
  dimText: string;
  cardBg: string;
  cardBorder: string;
  badgeBg: string;
  iconBg: string;
  glow: string;
  topAccent: boolean;
  divider: string;
}

export const PRIORIDAD_CONFIG: Record<'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA', PrioridadStyle> = {
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
};

export const CATEGORIA_ICON: Record<string, LucideIcon> = {
  'Víveres': Wheat,
  'Medicamentos': Pill,
  'Higiene personal': SprayCan,
  'Productos de limpieza': Wind,
  'Abrigo y refugio': Shirt,
  'Herramientas': Wrench,
  'Artículos para bebés y grupos vulnerables': Baby,
};
