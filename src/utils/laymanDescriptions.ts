/**
 * Converts technical automation descriptions to layman-friendly language
 * Removes tool names and technical jargon, focusing on business outcomes
 */

// Technical tools/platforms to remove from descriptions
const technicalTermsToRemove = [
  // AI/ML tools
  /\b(GPT-4|GPT-4o|GPT-3|GPT-4 Vision|GPT-4 mini|ChatGPT|OpenAI|Claude|Anthropic|Gemini|PaLM|LLM|AI model|machine learning|ML|Whisper)\b/gi,
  // Video/Media tools
  /\b(Kling AI|Cloudinary|ElevenLabs|Eleven Labs|FFmpeg|ImageMagick|Midjourney|DALL-E|Stable Diffusion|OpenCV|TTS audio)\b/gi,
  // Messaging platforms
  /\b(Telegram|WhatsApp Business API|Twilio|SendGrid|Mailgun|RocketChat|Rocket\.Chat)\b/gi,
  // Automation platforms
  /\b(n8n|Zapier|Make\.com|Integromat|Power Automate|IFTTT|Manual Trigger|Cron trigger|Cron)\b/gi,
  // APIs and technical terms
  /\b(API|APIs|webhook|webhooks|REST|GraphQL|SDK|OAuth|OAuth2|endpoint|IMAP|HTTP Request)\b/gi,
  // Cloud services
  /\b(AWS|Amazon S3|Google Cloud|Azure|Firebase|Supabase|Vercel|Google Drive|Nextcloud|RabbitMQ)\b/gi,
  // CRM/Sales tools
  /\b(Apollo\.io|Apollo|PhantomBuster|Apify|HubSpot API|HubSpot|Salesforce API|Salesforce|Pipedrive|Disqus)\b/gi,
  // Social media tools
  /\b(LinkedIn API|Twitter API|Facebook API|Instagram API|Meta Business|TikTok API)\b/gi,
  // Databases
  /\b(PostgreSQL|MySQL|MongoDB|Redis|Airtable|Notion API)\b/gi,
  // Other technical terms
  /\b(JSON|XML|CSV import|cron job|batch processing|data pipeline|node|nodes)\b/gi,
  // Task/Project tools
  /\b(Todoist|Typeform|Google Sheets|Squarespace|Shopify|Nextcloud Deck)\b/gi,
  // More platforms
  /\b(Gmail API|Gmail|Python|JavaScript|PHP|Ruby)\b/gi,
];

// Phrases to clean up after removing tools
const cleanupPatterns = [
  { pattern: /using\s+,/gi, replacement: '' },
  { pattern: /using\s+and/gi, replacement: '' },
  { pattern: /using\s+\./gi, replacement: '.' },
  { pattern: /,\s*,+/g, replacement: ',' },
  { pattern: /,\s*and\s*,/gi, replacement: ' and ' },
  { pattern: /,\s*\./g, replacement: '.' },
  { pattern: /\s+,/g, replacement: ',' },
  { pattern: /,\s+\./g, replacement: '.' },
  { pattern: /\busing\s*$/gi, replacement: '' },
  { pattern: /\bvia\s*$/gi, replacement: '' },
  { pattern: /\bwith\s*$/gi, replacement: '' },
  { pattern: /\bthrough\s*$/gi, replacement: '' },
  { pattern: /\s{2,}/g, replacement: ' ' },
  { pattern: /^\s*,\s*/g, replacement: '' },
  { pattern: /\s*,\s*$/g, replacement: '' },
  { pattern: /\bUtilizes?\s+/gi, replacement: '' },
  { pattern: /\bfor\s+authentication\s*\.?/gi, replacement: '.' },
  { pattern: /\bwithin\s+workflow\s*/gi, replacement: '' },
  { pattern: /\bBuilt with\s*/gi, replacement: '' },
  { pattern: /\bIntegrates?\s*\.?$/gi, replacement: '' },
  { pattern: /:\s*,+/g, replacement: ':' },
  { pattern: /,\s*\band\b\s*\./gi, replacement: '.' },
  { pattern: /\bvia\s+,/gi, replacement: '' },
  { pattern: /\bvia\s+and\b/gi, replacement: '' },
  { pattern: /\s+\./g, replacement: '.' },
  { pattern: /,\s*\band\b\s*$/gi, replacement: '' },
  { pattern: /\band\s+\./gi, replacement: '.' },
  { pattern: /\.,\s*/g, replacement: '. ' },
  { pattern: /\s*:,+\s*/g, replacement: ': ' },
];

// Additional technical terms to remove from descriptions
const additionalTechnicalTerms = [
  /\b(Qdrant|SQLite|Mistral Cloud|Langchain|LangChain|embeddings?|vector store|vector database|vector DB|chat model)\b/gi,
  /\b(workflow capabilities|workflow automation|data extraction|data pipeline)\b/gi,
  /\b(HTTP requests?|code nodes?|webhook triggers?|Manual Trigger node|Set node|Function node)\b/gi,
  /\b(Slack alerts?|task creation|conversation memory)\b/gi,
  /\b(triggers? manually|triggers? on|real-time messaging|for real-time)\b/gi,
  /\b(OAuth2 for|OAuth for|credentials|Twilio credentials|Twilio node)\b/gi,
  /\b(Tech stack:?|web scraper|orchestrator|scraper|crawler)\b/gi,
  /\b(SERPAPI|SerpAPI|base64|OCR|RAG|Retrieval-Augmented Generation)\b/gi,
  /\b(GraphQL API|REST API|Linear|JIRA|Jira|Notion|Meta Webhooks)\b/gi,
  /\b(Google Gemini|Gemini AI|Flash Lite|GPT-4o-mini|IMDB)\b/gi,
];

/**
 * Removes technical tool names from text
 */
function removeToolNames(text: string): string {
  let result = text;
  
  // Remove technical terms
  technicalTermsToRemove.forEach(pattern => {
    result = result.replace(pattern, '');
  });
  
  // Remove additional technical terms
  additionalTechnicalTerms.forEach(pattern => {
    result = result.replace(pattern, '');
  });
  
  // Clean up artifacts
  cleanupPatterns.forEach(({ pattern, replacement }) => {
    result = result.replace(pattern, replacement);
  });
  
  return result.trim();
}

/**
 * Generates a simple, benefit-focused main description based on automation name keywords
 */
function generateMainDescription(name: string, category: string): string | null {
  const nameLower = name.toLowerCase();
  
  // Recipe/Food related
  if (nameLower.includes('recipe') || nameLower.includes('meal') || nameLower.includes('food') || nameLower.includes('hellofresh') || nameLower.includes('cooking') || nameLower.includes('diet')) {
    return "Get personalized weekly recipe recommendations based on your preferences. This automation learns what you like and delivers meal ideas that match your taste, dietary needs, and cooking style.";
  }
  
  // Translation/Language related
  if (nameLower.includes('translat') || nameLower.includes('language') || nameLower.includes('multilingual') || nameLower.includes('french') || nameLower.includes('spanish') || nameLower.includes('english')) {
    return "Automatically translate content between languages. Convert text, audio, or documents into different languages instantly.";
  }
  
  // Speech/Voice/Audio related
  if (nameLower.includes('speech') || nameLower.includes('voice') || nameLower.includes('audio') || nameLower.includes('narration') || nameLower.includes('voiceover') || nameLower.includes('transcri')) {
    return "Convert between speech and text automatically. Create voiceovers, transcribe recordings, or generate audio content effortlessly.";
  }
  
  // Mentions/Monitoring related
  if (nameLower.includes('mention') || nameLower.includes('monitor') || nameLower.includes('track') || nameLower.includes('watch')) {
    return "Keep track of what's being said about you or your brand online. Get instant notifications when you're mentioned.";
  }
  
  // Form/Submission collection
  if (nameLower.includes('form') || nameLower.includes('submission') || nameLower.includes('collect') || nameLower.includes('typeform')) {
    return "Automatically collect and organize form responses. Get submissions delivered where you need them and take action instantly.";
  }
  
  // Coach/Training related
  if (nameLower.includes('coach') || nameLower.includes('train') || nameLower.includes('learn') || nameLower.includes('tutor')) {
    return "Get personalized coaching and feedback automatically. Improve your skills with intelligent guidance and practice.";
  }
  
  // PDF/Attachment/Document filtering
  if (nameLower.includes('pdf') || nameLower.includes('attachment') || nameLower.includes('filter') || nameLower.includes('document')) {
    return "Automatically organize and filter your documents. Find the files you need and store them where they belong.";
  }
  
  // LinkedIn specific
  if (nameLower.includes('linkedin')) {
    if (nameLower.includes('comment') || nameLower.includes('respond')) {
      return "Automatically respond to comments and messages on your LinkedIn posts with personalized, on-brand replies that keep your audience engaged.";
    }
    if (nameLower.includes('connection') || nameLower.includes('outreach')) {
      return "Grow your professional network by sending personalized connection requests and follow-up messages to the right people automatically.";
    }
    if (nameLower.includes('post') || nameLower.includes('content')) {
      return "Create and publish professional LinkedIn content automatically, keeping your profile active and your audience engaged.";
    }
    return "Streamline your LinkedIn presence with automated engagement, content publishing, and network growth.";
  }
  
  // Lead generation/Sales/Outreach
  if (nameLower.includes('lead') || nameLower.includes('prospect') || nameLower.includes('outreach') || nameLower.includes('cold')) {
    return "Find and qualify potential customers automatically. This automation researches prospects, enriches contact data, and helps you focus on the leads most likely to convert.";
  }
  
  // Email related
  if (nameLower.includes('email') || nameLower.includes('newsletter') || nameLower.includes('inbox') || nameLower.includes('mail')) {
    return "Manage your email communications effortlessly. Send personalized messages, automate follow-ups, and keep your inbox organized without the manual work.";
  }
  
  // Social media
  if (nameLower.includes('social') || nameLower.includes('instagram') || nameLower.includes('facebook') || nameLower.includes('twitter') || nameLower.includes('tiktok')) {
    return "Keep your social media presence active and engaging. This automation creates content, schedules posts, and manages interactions across your platforms.";
  }
  
  // Customer support
  if (nameLower.includes('support') || nameLower.includes('ticket') || nameLower.includes('help desk') || nameLower.includes('customer service')) {
    return "Provide faster customer support with automated responses, ticket routing, and instant answers to common questions.";
  }
  
  // Scheduling/Calendar
  if (nameLower.includes('schedule') || nameLower.includes('calendar') || nameLower.includes('meeting') || nameLower.includes('appointment') || nameLower.includes('booking')) {
    return "Eliminate scheduling headaches with automated calendar management, meeting coordination, and appointment reminders.";
  }
  
  // Invoice/Billing
  if (nameLower.includes('invoice') || nameLower.includes('billing') || nameLower.includes('payment')) {
    return "Streamline your billing process with automated invoice creation, payment reminders, and financial tracking.";
  }
  
  // Data/Spreadsheet
  if (nameLower.includes('data') || nameLower.includes('spreadsheet') || nameLower.includes('excel') || nameLower.includes('sheet') || nameLower.includes('csv')) {
    return "Keep your data organized and up-to-date automatically. This automation collects, processes, and syncs information across your systems.";
  }
  
  // E-commerce/Orders
  if (nameLower.includes('order') || nameLower.includes('shop') || nameLower.includes('store') || nameLower.includes('ecommerce') || nameLower.includes('inventory') || nameLower.includes('shopify') || nameLower.includes('squarespace')) {
    return "Run your online store more efficiently with automated order processing, inventory management, and customer communications.";
  }
  
  // Reports/Analytics
  if (nameLower.includes('report') || nameLower.includes('analytics') || nameLower.includes('dashboard') || nameLower.includes('metrics')) {
    return "Get insights delivered automatically. This automation compiles data from your systems into clear, actionable reports.";
  }
  
  // SMS/Text
  if (nameLower.includes('sms') || nameLower.includes('text messag') || nameLower.includes('whatsapp') || nameLower.includes('twilio') || (nameLower.includes('phone') && nameLower.includes('outreach'))) {
    return "Reach customers instantly with automated text messaging. Send personalized messages, reminders, and follow-ups at the perfect time.";
  }
  
  // CRM/Contact
  if (nameLower.includes('crm') || nameLower.includes('contact') || nameLower.includes('customer') || nameLower.includes('client') || nameLower.includes('hubspot') || nameLower.includes('pipedrive')) {
    return "Keep your customer relationships organized with automated contact management, data syncing, and interaction tracking.";
  }
  
  // Recruitment/HR
  if (nameLower.includes('recruit') || nameLower.includes('hiring') || nameLower.includes('candidate') || nameLower.includes('resume') || nameLower.includes('hr')) {
    return "Streamline your hiring process with automated candidate screening, interview scheduling, and applicant communications.";
  }
  
  // Research/Analysis/Scraper/Crawler/Extractor
  if (nameLower.includes('research') || nameLower.includes('analysis') || nameLower.includes('competitor') || nameLower.includes('market') || nameLower.includes('fetch') || nameLower.includes('detail') || nameLower.includes('scraper') || nameLower.includes('crawler') || nameLower.includes('extractor') || nameLower.includes('extract')) {
    return "Get valuable insights without the research grunt work. This automation gathers and analyzes information from across the web.";
  }
  
  // Image/Photo/Video/Frame
  if (nameLower.includes('image') || nameLower.includes('photo') || nameLower.includes('video') || nameLower.includes('youtube') || nameLower.includes('frame')) {
    return "Process and manage your media files automatically. This automation handles editing, optimization, and organization.";
  }
  
  // Chatbot/AI assistant
  if (nameLower.includes('chatbot') || nameLower.includes('ai assistant') || nameLower.includes('virtual assistant') || nameLower.includes('bot')) {
    return "Provide instant responses to visitors and customers around the clock with intelligent automated conversations.";
  }
  
  // Backup/Sync
  if (nameLower.includes('backup') || nameLower.includes('sync') || nameLower.includes('transfer') || nameLower.includes('migrate')) {
    return "Keep your data safe and synchronized across all your systems with automated backups and real-time syncing.";
  }
  
  // Survey/Feedback
  if (nameLower.includes('survey') || nameLower.includes('feedback') || nameLower.includes('review')) {
    return "Collect and analyze customer feedback automatically. Get insights from surveys and reviews without manual effort.";
  }
  
  // Project/Task/Workflow/Todoist
  if (nameLower.includes('project') || nameLower.includes('task') || nameLower.includes('workflow') || nameLower.includes('team') || nameLower.includes('todoist') || nameLower.includes('card') || nameLower.includes('deck')) {
    return "Keep projects on track with automated task management, status updates, and team notifications.";
  }
  
  // Notification/Alert
  if (nameLower.includes('notification') || nameLower.includes('alert') || nameLower.includes('reminder') || nameLower.includes('notify')) {
    return "Stay informed of important changes with automated monitoring and instant alerts when action is needed.";
  }
  
  // Forum/Community
  if (nameLower.includes('forum') || nameLower.includes('community') || nameLower.includes('disqus') || nameLower.includes('comment')) {
    return "Manage your online community engagement automatically. Monitor discussions and respond to conversations effortlessly.";
  }
  
  // Position/Location/Tracking (for niche automations)
  if (nameLower.includes('position') || nameLower.includes('location') || nameLower.includes('iss') || nameLower.includes('gps')) {
    return "Track and monitor location data automatically. Get real-time updates and historical position information.";
  }
  
  // Upload/Download/Storage
  if (nameLower.includes('upload') || nameLower.includes('download') || nameLower.includes('storage') || nameLower.includes('drive')) {
    return "Manage your files automatically. Upload, organize, and share documents without manual effort.";
  }
  
  // Sending/Workflow generic
  if (nameLower.includes('sending') || nameLower.includes('send')) {
    return "Automate your message delivery. Send communications to the right people at the right time without manual work.";
  }
  
  return null;
}

/**
 * Converts the main automation description to layman-friendly language
 */
export function toLaymanDescription(description: string, name: string, category: string): string {
  // First, try to generate from automation name
  const generated = generateMainDescription(name, category);
  if (generated) return generated;
  
  // Fall back to cleaning the original description
  let cleaned = removeToolNames(description);
  
  // If still too short or technical, provide category-based fallback
  if (!cleaned || cleaned.length < 20) {
    return getCategoryDescription(category);
  }
  
  return cleaned;
}

/**
 * Category-based description fallbacks
 */
function getCategoryDescription(category: string): string {
  const descriptions: Record<string, string> = {
    "Social Media Marketing": "Automate your social media presence with smart content creation, scheduling, and engagement management.",
    "Content Creation": "Create high-quality content faster with automated generation, formatting, and publishing.",
    "Email & Communication": "Streamline your communications with automated messaging, follow-ups, and inbox management.",
    "Marketing & SEO": "Boost your marketing results with automated optimization, tracking, and campaign management.",
    "Operations & Productivity": "Eliminate repetitive tasks and keep your operations running smoothly around the clock.",
    "eCommerce & Product": "Run your online store more efficiently with automated order processing and customer management.",
    "Research & Analysis": "Get valuable insights automatically with smart data collection and analysis.",
    "Sales & CRM": "Close more deals with automated lead finding, qualification, and follow-up sequences.",
  };
  
  return descriptions[category] || "Automate this task and save hours of manual work every week.";
}

/**
 * Generates a simple, benefit-focused problem statement based on automation name keywords
 */
function generateProblemStatement(name: string, category: string): string | null {
  const nameLower = name.toLowerCase();
  
  // Recipe/Food related
  if (nameLower.includes('recipe') || nameLower.includes('meal') || nameLower.includes('food') || nameLower.includes('hellofresh') || nameLower.includes('cooking') || nameLower.includes('diet')) {
    return "Planning meals every week is time-consuming and stressful. You spend hours deciding what to eat, only to end up with the same boring options.";
  }
  
  // Translation/Language related
  if (nameLower.includes('translat') || nameLower.includes('language') || nameLower.includes('multilingual') || nameLower.includes('french') || nameLower.includes('spanish') || nameLower.includes('english')) {
    return "Translating content manually takes forever and often misses nuances. You need to reach audiences in different languages but can't afford translators.";
  }
  
  // Speech/Voice/Audio related
  if (nameLower.includes('speech') || nameLower.includes('voice') || nameLower.includes('audio') || nameLower.includes('narration') || nameLower.includes('voiceover') || nameLower.includes('transcri')) {
    return "Creating audio content or transcribing recordings is tedious work. You spend hours on tasks that should be automatic.";
  }
  
  // Mentions/Monitoring related
  if (nameLower.includes('mention') || nameLower.includes('monitor') || nameLower.includes('track') || nameLower.includes('watch')) {
    return "You can't be everywhere at once watching for important mentions. Opportunities slip by because you find out too late.";
  }
  
  // Form/Submission collection
  if (nameLower.includes('form') || nameLower.includes('submission') || nameLower.includes('collect') || nameLower.includes('typeform')) {
    return "Form submissions pile up and get lost. You miss following up on leads because responses aren't organized.";
  }
  
  // Coach/Training related
  if (nameLower.includes('coach') || nameLower.includes('train') || nameLower.includes('learn') || nameLower.includes('tutor')) {
    return "Getting quality feedback and coaching requires expensive professionals or lots of your own time.";
  }
  
  // LinkedIn specific
  if (nameLower.includes('linkedin')) {
    return "Growing your professional network requires constant attention - responding to comments, sending connection requests, and staying active is exhausting.";
  }
  
  // Lead generation/Sales/Outreach
  if (nameLower.includes('lead') || nameLower.includes('prospect') || nameLower.includes('sales') || nameLower.includes('outreach') || nameLower.includes('cold')) {
    return "Finding and qualifying new leads manually takes hours of research and outreach, leaving less time for actually closing deals.";
  }
  
  // Email related
  if (nameLower.includes('email') || nameLower.includes('newsletter') || nameLower.includes('inbox') || nameLower.includes('mail')) {
    return "Managing emails takes up a huge chunk of your day. Important messages get buried, and you spend more time organizing than responding.";
  }
  
  // Social media
  if (nameLower.includes('social') || nameLower.includes('post') || nameLower.includes('content') || nameLower.includes('instagram') || nameLower.includes('facebook') || nameLower.includes('twitter') || nameLower.includes('tiktok')) {
    return "Creating and posting content consistently across social platforms is a full-time job. You're always behind on posting schedules.";
  }
  
  // Customer support
  if (nameLower.includes('support') || nameLower.includes('ticket') || nameLower.includes('help desk') || nameLower.includes('customer service')) {
    return "Customer questions pile up faster than you can answer them. Response times suffer, and customers get frustrated waiting.";
  }
  
  // Scheduling/Calendar
  if (nameLower.includes('schedule') || nameLower.includes('calendar') || nameLower.includes('meeting') || nameLower.includes('appointment') || nameLower.includes('booking')) {
    return "Coordinating schedules and booking meetings involves endless back-and-forth emails. Double bookings and missed appointments hurt your reputation.";
  }
  
  // Invoice/Billing
  if (nameLower.includes('invoice') || nameLower.includes('billing') || nameLower.includes('payment') || nameLower.includes('accounting')) {
    return "Creating invoices and chasing payments is tedious work that takes time away from running your business.";
  }
  
  // Data/Spreadsheet
  if (nameLower.includes('data') || nameLower.includes('spreadsheet') || nameLower.includes('excel') || nameLower.includes('sheet') || nameLower.includes('csv')) {
    return "Manually entering and updating data in spreadsheets is boring, error-prone, and eats up hours of your day.";
  }
  
  // E-commerce/Orders
  if (nameLower.includes('order') || nameLower.includes('shop') || nameLower.includes('store') || nameLower.includes('ecommerce') || nameLower.includes('inventory') || nameLower.includes('shopify') || nameLower.includes('squarespace')) {
    return "Processing orders and managing inventory manually is slow and error-prone. Customers expect fast service.";
  }
  
  // Reports/Analytics
  if (nameLower.includes('report') || nameLower.includes('analytics') || nameLower.includes('dashboard') || nameLower.includes('metrics')) {
    return "Compiling reports from multiple sources takes forever. By the time you finish, the data is already outdated.";
  }
  
  // Document/Contract/PDF
  if (nameLower.includes('document') || nameLower.includes('contract') || nameLower.includes('pdf') || nameLower.includes('file') || nameLower.includes('attachment')) {
    return "Creating and managing documents manually is slow. Finding the right file when you need it is like searching for a needle in a haystack.";
  }
  
  // SMS/Text/Twilio
  if (nameLower.includes('sms') || nameLower.includes('text messag') || nameLower.includes('whatsapp') || nameLower.includes('twilio') || (nameLower.includes('phone') && nameLower.includes('outreach'))) {
    return "Sending personalized text messages to customers one by one is impossible at scale. Important follow-ups get missed.";
  }
  
  // CRM/Contact
  if (nameLower.includes('crm') || nameLower.includes('contact') || nameLower.includes('customer') || nameLower.includes('client') || nameLower.includes('hubspot') || nameLower.includes('pipedrive')) {
    return "Keeping customer information up-to-date across systems is a nightmare. Important details fall through the cracks.";
  }
  
  // Recruitment/HR
  if (nameLower.includes('recruit') || nameLower.includes('hiring') || nameLower.includes('candidate') || nameLower.includes('resume') || nameLower.includes('hr')) {
    return "Screening candidates and coordinating interviews manually is overwhelming. Great candidates slip away while you're reviewing resumes.";
  }
  
  // Research/Analysis
  if (nameLower.includes('research') || nameLower.includes('analysis') || nameLower.includes('competitor') || nameLower.includes('market') || nameLower.includes('fetch') || nameLower.includes('detail')) {
    return "Researching manually takes days of work. By the time you compile findings, the market has already moved on.";
  }
  
  // Image/Photo/Video/Frame
  if (nameLower.includes('image') || nameLower.includes('photo') || nameLower.includes('video') || nameLower.includes('youtube') || nameLower.includes('frame')) {
    return "Processing and organizing media files manually takes forever. You waste time on repetitive tasks instead of creative work.";
  }
  
  // Notification/Alert
  if (nameLower.includes('notification') || nameLower.includes('alert') || nameLower.includes('reminder') || nameLower.includes('notify')) {
    return "Important updates slip through the cracks because you can't monitor everything. You find out about problems after they've happened.";
  }
  
  // Chatbot/AI assistant
  if (nameLower.includes('chatbot') || nameLower.includes('ai assistant') || nameLower.includes('virtual assistant') || nameLower.includes('bot')) {
    return "You can't be available 24/7 to answer questions. Customers expect instant responses but you have limited time.";
  }
  
  // Backup/Sync
  if (nameLower.includes('backup') || nameLower.includes('sync') || nameLower.includes('transfer') || nameLower.includes('migrate')) {
    return "Keeping data backed up and synced across systems requires constant manual effort. One mistake could mean losing important information.";
  }
  
  // Survey/Feedback
  if (nameLower.includes('survey') || nameLower.includes('feedback') || nameLower.includes('review') || nameLower.includes('response')) {
    return "Collecting and analyzing feedback manually means insights get lost. By the time you review responses, opportunities have passed.";
  }
  
  // Project/Task/Workflow/Todoist
  if (nameLower.includes('project') || nameLower.includes('task') || nameLower.includes('workflow') || nameLower.includes('team') || nameLower.includes('todoist') || nameLower.includes('card') || nameLower.includes('deck')) {
    return "Keeping projects on track requires constant follow-ups and status updates. Things fall behind without you even knowing.";
  }
  
  // Forum/Community
  if (nameLower.includes('forum') || nameLower.includes('community') || nameLower.includes('disqus')) {
    return "Managing online communities takes constant attention. Discussions happen when you're not looking and engagement drops.";
  }
  
  // Upload/Download/Storage
  if (nameLower.includes('upload') || nameLower.includes('download') || nameLower.includes('storage') || nameLower.includes('drive')) {
    return "Managing files across different locations is tedious. You waste time uploading, downloading, and organizing manually.";
  }
  
  // Sending generic
  if (nameLower.includes('sending') || nameLower.includes('send')) {
    return "Sending messages manually takes time and things get forgotten. You can't be sure everything is delivered on time.";
  }

  return null;
}

