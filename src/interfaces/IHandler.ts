// src/interfaces/IHandler.ts
export interface IHandler<T> {
    execute(data: T): Promise<void>;
}