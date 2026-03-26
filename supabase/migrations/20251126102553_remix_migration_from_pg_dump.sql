CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_net";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.7

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', 'public, extensions', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'user'
);


--
-- Name: generate_order_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_order_id() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.order_id IS NULL THEN
    NEW.order_id := 'ORD-' || EXTRACT(EPOCH FROM NEW.created_at)::bigint || '-' || substring(NEW.id::text, 1, 8);
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email_digest_enabled, email)
  VALUES (NEW.id, true, NEW.email);
  RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: log_admin_activity(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_admin_activity() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  admin_id uuid;
  action_type_val text;
  target_id uuid;
BEGIN
  -- Get the current admin user
  admin_id := auth.uid();
  
  IF TG_OP = 'INSERT' THEN
    action_type_val := 'role_assigned';
    target_id := NEW.user_id;
    
    -- Insert activity log
    INSERT INTO public.admin_activity_logs (admin_user_id, action_type, target_user_id, details)
    VALUES (admin_id, action_type_val, target_id, jsonb_build_object('role', NEW.role));
    
    -- Send notification to user about role change
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      NEW.user_id,
      'Role Updated',
      format('You have been assigned the %s role', NEW.role),
      'role_change',
      '/settings'
    );
    
  ELSIF TG_OP = 'DELETE' THEN
    action_type_val := 'role_revoked';
    target_id := OLD.user_id;
    
    -- Insert activity log
    INSERT INTO public.admin_activity_logs (admin_user_id, action_type, target_user_id, details)
    VALUES (admin_id, action_type_val, target_id, jsonb_build_object('role', OLD.role));
    
    -- Send notification to user about role revocation
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      OLD.user_id,
      'Role Revoked',
      format('Your %s role has been revoked', OLD.role),
      'role_change',
      '/settings'
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: log_login_activity(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_login_activity() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.login_activity (
    user_id,
    user_agent,
    browser,
    os,
    city,
    country
  ) VALUES (
    NEW.id,
    'Server-tracked',
    'N/A',
    'N/A',
    'N/A',
    'N/A'
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW;
END;
$$;


--
-- Name: notify_n8n_webhook(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_n8n_webhook() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Make async HTTP POST request to n8n webhook with updated URL
  PERFORM net.http_post(
    url := 'https://faithtemporosa.app.n8n.cloud/webhook/1687a929-8c27-49ad-ab8c-78ff16125758',
    body := jsonb_build_object(
      'id', NEW.id,
      'name', NEW.name,
      'email', NEW.email,
      'brand_name', NEW.brand_name,
      'message', NEW.message,
      'cart_items', NEW.cart_items,
      'order_id', NEW.order_id,
      'order_total', NEW.order_total,
      'automation_count', NEW.automation_count,
      'status', NEW.status,
      'created_at', NEW.created_at
    )
  );

  RETURN NEW;
END;
$$;


--
-- Name: notify_order_status_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_order_status_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  notification_message TEXT;
  status_label TEXT;
BEGIN
  -- Only proceed if status or estimated_completion_date changed
  IF OLD.status = NEW.status AND 
     (OLD.estimated_completion_date IS NOT DISTINCT FROM NEW.estimated_completion_date) THEN
    RETURN NEW;
  END IF;
  
  -- Build notification message based on status
  CASE NEW.status
    WHEN 'in_progress' THEN
      status_label := 'In Progress';
      notification_message := format('Your order %s is now being worked on!', NEW.order_id);
    WHEN 'completed' THEN
      status_label := 'Completed';
      notification_message := format('Your order %s has been completed!', NEW.order_id);
    WHEN 'cancelled' THEN
      status_label := 'Cancelled';
      notification_message := format('Your order %s has been cancelled.', NEW.order_id);
    ELSE
      status_label := 'Status Updated';
      notification_message := format('Your order %s status has been updated.', NEW.order_id);
  END CASE;
  
  -- Add completion date info if it exists
  IF NEW.estimated_completion_date IS NOT NULL AND OLD.estimated_completion_date IS NULL THEN
    notification_message := notification_message || format(' Estimated completion: %s', 
      to_char(NEW.estimated_completion_date, 'Mon DD, YYYY'));
  END IF;
  
  -- Send notification via email using the existing n8n webhook
  PERFORM net.http_post(
    url := 'https://faithtemporosa.app.n8n.cloud/webhook/1687a929-8c27-49ad-ab8c-78ff16125758',
    body := jsonb_build_object(
      'type', 'status_update',
      'order_id', NEW.order_id,
      'email', NEW.email,
      'name', NEW.name,
      'status', NEW.status,
      'status_label', status_label,
      'message', notification_message,
      'estimated_completion_date', NEW.estimated_completion_date
    )
  );
  
  RETURN NEW;
END;
$$;


--
-- Name: notify_wishlist_users_on_automation_update(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_wishlist_users_on_automation_update() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
DECLARE
  user_record RECORD;
  price_changed BOOLEAN;
  features_changed BOOLEAN;
  notification_title TEXT;
  notification_message TEXT;
BEGIN
  -- Check what changed
  price_changed := OLD.price != NEW.price;
  features_changed := OLD.features != NEW.features;
  
  -- Only proceed if price or features changed
  IF NOT (price_changed OR features_changed) THEN
    RETURN NEW;
  END IF;
  
  -- Build notification message
  IF price_changed AND features_changed THEN
    notification_title := 'Price & Features Update';
    notification_message := format('%s now costs $%s and has new features!', NEW.name, NEW.price);
  ELSIF price_changed THEN
    notification_title := 'Price Update';
    IF NEW.price < OLD.price THEN
      notification_message := format('%s price dropped to $%s (was $%s)', NEW.name, NEW.price, OLD.price);
    ELSE
      notification_message := format('%s price updated to $%s', NEW.name, NEW.price);
    END IF;
  ELSE
    notification_title := 'New Features Added';
    notification_message := format('%s has new features available!', NEW.name);
  END IF;
  
  -- Insert notifications for all users who wishlisted this automation
  FOR user_record IN 
    SELECT DISTINCT user_id 
    FROM public.wishlists 
    WHERE automation_id = NEW.id
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      user_record.user_id,
      notification_title,
      notification_message,
      'wishlist_update',
      '/automation/' || NEW.id
    );
  END LOOP;
  
  RETURN NEW;
END;
$_$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: admin_activity_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_activity_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_user_id uuid NOT NULL,
    action_type text NOT NULL,
    target_user_id uuid,
    details jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: automation_usage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.automation_usage (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    automation_id text NOT NULL,
    automation_name text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: automations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.automations (
    id text NOT NULL,
    name text NOT NULL,
    category text NOT NULL,
    price numeric(10,2) NOT NULL,
    features text[] NOT NULL,
    description text,
    last_updated timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cart_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cart_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    automation_id text NOT NULL,
    name text NOT NULL,
    price numeric NOT NULL,
    hours_saved integer NOT NULL,
    thumbnail text,
    quantity integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: contact_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contact_submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    brand_name text,
    message text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    cart_items text DEFAULT 'No cart items'::text,
    order_total numeric DEFAULT 0,
    automation_count integer DEFAULT 0,
    order_id text,
    status text DEFAULT 'pending'::text NOT NULL,
    estimated_completion_date timestamp with time zone
);


--
-- Name: login_activity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.login_activity (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    login_at timestamp with time zone DEFAULT now() NOT NULL,
    ip_address text,
    country text,
    city text,
    user_agent text,
    browser text,
    os text
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    type text NOT NULL,
    read boolean DEFAULT false NOT NULL,
    link text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT notifications_type_check CHECK ((type = ANY (ARRAY['wishlist_update'::text, 'new_feature'::text, 'recommendation'::text])))
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    email_digest_enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    email text
);


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    stripe_customer_id text,
    stripe_subscription_id text,
    stripe_price_id text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    automation_limit integer DEFAULT 1 NOT NULL,
    automations_used integer DEFAULT 0 NOT NULL,
    current_period_start timestamp with time zone,
    current_period_end timestamp with time zone,
    cancel_at_period_end boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: wishlists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wishlists (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    automation_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: admin_activity_logs admin_activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_activity_logs
    ADD CONSTRAINT admin_activity_logs_pkey PRIMARY KEY (id);


--
-- Name: automation_usage automation_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.automation_usage
    ADD CONSTRAINT automation_usage_pkey PRIMARY KEY (id);


--
-- Name: automations automations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.automations
    ADD CONSTRAINT automations_pkey PRIMARY KEY (id);


--
-- Name: cart_items cart_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_pkey PRIMARY KEY (id);


--
-- Name: contact_submissions contact_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact_submissions
    ADD CONSTRAINT contact_submissions_pkey PRIMARY KEY (id);


--
-- Name: login_activity login_activity_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.login_activity
    ADD CONSTRAINT login_activity_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_stripe_subscription_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_stripe_subscription_id_key UNIQUE (stripe_subscription_id);


--
-- Name: subscriptions subscriptions_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_user_id_key UNIQUE (user_id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: wishlists wishlists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlists
    ADD CONSTRAINT wishlists_pkey PRIMARY KEY (id);


--
-- Name: wishlists wishlists_user_id_automation_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlists
    ADD CONSTRAINT wishlists_user_id_automation_id_key UNIQUE (user_id, automation_id);


--
-- Name: idx_admin_activity_logs_admin_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_activity_logs_admin_user_id ON public.admin_activity_logs USING btree (admin_user_id);


--
-- Name: idx_admin_activity_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_activity_logs_created_at ON public.admin_activity_logs USING btree (created_at DESC);


--
-- Name: idx_automation_usage_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_automation_usage_user_id ON public.automation_usage USING btree (user_id);


--
-- Name: idx_automations_last_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_automations_last_updated ON public.automations USING btree (last_updated);


--
-- Name: idx_cart_items_automation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cart_items_automation_id ON public.cart_items USING btree (automation_id);


--
-- Name: idx_cart_items_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cart_items_user_id ON public.cart_items USING btree (user_id);


--
-- Name: idx_contact_submissions_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contact_submissions_created_at ON public.contact_submissions USING btree (created_at DESC);


--
-- Name: idx_contact_submissions_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contact_submissions_order_id ON public.contact_submissions USING btree (order_id);


--
-- Name: idx_contact_submissions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contact_submissions_status ON public.contact_submissions USING btree (status);


--
-- Name: idx_login_activity_country; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_login_activity_country ON public.login_activity USING btree (country);


--
-- Name: idx_login_activity_login_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_login_activity_login_at ON public.login_activity USING btree (login_at DESC);


--
-- Name: idx_login_activity_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_login_activity_user_id ON public.login_activity USING btree (user_id);


--
-- Name: idx_notifications_read; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_read ON public.notifications USING btree (read);


--
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);


--
-- Name: idx_subscriptions_stripe_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_stripe_customer_id ON public.subscriptions USING btree (stripe_customer_id);


--
-- Name: idx_subscriptions_stripe_subscription_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_stripe_subscription_id ON public.subscriptions USING btree (stripe_subscription_id);


--
-- Name: idx_subscriptions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_user_id ON public.subscriptions USING btree (user_id);


--
-- Name: idx_wishlists_automation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wishlists_automation_id ON public.wishlists USING btree (automation_id);


--
-- Name: idx_wishlists_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wishlists_user_id ON public.wishlists USING btree (user_id);


--
-- Name: contact_submissions contact_submission_webhook; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER contact_submission_webhook AFTER INSERT ON public.contact_submissions FOR EACH ROW EXECUTE FUNCTION notify_n8n_webhook();


--
-- Name: user_roles log_user_role_changes; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER log_user_role_changes AFTER INSERT OR DELETE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION log_admin_activity();


--
-- Name: contact_submissions notify_webhook_on_contact_submission; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER notify_webhook_on_contact_submission AFTER INSERT ON public.contact_submissions FOR EACH ROW EXECUTE FUNCTION notify_n8n_webhook();


--
-- Name: contact_submissions order_status_change_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER order_status_change_trigger AFTER UPDATE ON public.contact_submissions FOR EACH ROW EXECUTE FUNCTION notify_order_status_change();


--
-- Name: contact_submissions set_order_id_on_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_order_id_on_insert BEFORE INSERT ON public.contact_submissions FOR EACH ROW EXECUTE FUNCTION generate_order_id();


--
-- Name: automations trigger_notify_wishlist_on_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_notify_wishlist_on_update AFTER UPDATE ON public.automations FOR EACH ROW EXECUTE FUNCTION notify_wishlist_users_on_automation_update();


--
-- Name: cart_items update_cart_items_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_cart_items_updated_at BEFORE UPDATE ON public.cart_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


--
-- Name: subscriptions update_subscriptions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


--
-- Name: admin_activity_logs admin_activity_logs_admin_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_activity_logs
    ADD CONSTRAINT admin_activity_logs_admin_user_id_fkey FOREIGN KEY (admin_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: admin_activity_logs admin_activity_logs_target_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_activity_logs
    ADD CONSTRAINT admin_activity_logs_target_user_id_fkey FOREIGN KEY (target_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: automation_usage automation_usage_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.automation_usage
    ADD CONSTRAINT automation_usage_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;


--
-- Name: subscriptions subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: automation_usage Admins can delete automation usage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete automation usage" ON public.automation_usage FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));


--
-- Name: automations Admins can delete automations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete automations" ON public.automations FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));


--
-- Name: contact_submissions Admins can delete contact submissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete contact submissions" ON public.contact_submissions FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));


--
-- Name: subscriptions Admins can delete subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete subscriptions" ON public.subscriptions FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));


--
-- Name: user_roles Admins can delete user roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete user roles" ON public.user_roles FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));


--
-- Name: admin_activity_logs Admins can insert activity logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert activity logs" ON public.admin_activity_logs FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));


--
-- Name: automations Admins can insert automations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert automations" ON public.automations FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));


--
-- Name: notifications Admins can insert notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert notifications" ON public.notifications FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));


--
-- Name: user_roles Admins can insert user roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert user roles" ON public.user_roles FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));


--
-- Name: automations Admins can update automations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update automations" ON public.automations FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));


--
-- Name: contact_submissions Admins can update contact submissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update contact submissions" ON public.contact_submissions FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));


--
-- Name: user_roles Admins can update user roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update user roles" ON public.user_roles FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));


--
-- Name: admin_activity_logs Admins can view all activity logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all activity logs" ON public.admin_activity_logs FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));


--
-- Name: login_activity Admins can view all login activity; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all login activity" ON public.login_activity FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));


--
-- Name: profiles Admins can view all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));


--
-- Name: subscriptions Admins can view all subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all subscriptions" ON public.subscriptions FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));


--
-- Name: automation_usage Admins can view all usage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all usage" ON public.automation_usage FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));


--
-- Name: user_roles Admins can view all user roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all user roles" ON public.user_roles FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));


--
-- Name: contact_submissions Anyone can submit contact form; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can submit contact form" ON public.contact_submissions FOR INSERT WITH CHECK (true);


--
-- Name: automations Automations are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Automations are viewable by everyone" ON public.automations FOR SELECT USING (true);


--
-- Name: admin_activity_logs Deny deletes to admin logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Deny deletes to admin logs" ON public.admin_activity_logs FOR DELETE USING (false);


--
-- Name: login_activity Deny deletes to login activity; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Deny deletes to login activity" ON public.login_activity FOR DELETE USING (false);


--
-- Name: admin_activity_logs Deny updates to admin logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Deny updates to admin logs" ON public.admin_activity_logs FOR UPDATE USING (false);


--
-- Name: automation_usage Deny updates to automation usage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Deny updates to automation usage" ON public.automation_usage FOR UPDATE USING (false);


--
-- Name: login_activity Deny updates to login activity; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Deny updates to login activity" ON public.login_activity FOR UPDATE USING (false);


--
-- Name: subscriptions Deny user inserts to subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Deny user inserts to subscriptions" ON public.subscriptions FOR INSERT TO authenticated WITH CHECK (false);


--
-- Name: subscriptions Deny user updates to subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Deny user updates to subscriptions" ON public.subscriptions FOR UPDATE TO authenticated USING (false);


--
-- Name: profiles Service role can manage profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage profiles" ON public.profiles TO service_role USING (true) WITH CHECK (true);


--
-- Name: wishlists Users can add to their own wishlist; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can add to their own wishlist" ON public.wishlists FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: cart_items Users can delete their own cart items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own cart items" ON public.cart_items FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: notifications Users can delete their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own notifications" ON public.notifications FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can delete their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own profile" ON public.profiles FOR DELETE USING (((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role)));


--
-- Name: profiles Users can insert own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: cart_items Users can insert their own cart items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own cart items" ON public.cart_items FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Users can insert their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: automation_usage Users can insert their own usage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own usage" ON public.automation_usage FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: wishlists Users can remove from their own wishlist; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can remove from their own wishlist" ON public.wishlists FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: cart_items Users can update their own cart items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own cart items" ON public.cart_items FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: notifications Users can update their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: wishlists Users can update their own wishlist; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own wishlist" ON public.wishlists FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can view own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: cart_items Users can view their own cart items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own cart items" ON public.cart_items FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: notifications Users can view their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: contact_submissions Users can view their own orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own orders" ON public.contact_submissions FOR SELECT TO authenticated USING (((email = (auth.jwt() ->> 'email'::text)) OR has_role(auth.uid(), 'admin'::app_role)));


--
-- Name: profiles Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_roles Users can view their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: subscriptions Users can view their own subscription; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own subscription" ON public.subscriptions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: automation_usage Users can view their own usage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own usage" ON public.automation_usage FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: wishlists Users can view their own wishlist; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own wishlist" ON public.wishlists FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: admin_activity_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: automation_usage; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.automation_usage ENABLE ROW LEVEL SECURITY;

--
-- Name: automations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;

--
-- Name: cart_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

--
-- Name: contact_submissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

--
-- Name: login_activity; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.login_activity ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: wishlists; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


