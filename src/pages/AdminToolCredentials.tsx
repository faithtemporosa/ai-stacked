import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/use-admin";
import { useNavigate } from "react-router-dom";
import AdminHeader from "@/components/AdminHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ArrowLeft, Save, X, Key, Upload } from "lucide-react";
import { Link } from "react-router-dom";
import { toolCredentialMap, clearToolConfigCache, type CredentialField } from "@/config/toolCredentials";

interface ToolCredentialConfig {
  id: string;
  tool_key: string;
  display_name: string;
  help_text: string | null;
  fields: CredentialField[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface FieldFormData {
  key: string;
  label: string;
  type: "text" | "password" | "email";
  required: boolean;
  placeholder: string;
}

const AdminToolCredentials = () => {
  const { isAdmin, loading: isAdminLoading } = useAdmin();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<ToolCredentialConfig | null>(null);
  const [formData, setFormData] = useState({
    tool_key: "",
    display_name: "",
    help_text: "",
    is_active: true,
  });
  const [fields, setFields] = useState<FieldFormData[]>([]);

  // Fetch tool configs
  const { data: toolConfigs, isLoading } = useQuery({
    queryKey: ["tool-credential-configs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tool_credential_configs")
        .select("*")
        .order("display_name");
      
      if (error) throw error;
      // Cast the JSONB fields properly
      return (data || []).map(item => ({
        ...item,
        fields: (item.fields as unknown as CredentialField[]) || [],
      })) as ToolCredentialConfig[];
    },
    enabled: isAdmin,
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: {
      id?: string;
      tool_key: string;
      display_name: string;
      help_text: string | null;
      fields: CredentialField[];
      is_active: boolean;
    }) => {
      const payload = {
        tool_key: data.tool_key.toLowerCase().trim(),
        display_name: data.display_name,
        help_text: data.help_text || null,
        fields: JSON.parse(JSON.stringify(data.fields)),
        is_active: data.is_active,
      };

      if (data.id) {
        const { error } = await supabase
          .from("tool_credential_configs")
          .update(payload)
          .eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("tool_credential_configs")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      clearToolConfigCache();
      queryClient.invalidateQueries({ queryKey: ["tool-credential-configs"] });
      toast.success(editingTool ? "Tool updated successfully" : "Tool created successfully");
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save tool");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("tool_credential_configs")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      clearToolConfigCache();
      queryClient.invalidateQueries({ queryKey: ["tool-credential-configs"] });
      toast.success("Tool deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete tool");
    },
  });

  // Seed from static config
  const seedMutation = useMutation({
    mutationFn: async () => {
      const entries = Object.entries(toolCredentialMap).filter(([key]) => key !== 'default');
      
      for (const [key, config] of entries) {
        const { error } = await supabase
          .from("tool_credential_configs")
          .upsert({
            tool_key: key,
            display_name: config.displayName,
            help_text: config.helpText || null,
            fields: JSON.parse(JSON.stringify(config.fields)),
            is_active: true,
          }, { onConflict: 'tool_key' });
        
        if (error) {
          console.error(`Error seeding ${key}:`, error);
        }
      }
    },
    onSuccess: () => {
      clearToolConfigCache();
      queryClient.invalidateQueries({ queryKey: ["tool-credential-configs"] });
      toast.success("Successfully imported tool configurations from code");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to seed tools");
    },
  });

  const resetForm = () => {
    setFormData({
      tool_key: "",
      display_name: "",
      help_text: "",
      is_active: true,
    });
    setFields([]);
    setEditingTool(null);
  };

  const openEditDialog = (tool: ToolCredentialConfig) => {
    setEditingTool(tool);
    setFormData({
      tool_key: tool.tool_key,
      display_name: tool.display_name,
      help_text: tool.help_text || "",
      is_active: tool.is_active,
    });
    setFields(tool.fields.map(f => ({
      key: f.key,
      label: f.label,
      type: f.type,
      required: f.required,
      placeholder: f.placeholder || "",
    })));
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const addField = () => {
    setFields([...fields, { key: "", label: "", type: "text", required: true, placeholder: "" }]);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const updateField = (index: number, updates: Partial<FieldFormData>) => {
    setFields(fields.map((f, i) => i === index ? { ...f, ...updates } : f));
  };

  const handleSubmit = () => {
    if (!formData.tool_key || !formData.display_name) {
      toast.error("Tool key and display name are required");
      return;
    }

    if (fields.length === 0) {
      toast.error("At least one credential field is required");
      return;
    }

    const invalidFields = fields.filter(f => !f.key || !f.label);
    if (invalidFields.length > 0) {
      toast.error("All fields must have a key and label");
      return;
    }

    saveMutation.mutate({
      id: editingTool?.id,
      tool_key: formData.tool_key,
      display_name: formData.display_name,
      help_text: formData.help_text || null,
      fields: fields.map(f => ({
        key: f.key,
        label: f.label,
        type: f.type,
        required: f.required,
        placeholder: f.placeholder || undefined,
      })),
      is_active: formData.is_active,
    });
  };

  if (isAdminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAdmin) {
    navigate("/");
    return null;
  }

  return (
    <>
      <AdminHeader />
      <div className="min-h-screen bg-background pt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link to="/admin">
                  <Button variant="outline" size="icon">
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold">Tool Credential Mappings</h1>
                <p className="text-muted-foreground">
                  Manage which credentials are required for each platform/tool
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => seedMutation.mutate()}
                disabled={seedMutation.isPending}
              >
                <Upload className="w-4 h-4 mr-2" />
                {seedMutation.isPending ? "Importing..." : "Import from Code"}
              </Button>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={openCreateDialog}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Tool
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingTool ? "Edit Tool" : "Add New Tool"}
                    </DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-6 py-4">
                    {/* Basic Info */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Tool Key *</Label>
                        <Input
                          value={formData.tool_key}
                          onChange={(e) => setFormData({ ...formData, tool_key: e.target.value })}
                          placeholder="e.g., gmail, linkedin"
                          disabled={!!editingTool}
                        />
                        <p className="text-xs text-muted-foreground">
                          Lowercase identifier used for matching
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>Display Name *</Label>
                        <Input
                          value={formData.display_name}
                          onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                          placeholder="e.g., Gmail, LinkedIn"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Help Text</Label>
                      <Textarea
                        value={formData.help_text}
                        onChange={(e) => setFormData({ ...formData, help_text: e.target.value })}
                        placeholder="Optional instructions for users..."
                        rows={2}
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={formData.is_active}
                        onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                      />
                      <Label>Active (visible in credential forms)</Label>
                    </div>

                    {/* Credential Fields */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-lg font-semibold">Credential Fields</Label>
                        <Button type="button" variant="outline" size="sm" onClick={addField}>
                          <Plus className="w-4 h-4 mr-1" /> Add Field
                        </Button>
                      </div>

                      {fields.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded">
                          No fields added. Click "Add Field" to create credential fields.
                        </p>
                      )}

                      {fields.map((field, index) => (
                        <Card key={index} className="p-4 space-y-3">
                          <div className="flex justify-between items-start">
                            <span className="text-sm font-medium">Field {index + 1}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeField(index)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Field Key *</Label>
                              <Input
                                value={field.key}
                                onChange={(e) => updateField(index, { key: e.target.value })}
                                placeholder="e.g., email, password"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Label *</Label>
                              <Input
                                value={field.label}
                                onChange={(e) => updateField(index, { label: e.target.value })}
                                placeholder="e.g., Email Address"
                              />
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Type</Label>
                              <Select
                                value={field.type}
                                onValueChange={(value) => updateField(index, { type: value as any })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="text">Text</SelectItem>
                                  <SelectItem value="password">Password</SelectItem>
                                  <SelectItem value="email">Email</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Placeholder</Label>
                              <Input
                                value={field.placeholder}
                                onChange={(e) => updateField(index, { placeholder: e.target.value })}
                                placeholder="Optional..."
                              />
                            </div>
                            <div className="flex items-end gap-2 pb-1">
                              <Switch
                                checked={field.required}
                                onCheckedChange={(checked) => updateField(index, { required: checked })}
                              />
                              <Label className="text-xs">Required</Label>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-4 border-t">
                      <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
                        <Save className="w-4 h-4 mr-2" />
                        {saveMutation.isPending ? "Saving..." : "Save Tool"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Tools Table */}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tool</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Fields</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : toolConfigs?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <div className="space-y-2">
                        <Key className="w-8 h-8 mx-auto text-muted-foreground" />
                        <p className="text-muted-foreground">No tool configurations yet</p>
                        <Button variant="outline" size="sm" onClick={() => seedMutation.mutate()}>
                          Import from Code Config
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  toolConfigs?.map((tool) => (
                    <TableRow key={tool.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{tool.display_name}</p>
                          {tool.help_text && (
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {tool.help_text}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-sm bg-muted px-2 py-1 rounded">
                          {tool.tool_key}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {tool.fields.slice(0, 3).map((field, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {field.label}
                            </Badge>
                          ))}
                          {tool.fields.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{tool.fields.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={tool.is_active ? "default" : "secondary"}>
                          {tool.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(tool)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm("Delete this tool configuration?")) {
                                deleteMutation.mutate(tool.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      </div>
    </div>
    </>
  );
};

export default AdminToolCredentials;
