/**
 * Vercel serverless entry. The Vite app calls /api/...; vercel.json rewrites
 * those requests here so Express can answer them in production.
 */
import app from '../server/server.js';

export default app;
