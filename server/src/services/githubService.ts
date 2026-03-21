import { Octokit } from "@octokit/rest";
import { decrypt } from "../utils/encryption";
import { db } from "../db";
import { githubCommits } from "../db/schema";

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
 * Import the last 90 days of commits for a project (fire-and-forget).
 * Silently ignores duplicate SHA conflicts.
 */
export async function importCommits(
  projectId: string,
  octokit: Octokit,
  owner: string,
  repo: string,
): Promise<void> {
  const since = new Date();
  since.setDate(since.getDate() - 90);

  try {
    const commits = await octokit.paginate(octokit.repos.listCommits, {
      owner,
      repo,
      since: since.toISOString(),
      per_page: 100,
    });

    for (const commit of commits) {
      try {
        await db
          .insert(githubCommits)
          .values({
            projectId,
            sha: commit.sha,
            message: commit.commit.message,
            authorName: commit.commit.author?.name ?? "Unknown",
            authorEmail: commit.commit.author?.email ?? null,
            committedAt: new Date(
              commit.commit.author?.date ?? commit.commit.committer?.date ?? new Date().toISOString(),
            ),
            url: commit.html_url,
          })
          .onConflictDoNothing();
      } catch {
        // Skip individual commit insert failures
      }
    }
  } catch {
    // Log but don't throw — this is background work
    console.error(`Failed to import commits for project ${projectId}`);
  }
}
