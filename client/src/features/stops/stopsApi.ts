import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { fetchAuthSession } from 'aws-amplify/auth'

export interface Stop {
  id: string
  name: string
  shortName: string
  lat: number
  lng: number
  active: boolean
  updatedAt?: string
}

const getToken = async () => {
  const session = await fetchAuthSession()
  return session.tokens?.idToken?.toString() ?? ''
}

export const stopsApi = createApi({
  reducerPath: 'stopsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_BASE_URL,
    prepareHeaders: async (headers) => {
      const token = await getToken()
      if (token) headers.set('Authorization', `Bearer ${token}`)
      return headers
    },
  }),
  tagTypes: ['Stops'],
  endpoints: (builder) => ({
    getStops: builder.query<{ stops: Stop[] }, void>({
      query: () => '/stops',
      providesTags: ['Stops'],
    }),
    updateStop: builder.mutation<{ message: string }, { stopId: string; lat?: number; lng?: number; name?: string; active?: boolean }>({
      query: ({ stopId, ...body }) => ({
        url: `/stops/${stopId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Stops'],
    }),
  }),
})

export const { useGetStopsQuery, useUpdateStopMutation } = stopsApi