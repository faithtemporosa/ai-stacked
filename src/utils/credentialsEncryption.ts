// Client-side encryption utilities for credentials
// Note: Actual encryption happens server-side for security

export async function encryptCredential(data: {
  tool_name: string;
  credential_type: string;
  username?: string;
  password?: string;
  api_key?: string;
  extra_fields?: Record<string, any>;
  connection_notes?: string;
  tags?: string[];
}) {
  // Data is sent to server for encryption
  // This function validates and formats the data
  return {
    tool_name: data.tool_name.trim(),
    credential_type: data.credential_type,
    username: data.username?.trim() || null,
    password: data.password || null,
    api_key: data.api_key?.trim() || null,
    extra_fields: data.extra_fields || null,
    connection_notes: data.connection_notes?.trim() || '',
    tags: data.tags || []
  };
}

export const CREDENTIAL_TYPES = [
  { value: 'google_oauth', label: 'Google OAuth' },
  { value: 'wordpress_admin', label: 'WordPress Admin' },
  { value: 'meta_business', label: 'Meta Business' },
  { value: 'tiktok_oauth', label: 'TikTok OAuth' },
  { value: 'crm_api', label: 'CRM API' },
  { value: 'api_key', label: 'API Key' },
  { value: 'webhook_secret', label: 'Webhook Secret' },
  { value: 'smtp', label: 'SMTP' },
  { value: 'database', label: 'Database' },
  { value: 'other', label: 'Other' }
];

export function getCredentialTypeLabel(type: string): string {
  const found = CREDENTIAL_TYPES.find(t => t.value === type);
  return found ? found.label : type;
}
