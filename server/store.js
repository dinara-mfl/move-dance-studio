import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { plans, schedule } from "../src/data.js";
export class StudioError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
export function createStore(filename = ":memory:") {
  const db = new DatabaseSync(filename);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
 CREATE TABLE IF NOT EXISTS classes(id TEXT PRIMARY KEY, data TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS purchases(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,plan_id TEXT NOT NULL,remaining INTEGER NOT NULL CHECK(remaining>=0),expires_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS bookings(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,class_id TEXT NOT NULL REFERENCES classes(id),purchase_id TEXT NOT NULL REFERENCES purchases(id),UNIQUE(user_id,class_id));
 CREATE TABLE IF NOT EXISTS orders(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,plan_id TEXT NOT NULL,provider TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS outbox(id TEXT PRIMARY KEY,booking_id TEXT,recipient TEXT NOT NULL,subject TEXT NOT NULL,body TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',attempts INTEGER NOT NULL DEFAULT 0);
 `);
  const tx = (fn) => {
    db.exec("BEGIN IMMEDIATE");
    try {
      const result = fn();
      db.exec("COMMIT");
      return result;
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  };
  function seed(now = new Date()) {
    const insert = db.prepare("INSERT OR IGNORE INTO classes VALUES (?,?)");
    for (const c of schedule(now)) insert.run(c.id, JSON.stringify(c));
  }
  function list() {
    seed();
    return db
      .prepare("SELECT data FROM classes")
      .all()
      .map((r) => JSON.parse(r.data))
      .filter(
        (c) => c.startsAt.slice(0, 10) >= new Date().toISOString().slice(0, 10),
      )
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
      .map((c) => ({
        ...c,
        remaining:
          c.capacity -
          db
            .prepare("SELECT COUNT(*) AS n FROM bookings WHERE class_id=?")
            .get(c.id).n,
      }))
      .slice(0, 42);
  }
  function fulfill(id, userId, planId) {
    return tx(() => {
      const p = plans.find((p) => p.id === planId);
      if (!p) throw new StudioError("Unknown pass.");
      const exists = db.prepare("SELECT * FROM purchases WHERE id=?").get(id);
      if (exists) {
        if (exists.user_id !== userId || exists.plan_id !== planId)
          throw new StudioError("Payment mismatch.", 409);
        return false;
      }
      db.prepare("INSERT INTO purchases VALUES (?,?,?,?,?)").run(
        id,
        userId,
        p.id,
        p.credits,
        new Date(Date.now() + p.days * 86400000).toISOString(),
      );
      return true;
    });
  }
  function me(userId) {
    return {
      purchases: db
        .prepare("SELECT * FROM purchases WHERE user_id=? ORDER BY expires_at")
        .all(userId)
        .map((p) => ({
          id: p.id,
          planId: p.plan_id,
          name: plans.find((x) => x.id === p.plan_id)?.name,
          remaining: p.remaining,
          expiresAt: p.expires_at,
        })),
      bookings: db
        .prepare(
          "SELECT b.*,c.data FROM bookings b JOIN classes c ON c.id=b.class_id WHERE user_id=? ORDER BY c.id",
        )
        .all(userId)
        .map((b) => ({
          ...JSON.parse(b.data),
          id: b.id,
          classId: b.class_id,
          emailStatus:
            db
              .prepare(
                "SELECT status FROM outbox WHERE booking_id=? ORDER BY rowid LIMIT 1",
              )
              .get(b.id)?.status || "pending",
        })),
    };
  }
  function book(user, classId) {
    return tx(() => {
      seed();
      const row = db
        .prepare("SELECT data FROM classes WHERE id=?")
        .get(classId);
      if (!row) throw new StudioError("Class not found.", 404);
      const c = JSON.parse(row.data);
      if (new Date(c.startsAt) <= new Date())
        throw new StudioError("This class has already started.");
      if (
        db
          .prepare("SELECT id FROM bookings WHERE user_id=? AND class_id=?")
          .get(user.id, classId)
      )
        throw new StudioError("You already reserved this class.", 409);
      if (
        db
          .prepare("SELECT COUNT(*) AS n FROM bookings WHERE class_id=?")
          .get(classId).n >= c.capacity
      )
        throw new StudioError("This class is full.", 409);
      const p = db
        .prepare(
          "SELECT * FROM purchases WHERE user_id=? AND remaining>0 AND expires_at>? ORDER BY expires_at LIMIT 1",
        )
        .get(user.id, c.startsAt);
      if (!p)
        throw new StudioError("You need a valid class pass for this date.");
      const id = randomUUID();
      db.prepare("UPDATE purchases SET remaining=remaining-1 WHERE id=?").run(
        p.id,
      );
      db.prepare("INSERT INTO bookings VALUES (?,?,?,?)").run(
        id,
        user.id,
        classId,
        p.id,
      );
      enqueue(
        id,
        user.email,
        "You’re on the list — MOVE",
        `${c.style}\n${new Date(c.startsAt).toLocaleString("en-GB", { timeZone: "Europe/Berlin" })} (Berlin time)\n${c.studio}, with ${c.teacher}\nBooking: ${id}\nCancel in My MOVE at least 12 hours before class to return your credit.`,
      );
      return { ...c, id, classId, emailStatus: "pending" };
    });
  }
  function cancel(user, id) {
    return tx(() => {
      const b = db
        .prepare(
          "SELECT b.*,c.data FROM bookings b JOIN classes c ON c.id=b.class_id WHERE b.id=? AND user_id=?",
        )
        .get(id, user.id);
      if (!b) throw new StudioError("Reservation not found.", 404);
      const c = JSON.parse(b.data);
      if (new Date(c.startsAt) - Date.now() < 43200000)
        throw new StudioError("Cancellations close 12 hours before class.");
      db.prepare("DELETE FROM bookings WHERE id=?").run(id);
      db.prepare("UPDATE purchases SET remaining=remaining+1 WHERE id=?").run(
        b.purchase_id,
      );
      enqueue(
        null,
        user.email,
        "Reservation cancelled — MOVE",
        `Your ${c.style} reservation has been cancelled. One credit was returned to your original pass.`,
      );
      return { ok: true };
    });
  }
  function enqueue(bookingId, email, subject, body) {
    db.prepare(
      "INSERT INTO outbox(id,booking_id,recipient,subject,body) VALUES(?,?,?,?,?)",
    ).run(randomUUID(), bookingId, email, subject, body);
  }
  return { db, seed, list, fulfill, me, book, cancel, enqueue };
}
