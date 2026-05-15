import { useEffect, useState } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import { useVanPosition } from "../../hooks/useVanPosition";
import { useStopQueues } from "../../hooks/useStopQueues";
import BottomNav from "../../components/shared/BottomNav";

interface QueueEntry {
  position: number;
  userId: string;
  email?: string;
  destination: string;
  joinedAt: string;
}

interface VanWithStop {
  currentStopId?: string;
  currentStopName?: string;
  status?: string;
}

export default function DriverBoardingPage() {
  const liveVan = useVanPosition();
  const liveStops = useStopQueues();
  const [currentQueue, setCurrentQueue] = useState<QueueEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const vanWithStop = liveVan as unknown as VanWithStop;
  const currentStopId = vanWithStop.currentStopId;
  const currentStopName = vanWithStop.currentStopName;
  const isBoardingStatus = vanWithStop.status === "boarding";

  useEffect(() => {
    if (!currentStopId) return;

    const fetchQueue = async () => {
      setIsLoading(true);
      try {
        const session = await fetchAuthSession();
        const token = session.tokens?.idToken?.toString() ?? "";
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/queue/${currentStopId}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!res.ok) return;
        const data = await res.json();
        setCurrentQueue(data.queue ?? []);
      } catch {
        // silent fail
      } finally {
        setIsLoading(false);
      }
    };

    fetchQueue();
    const interval = setInterval(fetchQueue, 3000);
    return () => clearInterval(interval);
  }, [currentStopId]);

  const occupancyPct = Math.round(
    (liveVan.currentPassengers / liveVan.capacity) * 100,
  );

  return (
    <div className="min-h-screen bg-zinc-950 pb-20">
      {/* Header */}
      <div className="px-4 pt-10 pb-4">
        <p className="text-white font-semibold text-lg">Boarding Status</p>
        <p className="text-zinc-500 text-sm">
          {liveVan.isOnline ? "Van is online" : "Van is offline"}
        </p>
      </div>

      {/* Van status card */}
      <div className="mx-4 mb-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${liveVan.isOnline ? "bg-green-400 animate-pulse" : "bg-zinc-600"}`}
            />
            <span className="text-white text-sm font-semibold">
              {liveVan.isOnline ? "Online" : "Offline"}
            </span>
          </div>
          <span
            className={`text-xs px-2 py-1 rounded-lg font-semibold ${
              isBoardingStatus
                ? "bg-yellow-400/20 text-yellow-400"
                : "bg-zinc-800 text-zinc-500"
            }`}
          >
            {isBoardingStatus ? "🚏 Boarding" : "🚐 Moving"}
          </span>
        </div>

        {/* Capacity */}
        <div className="mb-2">
          <div className="flex justify-between mb-1">
            <span className="text-zinc-500 text-xs">Passengers</span>
            <span className="text-white text-xs font-semibold">
              {liveVan.currentPassengers}/{liveVan.capacity}
            </span>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                occupancyPct >= 90
                  ? "bg-red-400"
                  : occupancyPct >= 70
                    ? "bg-yellow-400"
                    : "bg-green-400"
              }`}
              style={{ width: `${occupancyPct}%` }}
            />
          </div>
        </div>

        {/* Next stop */}
        {liveVan.nextStop && (
          <div className="flex justify-between mt-3 pt-3 border-t border-zinc-800">
            <span className="text-zinc-500 text-xs">Next Stop</span>
            <span className="text-yellow-400 text-xs font-semibold">
              {liveVan.nextStop}
            </span>
          </div>
        )}
      </div>

      {/* Current stop boarding */}
      {isBoardingStatus && currentStopId && (
        <div className="mx-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">
              Boarding at {currentStopName}
            </p>
            <span className="text-yellow-400 text-xs font-bold">
              {currentQueue.length} waiting
            </span>
          </div>

          {isLoading && currentQueue.length === 0 && (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-400" />
            </div>
          )}

          <div className="space-y-2">
            {currentQueue.map((entry, idx) => (
              <div
                key={entry.userId}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center">
                    <span className="text-yellow-400 text-xs font-bold">
                      #{idx + 1}
                    </span>
                  </div>
                  <div>
                    <p className="text-white text-sm">
                      {entry.email ?? `Student ${idx + 1}`}
                    </p>
                    <p className="text-zinc-500 text-xs">
                      →{" "}
                      {liveStops.find((s) => s.id === entry.destination)
                        ?.name ?? entry.destination}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {currentQueue.length === 0 && !isLoading && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
                <p className="text-zinc-500 text-sm">
                  No students in queue at this stop
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* All stops queue summary */}
      <div className="px-4 mb-2">
        <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">
          All Stops
        </p>
      </div>

      <div className="mx-4 space-y-2">
        {liveStops
          .filter((s) => s.active)
          .map((stop) => (
            <div
              key={stop.id}
              className={`bg-zinc-900 border rounded-2xl px-4 py-3 flex items-center justify-between ${
                stop.id === currentStopId
                  ? "border-yellow-400/40"
                  : "border-zinc-800"
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${stop.queueCount > 0 ? "bg-yellow-400" : "bg-zinc-600"}`}
                />
                <span className="text-white text-sm">{stop.name}</span>
                {stop.id === currentStopId && (
                  <span className="text-yellow-400 text-xs bg-yellow-400/10 px-2 py-0.5 rounded-lg">
                    Current
                  </span>
                )}
              </div>
              <span
                className={`text-xs font-bold ${stop.queueCount > 0 ? "text-yellow-400" : "text-zinc-600"}`}
              >
                {stop.queueCount} waiting
              </span>
            </div>
          ))}
      </div>

      <BottomNav />
    </div>
  );
}
