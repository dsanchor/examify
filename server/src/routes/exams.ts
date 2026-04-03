import { Router, Request, Response } from 'express';
import { examService } from '../services/examService';
import { NotFoundError } from '../middleware/errorHandler';
import {
  validateBody,
  validateQuery,
  validateParams,
  createExamSchema,
  paginationSchema,
  idParamSchema,
} from '../middleware/validation';

const router = Router();

// GET /api/exams - List all exams
router.get('/', validateQuery(paginationSchema), async (req: Request, res: Response) => {
  const { page, pageSize } = req.query as unknown as { page: number; pageSize: number };
  const result = await examService.list(page, pageSize);
  res.json(result);
});

// GET /api/exams/sources - Get available sources for exam creation
router.get('/sources', async (_req: Request, res: Response) => {
  const sources = await examService.getAvailableSources();
  res.json(sources);
});

// POST /api/exams/dryrun - Create a dry run exam
router.post('/dryrun', async (_req: Request, res: Response) => {
  const exam = await examService.createDryRun();
  res.status(201).json(exam);
});

// GET /api/exams/:id - Get an exam by ID
router.get('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  const exam = await examService.getById(req.params.id);
  if (!exam) {
    throw new NotFoundError('Exam');
  }
  res.json(exam);
});

// POST /api/exams - Create a new exam
router.post('/', validateBody(createExamSchema), async (req: Request, res: Response) => {
  const exam = await examService.create(req.body);
  res.status(201).json(exam);
});

// DELETE /api/exams/:id - Delete an exam
router.delete('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  const exam = await examService.getById(req.params.id);
  if (!exam) {
    throw new NotFoundError('Exam');
  }
  await examService.delete(req.params.id);
  res.status(204).send();
});

export default router;
