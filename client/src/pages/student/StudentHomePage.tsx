import { useState, useEffect } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import { MOCK_STOPS } from "../../lib/mockData";
import VanMap from "../../components/map/VanMap";
import QueueCard from "../../components/shared/QueueCard";
import JarvisButton from "../../components/shared/JarvisButton";
import JarvisPanel from "../../components/shared/JarvisPanel";
import BottomNav from "../../components/shared/BottomNav";
import JoinQueueModal from "../../components/shared/JoinQueueModal";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  useJoinQueueMutation,
  useLeaveQueueMutation,
  useConfirmBoardingMutation,
  useSkipBoardingMutation,
} from "../../features/queue/queueApi";
import {
  setQueue,
  clearQueue,
  setBoarded,
  setOffboarded,
} from "../../features/queue/queueSlice";
import { useStopQueues } from "../../hooks/useStopQueues";
import type { QueueEntry } from "../../features/queue/queueTypes";
import { useVanPosition } from "../../hooks/useVanPosition";
import BoardingAlert from "../../components/shared/BoardingAlert";
import { useBoardingAlert } from "../../hooks/useBoardingAlert";
import OffboardAlert from "../../components/shared/OffboardAlert";
import { useOffboardAlert } from "../../hooks/useOffboardAlert";

export default function StudentHomePage() {
  const [jarvisOpen, setJarvisOpen] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);

  const dispatch = useAppDispatch();
  const queueState = useAppSelector((state) => state.queue);
  const liveStops = useStopQueues();
  const liveVan = useVanPosition();

  const [joinQueue, { isLoading: isJoining }] = useJoinQueueMutation();
  const [leaveQueue] = useLeaveQueueMutation();
  const [confirmBoarding] = useConfirmBoardingMutation();
  const [skipBoarding] = useSkipBoardingMutation();

  const { showAlert, alertStopName, dismissAlert } = useBoardingAlert(
    queueState.stopId,
  );
  const { showOffboardAlert, offboardStopName, dismissOffboardAlert } =
    useOffboardAlert(queueState.isBoarded, queueState.destination);

  // ─── Restore queue on page load/refresh ───────────
  useEffect(() => {
    const restoreQueue = async () => {
      try {
        const token = await fetchAuthSession();
        const idToken = token.tokens?.idToken?.toString();
        if (!idToken) return;

        const res = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/queue/user/active`,
          { headers: { Authorization: `Bearer ${idToken}` } },
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data.isInQueue) {
          dispatch(
            setQueue({
              stopId: data.stopId,
              destination: data.destination,
              position: data.position,
              joinedAt: data.joinedAt,
              isInQueue: true,
              isBoarded: false, // ✅ added missing field
            }),
          );
        }
      } catch {
        // no active queue found
      }
    };
    restoreQueue();
  }, [dispatch]);

  const handleJoin = async (stopId: string, destination: string) => {
    try {
      const result = await joinQueue({ stopId, destination }).unwrap();
      dispatch(
        setQueue({
          stopId: result.stopId ?? stopId,
          destination: result.destination ?? destination,
          position: result.position ?? 1,
          joinedAt: result.joinedAt ?? new Date().toISOString(),
          isInQueue: true,
          isBoarded: false, // ✅ added missing field
        }),
      );
    } catch (err) {
      console.error("Failed to join queue:", err);
    }
  };

  const handleLeave = async () => {
    try {
      await leaveQueue().unwrap();
      dispatch(clearQueue());
    } catch (err) {
      console.error("Failed to leave queue:", err);
    }
  };

  // ✅ Single merged handleBoard — sets boarded state (does NOT clearQueue)
  const handleBoard = async () => {
    dismissAlert();
    try {
      await confirmBoarding().unwrap();
      dispatch(setBoarded());
    } catch (err) {
      console.error("Failed to confirm boarding:", err);
    }
  };

  // ✅ Single merged handleSkip
  const handleSkip = async () => {
    dismissAlert();
    try {
      await skipBoarding().unwrap();
    } catch (err) {
      console.error("Failed to skip boarding:", err);
    }
  };

  const handleAlighted = async () => {
    dismissOffboardAlert();
    dispatch(setOffboarded());
  };

  const handleStayOn = () => {
    dismissOffboardAlert();
  };

  const queueEntry: QueueEntry | null =
    queueState.isInQueue || queueState.isBoarded
      ? {
          position: queueState.position ?? 1,
          userId: "",
          stopId: queueState.stopId ?? "",
          stopName: queueState.isBoarded
            ? "🚐 Riding"
            : (MOCK_STOPS.find((s) => s.id === queueState.stopId)?.name ?? ""),
          destination:
            liveStops.find((s) => s.id === queueState.destination)?.name ?? "",
          eta: 5,
          joinedAt: queueState.joinedAt ?? "",
        }
      : null;

  return (
    <div className="relative w-full h-screen bg-zinc-950 overflow-hidden">
      <div className="absolute inset-0">
        <VanMap
          stops={liveStops}
          van={liveVan}
          userStopId={queueState.stopId ?? undefined}
        />
      </div>

      <div className="absolute top-0 left-0 right-0 z-10 px-4 pt-4 flex items-center justify-between">
        <div className="bg-zinc-900/90 backdrop-blur-sm border border-zinc-800 rounded-2xl px-4 py-2">
          <p className="text-white text-sm font-semibold">CampusRide</p>
          <p className="text-zinc-500 text-xs">University of Mindanao</p>
        </div>
        <div className="bg-zinc-900/90 backdrop-blur-sm border border-zinc-800 rounded-2xl px-3 py-2 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-white text-xs font-medium">Van Online</span>
        </div>
      </div>

      <div className="absolute bottom-24 left-0 right-0 z-10 flex flex-col gap-3">
        <QueueCard
          queue={queueEntry}
          onLeave={handleLeave}
          onJoin={() => setJoinModalOpen(true)}
        />
        <div className="flex justify-end px-4">
          <JarvisButton onOpen={() => setJarvisOpen(true)} />
        </div>
      </div>

      <BottomNav />
      <JarvisPanel isOpen={jarvisOpen} onClose={() => setJarvisOpen(false)} />
      <JoinQueueModal
        isOpen={joinModalOpen}
        onClose={() => setJoinModalOpen(false)}
        onJoin={handleJoin}
        isLoading={isJoining}
      />
      <BoardingAlert
        isOpen={showAlert}
        stopName={alertStopName}
        onBoard={handleBoard}
        onSkip={handleSkip}
      />
      <OffboardAlert
        isOpen={showOffboardAlert}
        stopName={offboardStopName}
        onAlighted={handleAlighted}
        onStayOn={handleStayOn}
      />
    </div>
  );
}