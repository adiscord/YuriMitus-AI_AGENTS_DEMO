import { BaseAgent } from './BaseAgent';
import { CoordinatorAgent } from './CoordinatorAgent';
import { GigaChatAgent } from './GigaChatAgent';
import { ArtistAgent } from './ArtistAgent';
import { WriterAgent } from './WriterAgent';
import { CensorAgent } from './CensorAgent';
import { LayoutAgent } from './LayoutAgent';
import { SpecializedAgent } from './SpecializedAgent';
import { DeepSeekAgent } from './DeepSeekAgent';

export enum AgentType {
  COORDINATOR = 'coordinator',
  DEEPSEEK = 'deepseek',
  GIGACHAT = 'gigachat',
  ARTIST = 'artist',
  WRITER = 'writer',
  CENSOR = 'censor',
  LAYOUT = 'layout'
}

export class AgentFactory {
  static createAgent(
    type: AgentType,
    systemPrompt: string,
    apiKey: string,
    deepSeekKey: string
  ): BaseAgent {
    switch (type) {
      case AgentType.GIGACHAT:
        return new GigaChatAgent(apiKey);
      case AgentType.ARTIST:
        return new ArtistAgent(apiKey);
      case AgentType.WRITER:
        return new WriterAgent(apiKey);
      case AgentType.DEEPSEEK:
          return new DeepSeekAgent(deepSeekKey);  
      case AgentType.CENSOR:
        return new CensorAgent(deepSeekKey);
      case AgentType.LAYOUT:
        return new LayoutAgent();
      case AgentType.COORDINATOR:
        const specializedAgents: SpecializedAgent[] = [
          new GigaChatAgent(apiKey),
          new DeepSeekAgent(deepSeekKey),
          new ArtistAgent(apiKey),
          new WriterAgent(apiKey),
          new CensorAgent(deepSeekKey),
          new LayoutAgent()
        ];
        return new CoordinatorAgent(specializedAgents, apiKey);
      default:
        throw new Error(`Unsupported agent type: ${type}`);
    }
  }
} 