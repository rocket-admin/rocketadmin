import { IMessage } from './email.interface.js';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export abstract class AbstractEmailLetter<TParams extends {}> {
  protected readonly _params: TParams;

  protected constructor(params: TParams) {
    this._params = params;
  }

  public abstract getEmail(): IMessage;
}
