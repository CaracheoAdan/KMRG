import { api } from './api';
import type { ApiResponse, CreateMessagePayload, UpdateMessagePayload, Message } from '../types';

export const getMessages = async (): Promise<Message[]> => {
  const response = await api.get<ApiResponse<Message[]>>('/admin/messages');
  return response.data.data;
};

export const createMessage = async (payload: CreateMessagePayload): Promise<Message> => {
  const response = await api.post<ApiResponse<Message>>('/admin/messages', payload);
  return response.data.data;
};

export const updateMessage = async (id: string, payload: UpdateMessagePayload): Promise<Message> => {
  const response = await api.put<ApiResponse<Message>>(`/admin/messages/${id}`, payload);
  return response.data.data;
};

export const deleteMessage = async (id: string): Promise<void> => {
  const response = await api.delete<ApiResponse<void>>(`/admin/messages/${id}`);
  return response.data.data;
};
