import { nextDays, TIME_SLOTS, toScheduledTime } from './schedule';

describe('schedule', () => {
  it('nextDays renvoie N jours au bon format, à partir d\'aujourd\'hui', () => {
    const days = nextDays(5);
    expect(days).toHaveLength(5);
    days.forEach((d) => {
      expect(d.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(d.label).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    });
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    expect(days[0]?.value).toBe(`${yyyy}-${mm}-${dd}`);
  });

  it('TIME_SLOTS couvre 06:00 à 20:00', () => {
    expect(TIME_SLOTS[0]).toBe('06:00');
    expect(TIME_SLOTS[TIME_SLOTS.length - 1]).toBe('20:00');
  });

  it('toScheduledTime combine jour + heure en instant local exact', () => {
    const iso = toScheduledTime('2027-06-15', '14:00');
    // Comparaison d'instants (indépendante du fuseau).
    expect(new Date(iso).getTime()).toBe(new Date('2027-06-15T14:00:00').getTime());
  });
});
