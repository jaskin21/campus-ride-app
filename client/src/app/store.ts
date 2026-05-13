import { configureStore } from '@reduxjs/toolkit'
import { rootReducer } from './rootReducer'
import { queueApi } from '../features/queue/queueApi'

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(queueApi.middleware),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch