// @ts-nocheck
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { FuturisticBackground } from "@/components/FuturisticBackground";
import { WelcomeDialog } from "@/components/WelcomeDialog";
import { CustomAutomationSection } from "@/components/CustomAutomationSection";
import { AffiliateMarquee } from "@/components/AffiliateMarquee";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import ROICalculator from "@/components/ROICalculator";
import VoiceAssistant from "@/components/VoiceAssistant";
import { SocialProofBanner, TestimonialStrip } from "@/components/SocialProofBanner";
import { CheckCircle2, Clock, Zap, DollarSign, TrendingUp, Mail, BarChart3, ShoppingBag, FolderKanban, MessageSquare, Video, Volume2, ArrowRight, ShoppingCart, FileText, Share2, ImageIcon, Pencil, Star, Shield, Users } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { AudioRecorder } from "@/utils/audioRecorder";
import { useAudioPlayer } from "@/hooks/use-audio-player";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/contexts/CartContext";
import bumpsyndicate from "@/assets/bump-syndicate-logo.png";

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  automations?: AutomationMatch[];
}

interface AutomationMatch {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
}

const Index = () => {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { toast } = useToast();
  const { initializeAudioContext, playAudioFromBase64, cleanup } = useAudioPlayer();
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [matches, setMatches] = useState<AutomationMatch[]>([]);
  const recorderRef = useRef<AudioRecorder | null>(null);

  useEffect(() => {
    recorderRef.current = new AudioRecorder();

    return () => {
      cleanup();
    };
  }, [cleanup]);

  const handleStart = async () => {
    try {
      // Initialize audio context on user interaction (required for iOS)
      const audioReady = await initializeAudioContext();
      
      if (!recorderRef.current) return;
      
      // Request microphone permission
      const granted = await recorderRef.current.requestPermission();
      if (!granted) {
        toast({
          title: "Microphone Access Needed",
          description: "Please allow microphone access in Settings > Safari > Microphone",
          variant: "destructive",
        });
        return;
      }
      
      await recorderRef.current.startRecording();
      setIsListening(true);
      
      toast({
        title: audioReady ? "🎤 Listening & Ready to Talk Back" : "🎤 Listening (text only)",
        description: audioReady ? "Speak now, I'll respond with voice" : "Speak now, I'll respond with text",
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Error",
        description: "Failed to start recording. Check Settings > Safari > Microphone",
        variant: "destructive",
      });
    }
  };

  const handleStop = async () => {
    try {
      if (!recorderRef.current) return;
      
      setIsListening(false);
      setIsProcessing(true);

      const audioBlob = await recorderRef.current.stopRecording();
      console.log('Audio blob size:', audioBlob.size);

      // Prepare form data
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.webm');
      formData.append('mode', 'shopping'); // Shopping mode for homepage
      formData.append('conversation_history', JSON.stringify(
        conversation.map(m => ({ role: m.role, content: m.content }))
      ));

      // Call voice agent
      const { data, error } = await supabase.functions.invoke('voice-agent', {
        body: formData,
      });

      if (error) throw error;

      console.log('Voice agent response:', data);

      // Add user message
      const userMessage: ConversationMessage = {
        role: 'user',
        content: data.user_text,
        timestamp: new Date(),
      };

      // Add assistant message with automations
      const assistantMessage: ConversationMessage = {
        role: 'assistant',
        content: data.reply,
        timestamp: new Date(),
        automations: data.matches || [],
      };

      setConversation(prev => [...prev, userMessage, assistantMessage]);
      
      if (data.matches && data.matches.length > 0) {
        setMatches(data.matches);
      }

      // Play audio response
      try {
        await playAudioFromBase64(data.audio_base64);
        console.log('Audio playback successful');
      } catch (audioError) {
        console.error('Audio playback failed:', audioError);
        // Show helpful message for iOS users
        toast({
          title: "📱 Voice Response Blocked",
          description: "Tap the speaker button again to hear the response, or check Settings > Safari > Auto-Play",
          duration: 5000,
        });
      }

    } catch (error) {
      console.error('Error processing voice:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process voice",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddToCart = (match: AutomationMatch) => {
    const automationItem: any = {
      id: match.id,
      name: match.name,
      price: match.price,
      hoursSaved: 10, // Default value
      thumbnail: "",
      quantity: 1,
    };

    addItem(automationItem);
    toast({
      title: "Added to Cart",
      description: `${match.name} has been added to your cart`,
    });
  };

  const benefits = [{
    icon: <Clock className="w-8 h-8 text-primary" />,
    title: "Save 20-80 Hours Per Month",
    description: "Automate repetitive tasks and reclaim your time for strategic work"
  }, {
    icon: <Zap className="w-8 h-8 text-primary" />,
    title: "AI Built & Managed For You",
    description: "We handle everything from setup to optimization - you never touch the code"
  }, {
    icon: <Clock className="w-8 h-8 text-primary" />,
    title: "24-72 Hour Deployment",
    description: "Get your automations up and running in days, not weeks or months"
  }, {
    icon: <TrendingUp className="w-8 h-8 text-primary" />,
    title: "10-20x ROI Guaranteed",
    description: "Most clients see massive returns from month one onwards"
  }];
  const steps = [{
    number: "01",
    title: "Pick Your Automations",
    description: "Choose from email, marketing, operations, and content workflows"
  }, {
    number: "02",
    title: "We Deploy Them",
    description: "Connect integrations and configure AI logic tailored to your business"
  }, {
    number: "03",
    title: "We Optimize Monthly",
    description: "We continuously fix, refine, and upgrade your automations"
  }];
  const popularAutomations = [{
    id: "email-marketing-automation",
    icon: <Mail className="w-6 h-6" />,
    title: "Email Marketing Automation",
    description: "Automated email sequences with lead management and personalized outreach",
    hoursSaved: "85h/mo",
    tag: "Highest ROI"
  }, {
    id: "discord-community-bot",
    icon: <MessageSquare className="w-6 h-6" />,
    title: "Discord Community Bot",
    description: "AI-powered bot for community engagement, moderation, and automated responses",
    hoursSaved: "45h/mo",
    tag: "Featured"
  }, {
    id: "blog-rss-auto-publisher",
    icon: <BarChart3 className="w-6 h-6" />,
    title: "Blog & RSS Auto-Publisher",
    description: "Auto-publish blog posts and distribute content via RSS feeds and newsletters",
    hoursSaved: "50h/mo",
    tag: "High ROI"
  }, {
    id: "telegram-ai-assistant",
    icon: <FolderKanban className="w-6 h-6" />,
    title: "AI Telegram Assistant",
    description: "Complete AI assistant managing email, calendar, and tasks via Telegram",
    hoursSaved: "50h/mo",
    tag: "Productivity"
  }, {
    id: "lead-capture-crm-sync",
    icon: <ShoppingBag className="w-6 h-6" />,
    title: "Lead Capture & CRM Sync",
    description: "Auto-capture leads from forms and sync to your CRM with enriched data",
    hoursSaved: "40h/mo",
    tag: "Sales"
  }, {
    id: "invoice-payment-reminder",
    icon: <DollarSign className="w-6 h-6" />,
    title: "Invoice & Payment Reminders",
    description: "Automated invoicing and payment follow-ups to improve cash flow",
    hoursSaved: "30h/mo",
    tag: "Finance"
  }, {
    id: "customer-onboarding-sequence",
    icon: <CheckCircle2 className="w-6 h-6" />,
    title: "Customer Onboarding Sequence",
    description: "Automated welcome emails and onboarding tasks for new customers",
    hoursSaved: "35h/mo",
    tag: "Operations"
  }, {
    id: "appointment-booking-notifications",
    icon: <Clock className="w-6 h-6" />,
    title: "Appointment Booking & Reminders",
    description: "Auto-schedule appointments and send SMS/email reminders",
    hoursSaved: "25h/mo",
    tag: "Scheduling"
  }, {
    id: "slack-team-notifications",
    icon: <Zap className="w-6 h-6" />,
    title: "Slack Team Notifications",
    description: "Auto-notify your team of important events, orders, and updates",
    hoursSaved: "20h/mo",
    tag: "Team"
  }, {
    id: "google-sheets-data-sync",
    icon: <TrendingUp className="w-6 h-6" />,
    title: "Google Sheets Data Sync",
    description: "Auto-sync data between apps and Google Sheets for reporting",
    hoursSaved: "30h/mo",
    tag: "Analytics"
  }, {
    id: "n8n-youtube-trend-analyzer-ai",
    icon: <TrendingUp className="w-6 h-6" />,
    title: "YouTube Trend Analyzer",
    description: "AI discovers trending videos and content patterns in your niche",
    hoursSaved: "35h/mo",
    tag: "Social Media"
  }, {
    id: "n8n-ai-powered-blog-content-creator",
    icon: <FileText className="w-6 h-6" />,
    title: "AI Blog Content Creator",
    description: "Auto-generate SEO-optimized blog posts with real-time research",
    hoursSaved: "40h/mo",
    tag: "Content"
  }, {
    id: "n8n-rss-to-mastodon-auto-poster",
    icon: <Share2 className="w-6 h-6" />,
    title: "RSS to Social Auto-Poster",
    description: "Auto-post new content from RSS feeds to social platforms",
    hoursSaved: "25h/mo",
    tag: "Social Media"
  }, {
    id: "n8n-ai-event-banner-generator-with-n8n",
    icon: <ImageIcon className="w-6 h-6" />,
    title: "AI Event Banner Generator",
    description: "Generate and post event banners with AI-powered designs",
    hoursSaved: "30h/mo",
    tag: "Content"
  }, {
    id: "n8n-automated-blog-post-creator-for-wordpress",
    icon: <Pencil className="w-6 h-6" />,
    title: "WordPress Auto-Publisher",
    description: "Auto-create and publish blog posts from spreadsheet content",
    hoursSaved: "35h/mo",
    tag: "Content"
  }];
  const stats = [{
    value: "80h",
    label: "Avg Hours Saved/Month"
  }, {
    value: "$6,000",
    label: "Avg Cost Savings/Month"
  }, {
    value: "<72h",
    label: "Time to Deploy"
  }];
  return <div className="min-h-screen relative">
      <AffiliateMarquee />
      <FuturisticBackground />
      <WelcomeDialog />
      <Header />
      
      {/* Social Proof Popup */}
      <SocialProofBanner />

      {/* Hero Section */}
      <section className="relative pt-24 sm:pt-32 pb-16 sm:pb-24 px-4 tech-grid overflow-hidden">
        <div className="absolute top-10 left-10 w-40 h-40 border-2 border-primary/20 rounded-lg rotate-12 animate-float pointer-events-none hidden sm:block" />
        <div className="absolute bottom-10 right-10 w-32 h-32 border-2 border-accent/20 rounded-full animate-pulse-glow pointer-events-none hidden sm:block" />
        
        <div className="container mx-auto max-w-7xl relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            {/* Urgency badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-destructive/30 bg-destructive/5 text-sm font-medium text-destructive mb-4 animate-fade-in">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
              </span>
              Only 7 spots left this month
            </div>
            
            <div className="inline-block px-4 py-1 rounded-full border border-accent/20 bg-accent/5 text-sm font-medium text-accent mb-6 animate-fade-in">
              ⚡ AI Automations Deployed in 24-72 Hours
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 animate-fade-in">
              Automate Your Biz
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground mb-4 animate-fade-in">
              Join <span className="text-foreground font-semibold">500+ founders</span> who save time with AI automation
            </p>
            
            {/* Social proof stars */}
            <div className="flex items-center justify-center gap-2 mb-8 animate-fade-in">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">4.9/5 from 200+ reviews</span>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in">
              <Button size="lg" className="gradient-primary shadow-glow text-lg px-8 h-14 group" asChild>
                <Link to="/catalog">
                  Start Saving Time Now
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 h-14 border-2 border-primary hover:bg-primary/10" asChild>
                <Link to="/build-my-stack">Take the 2-Min Quiz</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Grid */}
      <section className="py-16 sm:py-24 px-4 bg-muted/30">
        <div className="container mx-auto max-w-7xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {benefits.map((benefit, index) => <Card key={index} className="p-6 glass hover:shadow-neon transition-all duration-300 hover:-translate-y-1">
                <div className="mb-4">{benefit.icon}</div>
                <h3 className="text-lg font-semibold mb-2">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground">{benefit.description}</p>
              </Card>)}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 sm:py-24 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">How It Works</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Three simple steps to transform your workflow
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 relative">
            {/* Connection Lines */}
            <div className="hidden md:block absolute top-24 left-1/3 right-1/3 h-0.5 bg-gradient-to-r from-primary via-accent to-primary" />
            
            {steps.map((step, index) => <div key={index} className="relative">
                <Card className="p-8 glass hover:shadow-neon transition-all duration-300 h-full">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-2xl font-bold text-primary-foreground mb-6 shadow-glow relative z-10">
                      {step.number}
                    </div>
                    <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                    <p className="text-muted-foreground">{step.description}</p>
                    <div className="mt-6 pt-6 border-t border-border/50 w-full">
                      <p className="text-sm text-primary font-medium">
                        {index === 0 && "Choose from 1000+ pre-built workflows"}
                        {index === 1 && "Live in 24-72 hours, fully configured"}
                        {index === 2 && "Monthly check-ins & improvements"}
                      </p>
                    </div>
                  </div>
                </Card>
              </div>)}
          </div>
        </div>
      </section>

      {/* Popular Automations */}
      <section className="py-16 sm:py-24 px-4 bg-muted/30">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">Popular Automations</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              The most requested AI workflows that save time and money
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            {popularAutomations.map((automation, index) => <Link key={index} to={`/automation/${automation.id}`} className="h-full">
                <Card className="p-6 glass hover:shadow-neon transition-all duration-300 hover:-translate-y-1 group cursor-pointer h-full flex flex-col">
                  <div className="mb-4 p-3 bg-primary/10 rounded-lg w-fit">
                    {automation.icon}
                  </div>
                  
                  <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                    {automation.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4 flex-grow">{automation.description}</p>
                  <div className="flex items-center justify-end pt-4 border-t border-border mt-auto">
                    <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
                      View Details →
                    </span>
                  </div>
                </Card>
              </Link>)}
          </div>
          <div className="text-center mt-12">
            <Button size="lg" className="gradient-primary shadow-glow" asChild>
              <Link to="/catalog">View All Automations</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ROI Section */}
      <section className="py-16 sm:py-24 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              AI That Saves Hundreds of Hours a Year
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Calculate your exact savings and ROI with our interactive calculator
            </p>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
            {stats.map((stat, index) => <Card key={index} className="p-6 text-center glass">
                <div className="text-4xl font-bold text-primary mb-2">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </Card>)}
          </div>

          <ROICalculator />
        </div>
      </section>

      {/* Custom Automation Section */}
      <section className="py-16 sm:py-24 px-4">
        <div className="container mx-auto max-w-4xl">
          <CustomAutomationSection />
        </div>
      </section>

      {/* Voice Assistant Section */}
      <section className="py-16 sm:py-24 px-4 bg-gradient-to-br from-primary/5 via-background to-accent/5 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse-glow" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl animate-pulse-glow" />
        
        <div className="container mx-auto max-w-7xl relative z-10">
          <div className="text-center mb-12">
            <div className="inline-block px-4 py-1 rounded-full border border-primary/20 bg-primary/5 text-sm font-medium text-primary mb-4 animate-fade-in">
              AI-Powered Voice Assistant
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              Ask Me Anything About Automations
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Speak naturally and I'll help you find the perfect automation solutions for your business from our catalog of 1,000+ workflows
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Voice Interface */}
            <Card className="p-8 glass">
              <VoiceAssistant
                onStart={handleStart}
                onStop={handleStop}
                isListening={isListening}
              />
              
              {isProcessing && (
                <div className="text-center mt-4">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <p className="text-sm text-muted-foreground mt-2">Processing your request...</p>
                </div>
              )}
            </Card>

            {/* Results Panel */}
            <div className="space-y-6">
              {/* Recommended Automations */}
              {matches.length > 0 && (
                <Card className="p-6 glass">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Volume2 className="w-5 h-5 text-primary" />
                    Recommended For You
                  </h3>
                  <div className="space-y-3">
                     {matches.map((match) => (
                      <div 
                        key={match.id}
                        className="p-4 rounded-lg bg-background/50 border border-border/50 hover:border-primary/50 transition-colors"
                      >
                         <div className="mb-3">
                           <h4 className="font-medium text-foreground">{match.name}</h4>
                           <p className="text-sm text-muted-foreground mt-1">{match.category}</p>
                           <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{match.description}</p>
                         </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="flex-1 group"
                            onClick={() => navigate(`/automation/${match.id}`)}
                          >
                            View Details
                            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                          </Button>
                          <Button 
                            size="sm" 
                            className="flex-1 group gradient-primary"
                            onClick={() => handleAddToCart(match)}
                          >
                            <ShoppingCart className="w-4 h-4 mr-2" />
                            Add to Cart
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                    {/* Quick Action Buttons */}
                    <div className="flex gap-2 pt-4 border-t border-border/50">
                      <Button 
                        size="sm" 
                        variant="secondary"
                        className="flex-1"
                        onClick={() => navigate('/cart')}
                      >
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Go to Cart
                      </Button>
                      <Button 
                        size="sm" 
                        variant="secondary"
                        className="flex-1"
                        onClick={() => navigate('/automations-catalog')}
                      >
                        View All Automations
                      </Button>
                    </div>
                  </div>
                </Card>
              )}

              {/* Conversation History */}
              <Card className="p-6 glass">
                <h3 className="text-lg font-semibold mb-4">Conversation</h3>
                <div className="space-y-4 max-h-[400px] overflow-y-auto">
                  {conversation.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Start speaking to begin the conversation
                    </p>
                  ) : (
                    conversation.map((message, index) => (
                      <div
                        key={index}
                        className={`
                          p-4 rounded-lg
                          ${message.role === 'user' 
                            ? 'bg-primary/10 ml-8' 
                            : 'bg-secondary/30 mr-8'
                          }
                        `}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-1">
                            <p className="text-xs text-muted-foreground mb-1">
                              {message.role === 'user' ? 'You' : 'Assistant'} • {message.timestamp.toLocaleTimeString()}
                            </p>
                            <p className="text-sm text-foreground whitespace-pre-wrap">
                              {message.content}
                            </p>
                            
                            {/* Show automation action buttons if this message contains automation recommendations */}
                            {message.role === 'assistant' && message.automations && message.automations.length > 0 && (
                              <div className="mt-4 space-y-2 pt-3 border-t border-border/30">
                                {message.automations.map((automation) => (
                                  <div key={automation.id} className="p-3 rounded-lg bg-background/50 border border-border/50">
                                    <div className="font-medium text-sm mb-2">{automation.name}</div>
                                    <div className="flex gap-2">
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        className="flex-1 text-xs"
                                        onClick={() => navigate(`/automation/${automation.id}`)}
                                      >
                                        View Details
                                      </Button>
                                      <Button 
                                        size="sm" 
                                        className="flex-1 text-xs gradient-primary"
                                        onClick={() => handleAddToCart(automation)}
                                      >
                                        <ShoppingCart className="w-3 h-3 mr-1" />
                                        Add to Cart
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 sm:py-24 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              Trusted by 500+ Founders
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              See what our clients say about their automation results
            </p>
          </div>
          <TestimonialStrip />
        </div>
      </section>

      {/* Final CTA Block */}
      <section className="py-16 sm:py-20 px-4 bg-gradient-to-br from-primary/10 via-background to-accent/10">
        <div className="container mx-auto max-w-4xl text-center">
          {/* Urgency */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-destructive/30 bg-destructive/5 text-sm font-medium text-destructive mb-6">
            <Clock className="w-4 h-4" />
            Limited spots available this month
          </div>
          
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6">
            Ready to Automate<br />
            <span className="text-primary">Your Business?</span>
          </h2>
          <p className="text-lg text-muted-foreground mb-4 max-w-2xl mx-auto">
            Join 500+ founders who've reclaimed their time with AI automation
          </p>
          
          {/* Stats row */}
          <div className="flex flex-wrap justify-center gap-6 mb-8">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              <span className="text-sm">Setup in 24-72 hours</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              <span className="text-sm">Fully managed for you</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              <span className="text-sm">Cancel anytime</span>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-lg px-10 h-16 gradient-primary text-white shadow-glow group" asChild>
              <Link to="/catalog">
                Start Automating Today
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground mt-4">
            No credit card required to browse • Free consultation available
          </p>
        </div>
      </section>

      <Footer />
    </div>;
};
export default Index;