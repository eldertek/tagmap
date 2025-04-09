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
                  <span v-if="commentsCount > 0" class="ml-1 px-2 py-0.5 text-xs rounded-full bg-primary-100 text-primary-800">
                    {{ commentsCount }}
                  </span>
                </button>
                <button
                  type="button"
                  @click="activeTab = 'photos'"
                  class="px-3 py-2 text-sm font-medium border-b-2 focus:outline-none"
                  :class="activeTab === 'photos' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
                >
                  Photos
                  <span v-if="photosCount > 0" class="ml-1 px-2 py-0.5 text-xs rounded-full bg-primary-100 text-primary-800">
                    {{ photosCount }}
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

              <!-- Indicateur de géolocalisation -->
              <div class="mb-4 p-2 rounded bg-gray-50 flex items-center" v-if="editingNote.location">
                <div class="text-primary-600 mr-2">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
                  </svg>
                </div>
                <div class="text-sm text-gray-600">
                  Note géolocalisée
                </div>
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
              <!-- Déboguer les commentaires -->
              <div class="hidden">
                {{ console.log('[NoteEditModal] Commentaires passés au composant:', editingNote.comments) }}
              </div>
              <CommentThread
                v-if="note"
                :noteId="note.id"
                :comments="editingNote.comments || []"
                @comment-added="handleCommentAdded"
                @comment-deleted="handleCommentDeleted"
              />
            </div>

            <!-- Onglet Photos -->
            <div v-else-if="activeTab === 'photos'" class="mt-4">
              <PhotoGallery
                v-if="note"
                :noteId="note.id"
                :photos="editingNote.photos || []"
                @photo-added="handlePhotoAdded"
                @photo-deleted="handlePhotoDeleted"
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
import { ref, computed, onMounted, watch } from 'vue';
import { useNotesStore, type Note, NoteAccessLevel } from '../stores/notes';
import { useNotificationStore } from '../stores/notification';
import { noteService } from '../services/api';
import CommentThread from './CommentThread.vue';
import PhotoGallery from './PhotoGallery.vue';

const props = defineProps<{
  note: Note | null;
  isNewNote?: boolean;
  location?: [number, number] | { type: string; coordinates: [number, number] } | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'save', note: Note): void;
}>();

const notesStore = useNotesStore();
const notificationStore = useNotificationStore();
const activeTab = ref('info');

// Pour le débogage dans le template
const console = window.console;

// Surveiller les changements d'onglet
watch(activeTab, async (newTab) => {
  console.log('[NoteEditModal] Onglet actif changé:', newTab);

  // Si l'onglet Commentaires est sélectionné, recharger les commentaires
  if (newTab === 'comments' && props.note && props.note.id) {
    console.log('[NoteEditModal] Onglet Commentaires sélectionné, commentaires actuels:', editingNote.value.comments);

    // Recharger les commentaires pour s'assurer qu'ils sont à jour
    await loadNoteComments(props.note.id);
  }

  // Si l'onglet Photos est sélectionné, recharger les photos
  if (newTab === 'photos' && props.note && props.note.id) {
    console.log('[NoteEditModal] Onglet Photos sélectionné, photos actuelles:', editingNote.value.photos);

    // Recharger les photos pour s'assurer qu'elles sont à jour
    await loadNotePhotos(props.note.id);
  }
});

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

// Fonction pour charger les commentaires d'une note
async function loadNoteComments(noteId: number) {
  try {
    console.log(`[NoteEditModal] Chargement des commentaires pour la note ${noteId}`);
    const response = await noteService.getComments(noteId);
    console.log('[NoteEditModal] Commentaires reçus:', response.data);

    // Transformer les commentaires du format API au format du store
    const comments = response.data.map((comment: any) => ({
      id: comment.id,
      text: comment.text,
      createdAt: comment.created_at,
      userId: comment.user,
      userName: comment.user_name,
      userRole: comment.user_role
    }));

    console.log('[NoteEditModal] Commentaires transformés:', comments);

    // Mettre à jour la note dans le store
    if (props.note) {
      notesStore.updateNote(props.note.id, { comments });

      // Mettre à jour la copie locale pour l'édition
      editingNote.value.comments = comments;

      console.log('[NoteEditModal] Commentaires mis à jour dans le store et localement');
      console.log('[NoteEditModal] editingNote.comments après mise à jour:', editingNote.value.comments);
    }

    return comments;
  } catch (error) {
    console.error('[NoteEditModal] Erreur lors du chargement des commentaires:', error);
    notificationStore.error('Erreur lors du chargement des commentaires');
    return [];
  }
}

