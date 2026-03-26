// @ts-nocheck
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Webhook, Database, Users, CreditCard, UserCheck, DollarSign, RefreshCw, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface WebhookTrigger {
  name: string;
  table: string;
  event: string;
  webhookUrl: string;
  description: string;
  eventType: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface WebhookLog {
  id: string;
  trigger_name: string;
  table_name: string;
  event_type: string;
  webhook_url: string;
  payload: unknown;
  created_at: string;
}

const webhookTriggers: WebhookTrigger[] = [
  {
    name: "New User Signup",
    table: "profiles",
    event: "INSERT",
    webhookUrl: "https://faithtemporosa.app.n8n.cloud/webhook/96c9882c-1eb5-4f90-8a71-45e38dd3557f",
    description: "Triggers when a new user signs up",
    eventType: "new_signup",
    icon: Users,
  },
  {
    name: "New Affiliate Application",
    table: "affiliates",
    event: "INSERT",
    webhookUrl: "https://faithtemporosa.app.n8n.cloud/webhook/80103042-4334-4533-8429-f41ecf320d0b",
    description: "Triggers when a new affiliate applies",
    eventType: "new_affiliate",
    icon: UserCheck,
  },
  {
    name: "Affiliate Status Change",
    table: "affiliates",
    event: "UPDATE",
    webhookUrl: "https://faithtemporosa.app.n8n.cloud/webhook/80103042-4334-4533-8429-f41ecf320d0b",
    description: "Triggers when affiliate status changes (approved/rejected)",
    eventType: "status_change",
    icon: UserCheck,
  },
  {
    name: "New Payout Request",
    table: "affiliate_payouts",
    event: "INSERT",
    webhookUrl: "https://faithtemporosa.app.n8n.cloud/webhook/80103042-4334-4533-8429-f41ecf320d0b",
    description: "Triggers when an affiliate requests a payout",
    eventType: "payout_request",
    icon: DollarSign,
  },
  {
    name: "Payout Status Change",
    table: "affiliate_payouts",
    event: "UPDATE",
    webhookUrl: "https://faithtemporosa.app.n8n.cloud/webhook/80103042-4334-4533-8429-f41ecf320d0b",
    description: "Triggers when payout status changes (processed)",
    eventType: "payout_status_change",
    icon: DollarSign,
  },
  {
    name: "New Commission",
    table: "affiliate_commissions",
    event: "INSERT",
    webhookUrl: "https://faithtemporosa.app.n8n.cloud/webhook/80103042-4334-4533-8429-f41ecf320d0b",
    description: "Triggers when an affiliate earns a commission",
    eventType: "new_commission",
    icon: CreditCard,
  },
  {
    name: "Commission Status Change",
    table: "affiliate_commissions",
    event: "UPDATE",
    webhookUrl: "https://faithtemporosa.app.n8n.cloud/webhook/80103042-4334-4533-8429-f41ecf320d0b",
    description: "Triggers when commission status changes (paid)",
    eventType: "commission_status_change",
    icon: CreditCard,
  },
  {
    name: "New Cart Item",
    table: "cart_items",
    event: "INSERT",
    webhookUrl: "https://faithtemporosa.app.n8n.cloud/webhook/1687a929-8c27-49ad-ab8c-78ff16125758",
    description: "Triggers when a customer adds item to cart",
    eventType: "cart_item",
    icon: Database,
  },
  {
    name: "New Subscription",
    table: "subscriptions",
    event: "INSERT",
    webhookUrl: "https://faithtemporosa.app.n8n.cloud/webhook/1bafe0e1-67a3-49ba-8795-b42552f7db3b",
    description: "Triggers when a new subscription is created",
    eventType: "subscription",
    icon: CreditCard,
  },
  {
    name: "Contact Form Submission",
    table: "contact_submissions",
    event: "INSERT",
    webhookUrl: "https://faithtemporosa.app.n8n.cloud/webhook/1687a929-8c27-49ad-ab8c-78ff16125758",
    description: "Triggers when a contact form is submitted",
    eventType: "contact",
    icon: Database,
  },
  {
    name: "Order Status Change",
    table: "contact_submissions",
    event: "UPDATE",
    webhookUrl: "https://faithtemporosa.app.n8n.cloud/webhook/1687a929-8c27-49ad-ab8c-78ff16125758",
    description: "Triggers when order status or completion date changes",
    eventType: "status_update",
    icon: Database,
  },
];

export function WebhookTriggers() {
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  const groupedByWebhook = webhookTriggers.reduce((acc, trigger) => {
    const shortUrl = trigger.webhookUrl.split('/').pop() || '';
    if (!acc[shortUrl]) {
      acc[shortUrl] = {
        url: trigger.webhookUrl,
        triggers: [],
      };
    }
    acc[shortUrl].triggers.push(trigger);
    return acc;
  }, {} as Record<string, { url: string; triggers: WebhookTrigger[] }>);

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("webhook_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error("Error fetching webhook logs:", error);
      toast({
        title: "Error",
        description: "Failed to load webhook logs.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchLogs();
  };

  const handleClearLogs = async () => {
    if (!confirm("Are you sure you want to clear all webhook logs?")) return;

    try {
      const { error } = await supabase
        .from("webhook_logs")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all

      if (error) throw error;
      
      setLogs([]);
      toast({
        title: "Success",
        description: "Webhook logs cleared.",
      });
    } catch (error) {
      console.error("Error clearing logs:", error);
      toast({
        title: "Error",
        description: "Failed to clear logs.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchLogs();

    // Real-time subscription for new logs
    const channel = supabase
      .channel('webhook-logs-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'webhook_logs' },
        (payload) => {
          setLogs(prev => [payload.new as WebhookLog, ...prev].slice(0, 100));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <Tabs defaultValue="triggers" className="space-y-6">
      <TabsList className="bg-muted">
        <TabsTrigger value="triggers">Configured Triggers</TabsTrigger>
        <TabsTrigger value="logs">
          Webhook Logs
          {logs.length > 0 && (
            <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary">
              {logs.length}
            </Badge>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="triggers" className="space-y-6">
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Webhook className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-foreground">Webhook Triggers</CardTitle>
                <CardDescription>
                  Database triggers that send notifications to n8n webhooks
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card className="bg-muted/50 border-border">
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-foreground">{webhookTriggers.length}</div>
                  <p className="text-sm text-muted-foreground">Total Triggers</p>
                </CardContent>
              </Card>
              <Card className="bg-muted/50 border-border">
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-foreground">{Object.keys(groupedByWebhook).length}</div>
                  <p className="text-sm text-muted-foreground">Webhook Endpoints</p>
                </CardContent>
              </Card>
              <Card className="bg-muted/50 border-border">
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-green-500">Active</div>
                  <p className="text-sm text-muted-foreground">All triggers running</p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">All Configured Triggers</CardTitle>
            <CardDescription>
              Complete list of database triggers sending data to webhooks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="text-muted-foreground">Trigger Name</TableHead>
                    <TableHead className="text-muted-foreground">Table</TableHead>
                    <TableHead className="text-muted-foreground">Event</TableHead>
                    <TableHead className="text-muted-foreground">Event Type</TableHead>
                    <TableHead className="text-muted-foreground">Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {webhookTriggers.map((trigger, index) => (
                    <TableRow key={index} className="border-border">
                      <TableCell className="font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          <trigger.icon className="h-4 w-4 text-muted-foreground" />
                          {trigger.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {trigger.table}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={trigger.event === "INSERT" ? "default" : "secondary"}
                          className={trigger.event === "INSERT" ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-blue-500/10 text-blue-500 border-blue-500/20"}
                        >
                          {trigger.event}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded text-foreground">
                          {trigger.eventType}
                        </code>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-xs truncate">
                        {trigger.description}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Grouped by Webhook Endpoint */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Triggers by Webhook Endpoint</CardTitle>
            <CardDescription>
              Grouped view showing which triggers send to each webhook
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(groupedByWebhook).map(([shortUrl, data]) => (
              <div key={shortUrl} className="border border-border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Webhook className="h-4 w-4 text-primary" />
                  <code className="text-xs bg-muted px-2 py-1 rounded text-foreground break-all">
                    .../{shortUrl}
                  </code>
                  <Badge variant="secondary" className="ml-auto">
                    {data.triggers.length} triggers
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {data.triggers.map((trigger, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      <trigger.icon className="h-3 w-3 mr-1" />
                      {trigger.name}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="logs" className="space-y-6">
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Database className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-foreground">Webhook Logs</CardTitle>
                  <CardDescription>
                    Real-time log of all webhook trigger executions
                  </CardDescription>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={refreshing}
                >
                  {refreshing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  <span className="ml-2">Refresh</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearLogs}
                  disabled={logs.length === 0}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="ml-2">Clear</span>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No webhook logs yet.</p>
                <p className="text-sm">Logs will appear here when triggers fire.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-muted-foreground">Timestamp</TableHead>
                      <TableHead className="text-muted-foreground">Trigger</TableHead>
                      <TableHead className="text-muted-foreground">Table</TableHead>
                      <TableHead className="text-muted-foreground">Event</TableHead>
                      <TableHead className="text-muted-foreground">Payload Preview</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id} className="border-border">
                        <TableCell className="text-foreground text-sm whitespace-nowrap">
                          {format(new Date(log.created_at), "MMM d, HH:mm:ss")}
                        </TableCell>
                        <TableCell className="font-medium text-foreground text-sm">
                          {log.trigger_name.replace('on_', '').replace('_webhook', '').replace(/_/g, ' ')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">
                            {log.table_name}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="secondary"
                            className={log.event_type === "INSERT" ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-blue-500/10 text-blue-500 border-blue-500/20"}
                          >
                            {log.event_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <code className="text-xs bg-muted px-2 py-1 rounded text-foreground block truncate">
                            {JSON.stringify(log.payload).substring(0, 80)}...
                          </code>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
