import { apiClient } from './client';
import { isSuccessResponse, LegacyApiResponse } from './config';
import { isStoredAffiliate } from './user-role';

export interface DashboardConversion {
  id: number;
  affiliateId?: number;
  affiliateName?: string;
  siteName: string;
  amount: string;
  commission: string;
  status: string;
  date: string;
  isTest: boolean;
  conversionDate?: string;
  purchaseAmount?: string;
  currency?: string;
  commissionAmount?: string;
  customerEmail?: string;
}

export interface DashboardPendingPayout {
  affiliateId: number;
  affiliateName: string;
  email: string;
  pendingBalance: string;
  totalEarned: string;
}

export interface DashboardTopAffiliate {
  id: number;
  name: string;
  earned: string;
}

export interface DashboardTopCode {
  id: number;
  code: string;
  conversions: number;
}

export interface AdminDashboardData {
  timestamp: string;
  totalAffiliates: number;
  activeAffiliates: number;
  pendingAffiliates: number;
  totalCommissionsThisMonth: string;
  totalPayoutsThisMonth: string;
  pendingPayouts: string;
  conversionsThisMonth: number;
  averageCommissionPercentage: string;
  topAffiliate: DashboardTopAffiliate | null;
  topCode: DashboardTopCode | null;
  latestConversions: DashboardConversion[];
  pendingPayoutsList: DashboardPendingPayout[];
}

export interface AffiliateDashboardStats {
  totalClicks: number;
  totalConversions: number;
  totalEarned: string;
  pendingBalance: string;
  conversionRate: number;
}

export interface RecentConversion {
  id: number;
  siteName: string;
  customerEmail?: string;
  amount: string;
  commission: string;
  commissionAmount?: string;
  status: string;
  date: string;
  createdAt?: string;
  isTest: boolean;
}

export interface RecentPayment {
  id: number;
  amount: string;
  status: string;
  date: string;
}

export interface AffiliateDashboardData {
  affiliateId: number;
  affiliateName: string;
  status: string;
  pendingBalance: string;
  totalEarned: string;
  totalConversions: number;
  approvedConversions: number;
  pendingConversions: number;
  totalClicks: number;
  conversionRate: string;
  activeSites: number;
  activeReferralCodes: number;
  recentConversions: RecentConversion[];
  recentPayments: RecentPayment[];
}

export interface AffiliateDashboardResponse {
  stats: AffiliateDashboardStats;
  recentConversions: DashboardConversion[];
}


// Legacy types for backward compatibility
export interface AdminDashboardStats {
  totalAffiliates: number;
  activeAffiliates: number;
  pendingAffiliates: number;
  totalConversions: number;
  pendingConversions: number;
  totalRevenue: string;
  totalCommission: string;
  pendingPayouts: string;
}

export interface PendingPayout {
  affiliateId: number;
  affiliateName: string;
  totalEarned: string;
  pendingBalance: string;
}

export interface AdminDashboardResponse {
  stats: AdminDashboardStats;
  recentConversions: RecentConversion[];
  pendingPayouts: PendingPayout[];
}

function normalizeAverageCommissionPercentage(value: string | number | undefined): string {
  const numericValue = typeof value === "number" ? value : Number(value || 0)

  if (!Number.isFinite(numericValue)) {
    return "0"
  }

  // The reports endpoint returns commission percentage in basis points.
  return (numericValue / 100).toString()
}

export const dashboardService = {
  getAdminDashboard: async (): Promise<AdminDashboardData | null> => {
    const response = await apiClient.get<AdminDashboardData>('/reports/dashboard');
    if (isSuccessResponse(response) && response.data) {
      return {
        ...response.data,
        averageCommissionPercentage: normalizeAverageCommissionPercentage(response.data.averageCommissionPercentage),
      };
    }
    return null;
  },

  getAffiliateDashboard: async (): Promise<AffiliateDashboardData | null> => {
    if (!isStoredAffiliate()) return null;
    const response = await apiClient.get<AffiliateDashboardData>('/affiliates/me/dashboard');
    if (isSuccessResponse(response) && response.data) {
      return response.data;
    }
    return null;
  },
};
