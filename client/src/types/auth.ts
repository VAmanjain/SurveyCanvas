export interface User {
    _id: string;
  email: string;
  name: string;
  role: 'admin' | 'creator' | 'respondent';
  created_at: Date;
  last_login?: Date;
  is_active: boolean;
  is_verified: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData extends LoginCredentials {
  name: string;
  role?: 'creator' | 'respondent';
}

export interface ResetPasswordData {
  password: string;
  confirmPassword: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}