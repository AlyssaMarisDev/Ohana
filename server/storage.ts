import {
  users,
  households,
  householdMemberships,
  events,
  todos,
  eventTags,
  todoTags,
  userTagPermissions,
  userEventPermissions,
  type User,
  type UpsertUser,
  type Household,
  type InsertHousehold,
  type HouseholdWithMembers,
  type Event,
  type InsertEvent,
  type EventWithDetails,
  type Todo,
  type InsertTodo,
  type TodoWithDetails,
  type TodoTag,
  type InsertTodoTag,
  type HouseholdMembership,
  type InsertHouseholdMembership,
  type EventTag,
  type InsertEventTag,
  type UserTagPermission,
  type InsertUserTagPermission,
  type UserEventPermission,
  type InsertUserEventPermission,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, asc, gte, lte } from "drizzle-orm";
import { nanoid } from "nanoid";

// Interface for storage operations
export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserGoogleTokens(userId: string, tokens: { accessToken: string | null; refreshToken: string | null; syncEnabled: boolean }): Promise<void>;
  
  // Household operations
  createHousehold(household: InsertHousehold): Promise<Household>;
  getHousehold(id: number): Promise<HouseholdWithMembers | undefined>;
  getUserHouseholds(userId: string): Promise<HouseholdWithMembers[]>;
  getHouseholdByInviteCode(inviteCode: string): Promise<Household | undefined>;
  joinHousehold(membership: InsertHouseholdMembership): Promise<HouseholdMembership>;
  updateHouseholdMemberRole(householdId: number, userId: string, role: string): Promise<void>;
  
  // Event operations
  createEvent(event: InsertEvent): Promise<Event>;
  getEvent(id: number): Promise<EventWithDetails | undefined>;
  getHouseholdEvents(householdId: number, startDate?: Date, endDate?: Date): Promise<EventWithDetails[]>;
  getUserEvents(userId: string, startDate?: Date, endDate?: Date): Promise<EventWithDetails[]>;
  updateEvent(id: number, event: Partial<InsertEvent>): Promise<Event>;
  deleteEvent(id: number): Promise<void>;
  
  // Event tag operations
  createEventTag(eventTag: InsertEventTag): Promise<EventTag>;
  getEventTags(eventId: number): Promise<EventTag[]>;
  deleteEventTags(eventId: number): Promise<void>;
  
  // Todo tag operations
  createTodoTag(todoTag: InsertTodoTag): Promise<TodoTag>;
  getTodoTags(todoId: number): Promise<TodoTag[]>;
  deleteTodoTags(todoId: number): Promise<void>;
  
  // User permission operations
  getUserTagPermissions(userId: string): Promise<UserTagPermission[]>;
  setUserTagPermission(permission: InsertUserTagPermission): Promise<UserTagPermission>;
  getUserEventPermission(userId: string, householdId: number): Promise<UserEventPermission | undefined>;
  setUserEventPermission(permission: InsertUserEventPermission): Promise<UserEventPermission>;
  
  // Todo operations
  createTodo(todo: InsertTodo): Promise<Todo>;
  getTodo(id: number): Promise<TodoWithDetails | undefined>;
  getHouseholdTodos(householdId: number): Promise<TodoWithDetails[]>;
  getUserTodos(userId: string): Promise<TodoWithDetails[]>;
  updateTodo(id: number, todo: Partial<InsertTodo>): Promise<Todo>;
  deleteTodo(id: number): Promise<void>;
  toggleTodoCompleted(id: number): Promise<Todo>;
}

export class DatabaseStorage implements IStorage {
  // User operations (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    
    // Create personal household if it doesn't exist
    const existingPersonalHousehold = await db
      .select()
      .from(households)
      .where(and(
        eq(households.createdBy, user.id),
        eq(households.name, "Personal")
      ));
    
    if (existingPersonalHousehold.length === 0) {
      await this.createHousehold({
        name: "Personal",
        description: "Your personal household",
        createdBy: user.id,
      });
    }
    
