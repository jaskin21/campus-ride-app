import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { fetchAuthSession } from "aws-amplify/auth";
import type { StopQueue, QueueState } from "./queueTypes";

const getToken = async () => {
  const session = await fetchAuthSession();
  return session.tokens?.idToken?.toString() ?? "";
};

export const queueApi = createApi( {
  reducerPath: "queueApi",
  baseQuery: fetchBaseQuery( {
    baseUrl: import.meta.env.VITE_API_BASE_URL,
    prepareHeaders: async ( headers ) => {
      const token = await getToken();
      if ( token ) headers.set( "Authorization", `Bearer ${token}` );
      return headers;
    },
  } ),
  tagTypes: ["Queue"],
  endpoints: ( builder ) => ( {
    // GET /queue/{stopId} for all stops
    getStopQueue: builder.query<StopQueue, string>( {
      query: ( stopId ) => `/queue/${stopId}`,
      providesTags: ["Queue"],
    } ),

    // GET /queue/{stopId}
    getQueue: builder.query<StopQueue, string>( {
      query: ( stopId ) => `/queue/${stopId}`,
      providesTags: ["Queue"],
    } ),

    // POST /queue/join
    joinQueue: builder.mutation<
      QueueState,
      { stopId: string; destination: string }
    >( {
      query: ( body ) => ( {
        url: "/queue/join",
        method: "POST",
        body,
      } ),
      invalidatesTags: ["Queue"],
    } ),

    // POST /queue/leave
    leaveQueue: builder.mutation<{ message: string; stopId: string }, void>( {
      query: () => ( {
        url: "/queue/leave",
        method: "POST",
      } ),
      invalidatesTags: ["Queue"],
    } ),

    confirmBoarding: builder.mutation<{ message: string }, void>( {
      query: () => ( {
        url: "/queue/board",
        method: "POST",
      } ),
      invalidatesTags: ["Queue"],
    } ),

    skipBoarding: builder.mutation<{ message: string }, void>( {
      query: () => ( {
        url: "/queue/skip",
        method: "POST",
      } ),
      invalidatesTags: ["Queue"],
    } ),

    updateDestination: builder.mutation<{ message: string }, { destination: string }>( {
      query: ( body ) => ( {
        url: '/queue/destination',
        method: 'PUT',
        body,
      } ),
      invalidatesTags: ['Queue'],
    } ),

    offboardPassenger: builder.mutation<{ message: string }, void>( {
      query: () => ( {
        url: '/queue/offboard',
        method: 'POST',
      } ),
      invalidatesTags: ['Queue'],
    } ),
  } ),
} );

export const {
  useGetQueueQuery,
  useGetStopQueueQuery,
  useJoinQueueMutation,
  useLeaveQueueMutation,
  useConfirmBoardingMutation,
  useSkipBoardingMutation,
  useUpdateDestinationMutation,
  useOffboardPassengerMutation,
} = queueApi
