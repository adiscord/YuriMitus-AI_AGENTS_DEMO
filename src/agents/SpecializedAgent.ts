import { AgentType } from './BaseAgent';

export interface SpecializedAgent {
  canHandleRequest(request: string): boolean;
  handleRequest(request: string): Promise<string>;
  getType(): AgentType;
  addUserMessage(content: string): Promise<void>;
  getResponse(): Promise<string>;
} 