    return user;
  }

  // Household operations
  async createHousehold(householdData: InsertHousehold): Promise<Household> {
    const inviteCode = nanoid(8);
    const [household] = await db
      .insert(households)
      .values({
        ...householdData,
        inviteCode,
      })
      .returning();
    
    // Add creator as admin
    await db.insert(householdMemberships).values({
      householdId: household.id,
      userId: household.createdBy,
      role: "admin",
    });
    
    return household;
  }

  async getHousehold(id: number): Promise<HouseholdWithMembers | undefined> {
    const [household] = await db.select().from(households).where(eq(households.id, id));
    if (!household) return undefined;

    const memberships = await db
      .select()
      .from(householdMemberships)
      .leftJoin(users, eq(householdMemberships.userId, users.id))
      .where(eq(householdMemberships.householdId, id));

    return {
      ...household,
      memberships: memberships.map(m => ({
        ...m.household_memberships,
        user: m.users!,
      })),
      memberCount: memberships.length,
    };
  }

  async getUserHouseholds(userId: string): Promise<HouseholdWithMembers[]> {
    const userMemberships = await db
      .select()
      .from(householdMemberships)
      .leftJoin(households, eq(householdMemberships.householdId, households.id))
      .where(eq(householdMemberships.userId, userId));

    const householdData = await Promise.all(
      userMemberships.map(async (membership) => {
        const household = membership.households!;
        const allMemberships = await db
          .select()
          .from(householdMemberships)
          .leftJoin(users, eq(householdMemberships.userId, users.id))
          .where(eq(householdMemberships.householdId, household.id));

        return {
          ...household,
          memberships: allMemberships.map(m => ({
            ...m.household_memberships,
            user: m.users!,
          })),
          memberCount: allMemberships.length,
        };
      })
    );

    return householdData;
  }

  async getHouseholdByInviteCode(inviteCode: string): Promise<Household | undefined> {
    const [household] = await db
      .select()
      .from(households)
      .where(eq(households.inviteCode, inviteCode));
    return household;
  }

  async joinHousehold(membership: InsertHouseholdMembership): Promise<HouseholdMembership> {
    const [result] = await db
      .insert(householdMemberships)
      .values(membership)
      .returning();
    return result;
  }

  async updateHouseholdMemberRole(householdId: number, userId: string, role: string): Promise<void> {
    await db
      .update(householdMemberships)
      .set({ role })
      .where(
        and(
          eq(householdMemberships.householdId, householdId),
          eq(householdMemberships.userId, userId)
        )
      );
  }

  // Event operations
  async createEvent(eventData: InsertEvent): Promise<Event> {
    const [event] = await db.insert(events).values(eventData).returning();
    return event;
  }

  async getEvent(id: number): Promise<EventWithDetails | undefined> {
    const [result] = await db
      .select()
      .from(events)
      .leftJoin(users, eq(events.createdBy, users.id))
      .leftJoin(households, eq(events.householdId, households.id))
      .where(eq(events.id, id));

    if (!result) return undefined;

    let assignee: User | undefined;
    if (result.events.assignedTo) {
      const [assigneeData] = await db
        .select()
        .from(users)
        .where(eq(users.id, result.events.assignedTo));
      assignee = assigneeData;
    }

    // Get event tags
    const tags = await this.getEventTags(id);

    return {
      ...result.events,
      creator: result.users!,
      assignee,
      household: result.households || undefined,
      permissionTags: tags,
    };
  }

  async getHouseholdEvents(householdId: number, startDate?: Date, endDate?: Date): Promise<EventWithDetails[]> {
    const conditions = [eq(events.householdId, householdId)];
    
    if (startDate) {
      conditions.push(gte(events.startTime, startDate));
    }
    if (endDate) {
      conditions.push(lte(events.startTime, endDate));
    }

    const results = await db
      .select()
      .from(events)
      .leftJoin(users, eq(events.createdBy, users.id))
      .leftJoin(households, eq(events.householdId, households.id))
      .where(and(...conditions))
      .orderBy(asc(events.startTime));

    return Promise.all(results.map(async (result) => {
      let assignee: User | undefined;
      if (result.events.assignedTo) {
        const [assigneeData] = await db
          .select()
          .from(users)
          .where(eq(users.id, result.events.assignedTo));
        assignee = assigneeData;
      }

      // Get permission tags for this event
      const permissionTags = await this.getEventTags(result.events.id);

      return {
        ...result.events,
        creator: result.users!,
        assignee,
        household: result.households || undefined,
        permissionTags,
      };
    }));
  }

  async getUserEvents(userId: string, startDate?: Date, endDate?: Date): Promise<EventWithDetails[]> {
    const conditions = [
      or(
        eq(events.createdBy, userId),
        eq(events.assignedTo, userId)
      )
    ];
    
    if (startDate) {
      conditions.push(gte(events.startTime, startDate));
    }
    if (endDate) {
      conditions.push(lte(events.startTime, endDate));
    }

    const results = await db
      .select()
      .from(events)
      .leftJoin(users, eq(events.createdBy, users.id))
      .leftJoin(households, eq(events.householdId, households.id))
      .where(and(...conditions))
      .orderBy(asc(events.startTime));

    return Promise.all(results.map(async (result) => {
      let assignee: User | undefined;
      if (result.events.assignedTo) {
        const [assigneeData] = await db
          .select()
          .from(users)
          .where(eq(users.id, result.events.assignedTo));
        assignee = assigneeData;
      }

      // Get permission tags for this event
      const permissionTags = await this.getEventTags(result.events.id);

      return {
        ...result.events,
        creator: result.users!,
        assignee,
        household: result.households || undefined,
        permissionTags,
      };
    }));
  }

  async updateEvent(id: number, eventData: Partial<InsertEvent>): Promise<Event> {
    const [event] = await db
      .update(events)
      .set({ ...eventData, updatedAt: new Date() })
      .where(eq(events.id, id))
      .returning();
    return event;
  }

  async deleteEvent(id: number): Promise<void> {
    await db.delete(events).where(eq(events.id, id));
  }

  // Todo operations
  async createTodo(todoData: InsertTodo): Promise<Todo> {
    const [todo] = await db.insert(todos).values(todoData).returning();
    return todo;
  }

  async getTodo(id: number): Promise<TodoWithDetails | undefined> {
    const [result] = await db
      .select()
      .from(todos)
      .leftJoin(users, eq(todos.createdBy, users.id))
      .leftJoin(households, eq(todos.householdId, households.id))
      .where(eq(todos.id, id));

    if (!result) return undefined;

    let assignee: User | undefined;
    if (result.todos.assignedTo) {
      const [assigneeData] = await db
        .select()
        .from(users)
        .where(eq(users.id, result.todos.assignedTo));
      assignee = assigneeData;
    }

    // Get todo tags
    const tags = await this.getTodoTags(result.todos.id);

    return {
      ...result.todos,
      creator: result.users!,
      assignee,
      household: result.households || undefined,
      tags,
    };
  }

  async getHouseholdTodos(householdId: number): Promise<TodoWithDetails[]> {
    const results = await db
      .select()
      .from(todos)
      .leftJoin(users, eq(todos.createdBy, users.id))
      .leftJoin(households, eq(todos.householdId, households.id))
      .where(eq(todos.householdId, householdId))
      .orderBy(desc(todos.createdAt));

    return Promise.all(results.map(async (result) => {
      let assignee: User | undefined;
      if (result.todos.assignedTo) {
        const [assigneeData] = await db
          .select()
          .from(users)
          .where(eq(users.id, result.todos.assignedTo));
        assignee = assigneeData;
      }

      // Get todo tags
      const tags = await this.getTodoTags(result.todos.id);

      return {
        ...result.todos,
        creator: result.users!,
        assignee,
        household: result.households || undefined,
        tags,
      };
    }));
  }

  async getUserTodos(userId: string): Promise<TodoWithDetails[]> {
    const results = await db
      .select()
      .from(todos)
      .leftJoin(users, eq(todos.createdBy, users.id))
      .leftJoin(households, eq(todos.householdId, households.id))
      .where(
        or(
          eq(todos.createdBy, userId),
          eq(todos.assignedTo, userId)
        )
      )
      .orderBy(desc(todos.createdAt));

    return Promise.all(results.map(async (result) => {
      let assignee: User | undefined;
      if (result.todos.assignedTo) {
        const [assigneeData] = await db
          .select()
          .from(users)
          .where(eq(users.id, result.todos.assignedTo));
        assignee = assigneeData;
      }

      // Get todo tags
      const tags = await this.getTodoTags(result.todos.id);

      return {
        ...result.todos,
        creator: result.users!,
        assignee,
        household: result.households || undefined,
        tags,
      };
    }));
  }

  async updateTodo(id: number, todoData: Partial<InsertTodo>): Promise<Todo> {
    const [todo] = await db
      .update(todos)
      .set({ ...todoData, updatedAt: new Date() })
      .where(eq(todos.id, id))
      .returning();
    return todo;
  }

  async deleteTodo(id: number): Promise<void> {
    await db.delete(todos).where(eq(todos.id, id));
  }

  async toggleTodoCompleted(id: number): Promise<Todo> {
    const [currentTodo] = await db.select().from(todos).where(eq(todos.id, id));
    const [updatedTodo] = await db
      .update(todos)
      .set({ 
        completed: !currentTodo.completed,
        updatedAt: new Date() 
      })
      .where(eq(todos.id, id))
      .returning();
    return updatedTodo;
  }

  async updateUserGoogleTokens(userId: string, tokens: { accessToken: string | null; refreshToken: string | null; syncEnabled: boolean }): Promise<void> {
    await db
      .update(users)
      .set({
        googleAccessToken: tokens.accessToken,
        googleRefreshToken: tokens.refreshToken,
        googleCalendarSyncEnabled: tokens.syncEnabled,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  // Event tag operations
  async createEventTag(eventTagData: InsertEventTag): Promise<EventTag> {
    const [eventTag] = await db.insert(eventTags).values(eventTagData).returning();
    return eventTag;
  }

  async getEventTags(eventId: number): Promise<EventTag[]> {
    return await db
      .select()
      .from(eventTags)
      .where(eq(eventTags.eventId, eventId));
  }

  async deleteEventTags(eventId: number): Promise<void> {
    await db.delete(eventTags).where(eq(eventTags.eventId, eventId));
  }

  // Todo tag operations
  async createTodoTag(todoTagData: InsertTodoTag): Promise<TodoTag> {
    const [todoTag] = await db.insert(todoTags).values(todoTagData).returning();
    return todoTag;
  }

  async getTodoTags(todoId: number): Promise<TodoTag[]> {
    return await db
      .select()
      .from(todoTags)
      .where(eq(todoTags.todoId, todoId));
  }

  async deleteTodoTags(todoId: number): Promise<void> {
    await db.delete(todoTags).where(eq(todoTags.todoId, todoId));
  }

  // User permission operations
  async getUserTagPermissions(userId: string): Promise<UserTagPermission[]> {
    return await db
      .select()
      .from(userTagPermissions)
      .where(eq(userTagPermissions.userId, userId));
  }

  async setUserTagPermission(permissionData: InsertUserTagPermission): Promise<UserTagPermission> {
    const [permission] = await db
      .insert(userTagPermissions)
      .values(permissionData)
      .onConflictDoUpdate({
        target: [userTagPermissions.userId, userTagPermissions.tag],
        set: {
          canView: permissionData.canView,
        },
      })
      .returning();
    return permission;
  }

  async getUserEventPermission(userId: string, householdId: number): Promise<UserEventPermission | undefined> {
    const [permission] = await db
      .select()
      .from(userEventPermissions)
      .where(
        and(
          eq(userEventPermissions.userId, userId),
          eq(userEventPermissions.householdId, householdId)
        )
      );
    return permission;
  }

  async setUserEventPermission(permissionData: InsertUserEventPermission): Promise<UserEventPermission> {
    const [permission] = await db
      .insert(userEventPermissions)
      .values(permissionData)
      .onConflictDoUpdate({
        target: [userEventPermissions.userId, userEventPermissions.householdId],
        set: {
          permission: permissionData.permission,
        },
      })
      .returning();
    return permission;
  }
}

export const storage = new DatabaseStorage();
