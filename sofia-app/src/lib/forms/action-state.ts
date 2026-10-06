/**
 * Result of a form server action, consumed by `useActionState` in the UI.
 * `values` echoes the submitted fields (never passwords) so a form keeps what
 * the user typed when validation fails.
 */
export type ActionState =
  | { status: "idle" }
  | { status: "success"; message?: string }
  | {
      status: "error";
      message: string;
      fieldErrors?: Record<string, string[] | undefined>;
      values?: Record<string, string>;
    };

export const idleState: ActionState = { status: "idle" };

export function fieldError(state: ActionState, field: string): string | undefined {
  return state.status === "error" ? state.fieldErrors?.[field]?.[0] : undefined;
}

export function submittedValue(state: ActionState, field: string, fallback = ""): string {
  return state.status === "error" ? (state.values?.[field] ?? fallback) : fallback;
}
