import { BaseAgent, AgentType } from './BaseAgent';
import { SpecializedAgent } from './SpecializedAgent';
import GigaChat from 'gigachat';
import { Agent } from 'node:https';

const httpsAgent = new Agent({
  rejectUnauthorized: false, // Отключает проверку корневого сертификата
  // Читайте ниже как можно включить проверку сертификата Мин. Цифры
});


export class GigaChatAgent extends BaseAgent implements SpecializedAgent {
  private client: GigaChat;

  constructor(apiKey: string) {
    super('Вы - специализированный AI-агент на основе GigaChat. ' +
          'Вы можете помогать с различными задачами и предоставлять детальные ответы.',
          AgentType.GIGACHAT);
 
    this.client = new GigaChat({
      timeout: 600,
      model: 'GigaChat-2',
      credentials: apiKey,
      httpsAgent: httpsAgent,
    });

  }

  canHandleRequest(request: string): boolean {
    // GigaChat может обрабатывать любые запросы
    return true;
  }

  async handleRequest(request: string): Promise<string> {
    await this.addUserMessage(request);
    return this.getResponse();
  }

  async getResponse(): Promise<string> {
    try {
      const messages = this.getMessages().map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
    const response = await this.client.chat({
      messages,
      temperature: 0.5
  });

      const result = response.choices[0].message.content;
      
      if (result) {
        this.messages.push({
          role: 'assistant',
          content: result,
        });
        return result;
      }

      throw new Error('Не удалось получить ответ от GigaChat');
    } catch (error) {
      console.error('Ошибка при получении ответа от GigaChat:', error);
      throw error;
    }
  }
} 