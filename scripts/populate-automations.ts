import { automations } from "../src/data/automations";
import type { N8NWorkflow } from "../src/data/n8n-workflows";

// Generate SQL INSERT statements for all automations
function generateInsertStatements() {
  const statements: string[] = [];
  
  automations.forEach((automation) => {
    // All automations are $99
    const price = 99;
    
    const escapedName = automation.name.replace(/'/g, "''");
    const escapedDescription = automation.description.replace(/'/g, "''");
    const escapedCategory = automation.category.replace(/'/g, "''");
    const escapedFeatures = automation.features.map(f => f.replace(/'/g, "''"));
    
    const statement = `INSERT INTO automations (id, name, description, category, price, features)
VALUES ('${automation.id}', '${escapedName}', '${escapedDescription}', '${escapedCategory}', ${price}, ARRAY[${escapedFeatures.map(f => `'${f}'`).join(', ')}])
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  price = EXCLUDED.price,
  features = EXCLUDED.features,
  last_updated = now();`;
    
    statements.push(statement);
  });
  
  return statements.join('\n\n');
}

console.log(generateInsertStatements());
console.log(`\n\n-- Total automations: ${automations.length}`);
