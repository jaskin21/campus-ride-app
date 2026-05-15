import { useEffect, useState } from "react";
import { fetchAuthSession } from "aws-amplify/auth";

interface VanPosition {
  isOnline: boolean;
  currentStopId?: string;
  currentStopName?: string;
  status?: string;
}

export function useOffboardAlert(
  isBoarded: boolean,
  destinationStopId: string | null,
) {
  const [showOffboardAlert, setShowOffboardAlert] = useState(false);
  const [offboardStopName, setOffboardStopName] = useState("");

  useEffect(() => {
    if (!isBoarded || !destinationStopId) return;

    let active = true;

    const checkVan = async () => {
      try {
        const session = await fetchAuthSession();
        const token = session.tokens?.idToken?.toString() ?? "";
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/van/position`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!res.ok) return;
        const van: VanPosition = await res.json();

        if (
          active &&
          van.isOnline &&
          van.status === "boarding" &&
          van.currentStopId === destinationStopId &&
          !showOffboardAlert
        ) {
          setOffboardStopName(van.currentStopName ?? destinationStopId);
          setShowOffboardAlert(true);
        }
      } catch {
        // silent fail
      }
    };

    checkVan();
    const interval = setInterval(checkVan, 3000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [isBoarded, destinationStopId, showOffboardAlert]);

  const dismissOffboardAlert = () => setShowOffboardAlert(false);

  return { showOffboardAlert, offboardStopName, dismissOffboardAlert };
}
