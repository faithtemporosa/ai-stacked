// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

export interface AnalyticsData {
  timeSeries: {
    visitors: { total: number; data: Array<{ date: string; value: number }> };
    pageviews: { total: number; data: Array<{ date: string; value: number }> };
    pageviewsPerVisit: { total: number; data: Array<{ date: string; value: number }> };
    sessionDuration: { total: number; data: Array<{ date: string; value: number }> };
    bounceRate: { total: number; data: Array<{ date: string; value: number }> };
  };
  lists: {
    page: { data: Array<{ label: string; value: number }> };
    source: { data: Array<{ label: string; value: number }> };
    device: { data: Array<{ label: string; value: number }> };
    country: { data: Array<{ label: string; value: number }> };
  };
}

export const fetchAnalyticsData = async (days: number = 7): Promise<AnalyticsData> => {
  const startDate = startOfDay(subDays(new Date(), days));
  const endDate = endOfDay(new Date());

  // Fetch all analytics events within the date range
  const { data: events, error } = await supabase
    .from("analytics_events")
    .select("*")
    .gte("created_at", startDate.toISOString())
    .lte("created_at", endDate.toISOString())
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching analytics:", error);
    return getEmptyAnalytics(days);
  }

  const analyticsEvents = events || [];

  // Generate date range for time series
  const dateRange: string[] = [];
  for (let i = days; i >= 0; i--) {
    dateRange.push(format(subDays(new Date(), i), "yyyy-MM-dd"));
  }

  // Group events by date
  const eventsByDate = new Map<string, typeof analyticsEvents>();
  dateRange.forEach(date => eventsByDate.set(date, []));
  
  analyticsEvents.forEach(event => {
    const date = format(new Date(event.created_at), "yyyy-MM-dd");
    if (eventsByDate.has(date)) {
      eventsByDate.get(date)!.push(event);
    }
  });

  // Calculate unique visitors per day (by session_id)
  const visitorsData = dateRange.map(date => {
    const dayEvents = eventsByDate.get(date) || [];
    const uniqueSessions = new Set(dayEvents.map(e => e.session_id));
    return { date, value: uniqueSessions.size };
  });

  // Calculate pageviews per day
  const pageviewsData = dateRange.map(date => {
    const dayEvents = eventsByDate.get(date) || [];
    return { date, value: dayEvents.filter(e => e.event_type === "pageview").length };
  });

  // Calculate pageviews per visit
  const pageviewsPerVisitData = dateRange.map(date => {
    const dayEvents = eventsByDate.get(date) || [];
    const uniqueSessions = new Set(dayEvents.map(e => e.session_id)).size;
    const pageviews = dayEvents.filter(e => e.event_type === "pageview").length;
    return { date, value: uniqueSessions > 0 ? Math.round((pageviews / uniqueSessions) * 100) / 100 : 0 };
  });

  // Calculate totals
  const totalUniqueVisitors = new Set(analyticsEvents.map(e => e.session_id)).size;
  const totalPageviews = analyticsEvents.filter(e => e.event_type === "pageview").length;
  const avgPageviewsPerVisit = totalUniqueVisitors > 0 
    ? Math.round((totalPageviews / totalUniqueVisitors) * 100) / 100 
    : 0;

  // Page breakdown
  const pageBreakdown = new Map<string, number>();
  analyticsEvents.forEach(event => {
    if (event.event_type === "pageview") {
      const count = pageBreakdown.get(event.page_path) || 0;
      pageBreakdown.set(event.page_path, count + 1);
    }
  });
  const pageData = Array.from(pageBreakdown.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  // Source breakdown (referrer)
  const sourceBreakdown = new Map<string, number>();
  analyticsEvents.forEach(event => {
    const source = event.referrer || "Direct";
    const cleanSource = source === "" ? "Direct" : extractDomain(source);
    const count = sourceBreakdown.get(cleanSource) || 0;
    sourceBreakdown.set(cleanSource, count + 1);
  });
  const sourceData = Array.from(sourceBreakdown.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  // Device breakdown
  const deviceBreakdown = new Map<string, number>();
  analyticsEvents.forEach(event => {
    const device = event.device_type || "Unknown";
    const count = deviceBreakdown.get(device) || 0;
    deviceBreakdown.set(device, count + 1);
  });
  const deviceData = Array.from(deviceBreakdown.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  // Country breakdown
  const countryBreakdown = new Map<string, number>();
  analyticsEvents.forEach(event => {
    const country = event.country || "Unknown";
    const count = countryBreakdown.get(country) || 0;
    countryBreakdown.set(country, count + 1);
  });
  const countryData = Array.from(countryBreakdown.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  // Estimate bounce rate (sessions with only 1 pageview)
  const sessionPageviews = new Map<string, number>();
  analyticsEvents.forEach(event => {
    if (event.event_type === "pageview") {
      const count = sessionPageviews.get(event.session_id) || 0;
      sessionPageviews.set(event.session_id, count + 1);
    }
  });
  const totalSessions = sessionPageviews.size;
  const bouncedSessions = Array.from(sessionPageviews.values()).filter(count => count === 1).length;
  const bounceRate = totalSessions > 0 ? Math.round((bouncedSessions / totalSessions) * 100) : 0;

  const bounceRateData = dateRange.map(date => {
    const dayEvents = eventsByDate.get(date) || [];
    const daySessions = new Map<string, number>();
    dayEvents.forEach(e => {
      if (e.event_type === "pageview") {
        const count = daySessions.get(e.session_id) || 0;
        daySessions.set(e.session_id, count + 1);
      }
    });
    const dayTotal = daySessions.size;
    const dayBounced = Array.from(daySessions.values()).filter(c => c === 1).length;
    return { date, value: dayTotal > 0 ? Math.round((dayBounced / dayTotal) * 100) : 0 };
  });

  return {
    timeSeries: {
      visitors: { total: totalUniqueVisitors, data: visitorsData },
      pageviews: { total: totalPageviews, data: pageviewsData },
      pageviewsPerVisit: { total: avgPageviewsPerVisit, data: pageviewsPerVisitData },
      sessionDuration: { total: 0, data: dateRange.map(date => ({ date, value: 0 })) }, // Not tracked
      bounceRate: { total: bounceRate, data: bounceRateData },
    },
    lists: {
      page: { data: pageData },
      source: { data: sourceData },
      device: { data: deviceData },
      country: { data: countryData },
    },
  };
};

function extractDomain(url: string): string {
  try {
    if (url === "Direct" || url === "") return "Direct";
    const urlObj = new URL(url);
    return urlObj.hostname.replace("www.", "");
  } catch {
    return url;
  }
}

function getEmptyAnalytics(days: number): AnalyticsData {
  const dateRange: string[] = [];
  for (let i = days; i >= 0; i--) {
    dateRange.push(format(subDays(new Date(), i), "yyyy-MM-dd"));
  }
  const emptyData = dateRange.map(date => ({ date, value: 0 }));

  return {
    timeSeries: {
      visitors: { total: 0, data: emptyData },
      pageviews: { total: 0, data: emptyData },
      pageviewsPerVisit: { total: 0, data: emptyData },
      sessionDuration: { total: 0, data: emptyData },
      bounceRate: { total: 0, data: emptyData },
    },
    lists: {
      page: { data: [] },
      source: { data: [] },
      device: { data: [] },
      country: { data: [] },
    },
  };
}
