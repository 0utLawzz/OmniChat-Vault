export type PlatformType = 'whatsapp' | 'telegram' | 'chatgpt' | 'claude' | 'slack' | 'imessage' | 'custom';

export interface ChatMessage {
  id: string;
  sender: string;
  senderRole?: 'user' | 'assistant' | 'contact' | 'me';
  content: string;
  timestamp: string; // ISO string or formatted date
  tags?: string[];
  isPinned?: boolean;
  metadata?: {
    rawTimestamp?: string;
    hasAttachment?: boolean;
    attachmentType?: string;
  };
}

export interface Folder {
  id: string;
  name: string;
  color: string;
  icon?: string;
  description?: string;
  createdAt: string;
}

export interface ChatTag {
  id: string;
  name: string;
  color: string;
}

export interface ChatThread {
  id: string;
  contactName: string;
  customAlias?: string; // Custom name change
  contactIdentifier?: string; // phone, email, or username
  featureImage?: string; // Album cover or feature image URL / preset
  avatar?: string;
  platform: PlatformType;
  folderId?: string; // custom category folder
  tags: string[];
  notes?: string;
  isStarred?: boolean;
  isArchived?: boolean;
  createdAt: string;
  updatedAt: string;
  lastMessageTimestamp?: string;
  messageCount: number;
  messages: ChatMessage[];
  summary?: string; // One-sentence AI Quick Peek summary
  // Sync metadata
  syncedToSupabase?: boolean;
  lastSyncedAt?: string;
  encryptionHash?: string;
}

export interface ActivityLog {
  id: string;
  action: 'extract' | 'append' | 'sync' | 'export' | 'encrypt' | 'tag' | 'update_cover' | 'login' | 'delete' | 'rename' | 'summarize';
  title: string;
  description: string;
  timestamp: string;
  device: string;
  metadata?: Record<string, any>;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConnected: boolean;
  autoSync: boolean;
  lastSyncTime?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  provider: 'google' | 'supabase' | 'guest';
}

export interface EncryptionConfig {
  isEnabled: boolean;
  isLocked: boolean;
  keyFingerprint?: string;
  lastVerifiedAt?: string;
}
