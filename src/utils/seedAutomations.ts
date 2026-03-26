// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";
import { parseAutomationsCatalog } from "@/utils/parseAutomationsCatalog";
import { errorLogger } from "@/utils/errorLogger";

/**
 * Seeds the automations table with all parsed automations from CSV
 * Uses edge function with service role permissions to bypass RLS
 */
export async function seedAutomationsDatabase() {
  const automations = await parseAutomationsCatalog();
  
  errorLogger.logInfo(`Starting to seed ${automations.length} automations...`);
  
  // Map automations to database format
  const dbAutomations = automations.map(automation => {
    // All automations are $99
    const price = 99;
    
    return {
      id: automation.id,
      name: automation.name,
      description: automation.description,
      category: automation.category,
      price: price,
      features: automation.features
    };
  });
  
  // Call edge function to seed automations
  const { data, error } = await supabase.functions.invoke('seed-automations', {
    body: { automations: dbAutomations }
  });
  
  if (error) {
    errorLogger.logError('Error calling edge function', error);
    throw new Error(error.message || 'Failed to seed automations');
  }
  
  if (!data.success) {
    throw new Error('Seeding failed');
  }
  
  errorLogger.logInfo(`\n✅ Seeding complete!`);
  errorLogger.logInfo(`   Success: ${data.successCount} automations`);
  errorLogger.logInfo(`   Errors: ${data.errorCount} automations`);
  
  return { successCount: data.successCount, errorCount: data.errorCount };
}

// Export a function to run from console
export async function runSeed() {
  try {
    const result = await seedAutomationsDatabase();
    return result;
  } catch (error) {
    errorLogger.logError('Seeding failed', error);
    throw error;
  }
}
