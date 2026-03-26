// @ts-nocheck
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FuturisticBackground } from "@/components/FuturisticBackground";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Send, Home } from "lucide-react";
import logo from "@/assets/ai-stacked-logo.png";
import ReactMarkdown from "react-markdown";
import { CredentialsForm } from "@/components/CredentialsForm";

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface PurchasedAutomation {
  id: string;
  name: string;
  description: string | null;
  category: string;
  features?: string[];
}

const Onboarding = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [purchasedAutomations, setPurchasedAutomations] = useState<PurchasedAutomation[]>([]);
  const [showCredentialsForm, setShowCredentialsForm] = useState(false);
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(true);

  // Check if user has active subscription
  useEffect(() => {
    const checkSubscription = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          toast({
            title: "Please sign in",
            description: "You need to be signed in to access the onboarding page.",
            variant: "destructive",
          });
          navigate('/auth');
          return;
        }
        
        const { data: subscriptions, error } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .limit(1);
        
        if (error || !subscriptions || subscriptions.length === 0) {
          toast({
            title: "No active subscription",
            description: "You need to purchase automations before accessing the onboarding page.",
            variant: "destructive",
          });
          navigate('/catalog');
          return;
        }
        
        setIsCheckingSubscription(false);
      } catch (error) {
        console.error('Error checking subscription:', error);
        navigate('/catalog');
      }
    };
    
    checkSubscription();
  }, [navigate, toast]);

  useEffect(() => {
    if (isCheckingSubscription) return;
    
    // Load automations first, then show greeting
    loadPurchasedAutomations().then(() => {
      setShowCredentialsForm(true);
    });

    // Show instant greeting text
    const instantGreeting: ConversationMessage = {
      role: 'assistant',
      content: `Welcome to AI-Stacked! We're excited to help you set up your automation(s).

To get started, simply use the secure form below to provide your login credentials (username and password) for each platform required by your automation(s). You do NOT need to provide any API keys, tokens, or technical details - our automation engineer will handle all of that.

Once you submit the form, our engineer will review your credentials within 3-4 hours. If any additional credentials or tools are needed, they'll reach out to you via email. After that, your automations will be built and deployed within 24-72 hours.

Feel free to ask if you have any questions!`,
      timestamp: new Date(),
    };

    setConversation([instantGreeting]);
  }, [isCheckingSubscription]);

  const loadPurchasedAutomations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      // Get all active subscriptions for the user
      const { data: subscriptions, error } = await supabase
        .from('subscriptions')
        .select('automations_purchased')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (error) {
        console.error('Error fetching subscriptions:', error);
        return;
      }

      if (!subscriptions || subscriptions.length === 0) return;

      // Collect all purchased automation names from all subscriptions
      const allPurchasedNames: string[] = [];
      subscriptions.forEach(sub => {
        if (sub.automations_purchased) {
          allPurchasedNames.push(...sub.automations_purchased);
        }
      });

      // Remove duplicates
      const uniqueNames = [...new Set(allPurchasedNames)];

      if (uniqueNames.length === 0) return;

      // Fetch full automation details from the automations table
      const { data: automations, error: automationsError } = await supabase
        .from('automations')
        .select('id, name, description, category, features')
        .in('name', uniqueNames);

      if (automationsError) {
        console.error('Error fetching automations:', automationsError);
        return;
      }

      if (automations && automations.length > 0) {
        setPurchasedAutomations(automations);
      }
    } catch (error) {
      console.error('Error loading automations:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim()) return;

    const userMessage: ConversationMessage = {
      role: 'user',
      content: messageInput,
      timestamp: new Date(),
    };

    setConversation(prev => [...prev, userMessage]);
    setMessageInput("");
    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke('voice-agent', {
        body: {
          text_query: messageInput,
          mode: 'onboarding',
          conversation_history: conversation.map(m => ({ role: m.role, content: m.content }))
        },
      });

      if (error) throw error;

      const assistantMessage: ConversationMessage = {
        role: 'assistant',
        content: data.reply,
        timestamp: new Date(),
      };

      setConversation(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };


  if (isCheckingSubscription) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <FuturisticBackground />
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
            <p className="text-muted-foreground">Checking your subscription...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <FuturisticBackground />
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col items-center mb-12 relative">
          <Link to="/" className="absolute left-0 top-0">
            <Button variant="outline" size="icon">
              <Home className="h-4 w-4" />
            </Button>
          </Link>
          <img src={logo} alt="Logo" className="h-16 mb-4" />
          <h1 className="text-4xl font-bold text-foreground mb-2">AI-Stacked</h1>
          <p className="text-muted-foreground text-lg">Set up your automations.</p>
        </div>

        {/* Video Section */}
        <div className="max-w-2xl mx-auto mb-12">
          <video 
            src="/ai_bump.mp4" 
            controls 
            className="w-full rounded-lg shadow-lg"
          />
        </div>

        {/* Chat Section */}
        <div className="max-w-4xl mx-auto mb-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Chat with AI Assistant
            </h2>
            <p className="text-muted-foreground">
              Ask any questions about your automations
            </p>
          </div>

          {/* Conversation Display */}
          {conversation.length > 0 && (
            <Card className="p-6 mb-8 max-h-[600px] overflow-y-auto bg-background/50 backdrop-blur-sm">
              <div className="space-y-6">
                {conversation.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl p-6 shadow-lg ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-card border border-border'
                      }`}
                    >
                      <p className="text-xs font-semibold mb-3 uppercase tracking-wide opacity-70">
                        {msg.role === 'user' ? 'You' : 'AI Assistant'}
                      </p>
                      <div className={`prose prose-sm max-w-none ${
                        msg.role === 'user' ? 'prose-invert' : ''
                      }`}>
                        <ReactMarkdown
                          components={{
                            h1: ({ children }) => <h1 className="text-2xl font-bold mb-4 mt-6">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-xl font-bold mb-3 mt-5">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-lg font-semibold mb-2 mt-4">{children}</h3>,
                            p: ({ children }) => <p className="mb-3 leading-relaxed">{children}</p>,
                            ul: ({ children }) => <ul className="space-y-2 mb-4 ml-4">{children}</ul>,
                            ol: ({ children }) => <ol className="space-y-2 mb-4 ml-4">{children}</ol>,
                            li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                            strong: ({ children }) => <strong className="font-bold text-foreground">{children}</strong>,
                            em: ({ children }) => <em className="italic">{children}</em>,
                            code: ({ children }) => (
                              <code className="px-2 py-1 rounded bg-muted text-sm font-mono">{children}</code>
                            ),
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                      <p className="text-xs opacity-50 mt-3">
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Message Input */}
          <Card className="p-6">
            <div className="flex gap-4">
              <Input
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !isProcessing && handleSendMessage()}
                placeholder="Type your message..."
                className="flex-1"
                disabled={isProcessing}
              />
              <Button onClick={handleSendMessage} disabled={isProcessing}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        </div>

        {/* Credentials Form - shown after first message */}
        {showCredentialsForm && purchasedAutomations.length > 0 && (
          <div className="max-w-4xl mx-auto mb-16">
            <CredentialsForm automations={purchasedAutomations} />
          </div>
        )}

        {/* Purchased Automations Section */}
        <div className="max-w-4xl mx-auto">
          <Card className="p-8">
            <h2 className="text-2xl font-bold text-foreground mb-6">
              Your Purchased Automations
            </h2>
            
            <div className="space-y-4">
              {purchasedAutomations.map((automation) => (
                <Card key={automation.id} className="p-6 hover:bg-accent/5 transition-colors">
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {automation.name}
                  </h3>
                  <p className="text-muted-foreground">
                    {automation.description}
                  </p>
                </Card>
              ))}
              
              {purchasedAutomations.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    No automations purchased yet
                  </p>
                  <Button onClick={() => navigate('/catalog')}>
                    Browse Catalog
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
