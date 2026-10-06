import { createApi } from "@project/api-client";
export const api = createApi({
  baseUrl: "/api",
  onUnauthorized: () => {
    if (typeof window !== "undefined")
      window.dispatchEvent(new Event("session-expired"));
  },
});
