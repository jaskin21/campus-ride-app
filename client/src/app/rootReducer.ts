import { combineReducers } from '@reduxjs/toolkit'
import authReducer from '../features/auth/authSlice'
import queueReducer from '../features/queue/queueSlice'
import { queueApi } from '../features/queue/queueApi'
import { stopsApi } from '../features/stops/stopsApi'
import { driverApi } from '../features/driver/driverApi'

export const rootReducer = combineReducers({
  auth: authReducer,
  queue: queueReducer,
  [queueApi.reducerPath]: queueApi.reducer,
  [stopsApi.reducerPath]: stopsApi.reducer,
  [driverApi.reducerPath]: driverApi.reducer,
})