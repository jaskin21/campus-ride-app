import { useSelector } from 'react-redux'
import type { RootState } from '../app/store'

export function useAuth() {
  const { user, role, isReady, isLoading, error } = useSelector(
    (state: RootState) => state.auth
  )

  return {
    user,
    role,
    isReady,
    isLoading,
    error,
    isAdmin: role === 'admin',
    isDriver: role === 'driver',
    isStudent: role === 'student',
  }
}