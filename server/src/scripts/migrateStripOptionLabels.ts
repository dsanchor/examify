/**
 * One-time migration: strip embedded option-label prefixes (e.g. "a)", "B.", "(1)")
 * from answer options in Source documents already stored in CosmosDB before the
 * ingestion fix was applied.
 *
 * RECOMMENDED FIRST RUN (dry-run — no writes):
 *   cd server
 *   DRY_RUN=1 npm run migrate:strip-labels
 *   -- or --
 *   ts-node src/scripts/migrateStripOptionLabels.ts --dry-run
 *
 * REAL RUN (writes to CosmosDB):
 *   npm run migrate:strip-labels
 *
 * Idempotent: running a second time produces zero updates because already-clean
 * options are unchanged by stripOptionLabel.
 *
 * Required env vars — use the same .env file as the server:
 *   COSMOS_ENDPOINT          (required) CosmosDB account endpoint URL
 *   COSMOS_KEY               (required) CosmosDB account key
 *   COSMOS_DATABASE_NAME     (optional, default: "examify")
 *   COSMOS_SOURCES_CONTAINER (optional, default: "sources")
 *   AZURE_AI_ENDPOINT        (required by config — loaded transitively via aiService import)
 *   AZURE_AI_KEY             (required by config — loaded transitively via aiService import)
 *
 * NOTE: AZURE_AI_* vars are required only because importing stripOptionLabel from
 * aiService pulls in the full config module, which calls requireEnv() for AI vars at
 * module load time. The script does not make any AI calls. All values must be present
 * in your .env; none are hardcoded here.
 */

// MUST be the first import — loads .env before any other module reads process.env.
import 'dotenv/config';

import { config } from '../config';
import { cosmosService } from '../services/cosmosService';
import { stripOptionLabel } from '../services/aiService';
import { Source, Question } from '../models';

const DRY_RUN =
  process.env.DRY_RUN === '1' || process.argv.includes('--dry-run');

async function migrate(): Promise<void> {
  console.log('=== migrateStripOptionLabels ===');
  console.log(`Mode     : ${DRY_RUN ? 'DRY-RUN (no writes)' : 'LIVE (will write to CosmosDB)'}`);
  console.log(`Endpoint : ${config.cosmos.endpoint}`);
  console.log(`Database : ${config.cosmos.databaseName}`);
  console.log(`Container: ${config.cosmos.containers.sources}`);
  console.log('');

  await cosmosService.initialize();

  const sources = await cosmosService.query<Source>(
    config.cosmos.containers.sources,
    { query: 'SELECT * FROM c' }
  );

  console.log(`Sources scanned : ${sources.length}`);

  let sourcesUpdated = 0;
  let totalOptionsChanged = 0;

  for (const source of sources) {
    if (!Array.isArray(source.questions) || source.questions.length === 0) {
      continue;
    }

    let optionsChangedInSource = 0;

    const newQuestions: Question[] = source.questions.map((q) => {
      const newOptions = q.options.map((opt) => {
        const stripped = stripOptionLabel(opt);
        if (stripped !== opt) {
          optionsChangedInSource++;
        }
        return stripped;
      });
      return { ...q, options: newOptions };
    });

    if (optionsChangedInSource === 0) {
      continue;
    }

    totalOptionsChanged += optionsChangedInSource;
    sourcesUpdated++;

    console.log(
      `  [${DRY_RUN ? 'DRY' : 'UPD'}] "${source.title}" (${source.id})` +
        ` — ${optionsChangedInSource} option(s) to clean`
    );

    if (!DRY_RUN) {
      await cosmosService.update<Source>(
        config.cosmos.containers.sources,
        source.id,
        { questions: newQuestions, updatedAt: new Date().toISOString() }
      );
    }
  }

  console.log('');
  console.log('=== Summary ===');
  console.log(`Sources scanned : ${sources.length}`);
  console.log(`Sources ${DRY_RUN ? 'that would be updated' : 'updated'} : ${sourcesUpdated}`);
  console.log(`Options ${DRY_RUN ? 'that would be cleaned' : 'cleaned'} : ${totalOptionsChanged}`);
  if (DRY_RUN) {
    console.log('');
    console.log('Re-run without --dry-run / DRY_RUN=1 to apply changes.');
  }
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
