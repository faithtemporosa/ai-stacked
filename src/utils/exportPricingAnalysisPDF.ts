import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ToolPricing {
  name: string;
  category: string;
  freetier: string;
  paidPlan: string;
}

interface CategoryCost {
  category: string;
  toolsUsed: string[];
  recommendedPrice: string;
  margin: string;
}

const toolPricingData: ToolPricing[] = [
  // Automation Platform
  { name: 'n8n', category: 'Automation Platform', freetier: 'Self-hosted free', paidPlan: '$24/mo starter' },
  
  // AI/LLM APIs
  { name: 'OpenAI GPT-5', category: 'AI/LLM', freetier: 'None', paidPlan: 'Usage-based' },
  { name: 'OpenAI GPT-5 mini', category: 'AI/LLM', freetier: 'None', paidPlan: 'Usage-based' },
  { name: 'OpenAI GPT-5 nano', category: 'AI/LLM', freetier: 'None', paidPlan: 'Usage-based' },
  { name: 'Google Gemini 2.5 Pro', category: 'AI/LLM', freetier: '50 req/day', paidPlan: 'Usage-based' },
  { name: 'Google Gemini 2.5 Flash', category: 'AI/LLM', freetier: '500 req/day', paidPlan: 'Usage-based' },
  { name: 'Anthropic Claude', category: 'AI/LLM', freetier: 'None', paidPlan: 'Usage-based' },
  
  // Voice & Audio
  { name: 'ElevenLabs', category: 'Voice & Audio', freetier: '10k chars/mo', paidPlan: '$5/mo+' },
  { name: 'OpenAI TTS', category: 'Voice & Audio', freetier: 'None', paidPlan: 'Usage-based' },
  { name: 'OpenAI Whisper', category: 'Voice & Audio', freetier: 'None', paidPlan: 'Usage-based' },
  
  // Video Generation
  { name: 'Creatomate', category: 'Video Generation', freetier: '5 videos', paidPlan: '$18/mo+' },
  { name: 'PiAPI (Kling AI)', category: 'Video Generation', freetier: 'None', paidPlan: 'Usage-based' },
  { name: 'Pollinations.ai', category: 'Video Generation', freetier: 'Free', paidPlan: 'Free (community)' },
  
  // Cloud Storage & Media
  { name: 'Cloudinary', category: 'Storage & Media', freetier: '25 credits/mo', paidPlan: '$99/mo+' },
  { name: 'imgbb', category: 'Storage & Media', freetier: 'Unlimited', paidPlan: 'Free' },
  
  // Messaging & Communication
  { name: 'Twilio SMS', category: 'Messaging', freetier: '$15 trial', paidPlan: 'Usage-based' },
  { name: 'Telegram Bot API', category: 'Messaging', freetier: 'Free', paidPlan: 'Free' },
  { name: 'Blotato', category: 'Messaging', freetier: 'Trial', paidPlan: '$15/mo' },
  
  // Social Media APIs
  { name: 'Instagram API', category: 'Social Media', freetier: 'Limited', paidPlan: 'Via Meta Business' },
  { name: 'Facebook API', category: 'Social Media', freetier: 'Free', paidPlan: 'Free' },
  { name: 'Twitter/X API', category: 'Social Media', freetier: '1.5k posts/mo', paidPlan: '$100/mo Basic' },
  { name: 'LinkedIn API', category: 'Social Media', freetier: 'Limited', paidPlan: 'Partnership required' },
  { name: 'YouTube API', category: 'Social Media', freetier: '10k units/day', paidPlan: 'Free' },
  { name: 'TikTok API', category: 'Social Media', freetier: 'Limited', paidPlan: 'Partnership required' },
  { name: 'Pinterest API', category: 'Social Media', freetier: 'Free', paidPlan: 'Free' },
  { name: 'Bluesky API', category: 'Social Media', freetier: 'Free', paidPlan: 'Free' },
  
  // Email & Productivity
  { name: 'Gmail API', category: 'Email & Productivity', freetier: 'Free', paidPlan: 'Free with Workspace' },
  { name: 'Google Sheets API', category: 'Email & Productivity', freetier: 'Free', paidPlan: 'Free' },
  { name: 'Google Calendar API', category: 'Email & Productivity', freetier: 'Free', paidPlan: 'Free' },
  { name: 'Google Docs API', category: 'Email & Productivity', freetier: 'Free', paidPlan: 'Free' },
  
  // Research & Data (cost-effective tools only - high-cost tools removed from catalog)
  { name: 'Wikipedia API', category: 'Research & Data', freetier: 'Free', paidPlan: 'Free' },
  { name: 'Ahrefs via RapidAPI', category: 'Research & Data', freetier: 'Pay per use', paidPlan: 'Usage-based' },
  { name: 'PDFShift', category: 'Research & Data', freetier: '50 conversions', paidPlan: '$9/mo+' },
  
  // CRM & Sales
  { name: 'Apollo.io', category: 'CRM & Sales', freetier: '10k records/mo', paidPlan: '$49/mo' },
  { name: 'HubSpot', category: 'CRM & Sales', freetier: 'Free CRM', paidPlan: '$20/mo starter' },
  { name: 'Baserow', category: 'CRM & Sales', freetier: '3k rows', paidPlan: '$10/mo' },
];

