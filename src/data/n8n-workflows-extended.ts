// Extended n8n workflows from CSV import
import type { N8NWorkflow, AutomationCategory } from "./n8n-workflows";
import csvData from "./n8n-templates.csv?raw";

// Helper to categorize workflows based on keywords
function categorizeWorkflow(name: string, description: string): AutomationCategory {
  const text = `${name} ${description}`.toLowerCase();
  
  if (text.includes("social media") || text.includes("instagram") || text.includes("facebook") || 
      text.includes("twitter") || text.includes("linkedin") || text.includes("tiktok") || 
      text.includes("youtube") || text.includes("posting")) {
    return "Social Media Marketing";
  }
  if (text.includes("email") || text.includes("gmail") || text.includes("newsletter") || 
      text.includes("digest") || text.includes("communication")) {
    return "Email & Communication" as AutomationCategory;
  }
  if (text.includes("sales") || text.includes("crm") || text.includes("lead") || 
      text.includes("meeting") || text.includes("follow-up")) {
    return "Sales & CRM";
  }
  if (text.includes("research") || text.includes("analysis") || text.includes("data") || 
      text.includes("report") || text.includes("analytics")) {
    return "Research & Analysis";
  }
  if (text.includes("video") || text.includes("content") || text.includes("creator") || 
      text.includes("generation") || text.includes("creative")) {
    return "Content Creation";
  }
  if (text.includes("ecommerce") || text.includes("product") || text.includes("shopify") || 
      text.includes("store")) {
    return "eCommerce & Product" as AutomationCategory;
  }
  if (text.includes("marketing") || text.includes("seo") || text.includes("campaign")) {
    return "Marketing & SEO" as AutomationCategory;
  }
  if (text.includes("lead") || text.includes("prospect") || text.includes("outreach")) {
    return "Lead Generation & Sales" as AutomationCategory;
  }
  return "Operations & Productivity" as AutomationCategory;
}

// Helper to estimate hours saved
function estimateHoursSaved(category: string, description: string): number {
  const text = description.toLowerCase();
  
  if (text.includes("multi-platform") || text.includes("9 platforms") || 
      text.includes("auto-publish") || text.includes("video generation")) {
    return 70 + Math.floor(Math.random() * 20);
  }
  
  if (text.includes("automation") || text.includes("ai-powered") || 
      text.includes("gpt-4") || text.includes("scheduling")) {
    return 40 + Math.floor(Math.random() * 30);
  }
  
  return 20 + Math.floor(Math.random() * 20);
}

// Helper to calculate ROI
function calculateROI(hoursSaved: number): "high" | "medium" | "standard" {
  if (hoursSaved >= 60) return "high";
  if (hoursSaved >= 35) return "medium";
  return "standard";
}

// Helper to extract features
function extractFeatures(description: string): string[] {
  const features: string[] = [];
  const text = description.toLowerCase();
  
  if (text.includes("gpt-4") || text.includes("openai") || text.includes("ai")) features.push("AI-powered automation");
  if (text.includes("multi-platform") || text.includes("platforms")) features.push("Multi-platform support");
  if (text.includes("video")) features.push("Video automation");
  if (text.includes("image")) features.push("Image generation");
  if (text.includes("voice") || text.includes("voiceover")) features.push("Voice-over generation");
  if (text.includes("approval")) features.push("Human approval workflow");
  if (text.includes("telegram")) features.push("Telegram integration");
  if (text.includes("google")) features.push("Google Suite integration");
  if (text.includes("calendar")) features.push("Calendar management");
  if (text.includes("email")) features.push("Email automation");
  
  if (features.length < 3) {
    features.push("Custom workflow automation");
    features.push("Easy setup & configuration");
  }
  
  return features.slice(0, 5);
}

/**
 * APIs that are restricted, expensive, or require partner-level access
 */
const RESTRICTED_API_PATTERNS = [
  /tiktok/i,
  /twitter/i,
  /\bx\)/i,  // "X)" in descriptions like "Twitter (X)"
  /instagram/i,
  /facebook/i,
  /linkedin/i,
  /threads/i,
  /bluesky/i,
];

function usesRestrictedAPI(name: string, description: string): boolean {
  const textToCheck = `${name} ${description}`;
  return RESTRICTED_API_PATTERNS.some(pattern => pattern.test(textToCheck));
}

// Parse CSV and generate workflows
function parseCSVWorkflows(): N8NWorkflow[] {
  const workflows: N8NWorkflow[] = [];
  const lines = csvData.split('\n');
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Match CSV format: name,description,url (with possible quotes)
    const match = line.match(/^([^,]+),"([^"]+)","?([^"]+)"?$/);
    if (!match) continue;
    
    const [, name, description, url] = match;
    if (!name || !description || !url) continue;
    
    const cleanName = name.replace(/^\d+:\s*/, '').trim();
    
    // Skip automations using restricted APIs
    if (usesRestrictedAPI(cleanName, description)) {
      continue;
    }
    
    const category = categorizeWorkflow(cleanName, description);
    const hoursSaved = estimateHoursSaved(category, description);
    const roiLevel = calculateROI(hoursSaved);
    const features = extractFeatures(description);
    
    const basePrice = roiLevel === "high" ? 799 : roiLevel === "medium" ? 499 : 299;
    const price = basePrice + (Math.floor(Math.random() * 3) * 100);
    
    workflows.push({
      id: `n8n-${cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 50)}`,
      name: cleanName,
      description: description.trim(),
      category,
      price,
      hoursSaved,
      roiLevel,
      features,
      url: url.trim()
    });
  }
  
  return workflows;
}

export const extendedN8NWorkflows = parseCSVWorkflows();
