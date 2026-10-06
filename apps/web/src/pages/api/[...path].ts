import type { NextApiRequest, NextApiResponse } from "next";
import { createApp } from "@project/api/app";

const app = createApp({
  url: process.env.SUPABASE_URL ?? "",
  key: process.env.SUPABASE_PUBLISHABLE_KEY ?? "",
  webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:3000",
  production: process.env.NODE_ENV === "production",
  vercelProxy: Boolean(process.env.VERCEL),
});
export const config = { api: { bodyParser: false, externalResolver: true } };
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return app(req, res);
}
