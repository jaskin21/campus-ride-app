import { useEffect, useState } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import { useAppSelector, useAppDispatch } from "../../app/hooks";
import { useLeaveQueueMutation } from "../../features/queue/queueApi";
import { clearQueue } from "../../features/queue/queueSlice";
import { useStopQueues } from "../../hooks/useStopQueues";
import BottomNav from "../../components/shared/BottomNav";

interface QueueEntry {
  position: number;
  userId: string;
  email?: string;
  destination: string;
  joinedAt: string;
}

export default function StudentQueuePage() {
  const queueState = useAppSelector((state) => state.queue);
  const liveStops = useStopQueues();
  const dispatch = useAppDispatch();
  const [leaveQueue] = useLeaveQueueMutation();
  const [stopQueues, setStopQueues] = useState<Record<string, QueueEntry[]>>(
    {},
  );
  const [isLoadingQueues, setIsLoadingQueues] = useState(false);

  useEffect(() => {
    const fetchAllQueues = async () => {
      setIsLoadingQueues(true);
      try {
        const session = await fetchAuthSession();
        const token = session.tokens?.idToken?.toString() ?? "";
        const results = await Promise.all(
          liveStops.map(async (stop) => {
            const res = await fetch(
              `${import.meta.env.VITE_API_BASE_URL}/queue/${stop.id}`,
              { headers: { Authorization: `Bearer ${token}` } },
            );
            if (!res.ok) return { id: stop.id, queue: [] };
            const data = await res.json();
            return { id: stop.id, queue: data.queue ?? [] };
          }),
        );
        const map: Record<string, QueueEntry[]> = {};
        results.forEach(({ id, queue }) => {
          map[id] = queue;
        });
        setStopQueues(map);
      } catch {
        // silent fail
      } finally {
        setIsLoadingQueues(false);
      }
    };

    if (liveStops.length > 0) fetchAllQueues();
    const interval = setInterval(() => {
      if (liveStops.length > 0) fetchAllQueues();
    }, 5000);
    return () => clearInterval(interval);
  }, [liveStops]);

  const handleLeave = async () => {
    try {
      await leaveQueue().unwrap();
      dispatch(clearQueue());
    } catch {
      // silent fail
    }
  };

  const userStop = liveStops.find((s) => s.id === queueState.stopId);
  const destinationStop = liveStops.find(
    (s) => s.id === queueState.destination,
  );

  return (
    <div className="min-h-screen bg-zinc-950 pb-20">
      {/* Header */}
      <div className="px-4 pt-10 pb-4">
        <p className="text-white font-semibold text-lg">My Queue</p>
        <p className="text-zinc-500 text-sm">Live queue status</p>
      </div>

      {/* My queue card */}
      {queueState.isInQueue ? (
        <div className="mx-4 mb-4 bg-zinc-900 border border-yellow-400/30 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="bg-yellow-400 text-zinc-950 text-xs font-black px-2.5 py-1 rounded-lg">
                #{queueState.position ?? 1}
              </div>
              <span className="text-zinc-400 text-xs">in line</span>
            </div>
            <button
              type="button"
              onClick={handleLeave}
              className="text-red-400 hover:text-red-300 text-xs transition-colors"
            >
              Leave queue
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm font-semibold">
                {userStop?.name ?? queueState.stopId}
              </p>
              <p className="text-zinc-500 text-xs mt-0.5">
                → {destinationStop?.name ?? queueState.destination}
              </p>
            </div>
            <div className="text-right">
              <p className="text-yellow-400 text-sm font-bold">~5 min</p>
              <p className="text-zinc-500 text-xs">ETA</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mx-4 mb-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
          <p className="text-zinc-500 text-sm">You are not in any queue</p>
          <p className="text-zinc-600 text-xs mt-1">
            Go to Map tab to join a queue
          </p>
        </div>
      )}

      {/* All stop queues */}
      <div className="px-4 mb-2">
        <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">
          All Stop Queues
        </p>
      </div>

      {isLoadingQueues && liveStops.length === 0 && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400" />
        </div>
      )}

      <div className="mx-4 space-y-2">
        {liveStops
          .filter((s) => s.active)
          .map((stop) => {
            const queue = stopQueues[stop.id] ?? [];
            const isMyStop = stop.id === queueState.stopId;
            return (
              <div
                key={stop.id}
                className={`bg-zinc-900 border rounded-2xl overflow-hidden ${
                  isMyStop ? "border-yellow-400/40" : "border-zinc-800"
                }`}
              >
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${stop.queueCount > 0 ? "bg-yellow-400" : "bg-zinc-600"}`}
                    />
                    <span className="text-white text-sm font-medium">
                      {stop.name}
                    </span>
                    {isMyStop && (
                      <span className="text-yellow-400 text-xs bg-yellow-400/10 px-2 py-0.5 rounded-lg">
                        You're here
                      </span>
                    )}
                  </div>
                  <span className="text-yellow-400 text-xs font-bold">
                    {stop.queueCount} waiting
                  </span>
                </div>

                {queue.length > 0 && (
                  <div className="px-4 pb-3 space-y-1">
                    {queue.slice(0, 3).map((entry, idx) => (
                      <div
                        key={entry.userId}
                        className="flex items-center gap-2"
                      >
                        <span className="text-zinc-600 text-xs w-4">
                          #{idx + 1}
                        </span>
                        <span className="text-zinc-500 text-xs">
                          {entry.email ?? entry.userId.slice(0, 8)}...
                        </span>
                        <span className="text-zinc-600 text-xs ml-auto">
                          →{" "}
                          {liveStops.find((s) => s.id === entry.destination)
                            ?.name ?? entry.destination}
                        </span>
                      </div>
                    ))}
                    {queue.length > 3 && (
                      <p className="text-zinc-600 text-xs">
                        +{queue.length - 3} more
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
      </div>

      <BottomNav />
    </div>
  );
}
