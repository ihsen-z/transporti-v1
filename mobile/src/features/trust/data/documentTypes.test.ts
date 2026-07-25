import { DOCUMENT_TYPES, isExpiringType } from './documentTypes';

describe('documentTypes', () => {
  it('expose les 9 types de documents actifs', () => {
    expect(DOCUMENT_TYPES).toHaveLength(9);
  });

  it('isExpiringType: permis/assurance/carte grise expirent, CIN/selfie non', () => {
    expect(isExpiringType('LICENSE_FRONT')).toBe(true);
    expect(isExpiringType('INSURANCE_BACK')).toBe(true);
    expect(isExpiringType('CARTE_GRISE_FRONT')).toBe(true);
    expect(isExpiringType('CIN_FRONT')).toBe(false);
    expect(isExpiringType('CIN_BACK')).toBe(false);
    expect(isExpiringType('SELFIE')).toBe(false);
  });
});
