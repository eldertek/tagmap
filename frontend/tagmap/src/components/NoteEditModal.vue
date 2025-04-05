<template>
  <div class="fixed z-[9999] inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
    <div class="flex items-center justify-center min-h-screen w-full">
      <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
      <div class="relative bg-white w-full h-full md:rounded-lg md:max-w-2xl md:h-auto md:max-h-[90vh] md:my-8 shadow-xl transform transition-all overflow-hidden">
        <form @submit.prevent="saveNote" class="h-full md:h-auto flex flex-col">
          <div class="p-4 md:p-6 flex-1 overflow-y-auto">
            <div class="flex justify-between items-center mb-4 border-b pb-4">
              <h3 class="text-xl font-semibold text-gray-900">{{ note?.id ? 'Modifier la note' : 'Nouvelle note' }}</h3>
              <button type="button" @click="closeModal" class="text-gray-400 hover:text-gray-500">
                <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Onglets pour naviguer entre les sections -->
            <div class="mb-4 border-b border-gray-200">
              <nav class="flex space-x-4" aria-label="Tabs">
                <button
                  type="button"
                  @click="activeTab = 'info'"
                  class="px-3 py-2 text-sm font-medium border-b-2 focus:outline-none"
                  :class="activeTab === 'info' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
                >
                  Informations
                </button>
                <button
                  type="button"
                  @click="activeTab = 'comments'"
                  class="px-3 py-2 text-sm font-medium border-b-2 focus:outline-none"
                  :class="activeTab === 'comments' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
                >
                  Commentaires
                  <span v-if="note?.comments?.length" class="ml-1 px-2 py-0.5 text-xs rounded-full bg-primary-100 text-primary-800">
                    {{ note.comments.length }}
                  </span>
                </button>
                <button
                  type="button"
                  @click="activeTab = 'photos'"
                  class="px-3 py-2 text-sm font-medium border-b-2 focus:outline-none"
                  :class="activeTab === 'photos' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
                >
                  Photos
                  <span v-if="note?.photos?.length" class="ml-1 px-2 py-0.5 text-xs rounded-full bg-primary-100 text-primary-800">
                    {{ note.photos.length }}
                  </span>
                </button>
              </nav>
            </div>

            <!-- Onglet Informations -->
            <div v-if="activeTab === 'info'">
              <div class="mb-4">
                <label for="title" class="block text-sm font-medium text-gray-700">Titre</label>
                <input type="text" id="title" v-model="editingNote.title" required
                  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" />
              </div>
              <div class="mb-4">
                <label for="description" class="block text-sm font-medium text-gray-700">Description</label>
                <textarea id="description" v-model="editingNote.description" rows="3"
                  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"></textarea>
              </div>
              <div class="mb-4">
                <label for="column" class="block text-sm font-medium text-gray-700">État</label>
                <select id="column" v-model="editingNote.columnId"
                  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm">
                  <option v-for="column in sortedColumns" :key="column.id" :value="column.id">
                    {{ column.title }}
                  </option>
                </select>
              </div>
              <div class="mb-4">
                <label for="accessLevel" class="block text-sm font-medium text-gray-700">Niveau d'accès</label>
                <select id="accessLevel" v-model="editingNote.accessLevel"
                  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm">
                  <option v-for="level in accessLevels" :key="level.id" :value="level.id">
                    {{ level.title }} - {{ level.description }}
                  </option>
                </select>
              </div>
              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700">Couleur</label>
                <div class="mt-1 flex space-x-2">
                  <div v-for="color in colors" :key="color"
                    class="w-8 h-8 rounded-full cursor-pointer border-2"
                    :class="{ 'border-gray-400': editingNote.style.color !== color, 'border-black': editingNote.style.color === color }"
                    :style="{ backgroundColor: color }"
                    @click="updateNoteColor(color)">
                  </div>
                </div>
              </div>
            </div>

            <!-- Onglet Commentaires -->
            <div v-else-if="activeTab === 'comments'" class="mt-4">
              <CommentThread
                v-if="note"
                :noteId="note.id"
                :comments="note.comments || []"
              />
            </div>

            <!-- Onglet Photos -->
            <div v-else-if="activeTab === 'photos'" class="mt-4">
              <PhotoGallery
                v-if="note"
                :noteId="note.id"
                :photos="note.photos || []"
              />
            </div>
          </div>
          <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button type="submit" class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm">
              Enregistrer
            </button>
            <button @click="closeModal" type="button" class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useNotesStore, type Note, NoteAccessLevel } from '../stores/notes';
