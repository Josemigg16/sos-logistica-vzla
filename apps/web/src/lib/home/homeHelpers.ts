export function daysFromNow(iso: string): number {
  const [year, month, day] = iso.split('-').map(Number);
  const target = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function urgencyLabel(iso: string): { text: string; urgent: boolean; overdue: boolean } {
  const days = daysFromNow(iso);
  if (days < 0) return { text: 'Vencido', urgent: true, overdue: true };
  if (days === 0) return { text: 'Se necesita HOY', urgent: true, overdue: false };
  if (days === 1) return { text: 'Se necesita MAÑANA', urgent: true, overdue: false };
  if (days <= 3) return { text: `En ${days} días`, urgent: true, overdue: false };
  
  const [year, month, day] = iso.split('-').map(Number);
  const targetDate = new Date(year, month - 1, day);
  return {
    text: `Para el ${targetDate.toLocaleDateString('es-VE', { day: 'numeric', month: 'short' })}`,
    urgent: false,
    overdue: false,
  };
}

export function getPct(recibido: number, meta: number): number {
  if (meta <= 0) return 0;
  return Math.min(Math.round((recibido / meta) * 100), 100);
}

export function fmt(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toString();
}

export function timeAgo(iso?: string): string {
  if (!iso) return 'hace 0 min';
  const time = new Date(iso).getTime();
  if (isNaN(time)) return 'hace 0 min';
  const mins = Math.floor((Date.now() - time) / 60000);
  if (isNaN(mins) || mins < 0) return 'hace 0 min';
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  return `hace ${Math.floor(hrs / 24)}d`;
}

export function getEmergencyLocation(hubName?: string): 'LA_GUAIRA' | 'CHABASKEN' | 'OTRO' {
  if (!hubName) return 'OTRO';
  const nameLower = hubName.toLowerCase();
  if (
    nameLower.includes('chabasquen') ||
    nameLower.includes('dolores') ||
    nameLower.includes('unda') ||
    nameLower.includes('chabasquén')
  ) {
    return 'CHABASKEN';
  }
  if (nameLower.includes('guaira')) {
    return 'LA_GUAIRA';
  }
  return 'OTRO';
}

