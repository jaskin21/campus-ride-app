import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { QueueState } from './queueTypes'

const initialState: QueueState = {
  stopId: null,
  destination: null,
  position: null,
  joinedAt: null,
  isInQueue: false,
  isBoarded: false,
  boardedAt: null,
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
    setBoarded(state) {
      state.isBoarded = true
      state.boardedAt = new Date().toISOString()
    },
    setOffboarded() {
      return initialState
    },
  },
})

export const { setQueue, clearQueue, updatePosition, setBoarded, setOffboarded } = queueSlice.actions
export default queueSlice.reducer