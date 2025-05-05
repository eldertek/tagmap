// Helper functions for note-related operations
import type { Note, Comment, Photo, CommentApiResponse, PhotoApiResponse } from '@/types/notes';
import { useAuthStore } from '@/stores/auth';

// Export the enum from the types file so we can use it here
export { NoteAccessLevel } from '@/types/notes';
import { NoteAccessLevel } from '@/types/notes';

/**
 * Converts access level from backend format to frontend enum
 */
export function convertAccessLevel(backendLevel: string | undefined): NoteAccessLevel {
  if (!backendLevel) return NoteAccessLevel.PRIVATE;

  switch (backendLevel.toLowerCase()) {
    case 'private':
      return NoteAccessLevel.PRIVATE;
    case 'company':
      return NoteAccessLevel.COMPANY;
    case 'employee':
      return NoteAccessLevel.EMPLOYEE;
    case 'visitor':
      return NoteAccessLevel.VISITOR;
    default:
      console.warn(`Niveau d'accès inconnu: ${backendLevel}, utilisation de PRIVATE par défaut`);
      return NoteAccessLevel.PRIVATE;
  }
}

/**
 * Get localized label for access level
 */
export function getAccessLevelLabel(level: NoteAccessLevel): string {
  switch (level) {
    case NoteAccessLevel.PRIVATE:
      return 'Privé';
    case NoteAccessLevel.COMPANY:
      return 'Entreprise';
    case NoteAccessLevel.EMPLOYEE:
      return 'Salariés';
    case NoteAccessLevel.VISITOR:
      return 'Visiteurs';
    default:
      return 'Inconnu';
  }
}

/**
 * Determines the enterprise_id based on the current user role
 */
export function determineEnterpriseId(providedEnterpriseId?: number | null): number | null {
  const authStore = useAuthStore();
  
  // If a specific enterprise_id is provided, use it
  if (providedEnterpriseId !== undefined) {
    return providedEnterpriseId;
  }
  
  if (authStore.isAdmin) {
    // Admin: can be null if not specified
    return null;
  } else if (authStore.isEntreprise && authStore.user) {
    // Enterprise: use its own ID
    return authStore.user.id;
  } else if (authStore.isSalarie && authStore.user?.enterprise_id) {
    // Employee: use the enterprise ID they belong to
    return authStore.user.enterprise_id;
  } else if (authStore.isVisiteur && authStore.user?.enterprise_id) {
    // Visitor: use the enterprise ID associated with the visitor
    return authStore.user.enterprise_id;
  } else if (!authStore.isAdmin && authStore.user?.enterprise_id) {
    // Fallback: use user's enterprise_id if available
    return authStore.user.enterprise_id;
  }
  
  return null;
}

/**
 * Calculates the highest order + 1 for notes in a column
 */
export function calculateNoteOrder(notes: Note[], columnId: string): number {
  const notesInColumn = notes.filter(n => n.columnId === columnId);
  return notesInColumn.length > 0
    ? Math.max(...notesInColumn.map(n => n.order)) + 1
    : 0;
}

/**
 * Converts API comment to store format
 */
export function convertApiCommentToStore(apiComment: CommentApiResponse): Comment {
  return {
    id: apiComment.id,
    text: apiComment.text,
    createdAt: apiComment.created_at,
    userId: apiComment.user,
    userName: apiComment.user_name,
    userRole: apiComment.user_role
  };
}

/**
 * Converts API photo to store format
 */
export function convertApiPhotoToStore(apiPhoto: PhotoApiResponse): Photo {
  return {
    id: apiPhoto.id,
    url: apiPhoto.image,
    caption: apiPhoto.caption,
    createdAt: apiPhoto.created_at
  };
}

/**
 * Gets current ISO timestamp
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}