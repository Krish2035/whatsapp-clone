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
  const defaultApiUrl = import.meta.env.VITE_API_URL;
  const baseUrl = defaultApiUrl || '/api';
  const res = await fetch(`${baseUrl}${endpoint}`, options);
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

export async function uploadMedia(fileData, fileName, fileType) {
  return apiFetch('/upload', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ fileData, fileName, fileType }),
  });
}

export async function askMetaAi(prompt) {
  return apiFetch('/ai/chat', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ prompt }),
  });
}
