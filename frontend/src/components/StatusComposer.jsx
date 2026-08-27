import React, { useState, useEffect, useRef } from 'react';
import { createStatus, uploadMedia } from '../services/api';

const PALETTE_COLORS = [
  '#ff6b6b', // Coral Red (Screenshot 5)
  '#ea580c', // Bright Orange
  '#128c7e', // Teal Green
  '#075e54', // Dark Teal
  '#7c3aed', // Purple
  '#1877f2', // Blue
  '#db2777', // Pink
  '#00a884', // WhatsApp Green
];

const FONTS = [
  'system-ui, -apple-system, sans-serif',
  'Georgia, serif',
  '"Courier New", monospace',
  'Impact, sans-serif',
  '"Comic Sans MS", cursive'
];

const QUICK_EMOJIS = ['😀', '😂', '😍', '👍', '❤️', '🔥', '🎉', '🙏', '😮', '😢'];

export default function StatusComposer({ initialMode = 'text', initialFiles = null, onClose, onCreated }) {
  const [mode, setMode] = useState(initialMode); // 'text' | 'media'

  // Text Status State (Screenshot 5)
  const [text, setText] = useState('');
  const [colorIndex, setColorIndex] = useState(0);
  const [fontIndex, setFontIndex] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Media Status State (Screenshot 3)
  const [mediaItems, setMediaItems] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeTool, setActiveTool] = useState(null);

  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  // Handle Initial Files
  useEffect(() => {
    if (initialFiles && initialFiles.length > 0) {
      setMode('media');
      const items = Array.from(initialFiles).map((file, idx) => ({
        id: `status-media-${Date.now()}-${idx}`,
        file,
        previewUrl: URL.createObjectURL(file),
        caption: '',
        type: file.type?.startsWith('video/') ? 'video' : 'image',
        name: file.name,
        rotation: 0
      }));
      setMediaItems(items);
      setActiveIndex(0);
    }
  }, [initialFiles]);

  // Clean up object URLs
  useEffect(() => {
    return () => {
      mediaItems.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
    };
  }, [mediaItems]);

  const currentColor = PALETTE_COLORS[colorIndex % PALETTE_COLORS.length];
  const currentFont = FONTS[fontIndex % FONTS.length];

  const handleCycleColor = () => {
    setColorIndex((prev) => (prev + 1) % PALETTE_COLORS.length);
  };

  const handleCycleFont = () => {
    setFontIndex((prev) => (prev + 1) % FONTS.length);
  };

  const handleAddMediaFiles = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newItems = files.map((file, idx) => ({
      id: `status-media-add-${Date.now()}-${idx}`,
      file,
      previewUrl: URL.createObjectURL(file),
      caption: '',
      type: file.type?.startsWith('video/') ? 'video' : 'image',
      name: file.name,
      rotation: 0
    }));

    setMediaItems((prev) => [...prev, ...newItems]);
    e.target.value = '';
  };

  const handleRemoveMediaItem = (e, indexToRemove) => {
    e.stopPropagation();
    const itemToRemove = mediaItems[indexToRemove];
    if (itemToRemove?.previewUrl) URL.revokeObjectURL(itemToRemove.previewUrl);

    const updated = mediaItems.filter((_, idx) => idx !== indexToRemove);
    if (updated.length === 0) {
      onClose();
      return;
    }
    setMediaItems(updated);
    if (activeIndex >= updated.length) {
      setActiveIndex(updated.length - 1);
    }
  };

  const handleRotate = () => {
    setMediaItems((prev) =>
      prev.map((item, idx) =>
        idx === activeIndex ? { ...item, rotation: (item.rotation + 90) % 360 } : item
      )
    );
  };

  const handleUpdateCaption = (val) => {
    setMediaItems((prev) =>
      prev.map((item, idx) => (idx === activeIndex ? { ...item, caption: val } : item))
    );
  };

  const handleSelectEmoji = (emoji) => {
    if (mode === 'text') {
      setText((prev) => prev + emoji);
    } else {
      const activeItem = mediaItems[activeIndex];
      handleUpdateCaption((activeItem?.caption || '') + emoji);
    }
    setShowEmojiPicker(false);
  };

  const handleSubmitTextStatus = async () => {
    if (!text.trim() || loading) return;
    setLoading(true);
    try {
      const created = await createStatus({
        media_type: 'text',
        caption: text.trim(),
        bg_color: currentColor,
        duration_ms: 5000
      });
      if (onCreated) await onCreated(created);
      onClose();
    } catch (err) {
      alert('Failed to post status: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitMediaStatus = async () => {
    if (mediaItems.length === 0 || loading) return;
    setLoading(true);
    try {
      let createdItems = [];
      for (const item of mediaItems) {
        let mediaUrl = item.previewUrl;
        if (item.file) {
          const uploaded = await uploadMedia(item.file);
          mediaUrl = uploaded.mediaUrl || uploaded.url;
        }

        const created = await createStatus({
          media_type: item.type,
          media_url: mediaUrl,
          caption: item.caption || '',
          bg_color: '#075e54',
          duration_ms: item.type === 'video' ? 15000 : 5000
        });
        if (created) createdItems.push(created);
      }
      if (onCreated) await onCreated(createdItems[0]);
      onClose();
    } catch (err) {
      alert('Failed to post status: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && mode === 'media') {
      e.preventDefault();
      handleSubmitMediaStatus();
    }
  };

  // ------------------------------------------------------------------
  // MODE 1: TEXT STATUS COMPOSER (Screenshot 5)
  // ------------------------------------------------------------------
  if (mode === 'text') {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100000,
          backgroundColor: currentColor,
          display: 'flex',
          flexDirection: 'column',
          transition: 'background-color 0.4s ease',
          userSelect: 'none'
        }}
      >
        {/* Hidden File Input if user switches */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleAddMediaFiles}
          style={{ display: 'none' }}
          accept="image/*,video/*"
          multiple
        />

        {/* Top Header Bar */}
        <div
          style={{
            height: '60px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            flexShrink: 0
          }}
        >
          {/* Top Left Close Button */}
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              fontSize: '22px',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '50%'
            }}
            title="Close"
          >
            ✕
          </button>

          {/* Top Right Controls: Emoji, Font (Aa), Palette (🎨) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'relative' }}>
            {/* Emoji Button */}
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                fontSize: '20px',
                cursor: 'pointer',
                padding: '6px'
              }}
              title="Emoji"
            >
              😀
            </button>

            {/* Emoji Popover */}
            {showEmojiPicker && (
              <div
                style={{
                  position: 'absolute',
                  top: '50px',
                  right: '90px',
                  backgroundColor: '#202c33',
                  borderRadius: '16px',
                  padding: '8px 12px',
                  display: 'flex',
                  gap: '8px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                  border: '1px solid #2a3942',
                  zIndex: 20
                }}
              >
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleSelectEmoji(emoji)}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '20px',
                      cursor: 'pointer',
                      padding: '4px',
                      borderRadius: '50%',
                      transition: 'transform 0.15s'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.3)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            {/* Font Switcher (Aa) */}
            <button
              type="button"
              onClick={handleCycleFont}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                fontSize: '18px',
                fontWeight: 'bold',
                cursor: 'pointer',
                padding: '6px 10px',
                borderRadius: '6px',
                fontFamily: currentFont
              }}
              title="Change font family"
            >
              Aa
            </button>

            {/* Color Palette Toggle (🎨) */}
            <button
              type="button"
              onClick={handleCycleColor}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                fontSize: '20px',
                cursor: 'pointer',
                padding: '6px'
              }}
              title="Change background color"
            >
              🎨
            </button>
          </div>
        </div>

        {/* Main Textarea Canvas (Screenshot 5) */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 24px'
          }}
        >
          <textarea
            autoFocus
            placeholder="Type a status"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={700}
            style={{
              width: '100%',
              maxWidth: '800px',
              backgroundColor: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'white',
              fontSize: '42px',
              fontWeight: '700',
              textAlign: 'center',
              resize: 'none',
              fontFamily: currentFont,
              lineHeight: 1.3
            }}
          />
        </div>

        {/* Bottom Section (Screenshot 5: Status (Contacts) Pill + Green Send Button) */}
        <div
          style={{
            padding: '24px 32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'relative'
          }}
        >
          {/* Bottom Left Privacy Pill: Status (Contacts) */}
          <div
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              backgroundColor: 'rgba(0, 0, 0, 0.25)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              color: 'white',
              fontSize: '13px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backdropFilter: 'blur(4px)',
              cursor: 'pointer'
            }}
          >
            <span
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                backgroundColor: '#00a884',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px'
              }}
            >
              👁
            </span>
            <span>Status (Contacts)</span>
          </div>

          {/* Bottom Right Green Circle Send Button */}
          <button
            type="button"
            onClick={handleSubmitTextStatus}
            disabled={loading || !text.trim()}
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: '#00a884',
              border: 'none',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: loading || !text.trim() ? 'not-allowed' : 'pointer',
              opacity: loading || !text.trim() ? 0.6 : 1,
              boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
              transition: 'transform 0.15s'
            }}
            title="Send Status"
          >
            {loading ? (
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  border: '2px solid white',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite'
                }}
              />
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // MODE 2: MEDIA STATUS PREVIEW WINDOW (Screenshot 3)
  // ------------------------------------------------------------------
  const activeItem = mediaItems[activeIndex] || mediaItems[0];
  const isVideo = activeItem?.type === 'video';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100000,
        backgroundColor: '#0b141a',
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none',
        overflow: 'hidden'
      }}
    >
      {/* Hidden File Input for Adding More Media */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleAddMediaFiles}
        style={{ display: 'none' }}
        accept="image/*,video/*"
        multiple
      />

      {/* TOP HEADER TOOLBAR (Matches Screenshot 3) */}
      <div
        style={{
          height: '60px',
          backgroundColor: '#111b21',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          borderBottom: '1px solid #222d34',
          flexShrink: 0
        }}
      >
        {/* Left: Close Button */}
        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#aebac1',
            fontSize: '22px',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Close"
        >
          ✕
        </button>

        {/* Center: Editing Tools Bar (Screenshot 3) */}
        {!isVideo && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Rotate */}
            <button
              type="button"
              onClick={handleRotate}
              style={{
                background: 'none',
                border: 'none',
                color: '#aebac1',
                fontSize: '18px',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '50%'
              }}
              title="Rotate image"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7.47 21.49C4.2 19.93 1.86 16.76 1.5 13H0l2.5-4 2.5 4H3.52c.34 3.14 2.27 5.84 5.08 7.15l-1.13 2.34zM24 11l-2.5-4-2.5 4h1.48c-.34-3.14-2.27-5.84-5.08-7.15l1.13-2.34c3.27 1.56 5.61 4.73 5.97 8.49H24z"/>
              </svg>
            </button>

            {/* Filter / Magic Wand */}
            <button
              type="button"
              onClick={() => setActiveTool(activeTool === 'filter' ? null : 'filter')}
              style={{
                background: 'none',
                border: 'none',
                color: activeTool === 'filter' ? '#00a884' : '#aebac1',
                fontSize: '18px',
                cursor: 'pointer',
                padding: '8px'
              }}
              title="Stickers / Filters"
            >
              ✨
            </button>

            {/* Pen / Drawing */}
            <button
              type="button"
              onClick={() => setActiveTool(activeTool === 'draw' ? null : 'draw')}
              style={{
                background: 'none',
                border: 'none',
                color: activeTool === 'draw' ? '#00a884' : '#aebac1',
                fontSize: '18px',
                cursor: 'pointer',
                padding: '8px'
              }}
              title="Drawing pen"
            >
              ✏️
            </button>

            {/* Text (Aa) */}
            <button
              type="button"
              onClick={() => setActiveTool(activeTool === 'text' ? null : 'text')}
              style={{
                background: 'none',
                border: 'none',
                color: activeTool === 'text' ? '#00a884' : '#aebac1',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                padding: '8px 12px'
              }}
              title="Add text"
            >
              Aa
            </button>

            {/* Crop */}
            <button
              type="button"
              onClick={() => setActiveTool(activeTool === 'crop' ? null : 'crop')}
              style={{
                background: 'none',
                border: 'none',
                color: activeTool === 'crop' ? '#00a884' : '#aebac1',
                fontSize: '18px',
                cursor: 'pointer',
                padding: '8px'
              }}
              title="Crop image"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17 15h2V7c0-1.1-.9-2-2-2H9v2h8v8zM7 17V1H5v4H1v2h4v10c0 1.1.9 2 2 2h10v4h2v-4h4v-2H7z"/>
              </svg>
            </button>

            {/* Blur / Mosaic */}
            <button
              type="button"
              onClick={() => setActiveTool(activeTool === 'blur' ? null : 'blur')}
              style={{
                background: 'none',
                border: 'none',
                color: activeTool === 'blur' ? '#00a884' : '#aebac1',
                fontSize: '18px',
                cursor: 'pointer',
                padding: '8px'
              }}
              title="Blur photo"
            >
              ░
            </button>

            {/* HD Badge */}
            <div
              style={{
                padding: '3px 8px',
                borderRadius: '4px',
                backgroundColor: '#202c33',
                color: '#00a884',
                fontSize: '12px',
                fontWeight: '700',
                letterSpacing: '0.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                border: '1px solid #00a884'
              }}
            >
              <span>HD</span>
              <span style={{ fontSize: '10px' }}>⚙️</span>
            </div>
          </div>
        )}

        {/* Right: Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={() => {
              if (!activeItem) return;
              const a = document.createElement('a');
              a.href = activeItem.previewUrl;
              a.download = activeItem.name || 'status';
              a.click();
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#aebac1',
              fontSize: '18px',
              cursor: 'pointer',
              padding: '8px'
            }}
            title="Download preview"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* MAIN VIEWPORT PREVIEW (Matches Screenshot 3) */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          padding: '20px',
          overflow: 'hidden',
          backgroundColor: '#0b141a'
        }}
      >
        {activeItem && isVideo ? (
          <video
            src={activeItem.previewUrl}
            controls
            autoPlay
            style={{
              maxWidth: '85%',
              maxHeight: '85%',
              borderRadius: '8px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)'
            }}
          />
        ) : activeItem ? (
          <div
            style={{
              maxWidth: '85%',
              maxHeight: '85%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: `rotate(${activeItem.rotation || 0}deg)`,
              transition: 'transform 0.3s'
            }}
          >
            <img
              src={activeItem.previewUrl}
              alt="Status Preview"
              style={{
                maxWidth: '100%',
                maxHeight: 'calc(100vh - 260px)',
                objectFit: 'contain',
                borderRadius: '8px',
                boxShadow: '0 12px 40px rgba(0,0,0,0.7)'
              }}
            />
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              cursor: 'pointer',
              color: '#8696a0',
              textAlign: 'center',
              fontSize: '16px'
            }}
          >
            Click to select photo or video
          </div>
        )}
      </div>

      {/* BOTTOM SECTION: CAPTION INPUT + THUMBNAIL STRIP + STATUS PRIVACY PILL + GREEN SEND BUTTON (Matches Screenshot 3) */}
      <div
        style={{
          backgroundColor: '#111b21',
          borderTop: '1px solid #222d34',
          padding: '12px 24px 16px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          flexShrink: 0
        }}
      >
        {/* Caption Input Bar (Screenshot 3: "Add a caption") */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', position: 'relative' }}>
          <div
            style={{
              maxWidth: '650px',
              width: '100%',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#2a3942',
              borderRadius: '8px',
              padding: '0 12px 0 16px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
            }}
          >
            <input
              type="text"
              placeholder="Add a caption"
              value={activeItem?.caption || ''}
              onChange={(e) => handleUpdateCaption(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              style={{
                flex: 1,
                height: '42px',
                backgroundColor: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#e9edef',
                fontSize: '15px'
              }}
            />

            {/* Emoji Button */}
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              style={{
                background: 'none',
                border: 'none',
                color: '#8696a0',
                fontSize: '20px',
                cursor: 'pointer',
                padding: '4px'
              }}
              title="Emoji"
            >
              😀
            </button>

            {/* Quick Emoji Popover */}
            {showEmojiPicker && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '54px',
                  right: '0px',
                  backgroundColor: '#202c33',
                  borderRadius: '16px',
                  padding: '8px 12px',
                  display: 'flex',
                  gap: '8px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                  border: '1px solid #2a3942',
                  zIndex: 20
                }}
              >
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleSelectEmoji(emoji)}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '20px',
                      cursor: 'pointer',
                      padding: '4px',
                      borderRadius: '50%',
                      transition: 'transform 0.15s'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.3)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Thumbnail Strip + Privacy Pill + Green Send Button (Matches Screenshot 3) */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', minHeight: '56px' }}>
          {/* Bottom Left Privacy Pill: Status (Contacts) (Screenshot 3) */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              padding: '6px 14px',
              borderRadius: '20px',
              backgroundColor: 'rgba(0, 168, 132, 0.12)',
              border: '1px solid rgba(0, 168, 132, 0.4)',
              color: '#00a884',
              fontSize: '13px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer'
            }}
          >
            <span
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                backgroundColor: '#00a884',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px'
              }}
            >
              👁
            </span>
            <span>Status (Contacts)</span>
          </div>

          {/* Centered Thumbnail List + Add Button (Screenshot 3) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              overflowX: 'auto',
              padding: '4px',
              maxWidth: 'calc(100% - 320px)'
            }}
          >
            {mediaItems.map((item, idx) => {
              const isActive = idx === activeIndex;
              const isItemVideo = item.type === 'video';

              return (
                <div
                  key={item.id}
                  onClick={() => setActiveIndex(idx)}
                  style={{
                    position: 'relative',
                    width: '56px',
                    height: '56px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    border: isActive ? '2px solid #00a884' : '2px solid transparent',
                    boxShadow: isActive ? '0 0 10px rgba(0, 168, 132, 0.4)' : 'none',
                    opacity: isActive ? 1 : 0.7,
                    transition: 'all 0.15s ease',
                    flexShrink: 0,
                    backgroundColor: '#1f2c34'
                  }}
                >
                  {isItemVideo ? (
                    <video src={item.previewUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <img
                      src={item.previewUrl}
                      alt={`Thumb ${idx}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transform: `rotate(${item.rotation}deg)`
                      }}
                    />
                  )}

                  {/* Remove Item */}
                  <button
                    type="button"
                    onClick={(e) => handleRemoveMediaItem(e, idx)}
                    style={{
                      position: 'absolute',
                      top: '2px',
                      right: '2px',
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(0,0,0,0.7)',
                      color: 'white',
                      border: 'none',
                      fontSize: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      padding: 0
                    }}
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>
              );
            })}

            {/* Plus (+) Button to Add More Images/Videos */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '8px',
                border: '1.5px dashed #2a3942',
                backgroundColor: '#111b21',
                color: '#8696a0',
                fontSize: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0
              }}
              title="Add photos or videos"
            >
              +
            </button>
          </div>

          {/* Bottom Right Green Circle Send Button (Screenshot 3) */}
          <div style={{ position: 'absolute', right: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', flexShrink: 0 }}>
            <button
              type="button"
              onClick={handleSubmitMediaStatus}
              disabled={loading || mediaItems.length === 0}
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: '#00a884',
                border: 'none',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: loading || mediaItems.length === 0 ? 'not-allowed' : 'pointer',
                opacity: loading || mediaItems.length === 0 ? 0.6 : 1,
                boxShadow: '0 4px 16px rgba(0,168,132,0.4)',
                transition: 'transform 0.15s'
              }}
              title="Send Status"
            >
              {loading ? (
                <div
                  style={{
                    width: '22px',
                    height: '22px',
                    border: '2px solid white',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                  }}
                />
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
