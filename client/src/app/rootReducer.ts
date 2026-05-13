import { combineReducers } from '@reduxjs/toolkit'
import authReducer from '../features/auth/authSlice'
import queueReducer from '../features/queue/queueSlice'
import { queueApi } from '../features/queue/queueApi'

export const rootReducer = combineReducers({
  auth: authReducer,
  queue: queueReducer,
  [queueApi.reducerPath]: queueApi.reducer,
})