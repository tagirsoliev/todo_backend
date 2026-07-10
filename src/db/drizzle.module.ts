import { Global, Module } from '@nestjs/common';
import { db } from './client';

// DI token for the drizzle client — inject with @Inject(DRIZZLE) in any provider.
export const DRIZZLE = Symbol('DRIZZLE');

// Type of the injected client, for constructor parameter annotations.
export type Database = typeof db;

// Global module: the drizzle client is a single per-process connection (same
// pattern as the TODO_bot project), so it only needs to be provided once.
@Global()
@Module({
  providers: [{ provide: DRIZZLE, useValue: db }],
  exports: [DRIZZLE],
})
export class DrizzleModule {}
