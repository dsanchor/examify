import { v4 as uuidv4 } from 'uuid';
import pdfParse from 'pdf-parse';
import { cosmosService } from './cosmosService';
import { aiService } from './aiService';
import { Source, PaginatedResponse, Question } from '../models';
import { config } from '../config';

const CONTAINER = config.cosmos.containers.sources;

class SourceService {
  async create(
    file: Express.Multer.File,
    title: string,
    description: string
  ): Promise<Source> {
    const id = uuidv4();
    const now = new Date().toISOString();

    const source: Source = {
      id,
      title,
      description,
      fileName: file.originalname,
      fileSize: file.size,
      chapters: [],
      questions: [],
      status: 'processing',
      createdAt: now,
      updatedAt: now,
    };

    await cosmosService.create(CONTAINER, source);

    // Process PDF asynchronously
    this.processSource(id, file.buffer).catch((error) => {
      console.error(`Failed to process source ${id}:`, error);
    });

    return source;
  }

  private async processSource(id: string, buffer: Buffer): Promise<void> {
    try {
      const pdfData = await pdfParse(buffer);
      const pdfText = pdfData.text;

      if (!pdfText || pdfText.trim().length === 0) {
        await cosmosService.update<Source>(CONTAINER, id, {
          status: 'error',
          errorMessage: 'PDF contains no extractable text.',
          updatedAt: new Date().toISOString(),
        });
        return;
      }

      const extractionResult = await aiService.extractFromPdf(
        pdfText,
        (await cosmosService.read<Source>(CONTAINER, id))?.fileName ?? 'unknown.pdf'
      );

      await cosmosService.update<Source>(CONTAINER, id, {
        chapters: extractionResult.chapters,
        questions: extractionResult.questions,
        status: 'ready',
        updatedAt: new Date().toISOString(),
      });

      console.log(
        `Source ${id} processed: ${extractionResult.chapters.length} chapters, ${extractionResult.questions.length} questions`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown processing error';
      console.error(`Error processing source ${id}:`, message);
      await cosmosService.update<Source>(CONTAINER, id, {
        status: 'error',
        errorMessage: message,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  async getById(id: string): Promise<Source | null> {
    return cosmosService.read<Source>(CONTAINER, id);
  }

  async list(page: number = 1, pageSize: number = 20): Promise<PaginatedResponse<Source>> {
    const { items, total } = await cosmosService.list<Source>(
      CONTAINER,
      page,
      pageSize,
      'createdAt',
      'DESC'
    );
    return {
      items,
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
    };
  }

  async update(id: string, updates: { title?: string; description?: string }): Promise<Source> {
    return cosmosService.update<Source>(CONTAINER, id, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  }

  async delete(id: string): Promise<void> {
    await cosmosService.delete(CONTAINER, id);
  }

  async addQuestions(sourceId: string, chapterId: string, count: number): Promise<Question[]> {
    const source = await this.getById(sourceId);
    if (!source) {
      throw new Error('Source not found');
    }

    const chapter = source.chapters.find((ch) => ch.id === chapterId);
    if (!chapter) {
      throw new Error('Chapter not found');
    }

    const existingQuestions = source.questions
      .filter((q) => q.chapterId === chapterId)
      .map((q) => q.text);

    const newQuestionData = await aiService.generateAdditionalQuestions(
      chapter.content,
      chapter.title,
      existingQuestions,
      count
    );

    const newQuestions: Question[] = newQuestionData.map((q) => ({
      id: uuidv4(),
      chapterId,
      ...q,
    }));

    const allQuestions = [...source.questions, ...newQuestions];

    await cosmosService.update<Source>(CONTAINER, sourceId, {
      questions: allQuestions,
      updatedAt: new Date().toISOString(),
    });

    return newQuestions;
  }

  async deleteQuestion(sourceId: string, questionId: string): Promise<void> {
    const source = await this.getById(sourceId);
    if (!source) {
      throw new Error('Source not found');
    }

    const updatedQuestions = source.questions.filter((q) => q.id !== questionId);
    if (updatedQuestions.length === source.questions.length) {
      throw new Error('Question not found');
    }

    await cosmosService.update<Source>(CONTAINER, sourceId, {
      questions: updatedQuestions,
      updatedAt: new Date().toISOString(),
    });
  }
}

export const sourceService = new SourceService();
