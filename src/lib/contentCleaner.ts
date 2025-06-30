// Content cleaning utilities for removing JSON artifacts from story messages

export function cleanStoryContent(content: string): string {
  if (!content || typeof content !== 'string') {
    return content || '';
  }

  let cleaned = content;

  // Check if this looks like it contains JSON artifacts
  const hasJsonArtifacts = /("response"|"narration"|"suggested_actions"|"memory_updates"|"world_state"|\{[\s\S]*"[^"]*":\s*[\s\S]*\})/i.test(cleaned);
  
  if (!hasJsonArtifacts) {
    return cleaned; // No cleaning needed
  }

  console.warn('JSON artifacts detected in story content, cleaning...', cleaned.substring(0, 100));

  // Remove JSON wrapper structures
  cleaned = cleaned.replace(/^\s*\{[\s\S]*?"(response|narration)"\s*:\s*"/, '');
  cleaned = cleaned.replace(/",?\s*"[^"]*"\s*:[\s\S]*\}\s*$/, '');

  // Remove specific JSON field patterns
  cleaned = cleaned.replace(/("(response|narration|suggested_actions|memory_updates|world_state|relationship_updates)"\s*:\s*"?)/gi, '');

  // Remove JSON object structures that shouldn't be in narrative
  cleaned = cleaned.replace(/\{[^}]*"(response|narration|suggested_actions|memory_updates|world_state|relationship_updates)"[^}]*\}/gi, '');

  // Clean up escaped characters
  cleaned = cleaned.replace(/\\"/g, '"');
  cleaned = cleaned.replace(/\\n/g, '\n');
  cleaned = cleaned.replace(/\\t/g, ' ');
  cleaned = cleaned.replace(/\\\\/g, '\\');

  // Remove JSON punctuation at start/end
  cleaned = cleaned.replace(/^[\s",\{\[]*/g, '');
  cleaned = cleaned.replace(/[\s",\}\]]*$/g, '');

  // Remove any lines that are pure JSON
  cleaned = cleaned.split('\n')
    .filter(line => {
      const trimmed = line.trim();
      // Remove lines that look like JSON fields
      return !(
        /^"[^"]*":\s*/.test(trimmed) ||
        /^\{.*\}$/.test(trimmed) ||
        /^\[.*\]$/.test(trimmed) ||
        trimmed === '{' ||
        trimmed === '}' ||
        trimmed === '[' ||
        trimmed === ']' ||
        trimmed === ',' ||
        /^"(response|narration|suggested_actions)"/.test(trimmed)
      );
    })
    .join('\n');

  // Final cleanup
  cleaned = cleaned.trim();

  // If we accidentally removed everything, return a fallback
  if (!cleaned || cleaned.length < 5) {
    console.warn('Content cleaning removed too much, using fallback');
    return 'The story continues...';
  }

  // Preserve dialogue with curly braces but remove structural JSON
  // Only remove curly braces if they're clearly JSON, not dialogue
  cleaned = cleaned.replace(/\{[^}]*"[^"]*":[^}]*\}/g, '');

  return cleaned;
}

export function isContentClean(content: string): boolean {
  if (!content) return true;
  
  const jsonIndicators = [
    /"(response|narration|suggested_actions|memory_updates|world_state|relationship_updates)"/i,
    /^\s*[\{\[]/,
    /[\}\]]\s*$/,
    /\{[^}]*"[^"]*":\s*[^}]*\}/
  ];
  
  return !jsonIndicators.some(pattern => pattern.test(content));
}

export function validateAndCleanContent(content: string): string {
  if (isContentClean(content)) {
    return content;
  }
  
  return cleanStoryContent(content);
}