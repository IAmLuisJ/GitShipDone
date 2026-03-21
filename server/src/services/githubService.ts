import { Octokit } from "@octokit/rest";
import { decrypt } from "../utils/encryption";
import { db } from "../db";
import { githubCommits, githubReleases } from "../db/schema";
import { awardPoints } from "./pointsService";
import { logTimelineEvent } from "./timelineService";

/**
 * Create an authenticated Octokit instance from an encrypted GitHub token.
 */
export function getOctokit(encryptedToken: string): Octokit {
  const token = decrypt(encryptedToken);
  return new Octokit({ auth: token });
}

/**
 * Fetch a single repo by owner/name. Throws if not found or no access.
 */
export async function getRepo(
  octokit: Octokit,
  owner: string,
  repo: string,
) {
  const { data } = await octokit.repos.get({ owner, repo });
  return data;
}

/**
 * Import the last 90 days of commits and releases for a project.
 * Uses ON CONFLICT DO NOTHING for idempotent imports.
 * Awards points and logs timeline events for each new record.
 */
export async function importCommitsForProject(
  projectId: string,
  octokit: Octokit,
  owner: string,
  repo: string,
): Promise<void> {
  const since = new Date();
  since.setDate(since.getDate() - 90);

  // Import commits
  try {
    const commits = await octokit.paginate(octokit.repos.listCommits, {
      owner,
      repo,
      since: since.toISOString(),
      per_page: 100,
    });

    for (const commit of commits) {
      try {
        const result = await db
          .insert(githubCommits)
          .values({
            projectId,
            sha: commit.sha,
            message: commit.commit.message,
            authorName: commit.commit.author?.name ?? "Unknown",
            authorEmail: commit.commit.author?.email ?? null,
            committedAt: new Date(
              commit.commit.author?.date ??
                commit.commit.committer?.date ??
                new Date().toISOString(),
            ),
            url: commit.html_url,
          })
          .onConflictDoNothing();

        if (result.rowCount && result.rowCount > 0) {
          await awardPoints(projectId, 2, `Commit ${commit.sha.slice(0, 7)}`, "github_commit");
          await logTimelineEvent(projectId, "github_commit", {
            sha: commit.sha,
            message: commit.commit.message,
            authorName: commit.commit.author?.name ?? "Unknown",
            url: commit.html_url,
          });
        }
      } catch {
        // Skip individual commit insert failures
      }
    }
  } catch {
    console.error(`Failed to import commits for project ${projectId}`);
  }

  // Import releases
  try {
    const releases = await octokit.repos.listReleases({
      owner,
      repo,
      per_page: 100,
    });

    const sinceTime = since.getTime();

    for (const release of releases.data) {
      const publishedAt = release.published_at
        ? new Date(release.published_at)
        : null;

      if (!publishedAt || publishedAt.getTime() < sinceTime) {
        continue;
      }

      try {
        const result = await db
          .insert(githubReleases)
          .values({
            projectId,
            tagName: release.tag_name,
            name: release.name ?? null,
            body: release.body ?? null,
            publishedAt,
            url: release.html_url,
          })
          .onConflictDoNothing();

        if (result.rowCount && result.rowCount > 0) {
          await awardPoints(projectId, 25, `Release ${release.tag_name}`, "github_release");
          await logTimelineEvent(projectId, "github_release", {
            tagName: release.tag_name,
            name: release.name ?? null,
            url: release.html_url,
          });
        }
      } catch {
        // Skip individual release insert failures
      }
    }
  } catch {
    console.error(`Failed to import releases for project ${projectId}`);
  }
}

// Keep backward-compatible alias
export const importCommits = importCommitsForProject;
