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
PORT=5000
CLIENT_URL=http://192.168.1.123:8081
JWT_SECRET=1a9f0d14c2b4a345fd8b6f72e4e6f12bce1c682a6a8b09ab0c56d2a53f6b1e1f


# ✅ Google OAuth
GOOGLE_CLIENT_ID=317018523274-7m80jmnn8rb8p3jkgtdi4pqo1nt6ch1h.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_CALLBACK_URL=http://192.168.1.123:5000/api/auth/google/callback  # ✅ use your LAN IP, not localhost

# ✅ Prisma / Postgres
DATABASE_URL="postgresql://admin_01:wJo3E5B6XrZAPmaxqT2xmMLa2sbhwLUR@dpg-d3gp2oe3jp1c73eve48g-a.oregon-postgres.render.com/zhs_db?schema=public"
