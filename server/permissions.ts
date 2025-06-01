import { EventTag, EventPermissionContext, UserPermission } from "@shared/schema";

/**
 * Permission system for tag-based access control
 * This handles view/edit/suggest permissions based on event tags and user roles
 */

export class EventPermissionService {
  
  /**
   * Determine user's permission level for an event
   */
  static getUserPermission(context: EventPermissionContext): UserPermission {
    const { userId, userRole, eventTags, isCreator, isAssignee } = context;
    
    // Creator always has edit permission
    if (isCreator) {
      return "edit";
    }
    
    // Admin role gets edit permission for all events in their household
    if (userRole === "admin") {
      return "edit";
    }
    
    // Assignee gets edit permission
    if (isAssignee) {
      return "edit";
    }
    
    // Check tag-based permissions
    let highestPermission: UserPermission = "none";
    
    for (const tag of eventTags) {
      const permission = this.getTagPermission(tag, userRole);
      
      if (permission === "edit") {
        return "edit"; // Edit is highest permission, return immediately
      } else if (permission === "suggest" && highestPermission !== "edit") {
        highestPermission = "suggest";
      } else if (permission === "view" && highestPermission === "none") {
        highestPermission = "view";
      }
    }
    
    // If no specific tag permissions, default household visibility rules
    if (highestPermission === "none") {
      // Members can view household events by default
      if (userRole === "member") {
        return "view";
      }
      // Viewers can only view
      if (userRole === "viewer") {
        return "view";
      }
    }
    
    return highestPermission;
  }
  
  /**
   * Get permission level for a specific tag based on user role
   */
  private static getTagPermission(tag: EventTag, userRole: string): UserPermission {
    const { tag: tagName, permission } = tag;
    
    // Tag-based permission mapping
    const tagPermissions: Record<string, Record<string, UserPermission>> = {
      "metamours": {
        "admin": "edit",
        "member": "suggest",
        "viewer": "view"
      },
      "friends": {
        "admin": "edit", 
        "member": "edit",
        "viewer": "view"
      },
      "family": {
        "admin": "edit",
        "member": "edit", 
        "viewer": "suggest"
      },
      "work": {
        "admin": "edit",
        "member": "view",
        "viewer": "none"
      },
      "personal": {
        "admin": "suggest",
        "member": "none",
        "viewer": "none"
      },
      "private": {
        "admin": "none",
        "member": "none", 
        "viewer": "none"
      }
    };
    
    // Use explicit permission from tag if set, otherwise use default mapping
    if (permission && permission !== "view") {
      return permission as UserPermission;
    }
    
    return tagPermissions[tagName]?.[userRole] || "none";
  }
  
  /**
   * Filter events based on user permissions
   */
  static filterEventsForUser(events: any[], userId: string, userRole: string): any[] {
    return events.filter(event => {
      const context: EventPermissionContext = {
        userId,
        userRole,
        eventTags: event.tags || [],
        isCreator: event.createdBy === userId,
        isAssignee: event.assignedTo === userId
      };
      
      const permission = this.getUserPermission(context);
      return permission !== "none";
    });
  }
  
  /**
   * Check if user can perform specific action on event
   */
  static canUserPerformAction(
    action: "view" | "edit" | "suggest", 
    context: EventPermissionContext
  ): boolean {
    const userPermission = this.getUserPermission(context);
    
    switch (action) {
      case "view":
        return ["view", "suggest", "edit"].includes(userPermission);
      case "suggest":
        return ["suggest", "edit"].includes(userPermission);
      case "edit":
        return userPermission === "edit";
      default:
        return false;
    }
  }
  
  /**
   * Get events that should be synced to user's Google Calendar
   */
  static getEventsForGoogleSync(events: any[], userId: string, userRole: string): any[] {
    return events.filter(event => {
      const context: EventPermissionContext = {
        userId,
        userRole,
        eventTags: event.tags || [],
        isCreator: event.createdBy === userId,
        isAssignee: event.assignedTo === userId
      };
      
      // Only sync events user can view and is either creator, assignee, or has explicit access
      const permission = this.getUserPermission(context);
      return permission !== "none" && (context.isCreator || context.isAssignee || permission === "edit");
    });
  }
}