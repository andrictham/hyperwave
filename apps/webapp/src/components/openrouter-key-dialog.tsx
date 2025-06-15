import { useState, useEffect } from "react";
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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Dialog allowing the user to manage their personal OpenRouter API key.
 */
export function OpenRouterKeyDialog({ open, onOpenChange }: Props) {
  const savedKey = useQuery(api.userSettings.getApiKey);
  const save = useAction(api.userSettings.saveApiKey);
  const [key, setKey] = useState("");

  useEffect(() => {
    if (typeof savedKey === "string") {
      setKey(savedKey);
    }
  }, [savedKey]);

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
            Provide your personal OpenRouter API key to use with Hyperwave.
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
