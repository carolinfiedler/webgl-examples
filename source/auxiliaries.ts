
/** Namespace that comprises various utils (also cleans up documentation). */
namespace auxiliaries {

    /**
     * If defined, assertions immediately return on invocation
     */
    export const DISABLE_ASSERTIONS = false;

    /**
     * Evaluates the provided expression and throws an evaluation error if false.
     * ```
     * assert(foo <= threshold, `value of foo ${foo} exceeds threshold of ${threshold}`);
     * ```
     * @param expression - Result of an expression expected to be true.
     * @param message - Message to be passed to the error (if thrown).
     */
    export function assert(expression: boolean, message: string): void {
        if (DISABLE_ASSERTIONS || expression) {
            return;
        }

        // Note: the parameters are intentionally not forwarded to console.assert since it does not interrupt execution.
        throw new EvalError(message);
    }

}

export = auxiliaries;
