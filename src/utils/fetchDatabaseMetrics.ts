// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";

export interface AffiliateMetrics {
  totalAffiliates: number;
  activeAffiliates: number;
  pendingAffiliates: number;
  totalCommissions: number;
  pendingCommissions: number;
  paidCommissions: number;
  totalReferrals: number;
  commissionsByMonth: Array<{ month: string; earned: number; paid: number }>;
}

export interface DatabaseMetrics {
  totalUsers: number;
  totalSubscriptions: number;
  totalRevenue: number;
  activeSubscriptions: number;
  cancelledSubscriptions: number;
  totalCartItems: number;
  totalAutomations: number;
  popularAutomations: Array<{ name: string; count: number }>;
  subscriptionGrowth: Array<{ month: string; signups: number; cancellations: number; net: number }>;
  affiliateMetrics: AffiliateMetrics;
}

export const fetchDatabaseMetrics = async (): Promise<DatabaseMetrics> => {
  try {
    // Fetch total users
    const { count: totalUsers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    // Fetch total subscriptions with dates
    const { data: subscriptions } = await supabase
      .from("subscriptions")
      .select("status, automation_limit, created_at, updated_at");

    const totalSubscriptions = subscriptions?.length || 0;
    // Note: Revenue calculation would require price data from Stripe
    const totalRevenue = 0;
    const activeSubscriptions = subscriptions?.filter(s => s.status === "active").length || 0;
    const cancelledSubscriptions = subscriptions?.filter(s => s.status === "canceled").length || 0;

    // Calculate subscription growth by month (last 6 months)
    const monthsData: Record<string, { signups: number; cancellations: number }> = {};
    const now = new Date();
    
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toLocaleDateString("en-US", { year: "numeric", month: "short" });
      monthsData[monthKey] = { signups: 0, cancellations: 0 };
    }

    // Count signups and cancellations per month
    subscriptions?.forEach(sub => {
      if (sub.created_at) {
        const createdDate = new Date(sub.created_at);
        const monthKey = createdDate.toLocaleDateString("en-US", { year: "numeric", month: "short" });
        if (monthsData[monthKey] !== undefined) {
          monthsData[monthKey].signups++;
        }
      }
      
      // Count as cancellation if status is canceled and updated recently
      if (sub.status === "canceled" && sub.updated_at) {
        const updatedDate = new Date(sub.updated_at);
        const monthKey = updatedDate.toLocaleDateString("en-US", { year: "numeric", month: "short" });
        if (monthsData[monthKey] !== undefined) {
          monthsData[monthKey].cancellations++;
        }
      }
    });

    const subscriptionGrowth = Object.entries(monthsData).map(([month, data]) => ({
      month,
      signups: data.signups,
      cancellations: data.cancellations,
      net: data.signups - data.cancellations
    }));

    // Fetch cart items count
    const { count: totalCartItems } = await supabase
      .from("cart_items")
      .select("*", { count: "exact", head: true });

    // Fetch automations count
    const { count: totalAutomations } = await supabase
      .from("automations")
      .select("*", { count: "exact", head: true });

    // Fetch popular automations
    const { data: automationUsage } = await supabase
      .from("automation_usage")
      .select("automation_name");

    const automationCounts = automationUsage?.reduce((acc, item) => {
      acc[item.automation_name] = (acc[item.automation_name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    const popularAutomations = Object.entries(automationCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // Fetch affiliate metrics
    const { data: affiliates } = await supabase
      .from("affiliates")
      .select("status, total_referrals, total_earnings, pending_earnings, paid_earnings, created_at");

    const { data: commissions } = await supabase
      .from("affiliate_commissions")
      .select("status, commission_amount, created_at, paid_at");

    const totalAffiliates = affiliates?.length || 0;
    const activeAffiliates = affiliates?.filter(a => a.status === "active").length || 0;
    const pendingAffiliates = affiliates?.filter(a => a.status === "pending").length || 0;
    const totalReferrals = affiliates?.reduce((sum, a) => sum + (a.total_referrals || 0), 0) || 0;

    const totalCommissions = commissions?.reduce((sum, c) => sum + Number(c.commission_amount || 0), 0) || 0;
    const pendingCommissions = commissions?.filter(c => c.status === "pending").reduce((sum, c) => sum + Number(c.commission_amount || 0), 0) || 0;
    const paidCommissions = commissions?.filter(c => c.status === "paid").reduce((sum, c) => sum + Number(c.commission_amount || 0), 0) || 0;

    // Calculate commissions by month (last 6 months)
    const commissionsMonthData: Record<string, { earned: number; paid: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toLocaleDateString("en-US", { year: "numeric", month: "short" });
      commissionsMonthData[monthKey] = { earned: 0, paid: 0 };
    }

    commissions?.forEach(c => {
      if (c.created_at) {
        const createdDate = new Date(c.created_at);
        const monthKey = createdDate.toLocaleDateString("en-US", { year: "numeric", month: "short" });
        if (commissionsMonthData[monthKey] !== undefined) {
          commissionsMonthData[monthKey].earned += Number(c.commission_amount || 0);
        }
      }
      if (c.paid_at) {
        const paidDate = new Date(c.paid_at);
        const monthKey = paidDate.toLocaleDateString("en-US", { year: "numeric", month: "short" });
        if (commissionsMonthData[monthKey] !== undefined) {
          commissionsMonthData[monthKey].paid += Number(c.commission_amount || 0);
        }
      }
    });

    const commissionsByMonth = Object.entries(commissionsMonthData).map(([month, data]) => ({
      month,
      earned: data.earned,
      paid: data.paid
    }));

    const affiliateMetrics: AffiliateMetrics = {
      totalAffiliates,
      activeAffiliates,
      pendingAffiliates,
      totalCommissions,
      pendingCommissions,
      paidCommissions,
      totalReferrals,
      commissionsByMonth,
    };

    return {
      totalUsers: totalUsers || 0,
      totalSubscriptions,
      totalRevenue,
      activeSubscriptions,
      cancelledSubscriptions,
      totalCartItems: totalCartItems || 0,
      totalAutomations: totalAutomations || 0,
      popularAutomations,
      subscriptionGrowth,
      affiliateMetrics,
    };
  } catch (error) {
    console.error("Error fetching database metrics:", error);
    return {
      totalUsers: 0,
      totalSubscriptions: 0,
      totalRevenue: 0,
      activeSubscriptions: 0,
      cancelledSubscriptions: 0,
      totalCartItems: 0,
      totalAutomations: 0,
      popularAutomations: [],
      subscriptionGrowth: [],
      affiliateMetrics: {
        totalAffiliates: 0,
        activeAffiliates: 0,
        pendingAffiliates: 0,
        totalCommissions: 0,
        pendingCommissions: 0,
        paidCommissions: 0,
        totalReferrals: 0,
        commissionsByMonth: [],
      },
    };
  }
};
