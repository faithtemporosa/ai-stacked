// @ts-nocheck
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAdmin } from "../hooks/use-admin";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../integrations/supabase/client";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Label } from "../components/ui/label";
import { useToast } from "../hooks/use-toast";
import { Loader2, Plus, Edit, Trash2, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Download, Shield, Search } from "lucide-react";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Checkbox } from "../components/ui/checkbox";
import { UserStatistics } from "../components/admin/UserStatistics";
import { ActivityLogs } from "../components/admin/ActivityLogs";
import { ActiveUsersWidget } from "../components/admin/ActiveUsersWidget";
import { RevenueOverview } from "../components/admin/RevenueOverview";
import { RecentOrdersWidget } from "../components/admin/RecentOrdersWidget";
import OrderManagement from "../components/admin/OrderManagement";
import CartManagement from "../components/admin/CartManagement";
import { AnalyticsDashboard } from "../components/admin/AnalyticsDashboard";
import { VisitorAnalytics } from "../components/admin/VisitorAnalytics";
import { exportUsersToCSV } from "../utils/exportUsers";
import { errorLogger, getErrorMessage } from "../utils/errorLogger";
import { AdminSidebar } from "../components/admin/AdminSidebar";
import { WebhookTriggers } from "../components/admin/WebhookTriggers";
import { StripeConfiguration } from "../components/admin/StripeConfiguration";

interface Automation {
  id: string;
  name: string;
  category: string;
  price: number;
  features: string[];
  description: string | null;
  last_updated: string;
}

interface UserProfile {
  id: string;
  user_id: string;
  email: string | null;
  created_at: string;
}

interface UserRole {
  user_id: string;
  role: string;
}

interface UserSubscription {
  user_id: string;
  status: string;
  bundle_name: string | null;
  automations_purchased: string[] | null;
  total_amount: number | null;
  created_at: string | null;
  current_period_end: string | null;
}

