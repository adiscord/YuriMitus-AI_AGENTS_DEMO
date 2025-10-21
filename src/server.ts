import express from 'express';
import path from 'path';
import { CoordinatorAgent } from './agents/CoordinatorAgent';
import { AgentFactory, AgentType } from './agents/AgentFactory';
import dotenv from 'dotenv';
import fs from 'fs';
import http from 'http';

// Загружаем переменные окружения
dotenv.config();

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 3000;

// Middleware для парсинга JSON
app.use(express.json());

// Раздача статических файлов
app.use(express.static(path.join(__dirname, '../public')));

// Раздача сгенерированных страниц
app.use('/generated_pages', express.static(path.join(__dirname, '../generated_pages')));

app.use('/generated_images', express.static(path.join(__dirname, '../generated_images')));

// Создаем директорию для сгенерированных страниц, если она не существует
const generatedPagesDir = path.join(__dirname, '../generated_pages');

if (!fs.existsSync(generatedPagesDir)) {
    fs.mkdirSync(generatedPagesDir, { recursive: true });
}

// Создаем экземпляры агентов
const coordinator = AgentFactory.createAgent(
  AgentType.COORDINATOR,
  'Вы - профессиональный AI-журналист, создающий статьи с изображениями.',
  process.env.GIGACHAT_API_KEY || '',
  process.env.DEEPSEEK_KEY || '',
) as CoordinatorAgent;

// Хранилище для клиентов SSE
const clients = new Set<http.ServerResponse>();

// Функция для отправки события всем клиентам
function sendEventToClients(eventType: string, data: any) {
  const event = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  clients.forEach(client => {
    client.write(event);
  });
}

// API endpoint для SSE подключения
app.get('/api/logs', (req, res) => {
  // Устанавливаем заголовки для SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  // Отправляем начальное сообщение
  res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Connected to log stream' })}\n\n`);
  
  // Добавляем клиента в список
  clients.add(res);
  
  // Обработчик отключения клиента
  req.on('close', () => {
    clients.delete(res);
  });
});

// API endpoint для генерации контента
app.post('/api/generate', async (req, res) => {
    try {
        const { topic } = req.body;

        if (!topic) {
            return res.status(400).json({ error: 'Тема не указана' });
        }

        // Отправляем событие о начале генерации
        sendEventToClients('generation_start', { topic });
        
        // Переопределяем методы логирования для отправки событий
        const originalLogAgentAction = coordinator['logAgentAction'];
        const originalLogInteraction = coordinator['logInteraction'];
        
        coordinator['logAgentAction'] = (agent: string, action: string, details: string) => {
            originalLogAgentAction.call(coordinator, agent, action, details);
            sendEventToClients('agent_action', { agent, action, details });
        };
        
        coordinator['logInteraction'] = (fromAgent: string, toAgent: string, message: string) => {
            originalLogInteraction.call(coordinator, fromAgent, toAgent, message);
            sendEventToClients('agent_interaction', { fromAgent, toAgent, message });
        };

        // Запускаем процесс генерации
        await coordinator.addUserMessage(topic);
        const result = await coordinator.getResponse();

        // Восстанавливаем оригинальные методы логирования
        coordinator['logAgentAction'] = originalLogAgentAction;
        coordinator['logInteraction'] = originalLogInteraction;

        // Парсим результат
        const articleMatch = result.match(/Статья успешно создана и сохранена в HTML формате: (.*?)\n/);

        // Отправляем событие о завершении генерации
        sendEventToClients('generation_complete', { 
            article: articleMatch ? articleMatch[1] : '',
            result: result
        });

        // Возвращаем результат
        res.json({
            article: articleMatch ? articleMatch[1] : ''
        });
    } catch (error) {
        console.error('Error processing request:', error);
        
        // Отправляем событие об ошибке
        sendEventToClients('generation_error', { 
            error: error instanceof Error ? error.message : 'Unknown error' 
        });
        
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// API endpoint для получения списка сгенерированных страниц
app.get('/api/pages', (req, res) => {
    try {
        const files = fs.readdirSync(generatedPagesDir)
            .filter(file => file.endsWith('.html'))
            .map(file => ({
                name: file,
                path: `/generated_pages/${file}`
            }));
        
        res.json({ pages: files });
    } catch (error) {
        console.error('Error reading generated pages:', error);
        res.status(500).json({ error: 'Ошибка при чтении списка страниц' });
    }
});

// Запуск сервера
server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
}); 