import axios from 'axios';

export const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: BACKEND_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const chatService = {
  sendMessageStream: async (userId: string, threadId: string, message: string, attachedDocumentId: string | undefined, onToolStart: (toolName: string) => void, onMessage: (msg: string) => void) => {
    const local_time = new Date().toLocaleString();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    const response = await fetch(`${api.defaults.baseURL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        thread_id: threadId,
        message,
        local_time,
        timezone,
        attached_document_id: attachedDocumentId
      })
    });

    if (!response.body) throw new Error("No response body");
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let finalMessage = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.replace('data: ', ''));
            if (data.type === 'tool_start') {
              onToolStart(data.tool);
            } else if (data.type === 'final') {
              finalMessage = data.content;
              onMessage(data.content);
            } else if (data.type === 'error') {
              console.error("Stream error:", data.content);
              onMessage("Error: " + data.content);
            }
          } catch (e) {
            // parsing error on partial chunk is possible, but usually chunks are full JSON lines
          }
        }
      }
    }
    return finalMessage;
  },
  uploadFile: async (userId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('user_id', userId);
    const response = await api.post('/api/chat/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },
  uploadImage: async (userId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('user_id', userId);
    const response = await api.post('/api/chat/upload-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },
  getThreads: async (userId: string) => {
    const response = await api.get('/api/chat/threads', { params: { user_id: userId } });
    return response.data;
  },
  getThreadMessages: async (threadId: string) => {
    const response = await api.get(`/api/chat/threads/${threadId}`);
    return response.data;
  },
  deleteThread: async (threadId: string) => {
    const response = await api.delete(`/api/chat/threads/${threadId}`);
    return response.data;
  },
  syncData: async (userId: string) => {
    const p1 = api.get('/emails/sync', { headers: { 'X-User-Id': userId } }).catch(e => console.error("Email sync err", e));
    const p2 = api.get('/calendar/sync', { headers: { 'X-User-Id': userId } }).catch(e => console.error("Calendar sync err", e));
    const p3 = api.get('/todos/sync', { headers: { 'X-User-Id': userId } }).catch(e => console.error("Todos sync err", e));
    
    await Promise.all([p1, p2, p3]);
    return { status: "success" };
  },
  clearSyncedData: async (userId: string) => {
    return api.delete('/emails/sync', { headers: { 'X-User-Id': userId } }).catch(e => console.error("Clear sync err", e));
  }
};

export const googleService = {
  getCalendar: async (userId: string) => {
    try {
      const response = await api.get('/calendar', { headers: { 'X-User-Id': userId } });
      return response.data;
    } catch (e) {
      throw new Error("Failed to fetch Google Calendar events");
    }
  },
  getEmails: async (userId: string, query?: string, pageToken?: string) => {
    try {
      const params: any = {};
      if (query) params.query = query;
      if (pageToken) params.page_token = pageToken;
      const response = await api.get('/emails', { headers: { 'X-User-Id': userId }, params });
      return response.data;
    } catch (e) {
      throw new Error("Failed to fetch Gmail emails");
    }
  },
  modifyEmail: async (userId: string, messageId: string, addLabels?: string[], removeLabels?: string[]) => {
    try {
      const response = await api.post(`/emails/${messageId}/modify`, { addLabels, removeLabels }, { headers: { 'X-User-Id': userId } });
      return response.data;
    } catch (e) {
      throw new Error("Failed to modify email labels");
    }
  },
  deleteEmail: async (userId: string, messageId: string) => {
    try {
      const response = await api.delete(`/emails/${messageId}`, { headers: { 'X-User-Id': userId } });
      return response.data;
    } catch (e) {
      throw new Error("Failed to delete email");
    }
  },
  getTasks: async (userId: string) => {
    try {
      const response = await api.get('/todos', { headers: { 'X-User-Id': userId } });
      return response.data;
    } catch (e) {
      throw new Error("Failed to fetch Google Tasks");
    }
  },
  draftEmail: async (userId: string, subject: string, body: string, toRecipients: string[]) => {
    try {
      const response = await api.post('/emails/draft', 
        { subject, body, to_recipients: toRecipients },
        { headers: { 'X-User-Id': userId } }
      );
      return response.data;
    } catch (e) {
      throw new Error("Failed to draft email in Gmail");
    }
  }
};

// Export alias for backwards compatibility
export const graphService = googleService;

export const pantryService = {
  getItems: async (userId: string) => {
    const response = await api.get('/api/pantry', { headers: { 'X-User-Id': userId } });
    return response.data;
  },
  addItem: async (userId: string, data: any) => {
    const response = await api.post('/api/pantry', data, { headers: { 'X-User-Id': userId } });
    return response.data;
  },
  updateItem: async (userId: string, itemId: string, data: any) => {
    const response = await api.put(`/api/pantry/${itemId}`, data, { headers: { 'X-User-Id': userId } });
    return response.data;
  },
  deleteItem: async (userId: string, itemId: string) => {
    const response = await api.delete(`/api/pantry/${itemId}`, { headers: { 'X-User-Id': userId } });
    return response.data;
  }
};
export const githubService = { getRepos: async () => { const response = await api.get('/api/github/repos'); return response.data; } };


