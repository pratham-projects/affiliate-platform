import { apiClient } from './client';
import { isSuccessResponse, API_BASE_URL } from './config';
import { tokenManager } from './token';

export interface DashboardStats {
  totalAffiliates: number;
  activeAffiliates: number;
  pendingAffiliates: number;
  totalSites: number;
  activeSites: number;
  totalRevenue: string;
  totalCommission: string;
  totalClicks: number;
  totalConversions: number;
  conversionRate: number;
}

export interface OverviewStats {
  totalClicks: number;
  customers: number;
  conversions: number;
  revenue: string;
  commission: string;
}

export interface AffiliatePerformance {
  affiliateId: number;
  affiliateName: string;
  email: string;
  totalClicks: number;
  totalConversions: number;
  totalRevenue: string;
  totalCommission: string;
  conversionRate: number;
  referralCode?: string;
}

export interface TopAffiliate {
  id?: number;
  affiliateId: number;
  affiliateName?: string;
  fullName?: string;
  email?: string;
  totalRevenue?: string;
  totalCommission?: string;
  totalConversions?: number;
  totalEarned?: string;
  conversionCount?: number;
  rank?: number;
  referralCode?: string;
}

export interface TopCode {
  id: number;
  code: string;
  affiliateId: number;
  affiliateName: string;
  totalClicks: number;
  totalConversions: number;
  totalRevenue: string;
  conversionRate: number;
}

export interface BrowserAnalytics {
  browser: string;
  conversions: number;
  revenue: string;
  percentage: string;
}

export interface OperatingSystemAnalytics {
  os: string;
  conversions: number;
  revenue: string;
  percentage: string;
}

export interface DeviceTypeAnalytics {
  deviceType: string;
  conversions: number;
  revenue: string;
  percentage: string;
}

export interface LandingPagePerformance {
  landingPage: string;
  conversions: number;
  revenue: string;
  commission: string;
  avgOrderValue: string;
}

export interface ReferrerAnalytics {
  referrer: string;
  conversions: number;
  revenue: string;
  commission: string;
}

export interface TrendsParams {
  metric?: 'conversions' | 'revenue' | 'commission' | 'clicks';
  period?: 'daily' | 'weekly' | 'monthly';
  count?: number;
  affiliateId?: number;
}

export interface TrendsData {
  date: string;
  value: number;
}

export interface GeographicParams {
  groupBy?: 'country' | 'city';
  country?: string;
}

export interface GeographicData {
  location: string;
  conversions: number;
  revenue: string;
  percentage: string;
}

export interface SitePerformanceParams {
  limit?: number;
  offset?: number;
}

export interface SitePerformance {
  siteId: number;
  siteName: string;
  conversions: number;
  revenue: string;
  commission: string;
}

export interface TopCodesParams {
  limit?: number;
  offset?: number;
  startDate?: string;
  endDate?: string;
}

export interface ExportParams {
  type: 'affiliate_performance' | 'conversions' | 'payments' | 'referral_codes';
  format?: 'json' | 'csv';
}

export interface TopAffiliatesParams {
  limit?: number;
  offset?: number;
  startDate?: string;
  endDate?: string;
}

