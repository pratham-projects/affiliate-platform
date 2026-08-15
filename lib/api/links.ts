import { apiClient } from './client';
import { isSuccessResponse } from './config';
import { isStoredAffiliate } from './user-role';

export interface AffiliateLink {
  id: number;
  siteId: number;
  siteName: string;
  siteUrl: string;
  code: string;
  fullUrl: string;
  isActive: boolean;
  createdAt: string;
}

export interface AffiliateLinksResponse {
  links: AffiliateLink[];
}

export const linksService = {
  getMyLinks: async (): Promise<AffiliateLinksResponse> => {
    if (!isStoredAffiliate()) {
      return { links: [] };
    }
    const response = await apiClient.get<AffiliateLink[]>('/affiliates/me/links');
    if (isSuccessResponse(response) && response.data) {
      if (Array.isArray(response.data)) {
        return { links: response.data };
      }
      return { links: [] };
    }
    return { links: [] };
  },
};
