import { useState, useRef, useEffect } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import BottomNav from "../../components/shared/BottomNav";
import AdminMap from "../../components/admin/AdminMap";
import {
  useGetStopsQuery,
  useUpdateStopMutation,
} from "../../features/stops/stopsApi";
import { useVanPosition } from "../../hooks/useVanPosition";
import { MOCK_STOPS } from "../../lib/mockData";
import { useStopQueues } from "../../hooks/useStopQueues";

const ChevronUp = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="18 15 12 9 6 15" />
  </svg>
);

const ChevronDown = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

export default function AdminDashboardPage() {
  const [isQueueOpen, setIsQueueOpen] = useState( false );
  const [simStatus, setSimStatus] = useState<"idle" | "running" | "loading">(
    "idle",
  );
  const simIntervalRef = useRef<ReturnType<typeof setInterval> | null>( null );

  const { data, refetch } = useGetStopsQuery();
  const [updateStop] = useUpdateStopMutation();
  const liveVan = useVanPosition();
  const liveStops = useStopQueues();

  const stops = liveStops.length > 0 ? liveStops : ( data?.stops ?? MOCK_STOPS );

  // Cleanup interval on unmount
  useEffect( () => {
    return () => {
      if ( simIntervalRef.current ) clearInterval( simIntervalRef.current );
    };
  }, [] );

  const handleStopDrop = async ( stopId: string, lat: number, lng: number ) => {
    await updateStop( { stopId, lat, lng } );
    refetch();
  };

  const handleToggleStop = async ( stopId: string, active: boolean ) => {
    await updateStop( { stopId, active } );
    refetch();
  };

  const triggerVanTick = async ( token: string ) => {
    try {
      await fetch( `${import.meta.env.VITE_API_BASE_URL}/van/tick`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      } );
    } catch {
      // silent fail
    }
  };

  const handleSimulation = async ( action: "start" | "stop" ) => {
    setSimStatus( "loading" );
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString() ?? "";

      await fetch( `${import.meta.env.VITE_API_BASE_URL}/van/simulation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify( { action } ),
      } );

      if ( action === "start" ) {
        setSimStatus( "running" );
        simIntervalRef.current = setInterval( () => triggerVanTick( token ), 5000 );
      } else {
        setSimStatus( "idle" );
        if ( simIntervalRef.current ) {
          clearInterval( simIntervalRef.current );
          simIntervalRef.current = null;
        }
      }
    } catch {
      setSimStatus( "idle" );
    }
  };

  const totalQueue = liveStops.reduce( ( acc, s ) => acc + s.queueCount, 0 );

  return (
    /*
     * RESPONSIVE + iOS SAFARI FIXES:
     * 1. h-screen → 100dvh  (dynamic viewport height — shrinks when Safari chrome appears)
     * 2. viewport-fit=cover must be set in index.html for safe-area-inset-* to work
     */
    <div
      className="relative w-full bg-zinc-950 overflow-hidden"
      style={{
        height: "100dvh",           // Fix 1: dynamic viewport — fixes iOS Safari clipping
        // Fallback for very old browsers that don't support dvh:
        // If dvh is unsupported the browser ignores it and uses the initial value.
        // You can add a JS fallback via --vh custom property if needed.
      }}
    >
      {/* Full screen map — behind everything */}
      <div className="absolute inset-0 z-0">
        <AdminMap
          stops={stops}
          van={liveVan}
          onStopDrop={handleStopDrop}
          onToggleStop={handleToggleStop}
        />
      </div>

      {/* ── TOP BAR ─────────────────────────────────────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 z-10 px-3 pt-3 sm:px-5 sm:pt-4 md:px-6 md:pt-5">
        {/*
         * Safe area top: handles notch/dynamic island on iPhones.
         * Add `pt-safe` via a Tailwind plugin or use inline style below.
         * If you have @tailwindcss/safe-area plugin: add `pt-safe` to the outer div.
         * Otherwise use: style={{ paddingTop: 'env(safe-area-inset-top)' }}
         */}
        <div
          className="bg-zinc-900/90 backdrop-blur-sm border border-zinc-800 rounded-2xl px-4 py-3 space-y-3
                     md:flex md:flex-row md:items-center md:gap-6 md:space-y-0 md:py-4"
        >
          {/* Header */}
          <div className="flex items-center justify-between md:flex-col md:items-start md:justify-start md:min-w-[160px]">
            <div>
              <p className="text-white font-semibold text-sm md:text-base">
                Admin Overview
              </p>
              <p className="text-zinc-500 text-xs">University of Mindanao</p>
            </div>
            <div className="flex items-center gap-2 md:mt-1">
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${simStatus === "running"
                    ? "bg-green-400 animate-pulse"
                    : "bg-zinc-600"
                  }`}
              />
              <span className="text-zinc-500 text-xs">
                {simStatus === "running" ? "Sim Running" : "Sim Stopped"}
              </span>
            </div>
          </div>

          {/* Stats — 3 cols on mobile, inline on md+ */}
          <div className="grid grid-cols-3 gap-2 md:flex md:gap-3 md:flex-1">
            <div className="bg-zinc-800 rounded-xl px-3 py-2 text-center md:flex-1">
              <p className="text-yellow-400 font-bold text-lg md:text-xl">
                {totalQueue}
              </p>
              <p className="text-zinc-500 text-xs">In Queue</p>
            </div>
            <div className="bg-zinc-800 rounded-xl px-3 py-2 text-center md:flex-1">
              <p className="text-yellow-400 font-bold text-lg md:text-xl">
                {liveVan.isOnline ? 1 : 0}
              </p>
              <p className="text-zinc-500 text-xs">Vans Active</p>
            </div>
            <div className="bg-zinc-800 rounded-xl px-3 py-2 text-center md:flex-1">
              <p className="text-yellow-400 font-bold text-lg md:text-xl">
                {stops.filter( ( s ) => s.active ).length}
              </p>
              <p className="text-zinc-500 text-xs">Stops Live</p>
            </div>
          </div>

          {/* Simulation controls — stack on mobile, row on md+ */}
          <div className="flex gap-2 md:flex-col md:gap-2 md:min-w-[180px]">
            <button
              type="button"
              disabled={simStatus === "running" || simStatus === "loading"}
              onClick={() => handleSimulation( "start" )}
              className="flex-1 bg-green-500/20 hover:bg-green-500/30 active:bg-green-500/40
                         disabled:opacity-50 disabled:cursor-not-allowed
                         border border-green-500/40 text-green-400 text-xs font-semibold
                         rounded-xl py-2 px-3 transition-colors
                         md:text-sm"
            >
              {simStatus === "loading" ? "Starting…" : "▶ Start Simulation"}
            </button>
            <button
              type="button"
              disabled={simStatus === "idle" || simStatus === "loading"}
              onClick={() => handleSimulation( "stop" )}
              className="flex-1 bg-red-500/20 hover:bg-red-500/30 active:bg-red-500/40
                         disabled:opacity-50 disabled:cursor-not-allowed
                         border border-red-500/40 text-red-400 text-xs font-semibold
                         rounded-xl py-2 px-3 transition-colors
                         md:text-sm"
            >
              ■ Stop Simulation
            </button>
          </div>
        </div>
      </div>

      {/* ── STOP QUEUE PANEL ────────────────────────────────────────────────── */}
      {/*
       * Fix 2: bottom offset = nav height (4rem / 64px) + safe area inset.
       * This keeps the panel above the BottomNav on all iPhone models,
       * including those with home indicators (X, 11, 12, 13, 14, 15 series).
       *
       * On desktop (md+) the panel is wider and anchored to the right side.
       */}
      <div
        className="absolute left-0 right-0 z-10 px-3 sm:px-5
                   md:left-auto md:right-5 md:w-80 lg:w-96"
        style={{
          bottom: "calc(6.5rem + env(safe-area-inset-bottom))",
        }}
      >
        <div className="bg-zinc-900/90 backdrop-blur-sm border border-zinc-800 rounded-2xl overflow-hidden">
          {/* Toggle handle */}
          <button
            type="button"
            onClick={() => setIsQueueOpen( ( prev ) => !prev )}
            className="w-full flex items-center justify-between px-4 py-3
                       active:bg-zinc-800/60 hover:bg-zinc-800/40 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse flex-shrink-0" />
              <p className="text-zinc-300 text-xs font-semibold uppercase tracking-wider">
                Stop Queue Counts
              </p>
            </div>
            <span className="text-zinc-400 flex-shrink-0">
              {isQueueOpen ? <ChevronDown /> : <ChevronUp />}
            </span>
          </button>

          {/* Expandable list */}
          <div
            className={`transition-all duration-300 ease-in-out overflow-hidden ${isQueueOpen ? "max-h-64 opacity-100" : "max-h-0 opacity-0"
              }`}
          >
            <div className="px-4 pb-4 space-y-2 overflow-y-auto max-h-56">
              {stops.map( ( stop ) => (
                <div
                  key={stop.id}
                  className="flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${stop.active ? "bg-yellow-400" : "bg-zinc-600"
                        }`}
                    />
                    <span className="text-white text-sm truncate">
                      {stop.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleStop( stop.id, !stop.active )}
                      className={`text-xs px-2 py-1 rounded-lg font-semibold transition-colors
                        min-h-[32px] min-w-[76px] text-center
                        ${stop.active
                          ? "bg-red-500/20 text-red-400 hover:bg-red-500/30 active:bg-red-500/40"
                          : "bg-green-500/20 text-green-400 hover:bg-green-500/30 active:bg-green-500/40"
                        }`}
                    >
                      {stop.active ? "Deactivate" : "Activate"}
                    </button>
                    <div className="bg-zinc-800 rounded-lg px-2 py-1 min-w-[32px] text-center">
                      <span className="text-yellow-400 text-xs font-bold">
                        {"queueCount" in stop
                          ? ( stop as { queueCount: number } ).queueCount
                          : 0}
                      </span>
                    </div>
                  </div>
                </div>
              ) )}
            </div>
          </div>
        </div>
      </div>

      {/* ── BOTTOM NAV ──────────────────────────────────────────────────────── */}
      {/*
       * Fix 3: padding-bottom = safe area inset.
       * This lifts the nav content above the iPhone home indicator on all
       * notched/Face-ID models. Without viewport-fit=cover in index.html,
       * env(safe-area-inset-bottom) returns 0 and this has no effect —
       * so make sure that meta tag is set!
       *
       * z-50 keeps nav above the map and all overlays.
       */}
      <div
        className="absolute bottom-0 left-0 right-0 z-50"
        style={{
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <BottomNav />
      </div>
    </div>
  );
}