/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { ChatList } from './components/ChatList';
import { ChatDetail } from './components/ChatDetail';
import { ChatExtractorModal } from './components/ChatExtractorModal';
import { EditCoverModal } from './components/EditCoverModal';
import { DashboardView } from './components/DashboardView';
import { SupabaseAuthModal } from './components/SupabaseAuthModal';
import { ExportModal } from './components/ExportModal';
import { PassphraseModal } from './components/PassphraseModal';

import { 
  ChatThread, 
  Folder, 
  ChatTag, 
  ActivityLog, 
  SupabaseConfig, 
  AuthUser, 
  PlatformType,
  ChatMessage
} from './types';

import { 
  getStoredThreads, 
  saveStoredThreads, 
  getStoredFolders, 
  saveStoredFolders, 
  getStoredTags, 
  saveStoredTags, 
  getStoredLogs, 
  saveStoredLogs, 
  logActivity, 
  appendOrUpsertContactChat,
  subscribeToLocalSync 
} from './lib/storage';

import { 
  loadSavedSupabaseConfig, 
  saveSupabaseConfig, 
  getActiveUser, 
  saveActiveUser,
  syncThreadToSupabase 
} from './lib/supabase';

import { ArrowLeft } from 'lucide-react';

export default function App() {
  // Theme state (Default to dark cyber jet black)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('omnichat_theme');
    return saved ? saved === 'dark' : true;
  });

  // Core Data
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [tags, setTags] = useState<ChatTag[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);

  // Multi-Select state
  const [selectedThreadIds, setSelectedThreadIds] = useState<string[]>([]);

  // App Navigation & Filters
  const [activeView, setActiveView] = useState<'vault' | 'dashboard'>('vault');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType | 'all'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'count' | 'name'>('recent');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [filterStarredOnly, setFilterStarredOnly] = useState(false);

  // Mobile navigation state
  const [mobileViewingChat, setMobileViewingChat] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Supabase & Auth
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>(loadSavedSupabaseConfig);
  const [authUser, setAuthUser] = useState<AuthUser | null>(getActiveUser);
  const [isSyncing, setIsSyncing] = useState(false);

  // Modals
  const [showExtractor, setShowExtractor] = useState(false);
  const [appendTargetThread, setAppendTargetThread] = useState<ChatThread | null>(null);
  const [editingCoverThread, setEditingCoverThread] = useState<ChatThread | null>(null);
  const [showSupabaseModal, setShowSupabaseModal] = useState(false);
  const [showPassphraseModal, setShowPassphraseModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // Apply dark class to document root
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('omnichat_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('omnichat_theme', 'light');
    }
  }, [isDarkMode]);

  // Initial data loading
  const loadInitialData = useCallback(async () => {
    const loadedThreads = await getStoredThreads();
    const loadedFolders = getStoredFolders();
    const loadedTags = getStoredTags();
    const loadedLogs = getStoredLogs();

    setThreads(loadedThreads);
    setFolders(loadedFolders);
    setTags(loadedTags);
    setLogs(loadedLogs);

    if (loadedThreads.length > 0 && !selectedThreadId) {
      setSelectedThreadId(loadedThreads[0].id);
    }
  }, [selectedThreadId]);

  useEffect(() => {
    loadInitialData();

    // Subscribe to cross-tab / cross-device real-time sync events
    const unsubscribe = subscribeToLocalSync(() => {
      loadInitialData();
    });

    return () => {
      unsubscribe();
    };
  }, [loadInitialData]);

  // Selected thread object
  const selectedThread = useMemo(() => {
    return threads.find(t => t.id === selectedThreadId) || (threads.length > 0 ? threads[0] : null);
  }, [threads, selectedThreadId]);

  // Filtered and Sorted Threads list
  const filteredThreads = useMemo(() => {
    return threads
      .filter(t => {
        if (selectedPlatform !== 'all' && t.platform !== selectedPlatform) {
          return false;
        }

        if (filterStarredOnly && !t.isStarred) {
          return false;
        }

        if (selectedFolderId !== null && t.folderId !== selectedFolderId) {
          return false;
        }

        if (selectedTag !== null && !t.tags.includes(selectedTag)) {
          return false;
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = t.contactName.toLowerCase().includes(q);
          const matchAlias = t.customAlias && t.customAlias.toLowerCase().includes(q);
          const matchIdent = t.contactIdentifier && t.contactIdentifier.toLowerCase().includes(q);
          const matchTags = t.tags.some(tag => tag.toLowerCase().includes(q));
          const matchMessages = t.messages.some(m => m.content.toLowerCase().includes(q));
          return matchName || matchAlias || matchIdent || matchTags || matchMessages;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'count') {
          return (b.messageCount || b.messages.length) - (a.messageCount || a.messages.length);
        }
        if (sortBy === 'name') {
          const nameA = a.customAlias || a.contactName;
          const nameB = b.customAlias || b.contactName;
          return nameA.localeCompare(nameB);
        }
        const timeA = new Date(a.lastMessageTimestamp || a.updatedAt).getTime();
        const timeB = new Date(b.lastMessageTimestamp || b.updatedAt).getTime();
        return timeB - timeA;
      });
  }, [threads, selectedPlatform, filterStarredOnly, selectedFolderId, selectedTag, searchQuery, sortBy]);

  // Toggle dark mode
  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
  };

  // Multi-Select Handlers
  const handleToggleSelectThread = (threadId: string) => {
    setSelectedThreadIds(prev => 
      prev.includes(threadId) ? prev.filter(id => id !== threadId) : [...prev, threadId]
    );
  };

  const handleSelectAllThreads = () => {
    setSelectedThreadIds(filteredThreads.map(t => t.id));
  };

  const handleClearSelectedThreads = () => {
    setSelectedThreadIds([]);
  };

  // Bulk Apply Tag to all selected threads simultaneously
  const handleBulkApplyTag = async (threadIds: string[], tagName: string) => {
    if (threadIds.length === 0 || !tagName.trim()) return;

    // Check if tag exists in tags list; if not, add it
    const tagExists = tags.some(t => t.name.toLowerCase() === tagName.toLowerCase());
    if (!tagExists) {
      const newTag: ChatTag = {
        id: 't_' + Math.random().toString(36).substring(2, 9),
        name: tagName.trim(),
        color: '#ff6b00',
      };
      const updatedTags = [...tags, newTag];
      setTags(updatedTags);
      saveStoredTags(updatedTags);
    }

    const updated = threads.map(t => {
      if (threadIds.includes(t.id)) {
        const mergedTags = Array.from(new Set([...t.tags, tagName.trim()]));
        return { ...t, tags: mergedTags, updatedAt: new Date().toISOString() };
      }
      return t;
    });

    setThreads(updated);
    await saveStoredThreads(updated);

    logActivity(
      'tag',
      `Bulk Tag Applied: #${tagName}`,
      `Assigned #${tagName} to ${threadIds.length} chat threads simultaneously.`
    );

    // Sync updated threads to Supabase
    if (supabaseConfig.isConnected) {
      for (const id of threadIds) {
        const target = updated.find(t => t.id === id);
        if (target) syncThreadToSupabase(target);
      }
    }

    setSelectedThreadIds([]);
  };

  // Bulk Move to Folder for all selected threads simultaneously
  const handleBulkMoveFolder = async (threadIds: string[], folderId: string | undefined) => {
    if (threadIds.length === 0) return;

    const folderName = folderId ? folders.find(f => f.id === folderId)?.name || 'Custom Folder' : 'Uncategorized';

    const updated = threads.map(t => {
      if (threadIds.includes(t.id)) {
        return { ...t, folderId, updatedAt: new Date().toISOString() };
      }
      return t;
    });

    setThreads(updated);
    await saveStoredThreads(updated);

    logActivity(
      'sync',
      `Bulk Folder Move: ${folderName}`,
      `Moved ${threadIds.length} chat threads into "${folderName}".`
    );

    if (supabaseConfig.isConnected) {
      for (const id of threadIds) {
        const target = updated.find(t => t.id === id);
        if (target) syncThreadToSupabase(target);
      }
    }

    setSelectedThreadIds([]);
  };

  // Bulk Star / Unstar
  const handleBulkStar = async (threadIds: string[], star: boolean) => {
    const updated = threads.map(t => {
      if (threadIds.includes(t.id)) {
        return { ...t, isStarred: star };
      }
      return t;
    });

    setThreads(updated);
    await saveStoredThreads(updated);
    setSelectedThreadIds([]);
  };

  // Bulk Delete
  const handleBulkDelete = async (threadIds: string[]) => {
    const updated = threads.filter(t => !threadIds.includes(t.id));
    setThreads(updated);
    await saveStoredThreads(updated);

    if (selectedThreadId && threadIds.includes(selectedThreadId)) {
      setSelectedThreadId(updated[0]?.id || null);
      setMobileViewingChat(false);
    }

    logActivity(
      'delete',
      `Bulk Deleted ${threadIds.length} Chat Threads`,
      `Removed ${threadIds.length} conversation logs from encrypted vault.`
    );

    setSelectedThreadIds([]);
  };

  // Auto-Label single thread via AI
  const handleAutoLabelThread = async (threadId: string, newTags: string[]) => {
    // Add any missing tags to master tag list
    newTags.forEach(tName => {
      if (!tags.some(t => t.name.toLowerCase() === tName.toLowerCase())) {
        const newTag: ChatTag = {
          id: 't_' + Math.random().toString(36).substring(2, 9),
          name: tName,
          color: '#ff6b00',
        };
        const updatedTags = [...tags, newTag];
        setTags(updatedTags);
        saveStoredTags(updatedTags);
      }
    });

    const updated = threads.map(t => {
      if (t.id === threadId) {
        const merged = Array.from(new Set([...t.tags, ...newTags]));
        return { ...t, tags: merged, updatedAt: new Date().toISOString() };
      }
      return t;
    });

    setThreads(updated);
    await saveStoredThreads(updated);

    const target = updated.find(t => t.id === threadId);
    if (target) {
      logActivity(
        'tag',
        `AI Auto-Labeled ${target.customAlias || target.contactName}`,
        `Applied tags: ${newTags.join(', ')} based on semantic analysis.`
      );
      if (supabaseConfig.isConnected) {
        syncThreadToSupabase(target);
      }
    }
  };

  // Toggle Star single thread
  const handleToggleStar = async (threadId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const updated = threads.map(t => (t.id === threadId ? { ...t, isStarred: !t.isStarred } : t));
    setThreads(updated);
    await saveStoredThreads(updated);
  };

  // Update Folder assignment
  const handleUpdateThreadFolder = async (threadId: string, folderId: string | undefined) => {
    const updated = threads.map(t => (t.id === threadId ? { ...t, folderId } : t));
    setThreads(updated);
    await saveStoredThreads(updated);
  };

  // Toggle tag on thread
  const handleToggleThreadTag = async (threadId: string, tagName: string) => {
    const target = threads.find(t => t.id === threadId);
    if (!target) return;

    const newTags = target.tags.includes(tagName)
      ? target.tags.filter(t => t !== tagName)
      : [...target.tags, tagName];

    const updated = threads.map(t => (t.id === threadId ? { ...t, tags: newTags } : t));
    setThreads(updated);
    await saveStoredThreads(updated);
  };

  // Delete Thread
  const handleDeleteThread = async (threadId: string) => {
    const threadToDelete = threads.find(t => t.id === threadId);
    const updated = threads.filter(t => t.id !== threadId);
    setThreads(updated);
    await saveStoredThreads(updated);

    if (selectedThreadId === threadId) {
      setSelectedThreadId(updated[0]?.id || null);
      setMobileViewingChat(false);
    }

    if (threadToDelete) {
      logActivity(
        'delete',
        `Deleted chat with ${threadToDelete.customAlias || threadToDelete.contactName}`,
        `Removed ${threadToDelete.messageCount} encrypted messages.`
      );
    }
  };

  // Add Folder
  const handleAddFolder = (folderData: Omit<Folder, 'id' | 'createdAt'>) => {
    const newFolder: Folder = {
      id: 'f_' + Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString(),
      ...folderData,
    };
    const updated = [...folders, newFolder];
    setFolders(updated);
    saveStoredFolders(updated);
    logActivity('sync', `Created folder "${newFolder.name}"`, 'Organized category');
  };

  // Delete Folder
  const handleDeleteFolder = (folderId: string) => {
    const updatedFolders = folders.filter(f => f.id !== folderId);
    setFolders(updatedFolders);
    saveStoredFolders(updatedFolders);

    const updatedThreads = threads.map(t => (t.folderId === folderId ? { ...t, folderId: undefined } : t));
    setThreads(updatedThreads);
    saveStoredThreads(updatedThreads);
  };

  // Add Tag
  const handleAddTag = (tagData: Omit<ChatTag, 'id'>) => {
    const newTag: ChatTag = {
      id: 't_' + Math.random().toString(36).substring(2, 9),
      ...tagData,
    };
    const updated = [...tags, newTag];
    setTags(updated);
    saveStoredTags(updated);
  };

  // Save Extraction (with deduplication append logic)
  const handleSaveExtraction = async (params: {
    contactName: string;
    customAlias?: string;
    contactIdentifier?: string;
    platform: PlatformType;
    messages: any[];
    folderId?: string;
    tags?: string[];
    featureImage?: string;
    forceNewThread?: boolean;
  }) => {
    setIsSyncing(true);
    try {
      const { thread } = await appendOrUpsertContactChat(params);
      await loadInitialData();
      setSelectedThreadId(thread.id);
      setMobileViewingChat(true);

      if (supabaseConfig.isConnected) {
        await syncThreadToSupabase(thread);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // Save Custom Feature Cover & Alias Updates
  const handleSaveCoverAndAlias = async (
    threadId: string,
    updates: {
      customAlias?: string;
      contactIdentifier?: string;
      featureImage?: string;
      notes?: string;
    }
  ) => {
    const updated = threads.map(t => (t.id === threadId ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t));
    setThreads(updated);
    await saveStoredThreads(updated);

    const target = updated.find(t => t.id === threadId);
    if (target) {
      logActivity(
        'update_cover',
        `Updated cover & alias for ${target.customAlias || target.contactName}`,
        'Personalized display cover and identifiers.'
      );
      if (supabaseConfig.isConnected) {
        syncThreadToSupabase(target);
      }
    }
  };

  // Direct Rename Chat Thread
  const handleRenameThread = async (threadId: string, newName: string) => {
    const updated = threads.map(t => 
      t.id === threadId ? { ...t, customAlias: newName.trim(), updatedAt: new Date().toISOString() } : t
    );
    setThreads(updated);
    await saveStoredThreads(updated);

    const target = updated.find(t => t.id === threadId);
    if (target) {
      logActivity(
        'rename',
        `Renamed Chat to "${newName.trim()}"`,
        `Original name: ${target.contactName}`
      );
      if (supabaseConfig.isConnected) {
        syncThreadToSupabase(target);
      }
    }
  };

  // Update Gemini Quick Peek Summary
  const handleUpdateThreadSummary = async (threadId: string, summary: string) => {
    const updated = threads.map(t => 
      t.id === threadId ? { ...t, summary, updatedAt: new Date().toISOString() } : t
    );
    setThreads(updated);
    await saveStoredThreads(updated);

    const target = updated.find(t => t.id === threadId);
    if (target) {
      logActivity(
        'summarize',
        `Generated Quick Peek for ${target.customAlias || target.contactName}`,
        `Summary: "${summary.slice(0, 60)}..."`
      );
      if (supabaseConfig.isConnected) {
        syncThreadToSupabase(target);
      }
    }
  };

  // Append single manual message/note
  const handleAppendManualMessage = async (threadId: string, msg: Omit<ChatMessage, 'id'>) => {
    const target = threads.find(t => t.id === threadId);
    if (!target) return;

    const newMsg: ChatMessage = {
      id: 'msg_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36),
      ...msg,
    };

    const updatedMessages = [...target.messages, newMsg];
    const updatedThread: ChatThread = {
      ...target,
      messages: updatedMessages,
      messageCount: updatedMessages.length,
      lastMessageTimestamp: newMsg.timestamp,
      updatedAt: new Date().toISOString(),
    };

    const updatedThreads = threads.map(t => (t.id === threadId ? updatedThread : t));
    setThreads(updatedThreads);
    await saveStoredThreads(updatedThreads);

    logActivity(
      'append',
      `Added note to ${target.customAlias || target.contactName}`,
      `Message: "${newMsg.content.slice(0, 40)}..."`
    );

    if (supabaseConfig.isConnected) {
      syncThreadToSupabase(updatedThread);
    }
  };

  // Save Supabase Configuration
  const handleSaveSupabaseConfig = (cfg: SupabaseConfig) => {
    setSupabaseConfig(cfg);
    saveSupabaseConfig(cfg);
    logActivity('sync', 'Supabase Configuration Updated', `Project: ${cfg.url || 'Disconnected'}`);
  };

  // Trigger Sync All to Supabase
  const handleTriggerSyncAll = async () => {
    setIsSyncing(true);
    try {
      for (const t of threads) {
        await syncThreadToSupabase(t);
      }
      logActivity('sync', 'Full Vault Synced to Supabase', `Synced ${threads.length} chats.`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Clear Activity Logs
  const handleClearLogs = () => {
    setLogs([]);
    saveStoredLogs([]);
  };

  // Export Audit Logs
  const handleExportAuditLogs = () => {
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `omnichat_audit_logs_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#050505] text-[#f2f2f2] cyber-grid transition-colors">
      {/* Navbar */}
      <Navbar
        activeView={activeView}
        setActiveView={view => {
          setActiveView(view);
          setMobileViewingChat(false);
        }}
        isDarkMode={isDarkMode}
        toggleDarkMode={toggleDarkMode}
        authUser={authUser}
        supabaseConfig={supabaseConfig}
        onOpenExtractor={() => {
          setAppendTargetThread(null);
          setShowExtractor(true);
        }}
        onOpenSupabaseModal={() => setShowSupabaseModal(true)}
        onOpenPassphraseModal={() => setShowPassphraseModal(true)}
        onOpenExportModal={() => setShowExportModal(true)}
        onSignOut={() => {
          setAuthUser(null);
          saveActiveUser(null);
          logActivity('login', 'User Session Signed Out', 'Switched to local vault');
        }}
        isSyncing={isSyncing}
        onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
      />

      {/* Main App Container */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile Sidebar Overlay */}
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-40 md:hidden bg-black/80 backdrop-blur-md flex">
            <Sidebar
              threads={threads}
              folders={folders}
              tags={tags}
              selectedFolderId={selectedFolderId}
              selectedTag={selectedTag}
              filterStarredOnly={filterStarredOnly}
              onSelectFolder={id => {
                setSelectedFolderId(id);
                setMobileSidebarOpen(false);
              }}
              onSelectTag={tag => {
                setSelectedTag(tag);
                setMobileSidebarOpen(false);
              }}
              onToggleStarred={starred => {
                setFilterStarredOnly(starred);
                setMobileSidebarOpen(false);
              }}
              onAddFolder={handleAddFolder}
              onDeleteFolder={handleDeleteFolder}
              onAddTag={handleAddTag}
              onCloseMobile={() => setMobileSidebarOpen(false)}
            />
            <div className="flex-1" onClick={() => setMobileSidebarOpen(false)} />
          </div>
        )}

        {/* Desktop Sidebar */}
        <Sidebar
          className="hidden md:flex"
          threads={threads}
          folders={folders}
          tags={tags}
          selectedFolderId={selectedFolderId}
          selectedTag={selectedTag}
          filterStarredOnly={filterStarredOnly}
          onSelectFolder={setSelectedFolderId}
          onSelectTag={setSelectedTag}
          onToggleStarred={setFilterStarredOnly}
          onAddFolder={handleAddFolder}
          onDeleteFolder={handleDeleteFolder}
          onAddTag={handleAddTag}
        />

        {/* Main Content Area */}
        {activeView === 'dashboard' ? (
          <DashboardView
            threads={threads}
            folders={folders}
            logs={logs}
            supabaseConfig={supabaseConfig}
            onClearLogs={handleClearLogs}
            onExportAuditLog={handleExportAuditLogs}
            onNavigateToThread={id => {
              setSelectedThreadId(id);
              setActiveView('vault');
              setMobileViewingChat(true);
            }}
          />
        ) : (
          <div className="flex-1 flex overflow-hidden">
            {/* Chat List Column */}
            <div className={`${mobileViewingChat ? 'hidden md:flex' : 'flex'} w-full md:w-auto`}>
              <ChatList
                threads={filteredThreads}
                selectedThreadId={selectedThreadId}
                onSelectThread={id => {
                  setSelectedThreadId(id);
                  setMobileViewingChat(true);
                }}
                onToggleStar={handleToggleStar}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                selectedPlatform={selectedPlatform}
                setSelectedPlatform={setSelectedPlatform}
                sortBy={sortBy}
                setSortBy={setSortBy}
                folders={folders}
                tags={tags}
                selectedThreadIds={selectedThreadIds}
                onToggleSelectThread={handleToggleSelectThread}
                onSelectAllThreads={handleSelectAllThreads}
                onClearSelectedThreads={handleClearSelectedThreads}
                onBulkApplyTag={handleBulkApplyTag}
                onBulkMoveFolder={handleBulkMoveFolder}
                onBulkStar={handleBulkStar}
                onBulkDelete={handleBulkDelete}
              />
            </div>

            {/* Chat Detail Column */}
            <div className={`${!mobileViewingChat ? 'hidden md:flex' : 'flex'} flex-1 flex flex-col`}>
              {mobileViewingChat && (
                <div className="md:hidden p-2.5 bg-[#09090c] border-b border-orange-500/20 flex items-center">
                  <button
                    onClick={() => setMobileViewingChat(false)}
                    className="flex items-center gap-1.5 text-xs font-mono font-bold text-orange-400 p-1"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>BACK TO TRANSCRIPTS</span>
                  </button>
                </div>
              )}

              {selectedThread ? (
                <ChatDetail
                  thread={selectedThread}
                  folders={folders}
                  tags={tags}
                  onOpenEditCover={t => setEditingCoverThread(t)}
                  onOpenExport={t => {
                    setSelectedThreadId(t.id);
                    setShowExportModal(true);
                  }}
                  onOpenAppendExtractor={t => {
                    setAppendTargetThread(t);
                    setShowExtractor(true);
                  }}
                  onToggleStar={id => handleToggleStar(id)}
                  onDeleteThread={handleDeleteThread}
                  onUpdateThreadFolder={handleUpdateThreadFolder}
                  onToggleThreadTag={handleToggleThreadTag}
                  onAppendManualMessage={handleAppendManualMessage}
                  onAutoLabelThread={handleAutoLabelThread}
                  onRenameThread={handleRenameThread}
                  onUpdateThreadSummary={handleUpdateThreadSummary}
                />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-neutral-500 font-mono">
                  <p className="text-sm font-bold">[SELECT_OR_EXTRACT_CHAT_THREAD]</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Universal Chat Extractor Modal */}
      <ChatExtractorModal
        isOpen={showExtractor}
        onClose={() => {
          setShowExtractor(false);
          setAppendTargetThread(null);
        }}
        existingThreads={threads}
        folders={folders}
        tags={tags}
        initialTargetThread={appendTargetThread}
        onSaveExtraction={handleSaveExtraction}
      />

      {/* Edit Feature Cover & Alias Modal */}
      {editingCoverThread && (
        <EditCoverModal
          isOpen={Boolean(editingCoverThread)}
          onClose={() => setEditingCoverThread(null)}
          thread={editingCoverThread}
          onSave={handleSaveCoverAndAlias}
        />
      )}

      {/* Supabase & User Auth Modal */}
      <SupabaseAuthModal
        isOpen={showSupabaseModal}
        onClose={() => setShowSupabaseModal(false)}
        config={supabaseConfig}
        onSaveConfig={handleSaveSupabaseConfig}
        authUser={authUser}
        onUserChange={u => setAuthUser(u)}
        onTriggerSyncAll={handleTriggerSyncAll}
      />

      {/* Data Portability / Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        selectedThread={selectedThread}
        allThreads={threads}
        folders={folders}
      />

      {/* AES-256-GCM Encryption At Rest Passphrase Modal */}
      <PassphraseModal
        isOpen={showPassphraseModal}
        onClose={() => setShowPassphraseModal(false)}
      />
    </div>
  );
}
