import { shouldRefetchOnFocus } from './useRefetchOnTabFocus';

describe('shouldRefetchOnFocus', () => {
  it('ne recharge pas au premier focus : la requête vient de se charger', () => {
    expect(shouldRefetchOnFocus(true)).toBe(false);
  });

  it('recharge à chaque retour sur l onglet ensuite', () => {
    expect(shouldRefetchOnFocus(false)).toBe(true);
  });
});
