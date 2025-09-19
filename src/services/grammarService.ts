
import { supabase } from '@/integrations/supabase/client';

// Simple offline grammar checker with basic rules
export class GrammarService {
  private static rules = [
    { pattern: /\bi\b/g, replacement: 'I', description: 'Capitalize "I"' },
    { pattern: /\bthe the\b/gi, replacement: 'the', description: 'Remove duplicate "the"' },
    { pattern: /\band and\b/gi, replacement: 'and', description: 'Remove duplicate "and"' },
    { pattern: /\bdont\b/gi, replacement: "don't", description: 'Add apostrophe to "dont"' },
    { pattern: /\bcant\b/gi, replacement: "can't", description: 'Add apostrophe to "cant"' },
    { pattern: /\bwont\b/gi, replacement: "won't", description: 'Add apostrophe to "wont"' },
    { pattern: /\bits\s/gi, replacement: "it's ", description: 'Fix "its" to "it\'s"' },
    { pattern: /\byour\s(?=welcome|right|wrong)/gi, replacement: "you're ", description: 'Fix "your" to "you\'re"' },
    { pattern: /\bthere\s(?=happy|sad|excited)/gi, replacement: "they're ", description: 'Fix "there" to "they\'re"' },
    { pattern: /\s+/g, replacement: ' ', description: 'Remove extra spaces' },
    { pattern: /^\s+|\s+$/g, replacement: '', description: 'Trim whitespace' }
  ];

  static async checkGrammar(text: string): Promise<{ correctedText: string; suggestions: string[] }> {
    // Simulate processing time for better UX
    await new Promise(resolve => setTimeout(resolve, 800));
    
    let correctedText = text;
    const suggestions: string[] = [];
    
    // Apply grammar rules
    this.rules.forEach(rule => {
      const matches = text.match(rule.pattern);
      if (matches && matches.length > 0) {
        correctedText = correctedText.replace(rule.pattern, rule.replacement);
        suggestions.push(`${rule.description} (${matches.length} fix${matches.length > 1 ? 'es' : ''})`);
      }
    });
    
    // Basic sentence structure checks
    const sentences = correctedText.split(/[.!?]+/).filter(s => s.trim());
    sentences.forEach((sentence, index) => {
      const trimmed = sentence.trim();
      if (trimmed && !trimmed.match(/^[A-Z]/)) {
        const fixed = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
        correctedText = correctedText.replace(trimmed, fixed);
        suggestions.push(`Capitalized sentence ${index + 1}`);
      }
    });
    
    // Check for common spelling errors
    const spellChecks = [
      { wrong: /\brecieve\b/gi, correct: 'receive', desc: 'Fixed "recieve" to "receive"' },
      { wrong: /\boccur\b/gi, correct: 'occur', desc: 'Fixed common spelling' },
      { wrong: /\bseperate\b/gi, correct: 'separate', desc: 'Fixed "seperate" to "separate"' },
      { wrong: /\bdefinately\b/gi, correct: 'definitely', desc: 'Fixed "definately" to "definitely"' }
    ];
    
    spellChecks.forEach(check => {
      const matches = correctedText.match(check.wrong);
      if (matches) {
        correctedText = correctedText.replace(check.wrong, check.correct);
        suggestions.push(check.desc);
      }
    });
    
    if (suggestions.length === 0) {
      suggestions.push('Text looks good! No grammar issues found.');
    }
    
    return { correctedText, suggestions };
  }

  static async enhancedGrammarCheck(text: string): Promise<{ correctedText: string; suggestions: string[] }> {
    // For now, use the local grammar checker
    // In the future, this could call an AI service for more advanced checking
    return this.checkGrammar(text);
  }
}
