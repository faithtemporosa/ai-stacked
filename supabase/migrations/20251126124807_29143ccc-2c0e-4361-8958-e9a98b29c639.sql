-- Add unique constraint to prevent duplicate cart items per user
ALTER TABLE cart_items
ADD CONSTRAINT cart_items_user_automation_unique 
UNIQUE (user_id, automation_id);