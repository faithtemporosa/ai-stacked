// @ts-nocheck
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Eye, EyeOff, Shield, Trash2, AlertTriangle, ArrowLeft } from "lucide-react";
import { getCredentialTypeLabel } from "@/utils/credentialsEncryption";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Credential {
  id: string;
  customer_id: string;
  tool_name: string;
  credential_type: string;
  connection_notes: string;
  tags: string[];
  is_valid: boolean;
  created_at: string;
  updated_at: string;
  customer_email?: string;
  customer_name?: string;
}

interface DecryptedCredential {
  username: string | null;
  password: string | null;
  api_key: string | null;
  extra_fields: Record<string, any> | null;
}

export default function AdminCredentials() {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [decryptedData, setDecryptedData] = useState<Record<string, DecryptedCredential>>({});
  const [showDecryptConfirm, setShowDecryptConfirm] = useState<string | null>(null);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  // Real-time subscription for credential updates
  useEffect(() => {
    if (!isAdmin) return;

    const channel = supabase
      .channel('admin-credentials-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'customer_credentials',
        },
        (payload) => {
          console.log('New credential received:', payload);
          toast.info('New credentials submitted', {
            description: `A customer just submitted new credentials for ${(payload.new as any)?.tool_name || 'a tool'}`,
          });
          loadCredentials();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'customer_credentials',
        },
        (payload) => {
          console.log('Credential updated:', payload);
          toast.info('Credentials updated', {
            description: `Credentials for ${(payload.new as any)?.tool_name || 'a tool'} were updated`,
          });
          loadCredentials();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'customer_credentials',
        },
        (payload) => {
          console.log('Credential deleted:', payload);
          loadCredentials();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);

  async function checkAdminAccess() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/admin-login');
        return;
      }

      // Check if user has admin role
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id);

      const hasAdminRole = roles?.some(r => r.role === 'admin');
      
      if (!hasAdminRole) {
        toast.error('Access denied: Admin privileges required');
        navigate('/');
        return;
      }

      setIsAdmin(true);
      loadCredentials();
    } catch (error) {
      console.error('Error checking admin access:', error);
      navigate('/');
    }
  }

  async function loadCredentials() {
    try {
      // First load credentials
      const { data: credsData, error: credsError } = await supabase
        .from('customer_credentials')
        .select('*')
        .order('created_at', { ascending: false });

      if (credsError) throw credsError;

      // Then load user profiles to get email info
      const userIds = [...new Set(credsData?.map(c => c.customer_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, email, username')
        .in('user_id', userIds);

      // Merge customer info with credentials
      const enrichedCredentials = credsData?.map(cred => {
        const profile = profiles?.find(p => p.user_id === cred.customer_id);
        return {
          ...cred,
          customer_email: profile?.email || 'Unknown',
          customer_name: profile?.username || null
        };
      }) || [];

      setCredentials(enrichedCredentials);
    } catch (error) {
      console.error('Error loading credentials:', error);
      toast.error('Failed to load credentials');
    } finally {
      setLoading(false);
    }
  }

  async function handleDecrypt(credentialId: string) {
    try {
      const { data, error } = await supabase.functions.invoke('decrypt-credential', {
        body: { credential_id: credentialId }
      });

      if (error) throw error;

      setDecryptedData(prev => ({
        ...prev,
        [credentialId]: data.decrypted
      }));

      toast.success('Credential decrypted');
      setShowDecryptConfirm(null);
    } catch (error) {
      console.error('Error decrypting credential:', error);
      toast.error('Failed to decrypt credential');
    }
  }

  function hideDecrypted(credentialId: string) {
    setDecryptedData(prev => {
      const newData = { ...prev };
      delete newData[credentialId];
      return newData;
    });
  }

  async function handleDelete(id: string) {
    try {
      const { error } = await supabase
        .from('customer_credentials')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Credential deleted');
      loadCredentials();
    } catch (error) {
      console.error('Error deleting credential:', error);
      toast.error('Failed to delete credential');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <Shield className="h-10 w-10 text-primary" />
            Admin: Credential Management
          </h1>
          <p className="text-muted-foreground">
            Secure access to all customer credentials
          </p>
        </div>

        <div className="grid gap-6">
          {credentials.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-lg text-muted-foreground">
                  No credentials stored in the system.
                </p>
              </CardContent>
            </Card>
          ) : (
            credentials.map((cred) => {
              const decrypted = decryptedData[cred.id];
              return (
                <Card key={cred.id} className="border-2">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2">
                          <Shield className="h-5 w-5 text-primary" />
                          {cred.tool_name}
                        </CardTitle>
                        <CardDescription className="mt-2 space-y-1">
                          <div>
                            <strong>Customer:</strong> {cred.customer_email}
                            {cred.customer_name && ` (${cred.customer_name})`}
                          </div>
                          <div>
                            <strong>Type:</strong> {getCredentialTypeLabel(cred.credential_type)}
                          </div>
                          <div className="text-xs opacity-70">
                            ID: {cred.customer_id.substring(0, 8)}...
                          </div>
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        {decrypted ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => hideDecrypted(cred.id)}
                          >
                            <EyeOff className="h-4 w-4 mr-2" />
                            Hide
                          </Button>
                        ) : (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => setShowDecryptConfirm(cred.id)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Decrypt
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(cred.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {cred.connection_notes && (
                      <div className="mb-4">
                        <p className="text-sm font-semibold mb-1">Connection Notes:</p>
                        <p className="text-sm text-muted-foreground">{cred.connection_notes}</p>
                      </div>
                    )}

                    {decrypted && (
                      <div className="bg-muted p-4 rounded-lg mb-4 border-2 border-primary/20">
                        <p className="text-sm font-semibold mb-3 text-primary flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" />
                          Decrypted Credentials (Sensitive Data)
                        </p>
                        {decrypted.username && (
                          <div className="mb-2">
                            <span className="text-sm font-medium">Username: </span>
                            <code className="text-sm bg-background px-2 py-1 rounded">{decrypted.username}</code>
                          </div>
                        )}
                        {decrypted.password && (
                          <div className="mb-2">
                            <span className="text-sm font-medium">Password: </span>
                            <code className="text-sm bg-background px-2 py-1 rounded">{decrypted.password}</code>
                          </div>
                        )}
                        {decrypted.api_key && (
                          <div className="mb-2">
                            <span className="text-sm font-medium">API Key: </span>
                            <code className="text-sm bg-background px-2 py-1 rounded break-all">{decrypted.api_key}</code>
                          </div>
                        )}
                        {decrypted.extra_fields && (
                          <div>
                            <span className="text-sm font-medium">Extra Fields: </span>
                            <pre className="text-xs bg-background p-2 rounded mt-1 overflow-x-auto">
                              {JSON.stringify(decrypted.extra_fields, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={cred.is_valid ? "default" : "destructive"}>
                        {cred.is_valid ? 'Valid' : 'Invalid'}
                      </Badge>
                      {cred.tags.map((tag, idx) => (
                        <Badge key={idx} variant="outline">{tag}</Badge>
                      ))}
                    </div>

                    <div className="mt-4 text-xs text-muted-foreground">
                      <p>Created: {new Date(cred.created_at).toLocaleString()}</p>
                      <p>Updated: {new Date(cred.updated_at).toLocaleString()}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        <AlertDialog open={showDecryptConfirm !== null} onOpenChange={() => setShowDecryptConfirm(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Decrypt Sensitive Data?
              </AlertDialogTitle>
              <AlertDialogDescription>
                You are about to decrypt and view sensitive credential information. This action will be logged in the audit trail.
                <br /><br />
                <strong>Only proceed if you have a legitimate business need to access this data.</strong>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => showDecryptConfirm && handleDecrypt(showDecryptConfirm)}>
                Decrypt & View
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
