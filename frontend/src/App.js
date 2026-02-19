import { useState, useEffect, useCallback, useRef } from "react";
import "./App.css";
import { supabase } from "./lib/supabase";
import {
  MessageCircle,
  TrendingUp,
  Calendar,
  RefreshCw,
  ExternalLink,
  Sparkles,
  BarChart3,
  Clock,
  Upload,
  Download,
  Terminal,
  Play,
  Pause,
  Send,
  Video,
  CalendarClock
} from "lucide-react";

const REFRESH_INTERVAL = 10000;

function App() {
  const [activeTab, setActiveTab] = useState("comments");
  const [stats, setStats] = useState(null);
  const [reports, setReports] = useState([]);
  const [totalReports, setTotalReports] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [logs, setLogs] = useState([]);
  const [automationStatus, setAutomationStatus] = useState(null);
  const [logsUpdatedAt, setLogsUpdatedAt] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dmReports, setDmReports] = useState([]);
  const [dmTotal, setDmTotal] = useState(0);
  const [postReports, setPostReports] = useState([]);
  const [postTotal, setPostTotal] = useState(0);
  const fileInputRef = useRef(null);
  const logsContainerRef = useRef(null);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const fetchStats = useCallback(async () => {
    try {
      const { count: totalCount } = await supabase
        .from('comment_reports').select('*', { count: 'exact', head: true });
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const { count: todayCount } = await supabase
        .from('comment_reports').select('*', { count: 'exact', head: true })
        .gte('timestamp', today.toISOString());
      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
      const { count: weekCount } = await supabase
        .from('comment_reports').select('*', { count: 'exact', head: true })
        .gte('timestamp', weekAgo.toISOString());
      const monthAgo = new Date(); monthAgo.setMonth(monthAgo.getMonth() - 1);
      const { count: monthCount } = await supabase
        .from('comment_reports').select('*', { count: 'exact', head: true })
        .gte('timestamp', monthAgo.toISOString());
      const { data: profilesData } = await supabase.from('comment_reports').select('profile');
      const uniqueProfiles = new Set(profilesData?.map(r => r.profile) || []).size;
      const { data: videosData } = await supabase.from('comment_reports').select('video_id');
      const uniqueVideos = new Set(videosData?.map(r => r.video_id) || []).size;
      const { data: brandData } = await supabase.from('comment_reports').select('sheet');
      const byBrand = {};
      brandData?.forEach(r => { if (r.sheet) byBrand[r.sheet] = (byBrand[r.sheet] || 0) + 1; });
      const { data: todayBrandData } = await supabase
        .from('comment_reports').select('sheet').gte('timestamp', today.toISOString());
      const todayByBrand = {};
      todayBrandData?.forEach(r => { if (r.sheet) todayByBrand[r.sheet] = (todayByBrand[r.sheet] || 0) + 1; });
      // DM stats
      const { count: dmCount } = await supabase
        .from('dm_reports').select('*', { count: 'exact', head: true });
      const { count: dmTodayCount } = await supabase
        .from('dm_reports').select('*', { count: 'exact', head: true })
        .gte('timestamp', today.toISOString());
      // Post stats
      const { count: postCount } = await supabase
        .from('post_reports').select('*', { count: 'exact', head: true });
      const { count: postTodayCount } = await supabase
        .from('post_reports').select('*', { count: 'exact', head: true })
        .gte('timestamp', today.toISOString());

      setStats({
        total_comments: totalCount || 0,
        today_comments: todayCount || 0,
        week_comments: weekCount || 0,
        month_comments: monthCount || 0,
        unique_profiles: uniqueProfiles,
        unique_videos: uniqueVideos,
        by_brand: byBrand,
        today_by_brand: todayByBrand,
        dm_total: dmCount || 0,
        dm_today: dmTodayCount || 0,
        post_total: postCount || 0,
        post_today: postTodayCount || 0
      });
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  }, []);

  const fetchReports = useCallback(async () => {
    try {
      let query = supabase.from('comment_reports')
        .select('*', { count: 'exact' }).order('timestamp', { ascending: false }).limit(100);
      if (startDate) query = query.gte('timestamp', new Date(startDate).toISOString());
      if (endDate) { const end = new Date(endDate); end.setHours(23, 59, 59, 999); query = query.lte('timestamp', end.toISOString()); }
      if (!startDate && !endDate) {
        if (filter === "today") { const t = new Date(); t.setHours(0,0,0,0); query = query.gte('timestamp', t.toISOString()); }
        else if (filter === "week") { const w = new Date(); w.setDate(w.getDate()-7); query = query.gte('timestamp', w.toISOString()); }
        else if (filter === "month") { const m = new Date(); m.setMonth(m.getMonth()-1); query = query.gte('timestamp', m.toISOString()); }
      }
      const { data, count, error } = await query;
      if (error) throw error;
      setReports(data || []); setTotalReports(count || 0); setLastUpdated(new Date());
    } catch (err) { console.error("Error fetching reports:", err); }
  }, [filter, startDate, endDate]);

  const fetchDmReports = useCallback(async () => {
    try {
      const { data, count, error } = await supabase.from('dm_reports')
        .select('*', { count: 'exact' }).order('timestamp', { ascending: false }).limit(100);
      if (!error) { setDmReports(data || []); setDmTotal(count || 0); }
    } catch (err) { console.error("Error fetching DM reports:", err); }
  }, []);

  const fetchPostReports = useCallback(async () => {
    try {
      const { data, count, error } = await supabase.from('post_reports')
        .select('*', { count: 'exact' }).order('timestamp', { ascending: false }).limit(100);
      if (!error) { setPostReports(data || []); setPostTotal(count || 0); }
    } catch (err) { console.error("Error fetching post reports:", err); }
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('live_logs')
        .select('*').eq('id', '00000000-0000-0000-0000-000000000001').maybeSingle();
      if (!error && data) {
        setLogs(data.logs || []); setAutomationStatus(data.status || null); setLogsUpdatedAt(data.updated_at);
      }
    } catch (err) { console.error("Error fetching logs:", err); }
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchStats(), fetchReports(), fetchLogs(), fetchDmReports(), fetchPostReports()]);
    setLoading(false);
  }, [fetchStats, fetchReports, fetchLogs, fetchDmReports, fetchPostReports]);

  const handleFileImport = async (event) => {
    const file = event.target.files[0]; if (!file) return;
    setImporting(true); setImportResult(null);
    try {
      const text = await file.text(); const data = JSON.parse(text);
      const reportsToInsert = data.reports || data;
      let inserted = 0, skipped = 0;
      for (const report of reportsToInsert) {
        const { error } = await supabase.from('comment_reports').insert({
          timestamp: report.timestamp, profile: report.profile, video_url: report.video_url,
          video_id: report.video_id, comment: report.comment, sheet: report.sheet
        });
        if (error) { if (error.code === '23505') skipped++; else console.error('Insert error:', error); }
        else inserted++;
      }
      setImportResult({ success: true, message: `Imported ${inserted} comments (${skipped} duplicates skipped)` });
      await fetchAll();
    } catch (err) {
      console.error("Import error:", err);
      setImportResult({ success: false, message: "Failed to import file. Make sure it's a valid JSON file." });
    } finally { setImporting(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  const handleExport = async () => {
    try {
      let query = supabase.from('comment_reports').select('*').order('timestamp', { ascending: false });
      if (filter === "today") { const t = new Date(); t.setHours(0,0,0,0); query = query.gte('timestamp', t.toISOString()); }
      else if (filter === "week") { const w = new Date(); w.setDate(w.getDate()-7); query = query.gte('timestamp', w.toISOString()); }
      else if (filter === "month") { const m = new Date(); m.setMonth(m.getMonth()-1); query = query.gte('timestamp', m.toISOString()); }
      const { data, error } = await query; if (error) throw error;
      const headers = ['timestamp','profile','comment','sheet','video_url','video_id'];
      const csvContent = [headers.join(','),
        ...data.map(row => headers.map(h => `"${(row[h]||'').toString().replace(/"/g,'""')}"`).join(','))
      ].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' }); const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `comments_export_${new Date().toISOString().split('T')[0]}.csv`; a.click(); URL.revokeObjectURL(url);
    } catch (err) { console.error('Export error:', err); }
  };

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => { fetchReports(); }, [startDate, endDate, fetchReports]);

  useEffect(() => {
    const channel = supabase.channel('comment_reports_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comment_reports' }, () => { fetchStats(); fetchReports(); setLastUpdated(new Date()); })
      .subscribe();
    const logsChannel = supabase.channel('live_logs_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_logs' }, () => { fetchLogs(); })
      .subscribe();
    const dmChannel = supabase.channel('dm_reports_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dm_reports' }, () => { fetchDmReports(); fetchStats(); })
      .subscribe();
    const postChannel = supabase.channel('post_reports_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'post_reports' }, () => { fetchPostReports(); fetchStats(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); supabase.removeChannel(logsChannel); supabase.removeChannel(dmChannel); supabase.removeChannel(postChannel); };
  }, [fetchStats, fetchReports, fetchLogs, fetchDmReports, fetchPostReports]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => { fetchStats(); fetchReports(); fetchLogs(); fetchDmReports(); fetchPostReports(); }, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchStats, fetchReports, fetchLogs, fetchDmReports, fetchPostReports]);

  useEffect(() => {
    if (logsContainerRef.current) logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
  }, [logs]);

  const formatTimestamp = (ts) => {
    if (!ts) return "-";
    const date = new Date(ts);
    return date.toLocaleString();
  };
  const truncateComment = (c, m = 50) => (!c ? "-" : c.length > m ? c.substring(0, m) + "..." : c);
  const getBrandColor = (sheet) => {
    switch (sheet) {
      case "Bump Connect": return "text-emerald-400 bg-emerald-500/20";
      case "Kollabsy": return "text-violet-400 bg-violet-500/20";
      case "Bump Syndicate": return "text-amber-400 bg-amber-500/20";
      default: return "text-zinc-400 bg-zinc-500/20";
    }
  };
  const getLogColor = (message) => {
    if (message.includes("\u2717") || message.includes("Error") || message.includes("Failed")) return "text-red-400";
    if (message.includes("\u2713") || message.includes("SUCCESS") || message.includes("Completed")) return "text-emerald-400";
    if (message.includes("\u26A0") || message.includes("Warning")) return "text-amber-400";
    if (message.includes("\u2192") || message.includes("Starting") || message.includes("Opening")) return "text-blue-400";
    return "text-zinc-400";
  };

  const tabs = [
    { id: "comments", label: "Comments", icon: MessageCircle, count: stats?.total_comments },
    { id: "dms", label: "DMs", icon: Send, count: stats?.dm_total },
    { id: "posts", label: "Posts", icon: Video, count: stats?.post_total },
    { id: "logs", label: "Live Logs", icon: Terminal }
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight" data-testid="app-title">TikTok Comments Dashboard</h1>
                <p className="text-zinc-500 text-sm">Real-time reporting for the team</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input type="file" ref={fileInputRef} onChange={handleFileImport} accept=".json" className="hidden" data-testid="file-input" />
              <button onClick={() => fileInputRef.current?.click()} disabled={importing}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm transition-all disabled:opacity-50" data-testid="import-btn">
                <Upload className={`w-4 h-4 ${importing ? "animate-pulse" : ""}`} /> {importing ? "Importing..." : "Import"}
              </button>
              <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-sm transition-all" data-testid="export-btn">
                <Download className="w-4 h-4" /> Export CSV
              </button>
              <button onClick={() => setAutoRefresh(!autoRefresh)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${autoRefresh ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-zinc-800 text-zinc-400 border border-zinc-700"}`}
                data-testid="auto-refresh-toggle">
                <RefreshCw className={`w-4 h-4 ${autoRefresh ? "animate-spin" : ""}`} style={{animationDuration: "3s"}} /> {autoRefresh ? "Live" : "Paused"}
              </button>
              <button onClick={fetchAll} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-sm transition-all" data-testid="refresh-btn">
                <RefreshCw className="w-4 h-4" /> Refresh
              </button>
              {lastUpdated && <span className="text-xs text-zinc-500 flex items-center gap-1"><Clock className="w-3 h-3" />{lastUpdated.toLocaleTimeString()}</span>}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {importResult && (
          <div className={`mb-6 p-4 rounded-xl border ${importResult.success ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-red-500/10 border-red-500/30 text-red-400"}`} data-testid="import-result">
            <div className="flex items-center justify-between"><span>{importResult.message}</span>
              <button onClick={() => setImportResult(null)} className="text-xs opacity-70 hover:opacity-100">Dismiss</button></div>
          </div>
        )}

        {/* Target Config Banner */}
        <div className="bg-gradient-to-r from-violet-900/30 via-fuchsia-900/20 to-violet-900/30 border border-violet-500/30 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-6">
              <div className="text-center"><div className="text-2xl font-bold text-white">25</div><div className="text-xs text-zinc-400">Profiles</div></div>
              <div className="text-center"><div className="text-2xl font-bold text-white">100</div><div className="text-xs text-zinc-400">Videos/Profile</div></div>
              <div className="text-center"><div className="text-2xl font-bold text-emerald-400">2,500</div><div className="text-xs text-zinc-400">Daily Target</div></div>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-400">Bump Connect</span>
              <span className="px-2 py-1 rounded bg-violet-500/20 text-violet-400">Kollabsy</span>
              <span className="px-2 py-1 rounded bg-amber-500/20 text-amber-400">Bump Syndicate</span>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-gradient-to-br from-violet-900/40 to-violet-900/20 border border-violet-500/30 rounded-xl p-4" data-testid="stat-month">
            <div className="flex items-center gap-3 mb-2"><div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center"><Calendar className="w-5 h-5 text-violet-400" /></div>
              <div className="text-2xl font-bold">{stats?.month_comments?.toLocaleString() || 0}</div></div><p className="text-xs text-zinc-500">This Month</p>
          </div>
          <div className="bg-gradient-to-br from-blue-900/40 to-blue-900/20 border border-blue-500/30 rounded-xl p-4" data-testid="stat-week">
            <div className="flex items-center gap-3 mb-2"><div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-blue-400" /></div>
              <div className="text-2xl font-bold">{stats?.week_comments?.toLocaleString() || 0}</div></div><p className="text-xs text-zinc-500">This Week</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-900/40 to-emerald-900/20 border border-emerald-500/30 rounded-xl p-4" data-testid="stat-today">
            <div className="flex items-center gap-3 mb-2"><div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center"><Sparkles className="w-5 h-5 text-emerald-400" /></div>
              <div className="text-2xl font-bold">{stats?.today_comments?.toLocaleString() || 0}</div></div><p className="text-xs text-zinc-500">Comments Today</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4" data-testid="stat-total">
            <div className="flex items-center gap-3 mb-2"><div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center"><MessageCircle className="w-5 h-5 text-zinc-400" /></div>
              <div className="text-2xl font-bold">{stats?.total_comments?.toLocaleString() || 0}</div></div><p className="text-xs text-zinc-500">All Comments</p>
          </div>
          <div className="bg-gradient-to-br from-cyan-900/40 to-cyan-900/20 border border-cyan-500/30 rounded-xl p-4" data-testid="stat-dms">
            <div className="flex items-center gap-3 mb-2"><div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center"><Send className="w-5 h-5 text-cyan-400" /></div>
              <div className="text-2xl font-bold">{stats?.dm_total?.toLocaleString() || 0}</div></div><p className="text-xs text-zinc-500">DMs Sent</p>
          </div>
          <div className="bg-gradient-to-br from-rose-900/40 to-rose-900/20 border border-rose-500/30 rounded-xl p-4" data-testid="stat-posts">
            <div className="flex items-center gap-3 mb-2"><div className="w-10 h-10 rounded-lg bg-rose-500/20 flex items-center justify-center"><Video className="w-5 h-5 text-rose-400" /></div>
              <div className="text-2xl font-bold">{stats?.post_total?.toLocaleString() || 0}</div></div><p className="text-xs text-zinc-500">Posts Made</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 mb-6 bg-zinc-900 p-1 rounded-xl w-fit" data-testid="tab-nav">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id ? "bg-violet-600 text-white shadow-lg shadow-violet-500/20" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"}`}
              data-testid={`tab-${tab.id}`}>
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.count !== undefined && <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? "bg-white/20" : "bg-zinc-800"}`}>{tab.count?.toLocaleString() || 0}</span>}
            </button>
          ))}
        </div>

        {/* COMMENTS TAB */}
        {activeTab === "comments" && (
          <div data-testid="comments-tab">
            {/* Date Range Filter */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-zinc-400" /><span className="text-sm text-zinc-400">Date Range:</span></div>
                <div className="flex items-center gap-2">
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-violet-500" />
                  <span className="text-zinc-500">to</span>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-violet-500" />
                </div>
                <button onClick={() => { setStartDate(""); setEndDate(""); setFilter("all"); }} className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm transition-colors">Clear</button>
              </div>
            </div>

            {/* Brand Stats - Today */}
            {stats?.today_by_brand && Object.keys(stats.today_by_brand).length > 0 && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-8">
                <div className="flex items-center gap-2 mb-4"><BarChart3 className="w-5 h-5 text-zinc-400" /><h3 className="font-semibold">Today's Comments by Brand</h3></div>
                <div className="grid grid-cols-3 gap-4">
                  {Object.entries(stats.today_by_brand).map(([brand, count]) => (
                    <div key={brand} className={`rounded-lg p-4 ${getBrandColor(brand)}`}><div className="text-2xl font-bold">{count}</div><div className="text-sm opacity-80">{brand}</div></div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center mb-6"><span className="text-sm text-zinc-500">Showing {reports.length} of {totalReports} comments</span></div>

            {/* Reports Table */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="reports-table">
                  <thead className="bg-zinc-800/50">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-zinc-400">Time</th>
                      <th className="text-left px-4 py-3 font-medium text-zinc-400">Profile</th>
                      <th className="text-left px-4 py-3 font-medium text-zinc-400">Comment</th>
                      <th className="text-left px-4 py-3 font-medium text-zinc-400">Brand</th>
                      <th className="text-left px-4 py-3 font-medium text-zinc-400">Video</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan="5" className="text-center py-12 text-zinc-500"><RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />Loading reports...</td></tr>
                    ) : reports.length === 0 ? (
                      <tr><td colSpan="5" className="text-center py-12 text-zinc-500"><MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" /><p>No comments yet</p><p className="text-xs mt-1">Comments will appear here in real-time when posted</p></td></tr>
                    ) : (
                      reports.map((report, idx) => (
                        <tr key={report.id || idx} className="border-t border-zinc-800 hover:bg-zinc-800/30 transition-colors" data-testid={`report-row-${idx}`}>
                          <td className="px-4 py-3 whitespace-nowrap text-zinc-400"><div className="flex items-center gap-2"><Calendar className="w-3 h-3" />{formatTimestamp(report.timestamp)}</div></td>
                          <td className="px-4 py-3"><span className="px-2 py-1 rounded bg-zinc-800 text-zinc-300 text-xs">{report.profile}</span></td>
                          <td className="px-4 py-3 max-w-md"><span className="text-zinc-300" title={report.comment}>{truncateComment(report.comment, 60)}</span></td>
                          <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs ${getBrandColor(report.sheet)}`}>{report.sheet}</span></td>
                          <td className="px-4 py-3"><a href={report.video_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-violet-400 hover:text-violet-300 transition-colors" data-testid={`video-link-${idx}`}><ExternalLink className="w-3 h-3" />View</a></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* DMS TAB */}
        {activeTab === "dms" && (
          <div data-testid="dms-tab">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-cyan-400">{stats?.dm_total?.toLocaleString() || 0}</div>
                <div className="text-xs text-zinc-500 mt-1">Total DMs Sent</div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-emerald-400">{stats?.dm_today?.toLocaleString() || 0}</div>
                <div className="text-xs text-zinc-500 mt-1">DMs Today</div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-violet-400">{new Set(dmReports.map(d => d.username)).size}</div>
                <div className="text-xs text-zinc-500 mt-1">Unique Recipients</div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-white">{new Set(dmReports.map(d => d.profile)).size}</div>
                <div className="text-xs text-zinc-500 mt-1">Profiles Used</div>
              </div>
            </div>
            <div className="flex items-center mb-4"><span className="text-sm text-zinc-500">Showing {dmReports.length} of {dmTotal} DMs</span></div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="dm-table">
                  <thead className="bg-zinc-800/50">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-zinc-400">Time</th>
                      <th className="text-left px-4 py-3 font-medium text-zinc-400">Profile</th>
                      <th className="text-left px-4 py-3 font-medium text-zinc-400">Recipient</th>
                      <th className="text-left px-4 py-3 font-medium text-zinc-400">Message</th>
                      <th className="text-left px-4 py-3 font-medium text-zinc-400">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dmReports.length === 0 ? (
                      <tr><td colSpan="5" className="text-center py-12 text-zinc-500"><Send className="w-8 h-8 mx-auto mb-2 opacity-50" /><p>No DMs sent yet</p><p className="text-xs mt-1">DM history will appear here when the local bot sends messages</p></td></tr>
                    ) : (
                      dmReports.map((dm, idx) => (
                        <tr key={dm.id || idx} className="border-t border-zinc-800 hover:bg-zinc-800/30 transition-colors" data-testid={`dm-row-${idx}`}>
                          <td className="px-4 py-3 whitespace-nowrap text-zinc-400">{formatTimestamp(dm.timestamp)}</td>
                          <td className="px-4 py-3"><span className="px-2 py-1 rounded bg-zinc-800 text-zinc-300 text-xs">{dm.profile}</span></td>
                          <td className="px-4 py-3"><span className="text-cyan-400">@{dm.username}</span></td>
                          <td className="px-4 py-3 max-w-md text-zinc-300">{truncateComment(dm.message, 60)}</td>
                          <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs ${dm.status === 'sent' ? 'text-emerald-400 bg-emerald-500/20' : 'text-red-400 bg-red-500/20'}`}>{dm.status}</span></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* POSTS TAB */}
        {activeTab === "posts" && (
          <div data-testid="posts-tab">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-rose-400">{stats?.post_total?.toLocaleString() || 0}</div>
                <div className="text-xs text-zinc-500 mt-1">Total Posts</div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-emerald-400">{stats?.post_today?.toLocaleString() || 0}</div>
                <div className="text-xs text-zinc-500 mt-1">Posts Today</div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-violet-400">{new Set(postReports.map(p => p.profile)).size}</div>
                <div className="text-xs text-zinc-500 mt-1">Profiles Used</div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-amber-400 flex items-center justify-center gap-2"><CalendarClock className="w-5 h-5" /> Scheduler</div>
                <div className="text-xs text-zinc-500 mt-1">Active on Local Bot</div>
              </div>
            </div>
            <div className="flex items-center mb-4"><span className="text-sm text-zinc-500">Showing {postReports.length} of {postTotal} posts</span></div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="post-table">
                  <thead className="bg-zinc-800/50">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-zinc-400">Time</th>
                      <th className="text-left px-4 py-3 font-medium text-zinc-400">Profile</th>
                      <th className="text-left px-4 py-3 font-medium text-zinc-400">Video</th>
                      <th className="text-left px-4 py-3 font-medium text-zinc-400">Caption</th>
                      <th className="text-left px-4 py-3 font-medium text-zinc-400">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {postReports.length === 0 ? (
                      <tr><td colSpan="5" className="text-center py-12 text-zinc-500"><Video className="w-8 h-8 mx-auto mb-2 opacity-50" /><p>No posts yet</p><p className="text-xs mt-1">Post history will appear here when the local bot uploads videos</p></td></tr>
                    ) : (
                      postReports.map((post, idx) => (
                        <tr key={post.id || idx} className="border-t border-zinc-800 hover:bg-zinc-800/30 transition-colors" data-testid={`post-row-${idx}`}>
                          <td className="px-4 py-3 whitespace-nowrap text-zinc-400">{formatTimestamp(post.timestamp)}</td>
                          <td className="px-4 py-3"><span className="px-2 py-1 rounded bg-zinc-800 text-zinc-300 text-xs">{post.profile}</span></td>
                          <td className="px-4 py-3 text-zinc-300">{post.video ? post.video.split('/').pop() : '-'}</td>
                          <td className="px-4 py-3 max-w-md text-zinc-300">{truncateComment(post.caption, 60)}</td>
                          <td className="px-4 py-3"><span className="px-2 py-1 rounded text-xs text-emerald-400 bg-emerald-500/20">{post.status}</span></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* LOGS TAB */}
        {activeTab === "logs" && (
          <div data-testid="logs-tab">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="bg-zinc-800/50 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Terminal className="w-5 h-5 text-zinc-400" /><h3 className="font-semibold">Live Automation Logs</h3>
                  {automationStatus?.running ? (
                    <span className="flex items-center gap-1 px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 text-xs"><Play className="w-3 h-3" />Running</span>
                  ) : (
                    <span className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-700 text-zinc-400 text-xs"><Pause className="w-3 h-3" />Idle</span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-zinc-500">
                  {automationStatus?.running && <span>Progress: {automationStatus.progress || 0}/{automationStatus.total || 0} profiles</span>}
                  {logsUpdatedAt && <span>Last update: {new Date(logsUpdatedAt).toLocaleTimeString()}</span>}
                </div>
              </div>
              {automationStatus?.running && (
                <div className="px-4 py-2 bg-zinc-800/30 border-b border-zinc-800">
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-zinc-400">Current: <span className="text-white font-medium">{automationStatus.current_profile || "Starting..."}</span></span>
                    <span className="text-zinc-400">Comments: <span className="text-emerald-400 font-medium">{automationStatus.comments_posted || 0}</span></span>
                  </div>
                  <div className="mt-2 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500"
                      style={{ width: `${automationStatus.total ? (automationStatus.progress / automationStatus.total) * 100 : 0}%` }} />
                  </div>
                </div>
              )}
              <div ref={logsContainerRef} className="h-96 overflow-y-auto p-4 font-mono text-xs" data-testid="logs-container">
                {logs.length === 0 ? (
                  <div className="text-center text-zinc-500 py-8"><Terminal className="w-8 h-8 mx-auto mb-2 opacity-50" /><p>No logs yet</p><p className="text-xs mt-1">Logs will appear here when the local script is running</p></div>
                ) : (
                  logs.map((log, idx) => (
                    <div key={idx} className={`py-0.5 ${getLogColor(log.message)}`}><span className="text-zinc-600 mr-2">[{log.timestamp}]</span>{log.message}</div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Info Footer */}
        <div className="mt-6 text-center text-xs text-zinc-600">
          <p>Data syncs automatically every 10 seconds when live updates are enabled</p>
          <p className="mt-1">Promoting: Bump Connect | Kollabsy | Bump Syndicate</p>
        </div>
      </main>

      <footer className="border-t border-zinc-800 mt-12 py-6">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm text-zinc-600"><p>TikTok Comments Dashboard - Real-time Team Reporting</p></div>
      </footer>
    </div>
  );
}

export default App;
