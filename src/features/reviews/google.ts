import { z } from "zod";

const googleLink = z.url().refine(value => {
  const url = new URL(value);
  return url.protocol === "https:" && !url.username && !url.password && !url.port &&
    ["www.google.com", "maps.google.com", "search.google.com", "maps.app.goo.gl", "g.page"].includes(url.hostname);
}, "Usa un enlace oficial de Google verificado para esta ficha.");

export const googleLinksSchema = z.object({ view: googleLink, write: googleLink });
export type GoogleLinks = z.infer<typeof googleLinksSchema>;
export type GoogleReview = {
  id: string; author: string; rating: number; comment: string | null; date: string;
};
export type GoogleReviewsState =
  | { status: "disconnected" }
  | { status: "unavailable" }
  | { status: "connected"; average: number | null; total: number; reviews: GoogleReview[]; fetchedAt: string; links: GoogleLinks };

const ratings = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 } as const;
const pageSchema = z.object({
  averageRating: z.number().min(1).max(5).optional(),
  totalReviewCount: z.number().int().nonnegative(),
  reviews: z.array(z.object({
    reviewId: z.string().min(1),
    reviewer: z.object({ displayName: z.string().min(1).optional(), isAnonymous: z.boolean().optional() }),
    starRating: z.enum(["ONE", "TWO", "THREE", "FOUR", "FIVE"]),
    comment: z.string().optional(), createTime: z.iso.datetime({ offset: true }),
  })).default([]),
  nextPageToken: z.string().min(1).optional(),
});

/** Server integration seam. No fetch, OAuth, persistence or implicit connection.
 * The future authorized server transport must implement GBP reviews.list.
 * Official aggregates are never calculated from a selected subset of reviews.
 */
export async function readGoogleBusinessReviews(
  readPage: (pageToken?: string) => Promise<unknown>,
  links: GoogleLinks,
  now: () => Date = () => new Date(),
): Promise<GoogleReviewsState> {
  try {
    const verifiedLinks = googleLinksSchema.parse(links);
    const reviews = new Map<string, GoogleReview>();
    const tokens = new Set<string>();
    let token: string | undefined;
    let aggregate: { average: number | null; total: number } | undefined;
    for (let pageNumber = 0; pageNumber < 100; pageNumber++) {
      const page = pageSchema.parse(await readPage(token));
      const average = page.totalReviewCount === 0 ? null : page.averageRating;
      if (average === undefined || (page.totalReviewCount === 0 && page.reviews.length)) throw new Error("Incomplete aggregate");
      if (!aggregate) aggregate = { average, total: page.totalReviewCount };
      else if (aggregate.total !== page.totalReviewCount || aggregate.average !== average) throw new Error("Changed snapshot");
      for (const review of page.reviews) {
        reviews.set(review.reviewId, {
          id: review.reviewId, author: review.reviewer.isAnonymous ? "Usuario de Google" : review.reviewer.displayName || "Usuario de Google",
          rating: ratings[review.starRating], comment: review.comment || null, date: review.createTime,
        });
      }
      if (reviews.size > aggregate.total) throw new Error("Invalid total");
      if (!page.nextPageToken) return { status: "connected", ...aggregate, reviews: [...reviews.values()], fetchedAt: now().toISOString(), links: verifiedLinks };
      if (tokens.has(page.nextPageToken)) throw new Error("Repeated page");
      tokens.add(page.nextPageToken);
      token = page.nextPageToken;
    }
  } catch { /* Do not leak provider errors or credentials to the UI. */ }
  return { status: "unavailable" };
}

/** Remains explicitly disconnected until authorized infrastructure is implemented. */
export function getGoogleReviews(): GoogleReviewsState {
  return { status: "disconnected" };
}
