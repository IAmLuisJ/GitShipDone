import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Github } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import type { Project } from "@/types/project";

type GithubConnectPanelProps = {
  project: Project;
};

type GithubRepoSummary = {
  fullName: string;
  htmlUrl: string;
  id: number;
  name: string;
  owner: string;
  private: boolean;
};

export function GithubConnectPanel({ project }: GithubConnectPanelProps) {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const githubConnected = user?.githubConnected ?? false;
  const repoName = project.githubRepoName;
  const [search, setSearch] = useState("");
  const [selectedRepo, setSelectedRepo] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const reposQuery = useQuery({
    queryKey: ["github-repos"],
    queryFn: async () => {
      const response = await api.get<GithubRepoSummary[]>("/users/me/github/repos");
      return response.data;
    },
    enabled: githubConnected && !repoName,
  });

  const filteredRepos = useMemo(() => {
    const repos = reposQuery.data ?? [];
    const query = search.trim().toLowerCase();
    if (!query) {
      return repos;
    }

    return repos.filter((repo) => repo.fullName.toLowerCase().includes(query));
  }, [reposQuery.data, search]);

  /** Links the selected GitHub repository to this project. */
  async function handleConnectRepo() {
    const repo = reposQuery.data?.find((item) => item.fullName === selectedRepo);
    if (!repo) {
      return;
    }

    setIsConnecting(true);

    try {
      await api.post(`/projects/${project.id}/github/connect`, {
        repoName: repo.name,
        repoOwner: repo.owner,
      });
      await queryClient.invalidateQueries({ queryKey: ["project", project.id] });
      toast.success("GitHub repository connected");
    } finally {
      setIsConnecting(false);
    }
  }

  /** Removes the linked GitHub repository from this project. */
  async function handleDisconnectRepo() {
    setIsDisconnecting(true);

    try {
      await api.delete(`/projects/${project.id}/github/disconnect`);
      await queryClient.invalidateQueries({ queryKey: ["project", project.id] });
      toast.success("GitHub repository disconnected");
    } finally {
      setIsDisconnecting(false);
    }
  }

  if (repoName) {
    const commitCount = project.githubCommitCount ?? 0;

    return (
      <Card>
        <CardHeader>
          <h2 className="flex items-center gap-2 font-heading text-base leading-snug font-medium">
            <Github className="size-4" />
            GitHub
          </h2>
          <CardDescription>Repository activity is connected to this project.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2">
          <a
            href={`https://github.com/${repoName}`}
            target="_blank"
            rel="noreferrer"
            className="font-medium underline-offset-4 hover:underline"
          >
            {repoName}
          </a>
          <p className="text-sm text-muted-foreground">
            {commitCount} {commitCount === 1 ? "commit" : "commits"} imported
          </p>
        </CardContent>
        <CardFooter className="justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={isDisconnecting}
            onClick={handleDisconnectRepo}
          >
            {isDisconnecting ? "Disconnecting..." : "Disconnect"}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (!githubConnected) {
    return (
      <Card>
        <CardHeader>
          <h2 className="flex items-center gap-2 font-heading text-base leading-snug font-medium">
            <Github className="size-4" />
            GitHub
          </h2>
          <CardDescription>
            Connect a GitHub account with repo access before linking a repository.
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-end">
          <Button asChild>
            <a href="/api/auth/github/repo">Connect GitHub Account</a>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="flex items-center gap-2 font-heading text-base leading-snug font-medium">
          <Github className="size-4" />
          GitHub
        </h2>
        <CardDescription>Choose the repository to import commits from.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="github-repo-search">Search repositories</Label>
          <Input
            id="github-repo-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="owner/repo"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="github-repository">Repository</Label>
          <select
            id="github-repository"
            value={selectedRepo}
            onChange={(event) => setSelectedRepo(event.target.value)}
            disabled={reposQuery.isLoading}
            className="h-8 rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="">
              {reposQuery.isLoading ? "Loading repositories..." : "Select repository"}
            </option>
            {filteredRepos.map((repo) => (
              <option key={repo.id} value={repo.fullName}>
                {repo.fullName}
              </option>
            ))}
          </select>
        </div>
      </CardContent>
      <CardFooter className="justify-end">
        <Button
          type="button"
          disabled={!selectedRepo || isConnecting}
          onClick={handleConnectRepo}
        >
          {isConnecting ? "Linking..." : "Link repository"}
        </Button>
      </CardFooter>
    </Card>
  );
}
