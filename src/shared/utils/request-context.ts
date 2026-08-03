import { AsyncLocalStorage } from "node:async_hooks";

// Shared request context.
// requestId is typed as a string to allow different ID generation
type RequestContext = {
    requestId: string;
};

// Single instance for the whole app
const asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

/**
 * Runs `callback` inside a context that carries `store`.
 * Everything called inside (sync or async) can read `store` via getContext().
 */
function runWithContext<TCallbackResult>(store: RequestContext, callback: () => TCallbackResult): TCallbackResult {
    return asyncLocalStorage.run(store, callback);
}

/**
 * Returns the current context, or undefined if called outside runWithContext
 */
const getContext = (): RequestContext | undefined => {
    return asyncLocalStorage.getStore();
};

export {
    runWithContext,
    getContext,
};

export type { RequestContext };