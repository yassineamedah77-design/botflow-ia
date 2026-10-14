import { CircleAlertIcon, CircleCheckIcon } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import type { ActionState } from "@/lib/forms/action-state";

/** Form-level feedback from a server action (field errors are shown on the fields). */
export function FormMessage({ state }: { state: ActionState }) {
  if (state.status === "error") {
    return (
      <Alert variant="destructive" aria-live="polite">
        <CircleAlertIcon aria-hidden />
        <AlertDescription className="text-destructive">{state.message}</AlertDescription>
      </Alert>
    );
  }
  if (state.status === "success" && state.message) {
    return (
      <Alert variant="success" aria-live="polite">
        <CircleCheckIcon aria-hidden />
        <AlertDescription className="text-success">{state.message}</AlertDescription>
      </Alert>
    );
  }
  return null;
}
