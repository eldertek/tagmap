import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import { useAuthStore } from './auth';
import { noteService, columnService } from '@/services/api';

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
  title: string;
  description: string;
  location: [number, number];
  columnId: string;
  order: number; // Added order property to track position within column
  createdAt: string;
  updatedAt: string;
  accessLevel: NoteAccessLevel; // Access level for permissions
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
}

export const useNotesStore = defineStore('notes', () => {
  // État
  const columns = ref<NoteColumn[]>([]);
  const notes = ref<Note[]>([]);

  // Getters
  const getColumnById = computed(() => (id: string) => {
    return columns.value.find(column => column.id === id);
  });

  const getColumnColor = computed(() => (id: string) => {
    const column = columns.value.find(column => column.id === id);
    return column ? column.color : '#6B7280'; // Couleur grise par défaut
  });

  const getNotesByColumn = computed(() => (columnId: string) => {
    return notes.value
      .filter(note => note.columnId === columnId)
      .sort((a, b) => a.order - b.order);
  });

  const getDefaultColumn = computed(() => {
    return columns.value.find(column => column.isDefault) || columns.value[0];
  });

  const getSortedColumns = computed(() => {
    return [...columns.value].sort((a, b) => a.order - b.order);
  });

  // Vérifier si l'utilisateur a accès à une note en fonction de son niveau d'accès
  const hasAccessToNote = computed(() => (note: Note) => {
    const authStore = useAuthStore();
    const user = authStore.user;

    if (!user) return false;

    // Les administrateurs ont accès à toutes les notes
    if (authStore.isAdmin) return true;

    // L'accès dépend du niveau d'accès de la note et du rôle de l'utilisateur
    switch (note.accessLevel) {
      case NoteAccessLevel.PRIVATE:
        // Seul le créateur peut voir les notes privées (à implémenter avec l'ID du créateur)
        return true; // Temporairement, tout le monde peut voir les notes privées

      case NoteAccessLevel.COMPANY:
        // Uniquement l'entreprise peut voir
        return authStore.isAdmin || authStore.isEntreprise;

      case NoteAccessLevel.EMPLOYEE:
        // L'entreprise et ses salariés peuvent voir
        return authStore.isAdmin || authStore.isEntreprise || authStore.isSalarie;

      case NoteAccessLevel.VISITOR:
        // Tout le monde (entreprise, salariés et visiteurs) peut voir
        return authStore.isAdmin || authStore.isEntreprise || authStore.isSalarie || authStore.isVisiteur;

      default:
        return false;
    }
  });

  // Filtrer les notes accessibles à l'utilisateur actuel
  const getAccessibleNotes = computed(() => {
    return notes.value.filter(note => hasAccessToNote.value(note));
  });

  // Obtenir les notes accessibles par colonne
  const getAccessibleNotesByColumn = computed(() => (columnId: string) => {
    return getAccessibleNotes.value
      .filter(note => note.columnId === columnId)
      .sort((a, b) => a.order - b.order);
  });

  // Actions
  async function loadColumns() {
    console.log('\n[NotesStore][loadColumns] Chargement des colonnes...');
    try {
      const response = await columnService.getColumns();
      console.log('[NotesStore][loadColumns] Réponse de l\'API:', response.data);
      
      if (!response.data || response.data.length === 0) {
        console.log('[NotesStore][loadColumns] Aucune colonne trouvée, création des colonnes par défaut...');
        // Créer les colonnes par défaut
        const defaultColumns = [
          { title: 'À faire', color: '#F59E0B', order: 0, isDefault: true },
          { title: 'En cours', color: '#3B82F6', order: 1 },
          { title: 'Terminé', color: '#10B981', order: 2 }
        ];

        for (const column of defaultColumns) {
          await addColumn(column);
        }
      } else {
        console.log('[NotesStore][loadColumns] Colonnes trouvées:', response.data);
        columns.value = response.data;
      }
      
      console.log('[NotesStore][loadColumns] État final des colonnes:', columns.value);
    } catch (error) {
      console.error('[NotesStore][loadColumns] Erreur:', error);
      throw error;
    }
  }

  async function addColumn(columnData: NewNoteColumn) {
    console.log('\n[NotesStore][addColumn] Ajout d\'une nouvelle colonne:', columnData);
    try {
      const response = await columnService.createColumn(columnData);
      console.log('[NotesStore][addColumn] Réponse de l\'API:', response.data);
      
      // S'assurer que l'ID est une chaîne de caractères
      const newColumn = {
        ...response.data,
        id: response.data.id.toString()
      };
      
      columns.value.push(newColumn);
      console.log('[NotesStore][addColumn] État des colonnes après ajout:', columns.value);
    } catch (error) {
      console.error('[NotesStore][addColumn] Erreur:', error);
      throw error;
    }
  }

  async function updateColumn(id: string, data: Partial<NoteColumn>) {
    console.log('\n[NotesStore][updateColumn] Mise à jour de la colonne:', id, data);
    try {
      const response = await columnService.updateColumn(id, data);
      console.log('[NotesStore][updateColumn] Réponse de l\'API:', response.data);
      const index = columns.value.findIndex(column => column.id === id);
      if (index !== -1) {
        columns.value[index] = response.data;
        console.log('[NotesStore][updateColumn] État des colonnes après mise à jour:', columns.value);
      }
    } catch (error) {
      console.error('[NotesStore][updateColumn] Erreur:', error);
      throw error;
    }
  }

  async function removeColumn(id: string) {
    try {
      // Vérifier si la colonne existe et n'est pas une colonne par défaut
      const column = columns.value.find(col => col.id === id);
      if (!column || column.isDefault) return;

      // Supprimer la colonne via l'API
      await columnService.deleteColumn(id);

      // Déplacer les notes de cette colonne vers la colonne par défaut
      const defaultColumn = getDefaultColumn.value;
      if (defaultColumn) {
        notes.value
          .filter(note => note.columnId === id)
          .forEach(note => {
            note.columnId = defaultColumn.id;
            noteService.updateNote(note.id, { column_id: defaultColumn.id });
          });
      }

      // Supprimer la colonne localement
      columns.value = columns.value.filter(col => col.id !== id);
    } catch (error) {
      console.error('Erreur lors de la suppression de la colonne:', error);
      throw error;
    }
  }

  async function reorderColumns(newOrder: string[]) {
    try {
      // Mettre à jour l'ordre localement
      newOrder.forEach((columnId, index) => {
        const column = columns.value.find(col => col.id === columnId);
        if (column) {
          column.order = index;
        }
      });

      // Mettre à jour l'ordre sur le serveur
      await columnService.updateColumnsOrder(newOrder);
    } catch (error) {
      console.error('Erreur lors de la réorganisation des colonnes:', error);
      throw error;
    }
  }

  function addNote(note: Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'order' | 'accessLevel'>) {
    const newId = notes.value.length > 0
      ? Math.max(...notes.value.map(n => n.id)) + 1
      : 1;

    const now = new Date().toISOString();

    // Calculate the order for the new note (highest order in the column + 1)
    const notesInColumn = notes.value.filter(n => n.columnId === note.columnId);
    const order = notesInColumn.length > 0
      ? Math.max(...notesInColumn.map(n => n.order)) + 1
      : 0;

    // Default access level is PRIVATE if not specified
    const accessLevel = (note as any).accessLevel || NoteAccessLevel.PRIVATE;

    notes.value.push({
      ...note,
      id: newId,
      order,
      accessLevel,
      createdAt: now,
      updatedAt: now,
      comments: [],  // Initialiser un tableau vide pour les commentaires
      photos: []     // Initialiser un tableau vide pour les photos
    });

    return newId;
  }

  function updateNote(id: number, data: Partial<Note>) {
    const index = notes.value.findIndex(note => note.id === id);
    if (index !== -1) {
      // Create a new note object with updated properties
      const updatedNote = {
        ...notes.value[index],
        ...data,
        updatedAt: new Date().toISOString()
      };

      // Replace the note in the array to ensure reactivity
      notes.value[index] = updatedNote;
    }
  }

  function removeNote(id: number) {
    notes.value = notes.value.filter(note => note.id !== id);
  }

  function moveNote(noteId: number, targetColumnId: string) {
    const noteIndex = notes.value.findIndex(n => n.id === noteId);
    if (noteIndex !== -1) {
      const note = notes.value[noteIndex];
      const oldColumnId = note.columnId;

      // If moving to a different column
      if (oldColumnId !== targetColumnId) {
        // Calculate the new order (highest order in the target column + 1)
        const notesInTargetColumn = notes.value.filter(n => n.columnId === targetColumnId);
        const newOrder = notesInTargetColumn.length > 0
          ? Math.max(...notesInTargetColumn.map(n => n.order)) + 1
          : 0;

        // Create a new note object with updated properties
        const updatedNote = {
          ...note,
          columnId: targetColumnId,
          order: newOrder,
          updatedAt: new Date().toISOString()
        };

        // Replace the note in the array
        notes.value[noteIndex] = updatedNote;
      } else {
        // Just update the timestamp if staying in the same column
        notes.value[noteIndex] = {
          ...notes.value[noteIndex],
          updatedAt: new Date().toISOString()
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
          updatedAt: new Date().toISOString()
        };
      }
    });
  }

  // Obtenir le libellé du niveau d'accès
  function getAccessLevelLabel(level: NoteAccessLevel): string {
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

  // Fonctions pour gérer les commentaires
  async function addComment(noteId: number, text: string) {
    try {
      const authStore = useAuthStore();
      if (!authStore.user) {
        throw new Error('Vous devez être connecté pour ajouter un commentaire');
      }

      // Vérifier si l'utilisateur a le droit d'ajouter un commentaire
      // Seuls les utilisateurs de l'entreprise peuvent commenter
      if (!authStore.isEntreprise && !authStore.isAdmin) {
        throw new Error('Seules les entreprises peuvent ajouter des commentaires');
      }

      // Vérifier si la note existe dans le store
      const noteExists = notes.value.some(note => note.id === noteId);
      if (!noteExists) {
        throw new Error(`La note avec l'ID ${noteId} n'existe pas`);
      }

      // Appel à l'API pour ajouter un commentaire
      const response = await noteService.addComment(noteId, text);

      const newComment = response.data;

      // Mettre à jour le store local
      const noteIndex = notes.value.findIndex(note => note.id === noteId);
      if (noteIndex === -1) return;

      const note = notes.value[noteIndex];

      // Initialiser le tableau de commentaires s'il n'existe pas
      if (!note.comments) {
        note.comments = [];
      }

      // Transformer le format de l'API au format du store
      const storeComment: Comment = {
        id: newComment.id,
        text: newComment.text,
        createdAt: newComment.created_at,
        userId: newComment.user,
        userName: newComment.user_name,
        userRole: newComment.user_role
      };

      note.comments.push(storeComment);
      note.updatedAt = new Date().toISOString();

      // Mettre à jour la note
      notes.value[noteIndex] = { ...note };

      return storeComment.id;
    } catch (error) {
      console.error('Erreur lors de l\'ajout du commentaire:', error);
      throw error;
    }
  }

  async function removeComment(noteId: number, commentId: number) {
    try {
      // Vérifier si la note existe dans le store
      const noteIndex = notes.value.findIndex(note => note.id === noteId);
      if (noteIndex === -1) {
        throw new Error(`La note avec l'ID ${noteId} n'existe pas`);
      }

      const note = notes.value[noteIndex];

      // Vérifier si les commentaires existent
      if (!note.comments || note.comments.length === 0) {
        throw new Error(`Aucun commentaire trouvé pour cette note`);
      }

      // Vérifier si le commentaire spécifique existe
      const commentExists = note.comments.some(comment => comment.id === commentId);
      if (!commentExists) {
        throw new Error(`Le commentaire avec l'ID ${commentId} n'existe pas`);
      }

      // Appel à l'API pour supprimer un commentaire
      await noteService.deleteComment(noteId, commentId);

      // Mettre à jour le store local
      note.comments = note.comments.filter(comment => comment.id !== commentId);
      note.updatedAt = new Date().toISOString();

      // Mettre à jour la note
      notes.value[noteIndex] = { ...note };
    } catch (error) {
      console.error('Erreur lors de la suppression du commentaire:', error);
      throw error;
    }
  }

  // Fonctions pour gérer les photos
  async function addPhoto(noteId: number, photoData: { url: string, caption?: string } | any) {
    try {
      // Si photoData est un objet de l'API, l'utiliser directement
      if (photoData.id && photoData.image) {
        // Mettre à jour le store local
        const noteIndex = notes.value.findIndex(note => note.id === noteId);
        if (noteIndex === -1) return;

        const note = notes.value[noteIndex];

        // Initialiser le tableau de photos s'il n'existe pas
        if (!note.photos) {
          note.photos = [];
        }

        // Transformer le format de l'API au format du store
        const storePhoto: Photo = {
          id: photoData.id,
          url: photoData.image,
          caption: photoData.caption,
          createdAt: photoData.created_at
        };

        note.photos.push(storePhoto);
        note.updatedAt = new Date().toISOString();

        // Mettre à jour la note
        notes.value[noteIndex] = { ...note };

        return storePhoto.id;
      } else {
        // Sinon, envoyer la photo à l'API
        const formData = new FormData();
        formData.append('image', photoData.url);
        if (photoData.caption) {
          formData.append('caption', photoData.caption);
        }
        const response = await noteService.addPhoto(noteId, formData);

        const newPhoto = response.data;

        // Mettre à jour le store local
        const noteIndex = notes.value.findIndex(note => note.id === noteId);
        if (noteIndex === -1) return;

        const note = notes.value[noteIndex];

        // Initialiser le tableau de photos s'il n'existe pas
        if (!note.photos) {
          note.photos = [];
        }

        // Transformer le format de l'API au format du store
        const storePhoto: Photo = {
          id: newPhoto.id,
          url: newPhoto.image,
          caption: newPhoto.caption,
          createdAt: newPhoto.created_at
        };

        note.photos.push(storePhoto);
        note.updatedAt = new Date().toISOString();

        // Mettre à jour la note
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
      // Appel à l'API pour supprimer une photo
      await noteService.deletePhoto(noteId, photoId);

      // Mettre à jour le store local
      const noteIndex = notes.value.findIndex(note => note.id === noteId);
      if (noteIndex === -1 || !notes.value[noteIndex].photos) return;

      const note = notes.value[noteIndex];
      note.photos = note.photos!.filter(photo => photo.id !== photoId);
      note.updatedAt = new Date().toISOString();

      // Mettre à jour la note
      notes.value[noteIndex] = { ...note };
    } catch (error) {
      console.error('Erreur lors de la suppression de la photo:', error);
      throw error;
    }
  }

  async function updatePhoto(noteId: number, photoId: number, caption: string) {
    try {
      // Appel à l'API pour mettre à jour la légende
      await noteService.updatePhoto(noteId, photoId, { caption });

      // Mettre à jour le store local
      const noteIndex = notes.value.findIndex(note => note.id === noteId);
      if (noteIndex === -1 || !notes.value[noteIndex].photos) return;

      const note = notes.value[noteIndex];
      const photoIndex = note.photos!.findIndex(photo => photo.id === photoId);
      if (photoIndex === -1) return;

      note.photos![photoIndex].caption = caption;
      note.updatedAt = new Date().toISOString();

      // Mettre à jour la note
      notes.value[noteIndex] = { ...note };
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la légende:', error);
      throw error;
    }
  }

  return {
    columns,
    notes,
    getColumnById,
    getColumnColor,
    getNotesByColumn,
    getDefaultColumn,
    getSortedColumns,
    hasAccessToNote,
    getAccessibleNotes,
    getAccessibleNotesByColumn,
    getAccessLevelLabel,
    loadColumns,
    addColumn,
    updateColumn,
    removeColumn,
    reorderColumns,
    addNote,
    updateNote,
    removeNote,
    moveNote,
    reorderNotes,
    addComment,
    removeComment,
    addPhoto,
    removePhoto,
    updatePhoto
  };
});
