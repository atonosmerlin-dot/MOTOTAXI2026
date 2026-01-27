import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import driverRoutes from './routes/driver.routes.js';
import apiRoutes from './routes/api.routes.js';
import { startRideCleanupJob } from './cron/cleanup.js';

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api', apiRoutes);
app.use('/', driverRoutes);

// Start Cron Jobs
startRideCleanupJob();

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

export default app;
