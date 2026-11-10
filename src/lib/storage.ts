import { ChatThread, Folder, ChatTag, ActivityLog, PlatformType } from '../types';
import { encryptAtRest, decryptAtRest } from './crypto';
import { mergeMessages } from './parser';
import { syncThreadToSupabase, getSupabaseClient } from './supabase';

const THREADS_STORAGE_KEY = 'omnichat_vault_threads_enc_v2';
const FOLDERS_STORAGE_KEY = 'omnichat_vault_folders_v1';
const TAGS_STORAGE_KEY = 'omnichat_vault_tags_v1';
const LOGS_STORAGE_KEY = 'omnichat_vault_logs_v1';

// Setup BroadcastChannel for real-time cross-tab & multi-device sync
let syncChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    syncChannel = new BroadcastChannel('omnichat_vault_realtime');
  }
} catch (e) {
  console.warn('BroadcastChannel not supported in this environment', e);
}

// Preset Curated Feature Images / Album Covers
export const PRESET_FEATURE_COVERS = [
  {
    id: 'abstract-neon',
    name: 'Cyberpunk Neon',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'minimal-geometry',
    name: 'Prism Geometry',
    url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'deep-space',
    name: 'Orbital Nebula',
    url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'emerald-flow',
    name: 'Emerald Aurora',
    url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'studio-analog',
    name: 'Monochrome Wave',
    url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80',
  },
  {
    id: 'vinyl-record',
    name: 'Retro Vinyl Tape',
    url: 'https://images.unsplash.com/photo-1539185441755-769473a23570?w=800&auto=format&fit=crop&q=80',
  },
];

export const INITIAL_FOLDERS: Folder[] = [
  { id: 'f_work', name: 'Work & Clients', color: '#3b82f6', icon: 'Briefcase', createdAt: '2026-10-01T00:00:00Z' },
  { id: 'f_legal', name: 'Legal & Evidence', color: '#ef4444', icon: 'ShieldAlert', createdAt: '2026-10-05T00:00:00Z' },
  { id: 'f_ai', name: 'AI Conversations', color: '#8b5cf6', icon: 'Bot', createdAt: '2026-10-10T00:00:00Z' },
  { id: 'f_personal', name: 'Personal & VIP', color: '#10b981', icon: 'UserCheck', createdAt: '2026-10-15T00:00:00Z' },
];

export const INITIAL_TAGS: ChatTag[] = [
  { id: 't_important', name: 'Important', color: '#ef4444' },
  { id: 't_contract', name: 'Contract / Terms', color: '#f59e0b' },
  { id: 't_urgent', name: 'Urgent Action', color: '#ec4899' },
  { id: 't_architecture', name: 'System Design', color: '#3b82f6' },
  { id: 't_verified', name: 'Verified Data', color: '#10b981' },
];

