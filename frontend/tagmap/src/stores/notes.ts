import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { v4 as uuidv4 } from 'uuid';

export interface NoteColumn {
  id: string;
  title: string;
  color: string;
  order: number;
  isDefault?: boolean;
}

export interface Note {
  id: number;
  title: string;
  description: string;
  location: [number, number];
  columnId: string;
  createdAt: string;
  updatedAt: string;
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
      createdAt: '2023-05-15T10:30:00Z',
      updatedAt: '2023-05-15T10:30:00Z',
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
      createdAt: '2023-05-16T14:20:00Z',
      updatedAt: '2023-05-16T14:20:00Z',
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
      createdAt: '2023-05-17T09:15:00Z',
      updatedAt: '2023-05-17T09:15:00Z',
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
    return notes.value.filter(note => note.columnId === columnId);
  });

  const getDefaultColumn = computed(() => {
    return columns.value.find(column => column.isDefault) || columns.value[0];
  });

  const getSortedColumns = computed(() => {
    return [...columns.value].sort((a, b) => a.order - b.order);
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

  function addNote(note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) {
    const newId = notes.value.length > 0 
      ? Math.max(...notes.value.map(n => n.id)) + 1 
      : 1;
    
    const now = new Date().toISOString();
    
    notes.value.push({
      ...note,
      id: newId,
      createdAt: now,
      updatedAt: now
    });
    
    return newId;
  }

  function updateNote(id: number, data: Partial<Note>) {
    const index = notes.value.findIndex(note => note.id === id);
    if (index !== -1) {
      notes.value[index] = { 
        ...notes.value[index], 
        ...data, 
        updatedAt: new Date().toISOString() 
      };
    }
  }

  function removeNote(id: number) {
    notes.value = notes.value.filter(note => note.id !== id);
  }

  function moveNote(noteId: number, targetColumnId: string) {
    const note = notes.value.find(n => n.id === noteId);
    if (note) {
      note.columnId = targetColumnId;
      note.updatedAt = new Date().toISOString();
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
    addColumn,
    updateColumn,
    removeColumn,
    reorderColumns,
    addNote,
    updateNote,
    removeNote,
    moveNote
  };
});