export default function Admin() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { toast } = useToast();
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<Automation | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  
  // Automations search and filter state
  const [automationSearch, setAutomationSearch] = useState("");
  const [automationCategoryFilter, setAutomationCategoryFilter] = useState("all");
  const [automationPage, setAutomationPage] = useState(1);
  const [automationItemsPerPage, setAutomationItemsPerPage] = useState(20);
  
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userRoles, setUserRoles] = useState<Record<string, string[]>>({});
  const [userSubscriptions, setUserSubscriptions] = useState<Record<string, UserSubscription>>({});
  const [usersLoading, setUsersLoading] = useState(true);
  const [emailSearch, setEmailSearch] = useState("");
  const [sortField, setSortField] = useState<"email" | "created_at" | "role">("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

  const [formData, setFormData] = useState({
    id: "",
    name: "",
    category: "",
    price: "",
    features: "",
    description: "",
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!adminLoading && !isAdmin && user) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page.",
        variant: "destructive",
      });
      navigate("/");
    }
  }, [isAdmin, adminLoading, user, navigate, toast]);

  useEffect(() => {
    if (isAdmin) {
      fetchAutomations();
      fetchUsers();
    }
  }, [isAdmin]);

  // Real-time subscription for users data
  useEffect(() => {
    if (!isAdmin) return;

    const profilesChannel = supabase
      .channel('admin-profiles-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          console.log('🔄 Profiles updated');
          fetchUsers();
        }
      )
      .subscribe();

    const rolesChannel = supabase
      .channel('admin-roles-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_roles' },
        () => {
          console.log('🔄 User roles updated');
          fetchUsers();
        }
      )
      .subscribe();

    const subscriptionsChannel = supabase
      .channel('admin-user-subscriptions-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'subscriptions' },
        () => {
          console.log('🔄 Subscriptions updated');
          fetchUsers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(rolesChannel);
      supabase.removeChannel(subscriptionsChannel);
    };
  }, [isAdmin]);

  const fetchAutomations = async () => {
    try {
      // Fetch all automations using pagination to bypass 1000 row limit
      let allAutomations: Automation[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("automations")
          .select("*")
          .order("last_updated", { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;
        
        if (data && data.length > 0) {
          allAutomations = [...allAutomations, ...data];
          hasMore = data.length === pageSize;
          page++;
        } else {
          hasMore = false;
        }
      }

      setAutomations(allAutomations);
    } catch (error) {
      console.error("Error fetching automations:", error);
      toast({
        title: "Error",
        description: "Failed to load automations.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.id || !formData.name || !formData.category || !formData.price || !formData.features) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const featuresArray = formData.features.split("\n").filter(f => f.trim());
    const automationData = {
      id: formData.id,
      name: formData.name,
      category: formData.category,
      price: parseFloat(formData.price),
      features: featuresArray,
      description: formData.description || null,
    };

    try {
      if (editingAutomation) {
        const { error } = await supabase
          .from("automations")
          .update(automationData)
          .eq("id", editingAutomation.id);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Automation updated! Notifications sent to wishlist users.",
        });
      } else {
        const { error } = await supabase
          .from("automations")
          .insert([automationData]);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Automation created successfully!",
        });
      }

      setDialogOpen(false);
      resetForm();
      fetchAutomations();
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      errorLogger.logError("Error saving automation", error);
      toast({
        title: "Error",
        description: errorMessage || "Failed to save automation.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (automation: Automation) => {
    setEditingAutomation(automation);
    setFormData({
      id: automation.id,
      name: automation.name,
      category: automation.category,
      price: automation.price.toString(),
      features: automation.features.join("\n"),
      description: automation.description || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this automation?")) return;

    try {
      const { error } = await supabase
        .from("automations")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({
        title: "Success",
        description: "Automation deleted successfully!",
      });
      fetchAutomations();
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      errorLogger.logError("Error deleting automation", error, { automationId: id });
      toast({
        title: "Error",
        description: errorMessage || "Failed to delete automation.",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      id: "",
      name: "",
      category: "",
      price: "",
      features: "",
      description: "",
    });
    setEditingAutomation(null);
  };

  const fetchUsers = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      // Fetch subscriptions for all users
      const { data: subscriptions, error: subscriptionsError } = await supabase
        .from("subscriptions")
        .select("user_id, status, bundle_name, automations_purchased, total_amount, created_at, current_period_end");

      if (subscriptionsError) throw subscriptionsError;

      setUsers(profiles || []);

      // Organize roles by user_id
      const rolesMap: Record<string, string[]> = {};
      roles?.forEach((role) => {
        if (!rolesMap[role.user_id]) {
          rolesMap[role.user_id] = [];
        }
        rolesMap[role.user_id].push(role.role);
      });
      setUserRoles(rolesMap);

      // Organize subscriptions by user_id (take the most recent active one)
      const subsMap: Record<string, UserSubscription> = {};
      subscriptions?.forEach((sub) => {
        // Prefer active subscriptions, otherwise take the most recent
        if (!subsMap[sub.user_id] || sub.status === 'active') {
          subsMap[sub.user_id] = sub;
        }
      });
      setUserSubscriptions(subsMap);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Error",
        description: "Failed to load users.",
        variant: "destructive",
      });
    } finally {
      setUsersLoading(false);
    }
  };

  const handlePromoteToAdmin = async (userId: string) => {
    if (userRoles[userId]?.includes("admin")) {
      toast({
        title: "Already Admin",
        description: "This user is already an admin.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("user_roles")
        .insert([{ user_id: userId, role: "admin" }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User promoted to admin successfully!",
      });
      fetchUsers();
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      errorLogger.logError("Error promoting user", error, { userId });
      toast({
        title: "Error",
        description: errorMessage || "Failed to promote user.",
        variant: "destructive",
      });
    }
  };

  const handleRevokeAdmin = async (userId: string) => {
    if (userId === user?.id) {
      toast({
        title: "Cannot Revoke",
        description: "You cannot revoke your own admin privileges.",
        variant: "destructive",
      });
      return;
    }

    if (!confirm("Are you sure you want to revoke admin privileges from this user?")) return;

    try {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", "admin");

      if (error) throw error;

      toast({
        title: "Success",
        description: "Admin privileges revoked successfully!",
      });
      fetchUsers();
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      errorLogger.logError("Error revoking admin", error, { userId });
      toast({
        title: "Error",
        description: errorMessage || "Failed to revoke admin privileges.",
        variant: "destructive",
      });
    }
  };

  const handleSort = (field: "email" | "created_at" | "role") => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortedAndFilteredUsers = () => {
    let filteredUsers = users.filter((profile) => {
      if (!emailSearch) return true;
      return profile.email?.toLowerCase().includes(emailSearch.toLowerCase());
    });

    const sortedUsers = filteredUsers.sort((a, b) => {
      let comparison = 0;

      if (sortField === "email") {
        const emailA = a.email || "";
        const emailB = b.email || "";
        comparison = emailA.localeCompare(emailB);
      } else if (sortField === "created_at") {
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortField === "role") {
        const roleA = userRoles[a.user_id]?.includes("admin") ? "admin" : "user";
        const roleB = userRoles[b.user_id]?.includes("admin") ? "admin" : "user";
        comparison = roleA.localeCompare(roleB);
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    // Pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return {
      users: sortedUsers.slice(startIndex, endIndex),
      totalUsers: sortedUsers.length,
      totalPages: Math.ceil(sortedUsers.length / itemsPerPage)
    };
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const { users: paginatedUsers } = getSortedAndFilteredUsers();
      const newSelected = new Set(selectedUsers);
      paginatedUsers.forEach(user => newSelected.add(user.user_id));
      setSelectedUsers(newSelected);
    } else {
      setSelectedUsers(new Set());
    }
  };

  const handleSelectUser = (userId: string, checked: boolean) => {
    const newSelected = new Set(selectedUsers);
    if (checked) {
      newSelected.add(userId);
    } else {
      newSelected.delete(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleBulkPromoteToAdmin = async () => {
    const usersToPromote = Array.from(selectedUsers).filter(
      userId => !userRoles[userId]?.includes("admin")
    );

    if (usersToPromote.length === 0) {
      toast({
        title: "No Users to Promote",
        description: "Selected users are already admins.",
        variant: "destructive",
      });
      return;
    }

    if (!confirm(`Are you sure you want to promote ${usersToPromote.length} user(s) to admin?`)) return;

    try {
      const insertData = usersToPromote.map(userId => ({
        user_id: userId,
        role: "admin" as const
      }));

      const { error } = await supabase
        .from("user_roles")
        .insert(insertData);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Successfully promoted ${usersToPromote.length} user(s) to admin!`,
      });
      setSelectedUsers(new Set());
      fetchUsers();
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      errorLogger.logError("Error bulk promoting users", error, { count: usersToPromote.length });
      toast({
        title: "Error",
        description: errorMessage || "Failed to promote users.",
        variant: "destructive",
      });
    }
  };

  const handleBulkRevokeAdmin = async () => {
    const usersToRevoke = Array.from(selectedUsers).filter(
      userId => userRoles[userId]?.includes("admin") && userId !== user?.id
    );

    if (usersToRevoke.length === 0) {
      toast({
        title: "No Users to Revoke",
        description: "Selected users are not admins or you cannot revoke your own privileges.",
        variant: "destructive",
      });
      return;
    }

    if (!confirm(`Are you sure you want to revoke admin privileges from ${usersToRevoke.length} user(s)?`)) return;

    try {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .in("user_id", usersToRevoke)
        .eq("role", "admin");

      if (error) throw error;

      toast({
        title: "Success",
        description: `Successfully revoked admin privileges from ${usersToRevoke.length} user(s)!`,
      });
      setSelectedUsers(new Set());
      fetchUsers();
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      errorLogger.logError("Error bulk revoking admin", error, { count: usersToRevoke.length });
      toast({
        title: "Error",
        description: errorMessage || "Failed to revoke admin privileges.",
        variant: "destructive",
      });
    }
  };

  const handleExportUsers = () => {
    const { users: filteredUsers } = getSortedAndFilteredUsers();
    const exportData = filteredUsers.map(profile => {
      const subscription = userSubscriptions[profile.user_id];
      return {
        email: profile.email || "N/A",
        user_id: profile.user_id,
        role: userRoles[profile.user_id]?.includes("admin") ? "Admin" : "User",
        joined_date: new Date(profile.created_at).toLocaleDateString(),
        subscription_status: subscription?.status || "None",
        bundle_name: subscription?.bundle_name || "N/A",
        total_spent: subscription?.total_amount ? `$${subscription.total_amount}` : "$0",
        automations_purchased: subscription?.automations_purchased?.join(", ") || "None"
      };
    });

    exportUsersToCSV(exportData);
    
    toast({
      title: "Export Successful",
      description: `Exported ${exportData.length} user(s) to CSV.`,
    });
  };

  const handleExportSelected = () => {
    if (selectedUsers.size === 0) {
      toast({
        title: "No Users Selected",
        description: "Please select users to export.",
        variant: "destructive",
      });
      return;
    }

    const exportData = users
      .filter(profile => selectedUsers.has(profile.user_id))
      .map(profile => {
        const subscription = userSubscriptions[profile.user_id];
        return {
          email: profile.email || "N/A",
          user_id: profile.user_id,
          role: userRoles[profile.user_id]?.includes("admin") ? "Admin" : "User",
          joined_date: new Date(profile.created_at).toLocaleDateString(),
          subscription_status: subscription?.status || "None",
          bundle_name: subscription?.bundle_name || "N/A",
          total_spent: subscription?.total_amount ? `$${subscription.total_amount}` : "$0",
          automations_purchased: subscription?.automations_purchased?.join(", ") || "None"
        };
      });

    exportUsersToCSV(exportData);
    
    toast({
      title: "Export Successful",
      description: `Exported ${exportData.length} selected user(s) to CSV.`,
    });
  };

  if (authLoading || adminLoading || (user && !isAdmin && adminLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <div className="space-y-6">
            <RevenueOverview />
            <div className="grid gap-6 md:grid-cols-2">
              <RecentOrdersWidget onViewAllOrders={() => setActiveTab("orders")} />
              <ActiveUsersWidget />
            </div>
            <UserStatistics />
          </div>
        );
      case "automations":
        // Get unique categories for filter
        const categories = Array.from(new Set(automations.map(a => a.category))).sort();
        
        // Filter automations
        const filteredAutomations = automations.filter(automation => {
          const matchesSearch = automationSearch === "" || 
            automation.name.toLowerCase().includes(automationSearch.toLowerCase()) ||
            automation.id.toLowerCase().includes(automationSearch.toLowerCase()) ||
            automation.category.toLowerCase().includes(automationSearch.toLowerCase());
          const matchesCategory = automationCategoryFilter === "all" || automation.category === automationCategoryFilter;
          return matchesSearch && matchesCategory;
        });
        
        // Pagination
        const totalAutomationPages = Math.ceil(filteredAutomations.length / automationItemsPerPage);
        const paginatedAutomations = filteredAutomations.slice(
          (automationPage - 1) * automationItemsPerPage,
          automationPage * automationItemsPerPage
        );
        
        return (
          <div className="bg-card border border-border rounded-xl">
            <div className="border-b border-border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-foreground text-lg font-medium">Automations</h3>
                    <Badge variant="secondary" className="bg-primary/10 text-primary">
                      {automations.length} total
                    </Badge>
                    {filteredAutomations.length !== automations.length && (
                      <Badge variant="outline" className="text-muted-foreground">
                        {filteredAutomations.length} filtered
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground text-sm">
                    Manage your automation catalog
                  </p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={(open) => {
                  setDialogOpen(open);
                  if (!open) resetForm();
                }}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Automation
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
                    <DialogHeader>
                      <DialogTitle className="text-foreground">{editingAutomation ? "Edit Automation" : "Add New Automation"}</DialogTitle>
                      <DialogDescription className="text-muted-foreground">
                        {editingAutomation 
                          ? "Update automation details. Wishlist users will be notified of changes."
                          : "Create a new automation for users to discover."}
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <Label htmlFor="id" className="text-foreground">Automation ID *</Label>
                        <Input
                          id="id"
                          value={formData.id}
                          onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                          placeholder="e.g., email-automation-1"
                          disabled={!!editingAutomation}
                          required
                          className="bg-muted border-border text-foreground"
                        />
                      </div>
                      <div>
                        <Label htmlFor="name" className="text-foreground">Name *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="e.g., Email Campaign Automation"
                          required
                          className="bg-muted border-border text-foreground"
                        />
                      </div>
                      <div>
                        <Label htmlFor="category" className="text-foreground">Category *</Label>
                        <Input
                          id="category"
                          value={formData.category}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                          placeholder="e.g., Email Marketing"
                          required
                          className="bg-muted border-border text-foreground"
                        />
                      </div>
                      <div>
                        <Label htmlFor="price" className="text-foreground">Price (USD) *</Label>
                        <Input
                          id="price"
                          type="number"
                          step="0.01"
                          value={formData.price}
                          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                          placeholder="e.g., 299.99"
                          required
                          className="bg-muted border-border text-foreground"
                        />
                      </div>
                      <div>
                        <Label htmlFor="features" className="text-foreground">Features (one per line) *</Label>
                        <Textarea
                          id="features"
                          value={formData.features}
                          onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                          placeholder="Automated email sequences&#10;List segmentation&#10;A/B testing"
                          rows={5}
                          required
                          className="bg-muted border-border text-foreground"
                        />
                      </div>
                      <div>
                        <Label htmlFor="description" className="text-foreground">Description</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Detailed description of the automation..."
                          rows={3}
                          className="bg-muted border-border text-foreground"
                        />
                      </div>
                      <div className="flex gap-2 justify-end pt-4">
                        <Button type="button" variant="ghost" onClick={() => {
                          setDialogOpen(false);
                          resetForm();
                        }} className="text-muted-foreground hover:text-foreground">
                          Cancel
                        </Button>
                        <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">
                          {editingAutomation ? "Update" : "Create"}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            
            {/* Search and Filter Bar */}
            <div className="border-b border-border p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search automations..."
                    value={automationSearch}
                    onChange={(e) => {
                      setAutomationSearch(e.target.value);
                      setAutomationPage(1);
                    }}
                    className="pl-9 bg-muted border-border text-foreground"
                  />
                </div>
                <Select 
                  value={automationCategoryFilter} 
                  onValueChange={(value) => {
                    setAutomationCategoryFilter(value);
                    setAutomationPage(1);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-[200px] bg-muted border-border text-foreground">
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select 
                  value={automationItemsPerPage.toString()} 
                  onValueChange={(value) => {
                    setAutomationItemsPerPage(Number(value));
                    setAutomationPage(1);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-[120px] bg-muted border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 / page</SelectItem>
                    <SelectItem value="20">20 / page</SelectItem>
                    <SelectItem value="50">50 / page</SelectItem>
                    <SelectItem value="100">100 / page</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="p-6">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredAutomations.length === 0 ? (
                <p className="text-center py-12 text-muted-foreground">
                  {automations.length === 0 
                    ? "No automations yet. Create your first one!" 
                    : "No automations match your search."}
                </p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Name</th>
                          <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Category</th>
                          <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Price</th>
                          <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Features</th>
                          <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Updated</th>
                          <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedAutomations.map((automation) => (
                          <tr key={automation.id} className="border-b border-border">
                            <td className="p-4 align-middle font-medium text-foreground">{automation.name}</td>
                            <td className="p-4 align-middle text-foreground">{automation.category}</td>
                            <td className="p-4 align-middle text-foreground">${automation.price}</td>
                            <td className="p-4 align-middle text-foreground">{automation.features.length} features</td>
                            <td className="p-4 align-middle text-muted-foreground">{new Date(automation.last_updated).toLocaleDateString()}</td>
                            <td className="p-4 align-middle text-right">
                              <div className="flex gap-1 justify-end">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(automation)}
                                  className="text-muted-foreground hover:text-foreground hover:bg-muted"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(automation.id)}
                                  className="text-muted-foreground hover:text-destructive hover:bg-muted"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Pagination */}
                  {totalAutomationPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                      <p className="text-sm text-muted-foreground">
                        Showing {((automationPage - 1) * automationItemsPerPage) + 1} to {Math.min(automationPage * automationItemsPerPage, filteredAutomations.length)} of {filteredAutomations.length}
                      </p>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setAutomationPage(1)}
                          disabled={automationPage === 1}
                          className="border-border"
                        >
                          <ChevronsLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setAutomationPage(p => Math.max(1, p - 1))}
                          disabled={automationPage === 1}
                          className="border-border"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="px-3 text-sm text-muted-foreground">
                          Page {automationPage} of {totalAutomationPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setAutomationPage(p => Math.min(totalAutomationPages, p + 1))}
                          disabled={automationPage === totalAutomationPages}
                          className="border-border"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setAutomationPage(totalAutomationPages)}
                          disabled={automationPage === totalAutomationPages}
                          className="border-border"
                        >
                          <ChevronsRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        );
      case "orders":
        return (
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <OrderManagement />
            </CardContent>
          </Card>
        );
      case "carts":
        return (
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <CartManagement />
            </CardContent>
          </Card>
        );
      case "users":
        return (
          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-foreground text-lg font-medium">Users & Subscriptions</CardTitle>
              <CardDescription className="text-muted-foreground">
                View users and manage admin privileges
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex gap-4 mb-6">
                <div className="flex-1">
                  <Input
                    type="text"
                    placeholder="Search by email..."
                    value={emailSearch}
                    onChange={(e) => setEmailSearch(e.target.value)}
                    className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={handleExportUsers}
                  className="border-border text-foreground hover:bg-muted"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
              
              {selectedUsers.size > 0 && (
                <div className="mb-4 flex items-center gap-2 p-4 bg-muted rounded-lg border border-border">
                  <span className="text-sm font-medium text-foreground">
                    {selectedUsers.size} user(s) selected
                  </span>
                  <div className="flex gap-2 ml-auto">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleExportSelected}
                      className="text-foreground hover:bg-background"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Export
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleBulkPromoteToAdmin}
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      Promote
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleBulkRevokeAdmin}
                      className="text-foreground hover:bg-background"
                    >
                      Revoke
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedUsers(new Set())}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              )}
              {usersLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : users.length === 0 ? (
                <p className="text-center py-12 text-muted-foreground">No users found.</p>
              ) : (() => {
                const { users: paginatedUsers, totalUsers, totalPages } = getSortedAndFilteredUsers();
                return (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border hover:bg-transparent">
                          <TableHead className="w-12">
                            <Checkbox
                              checked={paginatedUsers.length > 0 && paginatedUsers.every(user => selectedUsers.has(user.user_id))}
                              onCheckedChange={handleSelectAll}
                            />
                          </TableHead>
                          <TableHead className="text-muted-foreground">
                            <button
                              onClick={() => handleSort("email")}
                              className="flex items-center gap-1 hover:text-foreground transition-colors"
                            >
                              Email
                              {sortField === "email" ? (
                                sortDirection === "asc" ? (
                                  <ArrowUp className="h-4 w-4" />
                                ) : (
                                  <ArrowDown className="h-4 w-4" />
                                )
                              ) : (
                                <ArrowUpDown className="h-4 w-4 opacity-50" />
                              )}
                            </button>
                          </TableHead>
                          <TableHead className="text-muted-foreground">
                            <button
                              onClick={() => handleSort("created_at")}
                              className="flex items-center gap-1 hover:text-foreground transition-colors"
                            >
                              Joined
                              {sortField === "created_at" ? (
                                sortDirection === "asc" ? (
                                  <ArrowUp className="h-4 w-4" />
                                ) : (
                                  <ArrowDown className="h-4 w-4" />
                                )
                              ) : (
                                <ArrowUpDown className="h-4 w-4 opacity-50" />
                              )}
                            </button>
                          </TableHead>
                          <TableHead className="text-muted-foreground">Subscription</TableHead>
                          <TableHead className="text-muted-foreground">Automations</TableHead>
                          <TableHead className="text-muted-foreground">
                            <button
                              onClick={() => handleSort("role")}
                              className="flex items-center gap-1 hover:text-foreground transition-colors"
                            >
                              Role
                              {sortField === "role" ? (
                                sortDirection === "asc" ? (
                                  <ArrowUp className="h-4 w-4" />
                                ) : (
                                  <ArrowDown className="h-4 w-4" />
                                )
                              ) : (
                                <ArrowUpDown className="h-4 w-4 opacity-50" />
                              )}
                            </button>
                          </TableHead>
                          <TableHead className="text-right text-muted-foreground">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedUsers.map((profile) => {
                          const isUserAdmin = userRoles[profile.user_id]?.includes("admin");
                          const isCurrentUser = profile.user_id === user?.id;
                          const subscription = userSubscriptions[profile.user_id];
                          const automationCount = subscription?.automations_purchased?.length || 0;
                          return (
                            <TableRow key={profile.id} className="border-border">
                              <TableCell>
                                <Checkbox
                                  checked={selectedUsers.has(profile.user_id)}
                                  onCheckedChange={(checked) => handleSelectUser(profile.user_id, checked as boolean)}
                                />
                              </TableCell>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  <span className="text-foreground">{profile.email || "No email"}</span>
                                  {isUserAdmin && (
                                    <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                                      <Shield className="h-3 w-3 mr-1" />
                                      Admin
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-muted-foreground">{new Date(profile.created_at).toLocaleDateString()}</TableCell>
                              <TableCell>
                                {subscription ? (
                                  <div className="space-y-1">
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                      subscription.status === 'active' 
                                        ? 'bg-emerald-500/10 text-emerald-400' 
                                        : 'bg-yellow-500/10 text-yellow-400'
                                    }`}>
                                      {subscription.status}
                                    </span>
                                    {subscription.bundle_name && (
                                      <p className="text-xs text-muted-foreground">{subscription.bundle_name}</p>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {automationCount > 0 ? (
                                  <span className="text-foreground">{automationCount}</span>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {isUserAdmin ? (
                                  <span className="text-amber-400 text-sm">Admin</span>
                                ) : (
                                  <span className="text-muted-foreground text-sm">User</span>
                                )}
                                {isCurrentUser && (
                                  <span className="ml-2 text-xs text-muted-foreground">(You)</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                {isUserAdmin ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRevokeAdmin(profile.user_id)}
                                    disabled={isCurrentUser}
                                    className="text-muted-foreground hover:text-destructive hover:bg-muted"
                                  >
                                    Revoke
                                  </Button>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handlePromoteToAdmin(profile.user_id)}
                                    className="text-muted-foreground hover:text-foreground hover:bg-muted"
                                  >
                                    Promote
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>

                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
                      <span className="text-sm text-muted-foreground">
                        {paginatedUsers.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, totalUsers)} of {totalUsers}
                      </span>

                      <div className="flex items-center gap-4">
                        <Select
                          value={itemsPerPage.toString()}
                          onValueChange={(value) => {
                            setItemsPerPage(Number(value));
                            setCurrentPage(1);
                          }}
                        >
                          <SelectTrigger className="w-[70px] bg-muted border-border text-foreground">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border">
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="25">25</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                          </SelectContent>
                        </Select>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setCurrentPage(1)}
                            disabled={currentPage === 1}
                            className="text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30"
                          >
                            <ChevronsLeft className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setCurrentPage(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <span className="text-sm text-muted-foreground px-2">
                            {currentPage} / {totalPages || 1}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setCurrentPage(currentPage + 1)}
                            disabled={currentPage === totalPages || totalPages === 0}
                            className="text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setCurrentPage(totalPages)}
                            disabled={currentPage === totalPages || totalPages === 0}
                            className="text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30"
                          >
                            <ChevronsRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </CardContent>
          </Card>
        );
      case "analytics":
        return <AnalyticsDashboard />;
      case "visitors":
        return <VisitorAnalytics />;
      case "activity":
        return <ActivityLogs />;
      case "credentials":
        navigate("/admin/credentials");
        return null;
      case "affiliates":
        navigate("/admin/affiliates");
        return null;
      case "tool-config":
        navigate("/admin/tool-credentials");
        return null;
      case "webhooks":
        return <WebhookTriggers />;
      case "stripe":
        return <StripeConfiguration />; 
      default:
        return (
          <div className="space-y-6">
            <UserStatistics />
            <ActiveUsersWidget />
          </div>
        );
    }
  };

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />
      
      <main className="flex-1 overflow-y-auto">
        {/* Sticky Page Header */}
        <div className="sticky top-0 z-10 bg-background border-b border-border px-8 py-6">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-2xl font-semibold text-foreground capitalize">
              {activeTab === "tool-config" ? "Tool Configuration" : activeTab}
            </h1>
            <p className="text-muted-foreground mt-1">
              {activeTab === "overview" && "Welcome to your admin dashboard"}
              {activeTab === "automations" && "Manage your automation catalog"}
              {activeTab === "orders" && "View and manage customer orders"}
              {activeTab === "carts" && "View active customer carts"}
              {activeTab === "users" && "View users and manage permissions"}
              {activeTab === "analytics" && "Track your business metrics"}
              {activeTab === "activity" && "View recent activity logs"}
              {activeTab === "webhooks" && "View configured database webhook triggers"}
              {activeTab === "stripe" && "View and verify Stripe pricing configuration"}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          <div className="max-w-6xl mx-auto">
            {renderContent()}
          </div>
        </div>
      </main>
    </div>
  );
}
