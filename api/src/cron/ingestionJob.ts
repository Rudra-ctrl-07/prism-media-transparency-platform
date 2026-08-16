import { ingestNews } from '../services/ingestion';

// This function can be called by a cron scheduler (e.g., node-cron or Vercel Cron)
export async function runIngestionJob() {
  console.log('Running scheduled ingestion job at:', new Date().toISOString());
  try {
    await ingestNews();
    console.log('Scheduled job completed.');
    return { success: true };
  } catch (error) {
    console.error('Scheduled ingestion job failed:', error);
    throw error;
  }
}

// If run directly, execute the job
if (require.main === module) {
  runIngestionJob()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Job failed:', error);
      process.exit(1);
    });
}