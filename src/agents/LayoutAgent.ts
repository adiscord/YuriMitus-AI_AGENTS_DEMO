import { BaseAgent, AgentType } from './BaseAgent';
import { SpecializedAgent } from './SpecializedAgent';
import * as fs from 'fs';
import * as path from 'path';
import { marked } from 'marked';

interface ArticleData {
  title: string;
  content: string;
  imagePath: string;
  censorReview: string;
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

export class LayoutAgent extends BaseAgent implements SpecializedAgent {
  private readonly outputDir = 'generated_pages';
  private readonly statusTemplate: string;

  constructor() {
    super(
      `Вы - профессиональный верстальщик. Ваша задача - создавать красивые и удобные HTML страницы для статей.
      Вы должны:
      1. Создавать адаптивный дизайн
      2. Правильно форматировать текст
      3. Интегрировать изображения
      4. Добавлять стили для улучшения читаемости
      5. Отображать статус обработки и логи работы агентов`,
      AgentType.LAYOUT
    );

    // Создаем директорию для сохранения страниц, если она не существует
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir);
    }

    // Загружаем шаблон статусов и логов
    this.statusTemplate = fs.readFileSync(
      path.join(__dirname, '../templates/statusSections.html'),
      'utf8'
    );

    // Настраиваем marked для безопасного рендеринга
    marked.setOptions({
      gfm: true, // GitHub Flavored Markdown
      breaks: true // Преобразование переносов строк в <br>
    });
  }

  canHandleRequest(request: string): boolean {
    return request.toLowerCase().includes('верстка') || 
           request.toLowerCase().includes('html') || 
           request.toLowerCase().includes('страница');
  }

  private generateHTML(data: ArticleData): string {
    const { title, content, imagePath, censorReview, completedStages, logs } = data;
    
    // Преобразуем Markdown в HTML для основного контента
    const contentHtml = marked(content);
    const censorReviewHtml = marked(censorReview);
    
    // Генерируем секции статусов и логов из шаблона
    const statusAndLogsHtml = this.statusTemplate
      .replace(/\${completedStages\.(\w+)}/g, (_, stage: keyof typeof completedStages) => String(completedStages[stage]))
      .replace(/\${logs\.agentActions}/g, JSON.stringify(logs.agentActions))
      .replace(/\${logs\.interactions}/g, JSON.stringify(logs.interactions));
    
    return `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .article-container {
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .article-header {
            text-align: center;
            margin-bottom: 30px;
        }
        .article-title {
            font-size: 2em;
            color: #333;
            margin-bottom: 10px;
        }
        .article-image {
            max-width: 100%;
            height: auto;
            border-radius: 8px;
            margin: 20px 0;
        }
        .article-content {
            margin-bottom: 30px;
        }
        .censor-review {
            background-color: #fff3cd;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .censor-review h3 {
            color: #856404;
            margin-top: 0;
        }
        h1, h2, h3, h4, h5, h6 {
            color: #333;
            margin-top: 1.5em;
            margin-bottom: 0.5em;
        }
        p {
            margin-bottom: 1em;
        }
        ul, ol {
            margin-bottom: 1em;
            padding-left: 2em;
        }
        blockquote {
            border-left: 4px solid #007bff;
            margin: 1em 0;
            padding: 0.5em 1em;
            background-color: #f8f9fa;
        }
        code {
            background-color: #f8f9fa;
            padding: 0.2em 0.4em;
            border-radius: 3px;
            font-family: monospace;
        }
        pre {
            background-color: #f8f9fa;
            padding: 1em;
            border-radius: 4px;
            overflow-x: auto;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 1em 0;
        }
        th, td {
            border: 1px solid #dee2e6;
            padding: 0.5em;
            text-align: left;
        }
        th {
            background-color: #f8f9fa;
        }
    </style>
</head>
<body>
    <div class="article-container">
        <div class="article-header">
            <h1 class="article-title">${title}</h1>
        </div>

        <img src="/${imagePath}" alt="${title}" class="article-image">
        
        <div class="article-content">
            ${contentHtml}
        </div>
        
        <div class="censor-review">
            <h3>Рецензия цензора</h3>
            ${censorReviewHtml}
        </div>
    </div>
</body>
</html>`;
  }

  async handleRequest(request: string): Promise<string> {
    try {
      const data: ArticleData = JSON.parse(request);
      const filename = `article_${Date.now()}.html`;
      const filePath = path.join(this.outputDir, filename);
      
      const html = this.generateHTML(data);
      await fs.promises.writeFile(filePath, html, 'utf8');
      
      return filePath;
    } catch (error) {
      console.error('Ошибка при создании HTML страницы:', error);
      return 'Ошибка при создании HTML страницы';
    }
  }

  async getResponse(): Promise<string> {
    const lastMessage = this.messages[this.messages.length - 1];
    if (lastMessage.role !== 'user') return 'Нет сообщения пользователя для обработки';

    const filePath = await this.handleRequest(lastMessage.content);
    const response = `HTML страница создана: ${filePath}`;
    
    this.messages.push({
      role: 'assistant',
      content: response
    });
    
    return response;
  }
} 