import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { CheckCircle, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Separator } from "@/components/ui/separator";

interface OrderDetails {
  order_id: string;
  order_total: number;
  automation_count: number;
  cart_items: string;
  name: string;
  email: string;
}

const OrderSuccess = () => {
  const navigate = useNavigate();
  const { clearCart } = useCart();
  const [searchParams] = useSearchParams();
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      const sessionId = searchParams.get("session_id");
      
      if (!sessionId) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("contact_submissions")
          .select("order_id, order_total, automation_count, cart_items, name, email")
          .eq("order_id", sessionId)
          .single();

        if (error) throw error;
        setOrderDetails(data);
      } catch (error) {
        console.error("Error fetching order details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
    clearCart();

    // Redirect to My Orders page after 5 seconds
    const timer = setTimeout(() => {
      navigate("/my-orders");
    }, 5000);

    return () => clearTimeout(timer);
  }, [clearCart, navigate, searchParams]);

  const cartItems = orderDetails?.cart_items 
    ? JSON.parse(orderDetails.cart_items) 
    : [];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full p-8 space-y-6">
        <div className="flex justify-center">
          <CheckCircle className="w-16 h-16 text-green-500" />
        </div>
        
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Payment Successful!</h1>
          <p className="text-muted-foreground">
            Thank you for your order. We'll contact you within 24 hours to get started on your automations.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : orderDetails ? (
          <div className="space-y-4">
            <Separator />
            
            <div className="space-y-3">
              <h2 className="font-semibold text-lg">Order Details</h2>
              <div className="text-sm text-muted-foreground space-y-1">
                <p><span className="font-medium text-foreground">Order ID:</span> {orderDetails.order_id}</p>
                <p><span className="font-medium text-foreground">Customer:</span> {orderDetails.name}</p>
                <p><span className="font-medium text-foreground">Email:</span> {orderDetails.email}</p>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <h3 className="font-semibold">Items Purchased</h3>
              <div className="space-y-2">
                {cartItems.map((item: any, index: number) => (
                  <div key={index} className="flex justify-between items-start text-sm">
                    <div className="flex-1">
                      <p className="font-medium">{item.name}</p>
                      {item.quantity > 1 && (
                        <p className="text-muted-foreground text-xs">Quantity: {item.quantity}</p>
                      )}
                    </div>
                    <p className="font-medium">
                      ${(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div className="flex justify-between items-center pt-2">
              <span className="font-semibold text-lg">Total</span>
              <span className="font-bold text-xl text-primary">
                ${orderDetails.order_total.toFixed(2)}
              </span>
            </div>
          </div>
        ) : null}

        <div className="text-center text-sm text-muted-foreground pt-4">
          <p>Redirecting to your orders page...</p>
        </div>
      </Card>
    </div>
  );
};

export default OrderSuccess;
