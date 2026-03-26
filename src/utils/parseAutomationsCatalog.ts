import type { Automation, AutomationCategory } from "../data/automations";

// CSV data is loaded from the public directory at runtime
let cachedAutomations: Automation[] | null = null;

/**
 * Converts technical terms to generalized business-friendly terms
 * Focus: Show only account/service names without technical jargon
 */
function generalizeRequirement(requirement: string): string {
  let generalized = requirement;
  
  // Step 1: Remove vague and redundant terms first
  generalized = generalized
    .replace(/\b(Relevant|relevant|necessary|required)\s*/gi, '')
    .replace(/\baccount\s+access\s*(required)?\b/gi, '') // Remove generic "account access"
    .replace(/\bAPI\s+access\s*(required)?\b/gi, '')
    .replace(/\baccess\s+to\s*/gi, '');
  
  // Step 2: Remove all technical suffixes and prefixes
  generalized = generalized
    // Remove API-related terms (including plural forms)
    .replace(/\bAPIs?\s*(key|keys|token|tokens|credentials?|endpoint|integration|connection|access)\b/gi, '')
    .replace(/\bAPIs?\b/gi, '')
    // Remove authentication terms
    .replace(/\b(OAuth|OAuth2|authentication|auth|JWT|bearer)\s*(token|access|key)?\b/gi, '')
    // Remove technical action words that don't specify platforms
    .replace(/\b(access|credentials?|token|tokens|key|keys|integration|connection|endpoint|webhook|webhooks)\s*$/gi, '')
    .replace(/\b(with|using|via|through)\s+(API|api|OAuth|authentication|credentials?|token|access)\b/gi, '')
    // Remove version numbers
    .replace(/\bv\d+(\.\d+)*\b/g, '')
    // Remove HTTP methods
    .replace(/\b(GET|POST|PUT|DELETE|PATCH|REST|RESTful)\b/gi, '')
    // Remove technical prefixes
    .replace(/\b(developer|admin|business|enterprise)\s+(API|api|account|access|key|token)\b/gi, '$1')
    // Remove standalone technical terms
    .replace(/\b(webhook|webhooks|SDK|SMTP|IMAP|POP3|SSL|TLS|HTTPS?|JSON|XML|CSV|cron|endpoint|URL|URI)\b/gi, '')
    // Remove database terms
    .replace(/\b(database|SQL|MySQL|PostgreSQL|MongoDB|Redis)\b/gi, '')
    // Remove cloud service technical terms
    .replace(/\b(server|hosting|domain|DNS|CDN|S3|bucket)\b/gi, '')
    // Clean up extra spaces and punctuation
    .replace(/\s+/g, ' ')
    .replace(/\s*[,;]\s*/g, ', ')
    .replace(/\s*\.\s*$/g, '')
    .trim();
  
  // Step 3: Convert platform names to simple "Platform account" format
  const platformMap = [
    { pattern: /\b(n8n)\b/gi, replacement: 'n8n account' },
    { pattern: /\b(OpenAI)\b/gi, replacement: 'OpenAI account' },
    { pattern: /\b(TikTok)\b/gi, replacement: 'TikTok account' },
    { pattern: /\b(Instagram)\b/gi, replacement: 'Instagram account' },
    { pattern: /\b(Facebook)\b/gi, replacement: 'Facebook account' },
    { pattern: /\b(Twitter|X)\b/gi, replacement: 'Twitter account' },
    { pattern: /\b(LinkedIn)\b/gi, replacement: 'LinkedIn account' },
    { pattern: /\b(YouTube)\b/gi, replacement: 'YouTube account' },
    { pattern: /\b(Google\s*Workspace|Google\s*Suite|Google)\b/gi, replacement: 'Google account' },
    { pattern: /\b(Slack)\b/gi, replacement: 'Slack account' },
    { pattern: /\b(Stripe)\b/gi, replacement: 'Stripe account' },
    { pattern: /\b(PayPal)\b/gi, replacement: 'PayPal account' },
    { pattern: /\b(Shopify)\b/gi, replacement: 'Shopify account' },
    { pattern: /\b(HubSpot)\b/gi, replacement: 'HubSpot account' },
    { pattern: /\b(Salesforce)\b/gi, replacement: 'Salesforce account' },
    { pattern: /\b(Mailchimp)\b/gi, replacement: 'Mailchimp account' },
    { pattern: /\b(Zapier)\b/gi, replacement: 'Zapier account' },
    { pattern: /\b(Airtable)\b/gi, replacement: 'Airtable account' },
    { pattern: /\b(Notion)\b/gi, replacement: 'Notion account' },
    { pattern: /\b(Trello)\b/gi, replacement: 'Trello account' },
    { pattern: /\b(Asana)\b/gi, replacement: 'Asana account' },
    { pattern: /\b(Discord)\b/gi, replacement: 'Discord account' },
    { pattern: /\b(Telegram)\b/gi, replacement: 'Telegram account' },
    { pattern: /\b(Twilio)\b/gi, replacement: 'Twilio account' },
    { pattern: /\b(SendGrid)\b/gi, replacement: 'SendGrid account' },
    { pattern: /\b(Gmail)\b/gi, replacement: 'Gmail account' },
    { pattern: /\b(Google\s*Sheets)\b/gi, replacement: 'Google Sheets account' },
    { pattern: /\b(Google\s*Calendar)\b/gi, replacement: 'Google Calendar account' },
    { pattern: /\b(Google\s*Drive)\b/gi, replacement: 'Google Drive account' },
    { pattern: /\b(Cloudinary)\b/gi, replacement: 'Cloudinary account' },
    { pattern: /\b(Eleven\s*Labs|ElevenLabs)\b/gi, replacement: 'Eleven Labs account' },
    { pattern: /\b(AWS|Amazon\s*Web\s*Services)\b/gi, replacement: 'AWS account' },
    { pattern: /\b(Azure|Microsoft\s*Azure)\b/gi, replacement: 'Azure account' },
  ];
  
  // Apply platform patterns - only if the platform exists in the text
  platformMap.forEach(({ pattern, replacement }) => {
    if (pattern.test(generalized)) {
      generalized = generalized.replace(pattern, replacement);
      // Remove duplicate "account account" if it exists
      generalized = generalized.replace(/\baccount\s+account\b/gi, 'account');
    }
  });
  
  // Step 4: Final cleanup
  generalized = generalized
    .replace(/\s+/g, ' ')
    .replace(/,\s*,+/g, ',')
    .replace(/^\s*,\s*/, '')
    .replace(/\s*,\s*$/, '')
    .replace(/^;\s*/, '')
    .replace(/\s*;\s*$/, '')
    .trim();
  
  // Filter out if the result is too vague or empty
  const vagueTerms = [
    'account access',
    'access',
    'credentials',
    'required',
    'necessary',
    '',
  ];
  
  if (!generalized || generalized.length < 3 || vagueTerms.includes(generalized.toLowerCase())) {
    return ''; // Return empty to be filtered out
  }
  
  return generalized;
}

