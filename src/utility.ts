// File: src/utility.ts

/**
 * The `Utility` class contains static utility methods used throughout the application.
 */
export class Utility {
    /**
     * Gets a random ID for use in message identifiers or other unique purposes.
     * 
     * @returns A randomly generated string ID.
     */
    public static getRandomId(): string {
        let text = "";
        const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }

    /**
     * Creates a delay for a specified amount of time.
     * 
     * @param ms - The number of milliseconds to delay.
     * @returns A Promise that resolves after the specified delay.
     */
    public static delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

