import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useAppDispatch } from "../../app/hooks";
import { logoutThunk } from "../../features/auth/authThunks";
import BottomNav from "../../components/shared/BottomNav";

export default function DriverProfilePage() {
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await dispatch(logoutThunk());
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-zinc-950 pb-20">
      {/* Header */}
      <div className="px-4 pt-10 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-yellow-400 flex items-center justify-center text-2xl">
            🚐
          </div>
          <div>
            <p className="text-white font-semibold text-lg">{user?.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-2 rounded-full bg-green-400" />
              <p className="text-zinc-500 text-sm">Driver</p>
            </div>
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
          <span className="text-white text-sm">Driver</span>
        </div>
        <div className="flex justify-between items-center py-2">
          <span className="text-zinc-500 text-sm">Van</span>
          <span className="text-white text-sm">van-1</span>
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
  );
}
