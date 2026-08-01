// DTO = forme EXACTE échangée avec le backend (snake_case tel quel serveur).
// Source contrat : backend/users/serializers.py + backend/users/views.py.
// Le mapper (mapper.ts) traduit ensuite vers le domaine camelCase.

// POST /api/v1/auth/login/ — corps (UserLoginSerializer).
export interface LoginRequestDto {
  email: string;
  password: string;
}

// Utilisateur renvoyé par UserProfileSerializer.
export interface UserDto {
  id: number;
  email: string;
  phone: string;
  // Valeur d'énum contrôlée par le backend ; narrowée dans le mapper.
  role: string;
  first_name: string;
  last_name: string;
  is_phone_verified: boolean;
  verification_status: string | null;
}

// Réponse 200 de LoginView : tokens IMBRIQUÉS sous `tokens`.
export interface LoginResponseDto {
  message: string;
  user: UserDto;
  tokens: {
    access: string;
    refresh: string;
  };
}

// Réponse 200 de ProfileView (GET /api/v1/auth/profile/) : le UserDto est
// IMBRIQUÉ sous `user`, comme pour le login — pas à la racine. Le serveur
// ajoute aussi avatar_url / address_summary / language_pref, ignorés ici.
export interface ProfileResponseDto {
  user: UserDto;
}

// POST /api/v1/auth/register/ — corps (UserRegistrationSerializer).
// Tous les champs sont requis côté serveur (first_name/last_name explicitement).
export interface RegisterRequestDto {
  email: string;
  phone: string;
  password: string;
  password_confirm: string;
  role: 'CLIENT' | 'TRANSPORTER';
  first_name: string;
  last_name: string;
}

// Réponse 201 de RegisterView : MÊME forme que le login (auto-login) —
// { message, user, tokens }. On réutilise donc LoginResponseDto.
export type RegisterResponseDto = LoginResponseDto;

// POST /api/v1/auth/password-reset/ — corps + réponse 200.
// Le serveur répond toujours 200 (anti-énumération) avec un message générique.
export interface PasswordResetRequestDto {
  email: string;
}

export interface PasswordResetResponseDto {
  message: string;
}

// PUT /api/v1/auth/profile/ — corps (UserProfileUpdateSerializer, partiel).
// Seuls les champs éditables côté mobile.
export interface UpdateProfileRequestDto {
  first_name: string;
  last_name: string;
  phone: string;
}

// Réponse 200 de ProfileView.put : { message, user } (user = UserProfileSerializer).
export interface UpdateProfileResponseDto {
  message: string;
  user: UserDto;
}

// POST /api/v1/auth/change-password/ — corps + réponse 200.
export interface ChangePasswordRequestDto {
  current_password: string;
  new_password: string;
}

export interface ChangePasswordResponseDto {
  message: string;
}
