import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { AuthState, AuthUser, UserRole } from './authTypes'

const initialState: AuthState = {
  user: null,
  role: null,
  isReady: false,
  isLoading: false,
  error: null,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<{ user: AuthUser; role: UserRole }>) {
      state.user = action.payload.user
      state.role = action.payload.role
      state.isReady = true
      state.error = null
    },
    clearUser(state) {
      state.user = null
      state.role = null
      state.isReady = true
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload
    },
    setError(state, action: PayloadAction<string>) {
      state.error = action.payload
      state.isLoading = false
    },
    setReady(state) {
      state.isReady = true
    },
  },
})

export const { setUser, clearUser, setLoading, setError, setReady } = authSlice.actions
export default authSlice.reducer