/**
 * Maps raw category strings from the CSV into our canonical AutomationCategory
 */
function normalizeCategoryName(category: string): AutomationCategory {
  const raw = category.trim();
  const lower = raw.toLowerCase();

  // Map deprecated categories to new ones
  if (lower.includes("lead") && lower.includes("generation")) {
    return "Sales & CRM";
  }
  
  if (lower.includes("data") && lower.includes("analytics")) {
    return "Research & Analysis";
  }

  return raw as AutomationCategory;
}

/**
 * APIs that are restricted, expensive, or require partner-level access
 * These automations are filtered out from the catalog
 */
const RESTRICTED_API_PATTERNS = [
  /tiktok/i,
  /twitter/i,
  /\bx\s+api\b/i,
  /instagram/i,
  /facebook/i,
  /\bmeta\s+(business|api)\b/i,
  /linkedin/i,
  /threads/i,
  /bluesky/i,
];

/**
 * Checks if an automation uses any restricted APIs
 */
function usesRestrictedAPI(automation: { tools: string[]; description: string; name: string }): boolean {
  const textToCheck = [
    automation.name,
    automation.description,
    ...automation.tools
  ].join(' ');
  
  return RESTRICTED_API_PATTERNS.some(pattern => pattern.test(textToCheck));
}

/**
 * Parses the automations catalog CSV and converts it to Automation objects
 */
