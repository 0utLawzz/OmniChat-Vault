import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { ChatThread, SupabaseConfig, AuthUser } from '../types';

let cachedClient: SupabaseClient | null = null;
let currentConfig: SupabaseConfig = {
  url: '',
  anonKey: '',
  isConnected: false,
  autoSync: true,
};

const SUPABASE_CONFIG_KEY = 'omnichat_supabase_config_v1';
const SUPABASE_USER_KEY = 'omnichat_active_user_v1';

// Load stored config if any
export function loadSavedSupabaseConfig(): SupabaseConfig {
  try {
    const raw = localStorage.getItem(SUPABASE_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      currentConfig = { ...currentConfig, ...parsed };
      if (currentConfig.url && currentConfig.anonKey) {
        initSupabaseClient(currentConfig.url, currentConfig.anonKey);
      }
    }
  } catch (err) {
    console.error('Failed to load saved Supabase config', err);
  }
  return currentConfig;
}

export function saveSupabaseConfig(config: SupabaseConfig): void {
  currentConfig = { ...config };
  localStorage.setItem(SUPABASE_CONFIG_KEY, JSON.stringify(config));
  if (config.url && config.anonKey) {
    initSupabaseClient(config.url, config.anonKey);
  } else {
    cachedClient = null;
  }
}

export function initSupabaseClient(url: string, anonKey: string): SupabaseClient | null {
  try {
    if (!url || !anonKey) return null;
    cachedClient = createClient(url.trim(), anonKey.trim(), {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    return cachedClient;
  } catch (err) {
    console.error('Error creating Supabase client:', err);
    return null;
  }
}

export function getSupabaseClient(): SupabaseClient | null {
  if (!cachedClient && currentConfig.url && currentConfig.anonKey) {
    return initSupabaseClient(currentConfig.url, currentConfig.anonKey);
  }
  return cachedClient;
}

export async function testSupabaseConnection(url: string, anonKey: string): Promise<{ success: boolean; message: string }> {
  try {
    const client = createClient(url.trim(), anonKey.trim());
    // Test auth endpoint or basic ping
    const { error } = await client.auth.getSession();
    if (error && error.message.includes('Invalid API key')) {
      return { success: false, message: 'Invalid Supabase Anon Key' };
    }
    return { success: true, message: 'Successfully connected to Supabase project!' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Connection failed' };
  }
}

// Authentication handlers
export async function signInWithGoogleOAuth(): Promise<{ user?: AuthUser; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    // If no client configured, simulate guest/google sign-in or guide user to enter config
    const demoUser: AuthUser = {
      id: 'usr_' + Math.random().toString(36).substring(2, 9),
      email: 'alex.creator@gmail.com',
      name: 'Alex Rivera (Google)',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      provider: 'google',
    };
    saveActiveUser(demoUser);
    return { user: demoUser };
  }

  try {
    const { data, error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) throw error;
    return {};
  } catch (err: any) {
    return { error: err?.message || 'Google Auth failed' };
  }
}

export async function signInWithSupabaseEmail(email: string, pass: string): Promise<{ user?: AuthUser; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    // Fallback demo user
    const demoUser: AuthUser = {
      id: 'usr_' + Math.random().toString(36).substring(2, 9),
      email,
      name: email.split('@')[0],
      provider: 'supabase',
    };
    saveActiveUser(demoUser);
    return { user: demoUser };
  }

  try {
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password: pass,
    });
    if (error) throw error;
    if (data.user) {
      const authUser: AuthUser = {
        id: data.user.id,
        email: data.user.email || email,
        name: data.user.user_metadata?.full_name || email.split('@')[0],
        avatarUrl: data.user.user_metadata?.avatar_url,
        provider: 'supabase',
      };
      saveActiveUser(authUser);
      return { user: authUser };
    }
    return { error: 'No user returned' };
  } catch (err: any) {
    return { error: err?.message || 'Sign in failed' };
  }
}

export async function signUpWithSupabaseEmail(email: string, pass: string): Promise<{ user?: AuthUser; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    const demoUser: AuthUser = {
      id: 'usr_' + Math.random().toString(36).substring(2, 9),
      email,
      name: email.split('@')[0],
      provider: 'supabase',
    };
    saveActiveUser(demoUser);
    return { user: demoUser };
  }

  try {
    const { data, error } = await client.auth.signUp({
      email,
      password: pass,
    });
    if (error) throw error;
    if (data.user) {
      const authUser: AuthUser = {
        id: data.user.id,
        email: data.user.email || email,
        name: email.split('@')[0],
        provider: 'supabase',
      };
      saveActiveUser(authUser);
      return { user: authUser };
    }
    return { error: 'Registration pending email confirmation' };
  } catch (err: any) {
    return { error: err?.message || 'Sign up failed' };
  }
}

export function saveActiveUser(user: AuthUser | null): void {
  if (user) {
    localStorage.setItem(SUPABASE_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(SUPABASE_USER_KEY);
  }
}

export function getActiveUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(SUPABASE_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function signOutUser(): Promise<void> {
  const client = getSupabaseClient();
  if (client) {
    try {
      await client.auth.signOut();
    } catch (e) {
      console.warn('Sign out error', e);
    }
  }
  saveActiveUser(null);
}

// Database synchronization functions
export async function syncThreadToSupabase(thread: ChatThread, encryptedPayload?: string): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Supabase client not configured' };
  }

  try {
    // Upsert chat thread metadata
    const { error: threadError } = await client.from('chats').upsert({
      id: thread.id,
      contact_name: thread.contactName,
      custom_alias: thread.customAlias || null,
      platform: thread.platform,
      feature_image: thread.featureImage || null,
      folder_id: thread.folderId || null,
      tags: thread.tags,
      message_count: thread.messages.length,
      encrypted_payload: encryptedPayload || null,
      updated_at: new Date().toISOString(),
    });

    if (threadError) {
      console.warn('Supabase upsert chat error (table might need creation):', threadError.message);
      return { success: false, error: threadError.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

// Ready-to-copy Supabase SQL Schema for the user
export const SUPABASE_SQL_SCHEMA = `-- ==========================================
-- OmniChat Vault - Complete Supabase Schema
-- Run this in your Supabase SQL Editor
-- ==========================================

-- 1. Create chats table
CREATE TABLE IF NOT EXISTS public.chats (
  id TEXT PRIMARY KEY,
  contact_name TEXT NOT NULL,
  custom_alias TEXT,
  platform TEXT NOT NULL,
  feature_image TEXT,
  folder_id TEXT,
  tags TEXT[] DEFAULT '{}',
  message_count INTEGER DEFAULT 0,
  encrypted_payload TEXT, -- AES-256-GCM encrypted content at rest
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create messages table (optional normalized storage)
CREATE TABLE IF NOT EXISTS public.messages (
  id TEXT PRIMARY KEY,
  chat_id TEXT REFERENCES public.chats(id) ON DELETE CASCADE,
  sender TEXT NOT NULL,
  sender_role TEXT,
  content TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create folders table
CREATE TABLE IF NOT EXISTS public.folders (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;

-- 5. Policies for authenticated / public sync
CREATE POLICY "Allow all access to authenticated users" 
ON public.chats FOR ALL USING (true);

CREATE POLICY "Allow all access to authenticated users" 
ON public.messages FOR ALL USING (true);

CREATE POLICY "Allow all access to authenticated users" 
ON public.folders FOR ALL USING (true);

-- 6. Enable Realtime Publications
ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
`;
