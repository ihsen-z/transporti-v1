interface InfiniteListLike<T> {
  data?: { pages: { results: T[] }[] };
  hasNextPage?: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => unknown;
}

// Aplatit `data.pages` (forme de useInfiniteQuery) et fournit le callback
// `onEndReached` prêt pour une FlatList — le même petit calcul répété à
// l'identique par les 4 listes migrées en 5.2 (notifications, avis, litiges,
// conversations), factorisé une seule fois plutôt que dupliqué 4 fois.
export function useFlatInfiniteList<T>(query: InfiniteListLike<T>) {
  const items = query.data?.pages.flatMap((page) => page.results) ?? [];

  const onEndReached = () => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      query.fetchNextPage();
    }
  };

  return { items, onEndReached };
}