// Fonction pour charger les photos d'une note
async function loadNotePhotos(noteId: number) {
  try {
    console.log(`[NoteEditModal] Chargement des photos pour la note ${noteId}`);
    const response = await noteService.getPhotos(noteId);
    console.log('[NoteEditModal] Photos reçues:', response.data);

    // Transformer les photos du format API au format du store
    const photos = response.data.map((photo: any) => ({
      id: photo.id,
      url: photo.image,
      createdAt: photo.created_at,
      caption: photo.caption
    }));

    // Mettre à jour la note dans le store
    if (props.note) {
      notesStore.updateNote(props.note.id, { photos });

      // Mettre à jour la copie locale pour l'édition
      editingNote.value.photos = photos;

      console.log('[NoteEditModal] Photos mises à jour dans le store et localement');
    }

    return photos;
  } catch (error) {
    console.error('[NoteEditModal] Erreur lors du chargement des photos:', error);
    notificationStore.error('Erreur lors du chargement des photos');
    return [];
  }
}

// Initialiser les données d'édition
onMounted(async () => {
  console.log('[NoteEditModal] onMounted - props:', props);

  // S'assurer que les colonnes sont chargées
  await notesStore.loadColumns();
  console.log('[NoteEditModal] Colonnes chargées:', notesStore.columns);

  if (props.note) {
    // Édition d'une note existante
    console.log('[NoteEditModal] Édition d\'une note existante:', props.note);
    const noteCopy = JSON.parse(JSON.stringify(props.note));

    // Assurer que les dates sont valides
    noteCopy.createdAt = safeDate(noteCopy.createdAt);
    noteCopy.updatedAt = safeDate(noteCopy.updatedAt);

    editingNote.value = noteCopy;

    // Charger les commentaires et photos si la note existe
    if (props.note.id) {
      console.log('[NoteEditModal] Chargement des commentaires et photos...');

      // Charger les commentaires et photos en parallèle
      await Promise.all([
        loadNoteComments(props.note.id),
        loadNotePhotos(props.note.id)
      ]);

      // Forcer une mise à jour des computed
      console.log('[NoteEditModal] Après chargement - Commentaires:', editingNote.value.comments?.length || 0);
      console.log('[NoteEditModal] Après chargement - Photos:', editingNote.value.photos?.length || 0);

      // Attendre le prochain cycle de rendu pour s'assurer que les compteurs sont mis à jour
      setTimeout(() => {
        console.log('[NoteEditModal] Compteurs après timeout - Commentaires:', commentsCount.value);
        console.log('[NoteEditModal] Compteurs après timeout - Photos:', photosCount.value);
      }, 0);
    }
  } else if (props.isNewNote) {
    // Création d'une nouvelle note
    console.log('[NoteEditModal] Création d\'une nouvelle note');

    // Note de base
    editingNote.value = {
      title: 'Nouvelle note',
      description: '',
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

    // Si une localisation est fournie, l'ajouter à la note
    if (props.location) {
      console.log('[NoteEditModal] Ajout de la localisation:', props.location);
      // Traiter la localisation pour gérer à la fois les formats [lat, lng] et GeoJSON
      const processedLocation = processLocation(props.location);
      editingNote.value.location = processedLocation;
    }

    console.log('[NoteEditModal] Niveau d\'accès initial:', editingNote.value.accessLevel);
  } else {
    console.error('[NoteEditModal] Erreur: Ni note existante ni nouvelle note');
  }

  console.log('[NoteEditModal] editingNote.value après initialisation:', editingNote.value);
});

// Colonnes triées
const sortedColumns = computed(() => notesStore.getSortedColumns);

// Nombre de commentaires et photos
const commentsCount = computed(() => {
  const count = editingNote.value.comments?.length || 0;
  console.log('[NoteEditModal] Computed commentsCount recalculé:', count);
  return count;
});

const photosCount = computed(() => {
  const count = editingNote.value.photos?.length || 0;
  console.log('[NoteEditModal] Computed photosCount recalculé:', count);
  return count;
});

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
const updateNoteColor = (color: string) => {
  if (!editingNote.value.style) {
    editingNote.value.style = {
      color: color,
      weight: 2,
      opacity: 1,
      fillColor: color,
      fillOpacity: 0.6,
      radius: 8
    };
  } else {
    editingNote.value.style.color = color;
    editingNote.value.style.fillColor = color;
  }
  editingNote.value.color = color; // Sauvegarder la couleur dans la note elle-même
};

// Initialiser la note avec les valeurs par défaut
const initializeEditingNote = () => {
  editingNote.value = {
    title: props.note?.title || '',
    description: props.note?.description || '',
    columnId: props.note?.columnId || '',
    accessLevel: props.note?.accessLevel || 'private',
    style: props.note?.style || {
      color: props.note?.color || '#3B82F6',
      weight: 2,
      opacity: 1,
      fillColor: props.note?.color || '#3B82F6',
      fillOpacity: 0.6,
      radius: 8
    },
    color: props.note?.color || '#3B82F6', // Ajouter la couleur directement dans la note
    location: props.location || props.note?.location || null,
    comments: props.note?.comments || [],
    photos: props.note?.photos || []
  };
};

// Appeler l'initialisation au montage du composant
onMounted(() => {
  initializeEditingNote();
});

// Surveiller les changements de la note
watch(() => props.note, () => {
  initializeEditingNote();
}, { deep: true });

// Fermer le modal
function closeModal() {
  emit('close');
}

// Gérer l'ajout d'un commentaire
async function handleCommentAdded() {
  console.log('[NoteEditModal] Commentaire ajouté, le modal reste ouvert');

  // Recharger les commentaires pour mettre à jour l'affichage
  if (props.note && props.note.id) {
    await loadNoteComments(props.note.id);
  }
}

// Gérer l'ajout d'une photo
async function handlePhotoAdded() {
  console.log('[NoteEditModal] Photo ajoutée, le modal reste ouvert');

  // Recharger les photos pour mettre à jour l'affichage
  if (props.note && props.note.id) {
    await loadNotePhotos(props.note.id);
  }
}

// Gérer la suppression d'un commentaire
async function handleCommentDeleted() {
  console.log('[NoteEditModal] Commentaire supprimé, mise à jour de la liste');
  if (props.note && props.note.id) {
    await loadNoteComments(props.note.id);
  }
}

// Gérer la suppression d'une photo
async function handlePhotoDeleted() {
  console.log('[NoteEditModal] Photo supprimée, mise à jour de la liste');
  if (props.note && props.note.id) {
    await loadNotePhotos(props.note.id);
  }
}

// Sauvegarder la note
async function saveNote() {
  try {
    // Préparer les données pour l'envoi
    const noteData: any = {
      title: editingNote.value.title,
      description: editingNote.value.description,
      columnId: editingNote.value.columnId,
      style: editingNote.value.style,
      access_level: editingNote.value.accessLevel,
      comments: editingNote.value.comments || [],
      photos: editingNote.value.photos || []
    };

    // Ajouter la localisation seulement si elle existe
    if (editingNote.value.location) {
      noteData.location = Array.isArray(editingNote.value.location)
        ? {
            type: 'Point',
            coordinates: [editingNote.value.location[1], editingNote.value.location[0]]
          }
        : editingNote.value.location;
    }

    console.log('[NoteEditModal] Données de note à sauvegarder:', noteData);

    let savedNote;
    if (props.note?.id) {
      // Mise à jour d'une note existante
      const response = await noteService.updateNote(props.note.id, noteData);
      savedNote = response.data;

      // Mettre à jour le store avec les données modifiées
      notesStore.updateNote(props.note.id, {
        ...editingNote.value,
        ...savedNote,
        accessLevel: editingNote.value.accessLevel,
        style: editingNote.value.style,
        updatedAt: new Date().toISOString()
      });

      // Émettre un événement pour mettre à jour le style sur la carte
      const noteId = props.note.id;
      const updateEvent = new CustomEvent('geonote:update', {
        detail: {
          noteId: noteId,
          properties: {
            name: editingNote.value.title,
            description: editingNote.value.description,
            columnId: editingNote.value.columnId,
            accessLevel: editingNote.value.accessLevel,
            style: editingNote.value.style
          }
        }
      });
      window.dispatchEvent(updateEvent);
      
      // Ajouter un délai pour s'assurer que les composants ont eu le temps de traiter l'événement
      setTimeout(() => {
        // Ré-émettre l'événement après un court délai pour s'assurer que le popup est correctement mis à jour
        window.dispatchEvent(updateEvent);
        console.log('[NoteEditModal] Événement de mise à jour ré-émis pour garantir la mise à jour du popup');
      }, 100);

      notificationStore.success('Note mise à jour avec succès');
    } else {
      // Création d'une nouvelle note
      const response = await noteService.createNote(noteData);
      savedNote = response.data;

      // Vérifier que le backend a fourni un ID
      if (!savedNote.id) {
        throw new Error('Le backend n\'a pas fourni d\'ID pour la nouvelle note');
      }

      // Mettre à jour le store avec la nouvelle note
      const defaultColumn = notesStore.getDefaultColumn;
      const storeNote = {
        ...noteData,
        id: savedNote.id, // Utiliser l'ID fourni par le backend
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

      console.log('[NoteEditModal] Note à ajouter au store avec ID backend:', savedNote.id);
      notesStore.addNote(storeNote);

      notificationStore.success('Note créée avec succès');
    }

    // S'assurer que les commentaires et photos sont inclus dans la note sauvegardée
    if (savedNote) {
      // Si les commentaires ou photos ne sont pas inclus dans la réponse du backend,
      // utiliser ceux de l'objet d'édition
      if (!savedNote.comments && editingNote.value.comments) {
        savedNote.comments = editingNote.value.comments;
      }
      if (!savedNote.photos && editingNote.value.photos) {
        savedNote.photos = editingNote.value.photos;
      }
    }

    // Émettre l'événement save avec la note sauvegardée complète
    emit('save', savedNote);
    emit('close');
  } catch (error) {
    console.error('[NoteEditModal] Erreur lors de la sauvegarde de la note:', error);
    notificationStore.error('Erreur lors de la sauvegarde de la note');
  }
}
</script>
