import { IMessage } from './email.interface';

// eslint-disable-next-line @typescript-eslint/ban-types
export abstract class AbstractEmailLetter<TParams extends {}> {
  protected readonly _params: TParams;

  protected constructor(params: TParams) {
    this._params = params;
  }

  public abstract getEmail(): IMessage;
}
