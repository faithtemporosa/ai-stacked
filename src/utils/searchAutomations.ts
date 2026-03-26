import type { Automation } from '../data/automations';

export interface AutomationMatch {
  automation: Automation;
  score: number;
  matchedFields: string[];
}

/**
 * Search automations using keyword matching
 * Returns top 5 most relevant matches
 */
export function searchAutomations(
  query: string,
  automations: Automation[],
  maxResults: number = 5
): AutomationMatch[] {
  if (!query.trim() || automations.length === 0) {
    return [];
  }

  const keywords = query.toLowerCase().split(/\s+/).filter(k => k.length > 2);
  const matches: AutomationMatch[] = [];

  for (const automation of automations) {
    let score = 0;
    const matchedFields: string[] = [];

    // Search in name (highest weight)
    const nameLower = automation.name.toLowerCase();
    for (const keyword of keywords) {
      if (nameLower.includes(keyword)) {
        score += 10;
        if (!matchedFields.includes('name')) matchedFields.push('name');
      }
    }

    // Search in description (high weight)
    const descLower = automation.description.toLowerCase();
    for (const keyword of keywords) {
      if (descLower.includes(keyword)) {
        score += 7;
        if (!matchedFields.includes('description')) matchedFields.push('description');
      }
    }

    // Search in category (medium weight)
    const categoryLower = automation.category.toLowerCase();
    for (const keyword of keywords) {
      if (categoryLower.includes(keyword)) {
        score += 5;
        if (!matchedFields.includes('category')) matchedFields.push('category');
      }
    }

    // Search in features (medium weight)
    for (const feature of automation.features) {
      const featureLower = feature.toLowerCase();
      for (const keyword of keywords) {
        if (featureLower.includes(keyword)) {
          score += 4;
          if (!matchedFields.includes('features')) matchedFields.push('features');
        }
      }
    }

    // Search in problem statement (low weight)
    const problemLower = automation.problemStatement.toLowerCase();
    for (const keyword of keywords) {
      if (problemLower.includes(keyword)) {
        score += 3;
        if (!matchedFields.includes('problem')) matchedFields.push('problem');
      }
    }

    // Search in solution (low weight)
    const solutionLower = automation.solution.toLowerCase();
    for (const keyword of keywords) {
      if (solutionLower.includes(keyword)) {
        score += 3;
        if (!matchedFields.includes('solution')) matchedFields.push('solution');
      }
    }

    // Search in tools (low weight)
    for (const tool of automation.tools) {
      const toolLower = tool.toLowerCase();
      for (const keyword of keywords) {
        if (toolLower.includes(keyword)) {
          score += 2;
          if (!matchedFields.includes('tools')) matchedFields.push('tools');
        }
      }
    }

    if (score > 0) {
      matches.push({ automation, score, matchedFields });
    }
  }

  // Sort by score descending
  matches.sort((a, b) => b.score - a.score);

  // Return top N results
  return matches.slice(0, maxResults);
}

/**
 * Format matches for LLM context
 */
export function formatMatchesForContext(matches: AutomationMatch[]): string {
  if (matches.length === 0) {
    return 'No matching automations found.';
  }

  return matches.map((match, index) => {
    const { automation } = match;
    return `
${index + 1}. ${automation.name}
   Category: ${automation.category}
   Description: ${automation.description}
   Problem: ${automation.problemStatement}
   Solution: ${automation.solution}
   Key Features: ${automation.features.join(', ')}
   Tools Required: ${automation.tools.join(', ')}
   Setup Time: ${automation.setupTime}
   Time Saved: ${automation.hoursSaved} hours/month
   Monthly Savings: $${automation.monthlySavings}
   ROI Level: ${automation.roiLevel}
`.trim();
  }).join('\n\n');
}
