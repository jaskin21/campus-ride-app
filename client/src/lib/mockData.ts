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

export interface QueueEntry {
  position: number;
  stopId: string;
  stopName: string;
  destination: string;
  eta: number; // minutes
}

export const MOCK_STOPS: Stop[] = [
  {
    id: "MG",
    name: "Main Gate",
    shortName: "MG",
    lat: 7.0609,
    lng: 125.5989,
    queueCount: 0,
    active: true,
  },
  {
    id: "MA",
    name: "MAA Gate",
    shortName: "MA",
    lat: 7.0625,
    lng: 125.5975,
    queueCount: 0,
    active: true,
  },
  {
    id: "BE",
    name: "BE Building",
    shortName: "BE",
    lat: 7.064,
    lng: 125.596,
    queueCount: 0,
    active: true,
  },
  {
    id: "FEA",
    name: "FEA Building",
    shortName: "FEA",
    lat: 7.0652,
    lng: 125.5948,
    queueCount: 0,
    active: true,
  },
  {
    id: "DPT",
    name: "DPT",
    shortName: "DPT",
    lat: 7.0638,
    lng: 125.5935,
    queueCount: 0,
    active: true,
  },
  {
    id: "GET",
    name: "GET Building",
    shortName: "GET",
    lat: 7.062,
    lng: 125.5922,
    queueCount: 0,
    active: true,
  },
  {
    id: "PF",
    name: "PF",
    shortName: "PF",
    lat: 7.0605,
    lng: 125.594,
    queueCount: 0,
    active: true,
  },
];

export const MOCK_VAN: Van = {
  id: "van-1",
  driverName: "Mang Jose",
  lat: 7.0615,
  lng: 125.5965,
  capacity: 10,
  currentPassengers: 6,
  isOnline: true,
  nextStop: "BE Building",
  speed: 20,
};

export const MOCK_QUEUE: QueueEntry | null = null;