const categoryCostData: CategoryCost[] = [
  {
    category: 'Simple Automations',
    toolsUsed: ['n8n (shared)', 'Google APIs (free)', 'Telegram (free)'],
    recommendedPrice: '$99',
    margin: '97-99%'
  },
  {
    category: 'AI-Powered Automations',
    toolsUsed: ['n8n', 'GPT-5 mini/nano', 'Gemini Flash'],
    recommendedPrice: '$99',
    margin: '95-98%'
  },
  {
    category: 'Voice Automations',
    toolsUsed: ['n8n', 'ElevenLabs', 'OpenAI TTS/Whisper', 'Twilio'],
    recommendedPrice: '$99',
    margin: '87-96%'
  },
  {
    category: 'Video Automations',
    toolsUsed: ['n8n', 'Creatomate', 'PiAPI/Kling', 'Cloudinary', 'AI APIs'],
    recommendedPrice: '$99',
    margin: '80-92%'
  },
  {
    category: 'Research Automations',
    toolsUsed: ['n8n', 'GPT-3.5-turbo', 'Google Gemini', 'Wikipedia API', 'Standard APIs'],
    recommendedPrice: '$99',
    margin: '90-97%'
  },
];

export function exportPricingAnalysisPDF(): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  doc.setFillColor(20, 20, 20);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Tool Pricing & Cost Analysis', 14, 25);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 35);
  
  // Reset text color
  doc.setTextColor(0, 0, 0);
  
  let yPos = 50;
  
  // Executive Summary
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Executive Summary', 14, yPos);
  yPos += 8;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const summaryText = [
    'This analysis covers tool costs for automation delivery across 5 categories.',
    'Flat $99/automation pricing ensures 70%+ margins across ALL categories.',
    'Even high-cost video/research automations maintain healthy profitability.',
  ];
  summaryText.forEach(line => {
    doc.text(line, 14, yPos);
    yPos += 5;
  });
  
  yPos += 10;
  
  // Category Summary Table
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Pricing by Category', 14, yPos);
  yPos += 5;
  
  autoTable(doc, {
    startY: yPos,
    head: [['Category', 'Recommended Price', 'Margin']],
    body: categoryCostData.map(cat => [
      cat.category,
      cat.recommendedPrice,
      cat.margin
    ]),
    headStyles: { fillColor: [45, 45, 45], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    styles: { fontSize: 9 },
    margin: { left: 14, right: 14 },
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 15;
  
  // Tools Used by Category
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Tools by Category', 14, yPos);
  yPos += 5;
  
  autoTable(doc, {
    startY: yPos,
    head: [['Category', 'Primary Tools']],
    body: categoryCostData.map(cat => [
      cat.category,
      cat.toolsUsed.join(', ')
    ]),
    headStyles: { fillColor: [45, 45, 45], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    styles: { fontSize: 9 },
    columnStyles: { 1: { cellWidth: 120 } },
    margin: { left: 14, right: 14 },
  });
  
  // New page for full tool pricing
  doc.addPage();
  
  doc.setFillColor(20, 20, 20);
  doc.rect(0, 0, pageWidth, 25, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Complete Tool Pricing Reference', 14, 17);
  doc.setTextColor(0, 0, 0);
  
  yPos = 35;
  
  // Group tools by category
  const categories = [...new Set(toolPricingData.map(t => t.category))];
  
  categories.forEach((category, index) => {
    const categoryTools = toolPricingData.filter(t => t.category === category);
    
    // Check if we need a new page
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(category, 14, yPos);
    yPos += 3;
    
    autoTable(doc, {
      startY: yPos,
      head: [['Tool', 'Free Tier', 'Paid Plan']],
      body: categoryTools.map(tool => [
        tool.name,
        tool.freetier || 'None',
        tool.paidPlan
      ]),
      headStyles: { fillColor: [70, 70, 70], textColor: [255, 255, 255], fontSize: 8 },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      styles: { fontSize: 8, cellPadding: 2 },
      margin: { left: 14, right: 14 },
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 10;
  });
  
  // New page for pricing recommendations
  doc.addPage();
  
  doc.setFillColor(20, 20, 20);
  doc.rect(0, 0, pageWidth, 25, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Pricing Strategy Recommendations', 14, 17);
  doc.setTextColor(0, 0, 0);
  
  yPos = 40;
  
  // Option A - Current Strategy
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Option A: Flat $99 Pricing (Current)', 14, yPos);
  yPos += 8;
  
  autoTable(doc, {
    startY: yPos,
    head: [['All Automations']],
    body: [['$99 per automation']],
    headStyles: { fillColor: [34, 139, 34], textColor: [255, 255, 255] },
    styles: { fontSize: 11, halign: 'center' },
    margin: { left: 14, right: 100 },
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Pros: Simple, easy to communicate, 70%+ margins on ALL categories', 14, yPos);
  doc.text('Cons: None - safe for all automation types including video/voice', 14, yPos + 4);
  
  yPos += 20;
  
  // Option B - Bulk Discounts
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Option B: Volume Discounts', 14, yPos);
  yPos += 8;
  
  autoTable(doc, {
    startY: yPos,
    head: [['Quantity', 'Per-Unit Price', 'Discount']],
    body: [
      ['1 automation', '$99', '0%'],
      ['2-3 automations', '$89', '10%'],
      ['4-6 automations', '$79', '20%'],
      ['7-10 automations', '$69', '25%'],
      ['11+ automations', '$59', '30%'],
    ],
    headStyles: { fillColor: [0, 100, 180], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [240, 248, 255] },
    styles: { fontSize: 10 },
    margin: { left: 14, right: 14 },
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Pros: Incentivizes bulk purchases, maintains healthy margins', 14, yPos);
  doc.text('Cons: Requires Stripe tier configuration', 14, yPos + 4);
  
  yPos += 20;
  
  // Option C - Category-Based
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Option C: Category-Based Pricing', 14, yPos);
  yPos += 8;
  
  autoTable(doc, {
    startY: yPos,
    head: [['Category', 'Price']],
    body: [
      ['Simple/Operations', '$69'],
      ['AI-Powered/Email', '$79'],
      ['Research/Voice', '$99'],
      ['Video', '$129'],
    ],
    headStyles: { fillColor: [180, 100, 0], textColor: [255, 255, 255] },
    styles: { fontSize: 10 },
    margin: { left: 14, right: 100 },
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Pros: Maximizes margins per category', 14, yPos);
  doc.text('Cons: Complex to communicate, requires category assignment', 14, yPos + 4);
  
  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `AI-Stacked Pricing Analysis | Page ${i} of ${totalPages}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }
  
  // Save
  const filename = `pricing-cost-analysis-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}
