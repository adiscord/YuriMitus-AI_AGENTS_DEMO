import { BaseAgent, AgentType } from './BaseAgent';
import { SpecializedAgent } from './SpecializedAgent';
import { DeepSeekAgent } from './DeepSeekAgent';

export class CensorAgent extends BaseAgent implements SpecializedAgent {
  private deepSeekAgent: DeepSeekAgent;

  constructor(apiKey: string) {
    super(
      `Вы - AI-цензор, отвечающий за проверку и контроль качества статей.
      Ваши задачи:
      1. Проверка статей на соответствие журналистским стандартам
      2. Контроль соблюдения этических норм
      3. Проверка фактологической точности
      4. Обеспечение баланса между информативностью и увлекательностью

      Критерии проверки:
      1. Содержание:
         - Фактическая точность
         - Логическая структура
         - Полнота раскрытия темы
         - Соответствие заголовку
      
      2. Стиль:
         - Профессиональный тон
         - Грамотность
         - Ясность изложения
         - Увлекательность повествования

      При обнаружении проблем:
      1. Четко опишите найденные недостатки
      2. Предложите конкретные улучшения
      3. Укажите необходимые изменения
      
      Только после вашего одобрения статья может быть опубликована.`,
      AgentType.CENSOR
    );
    this.deepSeekAgent = new DeepSeekAgent(apiKey);
  }

  canHandleRequest(request: string): boolean {
    const censorKeywords = [
      'проверь', 'проверка', 'контроль', 'цензура',
      'одобрение', 'рецензия', 'аудит'
    ];
    return censorKeywords.some(keyword => request.toLowerCase().includes(keyword.toLowerCase()));
  }

  async handleRequest(request: string): Promise<string> {
    await this.deepSeekAgent.addUserMessage(request);
    return await this.deepSeekAgent.getResponse();
  }

  async reviewArticle(article: string): Promise<string> {
    const reviewPrompt = `Проведите тщательную проверку статьи:

    Текст статьи:
    ${article}

    Проверьте:
    1. Соответствие журналистским стандартам
    2. Этичность содержания
    3. Фактическую точность
    4. Качество изложения
    5. Соответствие теме

    Предоставьте:
    1. Общую оценку качества
    2. Конкретные замечания (если есть)
    3. Рекомендации по улучшению
    4. Финальное решение (одобрить/отклонить/доработать)`;

    await this.deepSeekAgent.addUserMessage(reviewPrompt);
    return await this.deepSeekAgent.getResponse();
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