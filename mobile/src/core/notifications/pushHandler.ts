export const setupPushHandler = () => {
  console.log('[Push Handler] Initializing notification listeners (SANDBOX)...');
};

export const handleIncomingPush = (payload: any) => {
  console.log('[Push Handler] Incoming notification payload:', payload);
};
