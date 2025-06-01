import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  boolean,
  integer,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  googleAccessToken: varchar("google_access_token"),
  googleRefreshToken: varchar("google_refresh_token"),
  googleCalendarSyncEnabled: boolean("google_calendar_sync_enabled").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Households table
export const households = pgTable("households", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  inviteCode: varchar("invite_code", { length: 32 }).unique().notNull(),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Household memberships table
export const householdMemberships = pgTable("household_memberships", {
  id: serial("id").primaryKey(),
  householdId: integer("household_id").notNull().references(() => households.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  role: varchar("role", { length: 50 }).notNull().default("member"), // admin, member, viewer
  joinedAt: timestamp("joined_at").defaultNow(),
});

// Events table
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  category: varchar("category", { length: 100 }),
  tags: text("tags").array(), // Keep existing tags column for backward compatibility
  householdId: integer("household_id").notNull().references(() => households.id),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  assignedTo: varchar("assigned_to").references(() => users.id),
  visibility: varchar("visibility", { length: 50 }).notNull().default("household"), // personal, household, public
  googleEventId: varchar("google_event_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Event tags table for permission-based access control
export const eventTags = pgTable("event_tags", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => events.id, { onDelete: 'cascade' }),
  tag: varchar("tag", { length: 100 }).notNull(), // e.g., "metamours", "friends", "family", "work"
  permission: varchar("permission", { length: 20 }).notNull().default("view"), // view, edit, suggest
  createdAt: timestamp("created_at").defaultNow(),
});

// User Google Calendar connections
export const userGoogleCalendars = pgTable("user_google_calendars", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  googleCalendarId: varchar("google_calendar_id").notNull(),
  calendarName: varchar("calendar_name", { length: 255 }),
  syncEnabled: boolean("sync_enabled").default(true),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  webhookId: varchar("webhook_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Event edit suggestions from Google Calendar
export const eventSuggestions = pgTable("event_suggestions", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => events.id),
  suggestedBy: varchar("suggested_by").notNull().references(() => users.id),
  originalData: jsonb("original_data"),
  suggestedData: jsonb("suggested_data"),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, approved, rejected
  googleEventId: varchar("google_event_id"),
  createdAt: timestamp("created_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
});

// Todos table
export const todos = pgTable("todos", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  completed: boolean("completed").notNull().default(false),
  dueDate: timestamp("due_date"),
  priority: varchar("priority", { length: 20 }).default("medium"), // low, medium, high
  tags: text("tags").array(),
  householdId: integer("household_id").references(() => households.id),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  assignedTo: varchar("assigned_to").references(() => users.id),
  visibility: varchar("visibility", { length: 50 }).notNull().default("household"), // personal, household, public
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  createdHouseholds: many(households),
  householdMemberships: many(householdMemberships),
  createdEvents: many(events),
  assignedEvents: many(events),
  createdTodos: many(todos),
  assignedTodos: many(todos),
}));

export const householdsRelations = relations(households, ({ one, many }) => ({
  creator: one(users, {
    fields: [households.createdBy],
    references: [users.id],
  }),
  memberships: many(householdMemberships),
  events: many(events),
  todos: many(todos),
}));

export const householdMembershipsRelations = relations(householdMemberships, ({ one }) => ({
  household: one(households, {
    fields: [householdMemberships.householdId],
    references: [households.id],
  }),
  user: one(users, {
    fields: [householdMemberships.userId],
    references: [users.id],
  }),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  household: one(households, {
    fields: [events.householdId],
    references: [households.id],
  }),
  creator: one(users, {
    fields: [events.createdBy],
    references: [users.id],
  }),
  assignee: one(users, {
    fields: [events.assignedTo],
    references: [users.id],
  }),
  tags: many(eventTags),
  suggestions: many(eventSuggestions),
}));

export const eventTagsRelations = relations(eventTags, ({ one }) => ({
  event: one(events, {
    fields: [eventTags.eventId],
    references: [events.id],
  }),
}));

export const userGoogleCalendarsRelations = relations(userGoogleCalendars, ({ one }) => ({
  user: one(users, {
    fields: [userGoogleCalendars.userId],
    references: [users.id],
  }),
}));

export const eventSuggestionsRelations = relations(eventSuggestions, ({ one }) => ({
  event: one(events, {
    fields: [eventSuggestions.eventId],
    references: [events.id],
  }),
  suggestedBy: one(users, {
    fields: [eventSuggestions.suggestedBy],
    references: [users.id],
  }),
  reviewedBy: one(users, {
    fields: [eventSuggestions.reviewedBy],
    references: [users.id],
  }),
}));

export const todosRelations = relations(todos, ({ one }) => ({
  household: one(households, {
    fields: [todos.householdId],
    references: [households.id],
  }),
  creator: one(users, {
    fields: [todos.createdBy],
    references: [users.id],
  }),
  assignee: one(users, {
    fields: [todos.assignedTo],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertHouseholdSchema = createInsertSchema(households).omit({
  id: true,
  inviteCode: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  startTime: z.string().transform((str) => new Date(str)),
  endTime: z.string().transform((str) => new Date(str)),
});

export const insertTodoSchema = createInsertSchema(todos).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  dueDate: z.string().transform((str) => str ? new Date(str) : null).optional(),
});

export const insertHouseholdMembershipSchema = createInsertSchema(householdMemberships).omit({
  id: true,
  joinedAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertHousehold = z.infer<typeof insertHouseholdSchema>;
export type Household = typeof households.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof events.$inferSelect;
export type InsertTodo = z.infer<typeof insertTodoSchema>;
export type Todo = typeof todos.$inferSelect;
export type InsertHouseholdMembership = z.infer<typeof insertHouseholdMembershipSchema>;
export type HouseholdMembership = typeof householdMemberships.$inferSelect;

// Extended types for API responses
export type HouseholdWithMembers = Household & {
  memberships: (HouseholdMembership & { user: User })[];
  memberCount: number;
};

// New types for enhanced calendar system
export type EventTag = typeof eventTags.$inferSelect;
export type InsertEventTag = typeof eventTags.$inferInsert;
export type UserGoogleCalendar = typeof userGoogleCalendars.$inferSelect;
export type InsertUserGoogleCalendar = typeof userGoogleCalendars.$inferInsert;
export type EventSuggestion = typeof eventSuggestions.$inferSelect;
export type InsertEventSuggestion = typeof eventSuggestions.$inferInsert;

export type EventWithDetails = Event & {
  creator: User;
  assignee?: User;
  household?: Household;
  tags?: EventTag[];
  suggestions?: EventSuggestion[];
};

export type TodoWithDetails = Todo & {
  creator: User;
  assignee?: User;
  household?: Household;
};

// Permission check types
export type UserPermission = "view" | "edit" | "suggest" | "none";
export type EventPermissionContext = {
  userId: string;
  userRole: string;
  eventTags: EventTag[];
  isCreator: boolean;
  isAssignee: boolean;
};
