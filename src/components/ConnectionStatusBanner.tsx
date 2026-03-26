import { AlertCircle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useConnectionStatus } from "@/hooks/use-connection-status";

export const ConnectionStatusBanner = () => {
  const { isOnline } = useConnectionStatus();

  if (isOnline) return null;

  return (
    <Alert variant="destructive" className="rounded-none border-x-0 border-t-0">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        <span>Connection issue detected. Retrying automatically...</span>
      </AlertDescription>
    </Alert>
  );
};
