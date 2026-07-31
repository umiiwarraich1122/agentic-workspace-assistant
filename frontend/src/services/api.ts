import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const chatService = {
  sendMessage: async (userId: string, threadId: string, message: string) => {
    const local_time = new Date().toLocaleString();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    const response = await api.post('/chat', {
      user_id: userId,
      thread_id: threadId,
      message,
      local_time,
      timezone
    });
    return response.data;
  },
  getThreads: async (userId: string) => {
    const response = await api.get('/chat/threads', { params: { user_id: userId } });
    return response.data;
  },
  deleteThread: async (threadId: string) => {
    const response = await api.delete(`/chat/threads/${threadId}`);
    return response.data;
  },
  syncData: async (userId: string) => {
    const p1 = api.get('/emails/sync', { headers: { 'X-User-Id': userId } }).catch(e => console.error("Email sync err", e));
    const p2 = api.get('/calendar/sync', { headers: { 'X-User-Id': userId } }).catch(e => console.error("Calendar sync err", e));
    const p3 = api.get('/todos/sync', { headers: { 'X-User-Id': userId } }).catch(e => console.error("Todos sync err", e));
    
    await Promise.all([p1, p2, p3]);
    return { status: "success" };
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
