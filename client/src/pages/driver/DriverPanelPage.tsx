import { useState, useEffect } from "react";
import BottomNav from "../../components/shared/BottomNav";
import VanMap from "../../components/map/VanMap";
import { useVanPosition } from "../../hooks/useVanPosition";
import { useStopQueues } from "../../hooks/useStopQueues";
import { useToggleOnlineMutation } from "../../features/driver/driverApi";

interface VanWithStop {
  currentStopId?: string;
}

function getOccupancyColor(pct: number): string {
  if (pct >= 90) return "bg-red-400";
  if (pct >= 70) return "bg-yellow-400";
  return "bg-green-400";
}

export default function DriverPanelPage() {
  const [isOnline, setIsOnline] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [isBoardingOpen, setIsBoardingOpen] = useState(false);

  const liveVan = useVanPosition();
  const liveStops = useStopQueues();
  const [toggleOnline] = useToggleOnlineMutation();

  // Sync online status from van position — avoid synchronous setState in effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsOnline(liveVan.isOnline);
    }, 0);
    return () => clearTimeout(timer);
  }, [liveVan.isOnline]);

  const handleToggle = async () => {
    setIsToggling(true);
    const newStatus = !isOnline;
    try {
      setIsOnline(newStatus);
      await toggleOnline({ isOnline: newStatus });
    } catch {
      setIsOnline(!newStatus);
    } finally {
      setIsToggling(false);
    }
  };

  const occupancyPct = Math.round(
    (liveVan.currentPassengers / liveVan.capacity) * 100,
  );
  const occupancyColor = getOccupancyColor(occupancyPct);

  const vanWithStop = liveVan as unknown as VanWithStop;
  const currentStopQueue = liveStops.find(
    (s) => s.id === vanWithStop.currentStopId,
  );
  const isBoardingStop = liveVan.isOnline && currentStopQueue !== undefined;

  const toggleLabel = isToggling ? "..." : isOnline ? "Online" : "Offline";

  return (
    <div className="relative w-full h-screen bg-zinc-950 overflow-hidden">
      {/* Full screen map */}
      <div className="absolute inset-0 z-0">
        <VanMap stops={liveStops} van={liveVan} />
      </div>

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 px-4 pt-4">
        <div className="bg-zinc-900/90 backdrop-blur-sm border border-zinc-800 rounded-2xl px-4 py-3 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-semibold text-sm">Driver Panel</p>
              <p className="text-zinc-500 text-xs">{liveVan.driverName}</p>
            </div>

            {/* Online toggle */}
            <button
              type="button"
              onClick={handleToggle}
              disabled={isToggling}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                isOnline
                  ? "bg-green-500/20 border border-green-500/40 text-green-400"
                  : "bg-zinc-800 border border-zinc-700 text-zinc-400"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${isOnline ? "bg-green-400 animate-pulse" : "bg-zinc-600"}`}
              />
              {toggleLabel}
            </button>
          </div>

          {/* Capacity bar */}
          {isOnline && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-zinc-500 text-xs">Passengers</span>
                <span className="text-white text-xs font-semibold">
                  {liveVan.currentPassengers}/{liveVan.capacity}
                </span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all ${occupancyColor}`}
                  style={{ width: `${occupancyPct}%` }}
                />
              </div>
            </div>
          )}

          {/* Next stop */}
          {isOnline && liveVan.nextStop && (
            <div className="flex items-center justify-between bg-zinc-800 rounded-xl px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-yellow-400 text-sm">→</span>
                <span className="text-zinc-400 text-xs">Next Stop</span>
              </div>
              <span className="text-white text-xs font-semibold">
                {liveVan.nextStop}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom panel */}
      <div className="absolute bottom-16 left-0 right-0 z-10 px-4">
        <div className="bg-zinc-900/90 backdrop-blur-sm border border-zinc-800 rounded-2xl overflow-hidden">
          {/* Boarding status */}
          {isBoardingStop && currentStopQueue && (
            <div className="px-4 py-3 border-b border-zinc-800 bg-yellow-400/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                  <p className="text-yellow-400 text-xs font-semibold uppercase tracking-wider">
                    Boarding at {currentStopQueue.name}
                  </p>
                </div>
                <span className="text-white text-xs font-bold">
                  {currentStopQueue.queueCount} waiting
                </span>
              </div>
            </div>
          )}

          {/* Toggle handle */}
          <button
            type="button"
            onClick={() => setIsBoardingOpen((prev) => !prev)}
            className="w-full flex items-center justify-between px-4 py-3 active:bg-zinc-800/60 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
              <p className="text-zinc-300 text-xs font-semibold uppercase tracking-wider">
                Queue Per Stop
              </p>
            </div>
            <span className="text-zinc-400 text-lg">
              {isBoardingOpen ? "▾" : "▸"}
            </span>
          </button>

          {/* Stop queue breakdown */}
          <div
            className={`transition-all duration-300 ease-in-out overflow-hidden ${isBoardingOpen ? "max-h-64 opacity-100" : "max-h-0 opacity-0"}`}
          >
            <div className="px-4 pb-4 space-y-2 overflow-y-auto max-h-56">
              {liveStops
                .filter((s) => s.active)
                .map((stop) => (
                  <div
                    key={stop.id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${stop.queueCount > 0 ? "bg-yellow-400" : "bg-zinc-600"}`}
                      />
                      <span className="text-white text-sm">{stop.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {stop.queueCount > 0 ? (
                        <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-lg px-2 py-0.5">
                          <span className="text-yellow-400 text-xs font-bold">
                            {stop.queueCount} waiting
                          </span>
                        </div>
                      ) : (
                        <span className="text-zinc-600 text-xs">Empty</span>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
