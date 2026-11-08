import { ChatMessage, PlatformType } from '../types';

export interface ExtractedChatResult {
  detectedPlatform: PlatformType;
  contactName: string;
  contactIdentifier?: string;
  totalMessages: number;
  participants: string[];
  messages: ChatMessage[];
  firstDate?: string;
  lastDate?: string;
}

export function detectPlatform(text: string): PlatformType {
  const trimmed = text.trim();

  // WhatsApp patterns
  if (
    /\[\d{1,2}\/\d{1,2}\/\d{2,4},\s*\d{1,2}:\d{2}(:\d{2})?(\s*[AP]M)?\]/i.test(trimmed) ||
    /\d{1,2}\/\d{1,2}\/\d{2,4},\s*\d{1,2}:\d{2}\s*-\s*[^:]+:/i.test(trimmed)
  ) {
    return 'whatsapp';
  }

  // Telegram patterns
  if (/^.*,\s*\[\d{1,2}\.\d{1,2}\.\d{2,4}\s+\d{1,2}:\d{2}\]/m.test(trimmed) || /"type":\s*"personal_chat"/.test(trimmed)) {
    return 'telegram';
  }

  // ChatGPT / AI patterns
  if (/(User|Human|Assistant|ChatGPT|Claude|Gemini):\s*/i.test(trimmed) || /###\s*(User|Assistant)/i.test(trimmed)) {
    return 'chatgpt';
  }

  // Slack patterns
  if (/\b\d{1,2}:\d{2}\s+(AM|PM)\b\s+on\s+/i.test(trimmed) || /\[\d{1,2}:\d{2}\s*(AM|PM)\]\s*[\w\s]+:/i.test(trimmed)) {
    return 'slack';
  }

  // iMessage patterns
  if (/Yesterday\s+\d{1,2}:\d{2}|Today\s+\d{1,2}:\d{2}|Delivered|Read\s+\d{1,2}:\d{2}/i.test(trimmed)) {
    return 'imessage';
  }

  return 'custom';
}

function generateMsgId(): string {
  return 'msg_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
}

