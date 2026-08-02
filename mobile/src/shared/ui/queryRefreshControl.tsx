import { RefreshControl } from 'react-native';
import { colors } from '@/shared/theme';

// Interface minimale d'une query React Query pour le pull-to-refresh.
interface RefreshableQuery {
  isRefetching: boolean;
  refetch: () => unknown;
}

// Fabrique un RefreshControl (tiré-pour-rafraîchir) branché sur une query
// React Query. À passer au prop `refreshControl` d'une FlatList/ScrollView.
export function queryRefreshControl(query: RefreshableQuery) {
  return (
    <RefreshControl
      refreshing={query.isRefetching}
      onRefresh={() => {
        query.refetch();
      }}
      tintColor={colors.brand[500]}
      colors={[colors.brand[500]]}
    />
  );
}