const INITIAL_THREADS: ChatThread[] = [
  {
    id: 'chat_sarah_chen',
    contactName: 'Sarah Chen',
    customAlias: 'Sarah Chen (Lead Cloud Architect)',
    contactIdentifier: '+1 415 889 0192',
    platform: 'whatsapp',
    featureImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    folderId: 'f_work',
    tags: ['Important', 'System Design'],
    notes: 'Primary discussion regarding multi-region Cloud database architecture, latency constraints, and failover SLA.',
    isStarred: true,
    isArchived: false,
    createdAt: '2026-11-04T09:12:00Z',
    updatedAt: '2026-11-08T11:45:00Z',
    lastMessageTimestamp: '2026-11-08T11:45:00Z',
    messageCount: 5,
    summary: "Cloud infrastructure benchmarks show a 38% drop in p99 latency after pooler deployment, with production cutover set for Tuesday 2 AM UTC.",
    syncedToSupabase: true,
    lastSyncedAt: '2026-11-08T12:00:00Z',
    messages: [
      {
        id: 'msg_sc_1',
        sender: 'Sarah Chen',
        senderRole: 'contact',
        content: "Hey, I just reviewed the latency benchmarks from the Tokyo and Frankfurt clusters. Our p99 latency dropped by 38% after deploying the connection pooler.",
        timestamp: '2026-11-08T10:15:00Z',
        tags: ['System Design'],
      },
      {
        id: 'msg_sc_2',
        sender: 'You',
        senderRole: 'me',
        content: "That's huge! Did you also verify that cross-region read replicas are synchronizing without replication lag spikes?",
        timestamp: '2026-11-08T10:18:00Z',
      },
      {
        id: 'msg_sc_3',
        sender: 'Sarah Chen',
        senderRole: 'contact',
        content: "Yes, replica lag remains under 45ms even during synthetic spike traffic. I documented the updated failover playbook in our docs.",
        timestamp: '2026-11-08T10:24:00Z',
        tags: ['Important'],
      },
      {
        id: 'msg_sc_4',
        sender: 'You',
        senderRole: 'me',
        content: "Awesome, let's schedule the production migration window for Tuesday 2 AM UTC.",
        timestamp: '2026-11-08T10:30:00Z',
      },
      {
        id: 'msg_sc_5',
        sender: 'Sarah Chen',
        senderRole: 'contact',
        content: "Sounds like a plan. I will have the automated rollback canary script on standby.",
        timestamp: '2026-11-08T11:45:00Z',
      },
    ],
  },
  {
    id: 'chat_david_miller',
    contactName: 'David Miller',
    customAlias: 'David Miller (Legal & Compliance)',
    contactIdentifier: 'david.miller@acme-legal.com',
    platform: 'slack',
    featureImage: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=800&auto=format&fit=crop&q=80',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    folderId: 'f_legal',
    tags: ['Contract / Terms', 'Important'],
    notes: 'Audit log verification and GDPR data portability requirements.',
    isStarred: true,
    isArchived: false,
    createdAt: '2026-11-02T14:00:00Z',
    updatedAt: '2026-11-07T16:20:00Z',
    lastMessageTimestamp: '2026-11-07T16:20:00Z',
    messageCount: 3,
    summary: "Confirmed AES-256 client-side encryption at rest using Web Crypto to fulfill ISO-27001 and GDPR compliance obligations.",
    syncedToSupabase: true,
    messages: [
      {
        id: 'msg_dm_1',
        sender: 'David Miller',
        senderRole: 'contact',
        content: "Following up on the data retention clauses: please ensure all chat records stored at rest are encrypted with AES-256 before disk writes.",
        timestamp: '2026-11-07T15:40:00Z',
        tags: ['Contract / Terms'],
      },
      {
        id: 'msg_dm_2',
        sender: 'You',
        senderRole: 'me',
        content: "Confirmed. We implemented native Web Crypto PBKDF2 + AES-GCM 256-bit with client-managed keys. Data remains unreadable without user passkey.",
        timestamp: '2026-11-07T15:55:00Z',
      },
      {
        id: 'msg_dm_3',
        sender: 'David Miller',
        senderRole: 'contact',
        content: "Excellent. That satisfies both ISO-27001 and SOC2 Type II audit requirements.",
        timestamp: '2026-11-07T16:20:00Z',
      },
    ],
  },
  {
    id: 'chat_nova_ai',
    contactName: 'Nova-4 Deep Research Assistant',
    customAlias: 'Nova-4 AI (Synthesis & Coding)',
    contactIdentifier: 'model:gemini-deep-research',
    platform: 'chatgpt',
    featureImage: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=800&auto=format&fit=crop&q=80',
    avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
    folderId: 'f_ai',
    tags: ['System Design', 'Verified Data'],
    notes: 'Prompt engineering & schema synchronization blueprints.',
    isStarred: false,
    isArchived: false,
    createdAt: '2026-11-05T18:00:00Z',
    updatedAt: '2026-11-08T08:30:00Z',
    lastMessageTimestamp: '2026-11-08T08:30:00Z',
    messageCount: 4,
    summary: "Nova-4 synthesized a zero-latency hybrid synchronization architecture combining BroadcastChannel for browser tabs with Supabase Realtime CDC.",
    syncedToSupabase: false,
    messages: [
      {
        id: 'msg_nova_1',
        sender: 'You',
        senderRole: 'me',
        content: "Explain how to architect a real-time cross-tab state sync using BroadcastChannel and Supabase Realtime fallback.",
        timestamp: '2026-11-08T08:20:00Z',
      },
      {
        id: 'msg_nova_2',
        sender: 'Nova-4 Deep Research Assistant',
        senderRole: 'assistant',
        content: "A zero-latency hybrid strategy uses the browser's BroadcastChannel API for same-origin tabs (< 2ms synchronization) while subscribing to Supabase postgres_changes for cross-device updates. When a local write occurs, broadcast immediately and dispatch an upsert payload.",
        timestamp: '2026-11-08T08:22:00Z',
      },
      {
        id: 'msg_nova_3',
        sender: 'You',
        senderRole: 'me',
        content: "How should deduplication work if the user re-extracts an updated WhatsApp export of the same chat?",
        timestamp: '2026-11-08T08:25:00Z',
      },
      {
        id: 'msg_nova_4',
        sender: 'Nova-4 Deep Research Assistant',
        senderRole: 'assistant',
        content: "Compute a collision-resistant composite key combining sender, normalized timestamp, and content slice. Filter incoming lines against existing hashes and sort chronologically.",
        timestamp: '2026-11-08T08:30:00Z',
      },
    ],
  },
  {
    id: 'chat_elena_rostova',
    contactName: 'Elena Rostova',
    customAlias: 'Elena Rostova (Quantum Labs)',
    contactIdentifier: '@elena_quantum',
    platform: 'telegram',
    featureImage: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop&q=80',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    folderId: 'f_work',
    tags: ['Urgent Action'],
    notes: 'Quantum cryptography prototypes and QKD key distribution experiments.',
    isStarred: false,
    isArchived: false,
    createdAt: '2026-10-28T12:00:00Z',
    updatedAt: '2026-11-06T19:10:00Z',
    lastMessageTimestamp: '2026-11-06T19:10:00Z',
    messageCount: 2,
    summary: "Elena confirmed photon entanglement calibration success with bit error rates dropping below 0.12%.",
    syncedToSupabase: true,
    messages: [
      {
        id: 'msg_er_1',
        sender: 'Elena Rostova',
        senderRole: 'contact',
        content: "The entanglement photon detector calibration is complete. Our signal-to-noise ratio increased 4x.",
        timestamp: '2026-11-06T19:05:00Z',
        tags: ['Urgent Action'],
      },
      {
        id: 'msg_er_2',
        sender: 'You',
        senderRole: 'me',
        content: "Incredible news! Ready to sync the experimental logs to the secure vault.",
        timestamp: '2026-11-06T19:10:00Z',
      },
    ],
  },
];

