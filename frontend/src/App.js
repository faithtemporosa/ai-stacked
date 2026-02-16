import { useState, useEffect, useCallback, useRef } from "react";
import "./App.css";
import axios from "axios";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import AuthPage from "./pages/AuthPage";
import { 
  Activity, 
  MessageCircle, 
  Users, 
  Video, 
  TrendingUp, 
  Calendar,
  Filter,
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
  CheckCircle,
  XCircle,
  AlertCircle,
  LogOut,
  User,
  Settings
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auto-refresh interval in milliseconds
const REFRESH_INTERVAL = 10000; // 10 seconds

function Dashboard() {
  const { user, logout, isAuthenticated } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
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
  const fileInputRef = useRef(null);
  const logsEndRef = useRef(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/reports/stats`);
      setStats(res.data);
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  }, []);

  const fetchReports = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.append("filter", filter);
      params.append("limit", "100");
      
      const res = await axios.get(`${API}/reports?${params.toString()}`);
      setReports(res.data.reports || []);
      setTotalReports(res.data.total || 0);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Error fetching reports:", err);
    }
  }, [filter]);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/logs`);
      setLogs(res.data.logs || []);
      setAutomationStatus(res.data.status || null);
      setLogsUpdatedAt(res.data.updated_at);
    } catch (err) {
      console.error("Error fetching logs:", err);
    }
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchStats(), fetchReports(), fetchLogs()]);
    setLoading(false);
  }, [fetchStats, fetchReports, fetchLogs]);

  const handleFileImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      const res = await axios.post(`${API}/reports/import`, data);
      setImportResult({
        success: true,
        message: `Imported ${res.data.inserted} comments (${res.data.skipped} duplicates skipped)`
      });
      
      // Refresh data
      await fetchAll();
    } catch (err) {
      console.error("Import error:", err);
      setImportResult({
        success: false,
        message: err.response?.data?.detail || "Failed to import file. Make sure it's a valid JSON file."
      });
    } finally {
      setImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      fetchStats();
      fetchReports();
      fetchLogs();
    }, REFRESH_INTERVAL);
    
    return () => clearInterval(interval);
  }, [autoRefresh, fetchStats, fetchReports, fetchLogs]);

  // Auto-scroll logs
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  const formatTimestamp = (ts) => {
    if (!ts) return "-";
    const date = new Date(ts.replace(" ", "T"));
    return date.toLocaleString();
  };

  const truncateComment = (comment, maxLen = 50) => {
    if (!comment) return "-";
    return comment.length > maxLen ? comment.substring(0, maxLen) + "..." : comment;
  };

  const getBrandColor = (sheet) => {
    switch (sheet) {
      case "Bump Connect": return "text-emerald-400 bg-emerald-500/20";
      case "Kollabsy": return "text-violet-400 bg-violet-500/20";
      case "Bump Syndicate": return "text-amber-400 bg-amber-500/20";
      default: return "text-zinc-400 bg-zinc-500/20";
    }
  };

  const getLogColor = (message) => {
    if (message.includes("✗") || message.includes("Error") || message.includes("Failed")) {
      return "text-red-400";
    }
    if (message.includes("✓") || message.includes("SUCCESS") || message.includes("Completed")) {
      return "text-emerald-400";
    }
    if (message.includes("⚠") || message.includes("Warning")) {
      return "text-amber-400";
    }
    if (message.includes("→") || message.includes("Starting") || message.includes("Opening")) {
      return "text-blue-400";
    }
    return "text-zinc-400";
  };

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
                <p className="text-zinc-500 text-sm">
                  {user?.team_name ? `Team: ${user.team_name}` : 'Real-time reporting for the team'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Hidden file input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileImport}
                accept=".json"
                className="hidden"
                data-testid="file-input"
              />
              
              {/* Import button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm transition-all disabled:opacity-50"
                data-testid="import-btn"
              >
                <Upload className={`w-4 h-4 ${importing ? "animate-pulse" : ""}`} />
                {importing ? "Importing..." : "Import"}
              </button>

              {/* Export button */}
              <button
                onClick={() => window.open(`${API}/reports/export?filter=${filter}`, '_blank')}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-sm transition-all"
                data-testid="export-btn"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              
              {/* Auto-refresh toggle */}
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                  autoRefresh 
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" 
                    : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                }`}
                data-testid="auto-refresh-toggle"
              >
                <RefreshCw className={`w-4 h-4 ${autoRefresh ? "animate-spin" : ""}`} style={{animationDuration: "3s"}} />
                {autoRefresh ? "Live" : "Paused"}
              </button>
              
              {/* Manual refresh */}
              <button
                onClick={fetchAll}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-sm transition-all"
                data-testid="refresh-btn"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
              
              {/* Last updated */}
              {lastUpdated && (
                <span className="text-xs text-zinc-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {lastUpdated.toLocaleTimeString()}
                </span>
              )}

              {/* Auth section */}
              {isAuthenticated ? (
                <div className="flex items-center gap-2 ml-2 pl-4 border-l border-zinc-700">
                  <div className="flex items-center gap-2 px-3 py-2 bg-zinc-800 rounded-lg">
                    <User className="w-4 h-4 text-violet-400" />
                    <span className="text-sm text-zinc-300">{user?.name}</span>
                  </div>
                  <button
                    onClick={logout}
                    className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-all"
                    title="Sign out"
                    data-testid="logout-btn"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm text-zinc-300 transition-all ml-2"
                  data-testid="signin-btn"
                >
                  <User className="w-4 h-4" />
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Import Result Notification */}
        {importResult && (
          <div 
            className={`mb-6 p-4 rounded-xl border ${
              importResult.success 
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                : "bg-red-500/10 border-red-500/30 text-red-400"
            }`}
            data-testid="import-result"
          >
            <div className="flex items-center justify-between">
              <span>{importResult.message}</span>
              <button 
                onClick={() => setImportResult(null)}
                className="text-xs opacity-70 hover:opacity-100"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Target Configuration Banner */}
        <div className="bg-gradient-to-r from-violet-900/30 via-fuchsia-900/20 to-violet-900/30 border border-violet-500/30 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">25</div>
                <div className="text-xs text-zinc-400">Profiles</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">100</div>
                <div className="text-xs text-zinc-400">Videos/Profile</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-400">2,500</div>
                <div className="text-xs text-zinc-400">Daily Target</div>
              </div>
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
          {/* Total Comments */}
          <div className="bg-gradient-to-br from-violet-900/40 to-violet-900/20 border border-violet-500/30 rounded-xl p-4" data-testid="stat-total">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-violet-400" />
              </div>
              <div className="text-2xl font-bold">{stats?.total_comments || 0}</div>
            </div>
            <p className="text-xs text-zinc-500">Total Comments</p>
          </div>

          {/* Today */}
          <div className="bg-gradient-to-br from-emerald-900/40 to-emerald-900/20 border border-emerald-500/30 rounded-xl p-4" data-testid="stat-today">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold">{stats?.today_comments || 0}</div>
            </div>
            <p className="text-xs text-zinc-500">Today</p>
          </div>

          {/* This Week */}
          <div className="bg-gradient-to-br from-blue-900/40 to-blue-900/20 border border-blue-500/30 rounded-xl p-4" data-testid="stat-week">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-400" />
              </div>
              <div className="text-2xl font-bold">{stats?.week_comments || 0}</div>
            </div>
            <p className="text-xs text-zinc-500">This Week</p>
          </div>

          {/* Profiles */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4" data-testid="stat-profiles">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
                <Users className="w-5 h-5 text-zinc-400" />
              </div>
              <div className="text-2xl font-bold">{stats?.unique_profiles || 0}/25</div>
            </div>
            <p className="text-xs text-zinc-500">Active Profiles</p>
          </div>

          {/* Videos */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4" data-testid="stat-videos">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
                <Video className="w-5 h-5 text-zinc-400" />
              </div>
              <div className="text-2xl font-bold">{stats?.unique_videos || 0}</div>
            </div>
            <p className="text-xs text-zinc-500">Videos</p>
          </div>

          {/* Activity Indicator */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4" data-testid="stat-activity">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
                <Activity className={`w-5 h-5 ${autoRefresh ? "text-emerald-400" : "text-zinc-400"}`} />
              </div>
              <div className="text-2xl font-bold">{autoRefresh ? "ON" : "OFF"}</div>
            </div>
            <p className="text-xs text-zinc-500">Live Updates</p>
          </div>
        </div>

        {/* Brand Stats */}
        {stats?.by_brand && Object.keys(stats.by_brand).length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-zinc-400" />
              <h3 className="font-semibold">Comments by Brand</h3>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(stats.by_brand).map(([brand, count]) => (
                <div key={brand} className={`rounded-lg p-4 ${getBrandColor(brand)}`}>
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-sm opacity-80">{brand}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-2 text-zinc-400">
            <Filter className="w-4 h-4" />
            <span className="text-sm">Filter:</span>
          </div>
          <div className="flex gap-2">
            {[
              { value: "all", label: "All Time" },
              { value: "today", label: "Today" },
              { value: "week", label: "This Week" },
              { value: "month", label: "This Month" },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-4 py-2 rounded-lg text-sm transition-all ${
                  filter === f.value
                    ? "bg-violet-600 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                }`}
                data-testid={`filter-${f.value}`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <span className="text-sm text-zinc-500 ml-auto">
            Showing {reports.length} of {totalReports} comments
          </span>
        </div>

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
                  <tr>
                    <td colSpan="5" className="text-center py-12 text-zinc-500">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                      Loading reports...
                    </td>
                  </tr>
                ) : reports.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-12 text-zinc-500">
                      <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No comments yet</p>
                      <p className="text-xs mt-1">Comments will appear here in real-time when posted</p>
                    </td>
                  </tr>
                ) : (
                  reports.map((report, idx) => (
                    <tr 
                      key={report.id || idx} 
                      className="border-t border-zinc-800 hover:bg-zinc-800/30 transition-colors"
                      data-testid={`report-row-${idx}`}
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-zinc-400">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3 h-3" />
                          {formatTimestamp(report.timestamp)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 rounded bg-zinc-800 text-zinc-300 text-xs">
                          {report.profile}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-md">
                        <span className="text-zinc-300" title={report.comment}>
                          {truncateComment(report.comment, 60)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs ${getBrandColor(report.sheet)}`}>
                          {report.sheet}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <a
                          href={report.video_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-violet-400 hover:text-violet-300 transition-colors"
                          data-testid={`video-link-${idx}`}
                        >
                          <ExternalLink className="w-3 h-3" />
                          View
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Info Footer */}
        <div className="mt-6 text-center text-xs text-zinc-600">
          <p>Data syncs automatically every 10 seconds when live updates are enabled</p>
          <p className="mt-1">Promoting: Bump Connect | Kollabsy | Bump Syndicate</p>
        </div>

        {/* Live Logs Panel */}
        <div className="mt-8 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden" data-testid="logs-panel">
          <div className="bg-zinc-800/50 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Terminal className="w-5 h-5 text-zinc-400" />
              <h3 className="font-semibold">Live Automation Logs</h3>
              {automationStatus?.running ? (
                <span className="flex items-center gap-1 px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 text-xs">
                  <Play className="w-3 h-3" />
                  Running
                </span>
              ) : (
                <span className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-700 text-zinc-400 text-xs">
                  <Pause className="w-3 h-3" />
                  Idle
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 text-xs text-zinc-500">
              {automationStatus?.running && (
                <span>
                  Progress: {automationStatus.progress || 0}/{automationStatus.total || 0} profiles
                </span>
              )}
              {logsUpdatedAt && (
                <span>Last update: {new Date(logsUpdatedAt).toLocaleTimeString()}</span>
              )}
            </div>
          </div>
          
          {/* Status Bar */}
          {automationStatus?.running && (
            <div className="px-4 py-2 bg-zinc-800/30 border-b border-zinc-800">
              <div className="flex items-center gap-4 text-sm">
                <span className="text-zinc-400">
                  Current: <span className="text-white font-medium">{automationStatus.current_profile || "Starting..."}</span>
                </span>
                <span className="text-zinc-400">
                  Comments: <span className="text-emerald-400 font-medium">{automationStatus.comments_posted || 0}</span>
                </span>
              </div>
              <div className="mt-2 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500"
                  style={{ width: `${automationStatus.total ? (automationStatus.progress / automationStatus.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}
          
          {/* Logs */}
          <div className="h-64 overflow-y-auto p-4 font-mono text-xs" data-testid="logs-container">
            {logs.length === 0 ? (
              <div className="text-center text-zinc-500 py-8">
                <Terminal className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No logs yet</p>
                <p className="text-xs mt-1">Logs will appear here when the local script is running</p>
              </div>
            ) : (
              <>
                {logs.map((log, idx) => (
                  <div key={idx} className={`py-0.5 ${getLogColor(log.message)}`}>
                    <span className="text-zinc-600 mr-2">[{log.timestamp}]</span>
                    {log.message}
                  </div>
                ))}
                <div ref={logsEndRef} />
              </>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 mt-12 py-6">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm text-zinc-600">
          <p>TikTok Comments Dashboard - Real-time Team Reporting</p>
        </div>
      </footer>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="relative">
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute -top-4 -right-4 w-8 h-8 bg-zinc-800 hover:bg-zinc-700 rounded-full flex items-center justify-center text-zinc-400 hover:text-white z-10"
            >
              ×
            </button>
            <AuthPage onSuccess={() => setShowAuthModal(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Dashboard />
    </AuthProvider>
  );
}

export default App;
