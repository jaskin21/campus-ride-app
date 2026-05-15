import { useState } from "react";
import {
  useGetStopsQuery,
  useUpdateStopMutation,
} from "../../features/stops/stopsApi";
import BottomNav from "../../components/shared/BottomNav";
import { useStopQueues } from "../../hooks/useStopQueues";

export default function AdminStopsPage() {
  const { data, refetch } = useGetStopsQuery();
  const [updateStop] = useUpdateStopMutation();
  const liveStops = useStopQueues();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const stops = data?.stops ?? [];

  const handleToggle = async (stopId: string, active: boolean) => {
    await updateStop({ stopId, active });
    refetch();
  };

  const handleRename = async (stopId: string) => {
    if (!editName.trim()) return;
    await updateStop({ stopId, name: editName });
    setEditingId(null);
    setEditName("");
    refetch();
  };

  const getLiveCount = (stopId: string) => {
    return liveStops.find((s) => s.id === stopId)?.queueCount ?? 0;
  };

  return (
    <div className="min-h-screen bg-zinc-950 pb-20">
      {/* Header */}
      <div className="px-4 pt-10 pb-4">
        <p className="text-white font-semibold text-lg">Stops</p>
        <p className="text-zinc-500 text-sm">
          {stops.filter((s) => s.active).length} active ·{" "}
          {stops.filter((s) => !s.active).length} inactive
        </p>
      </div>

      <div className="mx-4 space-y-2">
        {stops.map((stop) => (
          <div
            key={stop.id}
            className={`bg-zinc-900 border rounded-2xl p-4 ${
              stop.active ? "border-zinc-800" : "border-zinc-800/50 opacity-60"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${stop.active ? "bg-yellow-400" : "bg-zinc-600"}`}
                />
                {editingId === stop.id ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="bg-zinc-800 text-white text-sm rounded-lg px-2 py-1 outline-none border border-yellow-400"
                    autoFocus
                  />
                ) : (
                  <span className="text-white text-sm font-medium">
                    {stop.name}
                  </span>
                )}
              </div>
              <div className="bg-zinc-800 rounded-lg px-2 py-0.5">
                <span className="text-yellow-400 text-xs font-bold">
                  {getLiveCount(stop.id)} waiting
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-3">
              {editingId === stop.id ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleRename(stop.id)}
                    className="flex-1 bg-yellow-400 text-zinc-950 text-xs font-bold rounded-xl py-2 transition-colors"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setEditName("");
                    }}
                    className="flex-1 bg-zinc-800 text-zinc-300 text-xs font-semibold rounded-xl py-2 transition-colors"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(stop.id);
                      setEditName(stop.name);
                    }}
                    className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-xl py-2 transition-colors"
                  >
                    ✏️ Rename
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggle(stop.id, !stop.active)}
                    className={`flex-1 text-xs font-semibold rounded-xl py-2 transition-colors ${
                      stop.active
                        ? "bg-red-500/20 text-red-400"
                        : "bg-green-500/20 text-green-400"
                    }`}
                  >
                    {stop.active ? "⛔ Deactivate" : "✅ Activate"}
                  </button>
                </>
              )}
            </div>

            <p className="text-zinc-600 text-xs mt-2">
              {stop.lat.toFixed(4)}, {stop.lng.toFixed(4)}
            </p>
          </div>
        ))}
      </div>

      <BottomNav />
    </div>
  );
}
