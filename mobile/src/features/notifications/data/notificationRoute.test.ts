import { resolveNotificationRoute } from './notificationRoute';

describe('resolveNotificationRoute', () => {
  it('route un message vers le fil de la mission concernée', () => {
    expect(resolveNotificationRoute('MESSAGE_RECEIVED', { job_id: 42 }, 'CLIENT')).toEqual({
      pathname: '/messages/[jobId]',
      params: { jobId: '42' },
    });
  });

  it('route une alerte corridor vers la recherche, quel que soit le role', () => {
    expect(resolveNotificationRoute('CORRIDOR_TRIP_PUBLISHED', {}, 'CLIENT')).toEqual({
      pathname: '/search',
    });
  });

  describe('cote client', () => {
    it('route une demande acceptee vers le suivi de mission (job_id numerique)', () => {
      expect(
        resolveNotificationRoute('TRIP_REQUEST_ACCEPTED', { job_id: 7, request_id: 1 }, 'CLIENT'),
      ).toEqual({ pathname: '/mission/[id]', params: { id: '7' } });
    });

    it('route une mission terminee vers le suivi de mission', () => {
      expect(resolveNotificationRoute('JOB_COMPLETED', { job_id: 7 }, 'CLIENT')).toEqual({
        pathname: '/mission/[id]',
        params: { id: '7' },
      });
    });

    it('ne route PAS une contre-proposition vers le suivi de mission (le client n est pas encore participant)', () => {
      expect(
        resolveNotificationRoute('TRIP_REQUEST_COUNTERED', { job_id: 7, request_id: 1 }, 'CLIENT'),
      ).toEqual({ pathname: '/mes-demandes' });
    });

    it('route un refus vers mes demandes', () => {
      expect(resolveNotificationRoute('TRIP_REQUEST_REJECTED', { job_id: 7 }, 'CLIENT')).toEqual({
        pathname: '/mes-demandes',
      });
    });

    it('rend null sans job_id plutot que de naviguer vers un ecran casse', () => {
      expect(resolveNotificationRoute('JOB_COMPLETED', {}, 'CLIENT')).toBeNull();
    });

    it('rend null pour un type sans route connue', () => {
      expect(resolveNotificationRoute('SYSTEM_ALERT', { job_id: 7 }, 'CLIENT')).toBeNull();
    });
  });

  describe('cote transporteur', () => {
    it('route une nouvelle demande recue vers les demandes du trajet', () => {
      expect(resolveNotificationRoute('TRIP_REQUEST_RECEIVED', { job_id: 9 }, 'TRANSPORTER')).toEqual({
        pathname: '/requests/[jobId]',
        params: { jobId: '9' },
      });
    });

    it.each(['ESCROW_RELEASED', 'ESCROW_REFUNDED', 'ESCROW_BLOCKED'])(
      '%s route vers le portefeuille',
      (type) => {
        expect(resolveNotificationRoute(type, { job_id: 9 }, 'TRANSPORTER')).toEqual({
          pathname: '/gains',
        });
      },
    );

    it('ne route pas le canal classique (OFFER_*), non construit sur mobile', () => {
      expect(resolveNotificationRoute('OFFER_ACCEPTED', { job_id: 9 }, 'TRANSPORTER')).toBeNull();
    });

    it('ne route pas JOB_COMPLETED cote transporteur (pas d ecran de detail transporteur)', () => {
      expect(resolveNotificationRoute('JOB_COMPLETED', { job_id: 9 }, 'TRANSPORTER')).toBeNull();
    });
  });

  it('rend null sans role connu (ADMIN/MODERATOR ne sont pas des roles mobiles)', () => {
    expect(resolveNotificationRoute('MESSAGE_RECEIVED', {}, undefined)).toBeNull();
    expect(resolveNotificationRoute('JOB_COMPLETED', { job_id: 7 }, undefined)).toBeNull();
  });

  it('accepte job_id en chaine (payload push) comme en nombre (metadata DB)', () => {
    expect(resolveNotificationRoute('MESSAGE_RECEIVED', { job_id: '42' }, 'CLIENT')).toEqual({
      pathname: '/messages/[jobId]',
      params: { jobId: '42' },
    });
  });
});
