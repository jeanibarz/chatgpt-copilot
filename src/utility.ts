/**
 * This module provides utility functions that are used throughout the application.
 * It includes methods for generating random IDs and creating delays, which can be 
 * useful in various scenarios such as message handling and asynchronous operations.
 * 
 * The `Utility` class contains static methods that can be called without needing 
 * to instantiate the class, making it easy to access common functionalities.
 * 
 * Key Features:
 * - Generates random IDs for unique identifiers.
 * - Provides a delay function for asynchronous operations.
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