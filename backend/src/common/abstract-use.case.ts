import { Injectable, Scope } from '@nestjs/common';
import { InTransactionEnum } from '../enums/index.js';
import { IDatabaseContext } from './database-context.interface.js';

@Injectable({ scope: Scope.REQUEST })
abstract class AbstractUseCase<TInputData = void, TOutputData = void> {
  protected _inputData: TInputData;
  protected _inTransaction: boolean;
  protected abstract _dbContext: IDatabaseContext | null;

  public async execute(
    inputData: TInputData,
    inTransaction: InTransactionEnum = InTransactionEnum.OFF,
  ): Promise<TOutputData> {
    this._inputData = inputData;
    this._inTransaction = inTransaction === InTransactionEnum.ON;

    try {
      if (this._inTransaction) await this.startTransaction();
      const result = await this.implementation(inputData);
      if (this._inTransaction) await this.commitTransaction();
      return result;
    } catch (error) {
      if (this._inTransaction) await this.rollbackTransaction();
      throw error;
    } finally {
      if (this._inTransaction) await this.releaseQueryRunner();
    }
  }

  protected abstract implementation(inputData: TInputData): Promise<TOutputData> | TOutputData;

  private async startTransaction(): Promise<void> {
    await this._dbContext.startTransaction();
  }

  private async commitTransaction(): Promise<void> {
    await this._dbContext.commitTransaction();
  }

  private async rollbackTransaction(): Promise<void> {
    await this._dbContext.rollbackTransaction();
  }

  private async releaseQueryRunner(): Promise<void> {
    await this._dbContext.releaseQueryRunner();
  }
}

export default AbstractUseCase;