import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers - restricted to the application domain for security
const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('SUPABASE_URL') || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("x-admin-secret");
    const expectedSecret = Deno.env.get("ADMIN_SECRET_KEY");

    if (!authHeader || authHeader !== expectedSecret) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }), 
        { 
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { order_id, status, estimated_completion_date } = await req.json();

    if (!order_id) {
      return new Response(
        JSON.stringify({ error: 'order_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Updating order ${order_id} to status: ${status || 'completed'}`);

    // Update the contact submission status
    const updateData: any = {
      status: status || 'completed'
    };

    // Only add estimated_completion_date if provided
    if (estimated_completion_date) {
      updateData.estimated_completion_date = estimated_completion_date;
    }

    const { data, error } = await supabase
      .from('contact_submissions')
      .update(updateData)
      .eq('order_id', order_id)
      .select()
      .single();

    if (error) {
      console.error('Error updating order:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!data) {
      console.error('Order not found:', order_id);
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Order updated successfully:', data);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Order status updated successfully',
        data 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in update-order-status function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});