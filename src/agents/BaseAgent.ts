export interface AgentMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export enum AgentType {
  COORDINATOR = 'coordinator',
  GIGACHAT = 'gigachat',
  DeepSeekAgent = 'deepseek',
  ARTIST = 'artist',
  WRITER = 'writer',
  CENSOR = 'censor',
  LAYOUT = 'layout'
}

export abstract class BaseAgent {
  protected messages: AgentMessage[] = [];
  protected systemPrompt: string;
  protected type: AgentType;

  constructor(systemPrompt: string, type: AgentType) {
    this.systemPrompt = systemPrompt;
    this.type = type;
    this.messages.push({
      role: 'system',
      content: systemPrompt,
    });
  }

  abstract getResponse(): Promise<string>;

  async addUserMessage(content: string): Promise<void> {
    this.messages.push({
      role: 'user',
      content,
    });
  }

  clearHistory(): void {
    this.messages = [{
      role: 'system',
      content: this.systemPrompt,
    }];
  }

  protected getMessages(): AgentMessage[] {
    return this.messages;
  }

  getType(): AgentType {
    return this.type;
  }
} 