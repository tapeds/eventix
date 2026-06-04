import { config } from 'dotenv';
config({ path: '.env.test' });

import { AppDataSource } from '../src/infrastructure/database/data-source';

export default async function globalSetup(): Promise<void> {
  await AppDataSource.initialize();
  await AppDataSource.runMigrations();
  await AppDataSource.destroy();
}
