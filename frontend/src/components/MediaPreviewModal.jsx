import React, { useState, useEffect, useRef } from 'react';

const QUICK_EMOJIS = ['😀', '😂', '😍', '👍', '❤️', '🔥', '🎉', '🙏', '😮', '😢'];

export default function MediaPreviewModal({ initialFiles, onClose, onSend, uploading }) {
  const [items, setItems] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeTool, setActiveTool] = useState(null); // 'rotate', 'crop', 'text', 'draw', 'blur', 'filter'
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!initialFiles || initialFiles.length === 0) return;

    const formattedItems = Array.from(initialFiles).map((file, idx) => ({
      id: `${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 5)}`,
      file,
      previewUrl: URL.createObjectURL(file),
      caption: '',
      type: file.type || (file.name.match(/\.(mp4|webm|mov)$/i) ? 'video/mp4' : 'image/jpeg'),
      name: file.name,
      rotation: 0
    }));

    setItems(formattedItems);
    setActiveIndex(0);

    return () => {
      // Cleanup object URLs
      formattedItems.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
    };
  }, [initialFiles]);

  if (!items || items.length === 0) return null;

  const activeItem = items[activeIndex] || items[0];

  const handleAddFiles = (e) => {
    const newFiles = Array.from(e.target.files || []);
    if (newFiles.length === 0) return;

    const newFormattedItems = newFiles.map((file, idx) => ({
      id: `${Date.now()}-add-${idx}-${Math.random().toString(36).substr(2, 5)}`,
      file,
      previewUrl: URL.createObjectURL(file),
      caption: '',
      type: file.type || (file.name.match(/\.(mp4|webm|mov)$/i) ? 'video/mp4' : 'image/jpeg'),
      name: file.name,
      rotation: 0
    }));

    setItems((prev) => [...prev, ...newFormattedItems]);
    e.target.value = '';
  };

  const handleRemoveItem = (e, indexToRemove) => {
    e.stopPropagation();
    const itemToRemove = items[indexToRemove];
    if (itemToRemove?.previewUrl) {
      URL.revokeObjectURL(itemToRemove.previewUrl);
    }

    const updated = items.filter((_, idx) => idx !== indexToRemove);
    if (updated.length === 0) {
      onClose();
      return;
    }

    setItems(updated);
    if (activeIndex >= updated.length) {
      setActiveIndex(updated.length - 1);
    }
  };

  const handleRotate = () => {
    setItems((prev) =>
      prev.map((item, idx) =>
        idx === activeIndex ? { ...item, rotation: (item.rotation + 90) % 360 } : item
      )
    );
  };

  const handleUpdateCaption = (text) => {
    setItems((prev) =>
      prev.map((item, idx) => (idx === activeIndex ? { ...item, caption: text } : item))
    );
  };

  const handleSelectEmoji = (emoji) => {
    handleUpdateCaption((activeItem.caption || '') + emoji);
    setShowEmojiPicker(false);
  };

  const handleSendAll = () => {
    if (uploading) return;
    onSend(items);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendAll();
    }
  };

  const handleDownloadActive = () => {
    if (!activeItem) return;
    const a = document.createElement('a');
    a.href = activeItem.previewUrl;
    a.download = activeItem.name || 'download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const isVideo = activeItem?.type?.startsWith('video/');

  return (
    <div
      style={{
        position: 'absolute',
        top: '60px',
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#0b141a',
        zIndex: 1500,
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
        onChange={handleAddFiles}
        style={{ display: 'none' }}
        accept="image/*,video/*"
        multiple
      />

      {/* TOP HEADER TOOLBAR (Matches Screenshot 1) */}
      <div
        style={{
          height: '60px',
          backgroundColor: '#111b21',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          borderBottom: '1px solid #222d34',
          flexShrink: 0,
          zIndex: 10
        }}
      >
        {/* Left: Close Button */}
        <button
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
            justifyContent: 'center',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          title="Close (Esc)"
        >
          ✕
        </button>

        {/* Center: Editing Tools Bar (WhatsApp Web Icons) */}
        {!isVideo && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Rotate */}
            <button
              onClick={handleRotate}
              style={{
                background: 'none',
                border: 'none',
                color: '#aebac1',
                fontSize: '18px',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color 0.2s, background 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#e9edef';
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#aebac1';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              title="Rotate image"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7.47 21.49C4.2 19.93 1.86 16.76 1.5 13H0l2.5-4 2.5 4H3.52c.34 3.14 2.27 5.84 5.08 7.15l-1.13 2.34zM24 11l-2.5-4-2.5 4h1.48c-.34-3.14-2.27-5.84-5.08-7.15l1.13-2.34c3.27 1.56 5.61 4.73 5.97 8.49H24z"/>
              </svg>
            </button>

            {/* Filter / Magic Wand */}
            <button
              onClick={() => setActiveTool(activeTool === 'filter' ? null : 'filter')}
              style={{
                background: 'none',
                border: 'none',
                color: activeTool === 'filter' ? '#00a884' : '#aebac1',
                fontSize: '18px',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color 0.2s'
              }}
              title="Stickers / Filters"
            >
              ✨
            </button>

            {/* Pen / Drawing */}
            <button
              onClick={() => setActiveTool(activeTool === 'draw' ? null : 'draw')}
              style={{
                background: 'none',
                border: 'none',
                color: activeTool === 'draw' ? '#00a884' : '#aebac1',
                fontSize: '18px',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Drawing pen"
            >
              ✏️
            </button>

            {/* Text (Aa) */}
            <button
              onClick={() => setActiveTool(activeTool === 'text' ? null : 'text')}
              style={{
                background: 'none',
                border: 'none',
                color: activeTool === 'text' ? '#00a884' : '#aebac1',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                padding: '8px 12px',
                borderRadius: '6px'
              }}
              title="Add text overlay"
            >
              Aa
            </button>

            {/* Crop */}
            <button
              onClick={() => setActiveTool(activeTool === 'crop' ? null : 'crop')}
              style={{
                background: 'none',
                border: 'none',
                color: activeTool === 'crop' ? '#00a884' : '#aebac1',
                fontSize: '18px',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '50%'
              }}
              title="Crop image"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17 15h2V7c0-1.1-.9-2-2-2H9v2h8v8zM7 17V1H5v4H1v2h4v10c0 1.1.9 2 2 2h10v4h2v-4h4v-2H7z"/>
              </svg>
            </button>

            {/* Blur / Mosaic */}
            <button
              onClick={() => setActiveTool(activeTool === 'blur' ? null : 'blur')}
              style={{
                background: 'none',
                border: 'none',
                color: activeTool === 'blur' ? '#00a884' : '#aebac1',
                fontSize: '18px',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '50%'
              }}
              title="Blur parts of photo"
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
              title="High Quality HD"
            >
              <span>HD</span>
              <span style={{ fontSize: '10px' }}>⚙️</span>
            </div>
          </div>
        )}

        {/* Right: Popout & Download */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={handleDownloadActive}
            style={{
              background: 'none',
              border: 'none',
              color: '#aebac1',
              fontSize: '18px',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Download preview image"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* MAIN VIEWPORT / CANVAS PREVIEW (Matches Screenshot 1) */}
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
        {isVideo ? (
          <video
            src={activeItem.previewUrl}
            controls
            autoPlay
            style={{
              maxWidth: '85%',
              maxHeight: '85%',
              borderRadius: '8px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
              outline: 'none'
            }}
          />
        ) : (
          <div
            style={{
              maxWidth: '85%',
              maxHeight: '85%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: `rotate(${activeItem.rotation}deg)`
            }}
          >
            <img
              src={activeItem.previewUrl}
              alt={activeItem.name || 'Preview'}
              style={{
                maxWidth: '100%',
                maxHeight: 'calc(100vh - 260px)',
                objectFit: 'contain',
                borderRadius: '8px',
                boxShadow: '0 12px 40px rgba(0,0,0,0.7)',
                pointerEvents: 'none'
              }}
            />
          </div>
        )}
      </div>

      {/* BOTTOM SECTION: CAPTION INPUT + THUMBNAIL STRIP + GREEN SEND BUTTON */}
      <div
        style={{
          backgroundColor: '#111b21',
          borderTop: '1px solid #222d34',
          padding: '12px 24px 16px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          flexShrink: 0,
          position: 'relative'
        }}
      >
        {/* Caption Input Bar (Screenshot 1: "Type a message") */}
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
              placeholder="Type a message"
              value={activeItem.caption || ''}
              onChange={(e) => handleUpdateCaption(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={uploading}
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

            {/* Emoji Button in Caption */}
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              style={{
                background: 'none',
                border: 'none',
                color: '#8696a0',
                fontSize: '20px',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color 0.15s'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#e9edef')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#8696a0')}
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

        {/* Thumbnail Strip + Green Send Button Row (Matches Screenshot 1) */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', minHeight: '56px' }}>
          {/* Thumbnail List + Add Button (Centered) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              overflowX: 'auto',
              padding: '4px',
              maxWidth: 'calc(100% - 140px)'
            }}
          >
            {items.map((item, idx) => {
              const isActive = idx === activeIndex;
              const isItemVideo = item.type?.startsWith('video/');

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
                    <video
                      src={item.previewUrl}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
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

                  {/* Remove Item Button */}
                  <button
                    type="button"
                    onClick={(e) => handleRemoveItem(e, idx)}
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
                    title="Remove photo"
                  >
                    ✕
                  </button>
                </div>
              );
            })}

            {/* Plus (+) Button to Add More Images/Videos (Screenshot 1) */}
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
                transition: 'border-color 0.2s, color 0.2s',
                flexShrink: 0
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#00a884';
                e.currentTarget.style.color = '#00a884';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#2a3942';
                e.currentTarget.style.color = '#8696a0';
              }}
              title="Add photos or videos"
            >
              +
            </button>
          </div>

          {/* Green Circle Send Button (Matches Screenshot 1) */}
          <div style={{ position: 'absolute', right: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', flexShrink: 0 }}>
            <button
              type="button"
              onClick={handleSendAll}
              disabled={uploading}
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
                cursor: uploading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 16px rgba(0, 168, 132, 0.4)',
                transition: 'transform 0.15s, background-color 0.15s',
                opacity: uploading ? 0.7 : 1
              }}
              onMouseEnter={(e) => !uploading && (e.currentTarget.style.transform = 'scale(1.06)')}
              onMouseLeave={(e) => !uploading && (e.currentTarget.style.transform = 'scale(1)')}
              title="Send (Enter)"
            >
              {uploading ? (
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
