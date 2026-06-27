import * as Sentry from '@sentry/react-native';

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

export const initSentry = () => {
  if (!SENTRY_DSN) {
    console.log('[Sentry] DSN is empty. Sentry tracking is disabled.');
    return;
  }

  try {
    Sentry.init({
      dsn: SENTRY_DSN,
      debug: __DEV__,
      environment: __DEV__ ? 'development' : 'production',
      tracesSampleRate: 1.0,
      enableAutoSessionTracking: true,
    });
  } catch (error) {
    console.error('Failed to initialize Sentry', error);
  }
};
