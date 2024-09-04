// src/utils/delay.ts

/**
 * Creates a delay for a specified amount of time.
 * 
 * @param ms - The number of milliseconds to delay.
 * @returns A Promise that resolves after the specified delay.
 */
export function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
