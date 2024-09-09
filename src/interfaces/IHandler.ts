export interface IHandler<T> {
    execute(data: T): Promise<void>;
}