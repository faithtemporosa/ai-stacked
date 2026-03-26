import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const getAllowedOrigin = () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  return supabaseUrl.replace('.supabase.co', '.lovable.app').replace('https://api.', 'https://');
};

const corsHeaders = {
  'Access-Control-Allow-Origin': getAllowedOrigin(),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting weekly analytics data collection and webhook send');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7);

    // Fetch all required data
    console.log('Fetching database metrics...');
    const [
      { count: totalUsers },
      { count: totalSubscriptions },
      { data: activeSubsData },
      { data: cancelledSubsData },
      { count: totalCartItems },
      { count: totalAutomations },
      { data: automationUsage },
      { data: allSubscriptions },
      { data: analyticsEvents },
      { data: affiliates },
      { data: commissions },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('subscriptions').select('*', { count: 'exact', head: true }),
      supabase.from('subscriptions').select('*').eq('status', 'active'),
      supabase.from('subscriptions').select('*').in('status', ['canceled', 'cancelled']),
      supabase.from('cart_items').select('*', { count: 'exact', head: true }),
      supabase.from('automations').select('*', { count: 'exact', head: true }),
      supabase.from('automation_usage').select('automation_name'),
      supabase.from('subscriptions').select('created_at, updated_at, status'),
      supabase.from('analytics_events').select('*').gte('created_at', startDate.toISOString()).lte('created_at', endDate.toISOString()),
      supabase.from('affiliates').select('status, total_referrals, total_earnings, pending_earnings, paid_earnings, created_at'),
      supabase.from('affiliate_commissions').select('status, commission_amount, created_at, paid_at'),
    ]);

    const activeSubscriptions = activeSubsData?.length || 0;
    const cancelledSubscriptions = cancelledSubsData?.length || 0;

    // Calculate web analytics
    const uniqueVisitors = new Set(analyticsEvents?.map((e: any) => e.session_id) || []).size;
    const totalPageviews = analyticsEvents?.length || 0;
    const pagesPerVisit = uniqueVisitors > 0 ? totalPageviews / uniqueVisitors : 0;
    
    const sessions: Record<string, any[]> = {};
    analyticsEvents?.forEach((event: any) => {
      if (!sessions[event.session_id]) {
        sessions[event.session_id] = [];
      }
      sessions[event.session_id].push(event);
    });
    
    let totalDuration = 0;
    let bounces = 0;
    Object.values(sessions).forEach((events) => {
      if (events.length === 1) {
        bounces++;
      }
      if (events.length > 1) {
        const sorted = events.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        const duration = 
          new Date(sorted[sorted.length - 1].created_at).getTime() - 
          new Date(sorted[0].created_at).getTime();
        totalDuration += duration / 1000;
      }
    });
    
    const avgSessionDuration = uniqueVisitors > 0 ? Math.round(totalDuration / uniqueVisitors) : 0;
    const bounceRate = uniqueVisitors > 0 ? Math.round((bounces / uniqueVisitors) * 100) : 0;

    // Top pages
    const pageCounts: Record<string, number> = {};
    analyticsEvents?.forEach((event: any) => {
      pageCounts[event.page_path] = (pageCounts[event.page_path] || 0) + 1;
    });
    const topPages = Object.entries(pageCounts)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    // Traffic sources
    const sourceCounts: Record<string, number> = {};
    analyticsEvents?.forEach((event: any) => {
      const source = event.referrer || 'Direct';
      sourceCounts[source] = (sourceCounts[source] || 0) + 1;
    });
    const trafficSources = Object.entries(sourceCounts)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    // Device types
    const deviceCounts: Record<string, number> = {};
    analyticsEvents?.forEach((event: any) => {
      const device = event.device_type || 'Unknown';
      deviceCounts[device] = (deviceCounts[device] || 0) + 1;
    });
    const deviceTypes = Object.entries(deviceCounts)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);

    // Top countries
    const countryCounts: Record<string, number> = {};
    analyticsEvents?.forEach((event: any) => {
      const country = event.country || 'Unknown';
      countryCounts[country] = (countryCounts[country] || 0) + 1;
    });
    const topCountries = Object.entries(countryCounts)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    // Calculate popular automations
    const automationCounts: Record<string, number> = {};
    automationUsage?.forEach((usage: { automation_name: string }) => {
      automationCounts[usage.automation_name] = (automationCounts[usage.automation_name] || 0) + 1;
    });
    const popularAutomations = Object.entries(automationCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate subscription growth (last 6 months)
    const subscriptionGrowth = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date();
      monthDate.setMonth(monthDate.getMonth() - i);
      const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

      const signups = allSubscriptions?.filter((sub: { created_at: string }) => {
        const createdAt = new Date(sub.created_at);
        return createdAt >= monthStart && createdAt <= monthEnd;
      }).length || 0;

      const cancellations = allSubscriptions?.filter((sub: { updated_at: string; status: string }) => {
        const updatedAt = new Date(sub.updated_at);
        return (
          updatedAt >= monthStart &&
          updatedAt <= monthEnd &&
          (sub.status === 'canceled' || sub.status === 'cancelled')
        );
      }).length || 0;

      subscriptionGrowth.push({
        month: monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        signups,
        cancellations,
        net: signups - cancellations,
      });
    }

    // Daily trend data
    const dailyTrend = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date();
      day.setDate(day.getDate() - i);
      const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
      const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);

      const dayEvents = analyticsEvents?.filter((e: any) => {
        const eventDate = new Date(e.created_at);
        return eventDate >= dayStart && eventDate < dayEnd;
      }) || [];

      const dayVisitors = new Set(dayEvents.map((e: any) => e.session_id)).size;
      const dayPageviews = dayEvents.length;

      dailyTrend.push({
        date: day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        visitors: dayVisitors,
        pageviews: dayPageviews,
      });
    }

    console.log('All metrics collected successfully');

    // Create comprehensive report matching dashboard PDF
    const reportData = {
      type: 'weekly_analytics_pdf_data',
      generated_at: new Date().toISOString(),
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        start_formatted: startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        end_formatted: endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      },
      // Database Metrics Section
      database_metrics: {
        total_users: totalUsers || 0,
        total_subscriptions: totalSubscriptions || 0,
        active_subscriptions: activeSubscriptions,
        cancelled_subscriptions: cancelledSubscriptions,
        total_revenue: 0,
        cart_items: totalCartItems || 0,
        total_automations: totalAutomations || 0,
      },
      // Web Analytics Summary Section
      web_analytics: {
        total_visitors: uniqueVisitors,
        total_pageviews: totalPageviews,
        pages_per_visit: pagesPerVisit.toFixed(2),
        avg_session_duration: avgSessionDuration,
        bounce_rate: bounceRate,
      },
      // Daily Trend Section
      daily_trend: dailyTrend,
      // Subscription Growth Section
      subscription_growth: subscriptionGrowth,
      // Popular Automations Section
      popular_automations: popularAutomations,
      // Affiliate Commissions Section
      affiliate_metrics: {
        total_affiliates: affiliates?.length || 0,
        active_affiliates: affiliates?.filter((a: any) => a.status === 'active').length || 0,
        pending_affiliates: affiliates?.filter((a: any) => a.status === 'pending').length || 0,
        total_referrals: affiliates?.reduce((sum: number, a: any) => sum + (a.total_referrals || 0), 0) || 0,
        total_commissions: commissions?.reduce((sum: number, c: any) => sum + Number(c.commission_amount || 0), 0) || 0,
        pending_commissions: commissions?.filter((c: any) => c.status === 'pending').reduce((sum: number, c: any) => sum + Number(c.commission_amount || 0), 0) || 0,
        paid_commissions: commissions?.filter((c: any) => c.status === 'paid').reduce((sum: number, c: any) => sum + Number(c.commission_amount || 0), 0) || 0,
      },
      // Top Pages Section
      top_pages: topPages,
      // Traffic Sources Section
      traffic_sources: trafficSources,
      // Device Types Section
      device_types: deviceTypes,
      // Top Countries Section
      top_countries: topCountries,
    };

    console.log('Sending comprehensive PDF data to webhook...');
    
    // Send to n8n webhook - webhook should generate PDF from this data
    const webhookUrl = 'https://faithtemporosa.app.n8n.cloud/webhook/51c33549-c25b-44b1-9c63-470c7222b2c4';
    
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reportData),
    });

    if (!webhookResponse.ok) {
      throw new Error(`Webhook failed with status: ${webhookResponse.status}`);
    }

    console.log('Successfully sent complete analytics data to webhook');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Weekly analytics sent to webhook with all dashboard sections',
        sections_included: [
          'Database Metrics',
          'Web Analytics Summary',
          'Daily Trend',
          'Subscription Growth',
          'Popular Automations',
          'Affiliate Commissions',
          'Top Pages',
          'Traffic Sources',
          'Device Types',
          'Top Countries'
        ],
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in send-weekly-analytics function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
