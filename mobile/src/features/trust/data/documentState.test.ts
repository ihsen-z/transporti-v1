import { documentState } from './documentState';

describe('documentState', () => {
  it('validée : is_valid vrai', () => {
    expect(documentState({ is_valid: true, rejection_reason: '' })).toBe('valid');
  });

  it('refusée : is_valid faux avec un motif (ne doit PAS afficher « en attente »)', () => {
    expect(documentState({ is_valid: false, rejection_reason: 'Photo floue' })).toBe('rejected');
  });

  it('en attente : is_valid faux sans motif', () => {
    expect(documentState({ is_valid: false, rejection_reason: '' })).toBe('pending');
    expect(documentState({ is_valid: false, rejection_reason: '   ' })).toBe('pending');
  });
});