/**
 * Converts a problem statement to layman-friendly language
 */
export function toLaymanProblem(problemStatement: string, category: string, automationName?: string): string {
  // First, try to generate from automation name
  if (automationName) {
    const generated = generateProblemStatement(automationName, category);
    if (generated) return generated;
  }
  
  // Then try to clean the original
  let cleaned = removeToolNames(problemStatement);
  
  // If the result is too short or empty, generate a category-based problem
  if (!cleaned || cleaned.length < 20) {
    return getCategoryProblem(category);
  }
  
  return cleaned;
}

/**
 * Converts a solution description to layman-friendly language
 * Focuses on simple benefits, not technical details
 */
export function toLaymanSolution(solution: string, category: string, automationName?: string): string {
  // First, try to generate a benefit-focused description from the automation name
  if (automationName) {
    const benefitDescription = generateBenefitDescription(automationName, category);
    if (benefitDescription) {
      return benefitDescription;
    }
  }
  
  let cleaned = removeToolNames(solution);
  
  // Replace technical action phrases with simpler ones
  cleaned = cleaned
    .replace(/automat(es?|ing|ion)\s+(the\s+)?process\s+of/gi, 'handles')
    .replace(/leverag(es?|ing)/gi, 'uses')
    .replace(/implement(s|ing|ation)/gi, 'sets up')
    .replace(/integrat(es?|ing|ion)\s+with/gi, 'connects to')
    .replace(/orchestrat(es?|ing|ion)/gi, 'manages')
    .replace(/triggers?\s+(a\s+)?workflow/gi, 'starts the process')
    .replace(/data\s+enrichment/gi, 'gathering additional information')
    .replace(/scraping/gi, 'collecting data from')
    .replace(/parsing/gi, 'reading')
    .replace(/batch\s+process(ing)?/gi, 'handling multiple items at once');
  
  if (!cleaned || cleaned.length < 20) {
    return getCategorySolution(category);
  }
  
  return cleaned;
}

/**
 * Generates a simple, benefit-focused description based on automation name keywords
 */
