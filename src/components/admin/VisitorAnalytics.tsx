// @ts-nocheck
import { useEffect, useState } from "react";
import { supabase } from "../../integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Loader2, Search, Download, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Monitor, Smartphone, Tablet, Globe, Mail, Eye } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface AnalyticsEvent {
  id: string;
  event_type: string;
  page_path: string;
  referrer: string | null;
  user_agent: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  session_id: string;
  user_id: string | null;
  email: string | null;
  created_at: string;
}

export function VisitorAnalytics() {
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deviceFilter, setDeviceFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchEvents();
  }, [currentPage, itemsPerPage]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      
      // Get total count
      const { count } = await supabase
        .from("analytics_events")
        .select("*", { count: "exact", head: true });
      
      setTotalCount(count || 0);

      // Get paginated data
      const { data, error } = await supabase
        .from("analytics_events")
        .select("*")
        .order("created_at", { ascending: false })
        .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error("Error fetching analytics events:", error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredEvents = () => {
    return events.filter((event) => {
      const matchesSearch = !search || 
        event.email?.toLowerCase().includes(search.toLowerCase()) ||
        event.page_path.toLowerCase().includes(search.toLowerCase()) ||
        event.session_id.toLowerCase().includes(search.toLowerCase());
      
      const matchesDevice = deviceFilter === "all" || event.device_type === deviceFilter;
      
      return matchesSearch && matchesDevice;
    });
  };

  const getDeviceIcon = (deviceType: string | null) => {
    switch (deviceType) {
      case "mobile":
        return <Smartphone className="h-4 w-4" />;
      case "tablet":
        return <Tablet className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  const exportToCSV = () => {
    const filteredEvents = getFilteredEvents();
    const headers = ["Email", "Page Path", "Device", "Browser", "OS", "Session ID", "Referrer", "Timestamp"];
    const rows = filteredEvents.map((e) => [
      e.email || "Anonymous",
      e.page_path,
      e.device_type || "Unknown",
      e.browser || "Unknown",
      e.os || "Unknown",
      e.session_id,
      e.referrer || "Direct",
      new Date(e.created_at).toISOString(),
    ]);

    const csvContent = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `visitor-analytics-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredEvents = getFilteredEvents();
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  // Get unique emails count
  const uniqueEmails = new Set(events.filter((e) => e.email).map((e) => e.email)).size;
  const uniqueSessions = new Set(events.map((e) => e.session_id)).size;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Eye className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalCount.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Page Views</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Mail className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{uniqueEmails}</p>
                <p className="text-sm text-muted-foreground">Known Visitors</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Globe className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{uniqueSessions}</p>
                <p className="text-sm text-muted-foreground">Unique Sessions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Monitor className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {events.filter((e) => e.device_type === "desktop").length}
                </p>
                <p className="text-sm text-muted-foreground">Desktop Visits</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <Card className="bg-card border-border">
        <CardHeader className="border-b border-border">
          <CardTitle className="text-foreground text-lg font-medium">Visitor Activity</CardTitle>
          <CardDescription className="text-muted-foreground">
            Track page views, sessions, and visitor emails
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by email, page, or session..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-muted border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>
            
            <Select value={deviceFilter} onValueChange={setDeviceFilter}>
              <SelectTrigger className="w-[140px] bg-muted border-border text-foreground">
                <SelectValue placeholder="Device" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="all">All Devices</SelectItem>
                <SelectItem value="desktop">Desktop</SelectItem>
                <SelectItem value="mobile">Mobile</SelectItem>
                <SelectItem value="tablet">Tablet</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={exportToCSV}
              className="border-border text-foreground hover:bg-muted"
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>

            <Button
              variant="outline"
              onClick={fetchEvents}
              className="border-border text-foreground hover:bg-muted"
            >
              Refresh
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredEvents.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">No visitor data found.</p>
          ) : (
            <>
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent bg-muted/50">
                      <TableHead className="text-muted-foreground">Visitor</TableHead>
                      <TableHead className="text-muted-foreground">Page</TableHead>
                      <TableHead className="text-muted-foreground">Device</TableHead>
                      <TableHead className="text-muted-foreground">Browser / OS</TableHead>
                      <TableHead className="text-muted-foreground">Session</TableHead>
                      <TableHead className="text-muted-foreground">Referrer</TableHead>
                      <TableHead className="text-muted-foreground">Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEvents.map((event) => (
                      <TableRow key={event.id} className="border-border">
                        <TableCell>
                          {event.email ? (
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-primary" />
                              <span className="text-foreground font-medium">{event.email}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Anonymous</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <code className="text-sm bg-muted px-2 py-1 rounded text-foreground">
                            {event.page_path}
                          </code>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getDeviceIcon(event.device_type)}
                            <span className="text-muted-foreground capitalize">
                              {event.device_type || "Unknown"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p className="text-foreground">{event.browser || "Unknown"}</p>
                            <p className="text-muted-foreground text-xs">{event.os || "Unknown"}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs text-muted-foreground">
                            {event.session_id.slice(0, 16)}...
                          </code>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground truncate max-w-[150px] block">
                            {event.referrer || "Direct"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
                <span className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount.toLocaleString()}
                </span>

                <div className="flex items-center gap-4">
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={(value) => {
                      setItemsPerPage(Number(value));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[70px] bg-muted border-border text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30"
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground px-2">
                      {currentPage} / {totalPages || 1}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages || totalPages === 0}
                      className="text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages || totalPages === 0}
                      className="text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30"
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
