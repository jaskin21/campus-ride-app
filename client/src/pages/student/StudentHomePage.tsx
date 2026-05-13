import { useState } from "react";
import { MOCK_STOPS, MOCK_VAN, MOCK_QUEUE, type QueueEntry } from "../../lib/mockData";
import VanMap from "../../components/map/VanMap";
import QueueCard from "../../components/shared/QueueCard";
import JarvisButton from "../../components/shared/JarvisButton";
import JarvisPanel from "../../components/shared/JarvisPanel";
import BottomNav from "../../components/shared/BottomNav";

export default function StudentHomePage() {
  const [jarvisOpen, setJarvisOpen] = useState(false);
  const [queue, setQueue] = useState<QueueEntry | null>(null)

  return (
    <div className="relative w-full h-screen bg-zinc-950 overflow-hidden">
      {/* Full screen map */}
      <div className="absolute inset-0">
        <VanMap stops={MOCK_STOPS} van={MOCK_VAN} userStopId={queue?.stopId} />
      </div>

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 px-4 pt-4 flex items-center justify-between">
        <div className="bg-zinc-900/90 backdrop-blur-sm border border-zinc-800 rounded-2xl px-4 py-2">
          <p className="text-white text-sm font-semibold">CampusRide</p>
          <p className="text-zinc-500 text-xs">University of Mindanao</p>
        </div>

        {/* Van status pill */}
        <div className="bg-zinc-900/90 backdrop-blur-sm border border-zinc-800 rounded-2xl px-3 py-2 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-white text-xs font-medium">Van Online</span>
        </div>
      </div>

      {/* Bottom overlay */}
      <div className="absolute bottom-24 left-0 right-0 z-10 flex flex-col gap-3">
        {/* Queue card */}
        <QueueCard
          queue={queue}
          onLeave={() => setQueue(null)}
          onJoin={() => setQueue(MOCK_QUEUE)}
        />

        {/* Jarvis button */}
        <div className="flex justify-end px-4">
          <JarvisButton onOpen={() => setJarvisOpen(true)} />
        </div>
      </div>

      {/* Bottom nav */}
      <BottomNav />

      {/* Jarvis panel */}
      <JarvisPanel isOpen={jarvisOpen} onClose={() => setJarvisOpen(false)} />
    </div>
  );
}