function generateBenefitDescription(name: string, category: string): string | null {
  const nameLower = name.toLowerCase();
  
  // Recipe/Food related
  if (nameLower.includes('recipe') || nameLower.includes('meal') || nameLower.includes('food') || nameLower.includes('hellofresh') || nameLower.includes('cooking')) {
    return "Generates your weekly recipes and meal plans automatically, so you never have to think about what to cook.";
  }
  
  // Translation/Language related
  if (nameLower.includes('translat') || nameLower.includes('french') || nameLower.includes('spanish') || nameLower.includes('german') || nameLower.includes('multilingual')) {
    return "Translates your content between languages automatically, reaching audiences worldwide without manual translation.";
  }
  
  // Speech/Voice/Narration related
  if (nameLower.includes('speech') || nameLower.includes('voice') || nameLower.includes('narration') || nameLower.includes('voiceover')) {
    return "Creates professional voiceovers and narration automatically, turning your content into engaging audio.";
  }
  
  // Coach/Training related
  if (nameLower.includes('coach') || nameLower.includes('tutor') || nameLower.includes('mentor')) {
    return "Provides personalized coaching and feedback automatically, helping you improve without expensive consultants.";
  }
  
  // Mentions/Monitoring related
  if (nameLower.includes('mention') || nameLower.includes('monitor') && !nameLower.includes('comment')) {
    return "Monitors your brand mentions automatically, alerting you when people are talking about you.";
  }
  
  // Twilio/SMS specific
  if (nameLower.includes('twilio')) {
    return "Sends text messages automatically at the right moments, keeping contacts engaged without manual effort.";
  }
  
  // Typeform specific
  if (nameLower.includes('typeform')) {
    return "Processes form responses automatically, organizing submissions and triggering follow-up actions.";
  }
  
  // Social media posting/scheduling
  if (nameLower.includes('social') && (nameLower.includes('post') || nameLower.includes('schedul') || nameLower.includes('publish'))) {
    return "Creates and schedules your social media posts automatically, keeping your accounts active without the daily effort.";
  }
  
  // LinkedIn specific
  if (nameLower.includes('linkedin')) {
    if (nameLower.includes('comment') || nameLower.includes('respond')) {
      return "Responds to LinkedIn comments and messages for you, keeping your engagement high without constant monitoring.";
    }
    if (nameLower.includes('connection') || nameLower.includes('outreach')) {
      return "Sends personalized connection requests and follow-ups on LinkedIn, growing your network while you focus on other work.";
    }
    if (nameLower.includes('post') || nameLower.includes('content')) {
      return "Creates and publishes LinkedIn content for you, building your professional presence automatically.";
    }
    return "Handles your LinkedIn activities automatically, growing your professional network without the daily grind.";
  }
  
  // Twitter/X specific
  if (nameLower.includes('twitter') || nameLower.includes(' x ') || nameLower.includes('tweet')) {
    if (nameLower.includes('reply') || nameLower.includes('respond')) {
      return "Responds to tweets and mentions automatically, keeping your audience engaged without constant monitoring.";
    }
    return "Manages your Twitter presence automatically, posting content and engaging with followers.";
  }
  
  // Instagram specific
  if (nameLower.includes('instagram') || nameLower.includes('insta')) {
    if (nameLower.includes('story') || nameLower.includes('stories')) {
      return "Creates and posts Instagram stories automatically, keeping your audience engaged daily.";
    }
    if (nameLower.includes('reel')) {
      return "Creates Instagram Reels automatically from your content, boosting your visibility without the editing work.";
    }
    return "Manages your Instagram content automatically, keeping your feed fresh and engaging.";
  }
  
  // Facebook specific
  if (nameLower.includes('facebook') || nameLower.includes(' fb ')) {
    return "Manages your Facebook presence automatically, posting content and engaging with your audience.";
  }
  
  // TikTok specific
  if (nameLower.includes('tiktok')) {
    return "Creates and publishes TikTok content automatically, growing your presence on the platform.";
  }
  
  // YouTube specific
  if (nameLower.includes('youtube')) {
    if (nameLower.includes('short')) {
      return "Creates YouTube Shorts automatically from your content, expanding your reach without extra editing.";
    }
    if (nameLower.includes('transcript') || nameLower.includes('caption')) {
      return "Generates transcripts and captions for your videos automatically, making them more accessible.";
    }
    return "Manages your YouTube channel tasks automatically, from content creation to optimization.";
  }
  
  // Email related
  if (nameLower.includes('email') || nameLower.includes('mail') || nameLower.includes('inbox')) {
    if (nameLower.includes('follow') || nameLower.includes('sequence') || nameLower.includes('drip')) {
      return "Sends follow-up emails automatically at the right time, so you never lose touch with important contacts.";
    }
    if (nameLower.includes('newsletter') || nameLower.includes('digest')) {
      return "Creates and sends newsletters automatically, keeping your audience engaged without the manual work.";
    }
    if (nameLower.includes('cold') || nameLower.includes('outreach')) {
      return "Sends personalized outreach emails automatically, helping you connect with new prospects.";
    }
    if (nameLower.includes('sort') || nameLower.includes('organiz') || nameLower.includes('filter')) {
      return "Organizes your inbox automatically, keeping important emails front and center.";
    }
    return "Handles your email tasks automatically, keeping your inbox organized and communications on track.";
  }
  
  // Lead/Sales related
  if (nameLower.includes('lead') || nameLower.includes('prospect')) {
    if (nameLower.includes('enrich') || nameLower.includes('research')) {
      return "Finds contact details and background info on potential customers, so you can reach out with confidence.";
    }
    if (nameLower.includes('score') || nameLower.includes('qualif')) {
      return "Identifies your best leads automatically, so you focus on the ones most likely to buy.";
    }
    return "Finds and organizes potential customers for you, filling your pipeline without hours of research.";
  }
  
  // Video/Content creation
  if (nameLower.includes('video')) {
    if (nameLower.includes('create') || nameLower.includes('generat') || nameLower.includes('make')) {
      return "Creates videos automatically from your ideas or content, saving hours of production time.";
    }
    if (nameLower.includes('edit') || nameLower.includes('clip') || nameLower.includes('cut')) {
      return "Edits and formats your videos automatically, turning raw footage into polished content.";
    }
    if (nameLower.includes('thumbnail')) {
      return "Creates eye-catching thumbnails for your videos automatically, boosting your click-through rates.";
    }
    return "Handles your video tasks automatically, from creation to publishing.";
  }
  
  // Blog/Article related
  if (nameLower.includes('blog') || nameLower.includes('article') || nameLower.includes('writing') || nameLower.includes('writer')) {
    return "Writes and formats articles for you, keeping your blog fresh with quality content.";
  }
  
  // SEO related
  if (nameLower.includes('seo') || nameLower.includes('keyword') || nameLower.includes('ranking') || nameLower.includes('search engine')) {
    return "Optimizes your content for search engines automatically, helping more people find you online.";
  }
  
  // Customer/Support related
  if (nameLower.includes('customer') || nameLower.includes('support') || nameLower.includes('ticket') || nameLower.includes('helpdesk')) {
    return "Handles customer inquiries automatically, providing quick responses and keeping customers happy.";
  }
  
  // Invoice/Payment related
  if (nameLower.includes('invoice') || nameLower.includes('payment') || nameLower.includes('billing')) {
    return "Manages invoices and payment reminders automatically, keeping your cash flow healthy.";
  }
  
  // Inventory/Product related
  if (nameLower.includes('inventory') || nameLower.includes('stock')) {
    return "Tracks your inventory automatically, alerting you before items run low.";
  }
  
  // Report/Analytics related
  if (nameLower.includes('report') || nameLower.includes('analytic') || nameLower.includes('dashboard') || nameLower.includes('metric')) {
    return "Generates reports automatically, giving you clear insights without the data crunching.";
  }
  
  // Calendar/Scheduling related
  if (nameLower.includes('calendar') || nameLower.includes('appointment') || nameLower.includes('booking') || nameLower.includes('schedule')) {
    return "Manages your calendar and appointments automatically, preventing double-bookings and scheduling headaches.";
  }
  
  // Research related
  if (nameLower.includes('research') || nameLower.includes('competitor') || nameLower.includes('market analysis')) {
    return "Gathers and organizes research for you automatically, delivering insights without hours of searching.";
  }
  
  // Data/Spreadsheet related
  if (nameLower.includes('spreadsheet') || nameLower.includes('google sheet') || nameLower.includes('excel') || (nameLower.includes('data') && nameLower.includes('entry'))) {
    return "Handles data entry and organization automatically, eliminating tedious manual work.";
  }
  
  // Notification/Alert related
  if (nameLower.includes('notification') || nameLower.includes('alert') || nameLower.includes('monitor')) {
    return "Monitors and alerts you to important changes automatically, so nothing slips through the cracks.";
  }
  
  // Review/Feedback related
  if (nameLower.includes('review') || nameLower.includes('feedback') || nameLower.includes('testimonial') || nameLower.includes('rating')) {
    return "Collects and manages reviews automatically, building your reputation without the constant follow-up.";
  }
  
  // Onboarding related
  if (nameLower.includes('onboard') || nameLower.includes('welcome') || nameLower.includes('new user') || nameLower.includes('new customer')) {
    return "Welcomes and guides new users automatically, creating a great first impression every time.";
  }
  
  // SMS/Text related
  if (nameLower.includes('sms') || nameLower.includes('text messag') || nameLower.includes('whatsapp') || (nameLower.includes('phone') && nameLower.includes('outreach'))) {
    return "Sends text messages automatically at the right moments, keeping contacts engaged without manual effort.";
  }
  
  // Image/Photo related
  if (nameLower.includes('image') || nameLower.includes('photo') || nameLower.includes('picture')) {
    if (nameLower.includes('resize') || nameLower.includes('compress') || nameLower.includes('optimize')) {
      return "Optimizes and resizes your images automatically, making them perfect for any platform.";
    }
    return "Processes and organizes your images automatically, saving hours of editing time.";
  }
  
  // Podcast related
  if (nameLower.includes('podcast') || nameLower.includes('audio')) {
    return "Handles your podcast production tasks automatically, from editing to publishing.";
  }
  
  // Hiring/HR related
  if (nameLower.includes('hiring') || nameLower.includes('recruit') || nameLower.includes('candidate') || nameLower.includes('resume') || nameLower.includes('applicant')) {
    return "Streamlines your hiring process automatically, finding and organizing candidates efficiently.";
  }
  
  // CRM/Contact management
  if (nameLower.includes('crm') || nameLower.includes('contact') || nameLower.includes('customer relationship')) {
    return "Keeps your contact database organized and up-to-date automatically.";
  }
  
  // Slack/Team communication
  if (nameLower.includes('slack') || nameLower.includes('team') || nameLower.includes('channel')) {
    return "Manages team communications automatically, keeping everyone informed without extra effort.";
  }
  
  // Document/File management
  if (nameLower.includes('document') || nameLower.includes('file') || nameLower.includes('pdf') || nameLower.includes('folder')) {
    return "Organizes and manages your files automatically, keeping everything in its place.";
  }
  
  // E-commerce/Order related
  if (nameLower.includes('ecommerce') || nameLower.includes('e-commerce') || nameLower.includes('order') || nameLower.includes('shopify') || nameLower.includes('woocommerce')) {
    return "Manages your online store tasks automatically, from orders to customer updates.";
  }
  
  // Form handling
  if (nameLower.includes('form') || nameLower.includes('submission') || nameLower.includes('signup')) {
    return "Processes form submissions automatically, organizing responses and triggering follow-ups.";
  }
  
  // Survey/Poll
  if (nameLower.includes('survey') || nameLower.includes('poll') || nameLower.includes('questionnaire')) {
    return "Creates and distributes surveys automatically, collecting feedback without the manual work.";
  }
  
  // Meeting/Zoom
  if (nameLower.includes('meeting') || nameLower.includes('zoom') || nameLower.includes('webinar') || nameLower.includes('conference')) {
    return "Manages your meetings automatically, from scheduling to follow-ups.";
  }
  
  // Project/Task management
  if (nameLower.includes('project') || nameLower.includes('task') || nameLower.includes('trello') || nameLower.includes('asana') || nameLower.includes('notion')) {
    return "Keeps your projects organized automatically, updating tasks and tracking progress.";
  }
  
  // Reminder/Follow-up
  if (nameLower.includes('reminder') || nameLower.includes('follow-up') || nameLower.includes('follow up')) {
    return "Sends reminders and follow-ups automatically, so nothing falls through the cracks.";
  }
  
  // RSS/News
  if (nameLower.includes('rss') || nameLower.includes('news') || nameLower.includes('feed') || nameLower.includes('curate')) {
    return "Curates and delivers relevant news and content automatically, keeping you informed.";
  }
  
  // Quote/Proposal
  if (nameLower.includes('quote') || nameLower.includes('proposal') || nameLower.includes('estimate')) {
    return "Generates professional quotes and proposals automatically, speeding up your sales process.";
  }
  
  // Contract
  if (nameLower.includes('contract') || nameLower.includes('agreement') || nameLower.includes('signature')) {
    return "Manages contracts and signatures automatically, streamlining your paperwork.";
  }
  
  // Affiliate/Referral
  if (nameLower.includes('affiliate') || nameLower.includes('referral') || nameLower.includes('partner')) {
    return "Tracks referrals and affiliate activities automatically, managing your partner program effortlessly.";
  }
  
  // Coupon/Discount
  if (nameLower.includes('coupon') || nameLower.includes('discount') || nameLower.includes('promo')) {
    return "Manages discounts and promotions automatically, attracting customers without manual updates.";
  }
  
  // Shipping/Tracking
  if (nameLower.includes('shipping') || nameLower.includes('tracking') || nameLower.includes('delivery')) {
    return "Tracks shipments and updates customers automatically, keeping everyone informed.";
  }
  
  // Weather
  if (nameLower.includes('weather') || nameLower.includes('forecast')) {
    return "Provides weather updates and alerts automatically, helping you plan ahead.";
  }
  
  // Event
  if (nameLower.includes('event') || nameLower.includes('rsvp') || nameLower.includes('registration')) {
    return "Manages event registrations and communications automatically, making event planning easier.";
  }
  
  // Chat/Chatbot
  if (nameLower.includes('chat') || nameLower.includes('chatbot') || nameLower.includes('conversation')) {
    return "Handles conversations automatically, responding to questions and engaging visitors.";
  }
  
  // Comment moderation
  if (nameLower.includes('comment') || nameLower.includes('moderate') || nameLower.includes('spam')) {
    return "Moderates comments automatically, keeping your community clean and engaged.";
  }
  
  // Brand monitoring
  if (nameLower.includes('brand') || nameLower.includes('mention') || nameLower.includes('reputation')) {
    return "Monitors your brand mentions automatically, keeping you aware of what people are saying.";
  }
  
  // Ad/Advertising
  if (nameLower.includes(' ad ') || nameLower.includes('advertising') || nameLower.includes('campaign') || nameLower.includes('google ads') || nameLower.includes('facebook ads')) {
    return "Manages your ad campaigns automatically, optimizing performance without constant tweaking.";
  }
  
  // Accounting/Expense
  if (nameLower.includes('accounting') || nameLower.includes('expense') || nameLower.includes('receipt') || nameLower.includes('bookkeeping')) {
    return "Tracks expenses and manages bookkeeping automatically, keeping your finances organized.";
  }
  
  // Time tracking
  if (nameLower.includes('time track') || nameLower.includes('timesheet') || nameLower.includes('hours')) {
    return "Tracks time automatically, making billing and productivity reporting effortless.";
  }
  
  // Employee/Payroll
  if (nameLower.includes('employee') || nameLower.includes('payroll') || nameLower.includes('hr ') || nameLower.includes('staff')) {
    return "Manages employee tasks and communications automatically, streamlining HR processes.";
  }
  
  // Training/Learning
  if (nameLower.includes('training') || nameLower.includes('learning') || nameLower.includes('course') || nameLower.includes('education')) {
    return "Delivers training content and tracks progress automatically, making learning seamless.";
  }
  
  // Announcement/Press
  if (nameLower.includes('announcement') || nameLower.includes('press') || nameLower.includes('news release')) {
    return "Distributes announcements and press releases automatically, getting your message out quickly.";
  }
  
  // Product launch
  if (nameLower.includes('launch') || nameLower.includes('release') || nameLower.includes('new product')) {
    return "Coordinates product launches automatically, ensuring nothing is missed.";
  }
  
  // Sync/Integration
  if (nameLower.includes('sync') || nameLower.includes('integrat') || nameLower.includes('connect')) {
    return "Keeps your systems in sync automatically, ensuring data flows smoothly between tools.";
  }
  
  // Backup/Archive
  if (nameLower.includes('backup') || nameLower.includes('archive') || nameLower.includes('export')) {
    return "Backs up and archives your data automatically, keeping everything safe and organized.";
  }
  
  // Cleanup/Maintenance
  if (nameLower.includes('cleanup') || nameLower.includes('clean up') || nameLower.includes('maintenance') || nameLower.includes('duplicate')) {
    return "Cleans up and maintains your data automatically, keeping everything tidy.";
  }
  
  // Translation
  if (nameLower.includes('translat') || nameLower.includes('language') || nameLower.includes('localize')) {
    return "Translates content automatically, helping you reach audiences in any language.";
  }
  
  // Transcription
  if (nameLower.includes('transcript') || nameLower.includes('transcrib') || nameLower.includes('speech to text')) {
    return "Transcribes audio and video automatically, turning recordings into text.";
  }
  
  // Summary/Summarize
  if (nameLower.includes('summar') || nameLower.includes('digest') || nameLower.includes('brief')) {
    return "Creates summaries automatically, giving you the key points without reading everything.";
  }
  
  // Notification/Update
  if (nameLower.includes('update') || nameLower.includes('notify') || nameLower.includes('status')) {
    return "Sends updates and notifications automatically, keeping everyone in the loop.";
  }
  
  // Scrape/Extract
  if (nameLower.includes('scrape') || nameLower.includes('extract') || nameLower.includes('collect data')) {
    return "Collects information from websites automatically, saving hours of manual research.";
  }
  
  // Validate/Verify
  if (nameLower.includes('validat') || nameLower.includes('verify') || nameLower.includes('check')) {
    return "Validates and verifies information automatically, ensuring accuracy without manual review.";
  }
  
  // Generate/Create (generic)
  if (nameLower.includes('generat') || nameLower.includes('create') || nameLower.includes('make')) {
    return "Creates content automatically based on your requirements, saving time on repetitive work.";
  }
  
  // Automate/Workflow (generic)
  if (nameLower.includes('automat') || nameLower.includes('workflow') || nameLower.includes('process')) {
    return "Automates your routine tasks, letting you focus on more important work.";
  }
  
  // No specific match - return null to use fallback
  return null;
}