export interface TopAffiliatesResponse {
  affiliates: TopAffiliate[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}

export interface AdminAnalyticsSummary {
  overview: OverviewStats | null;
  topAffiliates: TopAffiliate[];
  browsers: BrowserAnalytics[];
  os: OperatingSystemAnalytics[];
  devices: DeviceTypeAnalytics[];
  totals: {
    affiliates: number;
    referrers: number;
    os: number;
    browsers: number;
    countries: number;
    devices: number;
  };
}

interface AnalyticsSummaryRow {
  browser?: string;
  os?: string;
  deviceType?: string;
  totalConversions?: number;
  totalConversionAmount?: string;
}

function toPercentageRows<T extends { conversions: number; percentage: string }>(
  rows: AnalyticsSummaryRow[] | undefined,
  mapRow: (row: AnalyticsSummaryRow, percentage: string) => T,
): T[] {
  const source = rows || [];
  const total = source.reduce((sum, row) => sum + Number(row.totalConversions || 0), 0);
  return source.map((row) => {
    const conversions = Number(row.totalConversions || 0);
    const percentage = total > 0 ? ((conversions / total) * 100).toFixed(1) : "0.0";
    return mapRow(row, percentage);
  });
}

export const reportsService = {
  getDashboard: async (): Promise<DashboardStats | null> => {
    const response = await apiClient.get<DashboardStats>('/reports/dashboard');
    if (isSuccessResponse(response) && response.data) {
      return response.data;
    }
    return null;
  },

  getOverview: async (): Promise<OverviewStats | null> => {
    const response = await apiClient.get<OverviewStats>('/reports/overview');
    if (isSuccessResponse(response) && response.data) {
      return response.data;
    }
    return null;
  },

  getAffiliatePerformance: async (
    affiliateId: number,
    params?: { startDate?: string; endDate?: string }
  ): Promise<AffiliatePerformance | null> => {
    const searchParams = new URLSearchParams();
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const response = await apiClient.get<AffiliatePerformance>(`/reports/affiliates/${affiliateId}/performance${query}`);
    if (isSuccessResponse(response) && response.data) {
      return response.data;
    }
    return null;
  },

  getTopAffiliates: async (params?: TopAffiliatesParams): Promise<TopAffiliatesResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const response = await apiClient.get<TopAffiliatesResponse | TopAffiliate[]>(`/reports/top-affiliates${query}`);
    if (isSuccessResponse(response) && response.data) {
      // Handle both array response and paginated response formats
      if (Array.isArray(response.data)) {
        return {
          affiliates: response.data,
          pagination: { limit: response.data.length, offset: 0, total: response.data.length }
        };
      }
      return {
        affiliates: response.data.affiliates || [],
        pagination: response.data.pagination || { limit: 20, offset: 0, total: 0 }
      };
    }
    return { affiliates: [], pagination: { limit: 20, offset: 0, total: 0 } };
  },

  getAdminSummary: async (params?: TopAffiliatesParams): Promise<AdminAnalyticsSummary> => {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const response = await apiClient.get<{
      overview: OverviewStats | null;
      topAffiliates: TopAffiliate[];
      browsers: AnalyticsSummaryRow[];
      os: AnalyticsSummaryRow[];
      devices: AnalyticsSummaryRow[];
      totals: AdminAnalyticsSummary["totals"];
    }>(`/analytics/admin-summary${query}`);

    const data = isSuccessResponse(response) && response.data ? response.data : null;
    return {
      overview: data?.overview || null,
      topAffiliates: data?.topAffiliates || [],
      browsers: toPercentageRows(data?.browsers, (row, percentage) => ({
        browser: row.browser || "Unknown",
        conversions: Number(row.totalConversions || 0),
        revenue: String(row.totalConversionAmount || "0"),
        percentage,
      })),
      os: toPercentageRows(data?.os, (row, percentage) => ({
        os: row.os || "Unknown",
        conversions: Number(row.totalConversions || 0),
        revenue: String(row.totalConversionAmount || "0"),
        percentage,
      })),
      devices: toPercentageRows(data?.devices, (row, percentage) => ({
        deviceType: row.deviceType || "Unknown",
        conversions: Number(row.totalConversions || 0),
        revenue: String(row.totalConversionAmount || "0"),
        percentage,
      })),
      totals: data?.totals || { affiliates: 0, referrers: 0, os: 0, browsers: 0, countries: 0, devices: 0 },
    };
  },

  getTopCodes: async (params?: TopCodesParams): Promise<TopCode[]> => {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const response = await apiClient.get<TopCode[]>(`/reports/top-codes${query}`);
    if (isSuccessResponse(response) && response.data) {
      return response.data;
    }
    return [];
  },

