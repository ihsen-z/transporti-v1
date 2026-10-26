import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { env } from '@/core/env';
import { reportError } from '@/core/observability';
import { useAuthStore } from '@/core/auth/authStore';
import { resolveNotificationRoute } from '@/features/notifications/data/notificationRoute';
import { queriesToRefresh } from '@/features/notifications/data/notificationRefresh';
import { useRegisterDevice } from '@/features/notifications/api/useRegisterDevice';

// Présentation en premier plan : sans ce handler, un push reçu app ouverte
// n'affiche ni bannière ni son (repli silencieux par défaut d'expo-notifications).
// Effet de module (comme `core/i18n/index.ts`) : une seule fois, avant tout montage.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    // `shouldShowAlert` est déprécié depuis expo-notifications 0.31 (SDK 53) :
    // la bannière et la liste du centre de notifications se règlent à part.
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function readRouteData(notification: Notifications.Notification) {
  const data = notification.request.content.data as
    | (Record<string, unknown> & { type?: unknown })
    | undefined;
  if (!data || typeof data.type !== 'string') return null;
  const { type, ...metadata } = data;
  return { type, metadata };
}

// Permission, enregistrement du token Expo, réception (premier plan via le
// handler ci-dessus, arrière-plan géré par l'OS) et navigation au tap — les
// quatre volets du Lot 4.8, dans un seul hook monté une fois côté (app),
// symétrique de useDeepLinkRouting côté racine.
//
// Sans `eas.projectId` (aucun `eas init` lancé dans cet environnement),
// `getExpoPushTokenAsync` lèverait à coup sûr : repli silencieux identique au
// DSN Sentry ou à la clé Google Maps absents — l'app fonctionne normalement,
// elle ne reçoit simplement aucun push.
export function usePushNotifications(): void {
  const status = useAuthStore((s) => s.status);
  const role = useAuthStore((s) => s.user?.role);
  const router = useRouter();
  const queryClient = useQueryClient();
  const register = useRegisterDevice();
  const attempted = useRef(false);

  useEffect(() => {
    if (status !== 'authenticated' || attempted.current || !env.easProjectId) return;
    attempted.current = true;

    void (async () => {
      try {
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.DEFAULT,
          });
        }

        const current = await Notifications.getPermissionsAsync();
        const granted =
          current.status === 'granted' ||
          (await Notifications.requestPermissionsAsync()).status === 'granted';
        if (!granted) return;

        const { data: token } = await Notifications.getExpoPushTokenAsync({
          projectId: env.easProjectId,
        });

        register.mutate({
          platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
          token,
        });
      } catch (err) {
        reportError(err instanceof Error ? err : new Error('push registration failed'));
      }
    })();
  }, [status, register]);

  useEffect(() => {
    const onResponse = (response: Notifications.NotificationResponse) => {
      const route = readRouteData(response.notification);
      if (!route) return;
      const target = resolveNotificationRoute(route.type, route.metadata, role);
      if (target) router.push(target);
    };

    // Cold start depuis un tap (app tuée) : le listener ci-dessous ne verrait
    // jamais cet événement, seul cet appel le récupère.
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) onResponse(response);
    });

    const subscription = Notifications.addNotificationResponseReceivedListener(onResponse);
    return () => subscription.remove();
  }, [router, role]);

  // Push reçu l'application ouverte : on rafraîchit tout de suite ce qu'il
  // concerne, au lieu d'attendre le prochain sondage (désormais lent, voir
  // core/api/polling.ts). Sans compte EAS, aucun push n'arrive et ce listener
  // reste muet : les sondages assurent seuls la fraîcheur.
  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      const route = readRouteData(notification);
      if (!route) return;
      for (const queryKey of queriesToRefresh(route.type, route.metadata)) {
        void queryClient.invalidateQueries({ queryKey });
      }
    });
    return () => subscription.remove();
  }, [queryClient]);
}
