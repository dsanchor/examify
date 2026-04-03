export interface Chapter {
  id: string;
  title: string;
  content: string;
  order: number;
}

export interface Question {
  id: string;
  chapterId: string;
  text: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface Source {
  id: string;
  title: string;
  description: string;
  fileName: string;
  fileSize: number;
  chapters: Chapter[];
  questions: Question[];
  status: 'processing' | 'ready' | 'error';
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExamConfig {
  sourceIds: string[];
  chapterIds?: string[];
  questionCount: number;
  answerCount?: number;
  title: string;
  description?: string;
}

export interface ExamQuestion {
  id: string;
  sourceId: string;
  chapterId: string;
  text: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface Exam {
  id: string;
  title: string;
  description: string;
  sourceIds: string[];
  chapterIds: string[];
  questions: ExamQuestion[];
  createdAt: string;
  updatedAt: string;
}

export interface TestAnswer {
  questionId: string;
  selectedAnswerIndex: number | null;
}

export interface TestSession {
  id: string;
  examId: string;
  examTitle: string;
  questions: ExamQuestion[];
  answers: TestAnswer[];
  timeLimitMinutes: number;
  startedAt: string;
  completedAt?: string;
  status: 'in_progress' | 'completed' | 'abandoned';
}

export interface QuestionResult {
  questionId: string;
  questionText: string;
  options: string[];
  selectedAnswerIndex: number | null;
  correctAnswerIndex: number;
  isCorrect: boolean;
  explanation: string;
}

export interface TestResult {
  id: string;
  testSessionId: string;
  examId: string;
  examTitle: string;
  totalQuestions: number;
  correctAnswers: number;
  score: number;
  timeTakenSeconds: number;
  questionResults: QuestionResult[];
  completedAt: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface AvailableSource {
  id: string;
  title: string;
  chapters: Chapter[];
  questions: Question[];
}
