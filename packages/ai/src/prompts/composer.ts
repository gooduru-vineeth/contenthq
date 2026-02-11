export interface ComposePromptOptions {
  template: string;
  variables: Record<string, string>;
  personaFragments?: string[];
  customVariables?: Record<string, string>;
}

export function composePrompt(options: ComposePromptOptions): string {
  const { template, variables, personaFragments, customVariables } = options;

  let result = template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    return variables[key] ?? match;
  });

  if (personaFragments && personaFragments.length > 0) {
    result += "\n\n## Persona & Style\n";
    for (const fragment of personaFragments) {
      result += `\n- ${fragment}`;
    }
  }

  if (customVariables && Object.keys(customVariables).length > 0) {
    result += "\n\n## Additional Instructions\n";
    for (const [key, value] of Object.entries(customVariables)) {
      result += `\n- ${key}: ${value}`;
    }
  }

  return result;
}

export function extractVariables(template: string): string[] {
  const matches = template.matchAll(/\{\{(\w+)\}\}/g);
  return [...new Set([...matches].map((m) => m[1]))];
}
