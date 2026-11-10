import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

// Shared Gemini client with telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// AI Auto-Labeling endpoint
app.post('/api/ai/suggest-tags', async (req, res) => {
  try {
    const { contactName, transcriptSnippet } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(200).json({
        tags: ['System Design', 'Verified Data'],
        confidence: 0.85,
        reasoning: 'Default fallback (API key unconfigured)',
        source: 'heuristic',
      });
    }

    const prompt = `Analyze this chat transcript with "${contactName || 'Contact'}" and provide 2 to 4 concise, high-value categorization tags (e.g. "System Design", "Contract / Terms", "Urgent Action", "AI Research", "Security Audit", "Finance", "Code Review").

Transcript excerpt:
${transcriptSnippet || 'No content provided'}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: 'You are an intelligent knowledge base classifier. Return relevant tags in JSON format.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'List of 2 to 4 short classification tags (e.g. "System Design", "Security Audit", "Urgent Action")',
            },
            reasoning: {
              type: Type.STRING,
              description: 'Brief 1-sentence reasoning for the tags',
            },
            confidence: {
              type: Type.NUMBER,
              description: 'Confidence score between 0.0 and 1.0',
            },
          },
          required: ['tags'],
        },
      },
    });

    const jsonStr = (response.text ?? '{}').trim();
    const parsed = JSON.parse(jsonStr);

    return res.status(200).json({
      tags: parsed.tags || ['Verified Data'],
      confidence: parsed.confidence || 0.95,
      reasoning: parsed.reasoning || 'Identified key conversation topics and intent',
      source: 'gemini',
    });
  } catch (error: any) {
    console.warn('Gemini auto-label error (falling back):', error?.message || error);
    return res.status(200).json({
      tags: ['System Design', 'Urgent Action'],
      confidence: 0.8,
      reasoning: 'Fallback heuristic analysis',
      source: 'heuristic',
    });
  }
});

// AI Quick Peek (One-Sentence Summary) endpoint
app.post('/api/ai/quick-peek', async (req, res) => {
  try {
    const { contactName, transcriptSnippet } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(200).json({
        summary: `Discussion with ${contactName || 'contact'} focusing on key project milestones and operational action items.`,
        source: 'heuristic',
      });
    }

    const prompt = `Read the following chat thread with "${contactName || 'Contact'}" and generate a concise, informative, exactly ONE-SENTENCE summary that captures the essence of the conversation, key decisions, or current status for a quick executive overview.

Chat Transcript Excerpt:
${transcriptSnippet || 'No content provided'}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: 'You are an executive assistant. Generate exactly ONE clear, punchy, informative single sentence summarizing the conversation essence.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: {
              type: Type.STRING,
              description: 'A punchy, single-sentence summary of the conversation.',
            },
          },
          required: ['summary'],
        },
      },
    });

    const jsonStr = (response.text ?? '{}').trim();
    const parsed = JSON.parse(jsonStr);

    return res.status(200).json({
      summary: parsed.summary || `Conversation with ${contactName} regarding project deliverables and coordination.`,
      source: 'gemini',
    });
  } catch (error: any) {
    console.warn('Gemini quick-peek error (falling back):', error?.message || error);
    return res.status(200).json({
      summary: `Conversation with ${req.body.contactName || 'contact'} covering active topics and next steps.`,
      source: 'heuristic',
    });
  }
});

// Mount Vite middleware in development
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[OmniChat Vault] Server listening on port ${PORT}`);
  });
}

startServer();
