-- Add customer_name and customer_email columns to cart_items table
ALTER TABLE public.cart_items 
ADD COLUMN customer_name text,
ADD COLUMN customer_email text;

-- Update the webhook trigger function to include the new columns
CREATE OR REPLACE FUNCTION public.notify_cart_item_webhook()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Make async HTTP POST request to n8n webhook
  PERFORM net.http_post(
    url := 'https://faithtemporosa.app.n8n.cloud/webhook/1687a929-8c27-49ad-ab8c-78ff16125758',
    body := jsonb_build_object(
      'id', NEW.id,
      'user_id', NEW.user_id,
      'automation_id', NEW.automation_id,
      'name', NEW.name,
      'price', NEW.price,
      'hours_saved', NEW.hours_saved,
      'quantity', NEW.quantity,
      'thumbnail', NEW.thumbnail,
      'customer_name', NEW.customer_name,
      'customer_email', NEW.customer_email,
      'created_at', NEW.created_at,
      'updated_at', NEW.updated_at
    )
  );

  RETURN NEW;
END;
$function$;