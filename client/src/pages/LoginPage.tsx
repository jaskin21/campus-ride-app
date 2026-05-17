import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAppDispatch } from '../app/hooks'
import { useAuth } from '../hooks/useAuth'
import { loginThunk } from '../features/auth/authThunks'

const loginSchema = z.object( {
  email: z.string().min( 1, 'Email is required' ).pipe( z.email( 'Invalid email address' ) ),
  password: z.string().min( 8, 'Password must be at least 8 characters' ),
} )

type LoginForm = z.infer<typeof loginSchema>

/*
 * iOS Safari zooms into any <input> whose font-size is below 16px.
 * Tailwind's text-sm = 14px — below the threshold.
 * Fix: always set font-size: 16px on inputs via inline style.
 * Also set maximum-scale=1 in index.html viewport meta to block
 * the zoom triggered on page navigation after login.
 */
const inputStyle = { fontSize: '16px' } as const

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState( false )
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { error, isLoading } = useAuth()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>( {
    resolver: zodResolver( loginSchema ),
  } )

  const onSubmit = async ( data: LoginForm ) => {
    try {
      const role = await dispatch( loginThunk( data ) ).unwrap()
      if ( role === 'admin' ) navigate( '/admin/dashboard' )
      else if ( role === 'driver' ) navigate( '/driver/panel' )
      else navigate( '/student/home' )
    } catch {
      // error shown via Redux state
    }
  }

  return (
    <div
      className="flex flex-col items-center justify-center bg-zinc-950 w-full overflow-y-auto"
      style={{
        minHeight: '100dvh',
        paddingTop: 'max(1.5rem, env(safe-area-inset-top))',
        paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
        paddingLeft: 'max(1.25rem, env(safe-area-inset-left))',
        paddingRight: 'max(1.25rem, env(safe-area-inset-right))',
      }}
    >
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-yellow-400 mb-4">
          <span className="text-2xl">🚐</span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">CampusRide</h1>
        <p className="text-zinc-500 text-sm mt-1">University of Mindanao</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
        <h2 className="text-lg font-semibold text-white mb-6">Sign in</h2>

        <form onSubmit={handleSubmit( onSubmit )} className="space-y-4">
          {/* Email */}
          <div>
            <label htmlFor="email" className="text-sm text-zinc-400 mb-1 block">
              Email
            </label>
            <input
              id="email"
              {...register( 'email' )}
              type="email"
              placeholder="you@umindanao.edu.ph"
              autoComplete="email"
              style={inputStyle}
              className="w-full bg-zinc-800 text-white rounded-xl px-4 py-3 outline-none border border-zinc-700 focus:border-yellow-400 transition-colors placeholder:text-zinc-600"
            />
            {errors.email && (
              <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="text-sm text-zinc-400 mb-1 block">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                {...register( 'password' )}
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
                style={inputStyle}
                className="w-full bg-zinc-800 text-white rounded-xl px-4 py-3 outline-none border border-zinc-700 focus:border-yellow-400 transition-colors placeholder:text-zinc-600 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword( !showPassword )}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors text-xs px-1 py-1"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>
            )}
          </div>

          {/* Auth error */}
          {error && (
            <p className="text-red-400 text-xs text-center bg-red-400/10 rounded-xl py-2 px-3">
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-yellow-400 hover:bg-yellow-300 active:bg-yellow-500
                       disabled:opacity-50 disabled:cursor-not-allowed
                       text-zinc-950 font-semibold text-sm rounded-xl py-3
                       transition-colors mt-2"
          >
            {isLoading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-zinc-500 text-sm mt-6">
          New student?{' '}
          <Link
            to="/register"
            className="text-yellow-400 hover:text-yellow-300 transition-colors"
          >
            Create account
          </Link>
        </p>
      </div>

      <p className="text-zinc-700 text-xs mt-6 text-center">
        Drivers and admins contact your administrator
      </p>
    </div>
  )
}