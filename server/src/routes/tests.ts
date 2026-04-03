import { Router, Request, Response } from 'express';
import { testService } from '../services/testService';
import { NotFoundError } from '../middleware/errorHandler';
import {
  validateBody,
  validateQuery,
  validateParams,
  startTestSchema,
  saveAnswersSchema,
  submitTestSchema,
  paginationSchema,
  idParamSchema,
} from '../middleware/validation';

const router = Router();

// POST /api/tests - Start a new test session
router.post('/', validateBody(startTestSchema), async (req: Request, res: Response) => {
  const { examId, timeLimitMinutes } = req.body;
  const session = await testService.startTest(examId, timeLimitMinutes);
  res.status(201).json(session);
});

// GET /api/tests - List test sessions
router.get('/', validateQuery(paginationSchema), async (req: Request, res: Response) => {
  const { page, pageSize } = req.query as unknown as { page: number; pageSize: number };
  const result = await testService.listSessions(page, pageSize);
  res.json(result);
});

// GET /api/tests/history - Get completed test sessions
router.get('/history', validateQuery(paginationSchema), async (req: Request, res: Response) => {
  const { page, pageSize } = req.query as unknown as { page: number; pageSize: number };
  const result = await testService.getCompletedSessions(page, pageSize);
  res.json(result);
});

// GET /api/tests/:id - Get a test session
router.get('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  const session = await testService.getSession(req.params.id);
  if (!session) {
    throw new NotFoundError('Test session');
  }
  res.json(session);
});

// PUT /api/tests/:id/answers - Save answers (auto-save during test)
router.put(
  '/:id/answers',
  validateParams(idParamSchema),
  validateBody(saveAnswersSchema),
  async (req: Request, res: Response) => {
    const session = await testService.saveAnswers(req.params.id, req.body.answers);
    res.json(session);
  }
);

// POST /api/tests/:id/submit - Submit test for grading
router.post(
  '/:id/submit',
  validateParams(idParamSchema),
  validateBody(submitTestSchema),
  async (req: Request, res: Response) => {
    const result = await testService.submitTest(req.params.id, req.body.answers);
    res.json(result);
  }
);

// POST /api/tests/:id/abandon - Abandon a test
router.post(
  '/:id/abandon',
  validateParams(idParamSchema),
  async (req: Request, res: Response) => {
    await testService.abandonTest(req.params.id);
    res.status(204).send();
  }
);

export default router;
