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

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Rate limiting map (in-memory, resets on function restart)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(identifier: string, limit: number = 10): boolean {
  const now = Date.now();
  const rateLimit = rateLimitMap.get(identifier);
  
  if (!rateLimit || now > rateLimit.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + 60000 }); // 1 minute window
    return true;
  }
  
  if (rateLimit.count >= limit) {
    return false;
  }
  
  rateLimit.count++;
  return true;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    // Get client IP for rate limiting
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('x-real-ip') || 
                     'unknown';

    // Get user from authorization header
    const authHeader = req.headers.get('authorization');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    let userId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    // Rate limit by user ID (higher limit) or IP address (lower limit for unauthenticated)
    const rateLimitIdentifier = userId || clientIp;
    const rateLimit = userId ? 30 : 5; // 30/min for authenticated, 5/min for unauthenticated
    
    if (!checkRateLimit(rateLimitIdentifier, rateLimit)) {
      console.log(`Rate limit exceeded for: ${rateLimitIdentifier}`);
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body - support both FormData (audio) and JSON (text)
    const contentType = req.headers.get('content-type') || '';
    
    let audioFile: File | null = null;
    let conversationHistory: string = '';
    let userQuery: string = '';
    let userText: string = '';
    let isFirstMessage: boolean = false;
    let mode: string = 'onboarding'; // Default to onboarding mode

    if (contentType.includes('multipart/form-data')) {
      // Audio input
      const formData = await req.formData();
      audioFile = formData.get('audio') as File;
      conversationHistory = formData.get('conversation_history') as string || '';
      userQuery = formData.get('user_query') as string || '';
      mode = formData.get('mode') as string || 'onboarding';
    } else {
      // Text input (JSON)
      const body = await req.json();
      userText = body.text_query || '';
      conversationHistory = JSON.stringify(body.conversation_history || []);
      isFirstMessage = body.is_first_message || false;
      mode = body.mode || 'onboarding';
    }

    // Step 1: If audio provided, transcribe it
    if (audioFile) {
      console.log('Received audio file:', audioFile.size, 'bytes');

      const transcriptionFormData = new FormData();
      transcriptionFormData.append('file', audioFile);
      transcriptionFormData.append('model', 'whisper-1');

      const transcriptionResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: transcriptionFormData,
      });

      if (!transcriptionResponse.ok) {
        const error = await transcriptionResponse.text();
        console.error('Transcription error:', error);
        throw new Error('Failed to transcribe audio');
      }

      const transcriptionData = await transcriptionResponse.json();
      userText = transcriptionData.text;
      console.log('Transcribed text:', userText);
    }

    // Step 2: Get user's purchased automations if logged in
    let purchasedAutomations: any[] = [];
    if (userId) {
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('automations_purchased')
        .eq('user_id', userId)
        .single();

      if (subscription?.automations_purchased && subscription.automations_purchased.length > 0) {
        const { data: purchased } = await supabase
          .from('automations')
          .select('*')
          .in('id', subscription.automations_purchased);
        
        purchasedAutomations = purchased || [];
        console.log('User has', purchasedAutomations.length, 'purchased automations');
      }
    }

    // Step 3: Get all automations from database
    const { data: automations, error: dbError } = await supabase
      .from('automations')
      .select('*');

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Failed to fetch automations');
    }

    console.log('Loaded', automations?.length || 0, 'automations');

    // Step 4: Parse conversation history
    let messages: ConversationMessage[] = [];
    if (conversationHistory) {
      try {
        messages = JSON.parse(conversationHistory);
      } catch (e) {
        console.error('Failed to parse conversation history:', e);
      }
    }

    // Update first message flag if not already set
    if (!isFirstMessage && messages.length === 0) {
      isFirstMessage = true;
    }

    // Step 5: Build context for LLM
    let systemPrompt = '';
    
    if (mode === 'shopping') {
      // Shopping mode for homepage - help customers browse and choose automations
      const allAutomations = automations || [];
      const automationsContext = allAutomations
        .slice(0, 20) // Show top 20 automations
        .map((automation, index) => {
          return `${index + 1}. ${automation.name}
   Category: ${automation.category}
   Description: ${automation.description}
   Price: $${automation.price}`;
        })
        .join('\n\n');

      systemPrompt = `You are an AI shopping assistant for AI-Stacked, helping potential customers discover and choose the perfect automations for their business.

AVAILABLE AUTOMATIONS:
${automationsContext || 'Loading automation catalog...'}

YOUR ROLE:
- Help customers understand what each automation does
- Suggest automations based on their specific needs and business challenges
- Answer questions about features, pricing, and benefits
- Discuss how automations can save time and money
- Direct customers to the custom automation form below if they need something unique

SHOPPING GUIDANCE:
- Listen to what the customer needs help with
- Ask clarifying questions about their business and pain points
- Recommend 2-3 specific automations from the catalog that match their needs
- **CRITICAL**: When recommending automations, ALWAYS call the 'recommend_automations' function with the automation IDs so buttons appear in the chat
- Explain briefly how each recommended automation works and its benefits
- Keep recommendations focused on their actual needs, not generic suggestions

CUSTOM AUTOMATION OPTION:
- If a customer describes a need that isn't covered by our catalog, say: "That sounds like a perfect case for a custom automation! You can fill out the custom automation form below, and we'll build it for just $99."
- Direct them to scroll down to the "Need a Custom Automation?" form
- Explain that custom automations are delivered in 24-72 hours

PRICING & NEXT STEPS:
- All automations are priced individually (show the price when mentioning them)
- When you recommend automations, tell customers: "I've added View Details and Add to Cart buttons below each recommendation for your convenience"
- They can also use "Build My Stack" to get personalized bundle recommendations

IMPORTANT RULES:
- DO NOT discuss credentials, API keys, or setup details
- DO NOT mention onboarding or deployment processes yet
- Focus on helping them CHOOSE the right automations
- **ALWAYS use the recommend_automations function when suggesting specific automations**
- Keep responses conversational and helpful, not salesy
- If they ask about setup, say: "Once you purchase, we'll guide you through a simple setup process where you just provide basic login credentials"

TONE:
- Friendly and consultative
- Enthusiastic about helping them save time
- Professional but conversational
- Focus on their business problems, not just features`;

    } else if (isFirstMessage && purchasedAutomations.length > 0) {
      // Onboarding mode with purchased automations
      const purchasedContext = purchasedAutomations.map((automation, index) => {
        return `${index + 1}. ${automation.name}
   Category: ${automation.category}
   Description: ${automation.description}
   Features: ${automation.features.join(', ')}
   Setup Requirements: API keys, account credentials, and business data specific to this automation
   Implementation Time: 24-72 hours after providing setup details`;
      }).join('\n\n');

      systemPrompt = `You are an AI onboarding assistant for AI-Stacked, helping customers understand their purchased automations.

CUSTOMER'S PURCHASED AUTOMATIONS:
${purchasedContext}

YOUR APPROACH:

**FIRST MESSAGE:**
1. "Welcome to AI-Stacked! Congratulations on your purchase of ${purchasedAutomations.length} powerful automations."
2. Briefly explain what each automation does (2-3 sentences per automation):
   
   ### [Automation 1 Name]
   [What it does and what platforms it connects]
   
   ### [Automation 2 Name]
   [What it does and what platforms it connects]
   
   ### [Automation 3 Name]
   [What it does and what platforms it connects]

3. Then say: "To get started, simply use the secure form below to provide your login credentials (username and password) for each platform. You do NOT need to provide any API keys, tokens, or technical details - our automation engineer will handle all of that."

4. End with: "Once you submit the form, our engineer will review your credentials within 3-4 hours. If any additional credentials or tools are needed, they'll reach out to you via email. After that, your automations will be built and deployed within 24-72 hours. Feel free to ask if you have any questions!"

**ONGOING CONVERSATIONS:**
- Answer questions about what each automation does
- Clarify which platforms need login credentials
- Remind them to use the secure form below
- Keep responses brief and helpful
- NEVER ask for API keys, tokens, SIDs, or technical details - only direct them to provide basic username/password in the form

CONTACT INFORMATION:
- For any questions or support, customers should contact: marketing@thebumpteam.com
- If asked why the domain is different or about "thebumpteam": AI-Stacked is a subsidiary company of Bump, which is why our support email uses the Bump Team domain

CUSTOM AUTOMATION OFFERING:
- We offer custom automation solutions tailored to your specific needs
- Custom automations are priced at our standard tier: $99
- If customers express unique needs or ask about custom solutions, proactively mention this option
- Ask: "Would you be interested in a custom automation designed specifically for your workflow? We can create one for just $99."

IMPORTANT RULES:
- Only ask for USERNAME and PASSWORD through the secure form below
- NEVER request API keys, tokens, app passwords, SIDs, or any technical credentials
- Direct customers to the form below for credential submission
- Keep explanations simple and non-technical
- Focus on what the automation does for their business

TONE:
- Friendly and encouraging
- Simple and non-technical
- Professional yet approachable`;

    } else if (purchasedAutomations.length > 0) {
      // Regular conversation mode for customers with purchases
      const purchasedContext = purchasedAutomations.map((automation, index) => {
        return `${index + 1}. ${automation.name} - ${automation.description}`;
      }).join('\n');

      systemPrompt = `You are an AI onboarding assistant for AI-Stacked, helping customers with their purchased automation solutions.

CUSTOMER'S PURCHASED AUTOMATIONS:
${purchasedContext}

YOUR ROLE:
- Help the customer set up and configure their automations
- Answer questions about features and capabilities
- Guide them through implementation steps
- Provide support and troubleshooting

CONTACT INFORMATION:
- For any questions or support, customers should contact: marketing@thebumpteam.com
- If asked why the domain is different or about "thebumpteam": AI-Stacked is a subsidiary company of Bump, which is why our support email uses the Bump Team domain

CUSTOM AUTOMATION OFFERING:
- We offer custom automation solutions tailored to your specific needs
- Custom automations are priced at our standard tier: $99
- If customers express unique needs or ask about custom solutions, proactively mention this option
- Ask: "Would you be interested in a custom automation designed specifically for your workflow? We can create one for just $99."

GUIDELINES:
- Be helpful, friendly, and professional
- Focus on their purchased automations
- Provide clear, actionable guidance
- Keep responses concise for voice interaction`;
    } else {
      // General onboarding mode - treat featured automations as "purchased" examples
      const allAutomations = automations || [];

      // Prefer specific featured automations if they exist in the database
      const preferredIds = [
        'apollo-phone-enricher-sms',
        'instagram-content-automator',
        'email-drip-campaign',
      ];

      const featuredAutomations = (
        preferredIds
          .map((id) => allAutomations.find((a: any) => a.id === id))
          .filter((a): a is any => Boolean(a))
      );

      // Fallback: just take the first few automations from the catalog
      const effectiveAutomations = (featuredAutomations.length > 0
        ? featuredAutomations
        : allAutomations.slice(0, 3)) as any[];

      console.log('Using', effectiveAutomations.length, 'automations for onboarding greeting');

      const getToolsForAutomation = (automation: any) => {
        const description = automation.description || '';
        const name = automation.name || '';
        const features = automation.features || [];
        
        // Extract common platform names from description, name, and features
        const platforms = new Set<string>();
        const text = `${description} ${name} ${features.join(' ')}`.toLowerCase();
        
        // Common platforms to detect
        const platformPatterns = [
          { pattern: /apollo\.io|apollo/i, name: 'Apollo.io' },
          { pattern: /twilio/i, name: 'Twilio' },
          { pattern: /instagram/i, name: 'Instagram Business' },
          { pattern: /meta\s+business/i, name: 'Meta Business Suite' },
          { pattern: /facebook/i, name: 'Facebook' },
          { pattern: /twitter|x\.com/i, name: 'Twitter/X' },
          { pattern: /linkedin/i, name: 'LinkedIn' },
          { pattern: /tiktok/i, name: 'TikTok' },
          { pattern: /youtube/i, name: 'YouTube' },
          { pattern: /gmail|google\s+workspace/i, name: 'Gmail/Google Workspace' },
          { pattern: /google\s+sheets/i, name: 'Google Sheets' },
          { pattern: /klaviyo/i, name: 'Klaviyo' },
          { pattern: /mailchimp/i, name: 'Mailchimp' },
          { pattern: /hubspot/i, name: 'HubSpot' },
          { pattern: /salesforce/i, name: 'Salesforce' },
          { pattern: /zapier/i, name: 'Zapier' },
          { pattern: /slack/i, name: 'Slack' },
          { pattern: /discord/i, name: 'Discord' },
          { pattern: /shopify/i, name: 'Shopify' },
          { pattern: /stripe/i, name: 'Stripe' },
          { pattern: /paypal/i, name: 'PayPal' },
          { pattern: /calendly/i, name: 'Calendly' },
          { pattern: /zoom/i, name: 'Zoom' },
          { pattern: /notion/i, name: 'Notion' },
          { pattern: /airtable/i, name: 'Airtable' },
          { pattern: /asana/i, name: 'Asana' },
          { pattern: /trello/i, name: 'Trello' },
          { pattern: /clickup/i, name: 'ClickUp' },
          { pattern: /openai|gpt/i, name: 'OpenAI' },
        ];
        
        platformPatterns.forEach(({ pattern, name }) => {
          if (pattern.test(text)) {
            platforms.add(name);
          }
        });
        
        // Build the tools string
        if (platforms.size > 0) {
          const platformList = Array.from(platforms).join(', ');
          return `${platformList} account(s) with active login credentials.`;
        }
        
        return 'The main software accounts the automation connects to (social media, CRM, email platform, or business tools).';
      };

      const automationsContext = effectiveAutomations
        .map((automation, index) => {
          return `${index + 1}. ${automation.name}
   Category: ${automation.category}
   Description: ${automation.description}
   Features: ${automation.features.join(', ')}
   Price: $${automation.price}
   Key tools & accounts needed: ${getToolsForAutomation(automation)}`;
        })
        .join('\n\n');

      systemPrompt = `You are an AI onboarding assistant for AI-Stacked, helping customers understand their automations.

AVAILABLE AUTOMATIONS:
${automationsContext || 'No automations found in the catalog.'}

YOUR APPROACH:

**FIRST MESSAGE:**
1. "Welcome to AI-Stacked! You have access to ${effectiveAutomations.length} powerful automations that will save you hours every week."
2. Briefly explain what each automation does (2-3 sentences per automation):
   
   ### [Automation 1 Name]
   [What it does and what platforms it connects]
   
   ### [Automation 2 Name]
   [What it does and what platforms it connects]
   
   ### [Automation 3 Name]
   [What it does and what platforms it connects]

3. Then say: "To get started, simply use the secure form below to provide your login credentials (username and password) for each platform. You do NOT need to provide any API keys, tokens, or technical details - our automation engineer will handle all of that."

4. End with: "Once you submit the form, our engineer will review your credentials within 3-4 hours. If any additional credentials or tools are needed, they'll reach out to you via email. After that, your automations will be built and deployed within 24-72 hours. Feel free to ask if you have any questions!"

**ONGOING CONVERSATIONS:**
- Answer questions about what each automation does
- Clarify which platforms need login credentials
- Remind them to use the secure form below
- Keep responses brief and helpful
- NEVER ask for API keys, tokens, SIDs, or technical details - only direct them to provide basic username/password in the form

CONTACT INFORMATION:
- For any questions or support, customers should contact: marketing@thebumpteam.com
- If asked why the domain is different or about "thebumpteam": AI-Stacked is a subsidiary company of Bump, which is why our support email uses the Bump Team domain

CUSTOM AUTOMATION OFFERING:
- We offer custom automation solutions tailored to your specific needs
- Custom automations are priced at our standard tier: $99
- If customers express unique needs or ask about custom solutions, proactively mention this option
- Ask: "Would you be interested in a custom automation designed specifically for your workflow? We can create one for just $99."

IMPORTANT RULES:
- Only ask for USERNAME and PASSWORD through the secure form below
- NEVER request API keys, tokens, app passwords, SIDs, or any technical credentials
- Direct customers to the form below for credential submission
- Keep explanations simple and non-technical
- Focus on what the automation does for their business

TONE:
- Friendly and encouraging
- Simple and non-technical
- Professional yet approachable`;

    }

    const gptMessages = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ];
    
    // Only add user message if there's actual text
    if (userText && userText.trim()) {
      gptMessages.push({ role: 'user', content: userText });
    } else if (isFirstMessage) {
      // For first message with no user input, send a very light nudge
      gptMessages.push({ role: 'user', content: 'Please greet the customer and explain their automations as described.' });
    }

    console.log('Calling OpenAI with', gptMessages.length, 'messages');

    // Step 6: Generate AI response with function calling for shopping mode
    const requestBody: any = {
      model: 'gpt-4o-mini',
      messages: gptMessages,
      temperature: 0.8,
      max_tokens: 800,
    };

    // Add function calling for shopping mode to extract automation recommendations
    if (mode === 'shopping') {
      requestBody.tools = [
        {
          type: 'function',
          function: {
            name: 'recommend_automations',
            description: 'Recommend specific automations from the catalog to the customer',
            parameters: {
              type: 'object',
              properties: {
                automation_ids: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Array of automation IDs being recommended',
                },
              },
              required: ['automation_ids'],
            },
          },
        },
      ];
      requestBody.tool_choice = 'auto';
    }

    const chatResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!chatResponse.ok) {
      const error = await chatResponse.text();
      console.error('Chat completion error:', error);
      throw new Error('Failed to generate response');
    }

    const chatData = await chatResponse.json();
    const aiReply = chatData.choices[0].message.content;
    console.log('AI reply:', aiReply);

    // Extract recommended automation IDs from function calls (shopping mode)
    let recommendedAutomationIds: string[] = [];
    if (mode === 'shopping' && chatData.choices[0].message.tool_calls) {
      const toolCall = chatData.choices[0].message.tool_calls.find(
        (tc: any) => tc.function.name === 'recommend_automations'
      );
      if (toolCall) {
        try {
          const args = JSON.parse(toolCall.function.arguments);
          recommendedAutomationIds = args.automation_ids || [];
          console.log('Recommended automation IDs:', recommendedAutomationIds);
        } catch (e) {
          console.error('Failed to parse tool call arguments:', e);
        }
      }
    }

    // Get full automation objects for recommended IDs or infer from reply text
    let matchedAutomations: any[] = [];

    if (mode === 'shopping') {
      const allAutomations = automations || [];

      if (recommendedAutomationIds.length > 0) {
        matchedAutomations = allAutomations.filter((a: any) =>
          recommendedAutomationIds.includes(a.id)
        );
        console.log('Matched automations from tool calls:', matchedAutomations.length);
      } else if (aiReply) {
        // Fallback: infer matches by checking which automation names are mentioned in the reply text
        const replyLower = aiReply.toLowerCase();
        matchedAutomations = allAutomations
          .filter((a: any) =>
            typeof a.name === 'string' && replyLower.includes(a.name.toLowerCase())
          )
          .slice(0, 3);
        console.log('Matched automations from reply text fallback:', matchedAutomations.length);
      }
    } else {
      // For onboarding mode, show purchased automations
      matchedAutomations = purchasedAutomations;
    }

    // Step 7: Convert response to speech with lower quality for faster transmission
    const ttsResponse = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1', // Fast model
        voice: 'alloy',
        input: aiReply,
        response_format: 'mp3', // MP3 is more compressed than default
        speed: 1.0,
      }),
    });

    if (!ttsResponse.ok) {
      const error = await ttsResponse.text();
      console.error('TTS error:', error);
      throw new Error('Failed to generate speech');
    }

    // Convert audio to base64 with timeout protection
    const audioBuffer = await ttsResponse.arrayBuffer();
    console.log('Audio buffer size:', audioBuffer.byteLength);
    
    // Check if audio is too large (>2MB base64 will be ~2.7MB)
    if (audioBuffer.byteLength > 2000000) {
      console.warn('Audio file is very large:', audioBuffer.byteLength, 'bytes');
    }
    
    const uint8Array = new Uint8Array(audioBuffer);
    let binaryString = '';
    const chunkSize = 8192; // Process 8KB at a time
    
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
      binaryString += String.fromCharCode.apply(null, Array.from(chunk));
    }
    
    const base64Audio = btoa(binaryString);
    console.log('Generated audio, base64 size:', base64Audio.length, 'characters');

    // Return response
    return new Response(
      JSON.stringify({
        user_text: userText,
        reply: aiReply,
        audio_base64: base64Audio,
        matches: matchedAutomations.map(a => ({
          id: a.id,
          name: a.name,
          category: a.category,
          description: a.description,
          price: a.price,
        })),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in voice-agent function:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    // Return a more detailed error response
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const errorDetails = error instanceof Error ? error.stack : undefined;
    
    console.log('Returning error response:', errorMessage);
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: errorDetails,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
