-- Create function to notify webhook on new cart item
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
      'created_at', NEW.created_at,
      'updated_at', NEW.updated_at
    )
  );

  RETURN NEW;
END;
$function$;

-- Create trigger on cart_items table for INSERT
CREATE TRIGGER notify_cart_item_insert
  AFTER INSERT ON public.cart_items
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_cart_item_webhook();