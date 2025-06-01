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
        for (const tagName of eventTags) {
          await storage.createEventTag({
            eventId: event.id,
            tag: tagName,
          });
        }
      }
      
      // Auto-sync to Google Calendar if user has it connected
      try {
        const user = await storage.getUser(userId);
        if (user?.googleCalendarSyncEnabled && user?.googleAccessToken) {
          const googleEventId = await googleCalendarService.createCalendarEvent(userId, {
            title: event.title,
            description: event.description || '',
            startTime: event.startTime,
            endTime: event.endTime
          });
          
          // Update the event with Google Calendar ID if sync was successful
          if (googleEventId) {
            await storage.updateEvent(event.id, { googleEventId });
          }
        }
      } catch (googleError) {
        console.error("Failed to sync event to Google Calendar:", googleError);
        // Don't fail the whole operation if Google sync fails
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
      
      let events: any[];
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
      
      // Sync changes from Google Calendar and merge events
      try {
        const user = await storage.getUser(userId);
        if (user?.googleCalendarSyncEnabled && user?.googleAccessToken) {
          // First, sync any changes made in Google Calendar back to our database
          await googleCalendarService.syncGoogleCalendarChanges(userId);
          
          // Then fetch updated events from our database (which now includes synced changes)
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
          
          const start = startDate ? new Date(startDate as string) : new Date();
          const end = endDate ? new Date(endDate as string) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
          
          const googleEvents = await googleCalendarService.getCalendarEvents(userId, start, end);
          
          // Convert Google Calendar events to our format
          const convertedGoogleEvents = googleEvents.map(event => ({
            id: `google-${event.id}`,
            title: event.summary || 'Untitled Event',
            description: event.description || '',
            startTime: new Date(event.start?.dateTime || event.start?.date),
            endTime: new Date(event.end?.dateTime || event.end?.date),
            createdAt: null,
            updatedAt: null,
            createdBy: userId,
            householdId: null,
            assignedTo: null,
            visibility: 'public',
            googleEventId: event.id,
            creator: user,
            assignee: undefined,
            household: undefined,
            permissionTags: [],
            source: 'google'
          }));
          
          // Filter out Google events that are already synced to our database
          const filteredGoogleEvents = convertedGoogleEvents.filter(googleEvent => {
            return !events.some(dbEvent => dbEvent.googleEventId === googleEvent.googleEventId);
          });
          
          // Combine database events with unique Google Calendar events
          events = [...events, ...filteredGoogleEvents];
        }
      } catch (googleError) {
        console.error("Error syncing with Google Calendar:", googleError);
        // Continue with just database events if Google Calendar fails
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
      const { eventTags, ...updates } = req.body;
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
      
      // Update event tags if provided
      if (eventTags !== undefined) {
        // Delete existing tags
        await storage.deleteEventTags(eventId);
        
        // Create new tags
        if (Array.isArray(eventTags) && eventTags.length > 0) {
          for (const tagName of eventTags) {
            await storage.createEventTag({
              eventId: eventId,
              tag: tagName,
            });
          }
        }
      }
      
      const eventWithDetails = await storage.getEvent(event.id);
      
      // Sync to Google Calendar if user has it connected
      try {
        const user = await storage.getUser(userId);
        if (user?.googleCalendarSyncEnabled && user?.googleAccessToken) {
          // Use the fresh event data from the database
          const updatedEvent = eventWithDetails || event;
          
          if (originalEvent.googleEventId) {
            // Update existing Google Calendar event
            const success = await googleCalendarService.updateCalendarEvent(userId, originalEvent.googleEventId, {
              title: updatedEvent.title,
              description: updatedEvent.description || '',
              startTime: updatedEvent.startTime,
              endTime: updatedEvent.endTime
            });
            
            if (!success) {
              console.error("Failed to update Google Calendar event, but continuing...");
            }
          } else {
            // Create new Google Calendar event if it doesn't exist yet
            const googleEventId = await googleCalendarService.createCalendarEvent(userId, {
              title: updatedEvent.title,
              description: updatedEvent.description || '',
              startTime: updatedEvent.startTime,
              endTime: updatedEvent.endTime
            });
            
            // Update the event with Google Calendar ID if sync was successful
            if (googleEventId) {
              await storage.updateEvent(event.id, { googleEventId });
              // Refresh the event data to include the Google ID
              const finalEvent = await storage.getEvent(event.id);
              if (finalEvent) {
                Object.assign(eventWithDetails, finalEvent);
              }
            }
          }
        }
      } catch (googleError) {
        console.error("Failed to sync event to Google Calendar:", googleError);
        // Don't fail the whole operation if Google sync fails
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
      const { todoTags, ...todoData } = req.body;
      
      const validatedData = insertTodoSchema.parse({
        ...todoData,
        createdBy: userId,
        assignedTo: todoData.assignedTo || null,
      });
      
      const todo = await storage.createTodo(validatedData);
      
      // Create todo tags if provided
      if (todoTags && Array.isArray(todoTags) && todoTags.length > 0) {
        for (const tagName of todoTags) {
          await storage.createTodoTag({
            todoId: todo.id,
            tag: tagName,
          });
        }
      }
      
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
      const { todoTags, ...updates } = req.body;
      
      const todo = await storage.updateTodo(todoId, updates);
      
      // Update todo tags if provided
      if (todoTags !== undefined) {
        // Delete existing tags
        await storage.deleteTodoTags(todoId);
        
        // Create new tags
        if (Array.isArray(todoTags) && todoTags.length > 0) {
          for (const tagName of todoTags) {
            await storage.createTodoTag({
              todoId: todoId,
              tag: tagName,
            });
          }
        }
      }
      
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

  app.post('/api/google/sync', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await googleCalendarService.syncGoogleCalendarChanges(userId);
      res.json({ message: "Google Calendar sync completed successfully" });
    } catch (error) {
      console.error("Error syncing Google Calendar:", error);
      res.status(500).json({ message: "Failed to sync Google Calendar" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
