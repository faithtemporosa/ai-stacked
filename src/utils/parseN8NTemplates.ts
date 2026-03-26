import type { AutomationCategory } from "@/data/automations";

export interface ParsedN8NWorkflow {
  id: string;
  name: string;
  description: string;
  category: AutomationCategory;
  price: number;
  hoursSaved: number;
  roiLevel: "high" | "medium" | "standard";
  features: string[];
  url: string;
}

// Helper to categorize workflows based on keywords in name/description
function categorizeWorkflow(name: string, description: string): AutomationCategory {
  const text = `${name} ${description}`.toLowerCase();
  
  if (text.includes("social media") || text.includes("instagram") || text.includes("facebook") || 
      text.includes("twitter") || text.includes("linkedin") || text.includes("tiktok") || 
      text.includes("youtube") || text.includes("posting")) {
    return "Social Media Marketing";
  }
  if (text.includes("email") || text.includes("gmail") || text.includes("newsletter") || 
      text.includes("digest")) {
    return "Email & Communication";
  }
  if (text.includes("sales") || text.includes("crm") || text.includes("lead") || 
      text.includes("meeting") || text.includes("follow-up")) {
    return "Sales & CRM";
  }
  if (text.includes("research") || text.includes("analysis") || text.includes("data") || 
      text.includes("report")) {
    return "Research & Analysis";
  }
  if (text.includes("video") || text.includes("content") || text.includes("creator") || 
      text.includes("generation")) {
    return "Content Creation";
  }
  return "Operations & Productivity";
}

// Helper to estimate hours saved based on automation type
function estimateHoursSaved(category: AutomationCategory, description: string): number {
  const text = description.toLowerCase();
  
  // High impact indicators
  if (text.includes("multi-platform") || text.includes("9 platforms") || 
      text.includes("auto-publish") || text.includes("video generation")) {
    return 70 + Math.floor(Math.random() * 20); // 70-90 hours
  }
  
  // Medium-high impact
  if (text.includes("automation") || text.includes("ai-powered") || 
      text.includes("gpt-4") || text.includes("scheduling")) {
    return 40 + Math.floor(Math.random() * 30); // 40-70 hours
  }
  
  // Standard impact
  return 20 + Math.floor(Math.random() * 20); // 20-40 hours
}

// Helper to calculate ROI level
function calculateROI(hoursSaved: number): "high" | "medium" | "standard" {
  if (hoursSaved >= 60) return "high";
  if (hoursSaved >= 35) return "medium";
  return "standard";
}

// Helper to extract features from description
function extractFeatures(description: string): string[] {
  const features: string[] = [];
  const text = description.toLowerCase();
  
  if (text.includes("gpt-4") || text.includes("openai")) features.push("AI-powered with GPT-4");
  if (text.includes("multi-platform") || text.includes("platforms")) features.push("Multi-platform support");
  if (text.includes("video")) features.push("Video automation");
  if (text.includes("image")) features.push("Image generation");
  if (text.includes("voice") || text.includes("voiceover")) features.push("Voice-over generation");
  if (text.includes("approval")) features.push("Human approval workflow");
  if (text.includes("telegram")) features.push("Telegram integration");
  if (text.includes("google")) features.push("Google Suite integration");
  if (text.includes("calendar")) features.push("Calendar management");
  if (text.includes("email")) features.push("Email automation");
  
  // Ensure at least 3 features
  if (features.length < 3) {
    features.push("Custom workflow automation");
    features.push("Easy setup & configuration");
  }
  
  return features.slice(0, 5); // Limit to 5 features
}

// Parse CSV data and convert to workflow objects
export function parseN8NTemplatesCSV(csvContent: string): ParsedN8NWorkflow[] {
  const lines = csvContent.split('\n');
  const workflows: ParsedN8NWorkflow[] = [];
  
  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Parse CSV line (handling quoted fields)
    const matches = line.match(/^"?([^"]*)"?,"([^"]*)","?([^"]*)"?$/);
    if (!matches || matches.length < 4) continue;
    
    const [, name, description, url] = matches;
    if (!name || !description || !url) continue;
    
    const category = categorizeWorkflow(name, description);
    const hoursSaved = estimateHoursSaved(category, description);
    const roiLevel = calculateROI(hoursSaved);
    const features = extractFeatures(description);
    
    // Calculate price based on ROI
    const basePrice = roiLevel === "high" ? 799 : roiLevel === "medium" ? 499 : 299;
    const price = basePrice + (Math.floor(Math.random() * 3) * 100);
    
    workflows.push({
      id: `n8n-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-')}`,
      name: name.trim(),
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
