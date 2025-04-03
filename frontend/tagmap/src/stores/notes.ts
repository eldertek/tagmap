import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import { useAuthStore } from './auth';

export interface NoteColumn {
  id: string;
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
}

export const useNotesStore = defineStore('notes', () => {
  // État
  const columns = ref<NoteColumn[]>([
    { id: 'a-faire', title: 'À faire', color: '#F59E0B', order: -1, isDefault: true },
    { id: 'en-cours', title: 'En cours', color: '#3B82F6', order: 0, isDefault: true },
    { id: 'termine', title: 'Terminé', color: '#10B981', order: 1, isDefault: true }
  ]);

  const notes = ref<Note[]>([
    {
      id: 1,
      title: 'Point d\'irrigation principal',
      description: 'Point de départ du système d\'irrigation',
      location: [43.6047, 1.4442],
      columnId: 'en-cours',
      order: 0,
      createdAt: '2023-05-15T10:30:00Z',
      updatedAt: '2023-05-15T10:30:00Z',
      accessLevel: NoteAccessLevel.COMPANY,
      style: {
        color: '#3B82F6',
        weight: 2,
        opacity: 1,
        fillColor: '#3B82F6',
        fillOpacity: 0.6,
        radius: 8
      }
    },
    {
      id: 2,
      title: 'Zone à problème',
      description: 'Fuite détectée dans cette zone',
      location: [43.6057, 1.4452],
      columnId: 'en-cours',
      order: 1,
      createdAt: '2023-05-16T14:20:00Z',
      updatedAt: '2023-05-16T14:20:00Z',
      accessLevel: NoteAccessLevel.EMPLOYEE,
      style: {
        color: '#EF4444',
        weight: 2,
        opacity: 1,
        fillColor: '#EF4444',
        fillOpacity: 0.6,
        radius: 8
      }
    },
    {
      id: 3,
      title: 'Vanne de contrôle',
      description: 'Vanne principale pour le secteur nord',
      location: [43.6067, 1.4462],
      columnId: 'termine',
      order: 0,
      createdAt: '2023-05-17T09:15:00Z',
      updatedAt: '2023-05-17T09:15:00Z',
      accessLevel: NoteAccessLevel.VISITOR,
      style: {
        color: '#10B981',
        weight: 2,
        opacity: 1,
        fillColor: '#10B981',
        fillOpacity: 0.6,
        radius: 8
      }
    }
  ]);

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
  function addColumn(title: string, color: string = '#6B7280') {
    const maxOrder = columns.value.reduce((max, column) => Math.max(max, column.order), -1);
    columns.value.push({
      id: uuidv4(),
      title,
      color,
      order: maxOrder + 1
    });
  }

  function updateColumn(id: string, data: Partial<NoteColumn>) {
    const index = columns.value.findIndex(column => column.id === id);
    if (index !== -1) {
      columns.value[index] = { ...columns.value[index], ...data };
    }
  }

  function removeColumn(id: string) {
    // Vérifier si la colonne existe et n'est pas une colonne par défaut
    const column = columns.value.find(col => col.id === id);
    if (!column || column.isDefault) return;

    // Déplacer les notes de cette colonne vers la colonne par défaut
    const defaultColumn = getDefaultColumn.value;
    notes.value.forEach(note => {
      if (note.columnId === id) {
        note.columnId = defaultColumn.id;
      }
    });

    // Supprimer la colonne
    columns.value = columns.value.filter(column => column.id !== id);
  }

  function reorderColumns(newOrder: string[]) {
    // Mettre à jour l'ordre des colonnes
    newOrder.forEach((id, index) => {
      const column = columns.value.find(col => col.id === id);
      if (column) {
        column.order = index;
      }
    });
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
      updatedAt: now
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
    addColumn,
    updateColumn,
    removeColumn,
    reorderColumns,
    addNote,
    updateNote,
    removeNote,
    moveNote,
    reorderNotes
  };
});
