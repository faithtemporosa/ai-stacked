import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const getAllowedOrigin = () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  return supabaseUrl.replace('.supabase.co', '.lovable.app').replace('https://api.', 'https://');
};

const corsHeaders = {
  'Access-Control-Allow-Origin': getAllowedOrigin(),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

// AES-256-GCM encryption/decryption using Web Crypto API
async function getEncryptionKey(): Promise<CryptoKey> {
  const keyHex = Deno.env.get('CREDENTIALS_ENCRYPTION_KEY');
  if (!keyHex) {
    throw new Error('CREDENTIALS_ENCRYPTION_KEY not configured');
  }
  
  // Convert hex string to Uint8Array
  const keyData = new Uint8Array(keyHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
  
  return await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encrypt(text: string): Promise<string> {
  if (!text) return '';
  
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(text);
  
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );
  
  // Combine IV and ciphertext
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);
  
  // Convert to base64
  return btoa(String.fromCharCode(...combined));
}

async function decrypt(encryptedText: string): Promise<string> {
  if (!encryptedText) return '';
  
  const key = await getEncryptionKey();
  
  // Decode base64
  const combined = Uint8Array.from(atob(encryptedText), c => c.charCodeAt(0));
  
  // Extract IV and ciphertext
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );
  
  return new TextDecoder().decode(decrypted);
}

// Rate limiting map (in-memory, resets on function restart)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(identifier);
  
  if (!limit || now > limit.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + 60000 }); // 1 minute window
    return true;
  }
  
  if (limit.count >= 30) { // 30 requests per minute
    return false;
  }
  
  limit.count++;
  return true;
}

function validateN8nApiKey(req: Request): boolean {
  const apiKey = req.headers.get('x-api-key');
  const expectedKey = Deno.env.get('N8N_API_KEY');
  
  if (!expectedKey) {
    console.error('N8N_API_KEY not configured');
    return false;
  }
  
  return apiKey === expectedKey;
}