/**
 * Generates a keyword-based "How It Works" description
 */
function generateHowItWorksDescription(name: string, category: string): string | null {
  const nameLower = name.toLowerCase();
  
  // Recipe/Food related
  if (nameLower.includes('recipe') || nameLower.includes('meal') || nameLower.includes('food') || nameLower.includes('hellofresh') || nameLower.includes('cooking') || nameLower.includes('diet')) {
    return "Once set up, this automation analyzes your preferences and generates personalized meal plans and recipes each week. It considers your dietary needs, favorite cuisines, and cooking skill level—delivering ready-to-use meal ideas straight to you without any effort on your part.";
  }
  
  // LinkedIn specific
  if (nameLower.includes('linkedin')) {
    return "This automation monitors your LinkedIn activity in the background. When someone comments on your posts or sends a message, it crafts thoughtful, personalized responses that match your voice. You stay engaged with your network without spending hours on the platform.";
  }
  
  // Lead generation/Sales/Outreach
  if (nameLower.includes('lead') || nameLower.includes('prospect') || nameLower.includes('outreach') || nameLower.includes('cold')) {
    return "This automation works behind the scenes to find and qualify potential customers. It researches prospects, gathers contact information, and even initiates personalized outreach on your behalf. You receive a steady stream of qualified leads ready for follow-up.";
  }
  
  // Email related
  if (nameLower.includes('email') || nameLower.includes('newsletter') || nameLower.includes('inbox') || nameLower.includes('mail')) {
    return "Once configured, this automation handles your email tasks automatically. It can send personalized messages, follow up with contacts at the right times, and keep your inbox organized. Your communication stays consistent while you focus on more important work.";
  }
  
  // Social media
  if (nameLower.includes('social') || nameLower.includes('instagram') || nameLower.includes('facebook') || nameLower.includes('twitter') || nameLower.includes('tiktok')) {
    return "This automation works in the background to manage your social media presence. It creates content, schedules posts for optimal times, and can even respond to comments. You maintain an active social presence without the daily grind.";
  }
  
  // Customer support
  if (nameLower.includes('support') || nameLower.includes('ticket') || nameLower.includes('help desk') || nameLower.includes('customer service')) {
    return "This automation handles customer inquiries automatically. It categorizes incoming requests, provides instant answers to common questions, and routes complex issues to the right team member. Your customers get faster responses while your team handles fewer routine questions.";
  }
  
  // Scheduling/Calendar
  if (nameLower.includes('schedule') || nameLower.includes('calendar') || nameLower.includes('meeting') || nameLower.includes('appointment') || nameLower.includes('booking')) {
    return "This automation manages your calendar automatically. It finds available time slots, sends invites, handles rescheduling requests, and sends reminders. No more back-and-forth emails to coordinate meetings.";
  }
  
  // Invoice/Billing
  if (nameLower.includes('invoice') || nameLower.includes('billing') || nameLower.includes('payment')) {
    return "This automation handles your billing tasks automatically. It creates professional invoices, sends them at the right time, and follows up on overdue payments. You get paid faster without chasing down every invoice.";
  }
  
  // Data/Spreadsheet
  if (nameLower.includes('data') || nameLower.includes('spreadsheet') || nameLower.includes('excel') || nameLower.includes('sheet') || nameLower.includes('csv')) {
    return "This automation processes your data automatically. It collects information from various sources, cleans and organizes it, and updates your spreadsheets or databases. You always have accurate, up-to-date information without manual data entry.";
  }
  
  // E-commerce/Orders
  if (nameLower.includes('order') || nameLower.includes('shop') || nameLower.includes('store') || nameLower.includes('ecommerce') || nameLower.includes('inventory')) {
    return "This automation manages your online store operations automatically. It processes orders, updates inventory levels, sends shipping notifications, and keeps customers informed. Your store runs smoothly around the clock.";
  }
  
  // Reports/Analytics
  if (nameLower.includes('report') || nameLower.includes('analytics') || nameLower.includes('dashboard') || nameLower.includes('metrics')) {
    return "This automation gathers data from your various systems and compiles it into clear, actionable reports. You get regular insights delivered automatically without spending hours pulling numbers together.";
  }
  
  // SMS/Text
  if (nameLower.includes('sms') || nameLower.includes('text messag') || nameLower.includes('whatsapp') || (nameLower.includes('phone') && nameLower.includes('outreach'))) {
    return "This automation sends personalized text messages at the perfect moments. Whether it's appointment reminders, follow-ups, or promotional messages, it reaches your contacts instantly without you typing a single text.";
  }
  
  // CRM/Contact
  if (nameLower.includes('crm') || nameLower.includes('contact') || nameLower.includes('customer') || nameLower.includes('client')) {
    return "This automation keeps your customer information organized and up-to-date. It syncs data across your systems, tracks interactions, and ensures you always have the full picture when talking to clients.";
  }
  
  // Recruitment/HR
  if (nameLower.includes('recruit') || nameLower.includes('hiring') || nameLower.includes('candidate') || nameLower.includes('resume') || nameLower.includes('hr')) {
    return "This automation streamlines your hiring process. It screens incoming applications, schedules interviews, and keeps candidates informed at every stage. You find better candidates faster while providing a great experience.";
  }
  
  // Research/Analysis
  if (nameLower.includes('research') || nameLower.includes('analysis') || nameLower.includes('competitor') || nameLower.includes('market')) {
    return "This automation gathers and analyzes information from across the web. It monitors trends, tracks competitors, and compiles findings into easy-to-digest summaries. You get actionable insights without hours of manual research.";
  }
  
  // Image/Photo/Video
  if (nameLower.includes('image') || nameLower.includes('photo') || nameLower.includes('video') || nameLower.includes('youtube')) {
    return "This automation handles your media processing tasks automatically. It can resize, optimize, organize, and distribute your images and videos across platforms. Your content is always ready to use without manual editing.";
  }
  
  // Chatbot/AI assistant
  if (nameLower.includes('chatbot') || nameLower.includes('ai assistant') || nameLower.includes('virtual assistant') || nameLower.includes('bot')) {
    return "This automation provides instant responses to visitors and customers around the clock. It understands questions, provides helpful answers, and hands off to a human when needed. Your audience gets immediate help even when you're not available.";
  }
  
  // Backup/Sync
  if (nameLower.includes('backup') || nameLower.includes('sync') || nameLower.includes('transfer') || nameLower.includes('migrate')) {
    return "This automation keeps your data safe and synchronized across systems. It runs regular backups, ensures information matches everywhere, and alerts you to any issues. Your data is always protected and accessible.";
  }
  
  // Survey/Feedback
  if (nameLower.includes('survey') || nameLower.includes('feedback') || nameLower.includes('review')) {
    return "This automation collects and organizes feedback automatically. It sends surveys at the right moments, compiles responses, and highlights key insights. You understand what your customers think without chasing responses.";
  }
  
  // Project/Task/Workflow
  if (nameLower.includes('project') || nameLower.includes('task') || nameLower.includes('workflow') || nameLower.includes('team')) {
    return "This automation keeps your projects moving forward automatically. It updates task statuses, sends reminders to team members, and keeps everyone informed of progress. Nothing falls through the cracks.";
  }
  
  // Notification/Alert
  if (nameLower.includes('notification') || nameLower.includes('alert') || nameLower.includes('reminder') || nameLower.includes('notify')) {
    return "This automation monitors what matters and alerts you instantly when action is needed. You stay informed of important changes without constantly checking multiple systems.";
  }
  
  return null;
}

