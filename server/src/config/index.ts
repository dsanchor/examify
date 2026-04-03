import dotenv from 'dotenv';

dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}

export const config = {
  port: parseInt(optionalEnv('PORT', '3000'), 10),
  nodeEnv: optionalEnv('NODE_ENV', 'development'),
  clientUrl: optionalEnv('CLIENT_URL', 'http://localhost:5173'),

  cosmos: {
    endpoint: requireEnv('COSMOS_ENDPOINT'),
    key: requireEnv('COSMOS_KEY'),
    databaseName: optionalEnv('COSMOS_DATABASE_NAME', 'examify'),
    containers: {
      sources: optionalEnv('COSMOS_SOURCES_CONTAINER', 'sources'),
      exams: optionalEnv('COSMOS_EXAMS_CONTAINER', 'exams'),
      tests: optionalEnv('COSMOS_TESTS_CONTAINER', 'tests'),
    },
  },

  ai: {
    endpoint: requireEnv('AZURE_AI_ENDPOINT'),
    key: requireEnv('AZURE_AI_KEY'),
    deployment: optionalEnv('AZURE_AI_DEPLOYMENT', 'gpt-5.4-mini'),
    apiVersion: optionalEnv('AZURE_AI_API_VERSION', '2024-02-15-preview'),
  },
} as const;

export type Config = typeof config;
