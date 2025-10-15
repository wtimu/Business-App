import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { apiRouter } from './routes/api.js';
import { errorHandler } from './middleware/errorHandler.js';
import { httpLogger } from './lib/logger.js';
import openApiDocument from './docs/openapi.json' assert { type: 'json' };

export const createApp = () => {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(httpLogger);
  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      limit: 60
    })
  );

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));
  app.use('/api/v1', apiRouter);
  app.use(errorHandler);

  return app;
};
