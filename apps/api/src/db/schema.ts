import { pgTable, text, timestamp, boolean, integer, pgEnum } from 'drizzle-orm/pg-core';

export const planEnum = pgEnum('plan', ['free', 'pro']);
export const projectStatusEnum = pgEnum('project_status', ['building', 'running', 'stopped', 'failed']);
export const dbTypeEnum = pgEnum('db_type', ['postgresql', 'mysql', 'mongodb', 'redis']);

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  githubId: text('github_id').notNull().unique(),
  username: text('username').notNull(),
  email: text('email'),
  avatarUrl: text('avatar_url'),
  accessToken: text('access_token').notNull(),
  plan: planEnum('plan').default('free').notNull(),
  isAdmin: boolean('is_admin').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const projects = pgTable('projects', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  name: text('name').notNull(),
  repoUrl: text('repo_url').notNull(),
  branch: text('branch').default('main').notNull(),
  technology: text('technology').notNull(),
  containerId: text('container_id'),
  status: projectStatusEnum('status').default('stopped').notNull(),
  subdomain: text('subdomain').notNull().unique(),
  customDomain: text('custom_domain'),
  envVars: text('env_vars').default('{}').notNull(), // encrypted JSON
  cpuLimit: integer('cpu_limit'),
  memoryLimit: integer('memory_limit'),
  webhookId: text('webhook_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const databases = pgTable('databases', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  projectId: text('project_id').references(() => projects.id),
  type: dbTypeEnum('type').notNull(),
  containerId: text('container_id'),
  name: text('name').notNull(),
  host: text('host').notNull(),
  port: integer('port').notNull(),
  username: text('db_username').notNull(),
  password: text('db_password').notNull(), // encrypted
  status: projectStatusEnum('status').default('stopped').notNull(),
  diskUsage: integer('disk_usage').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const deployments = pgTable('deployments', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id),
  commitHash: text('commit_hash'),
  status: projectStatusEnum('status').notNull(),
  logs: text('logs').default('').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  finishedAt: timestamp('finished_at'),
});

export const metrics = pgTable('metrics', {
  id: text('id').primaryKey(),
  containerId: text('container_id').notNull(),
  cpuPercent: integer('cpu_percent').notNull(),
  memoryUsage: integer('memory_usage').notNull(),
  memoryLimit: integer('memory_limit').notNull(),
  networkRx: integer('network_rx').notNull(),
  networkTx: integer('network_tx').notNull(),
  recordedAt: timestamp('recorded_at').defaultNow().notNull(),
});