import { useNotificationStore } from '../stores/notification';
import { noteService } from '../services/api';
import CommentThread from './CommentThread.vue';
import PhotoGallery from './PhotoGallery.vue';

const props = defineProps<{
  note: Note | null;
  isNewNote?: boolean;
  location?: [number, number] | { type: string; coordinates: [number, number] };
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'save', note: Note): void;
}>();

const notesStore = useNotesStore();
const notificationStore = useNotificationStore();
const activeTab = ref('info');

// Créer une copie de la note pour l'édition
const editingNote = ref<any>({
  title: '',
  description: '',
  columnId: '',
  accessLevel: NoteAccessLevel.PRIVATE,
  style: {
    color: '#3B82F6',
    weight: 2,
    opacity: 1,
    fillColor: '#3B82F6',
    fillOpacity: 0.6,
    radius: 8
  },
  comments: [],
  photos: []
});

// Fonction utilitaire pour traiter les différents formats de localisation
function processLocation(location: [number, number] | { type: string; coordinates: [number, number] }): [number, number] {
  if (Array.isArray(location)) {
    // Format tableau [lat, lng]
    return location;
  } else if (typeof location === 'object' && 'type' in location && 'coordinates' in location) {
    // Format GeoJSON { type: 'Point', coordinates: [lng, lat] }
    // Convertir en format [lat, lng] pour le frontend
    return [location.coordinates[1], location.coordinates[0]];
  }
  console.error('[NoteEditModal] Format de localisation non reconnu:', location);
  return [0, 0]; // Valeur par défaut en cas d'erreur
}

// Fonction pour la création sécurisée de dates
function safeDate(dateString: string | undefined): string {
  if (!dateString) return new Date().toISOString();

  try {
    const date = new Date(dateString);

    // Vérifier si la date est valide
    if (isNaN(date.getTime())) {
      console.warn('[NoteEditModal] Date invalide:', dateString);
      return new Date().toISOString();
    }

    return date.toISOString();
  } catch (error) {
    console.error('[NoteEditModal] Erreur lors de la création de la date:', error);
    return new Date().toISOString();
  }
}

