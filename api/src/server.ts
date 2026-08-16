import app from './app';
import { config as dotenvConfig } from 'dotenv';
import { ingestNews } from './services/ingestion';

dotenvConfig();

const PORT = process.env.PORT || 3000;

// Start the server
const server = app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);

  // Ingest real articles from live RSS feeds at startup (parallel, fast).
  // If it fails, the API still serves whatever is in the store.
  ingestNews()
    .then((summary) => console.log(`[boot] initial ingestion: ${JSON.stringify(summary)}`))
    .catch((err) => console.error('[boot] initial ingestion failed:', err.message));
});

// Keep coverage fresh: re-ingest every 15 minutes.
setInterval(() => {
  ingestNews()
    .then((summary) => console.log(`[refresh] ingestion: ${JSON.stringify(summary)}`))
    .catch((err) => console.error('[refresh] ingestion failed:', err.message));
}, 15 * 60 * 1000);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default server;
