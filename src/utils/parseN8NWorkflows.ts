import type { Automation } from "../data/automations";

interface N8NWorkflowJSON {
  name: string;
  nodes: any[];
}

/**
 * Parse n8n workflow JSON files and convert to Automation objects
 */
export async function parseN8NWorkflowFile(filePath: string): Promise<Automation | null> {
  try {
    const response = await fetch(filePath);
    const workflow: N8NWorkflowJSON = await response.json();
    
    return convertN8NJSONToAutomation(workflow, filePath);
  } catch (error) {
    console.error(`Error parsing workflow from ${filePath}:`, error);
    return null;
  }
}

function convertN8NJSONToAutomation(workflow: N8NWorkflowJSON, filePath: string): Automation {
  const name = workflow.name;
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  
  // Determine category and details based on workflow name
  let category: Automation["category"] = "Sales & CRM";
  let description = "";
  let hoursSaved = 40;
  let features: string[] = [];
  let tools: string[] = ["n8n"];
  
  if (name.includes("Company Research")) {
    category = "Research & Analysis";
    description = "Automatically research and analyze companies at scale. Extract key information including pricing, market position, integrations, and case studies from company websites.";
    hoursSaved = 45;
    features = [
      "Automated company research",
      "Pricing intelligence",
      "Market analysis",
      "Integration discovery",
      "Case study extraction"
    ];
    tools = ["n8n", "Web Scraping", "AI Analysis", "Data Processing"];
  } else if (name.includes("Apollo") || name.includes("SMS")) {
    category = "Sales & CRM";
    description = "Automate lead enrichment and SMS outreach by using Apollo.io API to find phone numbers from email addresses, then automatically send personalized text messages.";
    hoursSaved = 60;
    features = [
      "Phone number enrichment",
      "Automated SMS outreach",
      "Lead tracking",
      "Personalized messaging",
      "Campaign management"
    ];
    tools = ["n8n", "Apollo.io API", "SMS Gateway", "Google Sheets"];
  }
  
  const monthlySavings = Math.round((hoursSaved * 75) / 4);
  
  return {
    id,
    name,
    description,
    category,
    hoursSaved,
    monthlySavings,
    setupTime: "48-72 hours",
    roiLevel: "high",
    tools,
    thumbnail: "/placeholder.svg",
    features,
    problemStatement: generateProblemStatement(category),
    solution: description,
    useCases: generateUseCases(category),
    requirements: [...new Set([...tools.map(t => `${t} account`), "API credentials"])],
    workflowSteps: [
      "Import workflow template into n8n",
      "Configure API credentials and connections",
      "Customize automation parameters",
      "Test the workflow with sample data",
      "Activate and monitor automation"
    ],
    workflowUrl: filePath,
    isN8NWorkflow: true
  };
}

function generateProblemStatement(category: string): string {
  const statements: Record<string, string> = {
    "Sales & CRM": "Manual lead generation and outreach is time-consuming and doesn't scale effectively.",
    "Research & Analysis": "Researching companies and gathering competitive intelligence manually takes hours of tedious work.",
    "Social Media Marketing": "Responding to social media comments and maintaining engagement requires constant attention and effort."
  };
  
  return statements[category] || "Manual processes are inefficient and time-consuming.";
}

function generateUseCases(category: string): string[] {
  const useCases: Record<string, string[]> = {
    "Sales & CRM": [
      "B2B lead generation",
      "Sales prospecting automation",
      "LinkedIn outreach campaigns"
    ],
    "Research & Analysis": [
      "Competitive intelligence",
      "Market research automation",
      "Company profiling at scale"
    ],
    "Social Media Marketing": [
      "Community management",
      "Engagement automation",
      "Brand presence maintenance"
    ]
  };
  
  return useCases[category] || [
    "Process automation",
    "Workflow optimization",
    "Business efficiency"
  ];
}

/**
 * Load all premium n8n workflows (excluding restricted API workflows)
 */
export async function loadPremiumN8NWorkflows(): Promise<Automation[]> {
  // Only load workflows that don't use restricted APIs
  // Removed: linkedin-connection-request.json, linkedin-comments-responder.json
  const workflowPaths = [
    "/workflows/company-research-analysis.json",
    "/workflows/apollo-phone-enricher-sms-outreach.json"
  ];
  
  const workflows = await Promise.all(
    workflowPaths.map(path => parseN8NWorkflowFile(path))
  );
  
  return workflows.filter((w): w is Automation => w !== null);
}
