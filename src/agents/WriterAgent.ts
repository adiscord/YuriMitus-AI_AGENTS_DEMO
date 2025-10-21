import { BaseAgent, AgentType } from './BaseAgent';
import { SpecializedAgent } from './SpecializedAgent';
import { GigaChatAgent } from './GigaChatAgent';

export class WriterAgent extends BaseAgent implements SpecializedAgent {
  private gigaChatAgent: GigaChatAgent;

  constructor(apiKey: string) {
    super(
      `Вы - профессиональный AI-писатель, специализирующийся на создании увлекательных и информативных статей.
      Ваш стиль письма должен быть:
      1. Четким и лаконичным
      2. Увлекательным и захватывающим
      3. Хорошо структурированным с правильным потоком мысли
      4. Профессиональным и журналистским
      5. Фактическим и хорошо исследованным
      
      Для каждой статьи:
      1. Создавайте привлекательный заголовок
      2. Пишите захватывающее введение
      3. Развивайте основное содержание с релевантными деталями
      4. Завершайте значимыми выводами
      
      При работе с изображениями:
      1. Органично интегрируйте описания изображений в повествование
      2. Используйте соответствующий контекст и ссылки на визуальный контент
      3. Обеспечивайте гармоничное сочетание текста и изображений`,
      AgentType.WRITER
    );
    this.gigaChatAgent = new GigaChatAgent(apiKey);
  }

  canHandleRequest(request: string): boolean {
    const writingKeywords = [
      'статья', 'напиши', 'текст', 'рассказ',
      'описание', 'история', 'контент'
    ];
    return writingKeywords.some(keyword => request.toLowerCase().includes(keyword.toLowerCase()));
  }

  async handleRequest(request: string): Promise<string> {
    await this.gigaChatAgent.addUserMessage(request);
    return await this.gigaChatAgent.getResponse();
  }

  async getResponse(): Promise<string> {
    const lastMessage = this.messages[this.messages.length - 1];
    if (lastMessage.role !== 'user') return 'Нет сообщения пользователя для обработки';

    const response = await this.handleRequest(lastMessage.content);
    
    this.messages.push({
      role: 'assistant',
      content: response
    });

    return response;
  }
} 