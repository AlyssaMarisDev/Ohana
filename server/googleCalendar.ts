import { google } from 'googleapis';
import { storage } from './storage';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.REPLIT_DOMAINS?.split(',')[0] ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : 'http://localhost:5000'}/api/google/callback`
);

export class GoogleCalendarService {
  async getAuthUrl(userId: string): Promise<string> {
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ];

    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: userId,
      prompt: 'consent'
    });
  }

  async exchangeCodeForTokens(code: string, userId: string): Promise<void> {
    const { tokens } = await oauth2Client.getToken(code);
    
    await storage.updateUserGoogleTokens(userId, {
      accessToken: tokens.access_token || null,
      refreshToken: tokens.refresh_token || null,
      syncEnabled: true
    });
  }

  async refreshTokenIfNeeded(userId: string): Promise<boolean> {
    const user = await storage.getUser(userId);
    if (!user?.googleAccessToken || !user?.googleRefreshToken) {
      return false;
    }

    oauth2Client.setCredentials({
      access_token: user.googleAccessToken,
      refresh_token: user.googleRefreshToken
    });

    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      if (credentials.access_token) {
        await storage.updateUserGoogleTokens(userId, {
          accessToken: credentials.access_token,
          refreshToken: credentials.refresh_token || user.googleRefreshToken,
          syncEnabled: user.googleCalendarSyncEnabled
        });
      }
      return true;
    } catch (error) {
      console.error('Error refreshing Google token:', error);
      return false;
    }
  }

  async getCalendarEvents(userId: string, startDate: Date, endDate: Date): Promise<any[]> {
    const user = await storage.getUser(userId);
    if (!user?.googleAccessToken || !user?.googleCalendarSyncEnabled) {
      return [];
    }

    const tokenValid = await this.refreshTokenIfNeeded(userId);
    if (!tokenValid) {
      return [];
    }

    oauth2Client.setCredentials({
      access_token: user.googleAccessToken,
      refresh_token: user.googleRefreshToken
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    try {
      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        singleEvents: true,
        orderBy: 'startTime'
      });

      return response.data.items || [];
    } catch (error) {
      console.error('Error fetching Google Calendar events:', error);
      return [];
    }
  }

  async createCalendarEvent(userId: string, event: any): Promise<string | null> {
    const user = await storage.getUser(userId);
    if (!user?.googleAccessToken || !user?.googleCalendarSyncEnabled) {
      return null;
    }

    const tokenValid = await this.refreshTokenIfNeeded(userId);
    if (!tokenValid) {
      return null;
    }

    oauth2Client.setCredentials({
      access_token: user.googleAccessToken,
      refresh_token: user.googleRefreshToken
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    try {
      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: {
          summary: event.title,
          description: event.description,
          start: {
            dateTime: event.startTime.toISOString(),
            timeZone: 'UTC'
          },
          end: {
            dateTime: event.endTime.toISOString(),
            timeZone: 'UTC'
          }
        }
      });

      return response.data.id || null;
    } catch (error) {
      console.error('Error creating Google Calendar event:', error);
      return null;
    }
  }

  async updateCalendarEvent(userId: string, googleEventId: string, event: any): Promise<boolean> {
    const user = await storage.getUser(userId);
    if (!user?.googleAccessToken || !user?.googleCalendarSyncEnabled) {
      return false;
    }

    const tokenValid = await this.refreshTokenIfNeeded(userId);
    if (!tokenValid) {
      return false;
    }

    oauth2Client.setCredentials({
      access_token: user.googleAccessToken,
      refresh_token: user.googleRefreshToken
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    try {
      await calendar.events.update({
        calendarId: 'primary',
        eventId: googleEventId,
        requestBody: {
          summary: event.title,
          description: event.description,
          start: {
            dateTime: event.startTime.toISOString(),
            timeZone: 'UTC'
          },
          end: {
            dateTime: event.endTime.toISOString(),
            timeZone: 'UTC'
          }
        }
      });

      return true;
    } catch (error) {
      console.error('Error updating Google Calendar event:', error);
      return false;
    }
  }

  async deleteCalendarEvent(userId: string, googleEventId: string): Promise<boolean> {
    const user = await storage.getUser(userId);
    if (!user?.googleAccessToken || !user?.googleCalendarSyncEnabled) {
      return false;
    }

    const tokenValid = await this.refreshTokenIfNeeded(userId);
    if (!tokenValid) {
      return false;
    }

    oauth2Client.setCredentials({
      access_token: user.googleAccessToken,
      refresh_token: user.googleRefreshToken
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    try {
      await calendar.events.delete({
        calendarId: 'primary',
        eventId: googleEventId
      });

      return true;
    } catch (error) {
      console.error('Error deleting Google Calendar event:', error);
      return false;
    }
  }

  async setupPushNotifications(userId: string): Promise<string | null> {
    const user = await storage.getUser(userId);
    if (!user?.googleAccessToken || !user?.googleCalendarSyncEnabled) {
      return null;
    }

    const tokenValid = await this.refreshTokenIfNeeded(userId);
    if (!tokenValid) {
      return null;
    }

    oauth2Client.setCredentials({
      access_token: user.googleAccessToken,
      refresh_token: user.googleRefreshToken
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    try {
      // Create a unique channel ID for this user
      const channelId = `familysync-${userId}-${Date.now()}`;
      const webhookUrl = `${process.env.REPLIT_DOMAINS?.split(',')[0] ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : 'http://localhost:5000'}/api/google/webhook`;

      const response = await calendar.events.watch({
        calendarId: 'primary',
        requestBody: {
          id: channelId,
          type: 'web_hook',
          address: webhookUrl,
          token: userId, // Use userId as verification token
        }
      });

      return response.data.id || null;
    } catch (error) {
      console.error('Error setting up Google Calendar push notifications:', error);
      return null;
    }
  }

  async syncGoogleCalendarChanges(userId: string): Promise<void> {
    const user = await storage.getUser(userId);
    if (!user?.googleAccessToken || !user?.googleCalendarSyncEnabled) {
      return;
    }

    const tokenValid = await this.refreshTokenIfNeeded(userId);
    if (!tokenValid) {
      return;
    }

    oauth2Client.setCredentials({
      access_token: user.googleAccessToken,
      refresh_token: user.googleRefreshToken
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    try {
      // Get events from last 7 days to 30 days in the future
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        singleEvents: true,
        orderBy: 'startTime'
      });

      const googleEvents = response.data.items || [];

      // Get all user events that have Google Calendar IDs
      const userEvents = await storage.getUserEvents(userId);
      const syncedEvents = userEvents.filter(event => event.googleEventId);

      for (const googleEvent of googleEvents) {
        // Find corresponding event in our database
        const dbEvent = syncedEvents.find(event => event.googleEventId === googleEvent.id);

        if (dbEvent) {
          // Check if the event was updated in Google Calendar
          const googleUpdated = new Date(googleEvent.updated || googleEvent.created || 0);
          const dbUpdated = new Date(dbEvent.updatedAt || dbEvent.createdAt || 0);

          if (googleUpdated > dbUpdated) {
            // Update the database event with changes from Google Calendar
            await storage.updateEvent(dbEvent.id, {
              title: googleEvent.summary || dbEvent.title,
              description: googleEvent.description || '',
              startTime: new Date(googleEvent.start?.dateTime || googleEvent.start?.date || dbEvent.startTime),
              endTime: new Date(googleEvent.end?.dateTime || googleEvent.end?.date || dbEvent.endTime),
            });
          }
        }
      }

      // Check for deleted events - if an event exists in our DB but not in Google Calendar
      for (const dbEvent of syncedEvents) {
        const googleEvent = googleEvents.find(ge => ge.id === dbEvent.googleEventId);
        if (!googleEvent) {
          // Event was deleted in Google Calendar, delete from our database
          await storage.deleteEvent(dbEvent.id);
        }
      }

    } catch (error) {
      console.error('Error syncing Google Calendar changes:', error);
    }
  }
}

export const googleCalendarService = new GoogleCalendarService();