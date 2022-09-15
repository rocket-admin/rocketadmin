export interface IDatabaseContext {
  startTransaction(): Promise<void>;

  commitTransaction(): Promise<void>;

  rollbackTransaction(): Promise<void>;

  releaseQueryRunner(): Promise<void>;
}
