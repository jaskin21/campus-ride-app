export type UserRole = 'student' | 'driver' | 'admin'

export interface AuthUser {
  id: string
  email: string
  role: UserRole
  isApproved?: boolean
}

export interface AuthState {
  user: AuthUser | null
  role: UserRole | null
  isReady: boolean
  isLoading: boolean
  error: string | null
}