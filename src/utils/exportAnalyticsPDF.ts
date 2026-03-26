import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { DatabaseMetrics } from "./fetchDatabaseMetrics";
import { sendPDFToWebhook } from "./webhookIntegration";

interface AnalyticsData {
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

export const exportAnalyticsToPDF = async (
  analyticsData: AnalyticsData,
  databaseMetrics: DatabaseMetrics,
  dateRange: { start: string; end: string }
) => {
  const doc = new jsPDF();
  
  // Colors matching the design system
  const primaryColor: [number, number, number] = [99, 102, 241]; // indigo
  const textColor: [number, number, number] = [31, 41, 55]; // gray-800
  const lightGray: [number, number, number] = [243, 244, 246]; // gray-100
  
  let yPosition = 20;
  
  // Add company branding header
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 30, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("Analytics Report", 20, 18);
  
  // Date range
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const startDate = new Date(dateRange.start).toLocaleDateString("en-US", { 
    month: "short", 
    day: "numeric", 
    year: "numeric" 
  });
  const endDate = new Date(dateRange.end).toLocaleDateString("en-US", { 
    month: "short", 
    day: "numeric", 
    year: "numeric" 
  });
  doc.text(`Period: ${startDate} - ${endDate}`, 20, 25);
  
  yPosition = 45;
  
  // Database Metrics Section
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Database Metrics", 20, yPosition);
  
  yPosition += 10;
  
  const dbMetricsData = [
    ["Total Users", databaseMetrics.totalUsers.toLocaleString()],
    ["Total Subscriptions", databaseMetrics.totalSubscriptions.toLocaleString()],
    ["Active Subscriptions", databaseMetrics.activeSubscriptions.toLocaleString()],
    ["Cancelled Subscriptions", databaseMetrics.cancelledSubscriptions.toLocaleString()],
    ["Total Revenue", `$${databaseMetrics.totalRevenue.toLocaleString()}`],
    ["Cart Items", databaseMetrics.totalCartItems.toLocaleString()],
    ["Total Automations", databaseMetrics.totalAutomations.toLocaleString()],
    ["Total Affiliates", databaseMetrics.affiliateMetrics?.totalAffiliates?.toLocaleString() || "0"],
    ["Active Affiliates", databaseMetrics.affiliateMetrics?.activeAffiliates?.toLocaleString() || "0"],
    ["Total Referrals", databaseMetrics.affiliateMetrics?.totalReferrals?.toLocaleString() || "0"],
    ["Total Commissions", `$${databaseMetrics.affiliateMetrics?.totalCommissions?.toFixed(2) || "0.00"}`],
    ["Pending Payouts", `$${databaseMetrics.affiliateMetrics?.pendingCommissions?.toFixed(2) || "0.00"}`],
    ["Paid Commissions", `$${databaseMetrics.affiliateMetrics?.paidCommissions?.toFixed(2) || "0.00"}`],
  ];
  
  autoTable(doc, {
    startY: yPosition,
    head: [["Metric", "Value"]],
    body: dbMetricsData,
    theme: "grid",
    headStyles: { 
      fillColor: primaryColor,
      fontSize: 11,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 10,
    },
    alternateRowStyles: {
      fillColor: lightGray,
    },
    margin: { left: 20, right: 20 },
  });
  
  yPosition = (doc as any).lastAutoTable.finalY + 15;
  
  // Summary Section
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Web Analytics Summary", 20, yPosition);
  
  yPosition += 10;
  
  // Summary metrics in a nice grid
  const summaryData = [
    ["Total Visitors", analyticsData.timeSeries.visitors.total.toLocaleString()],
    ["Total Pageviews", analyticsData.timeSeries.pageviews.total.toLocaleString()],
    ["Pages per Visit", analyticsData.timeSeries.pageviewsPerVisit.total.toFixed(2)],
    ["Avg. Session Duration", `${Math.round(analyticsData.timeSeries.sessionDuration.total)}s`],
    ["Bounce Rate", `${analyticsData.timeSeries.bounceRate.total}%`],
  ];
  
  autoTable(doc, {
    startY: yPosition,
    head: [["Metric", "Value"]],
    body: summaryData,
    theme: "grid",
    headStyles: { 
      fillColor: primaryColor,
      fontSize: 11,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 10,
    },
    alternateRowStyles: {
      fillColor: lightGray,
    },
    margin: { left: 20, right: 20 },
  });
  
  yPosition = (doc as any).lastAutoTable.finalY + 15;
  
  // Subscription Growth
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Subscription Growth (Last 6 Months)", 20, yPosition);
  
  yPosition += 7;
  
  const subscriptionData = databaseMetrics.subscriptionGrowth.map((item) => [
    item.month,
    item.signups.toLocaleString(),
    item.cancellations.toLocaleString(),
    item.net.toLocaleString(),
  ]);
  
  autoTable(doc, {
    startY: yPosition,
    head: [["Month", "New Signups", "Cancellations", "Net Growth"]],
    body: subscriptionData,
    theme: "striped",
    headStyles: { 
      fillColor: primaryColor,
      fontSize: 10,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 9,
    },
    alternateRowStyles: {
      fillColor: lightGray,
    },
    margin: { left: 20, right: 20 },
  });
  
  yPosition = (doc as any).lastAutoTable.finalY + 15;
  
  // Daily Trend
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Daily Traffic Trend", 20, yPosition);
  
  yPosition += 7;
  
  const trendData = analyticsData.timeSeries.visitors.data.map((item, idx) => [
    new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    item.value.toLocaleString(),
    analyticsData.timeSeries.pageviews.data[idx].value.toLocaleString(),
  ]);
  
  autoTable(doc, {
    startY: yPosition,
    head: [["Date", "Visitors", "Pageviews"]],
    body: trendData,
    theme: "striped",
    headStyles: { 
      fillColor: primaryColor,
      fontSize: 10,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 9,
    },
    alternateRowStyles: {
      fillColor: lightGray,
    },
    margin: { left: 20, right: 20 },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  // Popular Automations
  if (databaseMetrics.popularAutomations.length > 0) {
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Popular Automations", 20, yPosition);
    
    yPosition += 7;
    
    const automationsData = databaseMetrics.popularAutomations.map((item) => [
      item.name,
      item.count.toLocaleString(),
    ]);
    
    autoTable(doc, {
      startY: yPosition,
      head: [["Automation", "Usage Count"]],
      body: automationsData,
      theme: "striped",
      headStyles: { 
        fillColor: primaryColor,
        fontSize: 10,
        fontStyle: "bold",
      },
      bodyStyles: {
        fontSize: 9,
      },
      alternateRowStyles: {
        fillColor: lightGray,
      },
      margin: { left: 20, right: 20 },
    });
    
    yPosition = (doc as any).lastAutoTable.finalY + 15;
  }

  // Commission Trends
  if (databaseMetrics.affiliateMetrics?.commissionsByMonth?.length > 0) {
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Commission Trends (Last 6 Months)", 20, yPosition);
    
    yPosition += 7;
    
    const commissionData = databaseMetrics.affiliateMetrics.commissionsByMonth.map((item) => [
      item.month,
      `$${item.earned.toFixed(2)}`,
      `$${item.paid.toFixed(2)}`,
    ]);
    
    autoTable(doc, {
      startY: yPosition,
      head: [["Month", "Earned", "Paid"]],
      body: commissionData,
      theme: "striped",
      headStyles: { 
        fillColor: primaryColor,
        fontSize: 10,
        fontStyle: "bold",
      },
      bodyStyles: {
        fontSize: 9,
      },
      alternateRowStyles: {
        fillColor: lightGray,
      },
      margin: { left: 20, right: 20 },
    });
  }
  
  // Add new page for detailed breakdown
  doc.addPage();
  yPosition = 20;
  
  // Top Pages
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Top Pages", 20, yPosition);
  
  yPosition += 7;
  
  const pagesData = analyticsData.lists.page.data.map((item) => [
    item.label,
    item.value.toLocaleString(),
  ]);
  
  autoTable(doc, {
    startY: yPosition,
    head: [["Page", "Views"]],
    body: pagesData,
    theme: "striped",
    headStyles: { 
      fillColor: primaryColor,
      fontSize: 10,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 9,
    },
    alternateRowStyles: {
      fillColor: lightGray,
    },
    margin: { left: 20, right: 20 },
  });
  
  yPosition = (doc as any).lastAutoTable.finalY + 15;
  
  // Traffic Sources
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Traffic Sources", 20, yPosition);
  
  yPosition += 7;
  
  const sourcesData = analyticsData.lists.source.data.map((item) => [
    item.label,
    item.value.toLocaleString(),
  ]);
  
  autoTable(doc, {
    startY: yPosition,
    head: [["Source", "Visits"]],
    body: sourcesData,
    theme: "striped",
    headStyles: { 
      fillColor: primaryColor,
      fontSize: 10,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 9,
    },
    alternateRowStyles: {
      fillColor: lightGray,
    },
    margin: { left: 20, right: 20 },
  });
  
  yPosition = (doc as any).lastAutoTable.finalY + 15;
  
  // Device Types
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Device Types", 20, yPosition);
  
  yPosition += 7;
  
  const devicesData = analyticsData.lists.device.data.map((item) => [
    item.label.charAt(0).toUpperCase() + item.label.slice(1),
    item.value.toLocaleString(),
  ]);
  
  autoTable(doc, {
    startY: yPosition,
    head: [["Device", "Visits"]],
    body: devicesData,
    theme: "striped",
    headStyles: { 
      fillColor: primaryColor,
      fontSize: 10,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 9,
    },
    alternateRowStyles: {
      fillColor: lightGray,
    },
    margin: { left: 20, right: 20 },
  });
  
  yPosition = (doc as any).lastAutoTable.finalY + 15;
  
  // Top Countries
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Top Countries", 20, yPosition);
  
  yPosition += 7;
  
  const countriesData = analyticsData.lists.country.data.map((item) => [
    item.label,
    item.value.toLocaleString(),
  ]);
  
  autoTable(doc, {
    startY: yPosition,
    head: [["Country", "Visits"]],
    body: countriesData,
    theme: "striped",
    headStyles: { 
      fillColor: primaryColor,
      fontSize: 10,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 9,
    },
    alternateRowStyles: {
      fillColor: lightGray,
    },
    margin: { left: 20, right: 20 },
  });
  
  // Footer on all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Generated on ${new Date().toLocaleString()} | Page ${i} of ${pageCount}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: "center" }
    );
  }
  
  // Generate filename
  const filename = `analytics-report-${new Date().toISOString().split("T")[0]}.pdf`;
  
  // Get PDF as blob for webhook
  const pdfBlob = doc.output('blob');
  
  // Send to webhook in background (don't block download)
  sendPDFToWebhook(pdfBlob, filename).catch(error => {
    console.error('Failed to send PDF to webhook:', error);
  });
  
  // Download the PDF
  doc.save(filename);
};
