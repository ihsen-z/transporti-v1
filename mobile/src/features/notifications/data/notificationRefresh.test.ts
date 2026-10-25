import { queriesToRefresh } from './notificationRefresh';

describe('queriesToRefresh', () => {
  it('rafraîchit la cloche pour toute notification', () => {
    expect(queriesToRefresh('REVIEW_RECEIVED', {})).toEqual([
      ['notificationsUnreadCount'],
      ['notifications'],
    ]);
  });

  it('rafraîchit la boîte de réception et le fil pour un message', () => {
    expect(queriesToRefresh('MESSAGE_RECEIVED', { job_id: 12 })).toEqual([
      ['notificationsUnreadCount'],
      ['notifications'],
      ['conversations'],
      ['jobMessages', 12],
    ]);
  });

  it("rafraîchit l'écran de mission et le séquestre pour un événement de mission", () => {
    expect(queriesToRefresh('JOB_STARTED', { job_id: '8' })).toEqual([
      ['notificationsUnreadCount'],
      ['notifications'],
      ['jobDetail', 8],
      ['jobEscrow', 8],
    ]);
  });

  it('ignore un identifiant de mission illisible', () => {
    // Le metadata est un JSON libre côté serveur : ne jamais en déduire une
    // clé fausse, qui rafraîchirait une autre mission ou rien du tout.
    expect(queriesToRefresh('JOB_STARTED', { job_id: 'abc' })).toHaveLength(2);
    expect(queriesToRefresh('MESSAGE_RECEIVED', { job_id: -3 })).toHaveLength(3);
  });
});
