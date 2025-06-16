import { useState } from "react";
import { api } from "@hyperwave/backend/convex/_generated/api";
import { useAction, useQuery } from "convex/react";

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
 * displayed in plaintext once saved.
 */
export function OpenRouterKeyDialog({ open, onOpenChange }: Props) {
  const hasKey = useQuery(api.userSettings.hasApiKey);
  const save = useAction(api.userSettings.saveApiKey);
  const [key, setKey] = useState("");

  const handleSave = async () => {
    await save({ apiKey: key.trim() });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
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
          placeholder="sk-..."
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
