export interface DriverStatus {
  isOnline: boolean
  vanId: string
  currentStopId?: string
  currentStopName?: string
  nextStop?: string
  currentPassengers: number
  capacity: number
  status?: string
}