import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const getAllowedOrigin = () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  return supabaseUrl.replace('.supabase.co', '.lovable.app').replace('https://api.', 'https://');
};

const corsHeaders = {
  'Access-Control-Allow-Origin': getAllowedOrigin(),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// AES-256-GCM decryption using Web Crypto API
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
    ['decrypt']
  );
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
    // Get user from authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: No authorization header' }),
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
        JSON.stringify({ error: 'Unauthorized: Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { credential_id } = await req.json();

    if (!credential_id) {
      return new Response(
        JSON.stringify({ error: 'credential_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the credential (RLS will ensure proper access)
    const { data: credential, error: fetchError } = await supabase
      .from('customer_credentials')
      .select('*')
      .eq('id', credential_id)
      .single();

    if (fetchError || !credential) {
      return new Response(
        JSON.stringify({ error: 'Credential not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the decryption access
    await logAccess(supabase, credential_id, user.id, 'decrypt', req);

    // Decrypt the credential fields
    const decrypted = {
      username: credential.encrypted_username ? await decrypt(credential.encrypted_username) : null,
      password: credential.encrypted_password ? await decrypt(credential.encrypted_password) : null,
      api_key: credential.encrypted_api_key ? await decrypt(credential.encrypted_api_key) : null,
      extra_fields: credential.encrypted_extra_fields ? JSON.parse(await decrypt(JSON.stringify(credential.encrypted_extra_fields))) : null
    };

    return new Response(
      JSON.stringify({ decrypted }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in decrypt-credential function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
