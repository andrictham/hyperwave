import { useState } from "react";
import { api } from "@hyperwave/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Props for {@link OpenRouterKeyDialog}.
 */
interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Dialog allowing the user to create, update, or delete their personal
 * OpenRouter API key. The key is persisted server-side via Convex and is never
 * displayed in plaintext once saved. Invalid keys are rejected client-side and
 * errors from the server are presented to the user.
 */
export function OpenRouterKeyDialog({ open, onOpenChange }: Props) {
  const hasKey = useQuery(api.userSettings.hasApiKey);
  const save = useMutation(api.userSettings.saveApiKey);
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);
    const trimmed = key.trim();
    if (trimmed && !trimmed.startsWith("sk-or-")) {
      setError("Please enter a valid OpenRouter key starting with sk-or-");
      return;
    }
    try {
      setLoading(true);
      await save({ apiKey: trimmed });
      onOpenChange(false);
      setKey("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Server error";
      setError(message.includes("invalid key") ? "Please enter a valid key" : "Failed to save key. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={(e) => { e.preventDefault(); void handleSave(); }} className="space-y-4">
          <DialogHeader>
            <DialogTitle>OpenRouter API Key</DialogTitle>
            <DialogDescription>
              {hasKey
                ? "Update your saved API key. Leave blank to remove it."
                : "Provide your personal OpenRouter API key."}
            </DialogDescription>
          </DialogHeader>
          <Input
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="sk-or-..."
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <DialogFooter className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
