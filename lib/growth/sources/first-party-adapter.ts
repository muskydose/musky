import { GrowthDataSourceAdapter, SyncResult } from './source-interface';
import { FreshnessStatus } from '../types';
import { getOrdersForAnalytics } from '@/lib/db/orders';
import { getWholesaleEnquiries } from '@/lib/db/wholesale';
import { getCampaignsAdmin } from '@/lib/db/campaigns';
import { calculateMarketOpportunityScore } from '../scoring';
import { saveMarketMetric, saveMarketRecord, logSyncEvent, saveDataSourceRecord } from '../growth-db';
import { normalizeIndianState } from '../geography';

function normalizeCustomerKey(phone?: string | null, email?: string | null): string | null {
  if (phone) {
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length >= 10) {
      return `phone_${cleanPhone.slice(-10)}`;
    }
  }
  if (email) {
    const cleanEmail = email.trim().toLowerCase();
    if (cleanEmail.includes('@')) {
      return `email_${cleanEmail}`;
    }
  }
  return null;
}

export class FirstPartyDataSourceAdapter implements GrowthDataSourceAdapter {
  providerKey = 'first_party_orders';
  name = 'Musky Dose Store Orders & Enquiries';
  type: 'FirstParty' = 'FirstParty';

  async connect(): Promise<{ connected: boolean; message?: string }> {
    return { connected: true, message: 'First-party store database connected' };
  }

  async validate(): Promise<{ valid: boolean; errors?: string[] }> {
    return { valid: true };
  }