export function parseChatTranscript(rawText: string, forcedPlatform?: PlatformType): ExtractedChatResult {
  const platform = forcedPlatform || detectPlatform(rawText);
  const trimmed = rawText.trim();
  const messages: ChatMessage[] = [];
  const participantsSet = new Set<string>();

  // Check if it's raw JSON
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      const parsed = JSON.parse(trimmed);
      const items = Array.isArray(parsed) ? parsed : parsed.messages || parsed.data || [];
      if (Array.isArray(items) && items.length > 0) {
        items.forEach((item: any, idx: number) => {
          const sender = item.sender || item.from || item.author || (item.role === 'user' ? 'You' : item.role === 'assistant' ? 'AI Assistant' : 'Unknown');
          const content = item.text || item.content || item.message || '';
          const timestamp = item.timestamp || item.date || item.created_at || new Date(Date.now() - (items.length - idx) * 60000).toISOString();
          
          if (content.trim()) {
            participantsSet.add(sender);
            messages.push({
              id: item.id || generateMsgId(),
              sender,
              senderRole: sender.toLowerCase() === 'you' || sender.toLowerCase() === 'me' || item.role === 'user' ? 'me' : 'contact',
              content: content.trim(),
              timestamp: new Date(timestamp).toISOString(),
            });
          }
        });

        const participants = Array.from(participantsSet);
        const contact = participants.find(p => p !== 'You' && p !== 'Me' && p !== 'me') || participants[0] || 'Unknown Contact';

        return {
          detectedPlatform: platform,
          contactName: contact,
          totalMessages: messages.length,
          participants,
          messages,
          firstDate: messages[0]?.timestamp,
          lastDate: messages[messages.length - 1]?.timestamp,
        };
      }
    } catch {
      // Continue to regex parsers
    }
  }

  const lines = rawText.split(/\r?\n/);
  let currentSender = 'Unknown';
  let currentTimestamp = new Date().toISOString();
  let currentBuffer: string[] = [];

  const finalizeMessage = () => {
    if (currentBuffer.length > 0) {
      const content = currentBuffer.join('\n').trim();
      // Skip system messages like encryption info or media omitted
      if (
        content &&
        !content.includes('Messages and calls are end-to-end encrypted') &&
        !content.includes('created group')
      ) {
        participantsSet.add(currentSender);
        const isMe = currentSender.toLowerCase() === 'you' || currentSender.toLowerCase() === 'me';
        messages.push({
          id: generateMsgId(),
          sender: currentSender,
          senderRole: isMe ? 'me' : 'contact',
          content,
          timestamp: currentTimestamp,
          metadata: {
            hasAttachment: content.includes('<Media omitted>') || content.includes('[image:') || content.includes('[file:'),
          },
        });
      }
      currentBuffer = [];
    }
  };

  // WhatsApp Android: "12/28/23, 14:32 - Alex Rivera: Hey how's it going?"
  const waAndroidRegex = /^(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)\s*-\s*([^:]+):\s*(.*)$/i;

  // WhatsApp iOS: "[12/28/23, 2:32:15 PM] Alex Rivera: Hey how's it going?"
  const waIosRegex = /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)\]\s*([^:]+):\s*(.*)$/i;

  // Telegram: "Alex Rivera, [12.10.2023 14:32]:" or "Alex, [12/28/23 14:32]"
  const tgRegex = /^([^,]+),\s*\[(\d{1,2}[./]\d{1,2}[./]\d{2,4}\s+\d{1,2}:\d{2}(?::\d{2})?)\]:?\s*(.*)$/i;

  // AI / Dialogue format: "User:" or "Assistant:" or "Name:"
  const aiRegex = /^(User|Human|Assistant|ChatGPT|Claude|Gemini|You|Me|[A-Za-z0-9 _-]{2,25}):\s*(.*)$/i;

  // Slack format: "Alex Rivera [2:32 PM]: message"
  const slackRegex = /^([^[\]:]+)\s*\[(\d{1,2}:\d{2}(?:\s*[AP]M)?)\]:\s*(.*)$/i;

  let approxDateOffset = lines.length;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) {
      if (currentBuffer.length > 0) currentBuffer.push('');
      continue;
    }

    let match: RegExpMatchArray | null = null;
    let sender = '';
    let parsedContent = '';
    let parsedTime = '';

    if ((match = line.match(waAndroidRegex))) {
      finalizeMessage();
      sender = match[3].trim();
      parsedContent = match[4];
      parsedTime = `${match[1]} ${match[2]}`;
    } else if ((match = line.match(waIosRegex))) {
      finalizeMessage();
      sender = match[3].trim();
      parsedContent = match[4];
      parsedTime = `${match[1]} ${match[2]}`;
    } else if ((match = line.match(tgRegex))) {
      finalizeMessage();
      sender = match[1].trim();
      parsedTime = match[2];
      parsedContent = match[3];
    } else if ((match = line.match(slackRegex))) {
      finalizeMessage();
      sender = match[1].trim();
      parsedTime = match[2];
      parsedContent = match[3];
    } else if (platform === 'chatgpt' || platform === 'custom') {
      if ((match = line.match(aiRegex))) {
        finalizeMessage();
        sender = match[1].trim();
        parsedContent = match[2];
        parsedTime = new Date(Date.now() - (approxDateOffset - i) * 60000).toISOString();
      }
    }

    if (match && sender) {
      currentSender = sender;
      let isoDate: string;
      try {
        const d = new Date(parsedTime);
        isoDate = isNaN(d.getTime()) ? new Date(Date.now() - (approxDateOffset - i) * 60000).toISOString() : d.toISOString();
      } catch {
        isoDate = new Date(Date.now() - (approxDateOffset - i) * 60000).toISOString();
      }
      currentTimestamp = isoDate;
      if (parsedContent) {
        currentBuffer.push(parsedContent);
      }
    } else {
      currentBuffer.push(line);
    }
  }

  finalizeMessage();

  // If no structured messages were parsed, treat alternating paragraphs as conversation
  if (messages.length === 0 && trimmed.length > 0) {
    const paragraphs = trimmed.split(/\n\n+/);
    paragraphs.forEach((p, index) => {
      const isEven = index % 2 === 0;
      const colonIdx = p.indexOf(':');
      let sender = isEven ? 'Contact' : 'You';
      let content = p.trim();

      if (colonIdx > 0 && colonIdx < 30) {
        sender = p.substring(0, colonIdx).trim();
        content = p.substring(colonIdx + 1).trim();
      }

      participantsSet.add(sender);
      messages.push({
        id: generateMsgId(),
        sender,
        senderRole: sender.toLowerCase() === 'you' || sender.toLowerCase() === 'me' ? 'me' : 'contact',
        content,
        timestamp: new Date(Date.now() - (paragraphs.length - index) * 120000).toISOString(),
      });
    });
  }

  const participants = Array.from(participantsSet);
  // Pick the contact name (prefer non-You/Me)
  const contactName =
    participants.find(p => !['you', 'me', 'i'].includes(p.toLowerCase())) ||
    participants[0] ||
    'Extracted Contact';

  return {
    detectedPlatform: platform,
    contactName,
    totalMessages: messages.length,
    participants,
    messages,
    firstDate: messages[0]?.timestamp,
    lastDate: messages[messages.length - 1]?.timestamp,
  };
}

/**
 * Merge new messages into an existing message list without duplicates.
 * Matches by timestamp + content hash or identical content in proximity.
 */
export function mergeMessages(existing: ChatMessage[], incoming: ChatMessage[]): {
  merged: ChatMessage[];
  addedCount: number;
} {
  const existingMap = new Set<string>();

  existing.forEach(m => {
    // Generate key based on sender + timestamp + first 50 chars of content
    const key = `${m.sender.toLowerCase()}_${m.timestamp}_${m.content.trim().slice(0, 60)}`;
    existingMap.add(key);
  });

  const merged = [...existing];
  let addedCount = 0;

  incoming.forEach(m => {
    const key = `${m.sender.toLowerCase()}_${m.timestamp}_${m.content.trim().slice(0, 60)}`;
    if (!existingMap.has(key)) {
      merged.push(m);
      existingMap.add(key);
      addedCount++;
    }
  });

  // Sort chronologically
  merged.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return { merged, addedCount };
}
