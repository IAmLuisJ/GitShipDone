import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import healthRouter from './routes/health';
import authRouter from './routes/auth';
import { configurePassport } from './config/passport';
import { errorHandler, AppError } from './middleware/errorHandler';

const app = express();

app.use(morgan('dev'));
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  }),
);
app.use(helmet());
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());
configurePassport();

app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);

/** Catch-all for unmatched routes */
app.use((_req, _res, next) => {
  next(new AppError('Not found', 404));
});

app.use(errorHandler);

export default app;
