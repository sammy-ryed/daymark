import { createApp } from "./app.js";
const app = createApp({
  url: process.env.SUPABASE_URL ?? "",
  key: process.env.SUPABASE_PUBLISHABLE_KEY ?? "",
  webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:3000",
  production: process.env.NODE_ENV === "production",
});
app.listen(Number(process.env.PORT ?? 4000), "0.0.0.0", () =>
  console.info("API listening on port " + (process.env.PORT ?? 4000)),
);
