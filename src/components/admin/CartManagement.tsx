import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { ShoppingCart, User, Mail, Package, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

interface CartItem {
  id: string;
  user_id: string;
  automation_id: string;
  name: string;
  price: number;
  hours_saved: number;
  quantity: number;
  thumbnail: string | null;
  customer_name: string | null;
  customer_email: string | null;
  created_at: string;
  updated_at: string;
}

const CartManagement = () => {
  const queryClient = useQueryClient();

  const { data: cartItems, isLoading, refetch } = useQuery({
    queryKey: ["admin-cart-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cart_items")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as CartItem[];
    },
  });

  // Real-time subscription for cart updates
  useEffect(() => {
    const channel = supabase
      .channel('admin-cart-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cart_items',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-cart-items"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Group cart items by user
  const groupedByUser = cartItems?.reduce((acc, item) => {
    const key = item.user_id;
    if (!acc[key]) {
      acc[key] = {
        user_id: item.user_id,
        customer_name: item.customer_name,
        customer_email: item.customer_email,
        items: [],
        total: 0,
      };
    }
    acc[key].items.push(item);
    acc[key].total += item.price * item.quantity;
    // Update customer info if newer item has it
    if (item.customer_name) acc[key].customer_name = item.customer_name;
    if (item.customer_email) acc[key].customer_email = item.customer_email;
    return acc;
  }, {} as Record<string, { user_id: string; customer_name: string | null; customer_email: string | null; items: CartItem[]; total: number }>);

  const userCarts = Object.values(groupedByUser || {});

  if (isLoading) {
    return <div className="text-center py-8">Loading cart data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Cart Management</h2>
          <p className="text-muted-foreground">
            View active customer carts with items
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Badge variant="outline">
            {userCarts.length} Active Cart{userCarts.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <ShoppingCart className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Items</p>
              <p className="text-2xl font-bold">{cartItems?.length || 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-emerald-500/10">
              <User className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Carts</p>
              <p className="text-2xl font-bold">{userCarts.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-violet-500/10">
              <Package className="w-5 h-5 text-violet-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Potential Revenue</p>
              <p className="text-2xl font-bold">
                ${userCarts.reduce((sum, cart) => sum + cart.total, 0).toLocaleString()}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Cart Items by User */}
      {userCarts.length === 0 ? (
        <Card className="p-8 text-center">
          <ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No active carts</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {userCarts.map((cart) => (
            <Card key={cart.user_id} className="overflow-hidden">
              <div className="p-4 border-b bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">
                        {cart.customer_name || 'Unknown Customer'}
                      </span>
                    </div>
                    {cart.customer_email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="w-4 h-4" />
                        <span className="text-sm">{cart.customer_email}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {cart.items.length} item{cart.items.length !== 1 ? 's' : ''}
                    </Badge>
                    <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                      ${cart.total.toLocaleString()}
                    </Badge>
                  </div>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Automation</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead>Added</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cart.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {item.thumbnail && (
                            <img
                              src={item.thumbnail}
                              alt={item.name}
                              className="w-10 h-10 rounded object-cover"
                            />
                          )}
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-xs text-muted-foreground">
                              ID: {item.automation_id}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">${item.price}</TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell className="text-right font-medium">
                        ${(item.price * item.quantity).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(item.created_at), "MMM d, h:mm a")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default CartManagement;
