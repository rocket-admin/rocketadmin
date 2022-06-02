import { IDatabaseContext } from './database-context.interface';

abstract class AbstractUseCase<TInputData = void, TOutputData = void> {
  protected _inputData: TInputData;
  protected abstract _dbContext: IDatabaseContext | null;

  public async execute(inputData: TInputData): Promise<TOutputData> {
    this._inputData = inputData;

    await this._dbContext.startTransaction();

    let result: TOutputData;

    try {
      result = await this.implementation(inputData);

      await this._dbContext.commitTransaction();
    } catch (error) {
      await this._dbContext.rollbackTransaction();

      throw error;
    }

    return result;
  }

  protected abstract implementation(inputData: TInputData): Promise<TOutputData> | TOutputData;
}

export default AbstractUseCase;
