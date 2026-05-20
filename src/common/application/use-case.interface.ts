export interface IUseCase<TCommand, TResult = void> {
  execute(command: TCommand): Promise<TResult>;
}
