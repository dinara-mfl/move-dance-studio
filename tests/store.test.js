import { test } from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../server/store.js";
const user = { id: "alice", email: "alice@example.com" };
function setup(t) {
  const s = createStore();
  s.seed();
  t.after(() => s.db.close());
  const c = s.list().find((c) => new Date(c.startsAt) - Date.now() > 86400000);
  return { s, c };
}
test("payment fulfillment is idempotent and rejects mismatched ownership", (t) => {
  const { s } = setup(t);
  assert.equal(s.fulfill("payment-1", user.id, "flow"), true);
  assert.equal(s.fulfill("payment-1", user.id, "flow"), false);
  assert.equal(s.me(user.id).purchases[0].remaining, 4);
  assert.throws(() => s.fulfill("payment-1", "bob", "flow"), /mismatch/);
});
test("booking consumes exactly one credit; duplicate booking cannot consume another", (t) => {
  const { s, c } = setup(t);
  s.fulfill("p", user.id, "flow");
  s.book(user, c.id);
  assert.equal(s.me(user.id).purchases[0].remaining, 3);
  assert.throws(() => s.book(user, c.id), /already/);
  assert.equal(s.me(user.id).purchases[0].remaining, 3);
  assert.equal(s.db.prepare("SELECT COUNT(*) n FROM outbox").get().n, 1);
});
test("cancellation restores credit once and enforces ownership", (t) => {
  const { s, c } = setup(t);
  s.fulfill("p", user.id, "flow");
  const b = s.book(user, c.id);
  assert.throws(
    () => s.cancel({ id: "bob", email: "b@x.com" }, b.id),
    /not found/,
  );
  s.cancel(user, b.id);
  assert.equal(s.me(user.id).purchases[0].remaining, 4);
  assert.throws(() => s.cancel(user, b.id), /not found/);
});
test("cannot book with no credit or a pass that expires before the class", (t) => {
  const { s, c } = setup(t);
  assert.throws(() => s.book(user, c.id), /valid class pass/);
  s.fulfill("p", user.id, "single");
  s.db
    .prepare("UPDATE purchases SET expires_at=?")
    .run(new Date().toISOString());
  assert.throws(() => s.book(user, c.id), /valid class pass/);
});
test("capacity is enforced without charging the thirteenth dancer", (t) => {
  const { s, c } = setup(t);
  for (let i = 0; i < 12; i++) {
    s.fulfill("p" + i, "u" + i, "single");
    s.book({ id: "u" + i, email: "test@example.com" }, c.id);
  }
  s.fulfill("last", user.id, "single");
  assert.throws(() => s.book(user, c.id), /full/);
  assert.equal(s.me(user.id).purchases[0].remaining, 1);
});
test("late cancellation cannot return credits", (t) => {
  const { s, c } = setup(t);
  s.fulfill("p", user.id, "single");
  const b = s.book(user, c.id);
  s.db
    .prepare("UPDATE classes SET data=? WHERE id=?")
    .run(
      JSON.stringify({
        ...c,
        startsAt: new Date(Date.now() + 3600000).toISOString(),
      }),
      c.id,
    );
  assert.throws(() => s.cancel(user, b.id), /12 hours/);
  assert.equal(s.me(user.id).purchases[0].remaining, 0);
});
test("started and unknown classes cannot be booked", (t) => {
  const { s, c } = setup(t);
  s.fulfill("p", user.id, "flow");
  s.db
    .prepare("UPDATE classes SET data=? WHERE id=?")
    .run(
      JSON.stringify({
        ...c,
        startsAt: new Date(Date.now() - 3600000).toISOString(),
      }),
      c.id,
    );
  assert.throws(() => s.book(user, c.id), /already started/);
  assert.throws(() => s.book(user, "missing"), /not found/);
  assert.equal(s.me(user.id).purchases[0].remaining, 4);
});
