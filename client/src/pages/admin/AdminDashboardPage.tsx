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
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [simStatus, setSimStatus] = useState<"idle" | "running" | "loading">(
    "idle",
  );
  const simIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data, refetch } = useGetStopsQuery();
  const [updateStop] = useUpdateStopMutation();
  const liveVan = useVanPosition();
  const liveStops = useStopQueues();

  const stops = liveStops.length > 0 ? liveStops : (data?.stops ?? MOCK_STOPS);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    };
  }, []);

  const handleStopDrop = async (stopId: string, lat: number, lng: number) => {
    await updateStop({ stopId, lat, lng });
    refetch();
  };

  const handleToggleStop = async (stopId: string, active: boolean) => {
    await updateStop({ stopId, active });
    refetch();
  };

  const triggerVanTick = async (token: string) => {
    try {
      await fetch(`${import.meta.env.VITE_API_BASE_URL}/van/tick`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
    } catch {
      // silent fail
    }
  };

  const handleSimulation = async (action: "start" | "stop") => {
    setSimStatus("loading");
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString() ?? "";

      await fetch(`${import.meta.env.VITE_API_BASE_URL}/van/simulation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action }),
      });

      if (action === "start") {
        setSimStatus("running");
        // Tick every 5 seconds for faster simulation
        simIntervalRef.current = setInterval(() => triggerVanTick(token), 5000);
      } else {
        setSimStatus("idle");
        if (simIntervalRef.current) {
          clearInterval(simIntervalRef.current);
          simIntervalRef.current = null;
        }
      }
    } catch {
      setSimStatus("idle");
    }
  };

  const totalQueue = liveStops.reduce((acc, s) => acc + s.queueCount, 0);

  return (
    <div className="relative w-full h-screen bg-zinc-950 overflow-hidden">
      {/* Full screen map — behind everything */}
      <div className="absolute inset-0 z-0">
        <AdminMap
          stops={stops}
          van={liveVan}
          onStopDrop={handleStopDrop}
          onToggleStop={handleToggleStop}
        />
      </div>

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 px-4 pt-4">
        <div className="bg-zinc-900/90 backdrop-blur-sm border border-zinc-800 rounded-2xl px-4 py-3 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-semibold text-sm">Admin Overview</p>
              <p className="text-zinc-500 text-xs">University of Mindanao</p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${simStatus === "running" ? "bg-green-400 animate-pulse" : "bg-zinc-600"}`}
              />
              <span className="text-zinc-500 text-xs">
                {simStatus === "running" ? "Sim Running" : "Sim Stopped"}
              </span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-zinc-800 rounded-xl px-3 py-2 text-center">
              <p className="text-yellow-400 font-bold text-lg">{totalQueue}</p>
              <p className="text-zinc-500 text-xs">In Queue</p>
            </div>
            <div className="bg-zinc-800 rounded-xl px-3 py-2 text-center">
              <p className="text-yellow-400 font-bold text-lg">
                {liveVan.isOnline ? 1 : 0}
              </p>
              <p className="text-zinc-500 text-xs">Vans Active</p>
            </div>
            <div className="bg-zinc-800 rounded-xl px-3 py-2 text-center">
              <p className="text-yellow-400 font-bold text-lg">
                {stops.filter((s) => s.active).length}
              </p>
              <p className="text-zinc-500 text-xs">Stops Live</p>
            </div>
          </div>

          {/* Simulation controls */}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={simStatus === "running" || simStatus === "loading"}
              onClick={() => handleSimulation("start")}
              className="flex-1 bg-green-500/20 hover:bg-green-500/30 disabled:opacity-50 border border-green-500/40 text-green-400 text-xs font-semibold rounded-xl py-2 transition-colors"
            >
              {simStatus === "loading" ? "Starting..." : "▶ Start Simulation"}
            </button>
            <button
              type="button"
              disabled={simStatus === "idle" || simStatus === "loading"}
              onClick={() => handleSimulation("stop")}
              className="flex-1 bg-red-500/20 hover:bg-red-500/30 disabled:opacity-50 border border-red-500/40 text-red-400 text-xs font-semibold rounded-xl py-2 transition-colors"
            >
              ■ Stop Simulation
            </button>
          </div>
        </div>
      </div>

      {/* Collapsible stop list — above bottom nav */}
      <div className="absolute bottom-16 left-0 right-0 z-10 px-4">
        <div className="bg-zinc-900/90 backdrop-blur-sm border border-zinc-800 rounded-2xl overflow-hidden">
          {/* Toggle handle */}
          <button
            type="button"
            onClick={() => setIsQueueOpen((prev) => !prev)}
            className="w-full flex items-center justify-between px-4 py-3 active:bg-zinc-800/60 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
              <p className="text-zinc-300 text-xs font-semibold uppercase tracking-wider">
                Stop Queue Counts
              </p>
            </div>
            <span className="text-zinc-400">
              {isQueueOpen ? <ChevronDown /> : <ChevronUp />}
            </span>
          </button>

          {/* Expandable list */}
          <div
            className={`transition-all duration-300 ease-in-out overflow-hidden ${isQueueOpen ? "max-h-64 opacity-100" : "max-h-0 opacity-0"}`}
          >
            <div className="px-4 pb-4 space-y-2 overflow-y-auto max-h-56">
              {stops.map((stop) => (
                <div
                  key={stop.id}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${stop.active ? "bg-yellow-400" : "bg-zinc-600"}`}
                    />
                    <span className="text-white text-sm">{stop.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleStop(stop.id, !stop.active)}
                      className={`text-xs px-2 py-0.5 rounded-lg font-semibold transition-colors ${
                        stop.active
                          ? "bg-red-500/20 text-red-400"
                          : "bg-green-500/20 text-green-400"
                      }`}
                    >
                      {stop.active ? "Deactivate" : "Activate"}
                    </button>
                    <div className="bg-zinc-800 rounded-lg px-2 py-0.5">
                      <span className="text-yellow-400 text-xs font-bold">
                        {"queueCount" in stop
                          ? (stop as { queueCount: number }).queueCount
                          : 0}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom nav — always on top */}
      <div className="relative z-50">
        <BottomNav />
      </div>
    </div>
  );
}
