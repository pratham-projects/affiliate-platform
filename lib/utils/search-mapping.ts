import { SearchDropdownOption } from "@/components/ui/search-dropdown";
import { SiteSearchResult, Affiliate, ReferralCode } from "@/lib/api";

/**
 * Maps a SiteSearchResult to a SearchDropdownOption for use in SearchDropdown components.
 */
export const mapSiteToOption = (site: SiteSearchResult): SearchDropdownOption => ({
    value: site.id.toString(),
    label: site.name,
    description: site.baseUrl,
    status: site.status,
});

/**
 * Maps an Affiliate result to a SearchDropdownOption for use in SearchDropdown components.
 * Supports various affiliate shapes from common search endpoints.
 */
export const mapAffiliateToOption = (affiliate: any): SearchDropdownOption => ({
    value: affiliate.id.toString(),
    label: affiliate.fullName || affiliate.name || "Unknown Affiliate",
    description: affiliate.email,
    status: affiliate.status,
});

/**
 * Maps a ReferralCode result to a SearchDropdownOption for use in SearchDropdown components.
 */
export const mapReferralCodeToOption = (code: ReferralCode): SearchDropdownOption => ({
    value: code.id.toString(),
    label: code.code,
    description: code.label || undefined,
    status: code.isActive ? "active" : "inactive",
    details: {
        Affiliate: code.affiliateName || "N/A",
        Email: code.affiliateEmail || "N/A",
        Site: code.siteName || "N/A",
        URL: code.siteUrl || "N/A"
    }
});
