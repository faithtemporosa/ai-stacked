// @ts-nocheck
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { useToast } from "../hooks/use-toast";
import { supabase } from "../integrations/supabase/client";
import { Loader2, Info } from "lucide-react";
import { 
  extractToolsFromFeatures, 
  getToolCredentialConfig,
  preloadToolConfigs,
  type CredentialField 
} from "../config/toolCredentials";

interface PurchasedAutomation {
  id: string;
  name: string;
  description: string | null;
  category: string;
  features?: string[];
}

interface CredentialsFormProps {
  automations: PurchasedAutomation[];
}

// Get all credential fields for an automation based on its detected tools
const getCredentialFieldsForAutomation = (automation: PurchasedAutomation): {
  tools: string[];
  fields: { tool: string; field: CredentialField }[];
} => {
  const tools = extractToolsFromFeatures(automation.features);
  
  if (tools.length === 0) {
    // Default generic fields if no specific tools detected
    const defaultConfig = getToolCredentialConfig('default');
    return {
      tools: [],
      fields: defaultConfig.fields.map(field => ({ tool: 'default', field })),
    };
  }
  
  // Get credential fields for each detected tool
  const allFields: { tool: string; field: CredentialField }[] = [];
  
  tools.forEach(tool => {
    const config = getToolCredentialConfig(tool);
    config.fields.forEach(field => {
      allFields.push({ tool, field });
    });
  });
  
  return { tools, fields: allFields };
};

export const CredentialsForm = ({ automations }: CredentialsFormProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [configsLoaded, setConfigsLoaded] = useState(false);

  // Preload tool configs from database on mount
  useEffect(() => {
    preloadToolConfigs().then(() => setConfigsLoaded(true));
  }, []);

  // Build dynamic schema based on automations
  const buildFormSchema = () => {
    const schemaFields: Record<string, z.ZodTypeAny> = {};
    
    automations.forEach((automation) => {
      const { fields } = getCredentialFieldsForAutomation(automation);
      fields.forEach(({ tool, field }) => {
        const fieldKey = `${automation.id}_${tool}_${field.key}`;
        if (field.required) {
          schemaFields[fieldKey] = z.string()
            .trim()
            .min(1, { message: `${field.label} is required` })
            .max(500, { message: `${field.label} must be less than 500 characters` });
        } else {
          schemaFields[fieldKey] = z.string().trim().max(500).optional().or(z.literal(''));
        }
      });
    });

    schemaFields.additional_notes = z.string().trim().max(2000).optional().or(z.literal(''));

    return z.object(schemaFields);
  };

  const formSchema = buildFormSchema();
  type FormData = z.infer<typeof formSchema>;

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to submit your credentials",
          variant: "destructive",
        });
        return;
      }

      // Structure the credentials by automation
      const structuredCredentials: Record<string, any> = {};
      
      automations.forEach((automation) => {
        const { tools, fields } = getCredentialFieldsForAutomation(automation);
        const automationCredentials: Record<string, string> = {};
        
        fields.forEach(({ tool, field }) => {
          const fieldKey = `${automation.id}_${tool}_${field.key}`;
          const value = data[fieldKey as keyof FormData];
          if (value) {
            automationCredentials[`${tool}_${field.key}`] = value as string;
          }
        });
        
        structuredCredentials[automation.id] = {
          automation_name: automation.name,
          tools_detected: tools,
          credentials: automationCredentials,
        };
      });

      // Save to database (you may want to create a new table for this)
      const { error } = await supabase
        .from('contact_submissions')
        .insert({
          name: user.email || 'User',
          email: user.email || '',
          message: JSON.stringify({
            type: 'credentials_submission',
            automations: structuredCredentials,
            additional_notes: data.additional_notes || '',
          }),
          status: 'pending',
        });

      if (error) throw error;

      toast({
        title: "Credentials Submitted!",
        description: "Our automation engineer will begin building your automations within 24-72 hours.",
      });

      // Clear form after successful submission
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
    } catch (error) {
      console.error('Error submitting credentials:', error);
      toast({
        title: "Submission Failed",
        description: "There was an error submitting your credentials. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="p-6 bg-card/50 backdrop-blur-sm">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Provide Your Credentials
        </h2>
        <p className="text-muted-foreground">
          Enter your API keys and account credentials below. All information is securely encrypted.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {automations.map((automation) => {
          const { tools, fields } = getCredentialFieldsForAutomation(automation);
          
          // Group fields by tool for better organization
          const toolGroups = new Map<string, { tool: string; field: CredentialField }[]>();
          fields.forEach(item => {
            const existing = toolGroups.get(item.tool) || [];
            existing.push(item);
            toolGroups.set(item.tool, existing);
          });
          
          return (
            <div key={automation.id} className="border border-border rounded-lg p-6 space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {automation.name}
                </h3>
                {tools.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Required platforms: {tools.map(t => getToolCredentialConfig(t).displayName).join(', ')}
                  </p>
                )}
              </div>
              
              {Array.from(toolGroups.entries()).map(([toolKey, toolFields]) => {
                const toolConfig = getToolCredentialConfig(toolKey);
                
                return (
                  <div key={toolKey} className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-border pb-2">
                      <h4 className="font-medium text-foreground">{toolConfig.displayName}</h4>
                      {toolConfig.helpText && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Info className="w-3 h-3" />
                          {toolConfig.helpText}
                        </span>
                      )}
                    </div>
                    
                    {toolFields.map(({ field }) => {
                      const fieldKey = `${automation.id}_${toolKey}_${field.key}` as keyof FormData;
                      const error = errors[fieldKey];
                      
                      return (
                        <div key={field.key} className="space-y-2">
                          <Label htmlFor={fieldKey} className="text-foreground">
                            {field.label}
                            {field.required && <span className="text-destructive ml-1">*</span>}
                          </Label>
                          <Input
                            id={fieldKey}
                            type={field.type}
                            placeholder={field.placeholder || `Enter your ${field.label.toLowerCase()}`}
                            {...register(fieldKey)}
                            className={error ? 'border-destructive' : ''}
                          />
                          {error && (
                            <p className="text-sm text-destructive">{error.message as string}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        })}

        <div className="space-y-2">
          <Label htmlFor="additional_notes" className="text-foreground">
            Additional Notes or Questions (Optional)
          </Label>
          <Textarea
            id="additional_notes"
            placeholder="Any additional information, preferences, or questions for the automation engineer..."
            rows={4}
            {...register('additional_notes')}
          />
          {errors.additional_notes && (
            <p className="text-sm text-destructive">{errors.additional_notes.message}</p>
          )}
        </div>

        <Button 
          type="submit" 
          size="lg" 
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            'Submit Credentials'
          )}
        </Button>

        <p className="text-sm text-muted-foreground text-center">
          By submitting, you authorize our automation engineer to access these accounts for setup purposes only.
        </p>
      </form>
    </Card>
  );
};
