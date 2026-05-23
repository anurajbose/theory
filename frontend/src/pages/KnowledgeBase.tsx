import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import {
  BookOpen, Plus, Search, Pin, Eye, Tag, Globe, Users, Lock,
  X, Save, Trash2, ChevronRight, Bold, Italic, List, ListOrdered,
  Heading2, Link2, Code, MoreHorizontal, RefreshCw,
} from 'lucide-react';
import {
  fetchKBList, fetchKBArticle, createKBArticle, updateKBArticle,
  deleteKBArticle, toggleKBPin,
  type KBArticle, type KBVisibility,
} from '../services/kbService';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

/* ── constants ─────────────────────────────────────────────────────── */
const VIS_META: Record<KBVisibility, { label: string; icon: React.ElementType; color: string }> = {
  PERSONAL: { label: 'Personal',  icon: Lock,  color: '#6366f1' },
  TEAM:     { label: 'Team',      icon: Users, color: '#0ea5e9' },
  ORG:      { label: 'Org',       icon: Globe, color: '#22c55e' },
};

const CATEGORIES = ['All', 'BRD', 'Technical', 'Process', 'Reference', 'Other'];

/* ── TipTap toolbar ─────────────────────────────────────────────────── */
function Toolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  if (!editor) return null;
  const btn = (active: boolean, action: () => void, Icon: React.ElementType, title: string) => (
    <button
      key={title}
      onMouseDown={e => { e.preventDefault(); action(); }}
      title={title}
      className="p-1.5 rounded-lg transition-all"
      style={{
        background: active ? 'var(--m3-primary)' : 'transparent',
        color: active ? 'var(--m3-on-primary)' : 'var(--m3-on-surf-var)',
      }}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--state-hover)'; }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      <Icon size={14} />
    </button>
  );

  return (
    <div
      className="flex items-center gap-0.5 px-3 py-2 flex-wrap"
      style={{ borderBottom: '1px solid var(--m3-outline-v)', background: 'var(--m3-surf2)' }}
    >
      {btn(editor.isActive('bold'),        () => editor.chain().focus().toggleBold().run(),        Bold,         'Bold')}
      {btn(editor.isActive('italic'),      () => editor.chain().focus().toggleItalic().run(),      Italic,       'Italic')}
      {btn(editor.isActive('code'),        () => editor.chain().focus().toggleCode().run(),        Code,         'Code')}
      <div className="w-px h-4 mx-1" style={{ background: 'var(--m3-outline-v)' }} />
      {btn(editor.isActive('heading', { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), Heading2, 'Heading')}
      {btn(editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run(),   List,         'Bullet list')}
      {btn(editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run(), ListOrdered,  'Ordered list')}
      <div className="w-px h-4 mx-1" style={{ background: 'var(--m3-outline-v)' }} />
      <button
        onMouseDown={e => {
          e.preventDefault();
          const url = window.prompt('URL:');
          if (url) editor.chain().focus().setLink({ href: url }).run();
        }}
        title="Add link"
        className="p-1.5 rounded-lg transition-all"
        style={{ color: editor.isActive('link') ? 'var(--m3-primary)' : 'var(--m3-on-surf-var)' }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--state-hover)'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
      >
        <Link2 size={14} />
      </button>
    </div>
  );
}

