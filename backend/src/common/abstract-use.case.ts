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

    let result: TOutputData;

    try {
      if (this._inTransaction) await this._dbContext.startTransaction();
      result = await this.implementation(inputData);
      if (this._inTransaction) await this._dbContext.commitTransaction();
    } catch (error) {
      if (this._inTransaction) await this._dbContext.rollbackTransaction();
      throw error;
    } finally {
      if (this._inTransaction) await this._dbContext.releaseQueryRunner();
    }
    return result;
  }

  protected abstract implementation(inputData: TInputData): Promise<TOutputData> | TOutputData;
}

export default AbstractUseCase;
