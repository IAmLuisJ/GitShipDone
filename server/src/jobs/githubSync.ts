import cron from "node-cron";
import { db } from "../db";
import { projects, users } from "../db/schema";
import { eq, isNotNull, isNull, and } from "drizzle-orm";
import { getOctokit, importCommitsForProject } from "../services/githubService";

/**
 * Sync GitHub commits and releases for all connected projects.
 * Errors per-project are logged but do not stop other projects.
 */
export async function syncAllGithubProjects(): Promise<void> {
  const connectedProjects = await db
    .select({
      projectId: projects.id,
      githubRepoName: projects.githubRepoName,
      githubAccessToken: users.githubAccessToken,
    })
    .from(projects)
    .innerJoin(users, eq(projects.userId, users.id))
    .where(
      and(
        isNotNull(projects.githubRepoName),
        isNotNull(users.githubAccessToken),
        isNull(projects.deletedAt),
      ),
    );

  for (const project of connectedProjects) {
    try {
      const repoName = project.githubRepoName!;
      const [owner, repo] = repoName.split("/");
      if (!owner || !repo) {
        console.error(
          `[GitHub Sync] Invalid repo name format for project ${project.projectId}: ${repoName}`,
        );
        continue;
      }

      const octokit = getOctokit(project.githubAccessToken!);
      await importCommitsForProject(project.projectId, octokit, owner, repo);
    } catch (error) {
      console.error(
        `[GitHub Sync] Error syncing project ${project.projectId}:`,
        error,
      );
    }
  }
}

/**
 * Start the recurring GitHub sync cron job (every 60 minutes).
 * Also runs an initial sync immediately on startup.
 */
export function startGithubSyncJob(): void {
  // Run immediately on startup
  syncAllGithubProjects().catch((err) =>
    console.error("[GitHub Sync] Initial sync failed:", err),
  );

  // Schedule hourly
  cron.schedule("0 * * * *", () => {
    syncAllGithubProjects().catch((err) =>
      console.error("[GitHub Sync] Scheduled sync failed:", err),
    );
  });

  console.log("[GitHub Sync] Cron job scheduled (every 60 minutes)");
}
