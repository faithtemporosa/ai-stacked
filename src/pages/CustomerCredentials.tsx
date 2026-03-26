// @ts-nocheck
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../integrations/supabase/client";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Lock, Shield } from "lucide-react";
import { CREDENTIAL_TYPES, encryptCredential } from "../utils/credentialsEncryption";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";

interface Credential {
  id: string;
  tool_name: string;
  credential_type: string;
  connection_notes: string;
  tags: string[];
  is_valid: boolean;
  created_at: string;
  updated_at: string;
}

export default function CustomerCredentials() {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Form state
  const [toolName, setToolName] = useState("");
  const [credentialType, setCredentialType] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [connectionNotes, setConnectionNotes] = useState("");
  const [extraFields, setExtraFields] = useState("");

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
      return;
    }
    setUser(session.user);
    loadCredentials();
  }

  async function loadCredentials() {
    try {
      const { data, error } = await supabase
        .from('customer_credentials')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCredentials(data || []);
    } catch (error) {
      console.error('Error loading credentials:', error);
      toast.error('Failed to load credentials');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!user) {
      toast.error('You must be logged in');
      return;
    }

    if (!toolName || !credentialType) {
      toast.error('Tool name and credential type are required');
      return;
    }

    try {
      const credentialData = await encryptCredential({
        tool_name: toolName,
        credential_type: credentialType,
        username: username || undefined,
        password: password || undefined,
        api_key: apiKey || undefined,
        extra_fields: extraFields ? JSON.parse(extraFields) : undefined,
        connection_notes: connectionNotes,
        tags: []
      });

      // Call edge function to encrypt and store credential
      const { data, error } = await supabase.functions.invoke('create-credential', {
        body: credentialData
      });

      if (error) throw error;

      toast.success('Credential added successfully and encrypted');
      resetForm();
      setShowAddForm(false);
      loadCredentials();
    } catch (error) {
      console.error('Error adding credential:', error);
      toast.error('Failed to add credential');
    }
  }

  function resetForm() {
    setToolName("");
    setCredentialType("");
    setUsername("");
    setPassword("");
    setApiKey("");
    setConnectionNotes("");
    setExtraFields("");
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this credential?')) return;

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">My Credentials</h1>
            <p className="text-muted-foreground">
              Securely manage your automation tool credentials
            </p>
          </div>
          <Button onClick={() => setShowAddForm(true)} size="lg">
            <Plus className="mr-2 h-4 w-4" />
            Add Credential
          </Button>
        </div>

        <div className="grid gap-6">
          {credentials.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg text-muted-foreground">
                  No credentials stored yet. Add your first credential to get started.
                </p>
              </CardContent>
            </Card>
          ) : (
            credentials.map((cred) => (
              <Card key={cred.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Lock className="h-5 w-5 text-primary" />
                        {cred.tool_name}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        Type: {cred.credential_type.replace(/_/g, ' ').toUpperCase()}
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(cred.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {cred.connection_notes && (
                    <p className="text-sm text-muted-foreground mb-4">
                      {cred.connection_notes}
                    </p>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={cred.is_valid ? "default" : "destructive"}>
                      {cred.is_valid ? 'Valid' : 'Invalid'}
                    </Badge>
                    {cred.tags.map((tag, idx) => (
                      <Badge key={idx} variant="outline">{tag}</Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-4">
                    Added: {new Date(cred.created_at).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Credential</DialogTitle>
              <DialogDescription>
                Your credentials are encrypted before storage using AES-256 encryption
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="toolName">Tool Name *</Label>
                <Input
                  id="toolName"
                  value={toolName}
                  onChange={(e) => setToolName(e.target.value)}
                  placeholder="e.g., Google Workspace, WordPress Site"
                  required
                />
              </div>

              <div>
                <Label htmlFor="credentialType">Credential Type *</Label>
                <Select value={credentialType} onValueChange={setCredentialType} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {CREDENTIAL_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="username">Username / Email</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="username@example.com"
                  autoComplete="off"
                />
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </div>

              <div>
                <Label htmlFor="apiKey">API Key / Token</Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  autoComplete="off"
                />
              </div>

              <div>
                <Label htmlFor="extraFields">Extra Fields (JSON)</Label>
                <Textarea
                  id="extraFields"
                  value={extraFields}
                  onChange={(e) => setExtraFields(e.target.value)}
                  placeholder='{"client_id": "...", "client_secret": "..."}'
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="connectionNotes">Connection Notes</Label>
                <Textarea
                  id="connectionNotes"
                  value={connectionNotes}
                  onChange={(e) => setConnectionNotes(e.target.value)}
                  placeholder="Any special instructions or notes..."
                  rows={3}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  <Shield className="mr-2 h-4 w-4" />
                  Save Encrypted
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
