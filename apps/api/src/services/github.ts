import { Octokit } from 'octokit';
import { execFileSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const CLONE_BASE_PATH = '/tmp/openflow-builds';

export interface RepoInfo {
  name: string;
  fullName: string;
  defaultBranch: string;
  cloneUrl: string;
  private: boolean;
}

export const githubService = {
  getOctokit(accessToken: string): Octokit {
    return new Octokit({ auth: accessToken });
  },

  async listRepos(accessToken: string): Promise<RepoInfo[]> {
    const octokit = this.getOctokit(accessToken);
    const { data } = await octokit.rest.repos.listForAuthenticatedUser({
      sort: 'updated',
      per_page: 50,
    });

    return data.map((repo) => ({
      name: repo.name,
      fullName: repo.full_name,
      defaultBranch: repo.default_branch,
      cloneUrl: repo.clone_url,
      private: repo.private,
    }));
  },

  async cloneRepo(accessToken: string, repoUrl: string, branch: string): Promise<string> {
    const clonePath = path.join(CLONE_BASE_PATH, `${Date.now()}-${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(clonePath, { recursive: true });

    const authenticatedUrl = repoUrl.replace('https://', `https://x-access-token:${accessToken}@`);

    execFileSync('git', ['clone', '--depth', '1', '--branch', branch, authenticatedUrl, clonePath], {
      stdio: 'pipe',
      timeout: 60000,
    });

    return clonePath;
  },

  async createWebhook(
    accessToken: string,
    owner: string,
    repo: string,
    webhookUrl: string,
    branch: string
  ): Promise<string> {
    const octokit = this.getOctokit(accessToken);
    const { data } = await octokit.rest.repos.createWebhook({
      owner,
      repo,
      config: {
        url: webhookUrl,
        content_type: 'json',
        secret: process.env.WEBHOOK_SECRET || 'openflow-webhook',
      },
      events: ['push'],
      active: true,
    });

    return String(data.id);
  },

  async deleteWebhook(accessToken: string, owner: string, repo: string, hookId: string): Promise<void> {
    const octokit = this.getOctokit(accessToken);
    await octokit.rest.repos.deleteWebhook({
      owner,
      repo,
      hook_id: Number(hookId),
    });
  },

  async getLatestCommit(accessToken: string, owner: string, repo: string, branch: string): Promise<string> {
    const octokit = this.getOctokit(accessToken);
    const { data } = await octokit.rest.repos.getCommit({
      owner,
      repo,
      ref: branch,
    });
    return data.sha;
  },

  cleanupClone(clonePath: string): void {
    fs.rmSync(clonePath, { recursive: true, force: true });
  },
};
