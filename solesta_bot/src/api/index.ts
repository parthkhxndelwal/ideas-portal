import express from 'express';
import { authMiddleware } from './middleware/auth';
import authRoutes from './routes/auth';
import registrationRoutes from './routes/registration';
import ticketRoutes from './routes/ticket';
import adminRoutes from './routes/admin';
import swaggerDocument from './swagger.json';

const app = express();

app.use(express.json());

app.get('/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api-docs', require('swagger-ui-express').serve, require('swagger-ui-express').setup(swaggerDocument, { 
  customSiteTitle: 'Solesta API Docs',
  swaggerOptions: {
    url: '/api-docs/swagger.json'
  }
}));
app.get('/api-docs/swagger.json', (_, res) => {
  res.json(swaggerDocument);
});

app.use('/', (req, res, next) => {
  if (req.path === '/') {
    res.redirect('/api-docs');
  } else {
    next();
  }
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/registration', authMiddleware, registrationRoutes);
app.use('/api/v1/ticket', authMiddleware, ticketRoutes);
app.use('/api/v1/admin', authMiddleware, adminRoutes);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('API Error:', err.message);
  res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' });
});

const API_PORT = process.env.API_PORT ? parseInt(process.env.API_PORT, 10) : 3001;

export function startApiServer() {
  app.listen(API_PORT, () => {
    console.log(`🌐 API server running on port ${API_PORT}`);
    console.log(`📚 Swagger docs available at http://localhost:${API_PORT}/api-docs`);
    console.log(`📄 Swagger JSON at http://localhost:${API_PORT}/api-docs/swagger.json`);
  });
}

export default app;