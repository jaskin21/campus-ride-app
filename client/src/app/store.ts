import { configureStore } from '@reduxjs/toolkit'
import { rootReducer } from './rootReducer'
import { queueApi } from '../features/queue/queueApi'
import { stopsApi } from '../features/stops/stopsApi'
import { driverApi } from '../features/driver/driverApi'

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      queueApi.middleware,
      stopsApi.middleware,
      driverApi.middleware,
    ),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch