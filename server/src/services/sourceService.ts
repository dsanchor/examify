import { v4 as uuidv4 } from 'uuid';
import pdfParse from 'pdf-parse';
import { cosmosService } from './cosmosService';
import { aiService } from './aiService';
import { Source, PaginatedResponse, Question, Chapter } from '../models';
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

    console.log('[SOURCE_SERVICE_DEBUG] Creating new source');
    console.log('[SOURCE_SERVICE_DEBUG] ID:', id);
    console.log('[SOURCE_SERVICE_DEBUG] Title:', title);
    console.log('[SOURCE_SERVICE_DEBUG] File name:', file.originalname);
    console.log('[SOURCE_SERVICE_DEBUG] File size:', file.size);

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

    console.log('[SOURCE_SERVICE_DEBUG] Saving to CosmosDB...');
    await cosmosService.create(CONTAINER, source);
    console.log('[SOURCE_SERVICE_DEBUG] ✓ Saved to CosmosDB');

    // Process PDF asynchronously
    console.log('[SOURCE_SERVICE_DEBUG] Starting async PDF processing...');
    this.processSource(id, file.buffer).catch((error) => {
      console.error(`[SOURCE_SERVICE_DEBUG] ❌ Failed to process source ${id}:`, error);
    });

    return source;
  }

  private async processSource(id: string, buffer: Buffer): Promise<void> {
    try {
      console.log('[SOURCE_SERVICE_DEBUG] Processing source:', id);
      console.log('[SOURCE_SERVICE_DEBUG] Buffer size:', buffer.length);
      
      console.log('[SOURCE_SERVICE_DEBUG] Parsing PDF...');
      const pdfData = await pdfParse(buffer);
      const pdfText = pdfData.text;
      console.log('[SOURCE_SERVICE_DEBUG] ✓ PDF parsed, text length:', pdfText.length);

      if (!pdfText || pdfText.trim().length === 0) {
        console.error('[SOURCE_SERVICE_DEBUG] ❌ PDF contains no extractable text');
        await cosmosService.update<Source>(CONTAINER, id, {
          status: 'error',
          errorMessage: 'PDF contains no extractable text.',
          updatedAt: new Date().toISOString(),
        });
        return;
      }

      console.log('[SOURCE_SERVICE_DEBUG] Calling AI service for extraction...');
      const extractionResult = await aiService.extractFromPdf(
        pdfText,
        (await cosmosService.read<Source>(CONTAINER, id))?.fileName ?? 'unknown.pdf'
      );
      console.log('[SOURCE_SERVICE_DEBUG] ✓ AI extraction complete');
      console.log('[SOURCE_SERVICE_DEBUG] Questions extracted:', extractionResult.questions.length);

      console.log('[SOURCE_SERVICE_DEBUG] Updating source in CosmosDB with results...');
      await cosmosService.update<Source>(CONTAINER, id, {
        chapters: [],
        questions: extractionResult.questions,
        status: 'ready',
        updatedAt: new Date().toISOString(),
      });

      console.log(
        `[SOURCE_SERVICE_DEBUG] ✓ Source ${id} processed: ${extractionResult.questions.length} questions`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown processing error';
      console.error(`[SOURCE_SERVICE_DEBUG] ❌ Error processing source ${id}:`, message);
      if (error instanceof Error) {
        console.error('[SOURCE_SERVICE_DEBUG] Error stack:', error.stack);
      }
      console.error('[SOURCE_SERVICE_DEBUG] Full error object:', error);
      
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

  async addQuestions(sourceId: string, count: number): Promise<Question[]> {
    console.log('[SOURCE_SERVICE_DEBUG] Adding questions to source');
    console.log('[SOURCE_SERVICE_DEBUG] Source ID:', sourceId);
    console.log('[SOURCE_SERVICE_DEBUG] Count:', count);

    const source = await this.getById(sourceId);
    if (!source) {
      throw new Error('Source not found');
    }

    const existingQuestions = source.questions.map((q) => q.text);

    console.log('[SOURCE_SERVICE_DEBUG] Existing questions:', existingQuestions.length);
    console.log('[SOURCE_SERVICE_DEBUG] Calling AI service...');

    const newQuestionData = await aiService.generateAdditionalQuestions(
      source.title,
      existingQuestions,
      count
    );

    console.log('[SOURCE_SERVICE_DEBUG] ✓ AI service returned new questions:', newQuestionData.length);

    const newQuestions: Question[] = newQuestionData.map((q) => ({
      id: uuidv4(),
      ...q,
    }));

    const allQuestions = [...source.questions, ...newQuestions];

    console.log('[SOURCE_SERVICE_DEBUG] Updating source in CosmosDB...');
    await cosmosService.update<Source>(CONTAINER, sourceId, {
      questions: allQuestions,
      updatedAt: new Date().toISOString(),
    });
    console.log('[SOURCE_SERVICE_DEBUG] ✓ Source updated successfully');

    return newQuestions;
  }

  async addChapter(sourceId: string, title: string): Promise<Chapter> {
    const source = await this.getById(sourceId);
    if (!source) {
      throw new Error('Source not found');
    }

    const maxOrder = source.chapters.reduce((max, ch) => Math.max(max, ch.order), 0);
    const chapter: Chapter = {
      id: uuidv4(),
      title,
      order: maxOrder + 1,
    };

    const updatedChapters = [...source.chapters, chapter];
    await cosmosService.update<Source>(CONTAINER, sourceId, {
      chapters: updatedChapters,
      updatedAt: new Date().toISOString(),
    });

    return chapter;
  }

  async updateChapter(
    sourceId: string,
    chapterId: string,
    updates: { title?: string; order?: number }
  ): Promise<Chapter> {
    const source = await this.getById(sourceId);
    if (!source) {
      throw new Error('Source not found');
    }

    const chapterIndex = source.chapters.findIndex((ch) => ch.id === chapterId);
    if (chapterIndex === -1) {
      throw new Error('Chapter not found');
    }

    const updated: Chapter = {
      ...source.chapters[chapterIndex],
      ...updates,
    };
    const updatedChapters = [...source.chapters];
    updatedChapters[chapterIndex] = updated;

    await cosmosService.update<Source>(CONTAINER, sourceId, {
      chapters: updatedChapters,
      updatedAt: new Date().toISOString(),
    });

    return updated;
  }

  async deleteChapter(sourceId: string, chapterId: string): Promise<void> {
    const source = await this.getById(sourceId);
    if (!source) {
      throw new Error('Source not found');
    }

    const chapterExists = source.chapters.some((ch) => ch.id === chapterId);
    if (!chapterExists) {
      throw new Error('Chapter not found');
    }

    const updatedChapters = source.chapters.filter((ch) => ch.id !== chapterId);
    // Unlink all questions from the deleted chapter
    const updatedQuestions = source.questions.map((q) =>
      q.chapterId === chapterId ? { ...q, chapterId: null } : q
    );

    await cosmosService.update<Source>(CONTAINER, sourceId, {
      chapters: updatedChapters,
      questions: updatedQuestions,
      updatedAt: new Date().toISOString(),
    });
  }

  async linkQuestionToChapter(
    sourceId: string,
    questionId: string,
    chapterId: string | null
  ): Promise<void> {
    const source = await this.getById(sourceId);
    if (!source) {
      throw new Error('Source not found');
    }

    const questionIndex = source.questions.findIndex((q) => q.id === questionId);
    if (questionIndex === -1) {
      throw new Error('Question not found');
    }

    if (chapterId !== null) {
      const chapterExists = source.chapters.some((ch) => ch.id === chapterId);
      if (!chapterExists) {
        throw new Error('Chapter not found');
      }
    }

    const updatedQuestions = [...source.questions];
    updatedQuestions[questionIndex] = {
      ...updatedQuestions[questionIndex],
      chapterId,
    };

    await cosmosService.update<Source>(CONTAINER, sourceId, {
      questions: updatedQuestions,
      updatedAt: new Date().toISOString(),
    });
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
