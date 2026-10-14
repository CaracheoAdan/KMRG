export interface Message {
  id: string;
  content: string;
  scheduled_date: string;
  theme_color: string;
  is_read: boolean;
  created_at: string;
}

export interface Interaction {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export type RootTabParamList = {
  Hoy: undefined;
  Nosotros: undefined;
};
