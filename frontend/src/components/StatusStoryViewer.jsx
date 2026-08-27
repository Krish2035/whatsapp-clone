import React, { useState, useEffect, useRef, useCallback } from 'react';
import { viewStatus, reactToStatus, fetchStatusViewers, deleteStatus } from '../services/api';
import { useAuth } from '../context/AuthContext';

const EMOJIS = ['❤️', '😂', '😮', '😢', '🙏', '👍', '🔥', '😍'];

function formatTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function StatusStoryViewer({ groups, initialGroupIdx = 0, onClose, onDeleteStatus }) {
  const { user } = useAuth();
  const [groupIdx, setGroupIdx] = useState(initialGroupIdx);
  const [statusIdx, setStatusIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showViewers, setShowViewers] = useState(false);
  const [viewers, setViewers] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const intervalRef = useRef(null);
  const progressRef = useRef(0);
  const emojiPickerRef = useRef(null);

  // Close story emoji picker when clicking anywhere outside on screen
  useEffect(() => {
    if (!showEmojiPicker) return;
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
        setPaused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  const currentGroup = groups[groupIdx];
  const currentStatus = currentGroup?.statuses?.[statusIdx];
  const isOwnStatus = currentGroup && (
    currentGroup.is_mine ||
    (user?.id && String(currentGroup.user_id) === String(user.id)) ||
    (user?.username && currentGroup.username === user.username)
  );

  const duration = currentStatus?.duration_ms || 5000;
  const tickMs = 50;

  // Mark as viewed when status changes
  useEffect(() => {
    if (currentStatus?.id && !currentStatus.viewed_by_me) {
      viewStatus(currentStatus.id).catch(() => {});
    }
  }, [currentStatus?.id]);

  const goNext = useCallback(() => {
    if (!currentGroup) return;
    if (statusIdx < currentGroup.statuses.length - 1) {
      setStatusIdx((i) => i + 1);
      setProgress(0);
    } else if (groupIdx < groups.length - 1) {
      setGroupIdx((g) => g + 1);
      setStatusIdx(0);
      setProgress(0);
    } else {
      onClose();
    }
  }, [currentGroup, statusIdx, groupIdx, groups, onClose]);

  const goPrev = useCallback(() => {
    if (statusIdx > 0) {
      setStatusIdx((i) => i - 1);
      setProgress(0);
    } else if (groupIdx > 0) {
      setGroupIdx((g) => g - 1);
      setStatusIdx(0);
      setProgress(0);
    }
  }, [statusIdx, groupIdx]);

  // Auto-advance timer
  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    if (paused || showEmojiPicker || showViewers || showDeleteConfirm) return;
    setProgress(0);
    progressRef.current = 0;

    intervalRef.current = setInterval(() => {
      progressRef.current += (tickMs / duration) * 100;
      if (progressRef.current >= 100) {
        clearInterval(intervalRef.current);
        goNext();
      } else {
        setProgress(progressRef.current);
      }
    }, tickMs);

    return () => clearInterval(intervalRef.current);
  }, [currentStatus?.id, paused, showEmojiPicker, showViewers, showDeleteConfirm, goNext, duration]);

  // Load viewers
  const handleShowViewers = async () => {
    if (!currentStatus) return;
    try {
      const v = await fetchStatusViewers(currentStatus.id);
      setViewers(v);
      setShowViewers(true);
    } catch (e) {
      console.warn('Failed to load viewers:', e);
    }
  };

  const handleReact = async (emoji) => {
    if (!currentStatus) return;
    setShowEmojiPicker(false);
    try {
      await reactToStatus(currentStatus.id, emoji);
    } catch (e) {}
  };

  const handleDeleteClick = () => {
    setPaused(true);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    setShowDeleteConfirm(false);
    if (!currentStatus) return;
    try {
      await deleteStatus(currentStatus.id);
      if (onDeleteStatus) {
        onDeleteStatus(currentStatus.id);
      } else {
        goNext();
      }
    } catch (e) {
      console.error('Delete status failed:', e);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setPaused(false);
  };

  if (!currentGroup || !currentStatus) return null;

  const isBg = currentStatus.media_type === 'text';
  const isVideo = currentStatus.media_type === 'video';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100001,
      backgroundColor: 'rgba(0,0,0,0.95)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>

      {/* Main story card */}
      <div style={{
        position: 'relative', width: '100%', maxWidth: '420px', height: '100vh', maxHeight: '860px',
        borderRadius: '12px', overflow: 'hidden',
        backgroundColor: isBg ? (currentStatus.bg_color || '#075e54') : '#000',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 40px 120px rgba(0,0,0,0.9)',
      }}>

        {/* Progress bars */}
        <div style={{ display: 'flex', gap: '3px', padding: '10px 10px 0', position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
          {currentGroup.statuses.map((_, i) => (
            <div key={i} style={{ flex: 1, height: '2px', backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: '2px',
                backgroundColor: '#fff',
                width: i < statusIdx ? '100%' : i === statusIdx ? `${progress}%` : '0%',
                transition: i === statusIdx ? 'none' : 'none',
              }} />
            </div>
          ))}
        </div>

        {/* Header */}
        <div style={{
          position: 'absolute', top: '20px', left: 0, right: 0, zIndex: 10,
          display: 'flex', alignItems: 'center', padding: '0 14px', gap: '10px',
        }}>
          {/* Avatar */}
          <div style={{
            width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden',
            border: '2px solid #fff', flexShrink: 0, backgroundColor: '#128c7e',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700,
          }}>
            {currentGroup.avatar_url ? (
              <img src={currentGroup.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : currentGroup.username?.[0]?.toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#fff', fontWeight: 600, fontSize: '14px', textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
              {isOwnStatus ? 'My status' : currentGroup.username}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>
              {formatTime(currentStatus.created_at)}
            </div>
          </div>
          {/* Mute + Close */}
          {isVideo && (
            <button onClick={() => setIsMuted((m) => !m)} style={{
              background: 'rgba(0,0,0,0.4)', border: 'none', color: '#fff',
              width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', fontSize: '16px',
            }}>{isMuted ? '🔇' : '🔊'}</button>
          )}
          {/* Pause/Resume */}
          <button onClick={() => setPaused((p) => !p)} style={{
            background: 'rgba(0,0,0,0.4)', border: 'none', color: '#fff',
            width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', fontSize: '16px',
          }}>{paused ? '▶' : '⏸'}</button>
          {/* More menu: delete for own */}
          {isOwnStatus && (
            <button onClick={handleDeleteClick} style={{
              background: 'rgba(0,0,0,0.4)', border: 'none', color: '#fff',
              width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', fontSize: '16px',
            }}>🗑</button>
          )}
          <button onClick={onClose} style={{
            background: 'rgba(0,0,0,0.4)', border: 'none', color: '#fff',
            width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', fontSize: '20px',
          }}>✕</button>
        </div>

        {/* Nav zones (tap left/right) */}
        <div style={{ position: 'absolute', inset: '70px 0 100px', display: 'flex', zIndex: 5 }}>
          <div style={{ flex: 1, cursor: 'pointer' }} onClick={goPrev} />
          <div style={{ flex: 1, cursor: 'pointer' }} onClick={goNext} />
        </div>

        {/* Media Content */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          {isBg ? (
            <p style={{
              color: '#fff', fontSize: '24px', fontWeight: 700, textAlign: 'center',
              padding: '24px', lineHeight: 1.4, textShadow: '0 2px 8px rgba(0,0,0,0.3)',
              userSelect: 'none',
            }}>
              {currentStatus.caption}
            </p>
          ) : isVideo ? (
            <video
              key={currentStatus.id}
              src={currentStatus.media_url}
              autoPlay
              loop={false}
              muted={isMuted}
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onEnded={goNext}
            />
          ) : (
            <img
              key={currentStatus.id}
              src={currentStatus.media_url}
              alt={currentStatus.caption}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          )}

          {/* Caption on media */}
          {!isBg && currentStatus.caption && (
            <div style={{
              position: 'absolute', bottom: '16px', left: '16px', right: '16px',
              backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: '10px',
              padding: '10px 14px', color: '#fff', fontSize: '14px', textAlign: 'center',
              backdropFilter: 'blur(4px)',
            }}>
              {currentStatus.caption}
            </div>
          )}
        </div>

        {/* Bottom Controls */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10,
          padding: '12px 14px 20px',
          background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
        }}>
          {isOwnStatus ? (
            // Own status: show eye count + viewers
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              <button onClick={handleShowViewers} style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                backgroundColor: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '24px', padding: '10px 20px', color: '#fff',
                cursor: 'pointer', fontSize: '15px', backdropFilter: 'blur(4px)',
              }}>
                <span>👁</span>
                <span style={{ fontWeight: 700 }}>{currentStatus.view_count}</span>
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>
                  {currentStatus.view_count === 1 ? 'view' : 'views'}
                </span>
              </button>
            </div>
          ) : (
            // Others' status: reply input with emoji, sticker, and send button (Screenshot 4)
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
              <button
                onClick={() => { setShowEmojiPicker((p) => !p); setPaused(true); }}
                style={{
                  background: 'none', border: 'none', color: '#e9edef',
                  fontSize: '20px', cursor: 'pointer', padding: '4px'
                }}
                title="Emoji"
              >
                😀
              </button>
              <button
                onClick={() => { setShowEmojiPicker((p) => !p); setPaused(true); }}
                style={{
                  background: 'none', border: 'none', color: '#e9edef',
                  fontSize: '20px', cursor: 'pointer', padding: '4px'
                }}
                title="Sticker"
              >
                🏷️
              </button>
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type a reply..."
                  style={{
                    width: '100%', backgroundColor: 'rgba(255,255,255,0.12)',
                    border: '1px solid rgba(255,255,255,0.2)', borderRadius: '24px',
                    padding: '10px 18px', color: '#fff', fontSize: '14px', outline: 'none',
                    boxSizing: 'border-box', backdropFilter: 'blur(4px)',
                  }}
                  onFocus={() => setPaused(true)}
                  onBlur={() => setPaused(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && replyText.trim()) {
                      setReplyText('');
                      setPaused(false);
                    }
                  }}
                />
              </div>
              <button
                onClick={() => {
                  if (replyText.trim()) {
                    setReplyText('');
                    setPaused(false);
                  }
                }}
                style={{
                  background: 'none', border: 'none', color: '#00a884',
                  fontSize: '20px', cursor: 'pointer', padding: '4px 6px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
                title="Send reply"
              >
                ➤
              </button>
            </div>
          )}
        </div>

        {/* Emoji Reaction Picker */}
        {showEmojiPicker && !isOwnStatus && (
          <div ref={emojiPickerRef} style={{
            position: 'absolute', bottom: '80px', left: '50%', transform: 'translateX(-50%)',
            backgroundColor: '#1f2c34', borderRadius: '40px', padding: '10px 16px',
            display: 'flex', gap: '10px', zIndex: 20,
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          }}>
            {EMOJIS.map((e) => (
              <button key={e} onClick={() => { handleReact(e); setPaused(false); }} style={{
                background: 'none', border: 'none', fontSize: '26px', cursor: 'pointer',
                transition: 'transform 0.15s', padding: '4px',
              }}
              onMouseEnter={(ev) => (ev.target.style.transform = 'scale(1.3)')}
              onMouseLeave={(ev) => (ev.target.style.transform = 'scale(1)')}
              >{e}</button>
            ))}
          </div>
        )}

        {/* Viewers Modal */}
        {showViewers && (
          <div style={{
            position: 'absolute', inset: 0, backgroundColor: '#111b21', zIndex: 30,
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{
              padding: '16px 20px', backgroundColor: '#202c33', display: 'flex', alignItems: 'center', gap: '12px',
            }}>
              <button onClick={() => setShowViewers(false)} style={{
                background: 'none', border: 'none', color: '#e9edef', fontSize: '20px', cursor: 'pointer',
              }}>←</button>
              <div>
                <div style={{ color: '#e9edef', fontWeight: 600, fontSize: '16px' }}>
                  👁 {viewers.length} {viewers.length === 1 ? 'View' : 'Views'}
                </div>
                <div style={{ color: '#8696a0', fontSize: '12px' }}>
                  {formatTime(currentStatus.created_at)}
                </div>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {viewers.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#8696a0' }}>
                  No one has viewed this status yet.
                </div>
              ) : (
                viewers.map((v) => (
                  <div key={v.viewer_id} style={{
                    display: 'flex', alignItems: 'center', gap: '14px',
                    padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)',
                  }}>
                    <div style={{
                      width: '46px', height: '46px', borderRadius: '50%',
                      backgroundColor: '#128c7e', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '18px',
                      overflow: 'hidden', flexShrink: 0,
                    }}>
                      {v.avatar_url ? (
                        <img src={v.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : v.username?.[0]?.toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#e9edef', fontWeight: 500 }}>{v.username}</div>
                      <div style={{ color: '#8696a0', fontSize: '12px' }}>{formatTime(v.viewed_at)}</div>
                    </div>
                    {v.reaction && <span style={{ fontSize: '22px' }}>{v.reaction}</span>}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Left/Right group arrows */}
      {groupIdx > 0 && (
        <button onClick={() => { setGroupIdx((g) => g - 1); setStatusIdx(0); setProgress(0); }} style={{
          position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)',
          backgroundColor: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff',
          width: '44px', height: '44px', borderRadius: '50%', cursor: 'pointer', fontSize: '20px',
          backdropFilter: 'blur(4px)',
        }}>←</button>
      )}
      {groupIdx < groups.length - 1 && (
        <button onClick={() => { setGroupIdx((g) => g + 1); setStatusIdx(0); setProgress(0); }} style={{
          position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)',
          backgroundColor: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff',
          width: '44px', height: '44px', borderRadius: '50%', cursor: 'pointer', fontSize: '20px',
          backdropFilter: 'blur(4px)',
        }}>→</button>
      )}

      {/* ── Delete Status Confirmation Modal ── */}
      {showDeleteConfirm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100010,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            backgroundColor: '#111b21',
            borderRadius: '16px',
            padding: '24px 28px',
            width: '90%',
            maxWidth: '380px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.85)',
            border: '1px solid #222d34',
            textAlign: 'center',
          }}>
            <div style={{
              width: '52px', height: '52px', borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              color: '#ef4444', display: 'flex', alignItems: 'center',
              justifyContent: 'center', margin: '0 auto 16px', fontSize: '24px'
            }}>
              🗑️
            </div>
            <h3 style={{ color: '#e9edef', fontSize: '18px', fontWeight: 600, marginBottom: '10px' }}>
              Delete status update?
            </h3>
            <p style={{ color: '#8696a0', fontSize: '14px', lineHeight: '1.4', marginBottom: '24px' }}>
              Are you sure you want to delete this status update?
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={handleCancelDelete}
                style={{
                  flex: 1, padding: '10px 18px', borderRadius: '24px',
                  border: '1px solid #3b4a54', backgroundColor: 'transparent',
                  color: '#00a884', fontSize: '14px', fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                No
              </button>
              <button
                onClick={handleConfirmDelete}
                style={{
                  flex: 1, padding: '10px 18px', borderRadius: '24px',
                  border: 'none', backgroundColor: '#ea4335',
                  color: '#ffffff', fontSize: '14px', fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#d93025')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ea4335')}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