/* ── Article card ────────────────────────────────────────────────────── */
function ArticleCard({ article, selected, onSelect, onPin, onDelete, isOwner }:
  { article: KBArticle; selected: boolean; onSelect: () => void; onPin: () => void; onDelete: () => void; isOwner: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const VM = VIS_META[article.visibility];
  const Icon = VM.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      onClick={onSelect}
      className="group relative p-3 rounded-xl cursor-pointer transition-all duration-150"
      style={{
        background: selected ? 'color-mix(in srgb, var(--m3-primary) 10%, transparent)' : 'var(--m3-surf2)',
        border: `1.5px solid ${selected ? 'var(--m3-primary)' : 'var(--m3-outline-v)'}`,
      }}
      onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLElement).style.background = 'var(--state-hover)'; }}
      onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLElement).style.background = 'var(--m3-surf2)'; }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            {article.pinned && <Pin size={11} style={{ color: 'var(--m3-primary)', fill: 'var(--m3-primary)' }} />}
            <span className="text-xs font-semibold line-clamp-2" style={{ color: 'var(--m3-on-surf)' }}>
              {article.title}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {article.category && (
              <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'var(--m3-surf4)', color: 'var(--m3-on-surf-var)' }}>
                {article.category}
              </span>
            )}
            <span className="flex items-center gap-0.5 text-[9px]" style={{ color: VM.color }}>
              <Icon size={9} /> {VM.label}
            </span>
            <span className="flex items-center gap-0.5 text-[9px]" style={{ color: 'var(--m3-on-surf-var)', opacity: 0.6 }}>
              <Eye size={9} /> {article.viewCount}
            </span>
          </div>
          {article.tags.length > 0 && (
            <div className="flex gap-1 mt-1.5 flex-wrap">
              {article.tags.slice(0, 3).map(t => (
                <span key={t} className="text-[9px] px-1 py-0.5 rounded" style={{ background: 'color-mix(in srgb, var(--m3-primary) 10%, transparent)', color: 'var(--m3-primary)' }}>
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>

        {isOwner && (
          <div className="relative shrink-0">
            <button
              onClick={e => { e.stopPropagation(); setMenuOpen(v => !v); }}
              className="opacity-0 group-hover:opacity-100 p-1 rounded-lg transition-all"
              style={{ color: 'var(--m3-on-surf-var)' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--state-hover)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            >
              <MoreHorizontal size={13} />
            </button>
            <AnimatePresence>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={e => { e.stopPropagation(); setMenuOpen(false); }} />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    className="absolute right-0 top-6 z-20 rounded-xl overflow-hidden shadow-e3 py-1 w-32"
                    style={{ background: 'var(--m3-surf4)', border: '1px solid var(--m3-outline-v)' }}
                  >
                    <button onClick={e => { e.stopPropagation(); onPin(); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs" style={{ color: 'var(--m3-on-surf)' }}
                      onMouseEnter={ev => (ev.currentTarget as HTMLElement).style.background = 'var(--state-hover)'}
                      onMouseLeave={ev => (ev.currentTarget as HTMLElement).style.background = 'transparent'}>
                      <Pin size={11} />{article.pinned ? 'Unpin' : 'Pin'}
                    </button>
                    <button onClick={e => { e.stopPropagation(); onDelete(); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs" style={{ color: 'var(--m3-error)' }}
                      onMouseEnter={ev => (ev.currentTarget as HTMLElement).style.background = 'color-mix(in srgb, var(--m3-error) 10%, transparent)'}
                      onMouseLeave={ev => (ev.currentTarget as HTMLElement).style.background = 'transparent'}>
                      <Trash2 size={11} />Delete
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
      <div className="flex items-center gap-1 mt-2">
        <ChevronRight size={10} style={{ color: 'var(--m3-on-surf-var)', opacity: 0.4 }} />
        <span className="text-[9px]" style={{ color: 'var(--m3-on-surf-var)', opacity: 0.5 }}>
          v{article.version} · {new Date(article.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
        </span>
      </div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════════ */
export default function KnowledgeBasePage() {
  const { user } = useAuthStore();
  const [articles, setArticles]         = useState<KBArticle[]>([]);
  const [selected, setSelected]         = useState<KBArticle | null>(null);
  const [editing, setEditing]           = useState(false);
  const [creating, setCreating]         = useState(false);
  const [search, setSearch]             = useState('');
  const [catFilter, setCatFilter]       = useState('All');
  const [visFilter, setVisFilter]       = useState<KBVisibility | 'ALL'>('ALL');
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);

  /* new article form state */
  const [form, setForm] = useState<{
    title: string; category: string; visibility: KBVisibility; tags: string; tagInput: string;
  }>({ title: '', category: 'General', visibility: 'PERSONAL', tags: '', tagInput: '' });

  /* Editor for creating */
  const createEditor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Start writing your article…' }),
      Link.configure({ openOnClick: false }),
    ],
    content: '',
  });

  /* Editor for viewing/editing */
  const viewEditor = useEditor({
    extensions: [StarterKit, Link.configure({ openOnClick: true })],
    content: '',
    editable: false,
  });

  /* ── Load articles ── */
  const loadArticles = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (catFilter !== 'All') params.category = catFilter;
      if (visFilter !== 'ALL') params.visibility = visFilter;
      const data = await fetchKBList(params);
      setArticles(data);
    } catch { toast.error('Failed to load KB'); }
    finally { setLoading(false); }
  }, [search, catFilter, visFilter]);

  useEffect(() => { loadArticles(); }, [loadArticles]);

  /* ── Open article ── */
  async function openArticle(article: KBArticle) {
    try {
      const full = await fetchKBArticle(article.id);
      setSelected(full);
      viewEditor?.commands.setContent(full.content as Record<string, unknown>);
      setEditing(false);
    } catch { toast.error('Failed to load article'); }
  }

  /* ── Create article ── */
  async function handleCreate() {
    if (!form.title.trim() || !createEditor) return;
    setSaving(true);
    try {
      const tags = form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
      const content = createEditor.getJSON();
      const article = await createKBArticle({
        title: form.title, category: form.category || undefined,
        content, tags, visibility: form.visibility,
      });
      toast.success('Article created');
      setCreating(false);
      createEditor.commands.clearContent();
      setForm({ title: '', category: 'General', visibility: 'PERSONAL', tags: '', tagInput: '' });
      await loadArticles();
      openArticle(article);
    } catch { toast.error('Failed to create article'); }
    finally { setSaving(false); }
  }

  /* ── Save edits ── */
  async function handleSave() {
    if (!selected || !viewEditor) return;
    setSaving(true);
    try {
      const content = viewEditor.getJSON();
      const updated = await updateKBArticle(selected.id, { content });
      toast.success('Article saved');
      setSelected(updated);
      setEditing(false);
      await loadArticles();
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  }

  /* ── Pin ── */
  async function handlePin(id: string) {
    try {
      await toggleKBPin(id);
      await loadArticles();
      toast.success('Updated');
    } catch { toast.error('Failed'); }
  }

  /* ── Delete ── */
  async function handleDelete(id: string) {
    if (!confirm('Delete this article?')) return;
    try {
      await deleteKBArticle(id);
      if (selected?.id === id) { setSelected(null); viewEditor?.commands.clearContent(); }
      await loadArticles();
      toast.success('Deleted');
    } catch { toast.error('Failed to delete'); }
  }

  /* ── Toggle editing ── */
  function toggleEdit() {
    if (!selected || !viewEditor) return;
    viewEditor.setEditable(!editing);
    setEditing(v => !v);
  }

  const isOwner = (a: KBArticle) => a.userId === user?.id;

  return (
    <div className="flex h-full min-h-0">

      {/* ── LEFT SIDEBAR — list ── */}
      <div
        className="w-72 shrink-0 flex flex-col border-r theme-transition"
        style={{ borderColor: 'var(--m3-outline-v)', background: 'var(--m3-surf0)' }}
      >
        {/* Search + new */}
        <div className="p-3 space-y-2 shrink-0" style={{ borderBottom: '1px solid var(--m3-outline-v)' }}>
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'var(--m3-surf2)', border: '1px solid var(--m3-outline-v)' }}>
              <Search size={13} style={{ color: 'var(--m3-on-surf-var)' }} />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search articles…"
                className="flex-1 bg-transparent text-xs outline-none"
                style={{ color: 'var(--m3-on-surf)' }}
              />
              {search && <button onClick={() => setSearch('')}><X size={11} style={{ color: 'var(--m3-on-surf-var)' }} /></button>}
            </div>
            <motion.button
              onClick={() => { setCreating(true); setSelected(null); }}
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              className="p-2 rounded-xl"
              style={{ background: 'var(--m3-primary)', color: 'var(--m3-on-primary)' }}
            >
              <Plus size={14} />
            </motion.button>
          </div>

          {/* Category filter */}
          <div className="flex gap-1 flex-wrap">
            {['All', 'BRD', 'Technical', 'Process', 'Reference'].map(c => (
              <button
                key={c}
                onClick={() => setCatFilter(c)}
                className="px-2 py-0.5 rounded-full text-[10px] font-medium transition-all"
                style={{
                  background: catFilter === c ? 'var(--m3-primary)' : 'var(--m3-surf3)',
                  color: catFilter === c ? 'var(--m3-on-primary)' : 'var(--m3-on-surf-var)',
                }}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Visibility filter */}
          <div className="flex gap-1">
            {(['ALL', 'PERSONAL', 'TEAM', 'ORG'] as const).map(v => (
              <button
                key={v}
                onClick={() => setVisFilter(v)}
                className="px-2 py-0.5 rounded-full text-[10px] transition-all"
                style={{
                  background: visFilter === v ? 'var(--m3-surf4)' : 'transparent',
                  color: v === 'ALL' ? 'var(--m3-on-surf-var)' : VIS_META[v as KBVisibility]?.color ?? 'var(--m3-on-surf-var)',
                  fontWeight: visFilter === v ? 600 : 400,
                }}
              >
                {v === 'ALL' ? 'All' : VIS_META[v as KBVisibility].label}
              </button>
            ))}
          </div>
        </div>

        {/* Article list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw size={16} className="animate-spin" style={{ color: 'var(--m3-primary)' }} />
            </div>
          ) : articles.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-2">
              <BookOpen size={24} style={{ color: 'var(--m3-on-surf-var)', opacity: 0.4 }} />
              <p className="text-xs text-center" style={{ color: 'var(--m3-on-surf-var)' }}>No articles found</p>
              <button
                onClick={() => { setCreating(true); setSelected(null); }}
                className="text-xs font-medium px-3 py-1.5 rounded-xl"
                style={{ background: 'var(--m3-primary)', color: 'var(--m3-on-primary)' }}
              >
                Create first article
              </button>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {articles.map(a => (
                <ArticleCard
                  key={a.id} article={a}
                  selected={selected?.id === a.id}
                  onSelect={() => openArticle(a)}
                  onPin={() => handlePin(a.id)}
                  onDelete={() => handleDelete(a.id)}
                  isOwner={isOwner(a)}
                />
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* ── RIGHT — editor / viewer ── */}
      <div className="flex-1 flex flex-col min-w-0">
        <AnimatePresence mode="wait">

          {/* Create new article */}
          {creating && (
            <motion.div
              key="create"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              className="flex flex-col h-full"
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-5 py-3 shrink-0"
                style={{ borderBottom: '1px solid var(--m3-outline-v)', background: 'var(--m3-surf2)' }}
              >
                <div className="flex items-center gap-2">
                  <Plus size={16} style={{ color: 'var(--m3-primary)' }} />
                  <span className="font-semibold text-sm" style={{ color: 'var(--m3-on-surf)' }}>New Article</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setCreating(false)} className="px-3 py-1.5 rounded-xl text-xs" style={{ color: 'var(--m3-on-surf-var)' }}>Cancel</button>
                  <motion.button
                    onClick={handleCreate} disabled={saving || !form.title.trim()}
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
                    style={{ background: 'var(--m3-primary)', color: 'var(--m3-on-primary)', opacity: saving || !form.title.trim() ? 0.5 : 1 }}
                  >
                    <Save size={12} />{saving ? 'Saving…' : 'Save'}
                  </motion.button>
                </div>
              </div>

              {/* Meta fields */}
              <div className="px-5 py-3 grid grid-cols-2 gap-3 shrink-0" style={{ borderBottom: '1px solid var(--m3-outline-v)', background: 'var(--m3-surf1)' }}>
                <div className="col-span-2">
                  <input
                    value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="Article title…"
                    className="w-full bg-transparent text-lg font-semibold outline-none"
                    style={{ color: 'var(--m3-on-surf)' }}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium block mb-1" style={{ color: 'var(--m3-on-surf-var)' }}>Category</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full bg-transparent text-xs rounded-lg px-2 py-1.5 outline-none"
                    style={{ border: '1px solid var(--m3-outline-v)', color: 'var(--m3-on-surf)' }}>
                    {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-medium block mb-1" style={{ color: 'var(--m3-on-surf-var)' }}>Visibility</label>
                  <select value={form.visibility} onChange={e => setForm(f => ({ ...f, visibility: e.target.value as KBVisibility }))}
                    className="w-full bg-transparent text-xs rounded-lg px-2 py-1.5 outline-none"
                    style={{ border: '1px solid var(--m3-outline-v)', color: 'var(--m3-on-surf)' }}>
                    <option value="PERSONAL">Personal (only me)</option>
                    <option value="TEAM">Team</option>
                    <option value="ORG">Org (everyone)</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-medium block mb-1" style={{ color: 'var(--m3-on-surf-var)' }}>Tags (comma-separated)</label>
                  <input
                    value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                    placeholder="e.g. CR-204, loan, BRD"
                    className="w-full bg-transparent text-xs rounded-lg px-2 py-1.5 outline-none"
                    style={{ border: '1px solid var(--m3-outline-v)', color: 'var(--m3-on-surf)' }}
                  />
                </div>
              </div>

              {/* TipTap toolbar + editor */}
              <Toolbar editor={createEditor} />
              <div className="flex-1 overflow-y-auto">
                <EditorContent
                  editor={createEditor}
                  className="tiptap-editor h-full px-6 py-4"
                />
              </div>
            </motion.div>
          )}

          {/* View / edit existing article */}
          {selected && !creating && (
            <motion.div
              key={selected.id}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              className="flex flex-col h-full"
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-5 py-3 shrink-0 gap-4"
                style={{ borderBottom: '1px solid var(--m3-outline-v)', background: 'var(--m3-surf2)' }}
              >
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-base truncate" style={{ color: 'var(--m3-on-surf)' }}>
                    {selected.pinned && <Pin size={13} className="inline mr-1" style={{ color: 'var(--m3-primary)', fill: 'var(--m3-primary)' }} />}
                    {selected.title}
                  </h2>
                  <div className="flex items-center gap-3 mt-0.5">
                    {selected.category && <span className="text-[10px]" style={{ color: 'var(--m3-on-surf-var)' }}>{selected.category}</span>}
                    <span className="text-[10px]" style={{ color: VIS_META[selected.visibility].color }}>
                      {VIS_META[selected.visibility].label}
                    </span>
                    <span className="flex items-center gap-0.5 text-[10px]" style={{ color: 'var(--m3-on-surf-var)' }}>
                      <Eye size={9} /> {selected.viewCount} views
                    </span>
                    <span className="text-[10px]" style={{ color: 'var(--m3-on-surf-var)' }}>v{selected.version}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isOwner(selected) && !editing && (
                    <motion.button
                      onClick={toggleEdit} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      className="px-3 py-1.5 rounded-xl text-xs font-medium"
                      style={{ background: 'var(--m3-surf3)', color: 'var(--m3-on-surf)' }}
                    >
                      Edit
                    </motion.button>
                  )}
                  {editing && (
                    <>
                      <button onClick={toggleEdit} className="px-3 py-1.5 rounded-xl text-xs" style={{ color: 'var(--m3-on-surf-var)' }}>Cancel</button>
                      <motion.button
                        onClick={handleSave} disabled={saving}
                        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
                        style={{ background: 'var(--m3-primary)', color: 'var(--m3-on-primary)' }}
                      >
                        <Save size={12} />{saving ? 'Saving…' : 'Save'}
                      </motion.button>
                    </>
                  )}
                </div>
              </div>

              {/* Tags */}
              {selected.tags.length > 0 && (
                <div className="flex items-center gap-1.5 px-5 py-2 flex-wrap shrink-0" style={{ borderBottom: '1px solid var(--m3-outline-v)', background: 'var(--m3-surf1)' }}>
                  <Tag size={11} style={{ color: 'var(--m3-on-surf-var)' }} />
                  {selected.tags.map(t => (
                    <span key={t} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'color-mix(in srgb, var(--m3-primary) 10%, transparent)', color: 'var(--m3-primary)' }}>
                      #{t}
                    </span>
                  ))}
                </div>
              )}

              {/* Toolbar (only when editing) */}
              {editing && <Toolbar editor={viewEditor} />}

              {/* Content */}
              <div className="flex-1 overflow-y-auto">
                <EditorContent
                  editor={viewEditor}
                  className="tiptap-editor px-6 py-4"
                  style={{ cursor: editing ? 'text' : 'default' }}
                />
              </div>
            </motion.div>
          )}

          {/* Empty state */}
          {!selected && !creating && (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex flex-col items-center justify-center gap-4"
            >
              <BookOpen size={40} style={{ color: 'var(--m3-on-surf-var)', opacity: 0.3 }} />
              <div className="text-center">
                <p className="font-medium text-sm" style={{ color: 'var(--m3-on-surf)' }}>Select an article to read</p>
                <p className="text-xs mt-1" style={{ color: 'var(--m3-on-surf-var)' }}>or create a new one</p>
              </div>
              <motion.button
                onClick={() => setCreating(true)}
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
                style={{ background: 'var(--m3-primary)', color: 'var(--m3-on-primary)' }}
              >
                <Plus size={15} />New Article
              </motion.button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* TipTap styles */}
      <style>{`
        .tiptap-editor .ProseMirror {
          outline: none;
          min-height: 300px;
          color: var(--m3-on-surf);
          font-size: 14px;
          line-height: 1.7;
        }
        .tiptap-editor .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: var(--m3-on-surf-var);
          opacity: 0.5;
          pointer-events: none;
          height: 0;
        }
        .tiptap-editor .ProseMirror h1 { font-size: 1.5rem; font-weight: 700; margin: 1rem 0 0.5rem; color: var(--m3-on-surf); }
        .tiptap-editor .ProseMirror h2 { font-size: 1.2rem; font-weight: 600; margin: 0.875rem 0 0.4rem; color: var(--m3-on-surf); }
        .tiptap-editor .ProseMirror ul, .tiptap-editor .ProseMirror ol { padding-left: 1.5rem; margin: 0.5rem 0; }
        .tiptap-editor .ProseMirror li { margin-bottom: 0.25rem; }
        .tiptap-editor .ProseMirror a { color: var(--m3-primary); text-decoration: underline; }
        .tiptap-editor .ProseMirror code { background: var(--m3-surf4); padding: 0.1em 0.3em; border-radius: 4px; font-size: 0.85em; }
        .tiptap-editor .ProseMirror blockquote { border-left: 3px solid var(--m3-primary); padding-left: 1rem; margin: 0.5rem 0; opacity: 0.8; }
        .tiptap-editor .ProseMirror strong { font-weight: 700; }
        .tiptap-editor .ProseMirror em { font-style: italic; }
      `}</style>
    </div>
  );
}
