import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { googleCalendarService } from "./googleCalendar";
import { 
  insertHouseholdSchema, 
  insertEventSchema, 
  insertTodoSchema,
  insertHouseholdMembershipSchema 
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Household routes
  app.post('/api/households', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertHouseholdSchema.parse({
        ...req.body,
        createdBy: userId,
      });
      
      const household = await storage.createHousehold(validatedData);
      const householdWithMembers = await storage.getHousehold(household.id);
      
      res.json(householdWithMembers);
    } catch (error) {
      console.error("Error creating household:", error);
      res.status(400).json({ message: "Failed to create household" });
    }
  });

  app.get('/api/households', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const households = await storage.getUserHouseholds(userId);
      res.json(households);
    } catch (error) {
      console.error("Error fetching households:", error);
      res.status(500).json({ message: "Failed to fetch households" });
    }
  });

  app.get('/api/households/:id', isAuthenticated, async (req: any, res) => {
    try {
      const householdId = parseInt(req.params.id);
      const household = await storage.getHousehold(householdId);
      
      if (!household) {
        return res.status(404).json({ message: "Household not found" });
      }
      
      res.json(household);
    } catch (error) {
      console.error("Error fetching household:", error);
      res.status(500).json({ message: "Failed to fetch household" });
    }
  });

  app.post('/api/households/join', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { inviteCode } = req.body;
      
      const household = await storage.getHouseholdByInviteCode(inviteCode);
      if (!household) {
        return res.status(404).json({ message: "Invalid invite code" });
      }
      
      const membership = await storage.joinHousehold({
        householdId: household.id,
        userId,
        role: "member",
      });
      
      res.json(membership);
    } catch (error) {
      console.error("Error joining household:", error);
      res.status(400).json({ message: "Failed to join household" });
    }
  });

  // Event routes
  app.post('/api/events', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { eventTags, ...eventData } = req.body;
      
      const validatedData = insertEventSchema.parse({
        ...eventData,
        createdBy: userId,
      });
      
      const event = await storage.createEvent(validatedData);
      
      // Create event tags if provided
      if (eventTags && Array.isArray(eventTags) && eventTags.length > 0) {
        for (const tag of eventTags) {
          await storage.createEventTag({
            eventId: event.id,
            tag: tag.tag,
          });
        }
      }
      
      const eventWithDetails = await storage.getEvent(event.id);
      
      res.json(eventWithDetails);
    } catch (error) {
      console.error("Error creating event:", error);
      res.status(400).json({ message: "Failed to create event" });
    }
  });

  app.get('/api/events', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { householdId, startDate, endDate } = req.query;
      
      let events;
      if (householdId) {
        events = await storage.getHouseholdEvents(
          parseInt(householdId as string),
          startDate ? new Date(startDate as string) : undefined,
          endDate ? new Date(endDate as string) : undefined
        );
      } else {
        events = await storage.getUserEvents(
          userId,
          startDate ? new Date(startDate as string) : undefined,
          endDate ? new Date(endDate as string) : undefined
        );
      }
      
      res.json(events);
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  app.get('/api/events/:id', isAuthenticated, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const event = await storage.getEvent(eventId);
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      res.json(event);
    } catch (error) {
      console.error("Error fetching event:", error);
      res.status(500).json({ message: "Failed to fetch event" });
    }
  });

  app.patch('/api/events/:id', isAuthenticated, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const updates = req.body;
      const userId = req.user.claims.sub;
      
      // Get the original event to check if it has a Google event ID
      const originalEvent = await storage.getEvent(eventId);
      if (!originalEvent) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // Process date fields to ensure they're proper Date objects
      const processedUpdates = {
        ...updates,
        ...(updates.startTime && { startTime: new Date(updates.startTime) }),
        ...(updates.endTime && { endTime: new Date(updates.endTime) }),
      };
      
      // Update the event in our database
      const event = await storage.updateEvent(eventId, processedUpdates);
      const eventWithDetails = await storage.getEvent(event.id);
      
      // If this event was originally synced from Google Calendar, update it there too
      if (originalEvent.googleEventId) {
        try {
          const googleEvent = {
            summary: updates.title || originalEvent.title,
            description: updates.description || originalEvent.description || '',
            start: {
              dateTime: (updates.startTime || originalEvent.startTime).toISOString(),
              timeZone: 'America/Los_Angeles'
            },
            end: {
              dateTime: (updates.endTime || originalEvent.endTime).toISOString(),
              timeZone: 'America/Los_Angeles'
            }
          };
          
          await googleCalendarService.updateCalendarEvent(userId, originalEvent.googleEventId, googleEvent);
        } catch (googleError) {
          console.error("Failed to update Google Calendar event:", googleError);
          // Don't fail the whole operation if Google sync fails
        }
      }
      
      res.json(eventWithDetails);
    } catch (error) {
      console.error("Error updating event:", error);
      res.status(400).json({ message: "Failed to update event" });
    }
  });

  app.delete('/api/events/:id', isAuthenticated, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      // Get the event to check if it has a Google event ID before deleting
      const event = await storage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // Delete from our database first
      await storage.deleteEvent(eventId);
      
      // If this event was synced from Google Calendar, delete it there too
      if (event.googleEventId) {
        try {
          await googleCalendarService.deleteCalendarEvent(userId, event.googleEventId);
        } catch (googleError) {
          console.error("Failed to delete Google Calendar event:", googleError);
          // Don't fail the whole operation if Google sync fails
        }
      }
      
      res.json({ message: "Event deleted successfully" });
    } catch (error) {
      console.error("Error deleting event:", error);
      res.status(500).json({ message: "Failed to delete event" });
    }
  });

  // Todo routes
  app.post('/api/todos', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const todoData = {
        ...req.body,
        createdBy: userId,
        assignedTo: req.body.assignedTo || null,
      };
      
      const validatedData = insertTodoSchema.parse(todoData);
      const todo = await storage.createTodo(validatedData);
      const todoWithDetails = await storage.getTodo(todo.id);
      
      res.json(todoWithDetails);
    } catch (error) {
      console.error("Error creating todo:", error);
      res.status(400).json({ message: "Failed to create todo" });
    }
  });

  app.get('/api/todos', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { householdId } = req.query;
      
      let todos;
      if (householdId) {
        todos = await storage.getHouseholdTodos(parseInt(householdId as string));
      } else {
        todos = await storage.getUserTodos(userId);
      }
      
      res.json(todos);
    } catch (error) {
      console.error("Error fetching todos:", error);
      res.status(500).json({ message: "Failed to fetch todos" });
    }
  });

  app.get('/api/todos/:id', isAuthenticated, async (req: any, res) => {
    try {
      const todoId = parseInt(req.params.id);
      const todo = await storage.getTodo(todoId);
      
      if (!todo) {
        return res.status(404).json({ message: "Todo not found" });
      }
      
      res.json(todo);
    } catch (error) {
      console.error("Error fetching todo:", error);
      res.status(500).json({ message: "Failed to fetch todo" });
    }
  });

  app.patch('/api/todos/:id', isAuthenticated, async (req: any, res) => {
    try {
      const todoId = parseInt(req.params.id);
      const updates = req.body;
      
      const todo = await storage.updateTodo(todoId, updates);
      const todoWithDetails = await storage.getTodo(todo.id);
      
      res.json(todoWithDetails);
    } catch (error) {
      console.error("Error updating todo:", error);
      res.status(400).json({ message: "Failed to update todo" });
    }
  });

  app.patch('/api/todos/:id/toggle', isAuthenticated, async (req: any, res) => {
    try {
      const todoId = parseInt(req.params.id);
      const todo = await storage.toggleTodoCompleted(todoId);
      const todoWithDetails = await storage.getTodo(todo.id);
      
      res.json(todoWithDetails);
    } catch (error) {
      console.error("Error toggling todo:", error);
      res.status(400).json({ message: "Failed to toggle todo" });
    }
  });

  app.delete('/api/todos/:id', isAuthenticated, async (req: any, res) => {
    try {
      const todoId = parseInt(req.params.id);
      await storage.deleteTodo(todoId);
      res.json({ message: "Todo deleted successfully" });
    } catch (error) {
      console.error("Error deleting todo:", error);
      res.status(500).json({ message: "Failed to delete todo" });
    }
  });

  // Google Calendar integration routes
  app.get('/api/google/auth', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const authUrl = await googleCalendarService.getAuthUrl(userId);
      res.json({ authUrl });
    } catch (error) {
      console.error("Error generating Google auth URL:", error);
      res.status(500).json({ message: "Failed to generate auth URL" });
    }
  });

  app.get('/api/google/callback', async (req, res) => {
    try {
      const { code, state: userId } = req.query;
      if (!code || !userId) {
        return res.status(400).json({ message: "Missing code or user ID" });
      }
      
      await googleCalendarService.exchangeCodeForTokens(code as string, userId as string);
      res.redirect('/?google_calendar_connected=true');
    } catch (error) {
      console.error("Error handling Google callback:", error);
      res.redirect('/?google_calendar_error=true');
    }
  });

  app.post('/api/google/disconnect', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.updateUserGoogleTokens(userId, {
        accessToken: null,
        refreshToken: null,
        syncEnabled: false
      });
      res.json({ message: "Google Calendar disconnected successfully" });
    } catch (error) {
      console.error("Error disconnecting Google Calendar:", error);
      res.status(500).json({ message: "Failed to disconnect Google Calendar" });
    }
  });

  app.get('/api/google/events', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { startDate, endDate } = req.query;
      
      const start = startDate ? new Date(startDate as string) : new Date();
      const end = endDate ? new Date(endDate as string) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      
      const events = await googleCalendarService.getCalendarEvents(userId, start, end);
      res.json(events);
    } catch (error) {
      console.error("Error fetching Google Calendar events:", error);
      res.status(500).json({ message: "Failed to fetch Google Calendar events" });
    }
  });

  app.get('/api/google/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json({
        connected: !!(user?.googleAccessToken && user?.googleRefreshToken),
        syncEnabled: user?.googleCalendarSyncEnabled || false
      });
    } catch (error) {
      console.error("Error checking Google Calendar status:", error);
      res.status(500).json({ message: "Failed to check Google Calendar status" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
