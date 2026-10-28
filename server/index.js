import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createStore, StudioError } from "./store.js";
import { plans } from "../src/data.js";
const root = fileURLToPath(new URL("../", import.meta.url));
const connected = process.env.VITE_DEMO_MODE === "false";
const origin = process.env.APP_URL || "http://localhost:5173";
if (connected) {
  for (const name of ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY", "APP_URL"])
    if (!process.env[name]) throw Error(`Missing ${name}`);
}
const auth = connected
  ? createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY,
      { auth: { persistSession: false } },
    )
  : null;
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;
mkdirSync(resolve(root, ".data"), { recursive: true });
const store = createStore(resolve(root, ".data/move.sqlite"));
store.seed();
const app = express();
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:"],
        connectSrc: [
          "'self'",
          ...(process.env.VITE_SUPABASE_URL
            ? [process.env.VITE_SUPABASE_URL]
            : []),
        ],
        upgradeInsecureRequests:
          process.env.NODE_ENV === "production" ? [] : null,
      },
    },
  }),
);
app.post(
  "/api/webhooks/stripe",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET)
      return res.status(503).json({ error: "Stripe is not configured." });
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        req.headers["stripe-signature"],
        process.env.STRIPE_WEBHOOK_SECRET,
      );
    } catch {
      return res.status(400).json({ error: "Invalid signature." });
    }
    try {
      if (
        [
          "checkout.session.completed",
          "checkout.session.async_payment_succeeded",
        ].includes(event.type)
      ) {
        const s = event.data.object,
          p = plans.find((p) => p.id === s.metadata?.planId);
        if (s.payment_status === "paid") {
          if (
            !p ||
            s.amount_total !== p.price * 100 ||
            s.currency !== "eur" ||
            !s.metadata.userId
          )
            throw Error("Payment validation failed");
          store.fulfill("stripe:" + s.id, s.metadata.userId, p.id);
        }
      }
      res.json({ received: true });
    } catch {
      res
        .status(500)
        .json({ error: "Payment processing failed. Retry required." });
    }
  },
);
app.use(express.json({ limit: "16kb" }));
app.use(
  "/api",
  rateLimit({
    windowMs: 60000,
    limit: 120,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  }),
);
app.get("/api/health", (_, res) =>
  res.json({ ok: true, mode: connected ? "connected" : "demo" }),
);
app.get("/api/classes", (_, res) => res.json(store.list()));
app.use("/api", async (req, res, next) => {
  if (!auth)
    return res
      .status(503)
      .json({ error: "Server integrations are disabled in demo mode." });
  const bearer = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  if (!bearer) return res.status(401).json({ error: "Please sign in." });
  try {
    const { data, error } = await auth.auth.getUser(bearer);
    if (error || !data.user?.email || !data.user.email_confirmed_at)
      return res
        .status(401)
        .json({ error: "A verified email account is required." });
    req.user = data.user;
    next();
  } catch {
    res
      .status(503)
      .json({ error: "Sign-in service is temporarily unavailable." });
  }
});
app.get("/api/me", (req, res) =>
  res.json({ ...store.me(req.user.id), email: req.user.email }),
);
app.post("/api/bookings", (req, res) => {
  if (typeof req.body.classId !== "string")
    throw new StudioError("Choose a class.");
  res.status(201).json(store.book(req.user, req.body.classId));
});
app.delete("/api/bookings/:id", (req, res) =>
  res.json(store.cancel(req.user, req.params.id)),
);
function getPlan(req) {
  const p = plans.find((p) => p.id === req.body.planId);
  if (!p) throw new StudioError("Choose a valid pass.");
  return p;
}
app.post("/api/checkout", async (req, res) => {
  if (!stripe) throw new StudioError("Card checkout is not configured.", 503);
  const p = getPlan(req);
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: req.user.email,
    line_items: [
      {
        price_data: {
          currency: "eur",
          unit_amount: p.price * 100,
          product_data: {
            name: `MOVE — ${p.name}`,
            description: `${p.credits} classes · Valid ${p.days} days`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: { userId: req.user.id, planId: p.id },
    success_url: origin + "/?payment=success",
    cancel_url: origin + "/?payment=cancel",
  });
  res.json({ url: session.url });
});
const paypalBase =
  process.env.PAYPAL_ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
async function paypalToken() {
  if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET)
    throw new StudioError("PayPal is not configured.", 503);
  const r = await fetch(paypalBase + "/v1/oauth2/token", {
    method: "POST",
    headers: {
      Authorization:
        "Basic " +
        Buffer.from(
          process.env.PAYPAL_CLIENT_ID + ":" + process.env.PAYPAL_CLIENT_SECRET,
        ).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) throw new StudioError("PayPal is temporarily unavailable.", 502);
  return (await r.json()).access_token;
}
async function paypal(path, method, body, id) {
  const token = await paypalToken();
  const r = await fetch(paypalBase + path, {
    method,
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(id ? { "PayPal-Request-Id": id } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  const data = await r.json();
  if (!r.ok)
    throw new StudioError(
      "PayPal could not complete the request. Please try again.",
      502,
    );
  return data;
}
app.post("/api/paypal/orders", async (req, res) => {
  const p = getPlan(req);
  const data = await paypal(
    "/v2/checkout/orders",
    "POST",
    {
      intent: "CAPTURE",
      purchase_units: [
        {
          custom_id: req.user.id,
          amount: { currency_code: "EUR", value: p.price.toFixed(2) },
          description: `MOVE — ${p.name}`,
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            return_url: origin + "/?payment=paypal",
            cancel_url: origin + "/?payment=cancel",
            user_action: "PAY_NOW",
            shipping_preference: "NO_SHIPPING",
          },
        },
      },
    },
    crypto.randomUUID(),
  );
  const url = data.links?.find(
    (l) => l.rel === "payer-action" || l.rel === "approve",
  )?.href;
  if (!url)
    throw new StudioError("PayPal did not return a checkout link.", 502);
  store.db
    .prepare("INSERT INTO orders VALUES(?,?,?,?)")
    .run(data.id, req.user.id, p.id, "paypal");
  res.json({ url });
});
app.post("/api/paypal/capture", async (req, res) => {
  const id = req.body.orderId;
  if (typeof id !== "string" || !/^[A-Z0-9]+$/.test(id))
    throw new StudioError("Invalid PayPal order.");
  const order = store.db
    .prepare("SELECT * FROM orders WHERE id=? AND user_id=? AND provider=?")
    .get(id, req.user.id, "paypal");
  if (!order) throw new StudioError("Order not found.", 404);
  const p = plans.find((p) => p.id === order.plan_id);
  let data = await paypal("/v2/checkout/orders/" + id, "GET");
  if (data.status !== "COMPLETED")
    data = await paypal(
      "/v2/checkout/orders/" + id + "/capture",
      "POST",
      {},
      id,
    );
  const unit = data.purchase_units?.[0],
    capture = unit?.payments?.captures?.[0];
  if (
    data.status !== "COMPLETED" ||
    capture?.status !== "COMPLETED" ||
    capture.amount?.currency_code !== "EUR" ||
    capture.amount?.value !== p.price.toFixed(2) ||
    unit.custom_id !== req.user.id
  )
    throw new StudioError("Payment has not been confirmed.", 409);
  store.fulfill("paypal:" + id, req.user.id, p.id);
  res.json({ ok: true });
});
app.use("/api", (req, res) =>
  res.status(404).json({ error: "Endpoint not found." }),
);
app.use(express.static(resolve(root, "dist")));
app.get("/{*path}", (_, res) => res.sendFile(resolve(root, "dist/index.html")));
app.use((err, req, res, next) => {
  const status = err.status || 500;
  if (status >= 500) console.error("Request failed:", err.name);
  res.status(status).json({
    error:
      status < 500 ? err.message : "Service unavailable. Please try again.",
  });
});
let sending = false;
async function sendOutbox() {
  if (sending || !process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) return;
  sending = true;
  try {
    const rows = store.db
      .prepare(
        "SELECT * FROM outbox WHERE status='pending' AND attempts<20 ORDER BY rowid LIMIT 10",
      )
      .all();
    for (const row of rows) {
      try {
        const result = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: "Bearer " + process.env.RESEND_API_KEY,
            "Content-Type": "application/json",
            "Idempotency-Key": row.id,
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM,
            to: [row.recipient],
            subject: row.subject,
            text: row.body,
          }),
          signal: AbortSignal.timeout(15000),
        });
        if (!result.ok) throw Error("Email failed");
        store.db
          .prepare("UPDATE outbox SET status='sent' WHERE id=?")
          .run(row.id);
      } catch {
        store.db
          .prepare("UPDATE outbox SET attempts=attempts+1 WHERE id=?")
          .run(row.id);
      }
    }
  } finally {
    sending = false;
  }
}
const timer = setInterval(sendOutbox, 30000);
timer.unref();
const server = app.listen(Number(process.env.PORT || 3001), "127.0.0.1", () =>
  console.log(`MOVE API: http://127.0.0.1:${process.env.PORT || 3001}`),
);
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => {
    clearInterval(timer);
    server.close(() => {
      store.db.close();
      process.exit(0);
    });
  });
