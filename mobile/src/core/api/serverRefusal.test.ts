import { parseServerRefusal } from './serverRefusal';

describe('parseServerRefusal', () => {
  it('lit error + code', () => {
    expect(parseServerRefusal({ error: 'Pièces non validées.', code: 'KYC_REQUIRED' })).toEqual({
      message: 'Pièces non validées.',
      code: 'KYC_REQUIRED',
    });
  });

  it('lit detail + code', () => {
    expect(parseServerRefusal({ detail: 'Plafond atteint.', code: 'COMMISSION_DEBT_LIMIT' })).toEqual({
      message: 'Plafond atteint.',
      code: 'COMMISSION_DEBT_LIMIT',
    });
  });

  it('lit message + code, même si code est écrit en premier', () => {
    expect(parseServerRefusal({ code: 'PIN_LOCKED', message: 'Trop d essais.' })).toEqual({
      message: 'Trop d essais.',
      code: 'PIN_LOCKED',
    });
  });

  it('ne prend jamais le code pour un message', () => {
    expect(parseServerRefusal({ code: 'KYC_REQUIRED' })).toEqual({
      message: null,
      code: 'KYC_REQUIRED',
    });
  });

  it('tolère un corps absent ou HTML', () => {
    expect(parseServerRefusal(undefined)).toEqual({ message: null, code: null });
    expect(parseServerRefusal('<html></html>')).toEqual({ message: null, code: null });
    expect(parseServerRefusal([])).toEqual({ message: null, code: null });
  });
});
