import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { fetchAuthSession } from "aws-amplify/auth";

const getToken = async () => {
  const session = await fetchAuthSession();
  return session.tokens?.idToken?.toString() ?? "";
};

export const driverApi = createApi({
  reducerPath: "driverApi",
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_BASE_URL,
    prepareHeaders: async (headers) => {
      const token = await getToken();
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ["Driver"],
  endpoints: (builder) => ({
    toggleOnline: builder.mutation<{ message: string }, { isOnline: boolean }>({
      query: (body) => ({
        url: "/van/toggle",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Driver"],
    }),
  }),
});

export const { useToggleOnlineMutation } = driverApi;
