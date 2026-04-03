import axios from 'axios';
import type {
  Source,
  Exam,
  ExamConfig,
  TestSession,
  TestAnswer,
  TestResult,
  PaginatedResponse,
  AvailableSource,
  Question,
  Chapter,
} from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Sources
export const sourcesApi = {
  list: async (page = 1, pageSize = 20): Promise<PaginatedResponse<Source>> => {
    const { data } = await api.get('/sources', { params: { page, pageSize } });
    return data;
  },

  getById: async (id: string): Promise<Source> => {
    const { data } = await api.get(`/sources/${id}`);
    return data;
  },

  upload: async (file: File, title: string, description: string): Promise<Source> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('description', description);
    const { data } = await api.post('/sources', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  update: async (id: string, updates: { title?: string; description?: string }): Promise<Source> => {
    const { data } = await api.put(`/sources/${id}`, updates);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/sources/${id}`);
  },

  addQuestions: async (sourceId: string, chapterId: string, count: number): Promise<Question[]> => {
    const { data } = await api.post(`/sources/${sourceId}/questions`, { chapterId, count });
    return data;
  },

  deleteQuestion: async (sourceId: string, questionId: string): Promise<void> => {
    await api.delete(`/sources/${sourceId}/questions/${questionId}`);
  },
};

// Chapters
export const chaptersApi = {
  add: async (sourceId: string, title: string): Promise<Chapter> => {
    const { data } = await api.post(`/sources/${sourceId}/chapters`, { title });
    return data;
  },

  update: async (sourceId: string, chapterId: string, updates: { title?: string; order?: number }): Promise<Chapter> => {
    const { data } = await api.put(`/sources/${sourceId}/chapters/${chapterId}`, updates);
    return data;
  },

  delete: async (sourceId: string, chapterId: string): Promise<void> => {
    await api.delete(`/sources/${sourceId}/chapters/${chapterId}`);
  },
};

// Questions
export const questionsApi = {
  linkChapter: async (sourceId: string, questionId: string, chapterId: string | null): Promise<Question> => {
    const { data } = await api.put(`/sources/${sourceId}/questions/${questionId}/chapter`, { chapterId });
    return data;
  },
};

// Exams
export const examsApi = {
  list: async (page = 1, pageSize = 20): Promise<PaginatedResponse<Exam>> => {
    const { data } = await api.get('/exams', { params: { page, pageSize } });
    return data;
  },

  getById: async (id: string): Promise<Exam> => {
    const { data } = await api.get(`/exams/${id}`);
    return data;
  },

  create: async (config: ExamConfig): Promise<Exam> => {
    const { data } = await api.post('/exams', config);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/exams/${id}`);
  },

  getAvailableSources: async (): Promise<AvailableSource[]> => {
    const { data } = await api.get('/exams/sources');
    return data;
  },

  createDryRun: async (): Promise<Exam> => {
    const { data } = await api.post('/exams/dryrun');
    return data;
  },
};

// Tests
export const testsApi = {
  start: async (examId: string, timeLimitMinutes: number): Promise<TestSession> => {
    const { data } = await api.post('/tests', { examId, timeLimitMinutes });
    return data;
  },

  getSession: async (id: string): Promise<TestSession> => {
    const { data } = await api.get(`/tests/${id}`);
    return data;
  },

  list: async (page = 1, pageSize = 20): Promise<PaginatedResponse<TestSession>> => {
    const { data } = await api.get('/tests', { params: { page, pageSize } });
    return data;
  },

  history: async (page = 1, pageSize = 20): Promise<PaginatedResponse<TestSession>> => {
    const { data } = await api.get('/tests/history', { params: { page, pageSize } });
    return data;
  },

  saveAnswers: async (sessionId: string, answers: TestAnswer[]): Promise<TestSession> => {
    const { data } = await api.put(`/tests/${sessionId}/answers`, { answers });
    return data;
  },

  submit: async (sessionId: string, answers?: TestAnswer[]): Promise<TestResult> => {
    const { data } = await api.post(`/tests/${sessionId}/submit`, { answers });
    return data;
  },

  abandon: async (sessionId: string): Promise<void> => {
    await api.post(`/tests/${sessionId}/abandon`);
  },

  delete: async (sessionId: string): Promise<void> => {
    await api.delete(`/tests/${sessionId}`);
  },

  getResult: async (sessionId: string): Promise<TestResult> => {
    const { data } = await api.get(`/tests/${sessionId}/result`);
    return data;
  },
};

export default api;