// Initialiser les données d'édition
onMounted(() => {
  console.log('[NoteEditModal] onMounted - props:', props);

  if (props.note) {
    // Édition d'une note existante
    console.log('[NoteEditModal] Édition d\'une note existante:', props.note);
    const noteCopy = JSON.parse(JSON.stringify(props.note));

    // Assurer que les dates sont valides
    noteCopy.createdAt = safeDate(noteCopy.createdAt);
    noteCopy.updatedAt = safeDate(noteCopy.updatedAt);

    editingNote.value = noteCopy;
  } else if (props.isNewNote && props.location) {
    // Création d'une nouvelle note
    console.log('[NoteEditModal] Création d\'une nouvelle note avec location:', props.location);

    // Traiter la localisation pour gérer à la fois les formats [lat, lng] et GeoJSON
    const processedLocation = processLocation(props.location);

    editingNote.value = {
      title: 'Nouvelle note',
      description: '',
      location: processedLocation,
      columnId: notesStore.getDefaultColumn.id || '1', // Utiliser la colonne par défaut
      accessLevel: NoteAccessLevel.PRIVATE, // Définir explicitement le niveau d'accès par défaut
      style: {
        color: '#3B82F6',
        weight: 2,
        opacity: 1,
        fillColor: '#3B82F6',
        fillOpacity: 0.6,
        radius: 8
      },
      comments: [],
      photos: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    console.log('[NoteEditModal] Niveau d\'accès initial:', editingNote.value.accessLevel);
  } else {
    console.error('[NoteEditModal] Erreur: Ni note existante ni nouvelle note avec location');
  }

  console.log('[NoteEditModal] editingNote.value après initialisation:', editingNote.value);
});

// Colonnes triées
const sortedColumns = computed(() => notesStore.getSortedColumns);

// Niveaux d'accès
const accessLevels = [
  { id: NoteAccessLevel.PRIVATE, title: 'Privé', description: 'Visible uniquement par vous' },
  { id: NoteAccessLevel.COMPANY, title: 'Entreprise', description: 'Visible par l\'entreprise uniquement' },
  { id: NoteAccessLevel.EMPLOYEE, title: 'Salariés', description: 'Visible par l\'entreprise et les salariés' },
  { id: NoteAccessLevel.VISITOR, title: 'Visiteurs', description: 'Visible par tous' }
];

// Couleurs disponibles
const colors = [
  '#3B82F6', // Bleu
  '#10B981', // Vert
  '#F59E0B', // Orange
  '#EF4444', // Rouge
  '#8B5CF6', // Violet
  '#EC4899', // Rose
  '#6B7280'  // Gris
];

// Mettre à jour la couleur de la note
function updateNoteColor(color: string) {
  editingNote.value.style.color = color;
  editingNote.value.style.fillColor = color;

  // Émettre un événement personnalisé pour mettre à jour la couleur sur la carte
  const event = new CustomEvent('geonote:updateStyle', {
    detail: {
      noteId: props.note?.id,
      style: {
        color: color,
        fillColor: color
      }
    }
  });
  window.dispatchEvent(event);
}

// Fermer le modal
function closeModal() {
  emit('close');
}

// Sauvegarder la note
async function saveNote() {
  try {
    // Convertir la localisation au format GeoJSON pour le backend
    const locationGeoJSON = Array.isArray(editingNote.value.location)
      ? {
          type: 'Point',
          coordinates: [editingNote.value.location[1], editingNote.value.location[0]] // [lng, lat]
        }
      : editingNote.value.location;

    const noteData = {
      title: editingNote.value.title,
      description: editingNote.value.description,
      location: locationGeoJSON,
      columnId: editingNote.value.columnId,
      style: editingNote.value.style,
      access_level: editingNote.value.accessLevel, // Utiliser access_level pour le backend
      comments: editingNote.value.comments || [],
      photos: editingNote.value.photos || []
    };

    console.log('[NoteEditModal] Données de note à sauvegarder:', noteData);
    console.log('[NoteEditModal] Niveau d\'accès:', editingNote.value.accessLevel);

    let savedNote;
    if (props.note?.id) {
      // Mise à jour d'une note existante
      const response = await noteService.updateNote(props.note.id, {
        ...noteData,
        access_level: editingNote.value.accessLevel // Utiliser access_level pour le backend
      });
      savedNote = response.data;

      // Mettre à jour le store avec les données modifiées
      notesStore.updateNote(props.note.id, {
        ...editingNote.value,
        ...savedNote,
        accessLevel: editingNote.value.accessLevel,
        updatedAt: new Date().toISOString()
      });

      notificationStore.success('Note mise à jour avec succès');
    } else {
      // Création d'une nouvelle note
      const response = await noteService.createNote({
        ...noteData,
        access_level: editingNote.value.accessLevel // Utiliser access_level pour le backend
      });
      savedNote = response.data;

      // Mettre à jour le store avec la nouvelle note
      const defaultColumn = notesStore.getDefaultColumn;
      const storeNote = {
        ...noteData,
        id: savedNote.id,
        columnId: noteData.columnId || defaultColumn.id,
        accessLevel: editingNote.value.accessLevel,
        style: noteData.style || {
          color: '#3B82F6',
          weight: 2,
          opacity: 1,
          fillColor: '#3B82F6',
          fillOpacity: 0.2
        }
      };

      console.log('[NoteEditModal] Note à ajouter au store:', storeNote);
      notesStore.addNote(storeNote);

      notificationStore.success('Note créée avec succès');
    }

    // Émettre l'événement save avec la note sauvegardée
    emit('save', savedNote);
    emit('close');
  } catch (error) {
    console.error('[NoteEditModal] Erreur lors de la sauvegarde de la note:', error);
    notificationStore.error('Erreur lors de la sauvegarde de la note');
  }
}
</script>
