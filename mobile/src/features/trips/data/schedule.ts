// Génération d'options jour/heure sans dépendance de date-picker natif
// (différé). Le jour porte une valeur ISO (YYYY-MM-DD), l'heure un créneau HH:mm.

export interface DayOption {
  value: string; // YYYY-MM-DD
  label: string; // JJ/MM/AAAA
}

// Les N prochains jours à partir d'aujourd'hui (inclus).
export function nextDays(count: number): DayOption[] {
  const out: DayOption[] = [];
  const now = new Date();
  for (let i = 0; i < count; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    out.push({ value: `${yyyy}-${mm}-${dd}`, label: `${dd}/${mm}/${yyyy}` });
  }
  return out;
}

export const TIME_SLOTS: readonly string[] = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
  '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00',
];

// Combine jour + heure en ISO 8601. La chaîne "YYYY-MM-DDTHH:mm:ss" est
// interprétée en heure locale, puis convertie en UTC (Z) pour le backend.
export function toScheduledTime(day: string, time: string): string {
  return new Date(`${day}T${time}:00`).toISOString();
}
