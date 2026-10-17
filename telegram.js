export async function notify(event, resourceId = null, authInstance) {
  try {
    const user = authInstance?.currentUser;
    if (!user) return false;
    const idToken = await user.getIdToken();
    const res = await fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ event, resourceId }),
    });
    if (!res.ok) { console.warn("[TG]", await res.text()); return false; }
    return true;
  } catch (e) { console.warn("[TG]", e.message); return false; }
}