/**
 * Generates a layman-friendly "How It Works" description
 */
export function toLaymanHowItWorks(solution: string, name: string, category: string): string {
  // First, try to generate from automation name
  const generated = generateHowItWorksDescription(name, category);
  if (generated) return generated;
  
  // Fall back to category-based descriptions
  const categoryDescriptions: Record<string, string> = {
    "Social Media Marketing": `This automation takes care of your social media tasks automatically. Once set up, it works in the background to create, schedule, and publish content across your platforms. You simply provide your ideas or guidelines, and the system handles the rest—saving you hours of manual work every week.`,
    "Content Creation": `This automation streamlines your content production. It helps generate, format, and organize your content based on your preferences. Instead of spending hours on repetitive tasks, you get polished content ready to use, allowing you to focus on strategy and creativity.`,
    "Email & Communication": `This automation manages your email and messaging tasks effortlessly. It can send personalized messages, follow up with contacts, and organize responses—all without you lifting a finger. Your communication stays consistent while you focus on more important work.`,
    "Marketing & SEO": `This automation boosts your marketing efforts by handling repetitive optimization tasks. It monitors performance, identifies opportunities, and implements improvements automatically. You get better results with less manual effort.`,
    "Operations & Productivity": `This automation eliminates tedious manual tasks from your workflow. It processes information, updates records, and keeps everything organized automatically. Your team spends less time on busywork and more time on what matters.`,
    "eCommerce & Product": `This automation handles the repetitive parts of running your online store. From inventory updates to customer communications, it keeps your business running smoothly around the clock.`,
    "Research & Analysis": `This automation gathers and organizes information for you automatically. Instead of spending hours searching and compiling data, you receive organized insights ready for decision-making.`,
    "Sales & CRM": `This automation supercharges your sales process. It finds leads, organizes contact information, and helps you follow up at the right time—all automatically. You close more deals while spending less time on admin work.`,
  };
  
  return categoryDescriptions[category] || `This automation handles repetitive tasks for you automatically. Once configured, it works in the background to complete your workflows efficiently, saving you valuable time and reducing manual errors.`;
}

