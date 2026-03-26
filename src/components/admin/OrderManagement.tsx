// @ts-nocheck
import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../integrations/supabase/client";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { toast } from "sonner";
import { format, isWithinInterval, startOfDay, endOfDay, parseISO, subDays, subMonths, isAfter } from "date-fns";
import { Pencil, Calendar, CreditCard, Package, Bell, Search, X, Download, CalendarRange, DollarSign, TrendingUp, TrendingDown, ShoppingCart, BarChart3 } from "lucide-react";

interface Order {
  id: string;
  order_id: string;
  name: string;
  email: string;
  brand_name: string | null;
  status: string;
  order_total: number;
  automation_count: number;
  created_at: string;
  estimated_completion_date: string | null;
  cart_items: string;
  message: string;
}

interface Subscription {
  id: string;
  user_id: string;
  customer_email: string | null;
  customer_name: string | null;
  bundle_name: string | null;
  status: string;
  total_amount: number | null;
  automations_purchased: string[] | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
  created_at: string | null;
}

const OrderManagement = () => {
  const queryClient = useQueryClient();
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [completionDate, setCompletionDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const initialLoadRef = useRef(true);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_submissions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Order[];
    },
  });

  // Fetch subscriptions to match with orders
  const { data: subscriptions } = useQuery({
    queryKey: ["admin-subscriptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Subscription[];
    },
  });

  // Real-time subscription for orders with toast notifications
  useEffect(() => {
    const channel = supabase
      .channel('admin-orders-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contact_submissions',
        },
        (payload) => {
          console.log('🔄 Orders updated:', payload.eventType);
          
          // Show toast for new orders (skip initial load)
          if (payload.eventType === 'INSERT' && !initialLoadRef.current) {
            const newOrder = payload.new as Order;
            toast.success(
              `🔔 New Order Received!`,
              {
                description: `${newOrder.name} - $${newOrder.order_total}`,
                duration: 5000,
              }
            );
          }
          
          queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
        }
      )
      .subscribe();

    // Mark initial load as complete after a short delay
    setTimeout(() => {
      initialLoadRef.current = false;
    }, 2000);

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Real-time subscription for subscriptions
  useEffect(() => {
    const channel = supabase
      .channel('admin-subscriptions-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions',
        },
        (payload) => {
          console.log('🔄 Subscriptions updated:', payload.eventType);
          
          if (payload.eventType === 'INSERT' && !initialLoadRef.current) {
            const newSub = payload.new as Subscription;
            toast.success(
              `💳 New Subscription!`,
              {
                description: `${newSub.customer_name || 'Customer'} - ${newSub.bundle_name || 'Subscription'}`,
                duration: 5000,
              }
            );
          }
          
          queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const updateOrderMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      estimated_completion_date,
    }: {
      id: string;
      status: string;
      estimated_completion_date: string | null;
    }) => {
      const { error } = await supabase
        .from("contact_submissions")
        .update({
          status,
          estimated_completion_date,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast.success("Order updated successfully");
      setEditingOrder(null);
      setNewStatus("");
      setCompletionDate("");
    },
    onError: (error) => {
      toast.error("Failed to update order: " + error.message);
    },
  });

  const handleUpdateOrder = () => {
    if (!editingOrder) return;

    updateOrderMutation.mutate({
      id: editingOrder.id,
      status: newStatus || editingOrder.status,
      estimated_completion_date: completionDate || editingOrder.estimated_completion_date,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "in_progress":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "cancelled":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      default:
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
    }
  };

  const getSubscriptionStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "cancelled":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      case "past_due":
        return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  // Get subscription for an order by matching email
  const getSubscriptionForOrder = (orderEmail: string) => {
    return subscriptions?.find(
      (sub) => sub.customer_email?.toLowerCase() === orderEmail.toLowerCase()
    );
  };

  // Filter orders based on search query, status, and date range
  const filteredOrders = orders?.filter((order) => {
    // Status filter
    if (statusFilter !== "all" && order.status !== statusFilter) {
      return false;
    }
    
    // Date range filter
    if (startDate || endDate) {
      const orderDate = new Date(order.created_at);
      if (startDate && orderDate < startOfDay(parseISO(startDate))) {
        return false;
      }
      if (endDate && orderDate > endOfDay(parseISO(endDate))) {
        return false;
      }
    }
    
    // Search filter
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      order.name.toLowerCase().includes(query) ||
      order.email.toLowerCase().includes(query) ||
      order.order_id?.toLowerCase().includes(query) ||
      order.brand_name?.toLowerCase().includes(query)
    );
  });

  // Get counts for each status
  const statusCounts = {
    all: orders?.length || 0,
    pending: orders?.filter(o => o.status === "pending").length || 0,
    in_progress: orders?.filter(o => o.status === "in_progress").length || 0,
    completed: orders?.filter(o => o.status === "completed").length || 0,
    cancelled: orders?.filter(o => o.status === "cancelled").length || 0,
  };

  // Export orders to CSV
  const exportToCSV = () => {
    if (!filteredOrders || filteredOrders.length === 0) {
      toast.error("No orders to export");
      return;
    }

    const headers = [
      "Order ID",
      "Customer Name",
      "Email",
      "Brand",
      "Status",
      "Total",
      "Automations",
      "Created At",
      "Est. Completion",
      "Message"
    ];

    const csvData = filteredOrders.map(order => [
      order.order_id || "",
      order.name,
      order.email,
      order.brand_name || "",
      order.status,
      `$${order.order_total}`,
      order.automation_count.toString(),
      format(new Date(order.created_at), "yyyy-MM-dd HH:mm"),
      order.estimated_completion_date ? format(new Date(order.estimated_completion_date), "yyyy-MM-dd") : "",
      `"${(order.message || "").replace(/"/g, '""')}"`
    ]);

    const csvContent = [
      headers.join(","),
      ...csvData.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `orders-export-${format(new Date(), "yyyy-MM-dd")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`Exported ${filteredOrders.length} orders to CSV`);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setStartDate("");
    setEndDate("");
  };

  const hasActiveFilters = searchQuery || statusFilter !== "all" || startDate || endDate;

  // Calculate order statistics
  const orderStats = useMemo(() => {
    if (!orders || orders.length === 0) {
      return {
        totalRevenue: 0,
        averageOrderValue: 0,
        totalOrders: 0,
        thisMonthOrders: 0,
        lastMonthOrders: 0,
        thisMonthRevenue: 0,
        lastMonthRevenue: 0,
        revenueChange: 0,
        orderChange: 0,
        completedOrders: 0,
        pendingOrders: 0,
      };
    }

    const now = new Date();
    const thisMonthStart = subDays(now, 30);
    const lastMonthStart = subDays(now, 60);

    const totalRevenue = orders.reduce((sum, o) => sum + (o.order_total || 0), 0);
    const averageOrderValue = totalRevenue / orders.length;

    const thisMonthOrders = orders.filter(o => isAfter(new Date(o.created_at), thisMonthStart));
    const lastMonthOrders = orders.filter(o => {
      const date = new Date(o.created_at);
      return isAfter(date, lastMonthStart) && !isAfter(date, thisMonthStart);
    });

    const thisMonthRevenue = thisMonthOrders.reduce((sum, o) => sum + (o.order_total || 0), 0);
    const lastMonthRevenue = lastMonthOrders.reduce((sum, o) => sum + (o.order_total || 0), 0);

    const revenueChange = lastMonthRevenue > 0 
      ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
      : thisMonthRevenue > 0 ? 100 : 0;

    const orderChange = lastMonthOrders.length > 0 
      ? ((thisMonthOrders.length - lastMonthOrders.length) / lastMonthOrders.length) * 100 
      : thisMonthOrders.length > 0 ? 100 : 0;

    return {
      totalRevenue,
      averageOrderValue,
      totalOrders: orders.length,
      thisMonthOrders: thisMonthOrders.length,
      lastMonthOrders: lastMonthOrders.length,
      thisMonthRevenue,
      lastMonthRevenue,
      revenueChange,
      orderChange,
      completedOrders: orders.filter(o => o.status === "completed").length,
      pendingOrders: orders.filter(o => o.status === "pending" || o.status === "in_progress").length,
    };
  }, [orders]);

  if (isLoading) {
    return <div className="text-center py-8">Loading orders...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Order Management</h2>
          <p className="text-muted-foreground">
            Manage customer orders and update their status
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={exportToCSV}
            disabled={!filteredOrders || filteredOrders.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Badge variant="outline" className="flex items-center gap-1">
            <Bell className="w-3 h-3" />
            Real-time
          </Badge>
        </div>
      </div>

      {/* Order Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold">${orderStats.totalRevenue.toLocaleString()}</p>
              <div className="flex items-center gap-1 mt-1">
                {orderStats.revenueChange >= 0 ? (
                  <TrendingUp className="w-3 h-3 text-emerald-500" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-red-500" />
                )}
                <span className={`text-xs ${orderStats.revenueChange >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {orderStats.revenueChange >= 0 ? '+' : ''}{orderStats.revenueChange.toFixed(1)}% vs last 30d
                </span>
              </div>
            </div>
            <div className="p-3 rounded-full bg-emerald-500/10">
              <DollarSign className="w-5 h-5 text-emerald-500" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Avg Order Value</p>
              <p className="text-2xl font-bold">${orderStats.averageOrderValue.toFixed(0)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                From {orderStats.totalOrders} total orders
              </p>
            </div>
            <div className="p-3 rounded-full bg-blue-500/10">
              <BarChart3 className="w-5 h-5 text-blue-500" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Orders (30 days)</p>
              <p className="text-2xl font-bold">{orderStats.thisMonthOrders}</p>
              <div className="flex items-center gap-1 mt-1">
                {orderStats.orderChange >= 0 ? (
                  <TrendingUp className="w-3 h-3 text-emerald-500" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-red-500" />
                )}
                <span className={`text-xs ${orderStats.orderChange >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {orderStats.orderChange >= 0 ? '+' : ''}{orderStats.orderChange.toFixed(1)}% vs prior 30d
                </span>
              </div>
            </div>
            <div className="p-3 rounded-full bg-violet-500/10">
              <ShoppingCart className="w-5 h-5 text-violet-500" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Order Status</p>
              <div className="flex items-center gap-3 mt-1">
                <div>
                  <p className="text-lg font-bold text-yellow-500">{orderStats.pendingOrders}</p>
                  <p className="text-xs text-muted-foreground">Active</p>
                </div>
                <div className="w-px h-8 bg-border" />
                <div>
                  <p className="text-lg font-bold text-emerald-500">{orderStats.completedOrders}</p>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </div>
              </div>
            </div>
            <div className="p-3 rounded-full bg-yellow-500/10">
              <Package className="w-5 h-5 text-yellow-500" />
            </div>
          </div>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by name, email, or order ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[200px] bg-card">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="all">All Orders ({statusCounts.all})</SelectItem>
              <SelectItem value="pending">Pending ({statusCounts.pending})</SelectItem>
              <SelectItem value="in_progress">In Progress ({statusCounts.in_progress})</SelectItem>
              <SelectItem value="completed">Completed ({statusCounts.completed})</SelectItem>
              <SelectItem value="cancelled">Cancelled ({statusCounts.cancelled})</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Date Range Filter */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarRange className="w-4 h-4" />
            <span>Date range:</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-[150px] h-9"
              placeholder="Start date"
            />
            <span className="text-muted-foreground">to</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-[150px] h-9"
              placeholder="End date"
            />
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="w-4 h-4 mr-1" />
                Clear all
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Results count */}
      {hasActiveFilters && (
        <p className="text-sm text-muted-foreground">
          Showing {filteredOrders?.length || 0} of {orders?.length || 0} orders
          {searchQuery && ` matching "${searchQuery}"`}
          {statusFilter !== "all" && ` • Status: ${statusFilter.replace("_", " ")}`}
          {(startDate || endDate) && ` • Date: ${startDate || "any"} to ${endDate || "any"}`}
        </p>
      )}

      <div className="grid gap-4">
        {filteredOrders?.map((order) => {
          const subscription = getSubscriptionForOrder(order.email);
          
          return (
            <Card key={order.id} className="p-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold">{order.order_id}</h3>
                      <Badge variant="outline" className={getStatusColor(order.status)}>
                        {order.status.replace("_", " ").toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(order.created_at), "PPP")}
                    </p>
                  </div>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingOrder(order);
                          setNewStatus(order.status);
                          setCompletionDate(
                            order.estimated_completion_date
                              ? format(new Date(order.estimated_completion_date), "yyyy-MM-dd")
                              : ""
                          );
                        }}
                      >
                        <Pencil className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Update Order {order.order_id}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Status</Label>
                          <Select value={newStatus} onValueChange={setNewStatus}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Estimated Completion Date</Label>
                          <div className="flex gap-2">
                            <Calendar className="w-5 h-5 text-muted-foreground" />
                            <Input
                              type="date"
                              value={completionDate}
                              onChange={(e) => setCompletionDate(e.target.value)}
                            />
                          </div>
                        </div>

                        <Button
                          onClick={handleUpdateOrder}
                          disabled={updateOrderMutation.isPending}
                          className="w-full"
                        >
                          {updateOrderMutation.isPending ? "Updating..." : "Update Order"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="font-medium">Customer</p>
                    <p className="text-muted-foreground">{order.name}</p>
                    <p className="text-muted-foreground">{order.email}</p>
                    {order.brand_name && (
                      <p className="text-muted-foreground">{order.brand_name}</p>
                    )}
                  </div>

                  <div>
                    <p className="font-medium">Order Details</p>
                    <p className="text-muted-foreground">
                      ${order.order_total} • {order.automation_count} automations
                    </p>
                    {order.estimated_completion_date && (
                      <p className="text-muted-foreground">
                        Est. completion: {format(new Date(order.estimated_completion_date), "PPP")}
                      </p>
                    )}
                  </div>

                  {/* Subscription Details */}
                  <div>
                    <p className="font-medium flex items-center gap-1">
                      <CreditCard className="w-4 h-4" />
                      Subscription
                    </p>
                    {subscription ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`text-xs ${getSubscriptionStatusColor(subscription.status)}`}>
                            {subscription.status.toUpperCase()}
                          </Badge>
                        </div>
                        {subscription.bundle_name && (
                          <p className="text-muted-foreground text-xs flex items-center gap-1">
                            <Package className="w-3 h-3" />
                            {subscription.bundle_name}
                          </p>
                        )}
                        {subscription.total_amount && (
                          <p className="text-muted-foreground text-xs">
                            ${subscription.total_amount}
                          </p>
                        )}
                        {subscription.automations_purchased && subscription.automations_purchased.length > 0 && (
                          <p className="text-muted-foreground text-xs">
                            {subscription.automations_purchased.length} automations purchased
                          </p>
                        )}
                        {subscription.current_period_end && (
                          <p className="text-muted-foreground text-xs">
                            Renews: {format(new Date(subscription.current_period_end), "MMM d, yyyy")}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-xs">No subscription found</p>
                    )}
                  </div>
                </div>

                {order.message && (
                  <div className="border-t pt-4">
                    <p className="text-sm font-medium">Customer Message</p>
                    <p className="text-sm text-muted-foreground">{order.message}</p>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default OrderManagement;
