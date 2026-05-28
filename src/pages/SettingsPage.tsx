import type { FormEvent } from "react";
import { useState } from "react";
import { KeyRound, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import api from "@/lib/api";
import { useAuthStore, type User } from "@/stores/authStore";

type ProfileResponse = User;

export default function SettingsPage() {
  const user = useAuthStore((state) => state.user);
  const setAuth = useAuthStore((state) => state.setAuth);
  const accessToken = useAuthStore((state) => state.accessToken);
  const [name, setName] = useState(user?.name ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [aiProvider, setAiProvider] = useState(user?.aiProvider ?? "openai");
  const [apiKey, setApiKey] = useState("");
  const [emailNotifications, setEmailNotifications] = useState(
    user?.emailNotificationsEnabled ?? true,
  );
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  function syncUser(updated: ProfileResponse) {
    if (accessToken) {
      setAuth(updated, accessToken);
    }
  }

  async function handleProfileSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await api.patch<ProfileResponse>("/users/me", {
      name,
      ...(avatarUrl.trim() ? { avatarUrl: avatarUrl.trim() } : {}),
    });
    syncUser(response.data);
    setName(response.data.name);
    setAvatarUrl(response.data.avatarUrl ?? "");
    toast.success("Profile saved");
  }

  async function handlePasswordSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await api.patch("/users/me/password", { currentPassword, newPassword });
    setCurrentPassword("");
    setNewPassword("");
    toast.success("Password updated");
  }

  async function handleAiSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await api.patch("/users/me/ai-settings", {
      provider: aiProvider,
      apiKey,
    });
    setApiKey("");
    toast.success("AI settings saved");
  }

  async function handleNotificationToggle(checked: boolean) {
    setEmailNotifications(checked);
    const response = await api.patch<ProfileResponse>("/users/me", {
      emailNotificationsEnabled: checked,
    });
    syncUser(response.data);
    toast.success("Notification preferences saved");
  }

  return (
    <div data-testid="settings-page" className="mx-auto grid max-w-4xl gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account, workspace preferences, and integrations.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3" onSubmit={handleProfileSave}>
            <label className="grid gap-1 text-sm font-medium">
              Name
              <Input value={name} onChange={(event) => setName(event.target.value)} />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Avatar URL
              <Input
                value={avatarUrl}
                onChange={(event) => setAvatarUrl(event.target.value)}
                placeholder="https://example.com/avatar.png"
              />
            </label>
            <Button type="submit" className="w-fit">
              Save profile
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
        </CardHeader>
        <CardContent>
          {user?.hasPassword === false ? (
            <p className="text-sm text-muted-foreground">
              Password login is not available for OAuth accounts.
            </p>
          ) : (
            <form className="grid gap-3" onSubmit={handlePasswordSave}>
              <label className="grid gap-1 text-sm font-medium">
                Current password
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                />
              </label>
              <label className="grid gap-1 text-sm font-medium">
                New password
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
              </label>
              <Button type="submit" className="w-fit">
                <KeyRound data-icon="inline-start" />
                Update password
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3" onSubmit={handleAiSave}>
            <label className="grid gap-1 text-sm font-medium">
              Provider
              <Select value={aiProvider} onValueChange={setAiProvider}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="anthropic">Anthropic</SelectItem>
                </SelectContent>
              </Select>
            </label>
            <label className="grid gap-1 text-sm font-medium">
              API key
              <Input
                type="password"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder={user?.hasAiKey ? "Saved key configured" : "Paste an API key"}
              />
            </label>
            <Button type="submit" className="w-fit">
              Save AI settings
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <label className="flex items-center justify-between gap-3 text-sm font-medium">
            Email notifications
            <Switch
              checked={emailNotifications}
              onCheckedChange={handleNotificationToggle}
              aria-label="Email notifications"
            />
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="destructive"
            onClick={() => setIsDeleteOpen(true)}
          >
            <Trash2 data-icon="inline-start" />
            Delete Account
          </Button>
        </CardContent>
      </Card>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete account?</DialogTitle>
            <DialogDescription>
              This permanently disables access to your workspace. You can cancel
              here without changing anything.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" variant="destructive">
              Delete Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