async function logAccess(supabase: any, credentialId: string, userId: string, accessType: string, req: Request) {
  const userAgent = req.headers.get('user-agent') || 'unknown';
  const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  
  await supabase.from('credential_access_logs').insert({
    credential_id: credentialId,
    accessed_by: userId,
    access_type: accessType,
    ip_address: ipAddress,
    user_agent: userAgent
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const pathname = url.pathname;
    
    // Validate n8n API key
    if (!validateN8nApiKey(req)) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting
    const apiKey = req.headers.get('x-api-key') || 'unknown';
    if (!checkRateLimit(apiKey)) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /credentials/:customer_id - Fetch all credentials for a customer
    if (req.method === 'GET' && pathname.startsWith('/credentials-api/credentials/')) {
      const customerId = pathname.split('/').pop();
      
      if (!customerId) {
        return new Response(
          JSON.stringify({ error: 'Customer ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: credentials, error } = await supabase
        .from('customer_credentials')
        .select('*')
        .eq('customer_id', customerId);

      if (error) {
        console.error('Database error:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch credentials' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Decrypt credentials
      const decryptedCredentials = await Promise.all(
        credentials.map(async (cred) => {
          // Log access
          await logAccess(supabase, cred.id, customerId, 'api_access', req);
          
          return {
            id: cred.id,
            tool_name: cred.tool_name,
            credential_type: cred.credential_type,
            username: cred.encrypted_username ? await decrypt(cred.encrypted_username) : null,
            password: cred.encrypted_password ? await decrypt(cred.encrypted_password) : null,
            api_key: cred.encrypted_api_key ? await decrypt(cred.encrypted_api_key) : null,
            extra_fields: cred.encrypted_extra_fields ? JSON.parse(await decrypt(JSON.stringify(cred.encrypted_extra_fields))) : null,
            connection_notes: cred.connection_notes,
            tags: cred.tags,
            is_valid: cred.is_valid,
            created_at: cred.created_at,
            updated_at: cred.updated_at
          };
        })
      );

      return new Response(
        JSON.stringify({ credentials: decryptedCredentials }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /credentials - Create new credential
    if (req.method === 'POST' && pathname === '/credentials-api/credentials') {
      const body = await req.json();
      const { customer_id, tool_name, credential_type, username, password, api_key, extra_fields, connection_notes, tags } = body;

      // Input validation
      const MAX_FIELD_LENGTH = 500;
      const MAX_NOTES_LENGTH = 2000;
      const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const VALID_CREDENTIAL_TYPES = ['google_oauth', 'wordpress_admin', 'meta_business', 'tiktok_oauth', 'crm_api', 'api_key', 'webhook_secret', 'smtp', 'database', 'other'];

      if (!customer_id || !tool_name || !credential_type) {
        return new Response(
          JSON.stringify({ error: 'customer_id, tool_name, and credential_type are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate customer_id is a valid UUID
      if (!UUID_REGEX.test(customer_id)) {
        return new Response(
          JSON.stringify({ error: 'Invalid customer_id format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate credential_type is an allowed value
      if (!VALID_CREDENTIAL_TYPES.includes(credential_type)) {
        return new Response(
          JSON.stringify({ error: 'Invalid credential_type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate field lengths
      if (tool_name && tool_name.length > MAX_FIELD_LENGTH) {
        return new Response(
          JSON.stringify({ error: 'tool_name exceeds maximum length' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (username && username.length > MAX_FIELD_LENGTH) {
        return new Response(
          JSON.stringify({ error: 'username exceeds maximum length' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (password && password.length > MAX_FIELD_LENGTH) {
        return new Response(
          JSON.stringify({ error: 'password exceeds maximum length' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (api_key && api_key.length > MAX_FIELD_LENGTH) {
        return new Response(
          JSON.stringify({ error: 'api_key exceeds maximum length' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (connection_notes && connection_notes.length > MAX_NOTES_LENGTH) {
        return new Response(
          JSON.stringify({ error: 'connection_notes exceeds maximum length' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate extra_fields JSON size (max 10KB)
      if (extra_fields) {
        const extraFieldsStr = JSON.stringify(extra_fields);
        if (extraFieldsStr.length > 10240) {
          return new Response(
            JSON.stringify({ error: 'extra_fields exceeds maximum size' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Encrypt sensitive fields
      const encryptedData = {
        customer_id,
        tool_name,
        credential_type,
        encrypted_username: username ? await encrypt(username) : null,
        encrypted_password: password ? await encrypt(password) : null,
        encrypted_api_key: api_key ? await encrypt(api_key) : null,
        encrypted_extra_fields: extra_fields ? await encrypt(JSON.stringify(extra_fields)) : null,
        connection_notes,
        tags: tags || []
      };

      const { data, error } = await supabase
        .from('customer_credentials')
        .insert(encryptedData)
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to create credential' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, credential_id: data.id }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PUT /credentials/:id - Update credential
    if (req.method === 'PUT' && pathname.startsWith('/credentials-api/credentials/')) {
      const credentialId = pathname.split('/').pop();
      
      if (!credentialId) {
        return new Response(
          JSON.stringify({ error: 'Credential ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const body = await req.json();
      const { username, password, api_key, extra_fields, connection_notes, tags, is_valid } = body;

      const updateData: any = { updated_at: new Date().toISOString() };

      if (username !== undefined) updateData.encrypted_username = username ? await encrypt(username) : null;
      if (password !== undefined) updateData.encrypted_password = password ? await encrypt(password) : null;
      if (api_key !== undefined) updateData.encrypted_api_key = api_key ? await encrypt(api_key) : null;
      if (extra_fields !== undefined) updateData.encrypted_extra_fields = extra_fields ? await encrypt(JSON.stringify(extra_fields)) : null;
      if (connection_notes !== undefined) updateData.connection_notes = connection_notes;
      if (tags !== undefined) updateData.tags = tags;
      if (is_valid !== undefined) updateData.is_valid = is_valid;

      const { error } = await supabase
        .from('customer_credentials')
        .update(updateData)
        .eq('id', credentialId);

      if (error) {
        console.error('Database error:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to update credential' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in credentials-api function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
