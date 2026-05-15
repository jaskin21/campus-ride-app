export interface QueueEntry {
  position: number;
  userId: string;
  stopId?: string;
  stopName?: string;
  destination: string;
  eta?: number;
  joinedAt: string;
}

export interface QueueState {
  stopId: string | null;
  destination: string | null;
  position: number | null;
  joinedAt: string | null;
  isInQueue: boolean;
  isBoarded: boolean;
  boardedAt: string | null;
}

export interface StopQueue {
  stopId: string;
  queue: QueueEntry[];
  count: number;
}
