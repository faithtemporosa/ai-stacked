import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

// CORS headers - restricted for security (scheduled function, minimal external access needed)
const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get('SUPABASE_URL') || '*',
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-digest-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Initialize Resend with placeholder
const resend = new Resend(Deno.env.get("RESEND_API_KEY") || "PLACEHOLDER_KEY");

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify authentication via secret header
  const authHeader = req.headers.get("x-digest-secret");
  const expectedSecret = Deno.env.get("DIGEST_SECRET_KEY");
  
  if (!authHeader || authHeader !== expectedSecret) {
    console.error("Unauthorized digest request attempt");
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { 
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }

  try {
    console.log("Starting weekly digest job...");

    // Get all users who have email digest enabled
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, email_digest_enabled")
      .eq("email_digest_enabled", true);

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      throw profilesError;
    }

    console.log(`Found ${profiles?.length || 0} users with email digest enabled`);

    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ message: "No users to send digest to" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all automations data (in a real app, this would come from your database)
    const automations = [
      { id: "instagram-dm", category: "social-media", title: "Instagram DM Auto-Reply", description: "Automated Instagram direct message responses" },
      { id: "email-sequences", category: "email-marketing", title: "Email Sequence Builder", description: "Automated email marketing sequences" },
      { id: "lead-scoring", category: "crm", title: "AI Lead Scoring", description: "Intelligent lead qualification and scoring" },
      { id: "content-scheduler", category: "social-media", title: "Social Content Scheduler", description: "Multi-platform content scheduling" },
      { id: "invoice-automation", category: "finance", title: "Invoice Automation", description: "Automated invoicing and payment reminders" },
    ];

    let emailsSent = 0;
    let emailsFailed = 0;

    // Process each user
    for (const profile of profiles) {
      try {
        // Get user's wishlist
        const { data: wishlistItems, error: wishlistError } = await supabase
          .from("wishlists")
          .select("automation_id")
          .eq("user_id", profile.user_id);

        if (wishlistError) {
          console.error(`Error fetching wishlist for user ${profile.user_id}:`, wishlistError);
          continue;
        }

        // Extract categories from wishlist (in real app, you'd have category info in DB)
        const wishlistCategories = new Set(
          wishlistItems?.map(item => {
            const automation = automations.find(a => a.id === item.automation_id);
            return automation?.category;
          }).filter(Boolean) || []
        );

        // Find matching automations
        const matchingAutomations = automations.filter(
          automation => wishlistCategories.has(automation.category)
        );

        if (matchingAutomations.length === 0) {
          console.log(`No matching automations for user ${profile.user_id}`);
          continue;
        }

        // Get user email
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(
          profile.user_id
        );

        if (userError || !userData.user?.email) {
          console.error(`Error fetching user email for ${profile.user_id}:`, userError);
          continue;
        }

        // Build email HTML
        const automationsList = matchingAutomations
          .map(
            (auto) => `
            <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #e0e0e0; border-radius: 8px;">
              <h3 style="margin: 0 0 8px 0; color: #333;">${auto.title}</h3>
              <p style="margin: 0; color: #666;">${auto.description}</p>
            </div>
          `
          )
          .join("");

        const emailHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <title>Your Weekly Automation Digest</title>
            </head>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #333; border-bottom: 2px solid #0066cc; padding-bottom: 10px;">
                Your Weekly Automation Digest
              </h1>
              <p style="color: #666; font-size: 16px;">
                Here are some new automations matching your interests:
              </p>
              ${automationsList}
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                <p style="color: #666; font-size: 14px;">
                  You're receiving this because you have email digest enabled in your preferences.
                </p>
                <p style="color: #666; font-size: 14px;">
                  <a href="${supabaseUrl}/wishlist" style="color: #0066cc;">View your wishlist</a>
                </p>
              </div>
            </body>
          </html>
        `;

        // Send email via Resend
        const emailResponse = await resend.emails.send({
          from: "Bump Syndicate <onboarding@resend.dev>",
          to: [userData.user.email],
          subject: "Your Weekly Automation Digest",
          html: emailHtml,
        });

        console.log(`Email sent to ${userData.user.email}:`, emailResponse);
        emailsSent++;
      } catch (error) {
        console.error(`Error processing user ${profile.user_id}:`, error);
        emailsFailed++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Weekly digest job completed`,
        stats: {
          emailsSent,
          emailsFailed,
          totalUsers: profiles.length,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in weekly-digest function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
