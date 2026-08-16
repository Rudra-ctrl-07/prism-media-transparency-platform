/**
 * Lightweight entry point for ad-hoc dev runs.
 * Primary entry is `server.ts` (which mounts the full modular app).
 * This file is kept as a minimal fallback for any caller that imports
 * from `./api/src/index.ts` directly.
 */

import express from 'express';
import cors from 'cors';
import { config as dotenvConfig } from 'dotenv';
import app from './app';

dotenvConfig();

const port = process.env.PORT || 3000;

const standalone = express();
standalone.use(cors());
standalone.use(express.json());
standalone.use(app);

standalone.listen(port, () => {
  console.log(`PRISM backend (index.ts) running on port ${port}`);
});

export default standalone;