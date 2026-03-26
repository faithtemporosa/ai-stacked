import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const getAllowedOrigin = () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  // Extract the base domain from Supabase URL for the app origin
  return supabaseUrl.replace('.supabase.co', '.lovable.app').replace('https://api.', 'https://');
};

const corsHeaders = {
  'Access-Control-Allow-Origin': getAllowedOrigin(),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// AES-256-GCM encryption using Web Crypto API
async function getEncryptionKey(): Promise<CryptoKey> {
  const keyHex = Deno.env.get('CREDENTIALS_ENCRYPTION_KEY');
  if (!keyHex) {
    throw new Error('CREDENTIALS_ENCRYPTION_KEY not configured');
  }
  
  const keyData = new Uint8Array(keyHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
  
  return await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { tool_name, credential_type, username, password, api_key, extra_fields, connection_notes, tags } = body;

    if (!tool_name || !credential_type) {
      return new Response(
        JSON.stringify({ error: 'tool_name and credential_type are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Encrypt sensitive fields
    const insertData = {
      customer_id: user.id,
      tool_name: tool_name.trim(),
      credential_type,
      encrypted_username: username ? await encrypt(username.trim()) : null,
      encrypted_password: password ? await encrypt(password) : null,
      encrypted_api_key: api_key ? await encrypt(api_key.trim()) : null,
      encrypted_extra_fields: extra_fields ? await encrypt(JSON.stringify(extra_fields)) : null,
      connection_notes: connection_notes || '',
      tags: tags || []
    };

    const { data, error } = await supabase
      .from('customer_credentials')
      .insert([insertData])
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

  } catch (error) {
    console.error('Error in create-credential function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
