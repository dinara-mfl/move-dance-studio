import { createClient } from "@supabase/supabase-js";
import { schedule, plans } from "./data";
export const demo = import.meta.env.VITE_DEMO_MODE !== "false";
export const supabase =
  !demo &&
  import.meta.env.VITE_SUPABASE_URL &&
  import.meta.env.VITE_SUPABASE_ANON_KEY
    ? createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
      )
    : null;
const key = "move-demo-v1";
function read() {
  try {
    return (
      JSON.parse(localStorage.getItem(key)) || { bookings: [], purchases: [] }
    );
  } catch {
    return { bookings: [], purchases: [] };
  }
}
function save(state) {
  localStorage.setItem(key, JSON.stringify(state));
}
export async function api(path, options = {}) {
  if (!demo) {
    if (!supabase) throw Error("Authentication is not configured.");
    const { data } = await supabase.auth.getSession();
    const r = await fetch(`/api${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${data.session?.access_token || ""}`,
        ...options.headers,
      },
    });
    const body = await r.json();
    if (!r.ok)
      throw Error(body.error || "Something went wrong. Please try again.");
    return body;
  }
  const state = read(),
    payload = options.body ? JSON.parse(options.body) : {};
  if (path === "/classes")
    return schedule().map((c) => ({
      ...c,
      remaining:
        c.capacity - state.bookings.filter((b) => b.classId === c.id).length,
    }));
  if (path === "/me") return { ...state, email: "dancer@example.com" };
  if (path === "/demo/purchase") {
    const p = plans.find((p) => p.id === payload.planId);
    if (!p) throw Error("Choose a pass.");
    state.purchases.push({
      id: crypto.randomUUID(),
      planId: p.id,
      name: p.name,
      remaining: p.credits,
      expiresAt: new Date(Date.now() + p.days * 86400000).toISOString(),
    });
    save(state);
    return { ok: true };
  }
  if (path === "/bookings" && options.method === "POST") {
    const c = schedule().find((c) => c.id === payload.classId);
    if (!c || new Date(c.startsAt) <= new Date())
      throw Error("This class is no longer available.");
    if (state.bookings.some((b) => b.classId === c.id))
      throw Error("You already have a place in this class.");
    const pass = state.purchases.find(
      (p) => p.remaining > 0 && new Date(p.expiresAt) > new Date(c.startsAt),
    );
    if (!pass)
      throw Error("You need a valid class pass. Choose a membership first.");
    pass.remaining--;
    const booking = {
      classId: c.id,
      ...c,
      id: crypto.randomUUID(),
      purchaseId: pass.id,
      emailStatus: "demo",
    };
    state.bookings.push(booking);
    save(state);
    return booking;
  }
  if (path.startsWith("/bookings/") && options.method === "DELETE") {
    const id = path.split("/").pop(),
      b = state.bookings.find((b) => b.id === id);
    if (!b) throw Error("Booking not found.");
    if (new Date(b.startsAt) - Date.now() < 12 * 3600000)
      throw Error("Cancellations close 12 hours before class.");
    state.bookings = state.bookings.filter((b) => b.id !== id);
    const p = state.purchases.find((p) => p.id === b.purchaseId);
    if (p) p.remaining++;
    save(state);
    return { ok: true };
  }
  throw Error("This action is not available in the demo.");
}