const INITIAL_LOGS: ActivityLog[] = [
  {
    id: 'log_init_1',
    action: 'encrypt',
    title: 'Vault Encrypted at Rest',
    description: 'Initialized AES-256-GCM cipher with PBKDF2 100k iteration key derivation.',
    timestamp: '2026-11-08T12:00:00Z',
    device: 'Desktop Chrome (macOS)',
  },
  {
    id: 'log_init_2',
    action: 'sync',
    title: 'Supabase Real-Time Sync',
    description: 'Synced 3 threads and published broadcast payload.',
    timestamp: '2026-11-08T12:05:00Z',
    device: 'Desktop Chrome (macOS)',
  },
  {
    id: 'log_init_3',
    action: 'append',
    title: 'Auto-Appended Messages',
    description: 'Appended 2 messages to Sarah Chen without duplication.',
    timestamp: '2026-11-08T11:45:00Z',
    device: 'Mobile iOS Safari',
  },
];

// In-Memory cache
let cachedThreads: ChatThread[] | null = null;
let cachedFolders: Folder[] | null = null;
let cachedTags: ChatTag[] | null = null;
let cachedLogs: ActivityLog[] | null = null;

// Initialize or load
export async function getStoredThreads(): Promise<ChatThread[]> {
  if (cachedThreads) return cachedThreads;

  try {
    const raw = localStorage.getItem(THREADS_STORAGE_KEY);
    if (raw) {
      const decrypted = await decryptAtRest<ChatThread[]>(raw);
      if (Array.isArray(decrypted)) {
        cachedThreads = decrypted;
        return cachedThreads;
      }
    }
  } catch (err) {
    console.warn('Could not decrypt threads from storage, falling back to defaults:', err);
  }

  // Fallback to initial seeds and encrypt at rest
  cachedThreads = INITIAL_THREADS;
  await saveStoredThreads(cachedThreads, false);
  return cachedThreads;
}