export async function parseAutomationsCatalog(): Promise<Automation[]> {
  try {
    // In production, the CSV should be in public folder
    const response = await fetch('/automations-catalog.csv');
    const catalogCSV = await response.text();
    
    const lines = catalogCSV.split('\n');
    const automations: Automation[] = [];
    
    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Parse CSV line with proper handling of quoted fields
      const fields = parseCSVLine(line);
      
      if (fields.length < 17) continue; // Skip incomplete rows
      
      const [
        id,
        name,
        description,
        category,
        hoursSaved,
        monthlySavings,
        setupTime,
        priceAsPerROI,
        roiLevel,
        actualPrice,
        tools,
        features,
        problemStatement,
        solution,
        useCases,
        requirements,
        workflowUrl
      ] = fields;
      
      if (!id || !name) continue; // Skip rows without essential data
      
      automations.push({
        id: id.trim(),
        name: name.trim(),
        description: description.trim(),
        category: normalizeCategoryName(category),
        hoursSaved: parseInt(hoursSaved) || 0,
        monthlySavings: parseInt(monthlySavings) || 0,
        setupTime: setupTime.trim(),
        roiLevel: (roiLevel.trim() as "high" | "medium" | "low") || "medium",
        tools: tools.split(',').map(t => t.trim()).filter(Boolean),
        thumbnail: "/placeholder.svg",
        features: features.split(';').map(f => f.trim()).filter(Boolean),
        problemStatement: problemStatement.trim(),
        solution: solution.trim(),
        useCases: useCases.split(';').map(u => u.trim()).filter(Boolean),
        requirements: requirements.split(';').map(r => generalizeRequirement(r.trim())).filter(Boolean),
        workflowSteps: [], // We don't have workflow steps in the CSV
        workflowUrl: workflowUrl.trim() || undefined,
        isN8NWorkflow: true
      });
    }
    
    // Remove duplicates by ID and ensure Apollo automation exists
    const automationMap = new Map(automations.map(a => [a.id, a] as const));

    if (!automationMap.has("apollo-phone-enricher-sms-outreach")) {
      automationMap.set("apollo-phone-enricher-sms-outreach", {
        id: "apollo-phone-enricher-sms-outreach",
        name: "Apollo Phone Number Enricher to Text Messaging Outreach",
        description:
          "Automate lead enrichment and SMS outreach by using Apollo.io API to find phone numbers from email addresses, then automatically send personalized text messages. Integrates with Google Sheets for tracking and management.",
        category: "Sales & CRM",
        hoursSaved: 60,
        monthlySavings: 1125,
        setupTime: "48-72 hours",
        roiLevel: "high",
        tools: ["Apollo.io API", "Google Sheets", "SMS Gateway", "n8n"],
        thumbnail: "/placeholder.svg",
        features: [
          "Phone number enrichment from emails",
          "Automated SMS outreach",
          "Lead tracking in Google Sheets",
          "Personalized messaging",
          "Multi-stage campaign management",
          "Bulk contact processing",
          "Campaign performance tracking"
        ],
        problemStatement:
          "Manual lead enrichment and cold outreach via SMS is time-consuming and lacks systematic follow-up tracking.",
        solution:
          "Automate lead enrichment and SMS outreach by using Apollo.io API to find phone numbers from email addresses, then automatically send personalized text messages. Integrates with Google Sheets for tracking and management.",
        useCases: [
          "Lead generation campaigns",
          "Sales prospecting automation",
          "SMS outreach sequences",
          "Contact enrichment workflows",
          "B2B cold outreach at scale"
        ],
        requirements: [
          "n8n account",
          "Apollo.io account",
          "SMS gateway (Twilio or similar)",
          "Google Sheets access"
        ],
        workflowSteps: [
          "Import Apollo workflow template into n8n",
          "Configure Apollo.io API credentials",
          "Set up SMS gateway integration",
          "Connect Google Sheets for tracking",
          "Test with sample email addresses",
          "Activate bulk enrichment and outreach"
        ],
        workflowUrl: "/workflows/apollo-phone-enricher-sms-outreach.json",
        isN8NWorkflow: true,
      });
    }

    const uniqueAutomations = Array.from(automationMap.values());
    
    // Filter out automations using restricted APIs (TikTok, Twitter/X, Instagram, Facebook, LinkedIn, etc.)
    const filteredAutomations = uniqueAutomations.filter(automation => !usesRestrictedAPI(automation));
    
    console.log(`Filtered ${uniqueAutomations.length - filteredAutomations.length} automations with restricted APIs. Remaining: ${filteredAutomations.length}`);
    
    cachedAutomations = filteredAutomations;
    return filteredAutomations;
  } catch (error) {
    console.error('Failed to load automations catalog:', error);
    return [];
  }
}

/**
 * Parses a CSV line handling quoted fields properly
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let currentField = '';
  let insideQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // Escaped quote
        currentField += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      // Field separator
      fields.push(currentField);
      currentField = '';
    } else {
      currentField += char;
    }
  }
  
  // Add the last field
  fields.push(currentField);
  
  return fields;
}