/**
 * Fallback problem statements by category
 */
function getCategoryProblem(category: string): string {
  const problems: Record<string, string> = {
    "Social Media Marketing": "Managing social media consistently takes hours of daily effort, making it hard to stay active across multiple platforms while running your business.",
    "Content Creation": "Creating quality content regularly demands significant time and creative energy, often pulling you away from other important tasks.",
    "Email & Communication": "Keeping up with emails and messages is overwhelming—important conversations get lost and follow-ups slip through the cracks.",
    "Marketing & SEO": "Marketing tasks pile up quickly, and without constant attention, your online visibility and lead generation suffer.",
    "Operations & Productivity": "Repetitive administrative tasks eat into your productive hours, leaving less time for work that actually grows your business.",
    "eCommerce & Product": "Running an online store involves countless small tasks that, when done manually, take time away from growing your business.",
    "Research & Analysis": "Gathering and organizing information manually is time-consuming and often produces inconsistent results.",
    "Sales & CRM": "Finding and following up with potential customers takes too much time, causing missed opportunities and slower growth.",
  };
  
  return problems[category] || "Manual processes are time-consuming and take you away from the work that matters most to your business.";
}

/**
 * Fallback solution statements by category
 */
function getCategorySolution(category: string): string {
  const solutions: Record<string, string> = {
    "Social Media Marketing": "Automatically create, schedule, and publish engaging content across all your social platforms without the daily grind.",
    "Content Creation": "Generate polished content quickly and consistently, freeing up your time for strategy and creativity.",
    "Email & Communication": "Send personalized messages and follow-ups automatically, ensuring no important conversation falls through the cracks.",
    "Marketing & SEO": "Keep your marketing running smoothly with automated optimization and lead capture working around the clock.",
    "Operations & Productivity": "Eliminate repetitive tasks from your workflow, letting you and your team focus on high-value work.",
    "eCommerce & Product": "Handle inventory, orders, and customer updates automatically, keeping your store running smoothly 24/7.",
    "Research & Analysis": "Collect and organize information automatically, delivering actionable insights without hours of manual research.",
    "Sales & CRM": "Find qualified leads and nurture relationships automatically, so you can focus on closing deals instead of chasing them.",
  };
  
  return solutions[category] || "Automate repetitive tasks and let the system work for you, saving time and reducing errors.";
}

/**
 * Cleans up a feature description to remove technical tool names
 * and convert to layman-friendly language
 */
export function toLaymanFeature(feature: string): string {
  // Tool name replacements with layman alternatives
  const toolReplacements: [RegExp, string][] = [
    // Remove parenthetical tool mentions entirely
    [/\s*\([^)]*(?:Eleven Labs|ElevenLabs|OpenAI|GPT|Cloudinary|Twilio|Telegram|n8n|Zapier|Airtable|Notion|HubSpot|Salesforce|Apollo|Gemini|Langchain|LangChain|PiAPI|Creatomate|Baserow|Anthropic|Linear|Jira|JIRA)[^)]*\)/gi, ''],
    // Common tool patterns with alternatives
    [/\bTelegram\s+control\s+interface\b/gi, 'Easy command interface'],
    [/\bTelegram\s+integration\b/gi, 'Messaging integration'],
    [/\bCloudinary\s+asset\s+management\b/gi, 'Media file storage'],
    [/\bCloudinary\s+storage\b/gi, 'Cloud media storage'],
    [/\bCloudinary\b/gi, 'cloud storage'],
    [/\bTwilio\s+integration\b/gi, 'SMS capability'],
    [/\bTwilio\s+SMS\b/gi, 'Text messaging'],
    [/\bTwilio\b/gi, 'messaging service'],
    [/\bTelegram\b/gi, 'messaging app'],
    [/\bGoogle\s+Sheets?\s+(?:data\s+)?management\b/gi, 'Spreadsheet organization'],
    [/\bGoogle\s+Sheets?\s+integration\b/gi, 'Spreadsheet syncing'],
    [/\bElevenLabs?\b/gi, 'AI voice'],
    [/\bEleven\s+Labs?\b/gi, 'AI voice'],
    [/\bGPT-4o?(?:-mini)?\b/gi, 'AI'],
    [/\bOpenAI\b/gi, 'AI'],
    [/\bGemini\s+API\b/gi, 'AI'],
    [/\bGoogle\s+Gemini\b/gi, 'AI'],
    [/\bLangchain\b/gi, ''],
    [/\bLangChain\b/gi, ''],
    [/\bPiAPI\b/gi, 'AI'],
    [/\bCreatomate\b/gi, 'video editor'],
    [/\bApollo\b/gi, 'lead finder'],
    [/\bBaserow\b/gi, 'database'],
    [/\bvia\s+Gemini\s+API\b/gi, ''],
    [/\bvia\s+AI\b/gi, 'with AI'],
  ];

  let cleaned = feature;
  
  toolReplacements.forEach(([pattern, replacement]) => {
    cleaned = cleaned.replace(pattern, replacement);
  });
  
  // Clean up any double spaces and awkward punctuation
  cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();
  cleaned = cleaned.replace(/^\s*,\s*/, '');
  cleaned = cleaned.replace(/\s*,\s*$/, '');
  
  return cleaned;
}

/**
 * Cleans up an automation name to remove technical suffixes like "via Gemini API"
 */
export function toLaymanName(name: string): string {
  const nameCleanupPatterns: [RegExp, string][] = [
    [/\s+via\s+(?:Gemini|OpenAI|GPT|AI|Google)\s*(?:API)?\s*$/gi, ''],
    [/\s+using\s+(?:Gemini|OpenAI|GPT|AI|Google)\s*(?:API)?\s*$/gi, ''],
    [/\s+with\s+(?:Gemini|OpenAI|GPT|AI|Google)\s*(?:API)?\s*$/gi, ''],
    [/\s+powered\s+by\s+(?:Gemini|OpenAI|GPT|AI|Google)\s*(?:API)?\s*$/gi, ''],
    [/\s*\(\s*(?:Gemini|OpenAI|GPT|AI|Google)\s*(?:API)?\s*\)\s*$/gi, ''],
    [/\bn8n\s+/gi, 'Automation '],
    [/\bn8n$/gi, 'Automation'],
  ];
  
  let cleaned = name;
  nameCleanupPatterns.forEach(([pattern, replacement]) => {
    cleaned = cleaned.replace(pattern, replacement);
  });
  
  return cleaned.trim();
}
