import { test } from "node:test";
import assert from "node:assert/strict";
import { getGoogleReviews, googleLinksSchema, readGoogleBusinessReviews } from "../src/features/reviews/google";

const links = { view: "https://www.google.com/maps?cid=123", write: "https://search.google.com/local/writereview?placeid=fixture" };
const review = { reviewId: "synthetic-test-only", reviewer: { displayName: "Fixture" }, starRating: "FIVE", comment: "Synthetic fixture", createTime: "2026-11-02T12:00:00Z" };

test("Google remains disconnected without an explicit transport and never produces placeholder ratings", () => {
  assert.deepEqual(getGoogleReviews(), { status: "disconnected" });
  for (const url of ["javascript:alert(1)", "https://www.google.com.evil.invalid/", "https://user:pass@www.google.com/", "http://www.google.com/"]) {
    assert.equal(googleLinksSchema.safeParse({ ...links, view: url }).success, false);
  }
});

test("GBP adapter paginates, deduplicates and keeps official aggregate instead of sample average", async () => {
  const tokens: Array<string | undefined> = [];
  const state = await readGoogleBusinessReviews(async token => {
    tokens.push(token);
    return { averageRating: 4.2, totalReviewCount: 10, reviews: [review], ...(token ? {} : { nextPageToken: "next" }) };
  }, links, () => new Date("2026-11-02T14:00:00Z"));
  assert.deepEqual(tokens, [undefined, "next"]);
  assert.equal(state.status, "connected");
  if (state.status !== "connected") return;
  assert.equal(state.average, 4.2);
  assert.equal(state.total, 10);
  assert.equal(state.reviews.length, 1);
  assert.equal(state.reviews[0].rating, 5);
  assert.equal(state.fetchedAt, "2026-11-02T14:00:00.000Z");
});

test("empty GBP profile has no invented average; revoked, malformed and looping responses fail closed", async () => {
  const empty = await readGoogleBusinessReviews(async () => ({ totalReviewCount: 0 }), links);
  assert.equal(empty.status, "connected");
  if (empty.status === "connected") assert.equal(empty.average, null);
  for (const read of [
    async () => { throw new Error("401 secret-token-must-not-leak"); },
    async () => ({ totalReviewCount: 1, reviews: [review] }),
    async () => ({ totalReviewCount: 1, averageRating: 5, reviews: [{ ...review, starRating: "SIX" }] }),
    async () => ({ totalReviewCount: 1, averageRating: 5, reviews: [review], nextPageToken: "loop" }),
  ]) assert.deepEqual(await readGoogleBusinessReviews(read, links), { status: "unavailable" });
});
