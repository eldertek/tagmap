import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { noteService } from '@/services/api';
import { useAuthStore } from './auth';
import type { 
  NoteColumn, 
  NewNoteColumn, 
  Note, 
  Comment, 
  Photo,
  NoteApiResponse 
} from '@/types/notes';
import {
  NoteAccessLevel,
  convertAccessLevel,
  getAccessLevelLabel,
  determineEnterpriseId,
  calculateNoteOrder,
  convertApiCommentToStore,
  convertApiPhotoToStore,
  getCurrentTimestamp
} from '@/utils/noteHelpers';

// Re-export types from the former store
export type { NoteColumn, NewNoteColumn, Note, Comment, Photo };
export { NoteAccessLevel };

export const useNotesStore = defineStore('notes', () => {
  // State
  const columns = ref<NoteColumn[]>([]);
  const notes = ref<Note[]>([]);

  // Column Getters
  const getColumnById = computed(() => (id: string) => {
    return columns.value.find(column => column.id === id);
  });

  const getColumnColor = computed(() => (id: string) => {
    const column = columns.value.find(column => column.id === id);
    return column ? column.color : '#6B7280'; // Default gray color
  });

  const getDefaultColumn = computed(() => {
    return columns.value.find(column => column.isDefault) || columns.value[0];
  });

  const getSortedColumns = computed(() => {
    return [...columns.value].sort((a, b) => a.order - b.order);
  });

  // Note Getters
  const getNotesByColumn = computed(() => (columnId: string) => {
    return notes.value
      .filter(note => note.columnId === columnId)
      .sort((a, b) => a.order - b.order);
  });

  // All notes from backend are considered accessible (permissions centralized on backend)
  const getAccessibleNotes = computed(() => notes.value);

  // Get notes by column (without additional permission filtering)
  // Use getAccessibleNotes to stay compatible with NotesView.vue
  const getAccessibleNotesByColumn = computed(() => (columnId: string) => {
    return getAccessibleNotes.value
      .filter(note => note.columnId === columnId)
      .sort((a, b) => a.order - b.order);
  });

  // Column Management Actions
  async function loadColumns() {
    try {
      // Predefined fixed columns with backend IDs
      const fixedColumns: NoteColumn[] = [
        { id: '1', title: 'Idées', color: '#8B5CF6', order: 0, isDefault: false },
        { id: '2', title: 'À faire', color: '#F59E0B', order: 1, isDefault: true },
        { id: '3', title: 'En cours', color: '#3B82F6', order: 2, isDefault: false },
        { id: '4', title: 'Terminées', color: '#10B981', order: 3, isDefault: false },
        { id: '5', title: 'Autres', color: '#6B7280', order: 4, isDefault: false }
      ];

      // Directly assign fixed columns
      columns.value = fixedColumns;
    } catch (error) {
      console.error('[NotesStore][loadColumns] Erreur:', error);
      throw error;
    }
  }

  // This function is preserved for compatibility but does nothing
  async function addColumn(_columnData: NewNoteColumn) {
    // Does nothing as we're using fixed columns
    return;
  }

  // This function is preserved for compatibility but only modifies locally
  async function updateColumn(id: string, data: Partial<NoteColumn>) {
    try {
      const index = columns.value.findIndex(column => column.id === id);
      if (index !== -1) {
        // Local update only
        columns.value[index] = {
          ...columns.value[index],
          ...data
        };
      }
    } catch (error) {
      console.error('[NotesStore][updateColumn] Erreur:', error);
      throw error;
    }
  }

  // Note Management Actions
  function addNote(note: Partial<NoteApiResponse> & { id: number }) {
    if (!note.id) {
      console.error('[NotesStore][addNote] Erreur: ID du backend manquant');
      throw new Error('L\'ID du backend est requis pour ajouter une note');
    }

    const now = getCurrentTimestamp();
    const order = calculateNoteOrder(notes.value, note.columnId || '');
    const accessLevel = convertAccessLevel(note.access_level);
    const enterprise_id = determineEnterpriseId(note.enterprise_id);

    const newNote: Note = {
      ...note as unknown as Note,
      id: note.id,
      order,
      accessLevel,
      createdAt: note.created_at || now,
      updatedAt: note.updated_at || now,
      comments: [],  // Initialize empty comments array
      photos: [],    // Initialize empty photos array
      enterprise_id
    };

    notes.value.push(newNote);
    return note.id;
  }

  function updateNote(id: number, data: Partial<Note> & { access_level?: string }) {
    try {
      const index = notes.value.findIndex(note => note.id === id);
      if (index !== -1) {
        // If a new color is provided, update the style as well
        if (data.color) {
          data.style = {
            ...notes.value[index].style,
            color: data.color,
            fillColor: data.color
          };
        }

        // Convert access_level if present
        if (data.access_level) {
          data.accessLevel = convertAccessLevel(data.access_level);
          delete data.access_level;
        }

        // Update the note
        notes.value[index] = {
          ...notes.value[index],
          ...data
        };
      }
    } catch (error) {
      console.error('[NotesStore][updateNote] Erreur:', error);
      throw error;
    }
  }

  function removeNote(id: number) {
    const noteIndex = notes.value.findIndex(note => note.id === id);
    if (noteIndex !== -1) {
      notes.value = notes.value.filter(note => note.id !== id);
    } else {
      console.warn('[NotesStore][removeNote] Tentative de suppression d\'une note inexistante avec ID:', id);
    }
  }

  // Note Organization Actions
  function moveNote(noteId: number, targetColumnId: string) {
    const noteIndex = notes.value.findIndex(n => n.id === noteId);
    if (noteIndex !== -1) {
      const note = notes.value[noteIndex];
      const oldColumnId = note.columnId;

      // If moving to a different column
      if (oldColumnId !== targetColumnId) {
        // Calculate the new order (highest order in the target column + 1)
        const newOrder = calculateNoteOrder(notes.value, targetColumnId);

        // Create a new note object with updated properties
        const updatedNote = {
          ...note,
          columnId: targetColumnId,
          order: newOrder,
          updatedAt: getCurrentTimestamp()
        };

        // Replace the note in the array
        notes.value[noteIndex] = updatedNote;
      } else {
        // Just update the timestamp if staying in the same column
        notes.value[noteIndex] = {
          ...notes.value[noteIndex],
          updatedAt: getCurrentTimestamp()
        };
      }
    }
  }

  function reorderNotes(columnId: string, noteIds: number[]) {
    // Update the order of notes in the specified column
    noteIds.forEach((id, index) => {
      const noteIndex = notes.value.findIndex(n => n.id === id && n.columnId === columnId);
      if (noteIndex !== -1) {
        // Create a new note object with updated order
        notes.value[noteIndex] = {
          ...notes.value[noteIndex],
          order: index,
          updatedAt: getCurrentTimestamp()
        };
      }
    });
  }

  // Comment Management Actions
  async function addComment(noteId: number, text: string) {
    try {
      const authStore = useAuthStore();
      if (!authStore.user) {
        throw new Error('Vous devez être connecté pour ajouter un commentaire');
      }

      // Check if the user has permission to add a comment
      // Only company users can comment
      if (!authStore.isEntreprise && !authStore.isAdmin) {
        throw new Error('Seules les entreprises peuvent ajouter des commentaires');
      }

      // Check if the note exists in the store
      const noteExists = notes.value.some(note => note.id === noteId);
      if (!noteExists) {
        throw new Error(`La note avec l'ID ${noteId} n'existe pas`);
      }

      // API call to add a comment
      const response = await noteService.addComment(noteId, text);
      const newComment = response.data;

      // Update local store
      const noteIndex = notes.value.findIndex(note => note.id === noteId);
      if (noteIndex === -1) return;

      const note = notes.value[noteIndex];

      // Initialize comments array if it doesn't exist
      if (!note.comments) {
        note.comments = [];
      }

      // Transform API format to store format
      const storeComment = convertApiCommentToStore(newComment);

      note.comments.push(storeComment);
      note.updatedAt = getCurrentTimestamp();

      // Update the note
      notes.value[noteIndex] = { ...note };

      return storeComment.id;
    } catch (error) {
      console.error('Erreur lors de l\'ajout du commentaire:', error);
      throw error;
    }
  }

  async function removeComment(noteId: number, commentId: number) {
    try {
      // Check if the note exists in the store
      const noteIndex = notes.value.findIndex(note => note.id === noteId);
      if (noteIndex === -1) {
        throw new Error(`La note avec l'ID ${noteId} n'existe pas`);
      }

      const note = notes.value[noteIndex];

      // Check if comments exist
      if (!note.comments || note.comments.length === 0) {
        throw new Error(`Aucun commentaire trouvé pour cette note`);
      }

      // Check if the specific comment exists
      const commentExists = note.comments.some(comment => comment.id === commentId);
      if (!commentExists) {
        throw new Error(`Le commentaire avec l'ID ${commentId} n'existe pas`);
      }

      // API call to delete a comment
      await noteService.deleteComment(noteId, commentId);

      // Update local store
      note.comments = note.comments.filter(comment => comment.id !== commentId);
      note.updatedAt = getCurrentTimestamp();

      // Update the note
      notes.value[noteIndex] = { ...note };
    } catch (error) {
      console.error('Erreur lors de la suppression du commentaire:', error);
      throw error;
    }
  }

  // Photo Management Actions
  async function addPhoto(noteId: number, photoData: { url: string, caption?: string } | any) {
    try {
      // If photoData is an API object, use it directly
      if (photoData.id && photoData.image) {
        // Update local store
        const noteIndex = notes.value.findIndex(note => note.id === noteId);
        if (noteIndex === -1) return;

        const note = notes.value[noteIndex];

        // Initialize photos array if it doesn't exist
        if (!note.photos) {
          note.photos = [];
        }

        // Transform API format to store format
        const storePhoto = convertApiPhotoToStore(photoData);

        note.photos.push(storePhoto);
        note.updatedAt = getCurrentTimestamp();

        // Update the note
        notes.value[noteIndex] = { ...note };

        return storePhoto.id;
      } else {
        // Otherwise, send the photo to the API
        const formData = new FormData();
        formData.append('image', photoData.url);
        if (photoData.caption) {
          formData.append('caption', photoData.caption);
        }
        const response = await noteService.addPhoto(noteId, formData);
        const newPhoto = response.data;

        // Update local store
        const noteIndex = notes.value.findIndex(note => note.id === noteId);
        if (noteIndex === -1) return;

        const note = notes.value[noteIndex];

        // Initialize photos array if it doesn't exist
        if (!note.photos) {
          note.photos = [];
        }

        // Transform API format to store format
        const storePhoto = convertApiPhotoToStore(newPhoto);

        note.photos.push(storePhoto);
        note.updatedAt = getCurrentTimestamp();

        // Update the note
        notes.value[noteIndex] = { ...note };

        return storePhoto.id;
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la photo:', error);
      throw error;
    }
  }

  async function removePhoto(noteId: number, photoId: number) {
    try {
      // API call to delete a photo
      await noteService.deletePhoto(noteId, photoId);

      // Update local store
      const noteIndex = notes.value.findIndex(note => note.id === noteId);
      if (noteIndex === -1) {
        console.error('[NotesStore] Note non trouvée pour la suppression de la photo');
        return;
      }

      // Ensure photos array exists
      if (!notes.value[noteIndex].photos) {
        notes.value[noteIndex].photos = [];
      }

      const note = notes.value[noteIndex];
      const updatedPhotos = (note.photos || []).filter(photo => photo.id !== photoId);

      // Create a new reference for the note with updated photos
      notes.value[noteIndex] = {
        ...note,
        photos: updatedPhotos,
        updatedAt: getCurrentTimestamp()
      };
    } catch (error) {
      console.error('Erreur lors de la suppression de la photo:', error);
      throw error;
    }
  }

  async function updatePhoto(noteId: number, photoId: number, caption: string) {
    try {
      // API call to update the caption
      await noteService.updatePhoto(noteId, photoId, { caption });

      // Update local store
      const noteIndex = notes.value.findIndex(note => note.id === noteId);
      if (noteIndex === -1 || !notes.value[noteIndex].photos) return;

      const note = notes.value[noteIndex];
      const photoIndex = note.photos!.findIndex(photo => photo.id === photoId);
      if (photoIndex === -1) return;

      note.photos![photoIndex].caption = caption;
      note.updatedAt = getCurrentTimestamp();

      // Update the note
      notes.value[noteIndex] = { ...note };
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la légende:', error);
      throw error;
    }
  }

  return {
    // State
    columns,
    notes,
    
    // Column getters
    getColumnById,
    getColumnColor,
    getDefaultColumn,
    getSortedColumns,
    
    // Note getters
    getNotesByColumn,
    getAccessibleNotes,
    getAccessibleNotesByColumn,
    
    // Utility functions
    getAccessLevelLabel,
    
    // Column actions
    loadColumns,
    addColumn,
    updateColumn,
    
    // Note actions
    addNote,
    updateNote,
    removeNote,
    moveNote,
    reorderNotes,
    
    // Comment actions
    addComment,
    removeComment,
    
    // Photo actions
    addPhoto,
    removePhoto,
    updatePhoto
  };
});