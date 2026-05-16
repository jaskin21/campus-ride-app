export interface Stop {
  id: string;
  name: string;
  shortName: string;
  lat: number;
  lng: number;
  queueCount: number;
  active: boolean;
}

export interface Van {
  id: string
  driverName: string
  lat: number
  lng: number
  capacity: number
  currentPassengers: number
  isOnline: boolean
  nextStop: string
  speed: number
  passengers?: {
    userId: string
    destination: string
    boardedAt: string
  }[]
}

export interface QueueEntry {
  position: number;
  stopId: string;
  stopName: string;
  destination: string;
  eta: number; // minutes
}

export interface Stop {
  id: string;
  name: string;
  shortName: string;
  lat: number;
  lng: number;
  queueCount: number;
  active: boolean;
}

export interface Van {
  id: string;
  driverName: string;
  lat: number;
  lng: number;
  capacity: number;
  currentPassengers: number;
  isOnline: boolean;
  nextStop: string;
  speed: number;
}

// Empty fallback — real stops come from DB via useStopQueues hook
export const MOCK_STOPS: Stop[] = [];

// Default van state — real position comes from DB via useVanPosition hook
export const MOCK_VAN: Van = {
  id: "van-1",
  driverName: "Demo Driver",
  lat: 7.0609,
  lng: 125.5989,
  capacity: 10,
  currentPassengers: 0,
  isOnline: false,
  nextStop: "",
  speed: 20,
};

export const MOCK_QUEUE: QueueEntry | null = null;
