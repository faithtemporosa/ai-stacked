// Tool-to-credential mapping configuration
// This maps platform/tool names to their required credential fields

import { supabase } from "@/integrations/supabase/client";

export interface CredentialField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'email';
  required: boolean;
  placeholder?: string;
}

export interface ToolCredentialConfig {
  displayName: string;
  fields: CredentialField[];
  helpText?: string;
}

// Cache for database configs
let dbConfigCache: Record<string, ToolCredentialConfig> | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Comprehensive mapping of tools to their credential requirements
// Only username/password - no API keys (handled by automation engineer)
export const toolCredentialMap: Record<string, ToolCredentialConfig> = {
  // Email & Communication
  gmail: {
    displayName: 'Gmail',
    fields: [
      { key: 'email', label: 'Gmail Email Address', type: 'email', required: true, placeholder: 'you@gmail.com' },
      { key: 'password', label: 'Gmail App Password', type: 'password', required: true, placeholder: 'App-specific password' },
    ],
    helpText: 'Use an App Password from Google Account settings for security',
  },
  mailchimp: {
    displayName: 'Mailchimp',
    fields: [
      { key: 'username', label: 'Mailchimp Username', type: 'text', required: true },
      { key: 'password', label: 'Mailchimp Password', type: 'password', required: true },
    ],
  },
  klaviyo: {
    displayName: 'Klaviyo',
    fields: [
      { key: 'email', label: 'Klaviyo Email', type: 'email', required: true },
      { key: 'password', label: 'Klaviyo Password', type: 'password', required: true },
    ],
  },
  sendgrid: {
    displayName: 'SendGrid',
    fields: [
      { key: 'email', label: 'SendGrid Email', type: 'email', required: true },
      { key: 'password', label: 'SendGrid Password', type: 'password', required: true },
    ],
  },
  mailerlite: {
    displayName: 'MailerLite',
    fields: [
      { key: 'email', label: 'MailerLite Email', type: 'email', required: true },
      { key: 'password', label: 'MailerLite Password', type: 'password', required: true },
    ],
  },

  // Social Media
  linkedin: {
    displayName: 'LinkedIn',
    fields: [
      { key: 'email', label: 'LinkedIn Email', type: 'email', required: true },
      { key: 'password', label: 'LinkedIn Password', type: 'password', required: true },
    ],
  },
  twitter: {
    displayName: 'Twitter/X',
    fields: [
      { key: 'username', label: 'Twitter Username', type: 'text', required: true, placeholder: '@username' },
      { key: 'password', label: 'Twitter Password', type: 'password', required: true },
    ],
  },
  instagram: {
    displayName: 'Instagram',
    fields: [
      { key: 'username', label: 'Instagram Username', type: 'text', required: true },
      { key: 'password', label: 'Instagram Password', type: 'password', required: true },
    ],
  },
  facebook: {
    displayName: 'Facebook',
    fields: [
      { key: 'email', label: 'Facebook Email', type: 'email', required: true },
      { key: 'password', label: 'Facebook Password', type: 'password', required: true },
    ],
  },
  tiktok: {
    displayName: 'TikTok',
    fields: [
      { key: 'username', label: 'TikTok Username', type: 'text', required: true },
      { key: 'password', label: 'TikTok Password', type: 'password', required: true },
    ],
  },
  youtube: {
    displayName: 'YouTube',
    fields: [
      { key: 'email', label: 'Google/YouTube Email', type: 'email', required: true },
      { key: 'password', label: 'Google/YouTube Password', type: 'password', required: true },
    ],
    helpText: 'Use your Google account credentials',
  },
  threads: {
    displayName: 'Threads',
    fields: [
      { key: 'username', label: 'Threads Username', type: 'text', required: true },
      { key: 'password', label: 'Threads Password', type: 'password', required: true },
    ],
    helpText: 'Same as your Instagram credentials',
  },

  // Messaging
  slack: {
    displayName: 'Slack',
    fields: [
      { key: 'email', label: 'Slack Email', type: 'email', required: true },
      { key: 'password', label: 'Slack Password', type: 'password', required: true },
    ],
  },
  discord: {
    displayName: 'Discord',
    fields: [
      { key: 'email', label: 'Discord Email', type: 'email', required: true },
      { key: 'password', label: 'Discord Password', type: 'password', required: true },
    ],
  },
  telegram: {
    displayName: 'Telegram',
    fields: [
      { key: 'phone', label: 'Telegram Phone Number', type: 'text', required: true, placeholder: '+1234567890' },
    ],
    helpText: 'Our engineer will guide you through 2FA verification if needed',
  },
  whatsapp: {
    displayName: 'WhatsApp',
    fields: [
      { key: 'phone', label: 'WhatsApp Phone Number', type: 'text', required: true, placeholder: '+1234567890' },
    ],
    helpText: 'Our engineer will guide you through WhatsApp Business setup',
  },
  twilio: {
    displayName: 'Twilio',
    fields: [
      { key: 'email', label: 'Twilio Email', type: 'email', required: true },
      { key: 'password', label: 'Twilio Password', type: 'password', required: true },
    ],
  },

  // CRM & Sales
  apollo: {
    displayName: 'Apollo.io',
    fields: [
      { key: 'email', label: 'Apollo Email', type: 'email', required: true },
      { key: 'password', label: 'Apollo Password', type: 'password', required: true },
    ],
  },
  hubspot: {
    displayName: 'HubSpot',
    fields: [
      { key: 'email', label: 'HubSpot Email', type: 'email', required: true },
      { key: 'password', label: 'HubSpot Password', type: 'password', required: true },
    ],
  },
  salesforce: {
    displayName: 'Salesforce',
    fields: [
      { key: 'username', label: 'Salesforce Username', type: 'text', required: true },
      { key: 'password', label: 'Salesforce Password', type: 'password', required: true },
    ],
  },
  pipedrive: {
    displayName: 'Pipedrive',
    fields: [
      { key: 'email', label: 'Pipedrive Email', type: 'email', required: true },
      { key: 'password', label: 'Pipedrive Password', type: 'password', required: true },
    ],
  },
  zoho: {
    displayName: 'Zoho CRM',
    fields: [
      { key: 'email', label: 'Zoho Email', type: 'email', required: true },
      { key: 'password', label: 'Zoho Password', type: 'password', required: true },
    ],
  },

  // Google Suite
  google: {
    displayName: 'Google Account',
    fields: [
      { key: 'email', label: 'Google Email', type: 'email', required: true },
      { key: 'password', label: 'Google App Password', type: 'password', required: true },
    ],
    helpText: 'Use an App Password from Google Account settings',
  },
  'google sheets': {
    displayName: 'Google Sheets',
    fields: [
      { key: 'email', label: 'Google Email', type: 'email', required: true },
      { key: 'password', label: 'Google App Password', type: 'password', required: true },
    ],
    helpText: 'Use the same Google account that has access to your sheets',
  },
  'google drive': {
    displayName: 'Google Drive',
    fields: [
      { key: 'email', label: 'Google Email', type: 'email', required: true },
      { key: 'password', label: 'Google App Password', type: 'password', required: true },
    ],
  },
  'google calendar': {
    displayName: 'Google Calendar',
    fields: [
      { key: 'email', label: 'Google Email', type: 'email', required: true },
      { key: 'password', label: 'Google App Password', type: 'password', required: true },
    ],
  },

  // eCommerce
  shopify: {
    displayName: 'Shopify',
    fields: [
      { key: 'store_url', label: 'Shopify Store URL', type: 'text', required: true, placeholder: 'yourstore.myshopify.com' },
      { key: 'email', label: 'Shopify Email', type: 'email', required: true },
      { key: 'password', label: 'Shopify Password', type: 'password', required: true },
    ],
  },
  woocommerce: {
    displayName: 'WooCommerce',
    fields: [
      { key: 'site_url', label: 'WordPress Site URL', type: 'text', required: true, placeholder: 'https://yoursite.com' },
      { key: 'username', label: 'WordPress Username', type: 'text', required: true },
      { key: 'password', label: 'WordPress Password', type: 'password', required: true },
    ],
  },
  stripe: {
    displayName: 'Stripe',
    fields: [
      { key: 'email', label: 'Stripe Email', type: 'email', required: true },
      { key: 'password', label: 'Stripe Password', type: 'password', required: true },
    ],
  },
  paypal: {
    displayName: 'PayPal',
    fields: [
      { key: 'email', label: 'PayPal Email', type: 'email', required: true },
      { key: 'password', label: 'PayPal Password', type: 'password', required: true },
    ],
  },

  // Productivity
  notion: {
    displayName: 'Notion',
    fields: [
      { key: 'email', label: 'Notion Email', type: 'email', required: true },
      { key: 'password', label: 'Notion Password', type: 'password', required: true },
    ],
  },
  airtable: {
    displayName: 'Airtable',
    fields: [
      { key: 'email', label: 'Airtable Email', type: 'email', required: true },
      { key: 'password', label: 'Airtable Password', type: 'password', required: true },
    ],
  },
  asana: {
    displayName: 'Asana',
    fields: [
      { key: 'email', label: 'Asana Email', type: 'email', required: true },
      { key: 'password', label: 'Asana Password', type: 'password', required: true },
    ],
  },
  trello: {
    displayName: 'Trello',
    fields: [
      { key: 'email', label: 'Trello Email', type: 'email', required: true },
      { key: 'password', label: 'Trello Password', type: 'password', required: true },
    ],
  },
  monday: {
    displayName: 'Monday.com',
    fields: [
      { key: 'email', label: 'Monday Email', type: 'email', required: true },
      { key: 'password', label: 'Monday Password', type: 'password', required: true },
    ],
  },

  // Website Builders
  wordpress: {
    displayName: 'WordPress',
    fields: [
      { key: 'site_url', label: 'WordPress Site URL', type: 'text', required: true, placeholder: 'https://yoursite.com' },
      { key: 'username', label: 'WordPress Username', type: 'text', required: true },
      { key: 'password', label: 'WordPress Password', type: 'password', required: true },
    ],
  },
  webflow: {
    displayName: 'Webflow',
    fields: [
      { key: 'email', label: 'Webflow Email', type: 'email', required: true },
      { key: 'password', label: 'Webflow Password', type: 'password', required: true },
    ],
  },
  squarespace: {
    displayName: 'Squarespace',
    fields: [
      { key: 'email', label: 'Squarespace Email', type: 'email', required: true },
      { key: 'password', label: 'Squarespace Password', type: 'password', required: true },
    ],
  },

  // AI Tools (login only, API keys handled by engineer)
  openai: {
    displayName: 'OpenAI',
    fields: [
      { key: 'email', label: 'OpenAI Email', type: 'email', required: true },
      { key: 'password', label: 'OpenAI Password', type: 'password', required: true },
    ],
    helpText: 'Our engineer will set up API access after login verification',
  },
  chatgpt: {
    displayName: 'ChatGPT',
    fields: [
      { key: 'email', label: 'ChatGPT/OpenAI Email', type: 'email', required: true },
      { key: 'password', label: 'ChatGPT/OpenAI Password', type: 'password', required: true },
    ],
  },

  // Default fallback
  default: {
    displayName: 'Platform',
    fields: [
      { key: 'username', label: 'Username/Email', type: 'text', required: true },
      { key: 'password', label: 'Password', type: 'password', required: true },
    ],
  },
};