  getTrends: async (params?: TrendsParams): Promise<TrendsData[]> => {
    const searchParams = new URLSearchParams();
    if (params?.metric) searchParams.set('metric', params.metric);
    if (params?.period) searchParams.set('period', params.period);
    if (params?.count) searchParams.set('count', params.count.toString());
    if (params?.affiliateId) searchParams.set('affiliateId', params.affiliateId.toString());
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const response = await apiClient.get<TrendsData[]>(`/reports/trends${query}`);
    if (isSuccessResponse(response) && response.data) {
      return response.data;
    }
    return [];
  },

  getGeographicReport: async (params?: GeographicParams): Promise<GeographicData[]> => {
    const searchParams = new URLSearchParams();
    if (params?.groupBy) searchParams.set('groupBy', params.groupBy);
    if (params?.country) searchParams.set('country', params.country);
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const response = await apiClient.get<GeographicData[]>(`/reports/geographic${query}`);
    if (isSuccessResponse(response) && response.data) {
      return response.data;
    }
    return [];
  },

  getSitePerformance: async (params?: SitePerformanceParams): Promise<SitePerformance[]> => {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const response = await apiClient.get<SitePerformance[]>(`/reports/sites${query}`);
    if (isSuccessResponse(response) && response.data) {
      return response.data;
    }
    return [];
  },

