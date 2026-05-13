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
    await dispatch(logoutThunk())
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-zinc-950 pb-20">
      {/* Header */}
      <div className="px-4 pt-10 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-yellow-400 flex items-center justify-center text-2xl">
            👤
          </div>
          <div>
            <p className="text-white font-semibold text-lg">{user?.email}</p>
            <p className="text-zinc-500 text-sm capitalize">{user?.role}</p>
          </div>
        </div>
      </div>

      {/* Info card */}
      <div className="mx-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
        <div className="flex justify-between items-center py-2 border-b border-zinc-800">
          <span className="text-zinc-500 text-sm">Email</span>
          <span className="text-white text-sm">{user?.email}</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-zinc-800">
          <span className="text-zinc-500 text-sm">Role</span>
          <span className="text-white text-sm capitalize">{user?.role}</span>
        </div>
        <div className="flex justify-between items-center py-2">
          <span className="text-zinc-500 text-sm">Status</span>
          <span className="text-green-400 text-sm font-semibold">Active</span>
        </div>
      </div>

      {/* Logout */}
      <div className="mx-4 mt-4">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-semibold text-sm rounded-2xl py-3 transition-colors"
        >
          Sign out
        </button>
      </div>

      <BottomNav />
    </div>
  )
}