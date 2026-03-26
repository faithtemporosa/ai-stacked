// @ts-nocheck
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Activity, Clock, Globe } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface LoginActivity {
  id: string;
  user_id: string;
  login_at: string;
  country: string | null;
  city: string | null;
  browser: string | null;
  os: string | null;
}

interface ActivityWithEmail extends LoginActivity {
  email: string;
}

interface GeographicStats {
  country: string;
  count: number;
}

export function ActiveUsersWidget() {
  const [activeUsers, setActiveUsers] = useState(0);
  const [recentActivity, setRecentActivity] = useState<ActivityWithEmail[]>([]);
  const [geoStats, setGeoStats] = useState<GeographicStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    subscribeToPresence();
    subscribeToLoginActivity();
  }, []);

  const subscribeToPresence = () => {
    const channel = supabase.channel("admin-presence");

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setActiveUsers(Object.keys(state).length);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const subscribeToLoginActivity = () => {
    const channel = supabase
      .channel("login-activity-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "login_activity",
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchData = async () => {
    try {
      const { data: activities } = await supabase
        .from("login_activity")
        .select("*")
        .order("login_at", { ascending: false })
        .limit(10);

      if (activities) {
        const userIds = [...new Set(activities.map((a) => a.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, email")
          .in("user_id", userIds);

        const emailMap = new Map(profiles?.map((p) => [p.user_id, p.email || "Unknown"]));

        const activitiesWithEmail = activities.map((activity) => ({
          ...activity,
          email: emailMap.get(activity.user_id) || "Unknown",
        }));

        setRecentActivity(activitiesWithEmail);
      }

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: geoData } = await supabase
        .from("login_activity")
        .select("country")
        .gte("login_at", thirtyDaysAgo.toISOString())
        .not("country", "is", null);

      if (geoData) {
        const countryCount = geoData.reduce((acc, item) => {
          const country = item.country || "Unknown";
          acc[country] = (acc[country] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const stats = Object.entries(countryCount)
          .map(([country, count]) => ({ country, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        setGeoStats(stats);
      }
    } catch (error) {
      console.error("Error fetching activity data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg p-6 animate-pulse">
        <div className="h-6 w-48 bg-muted rounded mb-4"></div>
        <div className="h-32 bg-muted rounded"></div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Active Users */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground">Active Now</span>
          <div className="p-2 rounded-lg bg-emerald-500/10">
            <Activity className="h-4 w-4 text-emerald-400" />
          </div>
        </div>
        <p className="text-3xl font-semibold text-foreground">{activeUsers}</p>
        <p className="text-xs text-muted-foreground mt-1">Online users</p>
      </div>

      {/* Recent Activity */}
      <div className="bg-card border border-border rounded-lg p-6 lg:col-span-2">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Recent Logins</span>
        </div>
        <div className="space-y-3">
          {recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent activity</p>
          ) : (
            recentActivity.slice(0, 4).map((activity) => (
              <div key={activity.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground">{activity.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {activity.city && activity.country
                      ? `${activity.city}, ${activity.country}`
                      : activity.country || "Unknown"}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(activity.login_at), { addSuffix: true })}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Geographic Distribution */}
      {geoStats.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-6 lg:col-span-3">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Top Locations</span>
            <span className="text-xs text-muted-foreground">(30 days)</span>
          </div>
          <div className="flex flex-wrap gap-3">
            {geoStats.map((stat) => (
              <div key={stat.country} className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
                <span className="text-lg font-semibold text-foreground">{stat.count}</span>
                <span className="text-sm text-muted-foreground">{stat.country}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
