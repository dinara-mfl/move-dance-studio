import { test } from "node:test";
import assert from "node:assert/strict";
import { schedule } from "../src/data.js";
test("class identities, instructors and studios remain stable as the schedule rolls forward", () => {
  const first = schedule(new Date("2026-10-28T12:00:00Z"));
  const next = schedule(new Date("2026-10-29T12:00:00Z"));
  for (const c of next) {
    const prior = first.find((p) => p.id === c.id);
    if (prior) assert.deepEqual(c, prior);
  }
});
