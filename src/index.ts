import dotenv from 'dotenv';
import { AgentFactory, AgentType } from './agents/AgentFactory';

dotenv.config();

async function main() {
  // Создаем журналиста-координатора со специализированными агентами
  const coordinator = AgentFactory.createAgent(
    AgentType.COORDINATOR,
    'Вы - профессиональный AI-журналист, создающий статьи с изображениями.',
    process.env.GIGACHAT_API_KEY || '',
    process.env.DEEPSEEK_KEY || '',
  );

  try {
    // Тестируем журналиста-координатора
    console.log('\n=== Тестирование журналиста-координатора ===');
    const topics = [
      "Искусственный интеллект в современной журналистике"//,
     // "Как технологии меняют нашу повседневную жизнь",
     // "Экологические инициативы в крупных городах"
    ];

    for (const topic of topics) {
      console.log('\nТема:', topic);
      console.log('Начало обработки темы:', topic);
      
      await coordinator.addUserMessage(topic);
      const response = await coordinator.getResponse();
      
      console.log('Результат:', response);
      console.log('Завершение обработки темы');
    }
  } catch (error: any) {
    console.error('Ошибка в main:', error);
    console.error('Ошибка:', error.message);
  }
}

main().catch(console.error); 