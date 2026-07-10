// JWT claims as encoded in the token.
export interface JwtPayload {
  sub: number; // telegram_id
  isAdmin: boolean;
}

// Shape attached to `request.user` after JwtAuthGuard runs.
export interface AuthenticatedUser {
  telegramId: number;
  name: string;
  isAdmin: boolean;
}
