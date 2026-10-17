/* api/notify.js — GAME BAZAR Telegram notifier (Vercel Serverless) */
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:  (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    }),
  });
}
const db   = getFirestore();
const auth = getAuth();
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TG_CHAT  = process.env.TELEGRAM_CHAT_ID;

const esc = (s) => String(s ?? "").replace(/[&<>]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;" }[c]));

async function isAdmin(uid) {
  try {
    const s = await db.collection("admins").doc(uid).get();
    return s.exists && s.data().enabled === true;
  } catch { return false; }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!TG_TOKEN || !TG_CHAT) return res.status(500).json({ error: "Telegram not configured" });

  const idToken = (req.headers.authorization || "").replace("Bearer ", "");
  if (!idToken) return res.status(401).json({ error: "Unauthorized" });

  let decoded;
  try { decoded = await auth.verifyIdToken(idToken); }
  catch { return res.status(401).json({ error: "Invalid token" }); }

  const { event, resourceId } = req.body || {};
  const USER_EVENTS = ["new_user","user_login","new_order","voucher_order","deposit"];
  const ADMIN_EVENTS = ["test"];
  if (![...USER_EVENTS, ...ADMIN_EVENTS].includes(event))
    return res.status(400).json({ error: "Invalid event" });

  if (ADMIN_EVENTS.includes(event) && !(await isAdmin(decoded.uid)))
    return res.status(403).json({ error: "Admin only" });

  if (event !== "test") {
    try {
      const r = await db.collection("notif_log")
        .where("uid", "==", decoded.uid)
        .where("time", ">", new Date(Date.now() - 3000))
        .limit(1).get();
      if (!r.empty) return res.status(429).json({ error: "Too fast, wait 3s" });
    } catch {}
  }

  let text;
  try { text = await buildMessage(event, resourceId, decoded); }
  catch (e) { return res.status(400).json({ error: e.message }); }

  let tgOk = false, tgErr = null;
  try {
    const r = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: TG_CHAT, text, parse_mode: "HTML", disable_web_page_preview: true }),
    });
    const data = await r.json();
    tgOk = !!data.ok;
    if (!tgOk) tgErr = data.description;
  } catch (e) { tgErr = e.message; }

  try {
    await db.collection("notif_log").add({ uid: decoded.uid, event, ok: tgOk, time: new Date(), error: tgErr });
  } catch {}

  if (!tgOk) return res.status(500).json({ error: tgErr || "Telegram failed" });
  return res.status(200).json({ ok: true });
}

async function buildMessage(event, resourceId, decoded) {
  const bd = { timeZone: "Asia/Dhaka", dateStyle: "medium", timeStyle: "short" };
  const now = new Date().toLocaleString("en-BD", bd);
  const tag = "🎮 <b>GAME BAZAR</b>";

  if (event === "new_user")
    return `${tag}\n\n👤 <b>New User Registered</b>\n\n<b>Email:</b> ${esc(decoded.email)}\n<b>UID:</b> <code>${decoded.uid}</code>\n<b>Time:</b> ${now}`;

  if (event === "user_login")
    return `${tag}\n\n🔐 <b>User Login</b>\n\n<b>Email:</b> ${esc(decoded.email)}\n<b>Time:</b> ${now}`;

  if (event === "new_order" || event === "voucher_order") {
    const s = await db.collection("orders").doc(resourceId).get();
    if (!s.exists) throw new Error("Order not found");
    const o = s.data();
    if (o.userId !== decoded.uid) throw new Error("Forbidden");
    const icon = event === "voucher_order" ? "🎟️" : "🛒";
    return `${tag}\n\n${icon} <b>New ${event === "voucher_order" ? "Voucher " : ""}Order</b>\n\n<b>Customer:</b> ${esc(o.userName || "N/A")}\n<b>Game:</b> ${esc(o.gameName || "N/A")}\n<b>Package:</b> ${esc(o.productName || "N/A")}\n<b>Price:</b> ৳${o.price}\n<b>Player ID:</b> <code>${esc(o.playerId || "N/A")}</code>\n<b>Payment:</b> ${esc(o.paymentMethod || "wallet").toUpperCase()}\n${o.trxId ? `<b>TrxID:</b> <code>${esc(o.trxId)}</code>\n` : ""}<b>Order:</b> <code>${resourceId}</code>\n<b>Status:</b> ${esc(o.status)}\n<b>Time:</b> ${now}`;
  }

  if (event === "deposit") {
    const s = await db.collection("deposits").doc(resourceId).get();
    if (!s.exists) throw new Error("Deposit not found");
    const d = s.data();
    if (d.userId !== decoded.uid) throw new Error("Forbidden");
    return `${tag}\n\n💰 <b>New Deposit Request</b>\n\n<b>User:</b> ${esc(d.userEmail)}\n<b>Amount:</b> ৳${d.amount}\n<b>Method:</b> ${esc(d.method)}\n<b>TrxID:</b> <code>${esc(d.trxId)}</code>\n<b>Sender:</b> ${esc(d.sender || "N/A")}\n<b>Time:</b> ${now}`;
  }

  if (event === "test")
    return `${tag}\n\n✅ <b>Telegram Connected!</b>\n\nBot working perfectly.\n\n🕐 ${now}`;

  throw new Error("Unknown event");
}
