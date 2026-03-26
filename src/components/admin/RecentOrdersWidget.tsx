// @ts-nocheck
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format, startOfWeek } from "date-fns";
import { ShoppingCart, ChevronRight, Calendar, Mail, User, Package } from "lucide-react";

interface RecentOrdersWidgetProps {
  onViewAllOrders?: () => void;
}

interface Order {
  id: string;
  name: string;
  email: string;
  order_id: string | null;
  order_total: number | null;
  status: string;
  created_at: string;
  cart_items: string | null;
  automation_count: number | null;
  brand_name: string | null;
  message: string;
  estimated_completion_date: string | null;
}

export const RecentOrdersWidget = ({ onViewAllOrders }: RecentOrdersWidgetProps) => {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const queryClient = useQueryClient();

  const { data: orders, isLoading } = useQuery({
    queryKey: ["recent-orders"],
    queryFn: async () => {
      // Get the start of the current week (Monday)
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      
      const { data, error } = await supabase
        .from("contact_submissions")
        .select("*")
        .gte("created_at", weekStart.toISOString())
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data as Order[];
    },
  });

  // Subscribe to real-time changes on contact_submissions table
  useEffect(() => {
    const channel = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contact_submissions',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["recent-orders"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "in_progress":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "cancelled":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      default:
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Recent Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 bg-muted/50 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Recent Orders
          </CardTitle>
          {onViewAllOrders && (
            <Button variant="ghost" size="sm" onClick={onViewAllOrders} className="text-primary hover:text-primary/80">
              View all
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {orders && orders.length > 0 ? (
              orders.map((order) => (
                <div
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50 cursor-pointer hover:bg-muted/50 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{order.name}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {order.order_id || "No Order ID"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">
                      ${order.order_total?.toFixed(2) || "0.00"}
                    </span>
                    <Badge className={getStatusColor(order.status)}>
                      {order.status.replace("_", " ")}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-4">
                No orders yet
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold">
                  {selectedOrder.order_id || "No Order ID"}
                </span>
                <Badge className={getStatusColor(selectedOrder.status)}>
                  {selectedOrder.status.replace("_", " ")}
                </Badge>
              </div>

              <div className="grid gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Customer:</span>
                  <span className="font-medium">{selectedOrder.name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Email:</span>
                  <span className="font-medium">{selectedOrder.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Created:</span>
                  <span className="font-medium">
                    {format(new Date(selectedOrder.created_at), "PPp")}
                  </span>
                </div>
                {selectedOrder.brand_name && (
                  <div className="flex items-center gap-2 text-sm">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Brand:</span>
                    <span className="font-medium">{selectedOrder.brand_name}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-border pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Automations</span>
                  <span className="font-medium">{selectedOrder.automation_count || 0}</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-muted-foreground">Total</span>
                  <span className="text-lg font-semibold">
                    ${selectedOrder.order_total?.toFixed(2) || "0.00"}
                  </span>
                </div>
              </div>

              {selectedOrder.cart_items && selectedOrder.cart_items !== "No cart items" && (
                <div className="border-t border-border pt-4">
                  <p className="text-sm text-muted-foreground mb-2">Cart Items</p>
                  <p className="text-sm bg-muted/30 p-3 rounded-lg">
                    {selectedOrder.cart_items}
                  </p>
                </div>
              )}

              {selectedOrder.message && (
                <div className="border-t border-border pt-4">
                  <p className="text-sm text-muted-foreground mb-2">Message</p>
                  <p className="text-sm bg-muted/30 p-3 rounded-lg">
                    {selectedOrder.message}
                  </p>
                </div>
              )}

              {selectedOrder.estimated_completion_date && (
                <div className="border-t border-border pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Est. Completion</span>
                    <span className="font-medium">
                      {format(new Date(selectedOrder.estimated_completion_date), "PPP")}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
