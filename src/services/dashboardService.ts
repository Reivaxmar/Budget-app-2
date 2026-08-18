import {
  estimateRepositoryClient,
  chapterRepositoryClient,
  lineItemRepositoryClient,
} from '../db/estimateRepositoryClient';
import { customerRepositoryClient } from '../db/customerRepositoryClient';

export interface DashboardRecentEstimate {
  id: string;
  estimateNumber: string;
  customerName: string;
  subject: string;
  status: string;
  creationDate: string;
  total: number;
}

export interface DashboardOverview {
  customerCount: number;
  estimateCount: number;
  estimatesByStatus: Record<string, number>;
  totalValue: number;
  recentEstimates: DashboardRecentEstimate[];
}

/**
 * Aggregates dashboard statistics (SPECS.md §3: "recent estimates, drafts,
 * quick actions and basic statistics") from the flat repositories directly,
 * rather than calling estimateService.getEstimateWithDetails per estimate —
 * one pass over each collection instead of N+1 lookups.
 */
export async function getDashboardOverview(recentLimit = 5): Promise<DashboardOverview> {
  const [customers, estimates, chapters, lineItems] = await Promise.all([
    customerRepositoryClient.findMany(),
    estimateRepositoryClient.findMany(),
    chapterRepositoryClient.findMany(),
    lineItemRepositoryClient.findMany(),
  ]);

  const estimateIdByChapterId = new Map(chapters.map((chapter) => [chapter.id, chapter.estimateId]));
  const totalByEstimateId = new Map<string, number>();
  for (const item of lineItems) {
    const estimateId = estimateIdByChapterId.get(item.chapterId);
    if (!estimateId) continue;
    totalByEstimateId.set(estimateId, (totalByEstimateId.get(estimateId) ?? 0) + item.amount);
  }

  const customerNameById = new Map(customers.map((customer) => [customer.id, customer.name]));

  const estimatesByStatus: Record<string, number> = {};
  let totalValue = 0;
  for (const estimate of estimates) {
    estimatesByStatus[estimate.status] = (estimatesByStatus[estimate.status] ?? 0) + 1;
    totalValue += totalByEstimateId.get(estimate.id) ?? 0;
  }

  const recentEstimates = [...estimates]
    .sort((a, b) => new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime())
    .slice(0, recentLimit)
    .map((estimate) => ({
      id: estimate.id,
      estimateNumber: estimate.estimateNumber,
      customerName: customerNameById.get(estimate.customerId) ?? '',
      subject: estimate.subject,
      status: estimate.status,
      creationDate: estimate.creationDate,
      total: totalByEstimateId.get(estimate.id) ?? 0,
    }));

  return {
    customerCount: customers.length,
    estimateCount: estimates.length,
    estimatesByStatus,
    totalValue,
    recentEstimates,
  };
}

export const dashboardService = {
  getDashboardOverview,
};