// List of tool patterns to search for in automation features
export const toolPatterns = [
  'gmail', 'google sheets', 'google drive', 'google calendar', 'google',
  'linkedin', 'twitter', 'instagram', 'facebook', 'tiktok', 'youtube', 'threads',
  'slack', 'discord', 'telegram', 'whatsapp', 'twilio',
  'apollo', 'hubspot', 'salesforce', 'pipedrive', 'zoho',
  'sendgrid', 'mailchimp', 'klaviyo', 'mailerlite',
  'shopify', 'woocommerce', 'stripe', 'paypal',
  'notion', 'airtable', 'asana', 'trello', 'monday',
  'wordpress', 'webflow', 'squarespace',
  'openai', 'chatgpt',
];

// Extract tools from automation features text
export const extractToolsFromFeatures = (features?: string[]): string[] => {
  if (!features || features.length === 0) return [];
  
  const foundTools = new Set<string>();
  const featuresText = features.join(' ').toLowerCase();
  
  // Sort patterns by length (longest first) to match multi-word patterns first
  const sortedPatterns = [...toolPatterns].sort((a, b) => b.length - a.length);
  
  sortedPatterns.forEach(tool => {
    if (featuresText.includes(tool)) {
      foundTools.add(tool);
    }
  });
  
  return Array.from(foundTools);
};

