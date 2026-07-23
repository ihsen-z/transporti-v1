import type { AuthUser, UserRole } from '@/core/auth/authStore';
import type { UserDto } from './dto';

// Rôles connus côté domaine. Le backend contrôle la valeur, mais on garde un
// garde-fou explicite pour ne pas propager une valeur inconnue silencieusement.
const KNOWN_ROLES: readonly UserRole[] = [
  'CLIENT',
  'TRANSPORTER',
  'ADMIN',
  'MODERATOR',
];

function toUserRole(raw: string): UserRole {
  return (KNOWN_ROLES as readonly string[]).includes(raw)
    ? (raw as UserRole)
    : 'CLIENT';
}

// Traduit le DTO serveur (snake_case) vers le modèle de domaine (camelCase).
export function mapUserDto(dto: UserDto): AuthUser {
  return {
    id: dto.id,
    email: dto.email,
    role: toUserRole(dto.role),
    isVerified: dto.is_phone_verified,
    firstName: dto.first_name,
    lastName: dto.last_name,
    phone: dto.phone,
    verificationStatus: dto.verification_status,
  };
}
