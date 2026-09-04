import { render, screen } from '@testing-library/react-native';
import '@/core/i18n'; // init i18n (effet de bord) : les libellés viennent de là.
import { MissionTimeline } from './MissionTimeline';
import type { JobEventDto } from '../api/dto';

// C-16 — « recevoir une preuve de livraison ». Le champ `pod_photo_url` vivait
// dans le DTO et arrivait du serveur depuis le sprint 6 ; rien ne l'affichait,
// donc la cliente ne recevait aucune preuve de ce qu'elle avait payé (lot 7.2).

function evenement(over: Partial<JobEventDto> = {}): JobEventDto {
  return {
    event: 'DELIVERED',
    created_at: '2026-09-06T14:30:00Z',
    pod_photo_url: '',
    ...over,
  };
}

describe('MissionTimeline', () => {
  it('affiche la preuve quand le serveur en fournit une', () => {
    render(
      <MissionTimeline
        events={[evenement({ pod_photo_url: 'http://srv/media/preuve.jpg' })]}
      />,
    );
    const photo = screen.getByTestId('timeline-pod-photo');
    expect(photo).toBeTruthy();
    expect(photo.props.source).toEqual({ uri: 'http://srv/media/preuve.jpg' });
  });

  it("n'affiche rien quand il n'y a pas de preuve", () => {
    // La majorite des evenements (CONFIRMED_START, etc.) n'en portent pas :
    // un cadre vide se lirait comme une photo qui n'a pas charge.
    render(<MissionTimeline events={[evenement()]} />);
    expect(screen.queryByTestId('timeline-pod-photo')).toBeNull();
  });

  it('reste utilisable sans aucun evenement', () => {
    render(<MissionTimeline events={[]} />);
    expect(screen.queryByTestId('timeline-pod-photo')).toBeNull();
  });
});
