import { useState } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import { useNavigate } from "react-router-dom";
import { useAppDispatch } from "../../app/hooks";
import { logoutThunk } from "../../features/auth/authThunks";
import BottomNav from "../../components/shared/BottomNav";

export default function AdminSettingsPage() {
  const [capacity, setCapacity] = useState( 10 );
  const [isSaving, setIsSaving] = useState( false );
  const [isResetting, setIsResetting] = useState( false );
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await dispatch( logoutThunk() );
    navigate( "/login" );
  };

  const handleSaveCapacity = async () => {
    setIsSaving( true );
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString() ?? "";
      await fetch( `${import.meta.env.VITE_API_BASE_URL}/van/capacity`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify( { capacity } ),
      } );
    } catch {
      // silent fail
    } finally {
      setIsSaving( false );
    }
  };

  const handleResetSimulation = async () => {
    setIsResetting( true );
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString() ?? "";
      await fetch( `${import.meta.env.VITE_API_BASE_URL}/van/simulation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify( { action: "stop" } ),
      } );
    } catch {
      // silent fail
    } finally {
      setIsResetting( false );
    }
  };

  return (
    /*
     * FIXES:
     * 1. min-h-screen → min-h-[100dvh]      dynamic viewport for iOS Safari
     * 2. pt uses safe-area-inset-top         clears notch / status bar
     * 3. pb uses safe-area-inset-bottom      clears home indicator + nav height
     * 4. BottomNav fixed to bottom           not inline in document flow
     */
    <div
      className="bg-zinc-950 w-full overflow-y-auto"
      style={{ minHeight: "100dvh" }}
    >
      {/* Scrollable content */}
      <div
        style={{
          paddingTop: "max(2.5rem, env(safe-area-inset-top))",
          paddingBottom: "calc(5rem + env(safe-area-inset-bottom))",
          paddingLeft: "max(1rem, env(safe-area-inset-left))",
          paddingRight: "max(1rem, env(safe-area-inset-right))",
        }}
      >
        {/* Header */}
        <div className="pb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-yellow-400 flex items-center justify-center text-2xl flex-shrink-0">
              ⚙️
            </div>
            <div>
              <p className="text-white font-semibold text-lg">Settings</p>
              <p className="text-zinc-500 text-sm">System configuration</p>
            </div>
          </div>
        </div>

        {/* Van capacity */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-4">
          <p className="text-white font-semibold text-sm mb-1">Van Capacity</p>
          <p className="text-zinc-500 text-xs mb-4">Max passengers per van</p>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setCapacity( Math.max( 1, capacity - 1 ) )}
              className="w-10 h-10 rounded-xl bg-zinc-800 text-white font-bold text-lg hover:bg-zinc-700 active:bg-zinc-600 transition-colors flex-shrink-0"
            >
              −
            </button>
            <span className="text-yellow-400 font-black text-2xl flex-1 text-center">
              {capacity}
            </span>
            <button
              type="button"
              onClick={() => setCapacity( Math.min( 30, capacity + 1 ) )}
              className="w-10 h-10 rounded-xl bg-zinc-800 text-white font-bold text-lg hover:bg-zinc-700 active:bg-zinc-600 transition-colors flex-shrink-0"
            >
              +
            </button>
          </div>
          <button
            type="button"
            onClick={handleSaveCapacity}
            disabled={isSaving}
            className="w-full mt-4 bg-yellow-400 hover:bg-yellow-300 active:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 font-semibold text-sm rounded-xl py-2.5 transition-colors"
          >
            {isSaving ? "Saving…" : "Save Capacity"}
          </button>
        </div>

        {/* Simulation */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-4">
          <p className="text-white font-semibold text-sm mb-1">Simulation</p>
          <p className="text-zinc-500 text-xs mb-4">Reset the van simulation</p>
          <button
            type="button"
            onClick={handleResetSimulation}
            disabled={isResetting}
            className="w-full bg-red-500/10 hover:bg-red-500/20 active:bg-red-500/30 border border-red-500/30 text-red-400 font-semibold text-sm rounded-xl py-2.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isResetting ? "Resetting…" : "■ Stop & Reset Simulation"}
          </button>
        </div>

        {/* App info */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-4">
          <p className="text-white font-semibold text-sm mb-3">App Info</p>
          <div className="space-y-2">
            <div className="flex justify-between gap-4">
              <span className="text-zinc-500 text-sm flex-shrink-0">Version</span>
              <span className="text-white text-sm text-right">
                1.0.0 — Presentation Build
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-zinc-500 text-sm flex-shrink-0">University</span>
              <span className="text-white text-sm text-right">
                University of Mindanao
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-zinc-500 text-sm flex-shrink-0">Region</span>
              <span className="text-white text-sm text-right">ap-southeast-1</span>
            </div>
          </div>
        </div>

        {/* Logout */}
        <button
          type="button"
          onClick={handleLogout}
          className="w-full bg-red-500/10 hover:bg-red-500/20 active:bg-red-500/30 border border-red-500/30 text-red-400 font-semibold text-sm rounded-2xl py-3 transition-colors"
        >
          Sign out
        </button>
      </div>

      {/* BottomNav fixed to bottom — not in document flow */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <BottomNav />
      </div>
    </div>
  );
}