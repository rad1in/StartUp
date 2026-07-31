import { useCallback, useEffect, useRef, useState } from 'react';
import { Heart, ImagePlus, X } from 'lucide-react';
import api from '../../services/api';
import { resolveImageUrl } from '../../components/VenueCards';
import Button from '../../components/Button';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../context/LanguageContext';

export default function Social() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [activePost, setActivePost] = useState(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const sentinelRef = useRef(null);

  const loadPage = useCallback(async (nextPage) => {
    setLoading(true);
    try {
      const { data } = await api.get('/social/posts', { params: { page: nextPage } });
      setPosts((prev) => (nextPage === 1 ? data : [...prev, ...data]));
      setHasMore(data.length === 20);
      setPage(nextPage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPage(1);
  }, [loadPage]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) loadPage(page + 1);
      },
      { rootMargin: '400px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, page, loadPage]);

  function updatePostLocal(postId, patch) {
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, ...patch } : p)));
    setActivePost((prev) => (prev && prev.id === postId ? { ...prev, ...patch } : prev));
  }

  async function toggleLike(post) {
    if (!user) return;
    const optimistic = { isLikedByMe: !post.isLikedByMe, likeCount: post.likeCount + (post.isLikedByMe ? -1 : 1) };
    updatePostLocal(post.id, optimistic);
    try {
      const { data } = await api.post(`/social/posts/${post.id}/like`);
      updatePostLocal(post.id, data);
    } catch {
      updatePostLocal(post.id, { isLikedByMe: post.isLikedByMe, likeCount: post.likeCount });
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-ink">{t('social.title')}</h1>
        {user && (
          <Button variant="accent" onClick={() => setComposerOpen(true)} className="flex items-center gap-2">
            <ImagePlus size={16} />
            {t('social.newPost')}
          </Button>
        )}
      </div>

      {posts.length === 0 && !loading ? (
        <p className="text-center text-ink/40 py-16">{t('social.empty')}</p>
      ) : (
        <div className="grid grid-cols-3 gap-1 sm:gap-2">
          {posts.map((post) => (
            <button
              key={post.id}
              onClick={() => setActivePost(post)}
              className="aspect-square overflow-hidden bg-surface-2/60 group relative"
            >
              <img
                src={resolveImageUrl(post.imageUrl)}
                alt={post.caption || ''}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </button>
          ))}
        </div>
      )}

      <div ref={sentinelRef} className="h-10" />
      {loading && <p className="text-center text-ink/40 py-4 text-sm">{t('common.loading')}</p>}

      {activePost && (
        <PostLightbox post={activePost} onClose={() => setActivePost(null)} onToggleLike={() => toggleLike(activePost)} t={t} />
      )}

      {composerOpen && (
        <ComposerModal
          t={t}
          onClose={() => setComposerOpen(false)}
          onPosted={() => {
            setComposerOpen(false);
            loadPage(1);
          }}
        />
      )}
    </div>
  );
}

function PostLightbox({ post, onClose, onToggleLike, t }) {
  const [burst, setBurst] = useState(false);

  function handleDoubleClick() {
    if (!post.isLikedByMe) onToggleLike();
    setBurst(true);
    setTimeout(() => setBurst(false), 550);
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-surface rounded-2xl overflow-hidden max-w-lg w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-black/5">
          <div className="flex items-center gap-2 min-w-0">
            {post.avatarUrl && (
              <img src={resolveImageUrl(post.avatarUrl)} alt="" className="w-8 h-8 rounded-full object-cover" />
            )}
            <span className="font-bold text-sm text-ink truncate">
              {post.username ? `@${post.username}` : post.userName}
            </span>
          </div>
          <button onClick={onClose} className="text-ink/50 hover:text-ink">
            <X size={20} />
          </button>
        </div>

        <div className="relative select-none" onDoubleClick={handleDoubleClick}>
          <img src={resolveImageUrl(post.imageUrl)} alt={post.caption || ''} className="w-full max-h-[60vh] object-contain bg-black" />
          {burst && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <Heart size={90} className="text-white drop-shadow-lg animate-ping" fill="white" />
            </div>
          )}
        </div>

        <div className="p-4 overflow-y-auto">
          <button onClick={onToggleLike} className="flex items-center gap-2 mb-2">
            <Heart size={22} className={post.isLikedByMe ? 'text-red-500' : 'text-ink/60'} fill={post.isLikedByMe ? 'currentColor' : 'none'} />
            <span className="font-bold text-sm text-ink">{post.likeCount}</span>
          </button>
          {post.caption && (
            <p className="text-sm text-ink/80">
              <span className="font-bold text-ink">{post.username ? `@${post.username}` : post.userName} </span>
              {post.caption}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ComposerModal({ onClose, onPosted, t }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [caption, setCaption] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');

  function handleFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function submit() {
    if (!file) return;
    setPosting(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('image', file);
      if (caption) formData.append('caption', caption);
      await api.post('/social/posts', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      onPosted();
    } catch (err) {
      setError(err.response?.data?.message || t('social.postError'));
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface rounded-2xl p-5 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-extrabold text-ink mb-4">{t('social.newPost')}</h3>

        <label className="block aspect-[4/5] rounded-xl bg-surface-2/60 flex items-center justify-center overflow-hidden cursor-pointer mb-3">
          {preview ? (
            <img src={preview} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center text-ink/40 text-sm gap-2">
              <ImagePlus size={26} />
              {t('social.pickImage')}
            </div>
          )}
          <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </label>

        <textarea
          className="glass-input rounded-xl px-3 py-2 text-sm w-full mb-3"
          rows={3}
          placeholder={t('social.captionPlaceholder')}
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
        />

        {error && <p className="text-red-500 text-xs mb-3">{error}</p>}

        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose} className="flex-1" disabled={posting}>
            {t('common.cancel')}
          </Button>
          <Button variant="accent" onClick={submit} disabled={posting || !file} className="flex-1">
            {posting ? t('social.sending') : t('social.share')}
          </Button>
        </div>
      </div>
    </div>
  );
}
