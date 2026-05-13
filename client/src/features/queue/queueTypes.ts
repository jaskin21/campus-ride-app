export interface QueueEntry {
  position: number
  userId: string
  destination: string
  joinedAt: string
}

export interface QueueState {
  stopId: string | null
  destination: string | null
  position: number | null
  joinedAt: string | null
  isInQueue: boolean
}

export interface StopQueue {
  stopId: string
  queue: QueueEntry[]
  count: number
}