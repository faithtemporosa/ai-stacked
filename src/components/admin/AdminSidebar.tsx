import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  ShoppingBasket,
  Users, 
  BarChart3, 
  Settings,
  Key,
  UserCheck,
  Activity,
  Webhook,
  CreditCard,
  Eye
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  value: string;
}

const navItems: NavItem[] = [
  { label: "Overview", icon: LayoutDashboard, value: "overview" },
  { label: "Automations", icon: Package, value: "automations" },
  { label: "Orders", icon: ShoppingCart, value: "orders" },
  { label: "Carts", icon: ShoppingBasket, value: "carts" },
  { label: "Users", icon: Users, value: "users" },
  { label: "Visitors", icon: Eye, value: "visitors" },
  { label: "Analytics", icon: BarChart3, value: "analytics" },
  { label: "Activity Logs", icon: Activity, value: "activity" },
];

const settingsItems: NavItem[] = [
  { label: "Credentials", icon: Key, value: "credentials" },
  { label: "Affiliates", icon: UserCheck, value: "affiliates" },
  { label: "Stripe", icon: CreditCard, value: "stripe" },
  { label: "Tool Config", icon: Settings, value: "tool-config" },
  { label: "Webhooks", icon: Webhook, value: "webhooks" },
];

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function AdminSidebar({ activeTab, onTabChange }: AdminSidebarProps) {
  return (
    <aside className="w-64 h-screen bg-card border-r border-border flex flex-col flex-shrink-0 overflow-y-auto">
      {/* Logo/Brand */}
      <div className="p-6 border-b border-border">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">A</span>
          </div>
          <span className="font-semibold text-foreground">Admin Panel</span>
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 mb-3">
          Main
        </p>
        {navItems.map((item) => (
          <button
            key={item.value}
            onClick={() => onTabChange(item.value)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              activeTab === item.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </button>
        ))}

        <div className="pt-6">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 mb-3">
            Settings
          </p>
          {settingsItems.map((item) => (
            <button
              key={item.value}
              onClick={() => onTabChange(item.value)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                activeTab === item.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">
          © 2024 AI-Stacked
        </p>
      </div>
    </aside>
  );
}
