import api from './api';
import { Interaction, ApiResponse } from '../types';

export const getInteractions = async (): Promise<Interaction[]> => {
  const response = await api.get<ApiResponse<Interaction[]>>('/admin/interactions');
  return response.data.data;
};
