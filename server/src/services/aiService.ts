import ModelClient, { ChatCompletionsOutput } from '@azure-rest/ai-inference';
import { AzureKeyCredential } from '@azure/core-auth';
import { config } from '../config';
import { AIExtractionResult, Chapter, Question } from '../models';
import { v4 as uuidv4 } from 'uuid';

const EXTRACTION_SYSTEM_PROMPT = `You are an expert content analyzer for educational materials. Your task is to analyze PDF text and extract structured content.

RULES FOR CHAPTER EXTRACTION:
1. ONLY extract chapters that are EXPLICITLY mentioned or labeled in the document (e.g., "Chapter 1: Introduction", "Section 2: Methods", clear numbered/titled section headings).
2. DO NOT infer or create logical chapters based on topic shifts. If the document does not have clear chapter markers, return an empty chapters array.
3. Preserve the original order of chapters as they appear in the document.
4. For each explicitly marked chapter, extract the full text content.

RULES FOR QUESTION GENERATION:
1. Extract or generate multiple-choice questions based on the content.
2. Each question should have its ACTUAL number of answer options from the source material (2, 3, 4, 5, or more).
3. DO NOT force exactly 4 options - preserve the actual answer count from the source, or generate an appropriate number (typically 3-5).
4. Exactly one option must be marked as correct (using correctAnswerIndex).
5. Include a brief explanation for why the correct answer is correct.
6. Create questions that test understanding, not just memorization.
7. Questions should cover key concepts from the content.
8. Aim for 3-5 questions per chapter (or per major topic if no chapters), depending on content density.
9. Vary difficulty: include some recall, some comprehension, and some application questions.

IMPORTANT: You MUST respond with valid JSON only, no markdown formatting. Use this exact schema:
{
  "chapters": [
    {
      "title": "Chapter Title",
      "content": "Full chapter text content...",
      "order": 1
    }
  ],
  "questions": [
    {
      "chapterIndex": 0,
      "text": "Question text?",
      "options": ["Option A", "Option B", "Option C", ...],
      "correctAnswerIndex": 0,
      "explanation": "Explanation of the correct answer."
    }
  ]
}

If the document has no clear chapter divisions, return an empty chapters array and assign all questions to chapterIndex 0 (which will be handled as an "Uncategorized" chapter).`;

class AIService {
  private client: ReturnType<typeof ModelClient>;

  constructor() {
    this.client = ModelClient(
      config.ai.endpoint,
      new AzureKeyCredential(config.ai.key)
    );
  }

