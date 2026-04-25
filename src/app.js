import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import session from 'cookie-session';
import passport from './config/passport.js';
import authRoutes from './routes/authRoutes.js';

dotenv.config();

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

app.use(express.json());
app.use(
  session({
    name: 'session',
    keys: ['secret'],
    maxAge: 24 * 60 * 60 * 1000,
  })
);
app.use(passport.initialize());
app.use(passport.session());

app.use('/api/auth', authRoutes);

app.get('/', (req, res) => res.send('Backend running 🚀'));

export default app;
