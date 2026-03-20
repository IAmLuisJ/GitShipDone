import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import healthRouter from './routes/health';
import { errorHandler, AppError } from './middleware/errorHandler';

const app = express();

app.use(morgan('dev'));
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
app.use(helmet());
app.use(express.json());

app.use('/api/health', healthRouter);

/** Catch-all for unmatched routes */
app.use((_req, _res, next) => {
  next(new AppError('Not found', 404));
});

app.use(errorHandler);

export default app;
