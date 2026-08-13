const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

async function handleResponse(res) {
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch (e) {
    throw new Error(`Server returned non-JSON response (${res.status})`);
  }
  if (!res.ok) {
    throw new Error(data.error || data.message || `Request failed (${res.status})`);
  }
  return data;
}

async function apiFetch(endpoint, options = {}) {
  let baseUrl = import.meta.env.VITE_API_URL || '/api';
  if (baseUrl.startsWith('http') && !baseUrl.endsWith('/api')) {
    baseUrl = baseUrl.replace(/\/+$/, '') + '/api';
  }
  const url = `${baseUrl}${endpoint}`;
  const res = await fetch(url, options);
  return handleResponse(res);
}

export async function registerUser(username, email, password) {
  return apiFetch('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  });
}

export async function loginUser(email, password) {
  return apiFetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
}

export async function fetchMe() {
  const data = await apiFetch('/users/me', {
    headers: getAuthHeaders(),
  });
  return data.user || data;
}

export async function updateProfile(status_message, avatar_url) {
  const data = await apiFetch('/users/profile', {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status_message, avatar_url }),
  });
  return data.user || data;
}

export async function searchUsers(query) {
  const data = await apiFetch(`/users/search?q=${encodeURIComponent(query)}`, {
    headers: getAuthHeaders(),
  });
  return data.users || [];
}

export async function fetchChats() {
  const data = await apiFetch('/chats', {
    headers: getAuthHeaders(),
  });
  return data.chats || data.conversations || [];
}

export async function createChat(participant_ids, is_group = false, group_name = '') {
  const data = await apiFetch('/chats', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ 
      participant_ids, 
      receiverId: Array.isArray(participant_ids) ? participant_ids[0] : participant_ids,
      is_group, 
      group_name 
    }),
  });
  return data.chat || data.conversation || data;
}

export async function fetchMessages(chatId) {
  const data = await apiFetch(`/messages/${chatId}`, {
    headers: getAuthHeaders(),
  });
  return data.messages || [];
}

export async function sendMessage(chatId, content, replyToId = null, mediaUrl = null, mediaType = null) {
  const data = await apiFetch('/messages', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ chatId, content, replyToId, mediaUrl, mediaType }),
  });
  return data.message || data;
}

export async function editMessage(messageId, content) {
  const data = await apiFetch(`/messages/${messageId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ content }),
  });
  return data.message || data;
}

export async function deleteMessage(messageId) {
  const data = await apiFetch(`/messages/${messageId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return data.message || data;
}

export async function addReaction(messageId, emoji) {
  return apiFetch('/messages/reaction', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ messageId, emoji }),
  });
}

export async function markAsRead(chatId) {
  return apiFetch('/messages/mark-read', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ chatId, conversationId: chatId }),
  });
}

export async function uploadMedia(file) {
  const formData = new FormData();
  formData.append('file', file);

  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let baseUrl = import.meta.env.VITE_API_URL || '/api';
  if (baseUrl.startsWith('http') && !baseUrl.endsWith('/api')) {
    baseUrl = baseUrl.replace(/\/+$/, '') + '/api';
  }

  const res = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers,
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(err.error || 'Upload failed');
  }
  return res.json();
}

export async function askMetaAi(prompt) {
  return apiFetch('/ai/chat', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ prompt }),
  });
}

// ── Status API ──────────────────────────────────────────────────────────────

export async function fetchStatuses() {
  const data = await apiFetch('/statuses', { headers: getAuthHeaders() });
  return data.statusGroups || [];
}

export async function createStatus({ media_url, media_type, caption, bg_color, duration_ms }) {
  const data = await apiFetch('/statuses', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ media_url, media_type, caption, bg_color, duration_ms }),
  });
  return data.status;
}

export async function deleteStatus(statusId) {
  return apiFetch(`/statuses/${statusId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
}

export async function viewStatus(statusId) {
  return apiFetch(`/statuses/${statusId}/view`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
}

export async function fetchStatusViewers(statusId) {
  const data = await apiFetch(`/statuses/${statusId}/viewers`, {
    headers: getAuthHeaders(),
  });
  return data.viewers || [];
}

export async function reactToStatus(statusId, emoji) {
  return apiFetch(`/statuses/${statusId}/react`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ emoji }),
  });
}

// ── Call API ──────────────────────────────────────────────────────────────

export async function fetchCalls() {
  const data = await apiFetch('/calls', { headers: getAuthHeaders() });
  return data.calls || [];
}

export async function createCallRecord(receiverId, conversationId = null, callType = 'audio') {
  const data = await apiFetch('/calls', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ receiverId, conversationId, callType }),
  });
  return data.call;
}

export async function updateCallStatus(callId, status, duration_seconds = 0) {
  const data = await apiFetch(`/calls/${callId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status, duration_seconds }),
  });
  return data.call;
}

export async function clearChat(chatId) {
  return apiFetch(`/chats/${chatId}/clear`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
}

export async function deleteChat(chatId) {
  return apiFetch(`/chats/${chatId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
}

