import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchStatuses } from '../services/api';
import StatusComposer from './StatusComposer';
import StatusStoryViewer from './StatusStoryViewer';
import { socketService } from '../services/socket';

// Default WhatsApp-style built-in status card shown to all users
const DEFAULT_STATUS_GROUP = {
  user_id: 'default',
  username: 'WhatsApp',
  avatar_url: null,
  avatar_emoji: '✅',
  is_mine: false,
  is_default: true,
  statuses: [
    {
      id: 'default-1',
      media_type: 'text',
      caption: '🌟 WhatsApp keeps your personal messages with end-to-end encryption. Not even WhatsApp can read them.',
      bg_color: '#128c7e',
      duration_ms: 6000,
      created_at: new Date().toISOString(),
      view_count: 0,
      viewed_by_me: false,
      my_reaction: null,
    },
    {
      id: 'default-2',
      media_type: 'text',
      caption: '📱 Status updates disappear after 24 hours. Share moments that matter.',
      bg_color: '#075e54',
      duration_ms: 5000,
      created_at: new Date().toISOString(),
      view_count: 0,
      viewed_by_me: false,
      my_reaction: null,
    },
  ],
};

function timeAgo(dateStr) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(dateStr).toLocaleDateString();
}

function StatusRing({ viewed, children, onClick, size = 50 }) {
  return (
    <div onClick={onClick} style={{
      width: `${size}px`, height: `${size}px`, borderRadius: '50%',
      background: viewed
        ? 'rgba(134, 150, 160, 0.4)'
        : 'conic-gradient(#00a884 0%, #25d366 50%, #128c7e 100%)',
      padding: '2.5px', cursor: 'pointer', flexShrink: 0,
      transition: 'transform 0.2s',
    }}
    onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
    onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
    >
      <div style={{
        width: '100%', height: '100%', borderRadius: '50%',
        overflow: 'hidden', border: '2.5px solid #111b21',
        backgroundColor: '#128c7e', display: 'flex', alignItems: 'center',
        justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: `${size * 0.36}px`,
      }}>
        {children}
      </div>
    </div>
  );
}

