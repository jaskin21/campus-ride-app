import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { QueueState } from './queueTypes'

const initialState: QueueState = {
  stopId: null,
  destination: null,
  position: null,
  joinedAt: null,
  isInQueue: false,
}

const queueSlice = createSlice({
  name: 'queue',
  initialState,
  reducers: {
    setQueue(state, action: PayloadAction<QueueState>) {
      return { ...action.payload, isInQueue: true }
    },
    clearQueue() {
      return initialState
    },
    updatePosition(state, action: PayloadAction<number>) {
      state.position = action.payload
    },
  },
})

export const { setQueue, clearQueue, updatePosition } = queueSlice.actions
export default queueSlice.reducer