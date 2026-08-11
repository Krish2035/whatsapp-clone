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

  const intervalRef = useRef(null);
  const progressRef = useRef(0);

  const currentGroup = groups[groupIdx];
  const currentStatus = currentGroup?.statuses?.[statusIdx];
  const isOwnStatus = currentGroup && String(currentGroup.user_id) === String(user?.id);
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
    if (paused || showEmojiPicker || showViewers) return;
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
  }, [currentStatus?.id, paused, showEmojiPicker, showViewers, goNext, duration]);

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

  const handleDelete = async () => {
    if (!currentStatus || !isOwnStatus) return;
    if (!window.confirm('Delete this status?')) return;
    try {
      await deleteStatus(currentStatus.id);
      onDeleteStatus?.();
      goNext();
    } catch (e) {}
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
            <button onClick={handleDelete} style={{
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
            // Others' status: reply + emoji react
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Reply to status..."
                  style={{
                    width: '100%', backgroundColor: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)', borderRadius: '24px',
                    padding: '10px 16px', color: '#fff', fontSize: '14px', outline: 'none',
                    boxSizing: 'border-box', backdropFilter: 'blur(4px)',
                  }}
                  onFocus={() => setPaused(true)}
                  onBlur={() => setPaused(false)}
                />
              </div>
              <button onClick={() => { setShowEmojiPicker((p) => !p); setPaused(true); }} style={{
                width: '44px', height: '44px', borderRadius: '50%', border: 'none',
                backgroundColor: 'rgba(255,255,255,0.12)', color: '#fff', fontSize: '20px',
                cursor: 'pointer',
              }}>😊</button>
            </div>
          )}
        </div>

        {/* Emoji Reaction Picker */}
        {showEmojiPicker && !isOwnStatus && (
          <div style={{
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
    </div>
  );
}
