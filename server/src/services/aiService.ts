import OpenAI from 'openai';
import { config } from '../config';
import { AIExtractionResult, Question } from '../models';
import { v4 as uuidv4 } from 'uuid';

const EXTRACTION_SYSTEM_PROMPT = `You are an expert content analyzer for educational materials. Your task is to analyze PDF text and generate multiple-choice questions.

RULES FOR QUESTION GENERATION:
1. Generate multiple-choice questions based on the content.
2. Each question should have its ACTUAL number of answer options from the source material (2, 3, 4, 5, or more).
3. DO NOT force exactly 4 options - preserve the actual answer count from the source, or generate an appropriate number (typically 3-5).
4. Exactly one option must be marked as correct (using correctAnswerIndex).
5. Include a brief explanation for why the correct answer is correct.
6. Create questions that test understanding, not just memorization.
7. Questions should cover key concepts from the content.
8. Aim for 3-5 questions per major topic, depending on content density.
9. Vary difficulty: include some recall, some comprehension, and some application questions.

IMPORTANT: You MUST respond with valid JSON only, no markdown formatting. Use this exact schema:
{
  "questions": [
    {
      "text": "Question text?",
      "options": ["Option A", "Option B", "Option C", ...],
      "correctAnswerIndex": 0,
      "explanation": "Explanation of the correct answer."
    }
  ]
}`;

class AIService {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      baseURL: config.ai.endpoint,
      apiKey: config.ai.key,
    });
  }

  async extractFromPdf(pdfText: string, fileName: string): Promise<AIExtractionResult> {
    const truncatedText = pdfText.length > 100000 ? pdfText.substring(0, 100000) : pdfText;

    // Debug logging
    const maskedKey = config.ai.key.substring(0, 4) + '...';
    console.log('[AI_DEBUG] Starting PDF extraction');
    console.log('[AI_DEBUG] Endpoint:', config.ai.endpoint);
    console.log('[AI_DEBUG] API Key (masked):', maskedKey);
    console.log('[AI_DEBUG] Deployment/Model:', config.ai.deployment);
    console.log('[AI_DEBUG] PDF Text Length:', pdfText.length);
    console.log('[AI_DEBUG] Truncated Text Length:', truncatedText.length);

    const completion = await this.client.chat.completions.create({
      messages: [
        { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Analyze the following PDF content from "${fileName}" and generate questions.\n\n---\n${truncatedText}\n---`,
        },
      ],
      model: config.ai.deployment,
      temperature: 0.3,
      max_completion_tokens: 16000,
      response_format: { type: 'json_object' },
    });

    console.log('[AI_DEBUG] ✓ Successfully received response from AI');

    const content = completion.choices[0]?.message?.content;
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

    const questions: Question[] = parsed.questions.map((q) => ({
      id: uuidv4(),
      text: q.text,
      options: q.options,
      correctAnswerIndex: q.correctAnswerIndex,
      explanation: q.explanation,
    }));

    return { questions };
  }

  async generateAdditionalQuestions(
    sourceTitle: string,
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
    console.log('[AI_DEBUG] Source Title:', sourceTitle);
    console.log('[AI_DEBUG] Questions to generate:', count);

    const completion = await this.client.chat.completions.create({
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
          content: `Generate ${count} NEW multiple-choice questions for the source "${sourceTitle}".

Existing questions to AVOID duplicating:
${existingList || 'None'}

Generate diverse questions covering different aspects of the content.`,
        },
      ],
      model: config.ai.deployment,
      temperature: 0.5,
      max_completion_tokens: 8000,
      response_format: { type: 'json_object' },
    });

    console.log('[AI_DEBUG] ✓ Successfully received response from AI');

    const content = completion.choices[0]?.message?.content;
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
