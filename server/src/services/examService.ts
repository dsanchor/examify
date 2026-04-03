import { v4 as uuidv4 } from 'uuid';
import { cosmosService } from './cosmosService';
import { sourceService } from './sourceService';
import { Exam, ExamConfig, ExamQuestion, PaginatedResponse, Question, Source } from '../models';
import { config } from '../config';

const CONTAINER = config.cosmos.containers.exams;
const NONE_OF_THE_ABOVE = 'None of the above';
const ALL_OF_THE_ABOVE = 'All of the above';

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function padOptions(question: Question, targetCount: number = 4): ExamQuestion {
  let options = [...question.options];
  let correctIndex = question.correctAnswerIndex;

  // Ensure we have the target number of options
  if (options.length < targetCount) {
    // Need to pad with additional options
    const paddingOptions = [NONE_OF_THE_ABOVE, ALL_OF_THE_ABOVE];
    let paddingIndex = 0;
    
    while (options.length < targetCount && paddingIndex < paddingOptions.length) {
      options.push(paddingOptions[paddingIndex]);
      paddingIndex++;
    }
    
    // If still need more, add generic options
    while (options.length < targetCount) {
      options.push(`Option ${options.length + 1}`);
    }
  } else if (options.length > targetCount) {
    // Need to reduce options - keep correct answer and random distractors
    const correctOption = options[correctIndex];
    const distractors = options.filter((_, i) => i !== correctIndex);
    const selectedDistractors = shuffleArray(distractors).slice(0, targetCount - 1);
    options = [correctOption, ...selectedDistractors];
    correctIndex = 0;
  }

  // Shuffle the options and track the correct answer
  const correctOption = options[correctIndex];
  const shuffledOptions = shuffleArray(options);
  const newCorrectIndex = shuffledOptions.indexOf(correctOption);

  return {
    id: uuidv4(),
    sourceId: question.chapterId, // Will be overwritten
    chapterId: question.chapterId,
    text: question.text,
    options: shuffledOptions,
    correctAnswerIndex: newCorrectIndex,
    explanation: question.explanation,
  };
}

class ExamService {
  async create(examConfig: ExamConfig): Promise<Exam> {
    const { sourceIds, chapterIds, questionCount, answerCount = 4, title, description } = examConfig;

    // Collect all eligible questions from specified sources and chapters
    const allQuestions: { question: Question; sourceId: string }[] = [];

    for (const sourceId of sourceIds) {
      const source = await sourceService.getById(sourceId);
      if (!source) {
        throw new Error(`Source "${sourceId}" not found`);
      }
      if (source.status !== 'ready') {
        throw new Error(`Source "${source.title}" is not ready (status: ${source.status})`);
      }

      for (const question of source.questions) {
        // Filter by chapterIds if specified
        if (chapterIds && chapterIds.length > 0 && !chapterIds.includes(question.chapterId)) {
          continue;
        }
        allQuestions.push({ question, sourceId });
      }
    }

    if (allQuestions.length === 0) {
      throw new Error('No questions available for the selected sources and chapters');
    }

    const actualCount = Math.min(questionCount, allQuestions.length);
    const selectedQuestions = shuffleArray(allQuestions).slice(0, actualCount);

    const examQuestions: ExamQuestion[] = selectedQuestions.map(({ question, sourceId }) => {
      const examQ = padOptions(question, answerCount);
      examQ.sourceId = sourceId;
      return examQ;
    });

    // Collect all unique chapter IDs used
    const usedChapterIds = [...new Set(examQuestions.map((q) => q.chapterId))];

    const id = uuidv4();
    const now = new Date().toISOString();

    const exam: Exam = {
      id,
      title,
      description: description || '',
      sourceIds,
      chapterIds: usedChapterIds,
      questions: examQuestions,
      createdAt: now,
      updatedAt: now,
    };

    await cosmosService.create(CONTAINER, exam);
    return exam;
  }

  async getById(id: string): Promise<Exam | null> {
    return cosmosService.read<Exam>(CONTAINER, id);
  }

  async list(page: number = 1, pageSize: number = 20): Promise<PaginatedResponse<Exam>> {
    const { items, total } = await cosmosService.list<Exam>(
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

  async delete(id: string): Promise<void> {
    await cosmosService.delete(CONTAINER, id);
  }

  async getAvailableSources(): Promise<Pick<Source, 'id' | 'title' | 'chapters' | 'questions'>[]> {
    const sources = await cosmosService.query<Source>(
      config.cosmos.containers.sources,
      { query: "SELECT * FROM c WHERE c.status = 'ready'" }
    );
    return sources.map((s) => ({
      id: s.id,
      title: s.title,
      chapters: s.chapters,
      questions: s.questions,
    }));
  }
}

export const examService = new ExamService();
