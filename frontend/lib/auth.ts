// Auth Types & Route Configuration
// Production — real API authentication

export type UserRole = "guest" | "client" | "transporter" | "admin";

export interface AuthUser {
  id: number;
  name: string;
  first_name?: string;
  last_name?: string;
  email: string;
  phone?: string;
  role: UserRole;
  avatar?: string;
  trustScore?: number;
  is_verified?: boolean;
}

/**
 * Les libelles de role NE SONT PLUS ici.
 *
 * Une constante de module en francais echappe au controle de parite fr/ar
 * (lib/i18n/parity.ts ne verifie que le dictionnaire) : le badge de role du
 * bandeau bleu affichait « Transporteur » a un lecteur arabophone, dans une
 * mise en page deja passee en RTL. Verifie en recette le 08/09/2026.
 *
 * Ils se lisent desormais dans `t.nav` : `client`, `transporter`, `visitor`,
 * `administrator`. Voir `libelleRole()` dans components/navigation/AppHeader.
 */

// Role colors for badges
export const roleColors: Record<UserRole, string> = {
  guest: "bg-[#EEF2F8] text-ink-500",
  client: "bg-blue-50 text-blue-600",
  transporter: "bg-blue-50 text-blue-700",
  admin: "bg-blue-700 text-white",
};

/**
 * Variante des badges de role posee sur le bandeau bleu : la charte y remplace
 * les aplats clairs par du verre (alpha sur le degrade), sans backdrop-filter.
 */
export const roleColorsOnBlue: Record<UserRole, string> = {
  guest: "bg-white/[0.16] text-white",
  client: "bg-white/[0.16] text-white",
  transporter: "bg-white/[0.16] text-white",
  admin: "bg-white text-blue-700",
};

// Route access configuration
export const routeAccess: Record<string, UserRole[]> = {
  // Public routes
  "/": ["guest", "client", "transporter", "admin"],
  "/login": ["guest", "client", "transporter", "admin"],
  "/register": ["guest", "client", "transporter", "admin"],
  "/help": ["guest", "client", "transporter", "admin"],
  "/terms": ["guest", "client", "transporter", "admin"],
  "/privacy": ["guest", "client", "transporter", "admin"],
  "/access-denied": ["guest", "client", "transporter", "admin"],

  // User routes (authenticated)
  "/dashboard": ["client", "transporter", "admin"],
  "/jobs": ["client", "transporter", "admin"],
  "/demandes/nouvelle": ["client", "admin"],
  "/demandes": ["client", "transporter", "admin"],
  "/retours/nouveau": ["transporter"],
  "/mes-offres": ["transporter"],
  "/messages": ["client", "transporter", "admin"],
  "/notifications": ["client", "transporter", "admin"],
  "/compte": ["client", "transporter", "admin"],
  "/profile": ["client", "transporter", "admin"],
  "/documents": ["client", "transporter", "admin"],
  "/litiges": ["client", "transporter", "admin"],
  "/transporter": ["client", "transporter", "admin"],

  // Admin routes
  "/admin": ["admin"],
};

// Check if a role can access a route
export function canAccess(role: UserRole, pathname: string): boolean {
  // Check exact match first
  if (routeAccess[pathname]) {
    return routeAccess[pathname].includes(role);
  }

  // Check prefix matches (e.g., /jobs/1 matches /jobs)
  for (const route of Object.keys(routeAccess)) {
    if (pathname.startsWith(route + "/") || pathname === route) {
      return routeAccess[route].includes(role);
    }
  }

  // Check /admin/* routes
  if (pathname.startsWith("/admin")) {
    return role === "admin";
  }

  // Check /jobs/*, /notifications/*, etc.
  if (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/jobs") ||
    pathname.startsWith("/notifications")
  ) {
    return ["client", "transporter", "admin"].includes(role);
  }

  // Default: deny access (secure by default)
  return false;
}

// Get redirect path after login based on role
export function getDefaultRedirect(role: UserRole): string {
  switch (role) {
    case "admin":
      return "/admin/dashboard";
    case "client":
    case "transporter":
      return "/dashboard";
    default:
      return "/";
  }
}