  async sync(): Promise<SyncResult> {
    const startTime = Date.now();
    const syncId = `sync_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    try {
      const orders = await getOrdersForAnalytics();
      const wholesale = await getWholesaleEnquiries();
      const campaigns = await getCampaignsAdmin();

      // Pre-pass: Normalize customer identifiers across all orders to calculate total customer order count
      const customerTotalOrdersMap = new Map<string, number>();
      for (const order of orders) {
        const cKey = normalizeCustomerKey(
          order.customerPhone || (order as any).phone,
          order.customerEmail || (order as any).email
        );
        if (cKey) {
          customerTotalOrdersMap.set(cKey, (customerTotalOrdersMap.get(cKey) || 0) + 1);
        }
      }

      // Aggregate by Normalized State, District, City, and Pincode
      const marketGroups = new Map<string, {
        state: string;
        stateCode?: string;
        district?: string;
        city?: string;
        pincode?: string;
        ordersCount: number;
        revenue: number;
        customerKeysSet: Set<string>;
        wholesaleLeadsCount: number;
        unitsSold: number;
        campaignOrdersCount: number;
        campaignRevenue: number;
      }>();

      for (const order of orders) {
        const rawState = (order as any).state || order.customerState || null;
        const normalizedSt = normalizeIndianState(rawState);
        const state = normalizedSt ? normalizedSt.name : (rawState && rawState.trim() ? rawState.trim() : 'Unknown State');
        const district = (order as any).district || (order as any).customerDistrict || 'General';
        const city = (order as any).city || order.customerCity || 'General';
        const pincode = (order as any).pincode || order.customerPincode || '';
        const key = `${state.toLowerCase()}:${district.toLowerCase()}:${city.toLowerCase()}`;

        if (!marketGroups.has(key)) {
          marketGroups.set(key, {
            state,
            stateCode: normalizedSt?.code,
            district,
            city,
            pincode,
            ordersCount: 0,
            revenue: 0,
            customerKeysSet: new Set<string>(),
            wholesaleLeadsCount: 0,
            unitsSold: 0,
            campaignOrdersCount: 0,
            campaignRevenue: 0,
          });
        }

        const group = marketGroups.get(key)!;
        group.ordersCount += 1;
        group.revenue += order.totalAmount || 0;

        const cKey = normalizeCustomerKey(
          order.customerPhone || (order as any).phone,
          order.customerEmail || (order as any).email
        );
        if (cKey) {
          group.customerKeysSet.add(cKey);
        }

        let totalUnits = 0;
        if (Array.isArray(order.items)) {
          totalUnits = order.items.reduce((sum, item: any) => sum + (item.quantity || 1), 0);
        }
        group.unitsSold += totalUnits;

        if (order.campaignId || order.campaignName) {
          group.campaignOrdersCount += 1;
          group.campaignRevenue += order.totalAmount || 0;
        }
      }

      // Add Wholesale enquiries count
      for (const enquiry of wholesale) {
        const rawState = enquiry.state || null;
        const normalizedSt = normalizeIndianState(rawState);
        const state = normalizedSt ? normalizedSt.name : (rawState && rawState.trim() ? rawState.trim() : 'Unknown State');
        const district = (enquiry as any).district || 'General';
        const city = enquiry.city || 'General';
        const key = `${state.toLowerCase()}:${district.toLowerCase()}:${city.toLowerCase()}`;

        if (marketGroups.has(key)) {
          marketGroups.get(key)!.wholesaleLeadsCount += 1;
        } else {
          marketGroups.set(key, {
            state,
            stateCode: normalizedSt?.code,
            district,
            city,
            pincode: '',
            ordersCount: 0,
            revenue: 0,
            customerKeysSet: new Set<string>(),
            wholesaleLeadsCount: 1,
            unitsSold: 0,
            campaignOrdersCount: 0,
            campaignRevenue: 0,
          });
        }
      }

      let imported = 0;
      let updated = 0;

      for (const [key, data] of marketGroups.entries()) {
        const marketId = `mkt_${data.state.toLowerCase().replace(/\s+/g, '_')}_${(data.district || 'general').toLowerCase().replace(/\s+/g, '_')}_${(data.city || 'general').toLowerCase().replace(/\s+/g, '_')}`;

        await saveMarketRecord({
          id: marketId,
          country: 'India',
          state: data.state,
          stateCode: data.stateCode,
          district: data.district,
          city: data.city,
          pincode: data.pincode,
          status: 'active',
        });

        const customersCount = data.customerKeysSet.size;
        let repeatCustomersCount = 0;
        for (const cKey of data.customerKeysSet) {
          if ((customerTotalOrdersMap.get(cKey) || 0) > 1) {
            repeatCustomersCount++;
          }
        }

        const aov = data.ordersCount > 0 ? data.revenue / data.ordersCount : 0;
        const scoring = calculateMarketOpportunityScore({
          ordersCount: data.ordersCount,
          revenue: data.revenue,
          customersCount,
          repeatCustomersCount,
          wholesaleLeadsCount: data.wholesaleLeadsCount,
          retailLeadsCount: 0,
          artistLeadsCount: 0,
          campaignOrdersCount: data.campaignOrdersCount,
          campaignRevenue: data.campaignRevenue,
          unitsSold: data.unitsSold,
        });

        await saveMarketMetric({
          id: `metric_${marketId}`,
          marketId,
          marketName: `${data.city && data.city !== 'General' ? data.city + ', ' : ''}${data.district && data.district !== 'General' ? data.district + ', ' : ''}${data.state}`,
          state: data.state,
          district: data.district,
          city: data.city,
          pincode: data.pincode,
          customersCount,
          ordersCount: data.ordersCount,
          revenue: data.revenue,
          unitsSold: data.unitsSold,
          aov,
          repeatCustomersCount,
          wholesaleLeadsCount: data.wholesaleLeadsCount,
          retailLeadsCount: 0,
          artistLeadsCount: 0,
          campaignOrdersCount: data.campaignOrdersCount,
          campaignRevenue: data.campaignRevenue,
          productDemandScore: Math.round(scoring.score * 0.9),
          marketOpportunityScore: scoring.score,
          scoreBreakdown: scoring.breakdown,
          sourceTier: 'VERIFIED',
          sourceName: 'FirstPartyOrders',
          updatedAt: new Date().toISOString(),
        });

        imported += 1;
      }

      const durationMs = Date.now() - startTime;
      const nowIso = new Date().toISOString();

      await saveDataSourceRecord({
        id: 'ds_first_party',
        providerKey: this.providerKey,
        name: this.name,
        type: 'FirstParty',
        status: 'Fresh',
        lastSyncedAt: nowIso,
        recordsCount: orders.length,
        createdAt: nowIso,
        updatedAt: nowIso,
      });

      await logSyncEvent({
        id: syncId,
        sourceId: 'ds_first_party',
        providerKey: this.providerKey,
        status: 'SUCCESS',
        recordsImported: imported,
        recordsUpdated: updated,
        durationMs,
        startedAt: new Date(startTime).toISOString(),
        completedAt: nowIso,
      });

      return {
        success: true,
        recordsImported: imported,
        recordsUpdated: updated,
        durationMs,
      };
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      const errMsg = err.message || 'Failed first-party store data sync';

      await logSyncEvent({
        id: syncId,
        sourceId: 'ds_first_party',
        providerKey: this.providerKey,
        status: 'FAILED',
        recordsImported: 0,
        recordsUpdated: 0,
        errorDetails: errMsg,
        durationMs,
        startedAt: new Date(startTime).toISOString(),
        completedAt: new Date().toISOString(),
      });

      return {
        success: false,
        recordsImported: 0,
        recordsUpdated: 0,
        errorMessage: errMsg,
        durationMs,
      };
    }
  }

  async getStatus(): Promise<{ status: FreshnessStatus; lastSyncedAt?: string; recordsCount: number }> {
    const orders = await getOrdersForAnalytics();
    return {
      status: 'Fresh',
      lastSyncedAt: new Date().toISOString(),
      recordsCount: orders.length,
    };
  }
}
