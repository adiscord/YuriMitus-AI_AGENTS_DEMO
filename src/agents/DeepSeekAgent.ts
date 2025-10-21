import { BaseAgent, AgentType } from './BaseAgent';
import { SpecializedAgent } from './SpecializedAgent';
import ModelClient, { isUnexpected } from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";

export class DeepSeekAgent extends BaseAgent implements SpecializedAgent {
  private client: ReturnType<typeof ModelClient>;

  constructor(apiKey: string) {
    super('You are a specialized AI agent powered by DeepSeek. ' +
          'You can help with various tasks and provide detailed responses.',
          AgentType.DeepSeekAgent);
 
    console.log("apiKey2", apiKey);   

    this.client = ModelClient(
      "https://models.inference.ai.azure.com",
      new AzureKeyCredential(apiKey)
    );
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

      // const response = await this.gigachat.chat.completions.create({
      //   messages,
      //   temperature: 0.7,
      //   max_tokens: 1000,
      // });

    //   const response = await this.client.chat({
    //     messages: [{ role: "system", content: prompt },
    //         {
    //             role: "user",
    //             content: text
    //         }],
    //     temperature: 0.5
    // });
    
    console.log("MESSAGES,", messages);

    const response = await this.client.path("/chat/completions").post({
      body: {
          messages,
          model: "DeepSeek-V3",
          max_tokens: 2024,
      }
  });

  if (isUnexpected(response)) {
    throw response.body.error;
  }

      const result = response.body.choices[0].message.content;
      
      if (result) {
        this.messages.push({
          role: 'assistant',
          content: result,
        });
        return result;
      }

      throw new Error('No response from DeepSeek');
    } catch (error) {
      console.error('Error getting response from DeepSeek:', error);
      throw error;
    }
  }
} 