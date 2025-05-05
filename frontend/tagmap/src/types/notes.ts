// Note interfaces and types for the notes store

export interface NoteColumn {
  id: string;
  title: string;
  color: string;
  order: number;
  isDefault?: boolean;
}

export interface NewNoteColumn {
  title: string;
  color: string;
  order: number;
  isDefault?: boolean;
}

export enum NoteAccessLevel {
  PRIVATE = 'private',
  COMPANY = 'company',
  EMPLOYEE = 'employee',
  VISITOR = 'visitor'
}

export interface Comment {
  id: number;
  text: string;
  createdAt: string;
  userId: number;
  userName: string;
  userRole: string;
}

export interface Photo {
  id: number;
  url: string;
  createdAt: string;
  caption?: string;
}

export interface Note {
  id: number;
  backendId?: number; // ID explicite du backend, utilisé quand l'ID principal est un ID Leaflet
  leafletId?: number; // ID Leaflet pour référence et mise à jour visuelle
  title: string;
  description: string;
  location: [number, number] | {
    type: string;
    coordinates: [number, number]; // [longitude, latitude] pour GeoJSON
  };
  columnId: string;
  order: number; // Added order property to track position within column
  createdAt: string;
  updatedAt: string;
  accessLevel: NoteAccessLevel; // Access level for permissions
  color?: string; // Couleur de la note
  style: {
    color: string;
    weight: number;
    opacity: number;
    fillColor: string;
    fillOpacity: number;
    radius?: number;
  };
  comments?: Comment[];
  photos?: Photo[];
  enterprise_id?: number | null; // ID de l'entreprise associée à la note
}

// API response types
export interface NoteApiResponse {
  id: number;
  title: string;
  description: string;
  location: [number, number] | {
    type: string;
    coordinates: [number, number];
  };
  columnId: string;
  access_level?: string;
  enterprise_id?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface PhotoApiResponse {
  id: number;
  image: string;
  caption?: string;
  created_at: string;
}

export interface CommentApiResponse {
  id: number;
  text: string;
  created_at: string;
  user: number;
  user_name: string;
  user_role: string;
}

// Helper types
export type AccessLevelLabels = {
  [key in NoteAccessLevel]: string;
}