// Fetch tool configs from database (with caching)
export const fetchToolConfigsFromDB = async (): Promise<Record<string, ToolCredentialConfig>> => {
  const now = Date.now();
  
  // Return cached data if still valid
  if (dbConfigCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return dbConfigCache;
  }
  
  try {
    const { data, error } = await supabase
      .from('tool_credential_configs')
      .select('*')
      .eq('is_active', true);
    
    if (error) {
      console.error('Error fetching tool configs from DB:', error);
      return {};
    }
    
    const configMap: Record<string, ToolCredentialConfig> = {};
    
    data?.forEach(item => {
      configMap[item.tool_key] = {
        displayName: item.display_name,
        helpText: item.help_text || undefined,
        fields: (item.fields as unknown as CredentialField[]) || [],
      };
    });
    
    // Update cache
    dbConfigCache = configMap;
    cacheTimestamp = now;
    
    return configMap;
  } catch (error) {
    console.error('Error fetching tool configs:', error);
    return {};
  }
};

// Get credential config for a specific tool (sync version - uses static config)
export const getToolCredentialConfig = (toolName: string): ToolCredentialConfig => {
  const normalizedName = toolName.toLowerCase().trim();
  
  // First check cache from DB
  if (dbConfigCache && dbConfigCache[normalizedName]) {
    return dbConfigCache[normalizedName];
  }
  
  // Fall back to static config
  return toolCredentialMap[normalizedName] || toolCredentialMap.default;
};

// Async version that checks DB first
export const getToolCredentialConfigAsync = async (toolName: string): Promise<ToolCredentialConfig> => {
  const normalizedName = toolName.toLowerCase().trim();
  
  // Fetch from DB (uses cache if available)
  const dbConfigs = await fetchToolConfigsFromDB();
  
  if (dbConfigs[normalizedName]) {
    return dbConfigs[normalizedName];
  }
  
  // Fall back to static config
  return toolCredentialMap[normalizedName] || toolCredentialMap.default;
};

// Get all credential fields for multiple tools
export const getCredentialFieldsForTools = (tools: string[]): { tool: string; config: ToolCredentialConfig }[] => {
  return tools.map(tool => ({
    tool,
    config: getToolCredentialConfig(tool),
  }));
};

// Preload configs from database (call this on app init or component mount)
export const preloadToolConfigs = async (): Promise<void> => {
  await fetchToolConfigsFromDB();
};

// Clear the cache (useful after admin updates)
export const clearToolConfigCache = (): void => {
  dbConfigCache = null;
  cacheTimestamp = 0;
};
