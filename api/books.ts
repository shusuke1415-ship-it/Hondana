import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleBooksRequest } from "../server/rakutenProxy.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }
  const result = await handleBooksRequest(req.query);
  res.setHeader("Cache-Control", "public, max-age=60");
  res.status(result.status).json(result.body);
}
