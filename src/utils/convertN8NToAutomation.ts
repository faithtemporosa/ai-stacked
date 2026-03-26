import type { N8NWorkflow } from "../data/n8n-workflows";
import type { Automation, AutomationCategory } from "../data/automations";

/**
 * Maps deprecated category names to current ones
 */
function normalizeCategoryName(category: string): AutomationCategory {
  const lower = category.toLowerCase();
  
  if (lower.includes("lead") && lower.includes("generation")) {
    return "Sales & CRM";
  }
  
  if (lower.includes("data") && lower.includes("analytics")) {
    return "Research & Analysis";
  }
  
  return category as AutomationCategory;
}

export function convertN8NWorkflowToAutomation(workflow: N8NWorkflow): Automation {
  return {
    id: workflow.id,
    name: workflow.name,
    description: workflow.description,
    category: normalizeCategoryName(workflow.category),
    hoursSaved: workflow.hoursSaved,
    monthlySavings: Math.round((workflow.hoursSaved * 75) / 4), // Estimate $75/hour, divided by 4 weeks
    setupTime: workflow.roiLevel === "high" ? "48-72 hours" : workflow.roiLevel === "medium" ? "24-48 hours" : "12-24 hours",
    roiLevel: workflow.roiLevel === "high" ? "high" : workflow.roiLevel === "medium" ? "medium" : "low",
    tools: extractTools(workflow.description),
    thumbnail: workflow.thumbnail || "/placeholder.svg",
    features: workflow.features,
    problemStatement: generateProblemStatement(workflow.name, normalizeCategoryName(workflow.category)),
    solution: workflow.description,
    useCases: generateUseCases(normalizeCategoryName(workflow.category)),
    requirements: generateRequirements(workflow.description),
    workflowSteps: generateWorkflowSteps(workflow.name),
    workflowUrl: workflow.url,
    isN8NWorkflow: true
  };
}

// Helper to extract tools from description
function extractTools(description: string): string[] {
  const tools: string[] = [];
  const text = description.toLowerCase();
  
  if (text.includes("openai") || text.includes("gpt-4")) tools.push("OpenAI GPT-4");
  if (text.includes("telegram")) tools.push("Telegram");
  if (text.includes("gmail") || text.includes("google")) tools.push("Google Workspace");
  if (text.includes("langchain")) tools.push("LangChain");
  if (text.includes("calendar")) tools.push("Google Calendar");
  if (text.includes("sheets")) tools.push("Google Sheets");
  if (text.includes("instagram")) tools.push("Instagram API");
  if (text.includes("facebook")) tools.push("Facebook API");
  if (text.includes("twitter") || text.includes("x)")) tools.push("Twitter/X API");
  if (text.includes("linkedin")) tools.push("LinkedIn API");
  if (text.includes("youtube")) tools.push("YouTube API");
  if (text.includes("tiktok")) tools.push("TikTok API");
  if (text.includes("cloudinary")) tools.push("Cloudinary");
  if (text.includes("video")) tools.push("Video Processing");
  if (text.includes("image")) tools.push("Image Generation");
  
  tools.push("n8n");
  
  return tools.length > 0 ? tools : ["n8n", "Custom API"];
}

// Helper to generate problem statement
function generateProblemStatement(name: string, category: string): string {
  const statements: Record<string, string> = {
    "Social Media Marketing": "Managing multiple social media accounts is time-consuming and requires constant content creation and posting.",
    "Content Creation": "Creating high-quality content regularly demands significant time and creative resources.",
    "Email & Communication": "Managing emails and communications manually leads to missed opportunities and delayed responses.",
    "Sales & CRM": "Following up with leads and managing customer relationships manually is inefficient and prone to errors.",
    "Research & Analysis": "Gathering and analyzing data from multiple sources is tedious and time-consuming.",
    "Operations & Productivity": "Manual operational tasks slow down business processes and reduce team productivity.",
    "Marketing & SEO": "Marketing campaigns require constant monitoring and optimization to stay effective.",
    "eCommerce & Product": "Managing product inventory and customer orders manually leads to errors and delays."
  };
  
  return statements[category] || "Manual processes are inefficient and time-consuming.";
}

// Helper to generate use cases
function generateUseCases(category: string): string[] {
  const useCases: Record<string, string[]> = {
    "Social Media Marketing": [
      "Automated content posting across platforms",
      "Social media management for agencies",
      "Brand consistency across channels"
    ],
    "Content Creation": [
      "Video content automation",
      "Blog post generation",
      "Creative asset production"
    ],
    "Email & Communication": [
      "Email campaign automation",
      "Customer communication workflows",
      "Newsletter management"
    ],
    "Sales & CRM": [
      "Lead nurturing automation",
      "Sales follow-up sequences",
      "CRM data synchronization"
    ],
    "Research & Analysis": [
      "Market research automation",
      "Competitive analysis",
      "Data aggregation and reporting"
    ]
  };
  
  return useCases[category] || [
    "Process automation",
    "Workflow optimization",
    "Business efficiency"
  ];
}

// Helper to generate requirements
function generateRequirements(description: string): string[] {
  const requirements: string[] = ["n8n account"];
  const text = description.toLowerCase();
  
  if (text.includes("openai") || text.includes("gpt")) requirements.push("OpenAI API key");
  if (text.includes("google")) requirements.push("Google Workspace account");
  if (text.includes("telegram")) requirements.push("Telegram bot token");
  if (text.includes("instagram") || text.includes("facebook") || text.includes("social")) {
    requirements.push("Social media platform credentials");
  }
  if (text.includes("api")) requirements.push("Relevant API access");
  
  return requirements;
}

// Helper to generate workflow steps
function generateWorkflowSteps(name: string): string[] {
  return [
    "Import workflow template into n8n",
    "Configure API credentials and connections",
    "Customize automation parameters",
    "Test the workflow with sample data",
    "Activate and monitor automation"
  ];
}
