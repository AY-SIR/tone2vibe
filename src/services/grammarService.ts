
// Simple offline grammar checker
export class GrammarService {
  private static rules = [
    { pattern: /\bi\b/g, replacement: 'I' },
    { pattern: /\bthe the\b/g, replacement: 'the' },
    { pattern: /\band and\b/g, replacement: 'and' },
    { pattern: /\bdont\b/g, replacement: "don't" },
    { pattern: /\bcant\b/g, replacement: "can't" },
    { pattern: /\bwont\b/g, replacement: "won't" },
    { pattern: /\s+/g, replacement: ' ' },
    { pattern: /^\s+|\s+$/g, replacement: '' }
  ];

  static async checkGrammar(text: string): Promise<{ correctedText: string; suggestions: string[] }> {
    // Simulate processing time (reduced for better UX)
    await new Promise(resolve => setTimeout(resolve, 500));
    
    let correctedText = text;
    const suggestions: string[] = [];
    
    this.rules.forEach(rule => {
      const matches = text.match(rule.pattern);
      if (matches && matches.length > 0) {
        correctedText = correctedText.replace(rule.pattern, rule.replacement);
        suggestions.push(`Fixed ${matches.length} grammar issue(s)`);
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
    
    if (suggestions.length === 0) {
      suggestions.push('No grammar issues found');
    }
    
    return { correctedText, suggestions };
  }
}