export async function saveStoredThreads(threads: ChatThread[], broadcast = true): Promise<void> {
  cachedThreads = threads;
  try {
    // Encrypt at rest before writing to persistent local storage
    const encrypted = await encryptAtRest(threads);
    localStorage.setItem(THREADS_STORAGE_KEY, encrypted);
  } catch (err) {
    console.error('Failed to encrypt & save threads at rest:', err);
    localStorage.setItem(THREADS_STORAGE_KEY, JSON.stringify(threads));
  }

  if (broadcast && syncChannel) {
    syncChannel.postMessage({ type: 'SYNC_THREADS_UPDATED', timestamp: Date.now() });
  }
}

export function getStoredFolders(): Folder[] {
  if (cachedFolders) return cachedFolders;
  try {
    const raw = localStorage.getItem(FOLDERS_STORAGE_KEY);
    if (raw) {
      cachedFolders = JSON.parse(raw);
      return cachedFolders!;
    }
  } catch {}
  cachedFolders = INITIAL_FOLDERS;
  saveStoredFolders(cachedFolders);
  return cachedFolders;
}

export function saveStoredFolders(folders: Folder[]): void {
  cachedFolders = folders;
  localStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(folders));
  if (syncChannel) {
    syncChannel.postMessage({ type: 'SYNC_FOLDERS_UPDATED', timestamp: Date.now() });
  }
}

export function getStoredTags(): ChatTag[] {
  if (cachedTags) return cachedTags;
  try {
    const raw = localStorage.getItem(TAGS_STORAGE_KEY);
    if (raw) {
      cachedTags = JSON.parse(raw);
      return cachedTags!;
    }
  } catch {}
  cachedTags = INITIAL_TAGS;
  saveStoredTags(cachedTags);
  return cachedTags;
}

export function saveStoredTags(tags: ChatTag[]): void {
  cachedTags = tags;
  localStorage.setItem(TAGS_STORAGE_KEY, JSON.stringify(tags));
  if (syncChannel) {
    syncChannel.postMessage({ type: 'SYNC_TAGS_UPDATED', timestamp: Date.now() });
  }
}

export function getStoredLogs(): ActivityLog[] {
  if (cachedLogs) return cachedLogs;
  try {
    const raw = localStorage.getItem(LOGS_STORAGE_KEY);
    if (raw) {
      cachedLogs = JSON.parse(raw);
      return cachedLogs!;
    }
  } catch {}
  cachedLogs = INITIAL_LOGS;
  saveStoredLogs(cachedLogs);
  return cachedLogs;
}

export function saveStoredLogs(logs: ActivityLog[]): void {
  cachedLogs = logs.slice(0, 200); // keep last 200 activity logs
  localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(cachedLogs));
  if (syncChannel) {
    syncChannel.postMessage({ type: 'SYNC_LOGS_UPDATED', timestamp: Date.now() });
  }
}

export function logActivity(action: ActivityLog['action'], title: string, description: string, metadata?: Record<string, any>): void {
  const current = getStoredLogs();
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const newLog: ActivityLog = {
    id: 'log_' + Math.random().toString(36).substring(2, 9),
    action,
    title,
    description,
    timestamp: new Date().toISOString(),
    device: isMobile ? 'Mobile Device' : 'Desktop Browser',
    metadata,
  };
  saveStoredLogs([newLog, ...current]);
}

