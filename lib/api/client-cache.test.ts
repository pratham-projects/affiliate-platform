import { describe, expect, it } from "bun:test";
import { shouldCacheGetEndpoint } from "./client";

describe("API client GET cache eligibility", () => {
  it("caches paginated analytics endpoints", () => {
    expect(shouldCacheGetEndpoint("/analytics/referrers?page=1&limit=20")).toEqual(true);
    expect(shouldCacheGetEndpoint("/analytics/devices/me?affiliateId=1&page=2&limit=20")).toEqual(true);
  });

  it("keeps non-analytics paginated endpoints fresh", () => {
    expect(shouldCacheGetEndpoint("/reports/top-affiliates?page=1&limit=20")).toEqual(false);
    expect(shouldCacheGetEndpoint("/conversions?page=1&limit=20")).toEqual(false);
  });
});
