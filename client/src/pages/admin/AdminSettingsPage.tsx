import { useState } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import { useNavigate } from "react-router-dom";
import { useAppDispatch } from "../../app/hooks";
import { logoutThunk } from "../../features/auth/authThunks";
import BottomNav from "../../components/shared/BottomNav";

export default function AdminSettingsPage() {
  const [capacity, setCapacity] = useState(10);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await dispatch(logoutThunk());
    navigate("/login");
  };

  const handleSaveCapacity = async () => {
    setIsSaving(true);
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString() ?? "";
      await fetch(`${import.meta.env.VITE_API_BASE_URL}/van/capacity`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ capacity }),
      });
    } catch {
      // silent fail
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetSimulation = async () => {
    setIsResetting(true);
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString() ?? "";
      await fetch(`${import.meta.env.VITE_API_BASE_URL}/van/simulation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "stop" }),
      });
    } catch {
      // silent fail
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 pb-20">
      {/* Header */}
      <div className="px-4 pt-10 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-yellow-400 flex items-center justify-center text-2xl">
            ⚙️
          </div>
          <div>
            <p className="text-white font-semibold text-lg">Settings</p>
            <p className="text-zinc-500 text-sm">System configuration</p>
          </div>
        </div>
      </div>

      {/* Van capacity */}
      <div className="mx-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-4">
        <p className="text-white font-semibold text-sm mb-1">Van Capacity</p>
        <p className="text-zinc-500 text-xs mb-4">Max passengers per van</p>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setCapacity(Math.max(1, capacity - 1))}
            className="w-10 h-10 rounded-xl bg-zinc-800 text-white font-bold text-lg hover:bg-zinc-700 transition-colors"
          >
            −
          </button>
          <span className="text-yellow-400 font-black text-2xl flex-1 text-center">
            {capacity}
          </span>
          <button
            type="button"
            onClick={() => setCapacity(Math.min(30, capacity + 1))}
            className="w-10 h-10 rounded-xl bg-zinc-800 text-white font-bold text-lg hover:bg-zinc-700 transition-colors"
          >
            +
          </button>
        </div>
        <button
          type="button"
          onClick={handleSaveCapacity}
          disabled={isSaving}
          className="w-full mt-4 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-zinc-950 font-semibold text-sm rounded-xl py-2.5 transition-colors"
        >
          {isSaving ? "Saving..." : "Save Capacity"}
        </button>
      </div>

      {/* Simulation */}
      <div className="mx-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-4">
        <p className="text-white font-semibold text-sm mb-1">Simulation</p>
        <p className="text-zinc-500 text-xs mb-4">Reset the van simulation</p>
        <button
          type="button"
          onClick={handleResetSimulation}
          disabled={isResetting}
          className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-semibold text-sm rounded-xl py-2.5 transition-colors"
        >
          {isResetting ? "Resetting..." : "■ Stop & Reset Simulation"}
        </button>
      </div>

      {/* App info */}
      <div className="mx-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-4">
        <p className="text-white font-semibold text-sm mb-3">App Info</p>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-zinc-500 text-sm">Version</span>
            <span className="text-white text-sm">
              1.0.0 — Presentation Build
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500 text-sm">University</span>
            <span className="text-white text-sm">University of Mindanao</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500 text-sm">Region</span>
            <span className="text-white text-sm">ap-southeast-1</span>
          </div>
        </div>
      </div>

      {/* Logout */}
      <div className="mx-4">
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
