export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'member';
  avatar?: string;
  projects?: Project[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Project {
  _id: string;
  name: string;
  description?: string;
  owner: User;
  members: ProjectMember[];
  status: 'planning' | 'active' | 'on-hold' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  startDate: string;
  endDate?: string;
  tags: string[];
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMember {
  user: User;
  role: 'admin' | 'member';
  joinedAt: string;
}

export interface Task {
  _id: string;
  title: string;
  description?: string;
  project: Project | string;
  assignedTo?: User;
  createdBy: User;
  status: 'todo' | 'in-progress' | 'review' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  completedAt?: string;
  estimatedHours?: number;
  actualHours?: number;
  tags: string[];
  attachments: TaskAttachment[];
  comments: TaskComment[];
  dependencies: Task[];
  createdAt: string;
  updatedAt: string;
  isOverdue?: boolean;
}

export interface TaskAttachment {
  filename: string;
  url: string;
  uploadedAt: string;
}

export interface TaskComment {
  user: User;
  content: string;
  createdAt: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export interface ApiResponse<T> {
  message: string;
  data?: T;
  error?: string;
}

export interface Pagination {
  current: number;
  total: number;
  count: number;
  totalCount: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: Pagination;
}

export interface DashboardStats {
  overallStats: {
    todo: number;
    'in-progress': number;
    review: number;
    completed: number;
    cancelled: number;
    total: number;
    overdue: number;
  };
  myStats: {
    todo: number;
    'in-progress': number;
    review: number;
    completed: number;
    cancelled: number;
    total: number;
  };
  recentTasks: Task[];
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  username: string;
  email: string;
  password: string;
  role?: 'admin' | 'member';
}
