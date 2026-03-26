import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const getAllowedOrigin = () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  return supabaseUrl.replace('.supabase.co', '.lovable.app').replace('https://api.', 'https://');
};

const corsHeaders = {
  'Access-Control-Allow-Origin': getAllowedOrigin(),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the service role key for elevated permissions
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { automations } = await req.json()

    if (!automations || !Array.isArray(automations)) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: automations array required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log(`Starting to seed ${automations.length} automations...`)

    // Process in batches of 50
    const batchSize = 50
    let successCount = 0
    let errorCount = 0
    const errors: any[] = []

    for (let i = 0; i < automations.length; i += batchSize) {
      const batch = automations.slice(i, i + batchSize)
      
      // Upsert batch using service role permissions
      const { data, error } = await supabaseAdmin
        .from('automations')
        .upsert(batch, {
          onConflict: 'id'
        })
      
      if (error) {
        console.error(`Error inserting batch ${Math.floor(i / batchSize) + 1}:`, error)
        errorCount += batch.length
        errors.push({ batch: Math.floor(i / batchSize) + 1, error: error.message })
      } else {
        successCount += batch.length
        console.log(`✓ Inserted batch ${Math.floor(i / batchSize) + 1} (${successCount} total)`)
      }
    }

    console.log(`Seeding complete! Success: ${successCount}, Errors: ${errorCount}`)

    return new Response(
      JSON.stringify({ 
        success: true,
        successCount, 
        errorCount,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in seed-automations function:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})