// @ts-nocheck
import { useEffect, useState } from "react";
import { supabase } from "../../integrations/supabase/client";
import { DollarSign, CreditCard, TrendingUp, Users } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

interface RevenueStats {
  totalRevenue: number;
  activeSubscriptions: number;
  monthlyRecurring: number;
  averageOrderValue: number;
}

interface MonthlyData {
  month: string;
  revenue: number;
  subscriptions: number;
}

export function RevenueOverview() {
  const [stats, setStats] = useState<RevenueStats>({
    totalRevenue: 0,
    activeSubscriptions: 0,
    monthlyRecurring: 0,
    averageOrderValue: 0,
  });
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRevenueData();

    // Subscribe to real-time changes on subscriptions table
    const channel = supabase
      .channel('subscriptions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions',
        },
        () => {
          fetchRevenueData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchRevenueData = async () => {
    try {
      // Fetch all subscriptions
      const { data: subscriptions, error } = await supabase
        .from("subscriptions")
        .select("*");

      if (error) throw error;

      // Calculate stats
      const activeSubscriptions = subscriptions?.filter(s => s.status === 'active').length || 0;
      const totalRevenue = subscriptions?.reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0;
      const averageOrderValue = subscriptions && subscriptions.length > 0 
        ? totalRevenue / subscriptions.length 
        : 0;

      // Calculate monthly recurring (active subscriptions * average)
      const monthlyRecurring = activeSubscriptions * (averageOrderValue || 99);

      setStats({
        totalRevenue,
        activeSubscriptions,
        monthlyRecurring,
        averageOrderValue,
      });

      // Group by month for chart
      const monthlyMap = new Map<string, { revenue: number; subscriptions: number }>();
      
      subscriptions?.forEach(sub => {
        if (sub.created_at) {
          const date = new Date(sub.created_at);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          const monthName = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
          
          const existing = monthlyMap.get(monthKey) || { revenue: 0, subscriptions: 0 };
          monthlyMap.set(monthKey, {
            revenue: existing.revenue + (sub.total_amount || 0),
            subscriptions: existing.subscriptions + 1,
          });
        }
      });

      // Convert to array and sort
      const sortedMonths = Array.from(monthlyMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-6) // Last 6 months
        .map(([key, data]) => {
          const [year, month] = key.split('-');
          const date = new Date(parseInt(year), parseInt(month) - 1);
          return {
            month: date.toLocaleDateString('en-US', { month: 'short' }),
            revenue: data.revenue,
            subscriptions: data.subscriptions,
          };
        });

      setMonthlyData(sortedMonths);
    } catch (error) {
      console.error("Error fetching revenue data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const statCards = [
    {
      title: "Total Revenue",
      value: formatCurrency(stats.totalRevenue),
      icon: DollarSign,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      title: "Active Subscriptions",
      value: stats.activeSubscriptions,
      icon: Users,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      title: "Est. Monthly Revenue",
      value: formatCurrency(stats.monthlyRecurring),
      icon: TrendingUp,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
    },
    {
      title: "Avg. Order Value",
      value: formatCurrency(stats.averageOrderValue),
      icon: CreditCard,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-6 animate-pulse">
              <div className="h-4 w-20 bg-muted rounded mb-3"></div>
              <div className="h-8 w-24 bg-muted rounded"></div>
            </div>
          ))}
        </div>
        <div className="bg-card border border-border rounded-xl p-6 animate-pulse">
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <div key={stat.title} className="bg-card border border-border rounded-xl p-6">
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

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue Chart */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-lg font-medium text-foreground mb-4">Revenue Trend</h3>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="month" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))'
                  }}
                  formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                />
                <Bar 
                  dataKey="revenue" 
                  fill="hsl(var(--primary))" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
              No revenue data available
            </div>
          )}
        </div>

        {/* Subscriptions Chart */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-lg font-medium text-foreground mb-4">New Subscriptions</h3>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="month" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))'
                  }}
                  formatter={(value: number) => [value, 'Subscriptions']}
                />
                <Line 
                  type="monotone" 
                  dataKey="subscriptions" 
                  stroke="hsl(var(--accent))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--accent))', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
              No subscription data available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
