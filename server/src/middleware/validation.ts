import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';

function validate(schema: Joi.ObjectSchema, property: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const messages = error.details.map((d) => d.message).join('; ');
      const validationError = new Error(messages);
      validationError.name = 'ValidationError';
      (validationError as { details?: Joi.ValidationErrorItem[] }).details = error.details;
      next(validationError);
      return;
    }

    req[property] = value;
    next();
  };
}

// Source schemas
export const createSourceSchema = Joi.object({
  title: Joi.string().min(1).max(200).required(),
  description: Joi.string().max(2000).allow('').default(''),
});

export const updateSourceSchema = Joi.object({
  title: Joi.string().min(1).max(200),
  description: Joi.string().max(2000).allow(''),
}).min(1);

export const addQuestionsSchema = Joi.object({
  count: Joi.number().integer().min(1).max(20).default(5),
});

// Chapter schemas
export const addChapterSchema = Joi.object({
  title: Joi.string().min(1).max(200).required(),
});

export const updateChapterSchema = Joi.object({
  title: Joi.string().min(1).max(200),
  order: Joi.number().integer().min(1),
}).min(1);

export const linkQuestionChapterSchema = Joi.object({
  chapterId: Joi.string().uuid().allow(null).required(),
});

export const sourceChapterParamsSchema = Joi.object({
  id: Joi.string().required(),
  chapterId: Joi.string().required(),
});

export const sourceQuestionParamsSchema = Joi.object({
  id: Joi.string().required(),
  questionId: Joi.string().required(),
});

// Exam schemas
export const createExamSchema = Joi.object({
  title: Joi.string().min(1).max(200).required(),
  description: Joi.string().max(2000).allow('').default(''),
  sourceIds: Joi.array().items(Joi.string().uuid()).min(1).required(),
  chapterIds: Joi.array().items(Joi.string().uuid()).optional(),
  questionCount: Joi.number().integer().min(1).max(200).required(),
  answerCount: Joi.number().integer().min(2).max(6).default(4),
});

// Test schemas
export const startTestSchema = Joi.object({
  examId: Joi.string().uuid().required(),
  timeLimitMinutes: Joi.number().integer().min(1).max(300).default(60),
});

export const saveAnswersSchema = Joi.object({
  answers: Joi.array()
    .items(
      Joi.object({
        questionId: Joi.string().uuid().required(),
        selectedAnswerIndex: Joi.number().integer().min(0).max(5).allow(null).required(),
      })
    )
    .min(1)
    .required(),
});

export const submitTestSchema = Joi.object({
  answers: Joi.array()
    .items(
      Joi.object({
        questionId: Joi.string().uuid().required(),
        selectedAnswerIndex: Joi.number().integer().min(0).max(5).allow(null).required(),
      })
    )
    .optional(),
});

// Pagination query schema
export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(20),
});

// ID param schema
export const idParamSchema = Joi.object({
  id: Joi.string().required(),
});

// Middleware factories
export const validateBody = (schema: Joi.ObjectSchema) => validate(schema, 'body');
export const validateQuery = (schema: Joi.ObjectSchema) => validate(schema, 'query');
export const validateParams = (schema: Joi.ObjectSchema) => validate(schema, 'params');
