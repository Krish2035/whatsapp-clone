import React, { useState, useRef } from 'react';
import { createStatus } from '../services/api';

const BG_COLORS = [
  '#075e54', '#128c7e', '#25d366', '#00a884',
  '#1877f2', '#7c3aed', '#db2777', '#dc2626',
  '#ea580c', '#d97706', '#0d9488', '#0891b2',
];

const EMOJI_REACTIONS = ['❤️', '😂', '😮', '😢', '🙏', '👍'];

export default function StatusComposer({ onClose, onCreated }) {
  const [mode, setMode] = useState('text'); // 'text' | 'media'
  const [text, setText] = useState('');
  const [bgColor, setBgColor] = useState('#128c7e');
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [mediaType, setMediaType] = useState('image');
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isVideo = file.type.startsWith('video/');
    setMediaType(isVideo ? 'video' : 'image');
    const reader = new FileReader();
    reader.onload = (ev) => {
      setMediaFile(ev.target.result); // base64
      setMediaPreview(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (mode === 'text' && !text.trim()) return;
    if (mode === 'media' && !mediaFile) return;
    setLoading(true);
    try {
      let payload;
      if (mode === 'text') {
        payload = { media_type: 'text', caption: text.trim(), bg_color: bgColor };
      } else {
        // Upload via base64
        payload = {
          media_type: mediaType,
          media_url: mediaFile,
          caption: caption.trim(),
          bg_color: bgColor,
          duration_ms: mediaType === 'video' ? 15000 : 5000,
        };
      }
      await createStatus(payload);
      onCreated?.();
      onClose();
    } catch (err) {
      alert('Failed to post status: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100000,
      backgroundColor: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: '420px', maxWidth: '96vw', borderRadius: '20px',
        backgroundColor: '#1a2530', overflow: 'hidden',
        boxShadow: '0 30px 80px rgba(0,0,0,0.8)',
        border: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 20px', backgroundColor: '#202c33',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <h3 style={{ color: '#e9edef', margin: 0, fontSize: '17px', fontWeight: 600 }}>
            Add Status Update
          </h3>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: '#8696a0',
            fontSize: '22px', cursor: 'pointer', lineHeight: 1,
          }}>✕</button>
        </div>

        {/* Mode Toggle */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {['text', 'media'].map((m) => (
            <button key={m} onClick={() => setMode(m)} style={{
              flex: 1, padding: '13px', border: 'none', cursor: 'pointer',
              backgroundColor: mode === m ? '#2a3942' : 'transparent',
              color: mode === m ? '#00a884' : '#8696a0',
              fontSize: '14px', fontWeight: 600, textTransform: 'capitalize',
              borderBottom: mode === m ? '2px solid #00a884' : '2px solid transparent',
              transition: 'all 0.2s',
            }}>
              {m === 'text' ? '✏️ Text' : '📷 Photo / Video'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: '20px', flex: 1 }}>
          {mode === 'text' ? (
            <>
              {/* Text Preview */}
              <div style={{
                width: '100%', minHeight: '180px', borderRadius: '14px',
                backgroundColor: bgColor, display: 'flex', alignItems: 'center',
                justifyContent: 'center', marginBottom: '16px', padding: '20px',
                transition: 'background-color 0.3s',
              }}>
                <textarea
                  autoFocus
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  maxLength={700}
                  placeholder="Type a status..."
                  style={{
                    background: 'none', border: 'none', outline: 'none',
                    color: '#fff', fontSize: '20px', fontWeight: 600,
                    textAlign: 'center', resize: 'none', width: '100%',
                    minHeight: '120px', fontFamily: 'inherit',
                  }}
                />
              </div>
              {/* Color Picker */}
              <div style={{ marginBottom: '4px' }}>
                <div style={{ color: '#8696a0', fontSize: '12px', marginBottom: '8px' }}>BACKGROUND COLOR</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {BG_COLORS.map((c) => (
                    <div key={c} onClick={() => setBgColor(c)} style={{
                      width: '28px', height: '28px', borderRadius: '50%',
                      backgroundColor: c, cursor: 'pointer',
                      border: bgColor === c ? '3px solid #fff' : '3px solid transparent',
                      transition: 'border 0.15s', flexShrink: 0,
                    }} />
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Media Upload */}
              {mediaPreview ? (
                <div style={{ position: 'relative', marginBottom: '16px' }}>
                  {mediaType === 'video' ? (
                    <video src={mediaPreview} controls style={{
                      width: '100%', borderRadius: '12px', maxHeight: '240px', objectFit: 'cover',
                    }} />
                  ) : (
                    <img src={mediaPreview} alt="Preview" style={{
                      width: '100%', borderRadius: '12px', maxHeight: '240px', objectFit: 'cover',
                    }} />
                  )}
                  <button onClick={() => { setMediaPreview(null); setMediaFile(null); }} style={{
                    position: 'absolute', top: '8px', right: '8px',
                    backgroundColor: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff',
                    width: '28px', height: '28px', borderRadius: '50%', cursor: 'pointer', fontSize: '14px',
                  }}>✕</button>
                </div>
              ) : (
                <div onClick={() => fileInputRef.current?.click()} style={{
                  width: '100%', height: '180px', borderRadius: '14px',
                  border: '2px dashed rgba(255,255,255,0.15)', display: 'flex',
                  flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', marginBottom: '16px',
                  transition: 'border-color 0.2s',
                  backgroundColor: 'rgba(255,255,255,0.03)',
                }}>
                  <div style={{ fontSize: '40px', marginBottom: '8px' }}>📸</div>
                  <div style={{ color: '#8696a0', fontSize: '14px' }}>Click to add photo or video</div>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*,video/*"
                onChange={handleFileChange} style={{ display: 'none' }} />
              <input
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a caption..."
                maxLength={200}
                style={{
                  width: '100%', backgroundColor: '#2a3942', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '10px', padding: '10px 14px', color: '#e9edef',
                  fontSize: '14px', outline: 'none', boxSizing: 'border-box',
                }}
              />
            </>
          )}
        </div>

        {/* Submit */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button onClick={handleSubmit} disabled={loading || (mode === 'text' ? !text.trim() : !mediaFile)} style={{
            width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
            backgroundColor: '#00a884', color: '#fff', fontSize: '15px', fontWeight: 700,
            cursor: loading ? 'wait' : 'pointer', opacity: (loading || (mode === 'text' ? !text.trim() : !mediaFile)) ? 0.5 : 1,
            transition: 'opacity 0.2s',
          }}>
            {loading ? 'Posting...' : '✓ Post Status'}
          </button>
        </div>
      </div>
    </div>
  );
}
