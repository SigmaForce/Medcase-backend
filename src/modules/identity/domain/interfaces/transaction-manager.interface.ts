export interface ITransactionManager {
  run<T>(fn: (tx: unknown) => Promise<T>): Promise<T>
}
