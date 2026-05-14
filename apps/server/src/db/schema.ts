import { sqliteTable, text, integer, real, primaryKey } from 'drizzle-orm/sqlite-core';

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  goal: text('goal').notNull(),
  template: text('template'),
  entry: text('entry').notNull().default('/App.tsx'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const files = sqliteTable(
  'files',
  {
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    path: text('path').notNull(),
    content: text('content').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.projectId, t.path] }),
  }),
);

export const progressSteps = sqliteTable('progress_steps', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description').notNull(),
  status: text('status').notNull().default('pending'),
  order: integer('order').notNull(),
});

export const chatMessages = sqliteTable('chat_messages', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  role: text('role').notNull(),
  source: text('source'),
  content: text('content').notNull(),
  createdAt: integer('created_at').notNull(),
});

export const skillsState = sqliteTable(
  'skills_state',
  {
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    skillId: text('skill_id').notNull(),
    level: text('level').notNull().default('unseen'),
    confidence: real('confidence').notNull().default(0),
    lastSeen: integer('last_seen').notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.projectId, t.skillId] }),
  }),
);

export const sideQuests = sqliteTable('side_quests', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  skillId: text('skill_id').notNull(),
  title: text('title').notNull(),
  prompt: text('prompt').notNull(),
  status: text('status').notNull().default('open'),
});
