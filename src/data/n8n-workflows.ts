// N8N Workflow Templates - Organized by Category and ROI
export interface N8NWorkflow {
  id: string;
  name: string;
  description: string;
  category: AutomationCategory;
  price: number;
  hoursSaved: number;
  roiLevel: "high" | "medium" | "standard";
  features: string[];
  url: string;
  thumbnail?: string;
}

export type AutomationCategory =
  | "Social Media Marketing"
  | "Email & Communication"
  | "Operations & Productivity"
  | "Content Creation"
  | "Sales & CRM"
  | "Research & Analysis"
  | "Marketing & SEO"
  | "Lead Generation & Sales"
  | "eCommerce & Product"
  | "Data & Analytics";

export const n8nWorkflows: N8NWorkflow[] = [
  // HIGH ROI - Email & Communication / Operations
  {
    id: "telegram-ai-assistant",
    name: "AI-Powered Telegram Assistant",
    description: "Complete AI assistant on Telegram integrating GPT-4, Google Calendar, Gmail, and Baserow. Handles voice/text inputs, email summaries, calendar events, and task management.",
    category: "Operations & Productivity",
    price: 649,
    hoursSaved: 50,
    roiLevel: "high",
    features: [
      "Voice transcription",
      "Email summarization",
      "Calendar integration",
      "Task management (Baserow)",
      "Telegram interface"
    ],
    url: "https://drive.google.com/file/d/1X68iLPpkSlxL4YoZdWTjLjglxzO0on12/view?usp=drivesdk"
  },

  // HIGH ROI - Research & Content
  {
    id: "ai-research-report-generator",
    name: "AI-Powered Automated Research Report Generator",
    description: "Automated research reports using GPT-4, Wikipedia, NewsAPI, Google Search, and SerpApi. Generates professional PDFs and delivers via Gmail and Telegram.",
    category: "Research & Analysis",
    price: 599,
    hoursSaved: 45,
    roiLevel: "high",
    features: [
      "Multi-source research",
      "AI summarization (GPT-4)",
      "PDF generation",
      "Email & Telegram delivery",
      "Scholarly paper integration"
    ],
    url: "https://drive.google.com/file/d/1pl7u39pcJz0kTy9hjV-PR3Fc5Z0PZm_o/view?usp=drivesdk"
  },

  // MEDIUM ROI - Sales & CRM
  {
    id: "sales-meeting-follow-up",
    name: "AI-Driven Sales Meeting Follow-Up Scheduler",
    description: "Automate sales follow-ups using Google Calendar and Gmail. GPT-4 AI agents suggest and book meeting slots with human approval for final booking.",
    category: "Sales & CRM",
    price: 549,
    hoursSaved: 35,
    roiLevel: "medium",
    features: [
      "Auto follow-up detection",
      "AI meeting scheduling",
      "Email interaction tracking",
      "Calendar integration",
      "Human approval workflow"
    ],
    url: "https://drive.google.com/file/d/1jrBj51g5O9jdDaNBZWVXCsZiEjyOWH-x/view?usp=drivesdk"
  },

  // MEDIUM ROI - Content Analysis
  {
    id: "youtube-video-summaries",
    name: "YouTube Video Summaries & Transcripts via Gemini API",
    description: "Extract YouTube transcripts, summaries, scene descriptions, and social media clips using Google Gemini API. Customize prompts for versatile content analysis.",
    category: "Content Creation",
    price: 399,
    hoursSaved: 25,
    roiLevel: "medium",
    features: [
      "Auto transcript extraction",
      "AI video summarization",
      "Scene descriptions",
      "Social clip generation",
      "Customizable prompts"
    ],
    url: "https://drive.google.com/file/d/1-vX6sZJ_HxPvMOvmWG97bpdV__eBXNmr/view?usp=drivesdk"
  },

  // STANDARD ROI - Reference & Learning
  {
    id: "n8n-reference-library",
    name: "n8n AI & App Node Reference Library",
    description: "Comprehensive workflow showcasing various AI nodes (OpenAI, Langchain, Anthropic, Google Gemini) and app integrations. Visual reference for workflow building.",
    category: "Operations & Productivity",
    price: 299,
    hoursSaved: 15,
    roiLevel: "standard",
    features: [
      "AI node examples",
      "App integration samples",
      "Google Suite connections",
      "Visual reference guide",
      "Workflow templates"
    ],
    url: "https://drive.google.com/file/d/1e21TLDoXfHjGAzWYrkULaWEJpvBOnM3b/view?usp=drivesdk"
  }
];

export const categories: AutomationCategory[] = [
  "Social Media Marketing",
  "Email & Communication",
  "Operations & Productivity",
  "Content Creation",
  "Sales & CRM",
  "Research & Analysis",
  "Marketing & SEO",
  "Lead Generation & Sales",
  "eCommerce & Product",
  "Data & Analytics"
];

// Get workflows by ROI level (high, medium, standard)
export function getWorkflowsByROI(roiLevel: "high" | "medium" | "standard") {
  return n8nWorkflows.filter(w => w.roiLevel === roiLevel);
}

// Get highest ROI workflows for homepage display
export function getHighestROIWorkflows(limit: number = 6) {
  return n8nWorkflows
    .sort((a, b) => b.hoursSaved - a.hoursSaved)
    .slice(0, limit);
}

// Get workflows by category
export function getWorkflowsByCategory(category: AutomationCategory) {
  return n8nWorkflows.filter(w => w.category === category);
}

// Import and merge extended workflows from CSV
import { extendedN8NWorkflows } from "./n8n-workflows-extended";

// Export all workflows (base + extended from CSV)
export const allN8NWorkflows = [...n8nWorkflows, ...extendedN8NWorkflows];
