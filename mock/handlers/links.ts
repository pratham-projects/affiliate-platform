import { get, MockError } from "../router"
import { getDb } from "../db"

get("/affiliates/me/links", (req) => {
  if (!req.authUser?.affiliateId) return { data: [] }
  const db = getDb()
  const affiliateId = req.authUser.affiliateId
  const codes = db.referralCodes.filter((c) => c.affiliateId === affiliateId)
  return {
    data: codes.map((c) => {
      const site = db.sites.find((s) => s.id === c.siteId)!
      return {
        id: c.id,
        siteId: site.id,
        siteName: site.name,
        siteUrl: site.baseUrl,
        code: c.code,
        fullUrl: `${site.baseUrl}?ref=${c.code}`,
        isActive: c.isActive,
        createdAt: c.createdAt,
      }
    }),
  }
})
