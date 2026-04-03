import { Router, Request, Response } from 'express';
import multer from 'multer';
import { sourceService } from '../services/sourceService';
import { NotFoundError } from '../middleware/errorHandler';
import {
  validateBody,
  validateQuery,
  validateParams,
  createSourceSchema,
  updateSourceSchema,
  addQuestionsSchema,
  paginationSchema,
  idParamSchema,
} from '../middleware/validation';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      cb(new Error('Only PDF files are allowed'));
      return;
    }
    cb(null, true);
  },
});

// GET /api/sources - List all sources
router.get('/', validateQuery(paginationSchema), async (req: Request, res: Response) => {
  const { page, pageSize } = req.query as unknown as { page: number; pageSize: number };
  const result = await sourceService.list(page, pageSize);
  res.json(result);
});

// GET /api/sources/:id - Get a source by ID
router.get('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  const source = await sourceService.getById(req.params.id);
  if (!source) {
    throw new NotFoundError('Source');
  }
  res.json(source);
});

// POST /api/sources - Upload a new PDF source
router.post(
  '/',
  upload.single('file'),
  validateBody(createSourceSchema),
  async (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({ error: { message: 'PDF file is required', statusCode: 400 } });
      return;
    }
    const { title, description } = req.body;
    const source = await sourceService.create(req.file, title, description);
    res.status(201).json(source);
  }
);

// PUT /api/sources/:id - Update source metadata
router.put(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateSourceSchema),
  async (req: Request, res: Response) => {
    const source = await sourceService.getById(req.params.id);
    if (!source) {
      throw new NotFoundError('Source');
    }
    const updated = await sourceService.update(req.params.id, req.body);
    res.json(updated);
  }
);

// DELETE /api/sources/:id - Delete a source
router.delete('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  const source = await sourceService.getById(req.params.id);
  if (!source) {
    throw new NotFoundError('Source');
  }
  await sourceService.delete(req.params.id);
  res.status(204).send();
});

// POST /api/sources/:id/questions - Generate additional questions
router.post(
  '/:id/questions',
  validateParams(idParamSchema),
  validateBody(addQuestionsSchema),
  async (req: Request, res: Response) => {
    const { chapterId, count } = req.body;
    const questions = await sourceService.addQuestions(req.params.id, chapterId, count);
    res.status(201).json(questions);
  }
);

// DELETE /api/sources/:sourceId/questions/:questionId - Delete a question
router.delete(
  '/:sourceId/questions/:questionId',
  async (req: Request, res: Response) => {
    await sourceService.deleteQuestion(req.params.sourceId, req.params.questionId);
    res.status(204).send();
  }
);

export default router;
