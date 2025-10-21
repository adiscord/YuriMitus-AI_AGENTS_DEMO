import { BaseAgent, AgentType, AgentMessage } from './BaseAgent';
import { SpecializedAgent } from './SpecializedAgent';
import { GigaChatAgent } from './GigaChatAgent';
import { CensorAgent } from './CensorAgent';
import { LayoutAgent } from './LayoutAgent';

interface ArticleResponse {
  article: string;
  censorReview: string;
  imagePath: string;
  htmlPath: string;
  completedStages: {
    topicDefined: boolean;
    articleCreated: boolean;
    imagePromptCreated: boolean;
    imageGenerated: boolean;
    articleReviewed: boolean;
    pageCreated: boolean;
  };
  logs: {
    agentActions: Array<{
      agent: string;
      action: string;
      details: string;
    }>;
    interactions: Array<{
      fromAgent: string;
      toAgent: string;
      message: string;
    }>;
  };
}
type reviewData = {
  review:string,
  article: string
}

export class CoordinatorAgent extends BaseAgent {
  private specializedAgents: SpecializedAgent[];
  private gigaChatAgent: GigaChatAgent;
  private censorAgent: CensorAgent;
  private layoutAgent: LayoutAgent;
  private agentActions: Array<{
    agent: string;
    action: string;
    details: string;
  }> = [];
  private interactions: Array<{
    fromAgent: string;
    toAgent: string;
    message: string;
  }> = [];

  constructor(specializedAgents: SpecializedAgent[], apiKey: string) {
    super(
      `Вы - профессиональный AI-журналист. Ваши задачи включают:
      1. Анализ тем и создание подробных планов статей
      2. Разработку точных и креативных промптов для генерации изображений
      3. Координацию работы специализированных агентов (писателя и художника) для создания комплексного медиаконтента
      4. Обеспечение высокого качества статей через проверку цензором
      5. Передачу готовой статьи и изображения верстальщику для создания HTML страницы

      Ваш рабочий процесс:
      1. Анализ темы
      2. Создание промпта для изображения и получение иллюстрации
      3. Работа с агентом-писателем для создания увлекательной статьи
      4. Проверка статьи агентом-цензором
      5. Внесение необходимых исправлений
      6. Передача готового контента верстальщику
      7. Финальное одобрение и публикация

      Всегда поддерживайте высокие редакционные стандарты и обеспечивайте гармоничную интеграцию текста и визуального контента.`,
      AgentType.COORDINATOR
    );
    this.specializedAgents = specializedAgents;
    this.gigaChatAgent = new GigaChatAgent(apiKey);
    this.censorAgent = new CensorAgent(process.env.DEEPSEEK_KEY ?? '');
    this.layoutAgent = new LayoutAgent();
  }

  private logAgentAction(agent: string, action: string, details: string): void {
    this.agentActions.push({ agent, action, details });
    console.log(`[${agent}] ${action}: ${details}`);
  }

  private logInteraction(fromAgent: string, toAgent: string, message: string): void {
    this.interactions.push({ fromAgent, toAgent, message });
    console.log(`[${fromAgent} → ${toAgent}] ${message}`);
  }

  private async createImagePrompt(topic: string): Promise<string> {
    this.logAgentAction('Координатор', 'Создание промпта для изображения', `Тема: ${topic}`);
    
    await this.gigaChatAgent.addUserMessage(
      `Как профессиональный журналист, мне нужен детальный промпт для изображения на тему: "${topic}". 
      Создайте яркое и конкретное описание, которое приведет к созданию изображения, наилучшим образом иллюстрирующего эту тему. 
      Сосредоточьтесь на ключевых визуальных элементах, стиле, настроении и композиции. 
      Сделайте промпт детальным, но лаконичным.`
    );
    
    const prompt = await this.gigaChatAgent.getResponse();
    this.logInteraction('Координатор', 'GigaChat', 'Запрос промпта для изображения');
    this.logInteraction('GigaChat', 'Координатор', prompt);
    
    return prompt;
  }

  private findSpecializedAgent(type: AgentType): SpecializedAgent | undefined {
    return this.specializedAgents.find(agent => agent.getType() === type);
  }


