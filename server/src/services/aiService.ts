import OpenAI from 'openai';
import { config } from '../config';
import { AIExtractionResult, Question } from '../models';
import { v4 as uuidv4 } from 'uuid';

const EXTRACTION_SYSTEM_PROMPT = `You are a precise document content extractor. Your task is to EXTRACT existing multiple-choice questions and their answers EXACTLY as they appear in the PDF text. You must NOT rewrite, rephrase, paraphrase, or generate new questions.

RULES FOR VERBATIM EXTRACTION:
1. EXTRACT questions and answer options EXACTLY as written in the source document — word for word, preserving original wording, punctuation, and formatting.
2. Do NOT rephrase, reword, summarize, simplify, or alter any question text or answer option text in any way.
3. Do NOT generate, invent, or create new questions. Only extract questions that explicitly exist in the document.
4. Preserve the ACTUAL number of answer options for each question as they appear in the source (2, 3, 4, 5, or more). Do NOT add or remove options.
5. Identify which option is the correct answer. Use correctAnswerIndex (0-based) to indicate it. If the document marks the correct answer, use that. If not clearly marked, use your best judgment based on the content.
6. If the document contains NO explicit questions (no question marks, no numbered/lettered answer options, no quiz/exam format), return an empty questions array: { "questions": [] }. Do NOT fabricate questions from general content.

IMPORTANT: You MUST respond with valid JSON only, no markdown formatting. Use this exact schema:
{
  "questions": [
    {
      "text": "Question text exactly as in document?",
      "options": ["Option A exactly as written", "Option B exactly as written", ...],
      "correctAnswerIndex": 0
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
          content: `Extract all existing multiple-choice questions and their answers VERBATIM from the following PDF content ("${fileName}"). Do NOT rewrite or generate new questions — only extract what is explicitly present in the document.\n\n---\n${truncatedText}\n---`,
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
      }[];
    };

    const questions: Question[] = parsed.questions.map((q) => ({
      id: uuidv4(),
      text: q.text,
      options: q.options,
      correctAnswerIndex: q.correctAnswerIndex,
      explanation: '',
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
      "correctAnswerIndex": 0
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
      }[];
    };

    return parsed.questions.map((q) => ({
      text: q.text,
      options: q.options,
      correctAnswerIndex: q.correctAnswerIndex,
      explanation: '',
    }));
  }
}

export const aiService = new AIService();
