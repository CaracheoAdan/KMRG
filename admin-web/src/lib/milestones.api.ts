import { api } from './api';
import type {
  ApiResponse,
  CreateMilestonePayload,
  UpdateMilestonePayload,
  Milestone,
} from '../types';

export const getMilestones = async (): Promise<Milestone[]> => {
  const response = await api.get<ApiResponse<Milestone[]>>('/admin/milestones');
  return response.data.data;
};

export const getMilestoneById = async (id: string): Promise<Milestone> => {
  const response = await api.get<ApiResponse<Milestone>>(`/admin/milestones/${id}`);
  return response.data.data;
};

export const createMilestone = async (payload: CreateMilestonePayload): Promise<Milestone> => {
  const response = await api.post<ApiResponse<Milestone>>('/admin/milestones', payload);
  return response.data.data;
};

export const updateMilestone = async (
  id: string,
  payload: UpdateMilestonePayload
): Promise<Milestone> => {
  const response = await api.put<ApiResponse<Milestone>>(`/admin/milestones/${id}`, payload);
  return response.data.data;
};

export const deleteMilestone = async (id: string): Promise<void> => {
  const response = await api.delete<ApiResponse<void>>(`/admin/milestones/${id}`);
  return response.data.data;
};
