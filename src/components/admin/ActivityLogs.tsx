// @ts-nocheck
import { useEffect, useState } from "react";
import { supabase } from "../../integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";
import { Loader2, Shield, ShieldOff } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { AdminActivityLog } from "../../types/adminActivity";
import { errorLogger } from "../../utils/errorLogger";

interface ActivityLogWithEmail extends AdminActivityLog {
  admin_email: string | null;
  target_email: string | null;
}

export function ActivityLogs() {
  const [logs, setLogs] = useState<ActivityLogWithEmail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("admin_activity_logs_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "admin_activity_logs",
        },
        () => {
          fetchLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("admin_activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      // Fetch admin and target user emails
      const logsWithEmails: ActivityLogWithEmail[] = await Promise.all(
        (data || []).map(async (log) => {
          const adminProfile = await supabase
            .from("profiles")
            .select("email")
            .eq("user_id", log.admin_user_id)
            .maybeSingle();

          let targetEmail = null;
          if (log.target_user_id) {
            const targetProfile = await supabase
              .from("profiles")
              .select("email")
              .eq("user_id", log.target_user_id)
              .maybeSingle();
            targetEmail = targetProfile.data?.email || null;
          }

          return {
            id: log.id,
            admin_user_id: log.admin_user_id,
            action_type: log.action_type,
            target_user_id: log.target_user_id,
            details: log.details as unknown as import("../../types/adminActivity").AdminActivityDetails,
            created_at: log.created_at,
            admin_email: adminProfile.data?.email || "Unknown",
            target_email: targetEmail,
          };
        })
      );

      setLogs(logsWithEmails);
    } catch (error) {
      errorLogger.logError("Error fetching activity logs", error);
    } finally {
      setLoading(false);
    }
  };

  const getActionBadge = (actionType: string) => {
    if (actionType === "role_assigned") {
      return (
        <Badge variant="default" className="gap-1">
          <Shield className="h-3 w-3" />
          Role Assigned
        </Badge>
      );
    } else if (actionType === "role_revoked") {
      return (
        <Badge variant="outline" className="gap-1">
          <ShieldOff className="h-3 w-3" />
          Role Revoked
        </Badge>
      );
    }
    return <Badge variant="secondary">{actionType}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin Activity Log</CardTitle>
        <CardDescription>Recent admin actions and role changes</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : logs.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">No activity logs yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Target User</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{getActionBadge(log.action_type)}</TableCell>
                    <TableCell className="font-medium">
                      {log.admin_email || "Unknown"}
                    </TableCell>
                    <TableCell>{log.target_email || "N/A"}</TableCell>
                    <TableCell>
                      {log.details?.role && (
                        <Badge variant="secondary">{log.details.role}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
