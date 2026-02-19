import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from "recharts";
import { TrendingUp, Clock, Users, Target, BarChart3 } from "lucide-react";

const COLORS = ["#a78bfa", "#4ade80", "#fbbf24", "#f87171", "#22d3ee", "#fb923c"];

export default function Analytics() {
  const [hourlyData, setHourlyData] = useState([]);
  const [dailyData, setDailyData] = useState([]);
  const [profileData, setProfileData] = useState([]);
  const [brandData, setBrandData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const { data: allComments } = await supabase.from("comment_reports").select("timestamp, profile, sheet");

      if (!allComments || allComments.length === 0) { setLoading(false); return; }

      // Hourly distribution
      const hourCounts = Array(24).fill(0);
      allComments.forEach(c => {
        if (c.timestamp) {
          const h = new Date(c.timestamp).getHours();
          hourCounts[h]++;
        }
      });
      setHourlyData(hourCounts.map((count, hour) => ({
        hour: `${hour.toString().padStart(2, "0")}:00`,
        comments: count,
        label: hour >= 6 && hour < 12 ? "Morning" : hour >= 12 && hour < 18 ? "Afternoon" : hour >= 18 && hour < 22 ? "Evening" : "Night"
      })));

      // Daily trend (last 14 days)
      const dailyCounts = {};
      const now = new Date();
      for (let i = 13; i >= 0; i--) {
        const d = new Date(now); d.setDate(d.getDate() - i);
        dailyCounts[d.toISOString().split("T")[0]] = 0;
      }
      allComments.forEach(c => {
        if (c.timestamp) {
          const day = new Date(c.timestamp).toISOString().split("T")[0];
          if (dailyCounts[day] !== undefined) dailyCounts[day]++;
        }
      });
      setDailyData(Object.entries(dailyCounts).map(([date, count]) => ({
        date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        comments: count
      })));

      // Profile performance
      const profileCounts = {};
      allComments.forEach(c => {
        if (c.profile) profileCounts[c.profile] = (profileCounts[c.profile] || 0) + 1;
      });
      const sorted = Object.entries(profileCounts).sort((a, b) => b[1] - a[1]).slice(0, 15);
      setProfileData(sorted.map(([profile, count]) => ({ profile, comments: count, avg: Math.round(count / 14) })));

      // Brand breakdown
      const brandCounts = {};
      allComments.forEach(c => {
        if (c.sheet) brandCounts[c.sheet] = (brandCounts[c.sheet] || 0) + 1;
      });
      setBrandData(Object.entries(brandCounts).map(([name, value]) => ({ name, value })));

    } catch (err) { console.error("Analytics error:", err); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  const bestHour = hourlyData.length ? hourlyData.reduce((a, b) => a.comments > b.comments ? a : b) : null;
  const totalComments = profileData.reduce((s, p) => s + p.comments, 0);
  const avgPerProfile = profileData.length ? Math.round(totalComments / profileData.length) : 0;

  if (loading) return <div className="flex items-center justify-center py-20 text-zinc-500"><BarChart3 className="w-6 h-6 animate-spin mr-2" />Loading analytics...</div>;

  return (
    <div data-testid="analytics-tab" className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
          <Target className="w-5 h-5 text-violet-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-white">{totalComments.toLocaleString()}</div>
          <div className="text-xs text-zinc-500">Total Comments</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
          <Users className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-white">{profileData.length}</div>
          <div className="text-xs text-zinc-500">Active Profiles</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
          <TrendingUp className="w-5 h-5 text-blue-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-white">{avgPerProfile.toLocaleString()}</div>
          <div className="text-xs text-zinc-500">Avg per Profile</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
          <Clock className="w-5 h-5 text-amber-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-amber-400">{bestHour?.hour || "-"}</div>
          <div className="text-xs text-zinc-500">Peak Hour</div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Trend */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4">Comments Trend (14 Days)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={dailyData}>
              <defs><linearGradient id="grad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3}/><stop offset="95%" stopColor="#a78bfa" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 11 }} />
              <YAxis tick={{ fill: "#71717a", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, color: "#f4f4f5" }} />
              <Area type="monotone" dataKey="comments" stroke="#a78bfa" fill="url(#grad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Hourly Distribution */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4">Best Posting Hours</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="hour" tick={{ fill: "#71717a", fontSize: 10 }} interval={2} />
              <YAxis tick={{ fill: "#71717a", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, color: "#f4f4f5" }} />
              <Bar dataKey="comments" fill="#4ade80" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Brand Pie Chart */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4">Brand Distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={brandData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                {brandData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, color: "#f4f4f5" }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 justify-center mt-2">
            {brandData.map((b, i) => (
              <div key={b.name} className="flex items-center gap-1 text-xs">
                <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="text-zinc-400">{b.name}</span>
                <span className="text-zinc-500">({b.value})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Profile Performance */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 col-span-1 lg:col-span-2">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4">Profile Performance (Top 15)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={profileData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis type="number" tick={{ fill: "#71717a", fontSize: 11 }} />
              <YAxis dataKey="profile" type="category" width={60} tick={{ fill: "#71717a", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, color: "#f4f4f5" }} />
              <Bar dataKey="comments" fill="#22d3ee" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
