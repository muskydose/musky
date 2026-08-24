import { getSupabaseAdmin } from '@/lib/supabase';
import { Campaign } from '@/lib/types';
import { getCampaignsAdmin, saveCampaign, getCampaignById } from './campaigns-db';
import { getSiteSettings, updateSiteSettings } from './settings';

export async function recordCampaignUsage(
  campaignId: string,
  couponCode?: string,
  orderId?: string,
  customerPhone?: string,
  discountAmount?: number
): Promise<{ success: boolean; error?: string; usageId?: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { success: true };
  }

  try {
    // 1. Primary: Call PostgreSQL atomic RPC function
    const { data: rpcData, error: rpcError } = await supabase.rpc('increment_campaign_usage', {
      p_campaign_id: campaignId,
      p_coupon_code: couponCode || null,
      p_order_id: orderId || null,
      p_customer_phone: customerPhone || null,
      p_discount_amount: discountAmount || 0,
    });

    if (!rpcError && rpcData && typeof rpcData === 'object') {
      const res = rpcData as { success?: boolean; error?: string; new_usage_count?: number; usage_id?: string };
      if (res.success === true) {
        // Sync site_settings for client consistency
        try {
          const siteSettings = await getSiteSettings();
          if (siteSettings.campaigns && res.new_usage_count !== undefined) {
            const updatedArr = siteSettings.campaigns.map((c) =>
              c.id === campaignId ? { ...c, currentUsageCount: res.new_usage_count } : c
            );
            await updateSiteSettings({ campaigns: updatedArr });
          }
        } catch (e) {
          console.warn('Sync site_settings campaign usage error:', e);
        }
        return { success: true, usageId: res.usage_id };
      } else {
        return { success: false, error: res.error || 'Campaign usage limit reached' };
      }
    }

    // 2. Secondary fallback if RPC function is not present: atomic DB UPDATE query
    const campaign = await getCampaignById(campaignId);
    if (!campaign) {
      return { success: false, error: 'Campaign not found' };
    }

    if (campaign.isManuallyDisabled || campaign.status === 'disabled') {
      return { success: false, error: 'Campaign is disabled' };
    }

    const cleanPhone = customerPhone ? customerPhone.replace(/\D/g, '') : '';

    // Check per-customer limit before incrementing if phone & limit exist
    if (campaign.perCustomerLimit && cleanPhone) {
      const { count } = await supabase
        .from('campaign_usage')
        .select('id', { count: 'exact', head: true })
        .eq('campaign_id', campaignId)
        .eq('customer_phone', cleanPhone);

      if (count !== null && count >= campaign.perCustomerLimit) {
        return {
          success: false,
          error: `Per-customer usage limit (${campaign.perCustomerLimit}) reached for this coupon.`,
        };
      }
    }

    // Atomic update enforcing usage limit at DB level
    if (campaign.usageLimit) {
      const { data: updatedRows, error: updateErr } = await supabase
        .from('campaigns')
        .update({
          current_usage_count: (campaign.currentUsageCount || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', campaignId)
        .lt('current_usage_count', campaign.usageLimit)
        .select();

      if (updateErr || !updatedRows || updatedRows.length === 0) {
        return {
          success: false,
          error: `Campaign "${campaign.publicHeading}" has reached its maximum usage limit (${campaign.usageLimit}).`,
        };
      }
    } else {
      await supabase
        .from('campaigns')
        .update({
          current_usage_count: (campaign.currentUsageCount || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', campaignId);
    }

    // Insert campaign usage entry
    const usageId = `usage-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    await supabase.from('campaign_usage').insert([
      {
        id: usageId,
        campaign_id: campaignId,
        coupon_code: couponCode || null,
        order_id: orderId || null,
        customer_phone: cleanPhone || null,
        discount_amount: discountAmount || 0,
        used_at: new Date().toISOString(),
      },
    ]);

    return { success: true, usageId };
  } catch (err: any) {
    console.error('Failed to record campaign usage:', err);
    return { success: false, error: err.message || 'Failed to record campaign usage' };
  }
}

export async function rollbackCampaignUsage(campaignId: string, usageId?: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  try {
    const { error } = await supabase.rpc('rollback_campaign_usage', {
      p_campaign_id: campaignId,
      p_usage_id: usageId || null,
    });

    if (error) {
      if (usageId) {
        await supabase.from('campaign_usage').delete().eq('id', usageId);
      }
      const campaign = await getCampaignById(campaignId);
      if (campaign && campaign.currentUsageCount && campaign.currentUsageCount > 0) {
        await supabase
          .from('campaigns')
          .update({
            current_usage_count: campaign.currentUsageCount - 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', campaignId);
      }
    }
  } catch (err) {
    console.warn('Rollback campaign usage error:', err);
  }
}
