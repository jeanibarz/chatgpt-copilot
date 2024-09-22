import { Utility } from '../../Utility';

describe('Utility.debounce', () => {
    jest.useFakeTimers();

    it('should delay function execution by the specified wait time', () => {
        const func = jest.fn();
        const debouncedFunc = Utility.debounce(func, 1000);

        debouncedFunc(); // Call the debounced function
        expect(func).not.toHaveBeenCalled(); // The function should not be called immediately

        jest.advanceTimersByTime(1000); // Fast-forward time by 1 second
        expect(func).toHaveBeenCalled(); // Now the function should have been called
    });

    it('should only call the function once if triggered multiple times within the wait period', () => {
        const func = jest.fn();
        const debouncedFunc = Utility.debounce(func, 1000);

        debouncedFunc(); // First call
        debouncedFunc(); // Second call
        debouncedFunc(); // Third call

        jest.advanceTimersByTime(1000); // Fast-forward time by 1 second
        expect(func).toHaveBeenCalledTimes(1); // The function should only be called once
    });

    it('should reset the wait time if called again before the time elapses', () => {
        const func = jest.fn();
        const debouncedFunc = Utility.debounce(func, 1000);

        debouncedFunc(); // First call
        jest.advanceTimersByTime(500); // Fast-forward 500ms
        debouncedFunc(); // Second call (resets the timer)

        jest.advanceTimersByTime(500); // Fast-forward another 500ms (should not be called yet)
        expect(func).not.toHaveBeenCalled(); // Function should not have been called yet

        jest.advanceTimersByTime(500); // Fast-forward remaining time
        expect(func).toHaveBeenCalled(); // Now it should be called
    });
});
