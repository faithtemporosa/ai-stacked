// @ts-nocheck
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Calendar, Loader2, Database, Send, Users, DollarSign, Home, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { exportAnalyticsToPDF } from "@/utils/exportAnalyticsPDF";
import { sendPDFToWebhook } from "@/utils/webhookIntegration";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Area, AreaChart, Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { fetchAnalyticsData, type AnalyticsData } from "@/utils/fetchAnalytics";
import { fetchDatabaseMetrics, type DatabaseMetrics } from "@/utils/fetchDatabaseMetrics";
import { supabase } from "@/integrations/supabase/client";

export const AnalyticsDashboard = () => {
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState("7d");
  const [isExporting, setIsExporting] = useState(false);
  const [isSendingWebhook, setIsSendingWebhook] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [databaseMetrics, setDatabaseMetrics] = useState<DatabaseMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    loadData();
  }, [dateRange]);

  // Real-time subscriptions for analytics data
  useEffect(() => {
    const analyticsChannel = supabase
      .channel('analytics-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'analytics_events' },
        () => {
          console.log('🔄 Analytics events updated');
          loadData();
        }
      )
      .subscribe();

    const subscriptionsChannel = supabase
      .channel('analytics-subscriptions-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'subscriptions' },
        () => {
          console.log('🔄 Subscriptions updated - refreshing metrics');
          loadData();
        }
      )
      .subscribe();

    const profilesChannel = supabase
      .channel('analytics-profiles-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          console.log('🔄 Profiles updated - refreshing metrics');
          loadData();
        }
      )
      .subscribe();

    const affiliatesChannel = supabase
      .channel('analytics-affiliates-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'affiliates' },
        () => {
          console.log('🔄 Affiliates updated - refreshing metrics');
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(analyticsChannel);
      supabase.removeChannel(subscriptionsChannel);
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(affiliatesChannel);
    };
  }, [dateRange]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [analytics, dbMetrics] = await Promise.all([
        fetchAnalyticsData(dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 90),
        fetchDatabaseMetrics()
      ]);
      setAnalyticsData(analytics);
      setDatabaseMetrics(dbMetrics);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error Loading Data",
        description: "Failed to load analytics data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (!analyticsData) return;
    
    setIsExporting(true);
    try {
      const endDate = new Date();
      const startDate = new Date();
      const days = dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 90;
      startDate.setDate(endDate.getDate() - days);

      await exportAnalyticsToPDF(analyticsData, databaseMetrics, {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      });

      toast({
        title: "Export Successful",
        description: "Analytics report has been downloaded as PDF.",
      });
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast({
        title: "Export Failed",
        description: "Failed to generate PDF report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleSendToWebhook = async () => {
    if (!analyticsData || !databaseMetrics) return;
    
    setIsSendingWebhook(true);
    try {
      const endDate = new Date();
      const startDate = new Date();
      const days = dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 90;
      startDate.setDate(endDate.getDate() - days);

      // Generate complete PDF matching dashboard
      const doc = new jsPDF();
      const primaryColor: [number, number, number] = [99, 102, 241];
      const textColor: [number, number, number] = [31, 41, 55];
      const lightGray: [number, number, number] = [243, 244, 246];
      
      let yPosition = 20;
      
      // Header
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, 210, 30, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('Analytics Report', 20, 18);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const startDateStr = new Date(startDate).toLocaleDateString('en-US', { 
        month: 'short', day: 'numeric', year: 'numeric' 
      });
      const endDateStr = new Date(endDate).toLocaleDateString('en-US', { 
        month: 'short', day: 'numeric', year: 'numeric' 
      });
      doc.text(`Period: ${startDateStr} - ${endDateStr}`, 20, 25);
      
      yPosition = 45;
      
      // Database Metrics Section
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Database Metrics', 20, yPosition);
      yPosition += 10;
      
      const dbMetricsData = [
        ['Total Users', databaseMetrics.totalUsers.toLocaleString()],
        ['Total Subscriptions', databaseMetrics.totalSubscriptions.toLocaleString()],
        ['Active Subscriptions', databaseMetrics.activeSubscriptions.toLocaleString()],
        ['Cancelled Subscriptions', databaseMetrics.cancelledSubscriptions.toLocaleString()],
        ['Total Revenue', `$${databaseMetrics.totalRevenue.toLocaleString()}`],
        ['Cart Items', databaseMetrics.totalCartItems.toLocaleString()],
        ['Total Automations', databaseMetrics.totalAutomations.toLocaleString()],
        ['Total Affiliates', databaseMetrics.affiliateMetrics?.totalAffiliates?.toLocaleString() || '0'],
        ['Active Affiliates', databaseMetrics.affiliateMetrics?.activeAffiliates?.toLocaleString() || '0'],
        ['Total Referrals', databaseMetrics.affiliateMetrics?.totalReferrals?.toLocaleString() || '0'],
        ['Total Commissions', `$${databaseMetrics.affiliateMetrics?.totalCommissions?.toFixed(2) || '0.00'}`],
        ['Pending Payouts', `$${databaseMetrics.affiliateMetrics?.pendingCommissions?.toFixed(2) || '0.00'}`],
        ['Paid Commissions', `$${databaseMetrics.affiliateMetrics?.paidCommissions?.toFixed(2) || '0.00'}`],
      ];
      
      autoTable(doc, {
        startY: yPosition,
        head: [['Metric', 'Value']],
        body: dbMetricsData,
        theme: 'grid',
        headStyles: { 
          fillColor: primaryColor,
          fontSize: 11,
          fontStyle: 'bold',
        },
        bodyStyles: { fontSize: 10 },
        alternateRowStyles: { fillColor: lightGray },
        margin: { left: 20, right: 20 },
      });
      
      yPosition = (doc as any).lastAutoTable.finalY + 15;
      
      // Web Analytics Summary
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Web Analytics Summary', 20, yPosition);
      yPosition += 10;
      
      const summaryData = [
        ['Total Visitors', analyticsData.timeSeries.visitors.total.toLocaleString()],
        ['Total Pageviews', analyticsData.timeSeries.pageviews.total.toLocaleString()],
        ['Pages per Visit', analyticsData.timeSeries.pageviewsPerVisit.total.toFixed(2)],
        ['Avg. Session Duration', `${Math.round(analyticsData.timeSeries.sessionDuration.total)}s`],
        ['Bounce Rate', `${analyticsData.timeSeries.bounceRate.total}%`],
      ];
      
      autoTable(doc, {
        startY: yPosition,
        head: [['Metric', 'Value']],
        body: summaryData,
        theme: 'grid',
        headStyles: { 
          fillColor: primaryColor,
          fontSize: 11,
          fontStyle: 'bold',
        },
        bodyStyles: { fontSize: 10 },
        alternateRowStyles: { fillColor: lightGray },
        margin: { left: 20, right: 20 },
      });
      
      yPosition = (doc as any).lastAutoTable.finalY + 15;
      
      // Subscription Growth
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Subscription Growth (Last 6 Months)', 20, yPosition);
      yPosition += 7;
      
      const subscriptionData = databaseMetrics.subscriptionGrowth.map((item) => [
        item.month,
        item.signups.toLocaleString(),
        item.cancellations.toLocaleString(),
        item.net.toLocaleString(),
      ]);
      
      autoTable(doc, {
        startY: yPosition,
        head: [['Month', 'New Signups', 'Cancellations', 'Net Growth']],
        body: subscriptionData,
        theme: 'striped',
        headStyles: { 
          fillColor: primaryColor,
          fontSize: 10,
          fontStyle: 'bold',
        },
        bodyStyles: { fontSize: 9 },
        alternateRowStyles: { fillColor: lightGray },
        margin: { left: 20, right: 20 },
      });

      // Add new page for detailed breakdown
      doc.addPage();
      yPosition = 20;
      
      // Top Pages
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Top Pages', 20, yPosition);
      yPosition += 7;
      
      const pagesData = analyticsData.lists.page.data.slice(0, 10).map((item) => [
        item.label,
        item.value.toLocaleString(),
      ]);
      
      autoTable(doc, {
        startY: yPosition,
        head: [['Page', 'Views']],
        body: pagesData,
        theme: 'striped',
        headStyles: { 
          fillColor: primaryColor,
          fontSize: 10,
          fontStyle: 'bold',
        },
        bodyStyles: { fontSize: 9 },
        alternateRowStyles: { fillColor: lightGray },
        margin: { left: 20, right: 20 },
      });
      
      yPosition = (doc as any).lastAutoTable.finalY + 15;
      
      // Traffic Sources
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Traffic Sources', 20, yPosition);
      yPosition += 7;
      
      const sourcesData = analyticsData.lists.source.data.slice(0, 10).map((item) => [
        item.label,
        item.value.toLocaleString(),
      ]);
      
      autoTable(doc, {
        startY: yPosition,
        head: [['Source', 'Visits']],
        body: sourcesData,
        theme: 'striped',
        headStyles: { 
          fillColor: primaryColor,
          fontSize: 10,
          fontStyle: 'bold',
        },
        bodyStyles: { fontSize: 9 },
        alternateRowStyles: { fillColor: lightGray },
        margin: { left: 20, right: 20 },
      });
      
      yPosition = (doc as any).lastAutoTable.finalY + 15;
      
      // Device Types
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Device Types', 20, yPosition);
      yPosition += 7;
      
      const devicesData = analyticsData.lists.device.data.map((item) => [
        item.label.charAt(0).toUpperCase() + item.label.slice(1),
        item.value.toLocaleString(),
      ]);
      
      autoTable(doc, {
        startY: yPosition,
        head: [['Device', 'Visits']],
        body: devicesData,
        theme: 'striped',
        headStyles: { 
          fillColor: primaryColor,
          fontSize: 10,
          fontStyle: 'bold',
        },
        bodyStyles: { fontSize: 9 },
        alternateRowStyles: { fillColor: lightGray },
        margin: { left: 20, right: 20 },
      });
      
      yPosition = (doc as any).lastAutoTable.finalY + 15;
      
      // Top Countries
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Top Countries', 20, yPosition);
      yPosition += 7;
      
      const countriesData = analyticsData.lists.country.data.slice(0, 10).map((item) => [
        item.label,
        item.value.toLocaleString(),
      ]);
      
      autoTable(doc, {
        startY: yPosition,
        head: [['Country', 'Visits']],
        body: countriesData,
        theme: 'striped',
        headStyles: { 
          fillColor: primaryColor,
          fontSize: 10,
          fontStyle: 'bold',
        },
        bodyStyles: { fontSize: 9 },
        alternateRowStyles: { fillColor: lightGray },
        margin: { left: 20, right: 20 },
      });
      if (databaseMetrics.popularAutomations.length > 0) {
        yPosition = (doc as any).lastAutoTable.finalY + 15;
        
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Popular Automations', 20, yPosition);
        yPosition += 7;
        
        const automationsData = databaseMetrics.popularAutomations.map((item) => [
          item.name,
          item.count.toLocaleString(),
        ]);
        
        autoTable(doc, {
          startY: yPosition,
          head: [['Automation', 'Usage Count']],
          body: automationsData,
          theme: 'striped',
          headStyles: { 
            fillColor: primaryColor,
            fontSize: 10,
            fontStyle: 'bold',
          },
          bodyStyles: { fontSize: 9 },
          alternateRowStyles: { fillColor: lightGray },
          margin: { left: 20, right: 20 },
        });
      }

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(
          `Generated on ${new Date().toLocaleString()} | Page ${i} of ${pageCount}`,
          doc.internal.pageSize.width / 2,
          doc.internal.pageSize.height - 10,
          { align: 'center' }
        );
      }

      const filename = `analytics-report-${new Date().toISOString().split('T')[0]}.pdf`;
      const pdfBlob = doc.output('blob');
      
      await sendPDFToWebhook(pdfBlob, filename);

      toast({
        title: "Sent to Webhook",
        description: "Complete analytics report has been sent to your webhook.",
      });
    } catch (error) {
      console.error("Error sending to webhook:", error);
      toast({
        title: "Send Failed",
        description: "Failed to send PDF to webhook. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSendingWebhook(false);
    }
  };

  // Show loading state
  if (isLoading || !analyticsData || !databaseMetrics) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Chart colors
  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];
  
  // Prepare chart data
  const trafficChartData = analyticsData.timeSeries.visitors.data.map((item, idx) => ({
    date: new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    visitors: item.value,
    pageviews: analyticsData.timeSeries.pageviews.data[idx]?.value || 0,
  }));

  const chartConfig = {
    visitors: {
      label: "Visitors",
      color: "hsl(var(--chart-1))",
    },
    pageviews: {
      label: "Pageviews",
      color: "hsl(var(--chart-2))",
    },
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link to="/">
              <Home className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold">Analytics Dashboard</h2>
              <Badge variant="outline" className="flex items-center gap-1">
                <RefreshCw className="w-3 h-3" />
                Real-time
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              Production app analytics and performance metrics
              {lastUpdated && (
                <span className="ml-2 text-xs">
                  • Updated {lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-3 flex-wrap items-center">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={loadData}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleExportPDF} disabled={isExporting || !analyticsData}>
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? "Exporting..." : "Export PDF"}
          </Button>
          <Button 
            onClick={handleSendToWebhook} 
            disabled={isSendingWebhook || !analyticsData}
            variant="secondary"
          >
            <Send className="mr-2 h-4 w-4" />
            {isSendingWebhook ? "Sending..." : "Send to Webhook"}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Visitors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.timeSeries.visitors.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Pageviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.timeSeries.pageviews.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pages per Visit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analyticsData.timeSeries.pageviewsPerVisit.total.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg. Session</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(analyticsData.timeSeries.sessionDuration.total)}s
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Bounce Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analyticsData.timeSeries.bounceRate.total}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Database Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Metrics
          </CardTitle>
          <CardDescription>Real-time data from your Supabase database</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Users</p>
              <p className="text-2xl font-bold">{databaseMetrics.totalUsers}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Subscriptions</p>
              <p className="text-2xl font-bold">{databaseMetrics.totalSubscriptions}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold">${databaseMetrics.totalRevenue.toLocaleString()}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Active Subscriptions</p>
              <p className="text-2xl font-bold">{databaseMetrics.activeSubscriptions}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Cancelled Subscriptions</p>
              <p className="text-2xl font-bold">{databaseMetrics.cancelledSubscriptions}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Cart Items</p>
              <p className="text-2xl font-bold">{databaseMetrics.totalCartItems}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Automations</p>
              <p className="text-2xl font-bold">{databaseMetrics.totalAutomations}</p>
            </div>
          </div>

          {databaseMetrics.popularAutomations.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-medium mb-3">Popular Automations</h4>
              <div className="space-y-2">
                {databaseMetrics.popularAutomations.map((automation, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground truncate flex-1">
                      {automation.name}
                    </span>
                    <span className="font-medium ml-2">{automation.count} uses</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Traffic Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Traffic Trend</CardTitle>
          <CardDescription>Daily visitors and pageviews over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <AreaChart data={trafficChartData}>
              <defs>
                <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.1}/>
                </linearGradient>
                <linearGradient id="colorPageviews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="visitors" 
                stroke="hsl(var(--chart-1))" 
                fillOpacity={1} 
                fill="url(#colorVisitors)" 
              />
              <Area 
                type="monotone" 
                dataKey="pageviews" 
                stroke="hsl(var(--chart-2))" 
                fillOpacity={1} 
                fill="url(#colorPageviews)" 
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Affiliate Commissions Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Affiliate Commissions
          </CardTitle>
          <CardDescription>Affiliate program performance and commission tracking</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Affiliates</p>
              <p className="text-2xl font-bold">{databaseMetrics.affiliateMetrics.totalAffiliates}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Active Affiliates</p>
              <p className="text-2xl font-bold text-green-500">{databaseMetrics.affiliateMetrics.activeAffiliates}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Pending Applications</p>
              <p className="text-2xl font-bold text-yellow-500">{databaseMetrics.affiliateMetrics.pendingAffiliates}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Referrals</p>
              <p className="text-2xl font-bold">{databaseMetrics.affiliateMetrics.totalReferrals}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Commissions</p>
              <p className="text-2xl font-bold">${databaseMetrics.affiliateMetrics.totalCommissions.toFixed(2)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Pending Payouts</p>
              <p className="text-2xl font-bold text-yellow-500">${databaseMetrics.affiliateMetrics.pendingCommissions.toFixed(2)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Paid Out</p>
              <p className="text-2xl font-bold text-green-500">${databaseMetrics.affiliateMetrics.paidCommissions.toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Commission Growth Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Commission Trends</CardTitle>
          <CardDescription>Commissions earned and paid over the last 6 months</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer 
            config={{
              earned: {
                label: "Earned",
                color: "hsl(var(--chart-1))",
              },
              paid: {
                label: "Paid",
                color: "hsl(var(--chart-2))",
              },
            }} 
            className="h-[300px] w-full"
          >
            <BarChart data={databaseMetrics.affiliateMetrics.commissionsByMonth}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="month" 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(value) => `$${value}`}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
              <Bar dataKey="earned" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} name="Earned" />
              <Bar dataKey="paid" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} name="Paid" />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Subscription Growth Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription Growth</CardTitle>
          <CardDescription>New signups and cancellations over the last 6 months</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer 
            config={{
              signups: {
                label: "New Signups",
                color: "hsl(var(--chart-1))",
              },
              cancellations: {
                label: "Cancellations",
                color: "hsl(var(--chart-3))",
              },
              net: {
                label: "Net Growth",
                color: "hsl(var(--chart-2))",
              },
            }} 
            className="h-[300px] w-full"
          >
            <BarChart data={databaseMetrics.subscriptionGrowth}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="month" 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
              <Bar dataKey="signups" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} name="New Signups" />
              <Bar dataKey="cancellations" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} name="Cancellations" />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Data Tables */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Top Pages */}
        <Card>
          <CardHeader>
            <CardTitle>Top Pages</CardTitle>
            <CardDescription>Most visited pages</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[300px] w-full">
              <BarChart 
                data={analyticsData.lists.page.data} 
                layout="vertical"
                margin={{ left: 100, right: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  type="number"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  dataKey="label" 
                  type="category"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  width={90}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Traffic Sources */}
        <Card>
          <CardHeader>
            <CardTitle>Traffic Sources</CardTitle>
            <CardDescription>Where visitors come from</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[300px] w-full">
              <PieChart>
                <Pie
                  data={analyticsData.lists.source.data}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ label, percent }) => `${label}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="hsl(var(--chart-1))"
                  dataKey="value"
                >
                  {analyticsData.lists.source.data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Devices */}
        <Card>
          <CardHeader>
            <CardTitle>Device Types</CardTitle>
            <CardDescription>Visitor device breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[300px] w-full">
              <PieChart>
                <Pie
                  data={analyticsData.lists.device.data}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ label, percent }) => `${label}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="hsl(var(--chart-1))"
                  dataKey="value"
                >
                  {analyticsData.lists.device.data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Countries */}
        <Card>
          <CardHeader>
            <CardTitle>Top Countries</CardTitle>
            <CardDescription>Geographic distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[300px] w-full">
              <BarChart 
                data={analyticsData.lists.country.data}
                layout="vertical"
                margin={{ left: 40, right: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  type="number"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  dataKey="label" 
                  type="category"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  width={30}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" fill="hsl(var(--chart-3))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
