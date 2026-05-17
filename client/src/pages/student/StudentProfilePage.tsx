import BottomNav from '../../components/shared/BottomNav'
import { useAuth } from '../../hooks/useAuth'
import { useAppDispatch } from '../../app/hooks'
import { logoutThunk } from '../../features/auth/authThunks'
import { useNavigate } from 'react-router-dom'

export default function StudentProfilePage() {
  const { user } = useAuth()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await dispatch( logoutThunk() )
    navigate( '/login' )
  }

  return (
    <div
      className="bg-zinc-950 w-full overflow-y-auto"
      style={{ minHeight: '100dvh' }}
    >
      <div
        style={{
          paddingTop: 'max(2.5rem, env(safe-area-inset-top))',
          paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))',
          paddingLeft: 'max(1rem, env(safe-area-inset-left))',
          paddingRight: 'max(1rem, env(safe-area-inset-right))',
        }}
      >
        {/* Header — centered avatar + stacked text */}
        <div className="flex flex-col items-center text-center pb-6">
          <div className="w-20 h-20 rounded-2xl bg-yellow-400 flex items-center justify-center text-3xl mb-3">
            👤
          </div>
          <p className="text-white font-semibold text-base break-all px-4">
            {user?.email}
          </p>
          <p className="text-zinc-500 text-sm capitalize mt-1">{user?.role}</p>
        </div>

        {/* Info card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-zinc-800 gap-4">
            <span className="text-zinc-500 text-sm flex-shrink-0">Email</span>
            <span className="text-white text-sm text-right break-all">{user?.email}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-zinc-800 gap-4">
            <span className="text-zinc-500 text-sm flex-shrink-0">Role</span>
            <span className="text-white text-sm capitalize">{user?.role}</span>
          </div>
          <div className="flex justify-between items-center py-2 gap-4">
            <span className="text-zinc-500 text-sm flex-shrink-0">Status</span>
            <span className="text-green-400 text-sm font-semibold">Active</span>
          </div>
        </div>

        {/* Logout */}
        <div className="mt-4">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full bg-red-500/10 hover:bg-red-500/20 active:bg-red-500/30 border border-red-500/30 text-red-400 font-semibold text-sm rounded-2xl py-3 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* BottomNav fixed to bottom — not in document flow */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <BottomNav />
      </div>
    </div>
  )
}