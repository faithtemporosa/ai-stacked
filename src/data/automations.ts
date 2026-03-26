// Automations are loaded from CSV at runtime
export type AutomationCategory =
  | "Email & Communication"
  | "Marketing & SEO"
  | "Operations & Productivity"
  | "eCommerce & Product"
  | "Social Media Marketing"
  | "Content Creation"
  | "Research & Analysis"
  | "Sales & CRM";

export interface Automation {
  id: string;
  name: string;
  description: string;
  category: AutomationCategory;
  hoursSaved: number;
  monthlySavings: number;
  setupTime: string;
  roiLevel: "high" | "medium" | "low";
  tools: string[];
  thumbnail: string;
  features: string[];
  problemStatement: string;
  solution: string;
  useCases: string[];
  requirements: string[];
  workflowSteps: string[];
  workflowUrl?: string;
  isN8NWorkflow?: boolean;
}

// Automations will be loaded dynamically from CSV
export let automations: Automation[] = [];

export const categories: AutomationCategory[] = [
  "Social Media Marketing",
  "Content Creation",
  "Email & Communication",
  "Marketing & SEO",
  "Operations & Productivity",
  "eCommerce & Product",
  "Research & Analysis",
  "Sales & CRM"
];

// Load automations from CSV and premium workflows
import { parseAutomationsCatalog } from "../utils/parseAutomationsCatalog";
import { loadPremiumN8NWorkflows } from "../utils/parseN8NWorkflows";

// Load both premium workflows and catalog automations
Promise.all([
  loadPremiumN8NWorkflows(),
  parseAutomationsCatalog()
]).then(([premiumWorkflows, catalogData]) => {
  automations.length = 0;
  // Add premium high-ROI workflows first (at the top)
  automations.push(...premiumWorkflows);
  // Then add catalog automations
  automations.push(...catalogData);
});
