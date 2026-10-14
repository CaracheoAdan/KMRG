export interface Message {
  id: string;
  content: string;
  scheduled_date: string;
  theme_color: string;
  is_read: boolean;
  created_at: string;
}

export interface Milestone {
  id: string;
  title: string;
  date: string;
  image_url: string;
  created_at: string;
}

export interface Interaction {
  id: string;
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
  message: string;
  data: {
    token: string;
    user: AdminUser;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface CreateMessagePayload {
  content: string;
  scheduled_date: string;
  theme_color: string;
  is_read?: boolean;
}

export interface CreateMilestonePayload {
  title: string;
  date: string;
  image_url: string;
}