const getStoredMyGroup = (userId, userObj) => {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(`wa_my_status_${userId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const now = Date.now();
    const activeStatuses = (parsed.statuses || []).filter((s) => {
      const createdTime = new Date(s.created_at).getTime();
      return !isNaN(createdTime) && (now - createdTime < 24 * 60 * 60 * 1000);
    });

    if (activeStatuses.length === 0) {
      localStorage.removeItem(`wa_my_status_${userId}`);
      return null;
    }

    localStorage.setItem(`wa_my_status_${userId}`, JSON.stringify({ ...parsed, statuses: activeStatuses }));

    return {
      user_id: userId,
      username: userObj?.username || parsed.username || 'You',
      avatar_url: userObj?.avatar_url || parsed.avatar_url || null,
      is_mine: true,
      statuses: activeStatuses
    };
  } catch (e) {
    return null;
  }
};

const saveStoredMyGroup = (userId, groupData) => {
  if (!userId) return;
  if (!groupData || !groupData.statuses || groupData.statuses.length === 0) {
    localStorage.removeItem(`wa_my_status_${userId}`);
    return;
  }
  try {
    const now = Date.now();
    const activeStatuses = groupData.statuses.filter((s) => {
      const createdTime = new Date(s.created_at).getTime();
      return !isNaN(createdTime) && (now - createdTime < 24 * 60 * 60 * 1000);
    });
    if (activeStatuses.length === 0) {
      localStorage.removeItem(`wa_my_status_${userId}`);
    } else {
      localStorage.setItem(
        `wa_my_status_${userId}`,
        JSON.stringify({
          user_id: userId,
          username: groupData.username,
          avatar_url: groupData.avatar_url,
          statuses: activeStatuses
        })
      );
    }
  } catch (e) {}
};

export default function StatusView({ isMobile, onBack }) {
  const { user } = useAuth();
  const [statusGroups, setStatusGroups] = useState([]);
  const [myGroup, setMyGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showComposer, setShowComposer] = useState(false);
  const [composerMode, setComposerMode] = useState('text');
  const [pendingFiles, setPendingFiles] = useState(null);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [viewerData, setViewerData] = useState(null); // { groups, initialGroupIdx }
  const mediaInputRef = useRef(null);

  const handleMediaFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setComposerMode('media');
      setPendingFiles(files);
      setShowComposer(true);
    }
    e.target.value = '';
  };

  const loadStatuses = useCallback(async () => {
    setLoading(true);
    try {
      const currentUserId = user?.id;
      const currentUsername = user?.username;

      const cachedMine = getStoredMyGroup(currentUserId, user);
      if (cachedMine) {
        setMyGroup(cachedMine);
      }

      const groups = await fetchStatuses();

      const mine = groups.find(
        (g) => g.is_mine || (currentUserId && String(g.user_id) === String(currentUserId)) || (currentUsername && g.username.toLowerCase() === currentUsername.toLowerCase())
      ) || cachedMine || null;

      const others = groups.filter((g) => {
        const isUserMine = g.is_mine || (currentUserId && String(g.user_id) === String(currentUserId)) || (currentUsername && g.username?.toLowerCase() === currentUsername?.toLowerCase());
        return !isUserMine;
      });

      setMyGroup(mine);
      setStatusGroups(others);
      if (mine && currentUserId) {
        saveStoredMyGroup(currentUserId, mine);
      }
    } catch (e) {
      console.warn('Failed to load statuses:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const handleStatusCreated = async (createdRes) => {
    const rawStatus = createdRes?.status || createdRes;
    if (rawStatus) {
      const updated = {
        user_id: user?.id || 'my-id',
        username: user?.username || 'You',
        avatar_url: user?.avatar_url || null,
        is_mine: true,
        statuses: [rawStatus, ...(myGroup?.statuses || [])]
      };
      setMyGroup(updated);
      if (user?.id) saveStoredMyGroup(user.id, updated);
    }
    await loadStatuses();
  };

  const handleStatusDeleted = async (deletedStatusId) => {
    setMyGroup((prev) => {
      if (!prev) return null;
      const remaining = (prev.statuses || []).filter((s) => String(s.id) !== String(deletedStatusId));
      const updated = remaining.length === 0 ? null : { ...prev, statuses: remaining };
      if (user?.id) saveStoredMyGroup(user.id, updated);
      return updated;
    });
    setViewerData(null);
    await loadStatuses();
  };

  useEffect(() => { loadStatuses(); }, [loadStatuses]);

  useEffect(() => {
    const socket = socketService.getSocket();
    if (socket) {
      socket.on('new_status', loadStatuses);
      socket.on('status_deleted', loadStatuses);
      return () => {
        socket.off('new_status', loadStatuses);
        socket.off('status_deleted', loadStatuses);
      };
    }
  }, [loadStatuses]);

  const openViewer = (groups, idx) => {
    setViewerData({ groups, initialGroupIdx: idx });
  };

  const allGroupsForViewer = [
    ...(myGroup ? [myGroup] : []),
    DEFAULT_STATUS_GROUP,
    ...statusGroups,
  ];

  const recentStatuses = statusGroups.filter((g) => g.statuses?.length > 0);
  const viewedStatuses = recentStatuses.filter((g) => g.statuses?.every((s) => s.viewed_by_me));
  const unviewedStatuses = recentStatuses.filter((g) => !g.statuses?.every((s) => s.viewed_by_me));

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', backgroundColor: '#111b21' }}>
      {/* ─── LEFT PANEL ─────────────────────────────────────────────── */}
      <div className="wa-sidebar-container" style={{
        width: '360px', minWidth: '320px', borderRight: '1px solid #222d34',
        display: 'flex', flexDirection: 'column', height: '100%',
        backgroundColor: '#111b21',
      }}>
        {/* Header */}
        <div style={{
          height: '60px', backgroundColor: '#202c33',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 16px', borderBottom: '1px solid #222d34',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {isMobile && (
              <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#e9edef', fontSize: '20px', cursor: 'pointer' }}>
                ←
              </button>
            )}
            <h2 style={{ color: '#e9edef', fontSize: '20px', fontWeight: '600', margin: 0 }}>Status</h2>
          </div>
          <div style={{ position: 'relative' }}>
            <input
              type="file"
              ref={mediaInputRef}
              onChange={handleMediaFileChange}
              style={{ display: 'none' }}
              accept="image/*,video/*"
              multiple
            />
            <button onClick={() => setIsAddMenuOpen((prev) => !prev)} title="Add Status" style={{
              width: '38px', height: '38px', borderRadius: '50%', border: 'none',
              backgroundColor: '#00a884', color: '#fff', fontSize: '20px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,168,132,0.4)', transition: 'transform 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >+</button>

            {/* Dropdown Popover Menu (Matches Screenshot 1) */}
            {isAddMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '46px',
                  right: '0',
                  width: '210px',
                  backgroundColor: '#202c33',
                  borderRadius: '12px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                  border: '1px solid #2a3942',
                  padding: '6px 0',
                  zIndex: 100
                }}
              >
                {/* 🖼️ Photos & videos */}
                <div
                  onClick={() => {
                    setIsAddMenuOpen(false);
                    mediaInputRef.current?.click();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '10px 18px',
                    cursor: 'pointer',
                    color: '#e9edef',
                    fontSize: '14px',
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <span style={{ fontSize: '18px' }}>🖼️</span>
                  <span style={{ fontWeight: '500' }}>Photos & videos</span>
                </div>

                {/* ✏️ Text */}
                <div
                  onClick={() => {
                    setIsAddMenuOpen(false);
                    setComposerMode('text');
                    setPendingFiles(null);
                    setShowComposer(true);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '10px 18px',
                    cursor: 'pointer',
                    color: '#e9edef',
                    fontSize: '14px',
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <span style={{ fontSize: '18px' }}>✏️</span>
                  <span style={{ fontWeight: '500' }}>Text</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Scrollable List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* ── My Status ── */}
          <div style={{ padding: '10px 16px 4px', cursor: 'pointer' }}
            onClick={() => {
              if (myGroup && myGroup.statuses?.length > 0) openViewer(allGroupsForViewer, 0);
              else setShowComposer(true);
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '8px 0' }}>
              <div style={{ position: 'relative' }}>
                {myGroup && myGroup.statuses?.length > 0 ? (
                  <StatusRing viewed={false}>
                    {myGroup.statuses[0]?.media_url ? (
                      <img src={myGroup.statuses[0].media_url} alt="My status" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : myGroup.statuses[0]?.media_type === 'text' ? (
                      <div style={{
                        width: '100%', height: '100%',
                        backgroundColor: myGroup.statuses[0].bg_color || '#128c7e',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: '9px', fontWeight: 700, padding: '2px', textAlign: 'center'
                      }}>
                        {myGroup.statuses[0].caption?.slice(0, 5) || 'Text'}
                      </div>
                    ) : user?.avatar_url ? (
                      <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : user?.username?.[0]?.toUpperCase() || 'U'}
                  </StatusRing>
                ) : (
                  <div style={{
                    width: '50px', height: '50px', borderRadius: '50%', overflow: 'hidden',
                    backgroundColor: '#2a3942', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '18px',
                  }}>
                    {user?.avatar_url ? (
                      <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : user?.username?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                {(!myGroup || !myGroup.statuses?.length) && (
                  <div style={{
                    position: 'absolute', bottom: '0', right: '0',
                    backgroundColor: '#00a884', color: 'white', borderRadius: '50%',
                    width: '20px', height: '20px', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: '13px', border: '2.5px solid #111b21',
                    fontWeight: 700,
                  }}>+</div>
                )}
              </div>
              <div>
                <div style={{ color: '#e9edef', fontWeight: 600, fontSize: '15px' }}>My status</div>
                <div style={{ color: '#8696a0', fontSize: '13px', marginTop: '2px' }}>
                  {myGroup && myGroup.statuses?.length > 0
                    ? `${myGroup.statuses.length} update${myGroup.statuses.length > 1 ? 's' : ''} • ${timeAgo(myGroup.statuses[0].created_at)}`
                    : 'Click to add status update'}
                </div>
              </div>
            </div>
          </div>

          {/* ── Default WhatsApp Status ── */}
          <div style={{ paddingTop: '8px', borderTop: '1px solid rgba(34,45,52,0.5)' }}>
            <div style={{ color: '#8696a0', fontSize: '12px', fontWeight: 600, padding: '10px 16px 4px', letterSpacing: '0.5px' }}>
              RECENT UPDATES
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '10px 16px', cursor: 'pointer', transition: 'background 0.15s' }}
              onClick={() => openViewer([DEFAULT_STATUS_GROUP, ...allGroupsForViewer.filter(g => g.user_id !== 'default')], 0)}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <StatusRing viewed={false}>
                <span style={{ fontSize: '22px' }}>✅</span>
              </StatusRing>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: '#e9edef', fontWeight: 500, fontSize: '15px' }}>WhatsApp</div>
                <div style={{ color: '#8696a0', fontSize: '12px', marginTop: '2px' }}>Today</div>
              </div>
              <div style={{ color: '#00a884', fontSize: '11px', fontWeight: 600, background: 'rgba(0,168,132,0.1)', padding: '3px 8px', borderRadius: '10px' }}>
                Official
              </div>
            </div>

            {/* Unviewed contacts */}
            {unviewedStatuses.map((g, i) => {
              const idx = allGroupsForViewer.findIndex((ag) => ag.user_id === g.user_id);
              return (
                <div key={g.user_id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '10px 16px', cursor: 'pointer', transition: 'background 0.15s' }}
                  onClick={() => openViewer(allGroupsForViewer, Math.max(0, idx))}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <StatusRing viewed={false}>
                    {g.statuses?.[0]?.media_url ? (
                      <img src={g.statuses[0].media_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : g.statuses?.[0]?.media_type === 'text' ? (
                      <div style={{
                        width: '100%', height: '100%',
                        backgroundColor: g.statuses[0].bg_color || '#128c7e',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: '9px', fontWeight: 700, padding: '2px', textAlign: 'center'
                      }}>
                        {g.statuses[0].caption?.slice(0, 5) || 'Text'}
                      </div>
                    ) : g.avatar_url ? (
                      <img src={g.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : g.username?.[0]?.toUpperCase()}
                  </StatusRing>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: '#e9edef', fontWeight: 500, fontSize: '15px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {g.username}
                    </div>
                    <div style={{ color: '#8696a0', fontSize: '12px', marginTop: '2px' }}>
                      {timeAgo(g.statuses[0]?.created_at)}
                    </div>
                  </div>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#00a884', flexShrink: 0 }} />
                </div>
              );
            })}
          </div>

          {/* Viewed */}
          {viewedStatuses.length > 0 && (
            <div>
              <div style={{ color: '#8696a0', fontSize: '12px', fontWeight: 600, padding: '16px 16px 4px', letterSpacing: '0.5px' }}>
                VIEWED
              </div>
              {viewedStatuses.map((g) => {
                const idx = allGroupsForViewer.findIndex((ag) => ag.user_id === g.user_id);
                return (
                  <div key={g.user_id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '10px 16px', cursor: 'pointer', transition: 'background 0.15s' }}
                    onClick={() => openViewer(allGroupsForViewer, Math.max(0, idx))}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <StatusRing viewed={true}>
                      {g.avatar_url ? (
                        <img src={g.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : g.username?.[0]?.toUpperCase()}
                    </StatusRing>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: '#8696a0', fontSize: '15px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {g.username}
                      </div>
                      <div style={{ color: '#667781', fontSize: '12px', marginTop: '2px' }}>
                        {timeAgo(g.statuses[0]?.created_at)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {loading && (
            <div style={{ padding: '32px', textAlign: 'center', color: '#8696a0', fontSize: '13px' }}>
              Loading statuses...
            </div>
          )}

          {!loading && recentStatuses.length === 0 && (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: '#8696a0', fontSize: '13px', lineHeight: 1.7 }}>
              No recent status updates from your contacts.
            </div>
          )}
        </div>
      </div>

      {/* ─── RIGHT PANEL ────────────────────────────────────────────── */}
      <div className="wa-chat-container hide-on-mobile" style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#111b21', color: '#8696a0', gap: '20px', padding: '32px',
        backgroundImage: 'radial-gradient(ellipse at 50% 50%, rgba(0,168,132,0.04) 0%, transparent 70%)',
      }}>
        <div style={{
          width: '90px', height: '90px', borderRadius: '50%',
          border: '3px solid rgba(0,168,132,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '42px',
          boxShadow: '0 0 40px rgba(0,168,132,0.1)',
        }}>
          🔒
        </div>
        <h2 style={{ color: '#e9edef', fontWeight: '400', fontSize: '26px', margin: 0 }}>Share statuses</h2>
        <p style={{ color: '#667781', fontSize: '14px', textAlign: 'center', maxWidth: '360px', lineHeight: 1.7, margin: 0 }}>
          Share photos, videos and text that disappear after 24 hours.
          Only your contacts can see your status.
        </p>
        <button onClick={() => setShowComposer(true)} style={{
          marginTop: '8px', padding: '12px 28px', borderRadius: '24px',
          backgroundColor: '#00a884', border: 'none', color: '#fff',
          fontSize: '15px', fontWeight: 600, cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(0,168,132,0.4)',
          transition: 'transform 0.15s, box-shadow 0.15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,168,132,0.5)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,168,132,0.4)'; }}
        >
          + Add Status Update
        </button>
      </div>

      {/* Modals */}
      {showComposer && (
        <StatusComposer
          initialMode={composerMode}
          initialFiles={pendingFiles}
          onClose={() => {
            setShowComposer(false);
            setPendingFiles(null);
          }}
          onCreated={handleStatusCreated}
        />
      )}
      {viewerData && (
        <StatusStoryViewer
          groups={viewerData.groups}
          initialGroupIdx={viewerData.initialGroupIdx}
          onClose={() => setViewerData(null)}
          onDeleteStatus={handleStatusDeleted}
        />
      )}
    </div>
  );
}