/**
 * Smart Deduplication & Contact Append:
 * Checks if a contact already exists by exact name, phone/email identifier, or alias.
 * If found, merges messages chronologically without duplicate entries.
 * If not found, creates a new thread.
 */
export async function appendOrUpsertContactChat(params: {
  contactName: string;
  customAlias?: string;
  contactIdentifier?: string;
  platform: PlatformType;
  messages: any[];
  folderId?: string;
  tags?: string[];
  featureImage?: string;
  forceNewThread?: boolean;
}): Promise<{ thread: ChatThread; isAppended: boolean; addedCount: number }> {
  const threads = await getStoredThreads();
  const normName = params.contactName.trim().toLowerCase();
  const normIdent = params.contactIdentifier?.trim().toLowerCase();

  // Find existing thread
  let existingIndex = -1;
  if (!params.forceNewThread) {
    existingIndex = threads.findIndex(t => {
      const matchName = t.contactName.trim().toLowerCase() === normName;
      const matchAlias = t.customAlias && t.customAlias.trim().toLowerCase() === normName;
      const matchIdent = normIdent && t.contactIdentifier && t.contactIdentifier.trim().toLowerCase() === normIdent;
      return matchName || matchAlias || matchIdent;
    });
  }

  if (existingIndex >= 0) {
    // Append to existing thread!
    const target = threads[existingIndex];
    const { merged, addedCount } = mergeMessages(target.messages, params.messages);

    const updatedThread: ChatThread = {
      ...target,
      messages: merged,
      messageCount: merged.length,
      lastMessageTimestamp: merged[merged.length - 1]?.timestamp || target.lastMessageTimestamp,
      updatedAt: new Date().toISOString(),
      tags: Array.from(new Set([...target.tags, ...(params.tags || [])])),
      folderId: target.folderId || params.folderId,
      featureImage: target.featureImage || params.featureImage,
    };

    const newThreads = [...threads];
    newThreads[existingIndex] = updatedThread;
    await saveStoredThreads(newThreads);

    logActivity(
      'append',
      `Appended messages to ${target.customAlias || target.contactName}`,
      `Merged ${addedCount} new messages (Total: ${merged.length}) without duplication.`
    );

    // Sync to Supabase in background
    syncThreadToSupabase(updatedThread).catch(() => {});

    return { thread: updatedThread, isAppended: true, addedCount };
  } else {
    // Create new thread
    const randomCover = PRESET_FEATURE_COVERS[Math.floor(Math.random() * PRESET_FEATURE_COVERS.length)].url;
    const newThread: ChatThread = {
      id: 'chat_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36),
      contactName: params.contactName.trim(),
      customAlias: params.customAlias?.trim() || undefined,
      contactIdentifier: params.contactIdentifier?.trim() || undefined,
      platform: params.platform,
      featureImage: params.featureImage || randomCover,
      folderId: params.folderId,
      tags: params.tags || ['Verified Data'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastMessageTimestamp: params.messages[params.messages.length - 1]?.timestamp || new Date().toISOString(),
      messageCount: params.messages.length,
      messages: params.messages,
      syncedToSupabase: false,
    };

    const newThreads = [newThread, ...threads];
    await saveStoredThreads(newThreads);

    logActivity(
      'extract',
      `Extracted new chat with ${newThread.customAlias || newThread.contactName}`,
      `Parsed ${newThread.messageCount} messages across ${params.platform}.`
    );

    // Sync to Supabase
    syncThreadToSupabase(newThread).catch(() => {});

    return { thread: newThread, isAppended: false, addedCount: params.messages.length };
  }
}

/**
 * Register real-time listener for cross-tab updates
 */
export function subscribeToLocalSync(callback: () => void): () => void {
  if (!syncChannel) return () => {};

  const handler = () => {
    // Clear in-memory caches to pick up changes
    cachedThreads = null;
    cachedFolders = null;
    cachedTags = null;
    cachedLogs = null;
    callback();
  };

  syncChannel.addEventListener('message', handler);
  return () => {
    syncChannel?.removeEventListener('message', handler);
  };
}
