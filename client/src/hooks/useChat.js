import api from "../utils/axios";

/* ------------------------------ messages api ---------------------------- */

/** Create or fetch the one-to-one chat with a user. */
export const getOrCreateChat = async (userId) => {
  const { data } = await api.post("/chat", { userId });
  return data;
};

/** Full message history for a chat. */
export const getMessages = async (chatId) => {
  const { data } = await api.get(`/message/${chatId}`);
  return data;
};

export const createMessage = async (payload) => {
  const { data } = await api.post("/message", payload);
  return data;
};

export const updateMessage = async (messageId, content) => {
  const { data } = await api.put(`/message/${messageId}`, { content });
  return data;
};

/** Returns the raw axios response because the caller reads `data.data`. */
export const deleteMessage = (messageId, mode) =>
  api.delete(`/message/${messageId}`, { data: { mode } });

export const togglePinMessage = async (messageId) => {
  const { data } = await api.put(`/message/${messageId}/pin`, {});
  return data;
};

export const reactToMessage = async (messageId, emoji) => {
  const { data } = await api.put(`/message/${messageId}/react`, { emoji });
  return data;
};

export const clearChatMessages = (chatId) =>
  api.delete(`/message/clear/${chatId}`);

/* ------------------------------- upload api ----------------------------- */

/**
 * Upload a file and return its public url.
 * Uses explicit multipart header expected by backend.
 */
export const uploadFile = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await api.post("/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.url;
};
