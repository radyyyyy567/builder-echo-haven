/**
 * Shared code between client and server
 * Useful to share types between client and server
 * and/or small pure JS functions that can be used on both client and server
 */

/**
 * Example response type for /api/demo
 */
export interface DemoResponse {
  message: string;
}

// Base types from ERD
export interface User {
  uuid: string;
  username: string;
  email: string;
  role: "admin" | "moderator" | "user";
  status: boolean;
  created_at: string;
  updated_at: string;
}

export interface Group {
  uuid: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Event {
  uuid: string;
  name: string;
  description?: string;
  time_start: string;
  time_end: string;
  status: "scheduled" | "active" | "completed" | "cancelled";
  created_at: string;
  updated_at: string;
}

export interface Survey {
  uuid: string;
  name: string;
  form: any; // JSON object for dynamic forms
  set_point?: string;
  status: "active" | "inactive" | "completed";
  created_at: string;
  updated_at: string;
}

// Relationship types
export interface UserWithGroups extends User {
  groups: Group[];
}

export interface GroupWithUsers extends Group {
  users: User[];
}

export interface EventWithGroups extends Event {
  groups: Group[];
}

export interface SurveyWithEvents extends Survey {
  events: Event[];
}

// API Request/Response types
export interface CreateUserRequest {
  username: string;
  email: string;
  role: "admin" | "moderator" | "user";
  password: string;
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  role?: "admin" | "moderator" | "user";
  status?: boolean;
}

export interface CreateGroupRequest {
  name: string;
  description?: string;
}

export interface UpdateGroupRequest {
  name?: string;
  description?: string;
}

export interface CreateEventRequest {
  name: string;
  description?: string;
  time_start: string;
  time_end: string;
  status?: "scheduled" | "active" | "completed" | "cancelled";
}

export interface UpdateEventRequest {
  name?: string;
  description?: string;
  time_start?: string;
  time_end?: string;
  status?: "scheduled" | "active" | "completed" | "cancelled";
}

export interface CreateSurveyRequest {
  name: string;
  form: any;
  set_point?: string;
  status?: "active" | "inactive" | "completed";
}

export interface UpdateSurveyRequest {
  name?: string;
  form?: any;
  set_point?: string;
  status?: "active" | "inactive" | "completed";
}

// API Response wrappers
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Dashboard stats
export interface DashboardStats {
  totalUsers: number;
  totalGroups: number;
  totalEvents: number;
  totalSurveys: number;
  activeUsers: number;
  activeEvents: number;
  activeSurveys: number;
}

export interface RecentActivity {
  type: "user" | "group" | "event" | "survey";
  action: string;
  details: string;
  time: string;
  status: "success" | "info" | "warning" | "error";
}