  async extractFromPdf(pdfText: string, fileName: string): Promise<AIExtractionResult> {
    const truncatedText = pdfText.length > 100000 ? pdfText.substring(0, 100000) : pdfText;

    // Debug logging
    const maskedKey = config.ai.key.substring(0, 4) + '...';
    console.log('[AI_DEBUG] Starting PDF extraction');
    console.log('[AI_DEBUG] Endpoint:', config.ai.endpoint);
    console.log('[AI_DEBUG] API Key (masked):', maskedKey);
    console.log('[AI_DEBUG] Deployment/Model:', config.ai.deployment);
    console.log('[AI_DEBUG] API Version:', config.ai.apiVersion);
    console.log('[AI_DEBUG] PDF Text Length:', pdfText.length);
    console.log('[AI_DEBUG] Truncated Text Length:', truncatedText.length);
    console.log('[AI_DEBUG] Request: POST /chat/completions');

    const response = await this.client.path('/chat/completions').post({
      body: {
        messages: [
          { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Analyze the following PDF content from "${fileName}" and extract chapters and generate questions.\n\n---\n${truncatedText}\n---`,
          },
        ],
        model: config.ai.deployment,
        temperature: 0.3,
        max_tokens: 16000,
        response_format: { type: 'json_object' },
      },
    });

    console.log('[AI_DEBUG] Response status:', response.status);

    if (response.status !== '200') {
      const errorBody = response.body as { error?: { message?: string } };
      console.error('[AI_DEBUG] ❌ AI API ERROR');
      console.error('[AI_DEBUG] Status:', response.status);
      console.error('[AI_DEBUG] Error Body:', JSON.stringify(errorBody, null, 2));
      console.error('[AI_DEBUG] Response Headers:', JSON.stringify(response.headers, null, 2));
      throw new Error(`AI API error: ${errorBody.error?.message || 'Unknown error'}`);
    }

    console.log('[AI_DEBUG] ✓ Successfully received response from AI');

    const body = response.body as ChatCompletionsOutput;
    const content = body.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('AI returned empty response');
    }

    const parsed = JSON.parse(content) as {
      chapters: { title: string; content: string; order: number }[];
      questions: {
        chapterIndex: number;
        text: string;
        options: string[];
        correctAnswerIndex: number;
        explanation: string;
      }[];
    };

    // If no chapters were found, create a default "Uncategorized" chapter
    let chapters: Chapter[] = parsed.chapters.map((ch, index) => ({
      id: uuidv4(),
      title: ch.title,
      content: ch.content,
      order: ch.order ?? index + 1,
    }));

    if (chapters.length === 0 && parsed.questions.length > 0) {
      chapters = [
        {
          id: uuidv4(),
          title: 'Uncategorized',
          content: truncatedText,
          order: 1,
        },
      ];
    }

    const questions: Question[] = parsed.questions.map((q) => {
      const chapter = chapters[q.chapterIndex] || chapters[0];
      if (!chapter) {
        throw new Error(`Invalid chapterIndex ${q.chapterIndex} in AI response`);
      }
      return {
        id: uuidv4(),
        chapterId: chapter.id,
        text: q.text,
        options: q.options,
        correctAnswerIndex: q.correctAnswerIndex,
        explanation: q.explanation,
      };
    });

    return { chapters, questions };
  }

  async generateAdditionalQuestions(
    chapterContent: string,
    chapterTitle: string,
    existingQuestions: string[],
    count: number
  ): Promise<Omit<Question, 'id' | 'chapterId'>[]> {
    const existingList = existingQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n');

    // Debug logging
    const maskedKey = config.ai.key.substring(0, 4) + '...';
    console.log('[AI_DEBUG] Generating additional questions');
    console.log('[AI_DEBUG] Endpoint:', config.ai.endpoint);
    console.log('[AI_DEBUG] API Key (masked):', maskedKey);
    console.log('[AI_DEBUG] Deployment/Model:', config.ai.deployment);
    console.log('[AI_DEBUG] API Version:', config.ai.apiVersion);
    console.log('[AI_DEBUG] Chapter Title:', chapterTitle);
    console.log('[AI_DEBUG] Questions to generate:', count);
    console.log('[AI_DEBUG] Request: POST /chat/completions');

    const response = await this.client.path('/chat/completions').post({
      body: {
        messages: [
          {
            role: 'system',
            content: `You generate multiple-choice exam questions. Each question should have 3-5 answer options with one correct answer. Respond in JSON format with this schema:
{
  "questions": [
    {
      "text": "Question text?",
      "options": ["A", "B", "C", ...],
      "correctAnswerIndex": 0,
      "explanation": "Why this is correct."
    }
  ]
}`,
          },
          {
            role: 'user',
            content: `Generate ${count} NEW multiple-choice questions for the chapter "${chapterTitle}".

Chapter content:
${chapterContent.substring(0, 50000)}

Existing questions to AVOID duplicating:
${existingList || 'None'}

Generate diverse questions covering different aspects of the content.`,
          },
        ],
        model: config.ai.deployment,
        temperature: 0.5,
        max_tokens: 8000,
        response_format: { type: 'json_object' },
      },
    });

    console.log('[AI_DEBUG] Response status:', response.status);

    if (response.status !== '200') {
      const errorBody = response.body as { error?: { message?: string } };
      console.error('[AI_DEBUG] ❌ AI API ERROR (generateAdditionalQuestions)');
      console.error('[AI_DEBUG] Status:', response.status);
      console.error('[AI_DEBUG] Error Body:', JSON.stringify(errorBody, null, 2));
      console.error('[AI_DEBUG] Response Headers:', JSON.stringify(response.headers, null, 2));
      throw new Error(`AI API error: ${errorBody.error?.message || 'Unknown error'}`);
    }

    console.log('[AI_DEBUG] ✓ Successfully received response from AI');

    const body = response.body as ChatCompletionsOutput;
    const content = body.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('AI returned empty response');
    }

    const parsed = JSON.parse(content) as {
      questions: {
        text: string;
        options: string[];
        correctAnswerIndex: number;
        explanation: string;
      }[];
    };

    return parsed.questions.map((q) => ({
      text: q.text,
      options: q.options,
      correctAnswerIndex: q.correctAnswerIndex,
      explanation: q.explanation,
    }));
  }
}

export const aiService = new AIService();
