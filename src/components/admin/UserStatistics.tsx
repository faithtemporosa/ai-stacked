import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, UserCheck, UserPlus, TrendingUp } from "lucide-react";

interface Statistics {
  totalUsers: number;
  totalAdmins: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
}

export function UserStatistics() {
  const [stats, setStats] = useState<Statistics>({
    totalUsers: 0,
    totalAdmins: 0,
    newUsersThisWeek: 0,
    newUsersThisMonth: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const { count: totalUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      const { data: adminRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      const { count: newUsersThisWeek } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", weekAgo.toISOString());

      const { count: newUsersThisMonth } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", monthAgo.toISOString());

      setStats({
        totalUsers: totalUsers || 0,
        totalAdmins: adminRoles?.length || 0,
        newUsersThisWeek: newUsersThisWeek || 0,
        newUsersThisMonth: newUsersThisMonth || 0,
      });
    } catch (error) {
      console.error("Error fetching statistics:", error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: "Total Users",
      value: stats.totalUsers,
      icon: Users,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      title: "Admins",
      value: stats.totalAdmins,
      icon: UserCheck,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
    },
    {
      title: "This Week",
      value: stats.newUsersThisWeek,
      icon: TrendingUp,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      title: "This Month",
      value: stats.newUsersThisMonth,
      icon: UserPlus,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
    },
  ];

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-card border border-border rounded-lg p-6 animate-pulse">
            <div className="h-4 w-20 bg-muted rounded mb-3"></div>
            <div className="h-8 w-12 bg-muted rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat) => (
        <div key={stat.title} className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">{stat.title}</span>
            <div className={`p-2 rounded-lg ${stat.bg}`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
          </div>
          <p className="text-3xl font-semibold text-foreground">{stat.value}</p>
        </div>
      ))}
    </div>
  );
}
