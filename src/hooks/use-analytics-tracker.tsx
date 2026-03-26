import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// Generate or retrieve session ID
const getSessionId = () => {
  let sessionId = sessionStorage.getItem("analytics_session_id");
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem("analytics_session_id", sessionId);
  }
  return sessionId;
};

// Detect device type
const getDeviceType = () => {
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return "tablet";
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return "mobile";
  }
  return "desktop";
};

// Detect browser
const getBrowser = () => {
  const ua = navigator.userAgent;
  if (ua.indexOf("Firefox") > -1) return "Firefox";
  if (ua.indexOf("Chrome") > -1) return "Chrome";
  if (ua.indexOf("Safari") > -1) return "Safari";
  if (ua.indexOf("Edge") > -1) return "Edge";
  return "Other";
};

// Detect OS
const getOS = () => {
  const ua = navigator.userAgent;
  if (ua.indexOf("Win") > -1) return "Windows";
  if (ua.indexOf("Mac") > -1) return "MacOS";
  if (ua.indexOf("Linux") > -1) return "Linux";
  if (ua.indexOf("Android") > -1) return "Android";
  if (ua.indexOf("iOS") > -1) return "iOS";
  return "Other";
};

export const useAnalyticsTracker = () => {
  const location = useLocation();

  useEffect(() => {
    const trackPageView = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        await supabase.from("analytics_events").insert({
          event_type: "pageview",
          page_path: location.pathname,
          referrer: document.referrer || "Direct",
          user_agent: navigator.userAgent,
          device_type: getDeviceType(),
          browser: getBrowser(),
          os: getOS(),
          session_id: getSessionId(),
          user_id: user?.id || null,
          email: user?.email || null,
        });
      } catch (error) {
        console.error("Error tracking page view:", error);
      }
    };

    trackPageView();
  }, [location.pathname]);
};