  export: async (params: ExportParams): Promise<Blob | null> => {
    const searchParams = new URLSearchParams();
    searchParams.set('type', params.type);
    if (params.format) searchParams.set('format', params.format);

    try {
      // Use tokenManager to get the current access token
      const accessToken = tokenManager.getAccessToken();
      const response = await fetch(`${API_BASE_URL}/reports/export?${searchParams.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        return await response.blob();
      }
      return null;
    } catch {
      return null;
    }
  },

  getBrowserAnalytics: async (): Promise<BrowserAnalytics[]> => {
    const response = await apiClient.get<BrowserAnalytics[]>('/reports/browsers');
    if (isSuccessResponse(response) && response.data) {
      return response.data;
    }
    return [];
  },

  getOperatingSystemAnalytics: async (): Promise<OperatingSystemAnalytics[]> => {
    const response = await apiClient.get<OperatingSystemAnalytics[]>('/reports/operating-systems');
    if (isSuccessResponse(response) && response.data) {
      return response.data;
    }
    return [];
  },

  getDeviceTypeAnalytics: async (): Promise<DeviceTypeAnalytics[]> => {
    const response = await apiClient.get<DeviceTypeAnalytics[]>('/reports/devices');
    if (isSuccessResponse(response) && response.data) {
      return response.data;
    }
    return [];
  },

  getLandingPagePerformance: async (limit = 20): Promise<LandingPagePerformance[]> => {
    const response = await apiClient.get<LandingPagePerformance[]>(`/reports/landing-pages?limit=${limit}`);
    if (isSuccessResponse(response) && response.data) {
      return response.data;
    }
    return [];
  },

  getReferrerAnalytics: async (limit = 20): Promise<ReferrerAnalytics[]> => {
    const response = await apiClient.get<ReferrerAnalytics[]>(`/reports/referrers?limit=${limit}`);
    if (isSuccessResponse(response) && response.data) {
      return response.data;
    }
    return [];
  },
};

export interface AnalyticsPaginationParams {
  limit?: number;
  offset?: number;
  page?: number;
  startDate?: string;
  endDate?: string;
  affiliateId?: number;
  referrer?: string;
  os?: string;
  browser?: string;
  country?: string;
  device?: string;
  status?: string | string[];
}

export interface SelfAnalyticsParams extends AnalyticsPaginationParams {
  affiliateId: number;
}

export interface AnalyticsPaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface AffiliateAnalyticsRow {
  affiliateId: number;
  affiliateName: string;
  affiliateEmail: string;
  totalClicks: number;
  totalCustomers: number;
  totalConversions: number;
  totalConversionAmount: string;
  totalCommission: string;
}

export interface AffiliateAnalyticsResponse {
  data: AffiliateAnalyticsRow[];
  pagination: AnalyticsPaginationMeta;
}

export interface ReferrerAnalyticsRow {
  referrer: string;
  totalClicks: number;
  totalCustomers: number;
  totalConversions: number;
  totalConversionAmount: string;
  totalCommission: string;
}

export interface ReferrerAnalyticsResponse {
  data: ReferrerAnalyticsRow[];
  pagination: AnalyticsPaginationMeta;
}

export interface OSAnalyticsRow {
  os: string;
  totalClicks: number;
  totalCustomers: number;
  totalConversions: number;
  totalConversionAmount: string;
  totalCommission: string;
}

export interface OSAnalyticsResponse {
  data: OSAnalyticsRow[];
  pagination: AnalyticsPaginationMeta;
}

export interface BrowserAnalyticsRow {
  browser: string;
  totalClicks: number;
  totalCustomers: number;
  totalConversions: number;
  totalConversionAmount: string;
  totalCommission: string;
}

export interface BrowserAnalyticsResponse {
  data: BrowserAnalyticsRow[];
  pagination: AnalyticsPaginationMeta;
}

export interface CountryAnalyticsRow {
  country: string;
  totalClicks: number;
  totalCustomers: number;
  totalConversions: number;
  totalConversionAmount: string;
  totalCommission: string;
}

export interface CountryAnalyticsResponse {
  data: CountryAnalyticsRow[];
  pagination: AnalyticsPaginationMeta;
}

export interface DeviceAnalyticsRow {
  deviceType: string;
  totalClicks: number;
  totalCustomers: number;
  totalConversions: number;
  totalConversionAmount: string;
  totalCommission: string;
}

export interface DeviceAnalyticsResponse {
  data: DeviceAnalyticsRow[];
  pagination: AnalyticsPaginationMeta;
}

const buildAnalyticsSearchParams = (params?: AnalyticsPaginationParams) => {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.offset !== undefined) searchParams.set('offset', params.offset.toString());
  if (params?.page) searchParams.set('page', params.page.toString());
  if (params?.startDate) searchParams.set('startDate', params.startDate);
  if (params?.endDate) searchParams.set('endDate', params.endDate);
  if (params?.affiliateId) searchParams.set('affiliateId', params.affiliateId.toString());
  if (params?.referrer) searchParams.set('referrer', params.referrer);
  if (params?.os) searchParams.set('os', params.os);
  if (params?.browser) searchParams.set('browser', params.browser);
  if (params?.country) searchParams.set('country', params.country);
  if (params?.device) searchParams.set('device', params.device);
  if (params?.status) {
    if (Array.isArray(params.status)) {
      params.status.forEach(s => searchParams.append('status', s));
    } else {
      searchParams.set('status', params.status);
    }
  }
  return searchParams;
};

const EMPTY_ANALYTICS_PAGINATION: AnalyticsPaginationMeta = {
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 0,
  hasNext: false,
  hasPrev: false,
};

function normalizeAnalyticsResponse<T>(response: any): { data: T[]; pagination: AnalyticsPaginationMeta } {
  if (isSuccessResponse(response)) {
    return {
      data: response.data || [],
      pagination: (response.pagination as AnalyticsPaginationMeta) || response.data?.pagination || EMPTY_ANALYTICS_PAGINATION,
    };
  }

  return { data: [], pagination: EMPTY_ANALYTICS_PAGINATION };
}

export const analyticsService = {
  getAffiliateAnalytics: async (params?: AnalyticsPaginationParams): Promise<{ data: AffiliateAnalyticsRow[]; pagination: AnalyticsPaginationMeta }> => {
    const searchParams = buildAnalyticsSearchParams(params);
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const response = await apiClient.get<AffiliateAnalyticsRow[]>(`/analytics/affiliates${query}`);
    return normalizeAnalyticsResponse<AffiliateAnalyticsRow>(response);
  },

  getReferrerAnalyticsPaginated: async (params?: AnalyticsPaginationParams): Promise<{ data: ReferrerAnalyticsRow[]; pagination: AnalyticsPaginationMeta }> => {
    const searchParams = buildAnalyticsSearchParams(params);
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const response = await apiClient.get<ReferrerAnalyticsRow[]>(`/analytics/referrers${query}`);
    return normalizeAnalyticsResponse<ReferrerAnalyticsRow>(response);
  },

  getOSAnalytics: async (params?: AnalyticsPaginationParams): Promise<{ data: OSAnalyticsRow[]; pagination: AnalyticsPaginationMeta }> => {
    const searchParams = buildAnalyticsSearchParams(params);
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const response = await apiClient.get<OSAnalyticsRow[]>(`/analytics/os${query}`);
    return normalizeAnalyticsResponse<OSAnalyticsRow>(response);
  },

  getBrowserAnalyticsPaginated: async (params?: AnalyticsPaginationParams): Promise<{ data: BrowserAnalyticsRow[]; pagination: AnalyticsPaginationMeta }> => {
    const searchParams = buildAnalyticsSearchParams(params);
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const response = await apiClient.get<BrowserAnalyticsRow[]>(`/analytics/browsers${query}`);
    return normalizeAnalyticsResponse<BrowserAnalyticsRow>(response);
  },

  getCountryAnalytics: async (params?: AnalyticsPaginationParams): Promise<{ data: CountryAnalyticsRow[]; pagination: AnalyticsPaginationMeta }> => {
    const searchParams = buildAnalyticsSearchParams(params);
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const response = await apiClient.get<CountryAnalyticsRow[]>(`/analytics/countries${query}`);
    return normalizeAnalyticsResponse<CountryAnalyticsRow>(response);
  },

  getDeviceAnalytics: async (params?: AnalyticsPaginationParams): Promise<{ data: DeviceAnalyticsRow[]; pagination: AnalyticsPaginationMeta }> => {
    const searchParams = buildAnalyticsSearchParams(params);
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const response = await apiClient.get<DeviceAnalyticsRow[]>(`/analytics/devices${query}`);
    return normalizeAnalyticsResponse<DeviceAnalyticsRow>(response);
  },

  getMyReferrerAnalytics: async (params: SelfAnalyticsParams): Promise<{ data: ReferrerAnalyticsRow[]; pagination: AnalyticsPaginationMeta }> => {
    const searchParams = buildAnalyticsSearchParams(params);
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const response = await apiClient.get<ReferrerAnalyticsRow[]>(`/analytics/referrers/me${query}`);
    return normalizeAnalyticsResponse<ReferrerAnalyticsRow>(response);
  },

  getMyOSAnalytics: async (params: SelfAnalyticsParams): Promise<{ data: OSAnalyticsRow[]; pagination: AnalyticsPaginationMeta }> => {
    const searchParams = buildAnalyticsSearchParams(params);
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const response = await apiClient.get<OSAnalyticsRow[]>(`/analytics/os/me${query}`);
    return normalizeAnalyticsResponse<OSAnalyticsRow>(response);
  },

  getMyBrowserAnalytics: async (params: SelfAnalyticsParams): Promise<{ data: BrowserAnalyticsRow[]; pagination: AnalyticsPaginationMeta }> => {
    const searchParams = buildAnalyticsSearchParams(params);
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const response = await apiClient.get<BrowserAnalyticsRow[]>(`/analytics/browsers/me${query}`);
    return normalizeAnalyticsResponse<BrowserAnalyticsRow>(response);
  },

  getMyCountryAnalytics: async (params: SelfAnalyticsParams): Promise<{ data: CountryAnalyticsRow[]; pagination: AnalyticsPaginationMeta }> => {
    const searchParams = buildAnalyticsSearchParams(params);
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const response = await apiClient.get<CountryAnalyticsRow[]>(`/analytics/countries/me${query}`);
    return normalizeAnalyticsResponse<CountryAnalyticsRow>(response);
  },

  getMyDeviceAnalytics: async (params: SelfAnalyticsParams): Promise<{ data: DeviceAnalyticsRow[]; pagination: AnalyticsPaginationMeta }> => {
    const searchParams = buildAnalyticsSearchParams(params);
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const response = await apiClient.get<DeviceAnalyticsRow[]>(`/analytics/devices/me${query}`);
    return normalizeAnalyticsResponse<DeviceAnalyticsRow>(response);
  },
};
