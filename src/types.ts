export interface Tool {
  id: string;
  name: string;
  description: string;
  command: string;
}

export interface Task {
  id: string;
  toolId: string;
  toolName: string;
  command: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  output?: string;
}

export interface ExecutionLog {
  timestamp: string;
  taskId: string;
  toolName: string;
  message: string;
  level: 'info' | 'warn' | 'error';
}
