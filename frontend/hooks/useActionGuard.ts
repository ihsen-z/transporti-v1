'use client';

import { useState, useCallback, useRef } from 'react';

/**
 * useActionGuard — Prevents double-click, double-submit, and race conditions.
 * Production Hardening — Sprint H2
 * 
 * Usage:
 *   const { execute, isExecuting } = useActionGuard(async () => { ... });
 *   <button onClick={execute} disabled={isExecuting}>Submit</button>
 */
export function useActionGuard<T>(
    action: () => Promise<T>,
    options?: {
        /** Minimum delay between executions (ms). Default: 500 */
        cooldownMs?: number;
    }
) {
    const [isExecuting, setIsExecuting] = useState(false);
    const lastExecutionRef = useRef<number>(0);
    const cooldown = options?.cooldownMs ?? 500;

    const execute = useCallback(async (): Promise<T | undefined> => {
        // Prevent re-entry
        if (isExecuting) return undefined;

        // Cooldown check (prevents rapid re-clicks even after state settles)
        const now = Date.now();
        if (now - lastExecutionRef.current < cooldown) return undefined;

        setIsExecuting(true);
        lastExecutionRef.current = now;

        try {
            const result = await action();
            return result;
        } finally {
            setIsExecuting(false);
        }
    }, [action, isExecuting, cooldown]);

    return { execute, isExecuting };
}
