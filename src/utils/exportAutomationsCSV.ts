import { parseAutomationsCatalog } from "./parseAutomationsCatalog";
import type { Automation } from "../data/automations";

/**
 * Converts automations data to CSV format
 */
export async function convertAutomationsToCSV(): Promise<string> {
  const automations = await parseAutomationsCatalog();
  
  // CSV Headers
  const headers = [
    'ID',
    'Name',
    'Description',
    'Category',
    'Hours Saved',
    'Monthly Savings',
    'Setup Time',
    'ROI Level',
    'Price (Estimated)',
    'Tools',
    'Features',
    'Problem Statement',
    'Solution',
    'Use Cases',
    'Requirements',
    'Workflow URL'
  ];

  // Create CSV rows
  const rows = automations.map(automation => {
    // Calculate estimated price
    let price = 0;
    if (automation.workflowUrl) {
      // All automations are $150 flat pricing
      price = 150;
    } else {
      price = 200;
    }

    return [
      automation.id,
      `"${automation.name.replace(/"/g, '""')}"`,
      `"${automation.description.replace(/"/g, '""')}"`,
      automation.category,
      automation.hoursSaved,
      automation.monthlySavings,
      automation.setupTime,
      automation.roiLevel,
      price,
      `"${automation.tools.join(', ')}"`,
      `"${automation.features.join('; ')}"`,
      `"${automation.problemStatement.replace(/"/g, '""')}"`,
      `"${automation.solution.replace(/"/g, '""')}"`,
      `"${automation.useCases.join('; ')}"`,
      `"${automation.requirements.join('; ')}"`,
      automation.workflowUrl || ''
    ].join(',');
  });

  // Combine headers and rows
  return [headers.join(','), ...rows].join('\n');
}

/**
 * Downloads the automations data as a CSV file
 */
export async function downloadAutomationsCSV(): Promise<void> {
  const csv = await convertAutomationsToCSV();
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `automations-catalog-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}
