import React, { useState } from 'react';
import { 
  Folder as FolderIcon, 
  FolderPlus, 
  Tag as TagIcon, 
  Star, 
  MessageSquare, 
  ShieldCheck, 
  Plus, 
  X, 
  Trash2,
  Lock,
  Layers,
  Sparkles,
  Terminal,
  Cpu
} from 'lucide-react';
import { Folder, ChatTag, ChatThread } from '../types';

interface SidebarProps {
  threads: ChatThread[];
  folders: Folder[];
  tags: ChatTag[];
  selectedFolderId: string | null;
  selectedTag: string | null;
  filterStarredOnly: boolean;
  onSelectFolder: (folderId: string | null) => void;
  onSelectTag: (tagName: string | null) => void;
  onToggleStarred: (starred: boolean) => void;
  onAddFolder: (folder: Omit<Folder, 'id' | 'createdAt'>) => void;
  onDeleteFolder: (folderId: string) => void;
  onAddTag: (tag: Omit<ChatTag, 'id'>) => void;
  className?: string;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  threads,
  folders,
  tags,
  selectedFolderId,
  selectedTag,
  filterStarredOnly,
  onSelectFolder,
  onSelectTag,
  onToggleStarred,
  onAddFolder,
  onDeleteFolder,
  onAddTag,
  className = '',
  onCloseMobile,
}) => {
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('#ff6b00');

  const [showNewTagInput, setShowNewTagInput] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#ff7a00');

  const colorPresets = ['#ff6b00', '#f59e0b', '#06b6d4', '#10b981', '#8b5cf6', '#ec4899', '#ef4444'];

  const totalStarred = threads.filter(t => t.isStarred).length;

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    onAddFolder({
      name: newFolderName.trim(),
      color: newFolderColor,
    });
    setNewFolderName('');
    setShowNewFolderModal(false);
  };

  const handleCreateTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    onAddTag({
      name: newTagName.trim(),
      color: newTagColor,
    });
    setNewTagName('');
    setShowNewTagInput(false);
  };

  return (
    <aside className={`w-64 flex-shrink-0 flex flex-col h-[calc(100vh-4rem)] border-r border-orange-500/20 bg-[#070709] select-none ${className}`}>
      {/* Mobile close button */}
      {onCloseMobile && (
        <div className="flex md:hidden items-center justify-between p-3 border-b border-neutral-800">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-orange-400">// NAVIGATION</span>
          <button onClick={onCloseMobile} className="p-1 rounded-lg text-neutral-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Core Categories */}
        <div className="space-y-1">
          <p className="px-2 text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400 mb-2 flex items-center gap-1.5">
            <span className="text-orange-500 font-bold">&gt;</span>
            <span>SYSTEM_OVERVIEW</span>
          </p>

          <button
            onClick={() => {
              onSelectFolder(null);
              onSelectTag(null);
              onToggleStarred(false);
              onCloseMobile?.();
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-mono font-semibold transition ${
              selectedFolderId === null && selectedTag === null && !filterStarredOnly
                ? 'bg-orange-500/15 text-orange-400 border border-orange-500/40 glow-border'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/60'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-lg text-orange-500">forum</span>
              <span>All Transcripts</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-neutral-900 text-neutral-400 border border-neutral-800">
              {threads.length}
            </span>
          </button>

          <button
            onClick={() => {
              onToggleStarred(true);
              onSelectFolder(null);
              onSelectTag(null);
              onCloseMobile?.();
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-mono font-semibold transition ${
              filterStarredOnly
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/40 glow-border'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/60'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-lg text-amber-400">star</span>
              <span>Starred & VIP</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-neutral-900 text-neutral-400 border border-neutral-800">
              {totalStarred}
            </span>
          </button>
        </div>

        {/* Folders Section */}
        <div className="space-y-1">
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <span className="text-orange-500 font-bold">&gt;</span>
              <span>CUSTOM_FOLDERS</span>
            </span>
            <button
              onClick={() => setShowNewFolderModal(true)}
              className="p-1 rounded-lg hover:bg-neutral-900 text-neutral-400 hover:text-orange-400 border border-transparent hover:border-orange-500/30 transition"
              title="Add Custom Category Folder"
            >
              <FolderPlus className="w-3.5 h-3.5" />
            </button>
          </div>

          {folders.map(folder => {
            const count = threads.filter(t => t.folderId === folder.id).length;
            const isSelected = selectedFolderId === folder.id;

            return (
              <div
                key={folder.id}
                className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs font-mono transition cursor-pointer ${
                  isSelected
                    ? 'bg-orange-500/15 text-orange-300 font-bold border border-orange-500/40 glow-border'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/50'
                }`}
                onClick={() => {
                  onSelectFolder(folder.id);
                  onToggleStarred(false);
                  onCloseMobile?.();
                }}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm"
                    style={{ backgroundColor: folder.color, boxShadow: `0 0 8px ${folder.color}80` }}
                  />
                  <span className="truncate">{folder.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono text-neutral-400">{count}</span>
                  {folders.length > 1 && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        if (confirm(`Delete folder "${folder.name}"? Chats in it will remain in All Transcripts.`)) {
                          onDeleteFolder(folder.id);
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 text-neutral-400 hover:text-rose-500 transition"
                      title="Delete folder"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Labels & Tags Section */}
        <div className="space-y-1">
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <span className="text-orange-500 font-bold">&gt;</span>
              <span>SEMANTIC_TAGS</span>
            </span>
            <button
              onClick={() => setShowNewTagInput(true)}
              className="p-1 rounded-lg hover:bg-neutral-900 text-neutral-400 hover:text-orange-400 border border-transparent hover:border-orange-500/30 transition"
              title="Add New Tag"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 px-2">
            {tags.map(tag => {
              const isSelected = selectedTag === tag.name;
              return (
                <button
                  key={tag.id}
                  onClick={() => {
                    onSelectTag(isSelected ? null : tag.name);
                    onCloseMobile?.();
                  }}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold transition ${
                    isSelected
                      ? 'ring-2 ring-orange-500 text-black font-extrabold shadow-md glow-orange'
                      : 'hover:opacity-100 opacity-80'
                  }`}
                  style={{
                    backgroundColor: isSelected ? '#ff6b00' : `${tag.color}20`,
                    color: isSelected ? '#000000' : tag.color,
                    border: `1px solid ${isSelected ? '#ff6b00' : `${tag.color}40`}`,
                  }}
                >
                  <span>#{tag.name}</span>
                </button>
              );
            })}
          </div>

          {showNewTagInput && (
            <form onSubmit={handleCreateTag} className="px-2 pt-2 space-y-2">
              <input
                type="text"
                value={newTagName}
                onChange={e => setNewTagName(e.target.value)}
                placeholder="Tag name (e.g. BugReport)"
                className="w-full text-xs font-mono px-2.5 py-1.5 rounded-xl border border-orange-500/30 bg-[#0d0d10] text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                autoFocus
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {colorPresets.slice(0, 5).map(c => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setNewTagColor(c)}
                      className={`w-3.5 h-3.5 rounded-full ${newTagColor === c ? 'ring-2 ring-white scale-110' : ''}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowNewTagInput(false)}
                    className="text-[10px] font-mono px-2 py-0.5 rounded text-neutral-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-orange-600 text-black font-bold glow-orange"
                  >
                    Add
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Security At-Rest Coder Footer */}
      <div className="p-3 border-t border-orange-500/20 bg-[#050507]">
        <div className="p-2.5 rounded-xl bg-[#0d0d10] border border-orange-500/30 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-orange-400 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm text-orange-500">lock</span>
              AES_256_GCM
            </span>
            <span className="text-[9px] font-mono px-1 rounded bg-orange-500/20 text-orange-400 font-bold">
              AT_REST
            </span>
          </div>
          <p className="text-[10px] text-neutral-400 font-mono leading-tight">
            Client-side cryptographic vault protects every transcript.
          </p>
        </div>
      </div>

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-2xl bg-[#0a0a0c] border border-orange-500/30 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-mono font-bold text-white flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-orange-500" />
                CREATE_CATEGORY_FOLDER
              </h3>
              <button onClick={() => setShowNewFolderModal(false)} className="text-neutral-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-semibold text-neutral-400 mb-1">
                  Folder Name
                </label>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  placeholder="e.g. Core Protocols, Sprint Alpha"
                  className="w-full text-xs font-mono px-3 py-2 rounded-xl border border-neutral-700 bg-[#121216] text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-semibold text-neutral-400 mb-1.5">
                  Accent Color
                </label>
                <div className="flex items-center gap-2">
                  {colorPresets.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewFolderColor(color)}
                      className={`w-6 h-6 rounded-full transition ${
                        newFolderColor === color ? 'ring-2 ring-orange-500 ring-offset-2 ring-offset-black scale-110' : 'opacity-70 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewFolderModal(false)}
                  className="px-3 py-1.5 text-xs font-mono text-neutral-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newFolderName.trim()}
                  className="px-4 py-1.5 text-xs font-mono font-bold rounded-xl bg-orange-600 hover:bg-orange-500 text-black glow-orange disabled:opacity-50 transition"
                >
                  Create Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
};