  private async reviewAndImproveArticle(article: string): Promise<reviewData> {
    this.logAgentAction('Координатор', 'Отправка статьи цензору', 'Проверка качества');
    this.logInteraction('Координатор', 'Цензор', 'Проверка статьи');
    
    // Получаем рецензию от цензора
    const review = await this.censorAgent.reviewArticle(article);
    this.logInteraction('Цензор', 'Координатор', review);
    
    // Если цензор требует доработки, отправляем статью на улучшение
    if (review.toLowerCase().includes('доработать')) {
      this.logAgentAction('Координатор', 'Запрос улучшения статьи', 'Доработка по замечаниям цензора');
      
      const improvementPrompt = `Улучшите следующий текст статьи согласно замечаниям цензора:

      Текст статьи:
      ${article}

      Замечания цензора:
      ${review}

      Внесите необходимые улучшения, сохраняя основную идею и структуру.`;

      this.logInteraction('Координатор', 'GigaChat', 'Запрос улучшения статьи');
      await this.gigaChatAgent.addUserMessage(improvementPrompt);
      const improvedArticle = await this.gigaChatAgent.getResponse();
      this.logInteraction('GigaChat', 'Координатор', 'Улучшенная статья');   
        return { review, article:improvedArticle};
 
    }
    
    // Если цензор одобрил статью без изменений, возвращаем оригинальную статью
    return {review, article:article};
  }

  private async createArticle(topic: string): Promise<string> {
    this.logAgentAction('Координатор', 'Создание статьи', `Тема: ${topic}`);
    
    const writerAgent = this.findSpecializedAgent(AgentType.WRITER);
    if (!writerAgent) {
      throw new Error('Агент-писатель не найден');
    }

    const articlePrompt = `Напишите подробную статью на тему: "${topic}".
    Статья должна быть:
    1. Информативной и хорошо структурированной
    2. Написана профессиональным языком
    3. Содержать интересные факты и примеры
    4. Быть увлекательной для чтения`;

    this.logInteraction('Координатор', 'Писатель', 'Запрос на создание статьи');
    await writerAgent.addUserMessage(articlePrompt);
    const article = await writerAgent.getResponse();
    this.logInteraction('Писатель', 'Координатор', 'Статья создана');
    
    return article;
  }

  async getResponse(): Promise<string> {
    const lastMessage = this.messages[this.messages.length - 1];
    if (lastMessage.role !== 'user') return 'Нет сообщения пользователя для обработки';

    const topic = lastMessage.content;
    this.logAgentAction('Координатор', 'Начало работы', `Тема: ${topic}`);
    
    try {
      // Создаем статью
      const article = await this.createArticle(topic);
      this.logAgentAction('Координатор', 'Статья создана', 'Этап завершен');
      
       // Проверяем статью цензором и получаем улучшенную версию если нужно
      const { review:censorReview, article: approvedArticle } = await this.reviewAndImproveArticle(article);
      this.logAgentAction('Координатор', 'Статья проверена', 'Этап завершен');
      
      // Создаем промпт для изображения и генерируем изображение
      const imagePrompt = await this.createImagePrompt(topic);
      this.logAgentAction('Координатор', 'Промпт для изображения создан', 'Этап завершен');
      
      const artistAgent = this.findSpecializedAgent(AgentType.ARTIST);
      
      if (!artistAgent) {
        throw new Error('Агент-художник не найден');
      }

      this.logInteraction('Координатор', 'Художник', 'Запрос на создание изображения');
      const imagePath = await artistAgent.handleRequest(imagePrompt);
      this.logInteraction('Художник', 'Координатор', `Изображение создано: ${imagePath}`);
      this.logAgentAction('Координатор', 'Изображение сгенерировано', 'Этап завершен');
      
      // Создаем HTML страницу
      const articleData = {
        title: topic,
        content: approvedArticle,
        imagePath: imagePath,
        censorReview: censorReview,
        completedStages: {
          topicDefined: true,
          articleCreated: true,
          imagePromptCreated: true,
          imageGenerated: true,
          articleReviewed: true,
          pageCreated: false
        },
        logs: {
          agentActions: this.agentActions,
          interactions: this.interactions
        }
      };

      this.logInteraction('Координатор', 'Верстальщик', 'Запрос на создание HTML страницы');
      const htmlPath = await this.layoutAgent.handleRequest(JSON.stringify(articleData));
      this.logInteraction('Верстальщик', 'Координатор', `HTML страница создана: ${htmlPath}`);
      this.logAgentAction('Координатор', 'HTML страница создана', 'Этап завершен');
      
      const response: ArticleResponse = {
        article: approvedArticle,
        censorReview: censorReview,
        imagePath: imagePath,
        htmlPath: htmlPath,
        completedStages: {
          topicDefined: true,
          articleCreated: true,
          imagePromptCreated: true,
          imageGenerated: true,
          articleReviewed: true,
          pageCreated: true
        },
        logs: {
          agentActions: this.agentActions,
          interactions: this.interactions
        }
      };
      
      return JSON.stringify(response);
    } catch (error: any) {
      console.error('Ошибка при создании статьи:', error);
      this.logAgentAction('Координатор', 'Ошибка', `Ошибка: ${error.message}`);
      return 'Произошла ошибка при создании статьи';
    }
  }
} 