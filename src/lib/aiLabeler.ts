/**
 * AI Auto-Labeling Engine
 * Analyzes chat message transcripts and suggests semantic category tags.
 * Calls server-side Gemini 3.8 Flash with smart heuristic fallback.
 */

export interface SuggestedTagResult {
  tags: string[];
  confidence: number;
  reasoning?: string;
  source: 'gemini' | 'heuristic';
}

/**
 * Intelligent semantic topic analyzer (heuristic fallback)
 */
function analyzeTopicsHeuristically(messages: Array<{ sender: string; content: string }>): string[] {
  const allText = messages.map(m => m.content).join(' ').toLowerCase();
  const matchedTags = new Set<string>();

  // Technical & System Architecture
  if (/(architecture|database|replica|latency|cache|microservice|docker|kubernetes|postgres|sql|api|endpoint|cluster|failover|sla|benchmark)/i.test(allText)) {
    matchedTags.add('System Design');
  }

  // Legal, Compliance, Contracts
  if (/(contract|clause|nda|agreement|legal|compliance|retention|gdpr|terms|license|audit|liability|sign off)/i.test(allText)) {
    matchedTags.add('Contract / Terms');
  }

  // Urgent & Incident Response
  if (/(urgent|asap|outage|p0|incident|emergency|critical|broken|down|failure|blocker|alert|rollback)/i.test(allText)) {
    matchedTags.add('Urgent Action');
  }

  // AI & Machine Learning
  if (/(llm|gemini|gpt|prompt|model|neural|inference|token|embedding|fine-tune|deep research|ai assistant|rag)/i.test(allText)) {
    matchedTags.add('AI Research');
  }

  // Security & Encryption
  if (/(encrypt|aes|cipher|hash|key|pbkdf2|security|vulnerability|auth|token|oauth|permission)/i.test(allText)) {
    matchedTags.add('Security Audit');
  }

  // Financial & Billing
  if (/(invoice|budget|pricing|cost|payment|revenue|subscription|stripe|billing|quote)/i.test(allText)) {
    matchedTags.add('Finance & Billing');
  }

  // Project Management & Sprint
  if (/(sprint|roadmap|deadline|milestone|ticket|jira|delivery|qa|release|launch|sync)/i.test(allText)) {
    matchedTags.add('Project Roadmap');
  }

  // Default fallback if no specific keywords triggered
  if (matchedTags.size === 0) {
    matchedTags.add('Verified Data');
    matchedTags.add('Discussion');
  }

  return Array.from(matchedTags).slice(0, 4);
}

/**
 * Auto-suggest tags using Gemini API or heuristic fallback
 */
export async function suggestTagsForChat(
  contactName: string,
  messages: Array<{ sender: string; content: string }>
): Promise<SuggestedTagResult> {
  // If fewer than 1 message, return quick default
  if (!messages || messages.length === 0) {
    return {
      tags: ['General Chat'],
      confidence: 0.6,
      source: 'heuristic',
    };
  }

  // Try server-side Gemini API route
  try {
    const snippet = messages
      .slice(0, 15)
      .map(m => `${m.sender}: ${m.content.slice(0, 200)}`)
      .join('\n');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4 second timeout

    const response = await fetch('/api/ai/suggest-tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contactName,
        transcriptSnippet: snippet,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data.tags) && data.tags.length > 0) {
        return {
          tags: data.tags.slice(0, 5),
          confidence: data.confidence || 0.95,
          reasoning: data.reasoning,
          source: 'gemini',
        };
      }
    }
  } catch (err) {
    // Graceful fallback to heuristic analysis
  }

  // Fallback to high-quality heuristic analysis
  const fallbackTags = analyzeTopicsHeuristically(messages);
  return {
    tags: fallbackTags,
    confidence: 0.88,
    reasoning: 'Extracted via semantic pattern analysis',
    source: 'heuristic',
  };
}
