import type { FormEvent } from "react";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import api from "@/lib/api";
import { getAuthApiError } from "@/lib/authResponse";
import { useAuthStore } from "@/stores/authStore";

type AiSettingsResponse = {
  provider: string;
};

export function AiSettingsForm() {
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const setAuth = useAuthStore((state) => state.setAuth);
  const [provider, setProvider] = useState(user?.aiProvider ?? "openai");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      const response = await api.patch<AiSettingsResponse>("/users/me/ai-settings", {
        provider,
        apiKey,
      });
      if (user && accessToken) {
        setAuth(
          { ...user, aiProvider: response.data.provider, hasAiKey: true },
          accessToken,
        );
      }
      setApiKey("");
      toast.success("AI settings saved!");
    } catch (err) {
      setError(getAuthApiError(err, "Unable to save AI settings."));
    }
  }

  return (
    <form className="grid gap-3" onSubmit={handleSubmit}>
      <label className="grid gap-1 text-sm font-medium">
        Provider
        <Select value={provider} onValueChange={setProvider}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="openai">OpenAI (GPT-4o)</SelectItem>
            <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
          </SelectContent>
        </Select>
      </label>

      {user?.hasAiKey ? (
        <div className="rounded-lg border bg-muted/30 p-3 text-sm">
          Key saved (••••••••)
        </div>
      ) : null}

      <label className="grid gap-1 text-sm font-medium">
        API key
        <div className="flex gap-2">
          <Input
            type={showKey ? "text" : "password"}
            aria-label="API key"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder={user?.hasAiKey ? "Enter a new key to update" : "Paste an API key"}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={showKey ? "Hide key" : "Show key"}
            onClick={() => setShowKey((value) => !value)}
          >
            {showKey ? <EyeOff /> : <Eye />}
          </Button>
        </div>
      </label>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="submit" className="w-fit" disabled={!apiKey.trim()}>
        {user?.hasAiKey && !apiKey ? "Update Key" : "Save AI Settings"}
      </Button>
    </form>
  );
}
