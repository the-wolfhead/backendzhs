import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import doctorRoutes from './routes/doctorRoutes.js';
import hospitalRoutes from './routes/hospitalRoutes.js';
import labRoutes from './routes/labRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import searchRoutes from './routes/search.js';
import walletRoutes from './routes/wallet.routes.js';
import detailsRoutes from './routes/details.js';
import paymentRoutes from './routes/payment.js';
import adminDashboardRoutes from './routes/admin.dashboard.routes.js';
import doctorPortalRoutes from './routes/doctorPortal.routes.js';
import {errorHandler} from './middleware/error.middleware.js';


dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/user', userRoutes);
// Public healthcare directory routes. Both /resource and /api/resource are
// supported so older mobile builds and the current API client work together.
app.use('/doctors', doctorRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/hospitals', hospitalRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/labs', labRoutes);
app.use('/api/labs', labRoutes);
app.use('/appointments', appointmentRoutes);
app.use('/search', searchRoutes);
app.use('/api/search', searchRoutes);
app.use('/wallet', walletRoutes);
app.use('/details', detailsRoutes);
app.use('/payment', paymentRoutes);
app.use('/admin/dashboard', adminDashboardRoutes);
app.use('/doctor', doctorPortalRoutes);
app.use(errorHandler)

app.get('/', (req, res) => res.json({ success: true, message: 'Backend running 🚀' }));
app.get('/api/health', (req, res) => res.json({ success: true, message: 'API is healthy' }));



const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
