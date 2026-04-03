import { v4 as uuidv4 } from 'uuid';
import { cosmosService } from './cosmosService';
import { examService } from './examService';
import { TestSession, TestAnswer, TestResult, QuestionResult, PaginatedResponse } from '../models';
import { config } from '../config';

const CONTAINER = config.cosmos.containers.tests;

class TestService {
  async startTest(examId: string, timeLimitMinutes: number): Promise<TestSession> {
    const exam = await examService.getById(examId);
    if (!exam) {
      throw new Error('Exam not found');
    }

    if (exam.questions.length === 0) {
      throw new Error('Exam has no questions');
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    const answers: TestAnswer[] = exam.questions.map((q) => ({
      questionId: q.id,
      selectedAnswerIndex: null,
    }));

    const session: TestSession = {
      id,
      examId: exam.id,
      examTitle: exam.title,
      questions: exam.questions,
      answers,
      timeLimitMinutes,
      startedAt: now,
      status: 'in_progress',
    };

    await cosmosService.create(CONTAINER, session);
    return session;
  }

  async getSession(id: string): Promise<TestSession | null> {
    return cosmosService.read<TestSession>(CONTAINER, id);
  }

  async saveAnswers(sessionId: string, answers: TestAnswer[]): Promise<TestSession> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Test session not found');
    }
    if (session.status !== 'in_progress') {
      throw new Error('Test session is no longer in progress');
    }

    // Merge incoming answers with existing ones
    const answerMap = new Map(session.answers.map((a) => [a.questionId, a]));
    for (const answer of answers) {
      if (answerMap.has(answer.questionId)) {
        answerMap.set(answer.questionId, answer);
      }
    }

    const updatedAnswers = Array.from(answerMap.values());

    return cosmosService.update<TestSession>(CONTAINER, sessionId, {
      answers: updatedAnswers,
      // Keep status as in_progress during the test
    });
  }

  async submitTest(sessionId: string, answers?: TestAnswer[]): Promise<TestResult> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Test session not found');
    }
    if (session.status === 'completed') {
      throw new Error('Test session has already been completed');
    }

    // Merge final answers if provided
    if (answers && answers.length > 0) {
      const answerMap = new Map(session.answers.map((a) => [a.questionId, a]));
      for (const answer of answers) {
        if (answerMap.has(answer.questionId)) {
          answerMap.set(answer.questionId, answer);
        }
      }
      session.answers = Array.from(answerMap.values());
    }

    const now = new Date().toISOString();
    const startTime = new Date(session.startedAt).getTime();
    const endTime = new Date(now).getTime();
    const timeTakenSeconds = Math.round((endTime - startTime) / 1000);

    // Score the test
    const questionResults: QuestionResult[] = session.questions.map((question) => {
      const answer = session.answers.find((a) => a.questionId === question.id);
      const selectedIndex = answer?.selectedAnswerIndex ?? null;
      const isCorrect = selectedIndex === question.correctAnswerIndex;

      return {
        questionId: question.id,
        questionText: question.text,
        options: question.options,
        selectedAnswerIndex: selectedIndex,
        correctAnswerIndex: question.correctAnswerIndex,
        isCorrect,
        explanation: question.explanation,
      };
    });

    const correctAnswers = questionResults.filter((r) => r.isCorrect).length;
    const totalQuestions = questionResults.length;
    const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

    // Update session status
    await cosmosService.update<TestSession>(CONTAINER, sessionId, {
      answers: session.answers,
      completedAt: now,
      status: 'completed',
    });

    const result: TestResult = {
      id: uuidv4(),
      testSessionId: sessionId,
      examId: session.examId,
      examTitle: session.examTitle,
      totalQuestions,
      correctAnswers,
      score,
      timeTakenSeconds,
      questionResults,
      completedAt: now,
    };

    return result;
  }

  async deleteSession(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Test session not found');
    }
    await cosmosService.delete(CONTAINER, sessionId);
  }

  async abandonTest(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Test session not found');
    }

    await cosmosService.update<TestSession>(CONTAINER, sessionId, {
      status: 'abandoned',
      completedAt: new Date().toISOString(),
    });
  }

  async listSessions(
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedResponse<TestSession>> {
    const { items, total } = await cosmosService.list<TestSession>(
      CONTAINER,
      page,
      pageSize,
      'startedAt',
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

  async getCompletedSessions(
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedResponse<TestSession>> {
    const allCompleted = await cosmosService.query<TestSession>(CONTAINER, {
      query: "SELECT * FROM c WHERE c.status = 'completed' ORDER BY c.completedAt DESC",
    });

    const total = allCompleted.length;
    const start = (page - 1) * pageSize;
    const items = allCompleted.slice(start, start + pageSize);

    return {
      items,
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
    };
  }

  async getResult(sessionId: string): Promise<TestResult | null> {
    const session = await this.getSession(sessionId);
    if (!session || session.status !== 'completed') {
      return null;
    }

    // Calculate time taken
    const startTime = new Date(session.startedAt).getTime();
    const endTime = new Date(session.completedAt!).getTime();
    const timeTakenSeconds = Math.round((endTime - startTime) / 1000);

    // Reconstruct question results
    const questionResults: QuestionResult[] = session.questions.map((question) => {
      const answer = session.answers.find((a) => a.questionId === question.id);
      const selectedIndex = answer?.selectedAnswerIndex ?? null;
      const isCorrect = selectedIndex === question.correctAnswerIndex;

      return {
        questionId: question.id,
        questionText: question.text,
        options: question.options,
        selectedAnswerIndex: selectedIndex,
        correctAnswerIndex: question.correctAnswerIndex,
        isCorrect,
        explanation: question.explanation,
      };
    });

    // Calculate scores
    const correctAnswers = questionResults.filter((r) => r.isCorrect).length;
    const totalQuestions = questionResults.length;
    const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

    const result: TestResult = {
      id: `result-${sessionId}`,
      testSessionId: sessionId,
      examId: session.examId,
      examTitle: session.examTitle,
      totalQuestions,
      correctAnswers,
      score,
      timeTakenSeconds,
      questionResults,
      completedAt: session.completedAt!,
    };

    return result;
  }
}

export const testService = new TestService();
