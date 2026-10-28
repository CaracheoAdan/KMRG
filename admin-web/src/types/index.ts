export interface Message {
  id: string;
  sender?: string;
  recipient?: string;
  content: string;
  scheduled_date: string;
  theme_color: string;
  is_read: boolean;
  created_at: string;
}

export interface Milestone {
  id: string;
  author?: string;
  title: string;
  date: string;
  image_url: string;
  created_at: string;
}

export interface Interaction {
  id: string;
  sender?: string;
  type: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface AdminUser {
  id: string;
  email: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  data: {
    user: AdminUser;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface CreateMessagePayload {
  sender?: string;
  recipient?: string;
  content: string;
  scheduled_date: string;
  theme_color: string;
  is_read?: boolean;
}

export type UpdateMessagePayload = Partial<CreateMessagePayload>;

export interface CreateMilestonePayload {
  author?: string;
  title: string;
  date: string;
  image_url: string;
}

export type UpdateMilestonePayload = Partial<CreateMilestonePayload>;
