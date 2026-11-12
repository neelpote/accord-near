import type { Response } from "express";
import { config } from "./config.js";

export function sessionResponse(res: Response, token: string, accountId: string) {
  res.cookie("accord_session", token, {
    httpOnly: true, sameSite: "strict", secure: config.origin.startsWith("https:"),
    maxAge: 43200000, path: "/",
  });
  res.json({ accountId });
}
