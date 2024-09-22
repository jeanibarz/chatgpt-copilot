import { Utility } from '../../Utility';

describe('Utility.delay', () => {
    jest.useFakeTimers(); // This is used to mock timers

    it('should resolve after the specified time', async () => {
        const ms = 1000; // 1 second
        const spy = jest.fn(); // Mock function

        Utility.delay(ms).then(spy);

        expect(spy).not.toHaveBeenCalled(); // Not yet called immediately
        jest.advanceTimersByTime(ms); // Fast-forward time
        await Promise.resolve(); // Resolve any pending promises
        expect(spy).toHaveBeenCalled(); // Ensure it has been called after time advances
    });

    it('should not resolve before the specified time', async () => {
        const ms = 2000; // 2 seconds
        const spy = jest.fn(); // Mock function

        Utility.delay(ms).then(spy);

        jest.advanceTimersByTime(ms - 500); // Fast-forward time, but not enough
        expect(spy).not.toHaveBeenCalled(); // Ensure it's not yet called

        jest.advanceTimersByTime(500); // Fast-forward remaining time
        await Promise.resolve(); // Resolve any pending promises
        expect(spy).toHaveBeenCalled(); // Now it should be called
    });
});
