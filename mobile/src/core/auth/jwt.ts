// Lecture pure du payload d'un JWT — AUCUNE vérification de signature : ce
// n'est pas son rôle, le serveur reste la seule autorité sur la validité
// réelle du token. Sert uniquement à décider, côté client, s'il vaut la peine
// de rafraîchir avant d'envoyer une requête plutôt que d'après (5.6).
//
// Décodage base64url écrit à la main plutôt que de dépendre d'un `atob`
// global : sa disponibilité sur Hermes n'est pas garantie selon la version.

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function base64UrlDecode(segment: string): string {
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
  let output = '';
  let buffer = 0;
  let bits = 0;
  for (const char of base64) {
    const value = BASE64_CHARS.indexOf(char);
    if (value === -1) continue; // ignore le padding '=' et tout caractère invalide
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      output += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }
  return output;
}

// Horodatage d'expiration (ms epoch) porté par la revendication `exp` d'un
// JWT, ou `null` si le token est illisible ou dépourvu de cette revendication
// — l'appelant traite alors l'expiration comme inconnue plutôt que de planter.
export function jwtExpiryMs(token: string): number | null {
  const segments = token.split('.');
  const payloadSegment = segments[1];
  if (segments.length !== 3 || !payloadSegment) return null;

  try {
    const payload: unknown = JSON.parse(base64UrlDecode(payloadSegment));
    if (
      typeof payload === 'object' &&
      payload !== null &&
      typeof (payload as { exp?: unknown }).exp === 'number'
    ) {
      return (payload as { exp: number }).exp * 1000;
    }
  } catch {
    // Payload illisible (JSON invalide, encodage inattendu) : inconnu.
  }
  return null;
}
