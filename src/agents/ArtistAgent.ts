import { BaseAgent, AgentType } from './BaseAgent';
import { SpecializedAgent } from './SpecializedAgent';
import { detectImage } from 'gigachat';
import GigaChat from 'gigachat';
import { Agent } from 'node:https';
import * as fs from 'fs';
import * as path from 'path';

const httpsAgent = new Agent({
  rejectUnauthorized: false, // Отключает проверку корневого сертификата
  // Читайте ниже как можно включить проверку сертификата Мин. Цифры
});

export class ArtistAgent extends BaseAgent implements SpecializedAgent {
  private client: GigaChat;
  private readonly imagesDir = 'generated_images';

  constructor(apiKey: string) {
    super(
      `Я - AI-художник, специализирующийся на создании детальных промптов для изображений и генерации изображений.
      Моя задача - создавать визуально привлекательные и точные иллюстрации, которые:
      1. Точно отражают заданную тему
      2. Имеют высокое художественное качество
      3. Соответствуют журналистскому контексту
      4. Органично дополняют текстовый материал`,
      AgentType.ARTIST
    );
    
    this.client = new GigaChat({
      timeout: 600,
      model: 'GigaChat-2-Max',
      credentials: apiKey,
      httpsAgent: httpsAgent,
    });

    // Создаем директорию для сохранения изображений, если она не существует
    if (!fs.existsSync(this.imagesDir)) {
      fs.mkdirSync(this.imagesDir);
    }
  }

  private async saveImage(imageData: any, filename: string): Promise<string> {
    const filePath = path.join(this.imagesDir, filename);
    await fs.promises.writeFile(filePath, imageData, 'binary')
    return filePath;
  }

  canHandleRequest(request: string): boolean {
    const imageKeywords = [
      'изображение', 'картинка', 'нарисуй', 'создай изображение',
      'сгенерируй картинку', 'визуализируй', 'иллюстрация'
    ];
    return imageKeywords.some(keyword => request.toLowerCase().includes(keyword.toLowerCase()));
  }

  async handleRequest(request: string): Promise<string> {
    return this.generateImage(request);
  }

  async generateImage(prompt: string): Promise<string> {
    try {

      const response = await this.client.chat({
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        function_call: 'auto',
      });

      const detectedImage = detectImage(response.choices[0]?.message.content ?? '');
      if (!detectedImage?.uuid) {
        return 'Не удалось сгенерировать изображение';
      }

      const image = await this.client.getImage(detectedImage.uuid);
      if (!image) {
        return 'Не удалось получить изображение';
      }
       const filename = `image_${Date.now()}.png`;

      // Сохраняем изображение в файл
      return await this.saveImage(image.content, filename);;
    } catch (error) {
      console.error('Ошибка при генерации изображения:', error);
      return 'Ошибка при генерации изображения';
    }
  }

  async getResponse(): Promise<string> {
    const lastMessage = this.messages[this.messages.length - 1];
    if (lastMessage.role !== 'user') return 'Нет сообщения пользователя для обработки';

    const imagePath = await this.generateImage(lastMessage.content);
    const response = `Изображение сохранено: ${imagePath}`;
    
    this.messages.push({
      role: 'assistant',
      content: response
    });
    
    return response;
  }
} 