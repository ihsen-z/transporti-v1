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
