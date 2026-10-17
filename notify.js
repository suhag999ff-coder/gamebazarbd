import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    }),
  });
}
const db = getFirestore();
const auth = getAuth();
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TG_CHAT = process.env.TELEGRAM_CHAT_ID;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const idToken = (req.headers.authorization || "").replace("Bearer ", "");
  let decoded;
  try { decoded = await auth.verifyIdToken(idToken); } catch { return res.status(401).json({ error: "Invalid token" }); }
  
  const { event, resourceId } = req.body || {};
  let text = `🔔 GAME BAZAR: New ${event}`;
  
  // (এখানে আপনার আসল মেসেজ বিল্ডিং লজিক বসবে)
  
  await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: TG_CHAT, text, parse_mode: "HTML" }),
  });
  return res.status(200).json({ ok: true });
}
