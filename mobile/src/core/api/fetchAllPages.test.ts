import MockAdapter from 'axios-mock-adapter';
import { apiClient } from './client';
import { fetchAllPages } from './fetchAllPages';

const mock = new MockAdapter(apiClient);

afterEach(() => {
  mock.reset();
});

describe('fetchAllPages', () => {
  it('rend directement les résultats quand une seule page suffit', async () => {
    mock.onGet('items/').reply(200, { count: 2, next: null, previous: null, results: [1, 2] });

    const items = await fetchAllPages<number>('items/');

    expect(items).toEqual([1, 2]);
  });

  it('suit `next` (URL absolue DRF) jusqu\'à épuisement', async () => {
    mock
      .onGet('items/')
      .reply(200, {
        count: 3,
        next: 'http://api.test/items/?page=2',
        previous: null,
        results: [1],
      });
    mock
      .onGet('http://api.test/items/?page=2')
      .reply(200, { count: 3, next: null, previous: 'x', results: [2, 3] });

    const items = await fetchAllPages<number>('items/');

    expect(items).toEqual([1, 2, 3]);
  });

  it('transmet les paramètres seulement sur la première page (déjà encodés dans `next` ensuite)', async () => {
    mock
      .onGet('items/', { params: { type: 'assigned' } })
      .reply(200, { count: 1, next: null, previous: null, results: ['a'] });

    const items = await fetchAllPages<string>('items/', { type: 'assigned' });

    expect(items).toEqual(['a']);
  });

  it("s'arrête au plafond de sécurité plutôt que de boucler indéfiniment", async () => {
    // Chaque page pointe vers la suivante à l'infini : sans plafond, ce test
    // ne terminerait jamais.
    for (let i = 1; i <= 12; i += 1) {
      const url = i === 1 ? 'items/' : `http://api.test/items/?page=${i}`;
      mock.onGet(url).reply(200, {
        count: 999,
        next: `http://api.test/items/?page=${i + 1}`,
        previous: null,
        results: [i],
      });
    }

    const items = await fetchAllPages<number>('items/');

    // 10 pages maximum (MAX_PAGES), pas 12+.
    expect(items).toHaveLength(10);
  });
});
