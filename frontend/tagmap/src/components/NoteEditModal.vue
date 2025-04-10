<template>
  <div class="modal-overlay" @click.self="closeModal">
    <div class="modal-container">
      <form @submit.prevent="saveNote" class="modal-form">
        <!-- Header fixe -->
        <div class="modal-header">
          <h3 class="modal-title">{{ note?.id ? 'Modifier la note' : 'Nouvelle note' }}</h3>
          <button type="button" @click="closeModal" class="close-button">
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Onglets de navigation -->
        <div class="modal-tabs">
          <button
            type="button"
            @click="activeTab = 'info'"
            class="tab-button"
            :class="{ active: activeTab === 'info' }"
          >
            Informations
          </button>
          <button
            type="button"
            @click="activeTab = 'comments'"
            class="tab-button"
            :class="{ active: activeTab === 'comments' }"
          >
            Commentaires
            <span v-if="commentsCount > 0" class="badge">{{ commentsCount }}</span>
          </button>
          <button
            type="button"
            @click="activeTab = 'photos'"
            class="tab-button"
            :class="{ active: activeTab === 'photos' }"
          >
            Photos
            <span v-if="photosCount > 0" class="badge">{{ photosCount }}</span>
          </button>
        </div>

        <!-- Contenu scrollable -->
        <div class="modal-content">
          <!-- Onglet Informations -->
          <div v-if="activeTab === 'info'" class="tab-content">
            <div class="form-group">
              <label for="title">Titre</label>
              <input type="text" id="title" v-model="editingNote.title" required />
            </div>
            <div class="form-group">
              <label for="description">Description</label>
              <textarea id="description" v-model="editingNote.description" rows="3"></textarea>
            </div>

            <!-- Indicateur de géolocalisation -->
            <div class="location-indicator" v-if="editingNote.location">
              <svg xmlns="http://www.w3.org/2000/svg" class="icon" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
              </svg>
              <span>Note géolocalisée</span>
            </div>

            <div class="form-group">
              <label for="column">État</label>
              <select id="column" v-model="editingNote.columnId">
                <option v-for="column in sortedColumns" :key="column.id" :value="column.id">
                  {{ column.title }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label for="accessLevel">Niveau d'accès</label>
              <select id="accessLevel" v-model="editingNote.accessLevel">
                <option v-for="level in accessLevels" :key="level.id" :value="level.id">
                  {{ level.title }} - {{ level.description }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label>Couleur</label>
              <div class="color-picker">
                <div
                  v-for="color in colors"
                  :key="color"
                  class="color-option"
                  :class="{ selected: editingNote.style.color === color }"
                  :style="{ backgroundColor: color }"
                  @click="updateNoteColor(color)"
                ></div>
              </div>
            </div>
          </div>

          <!-- Onglet Commentaires -->
          <div v-else-if="activeTab === 'comments'" class="tab-content">
            <CommentThread
              v-if="note"
              :noteId="note.id"
              :comments="editingNote.comments || []"
              @comment-added="handleCommentAdded"
              @comment-deleted="handleCommentDeleted"
            />
          </div>

          <!-- Onglet Photos -->
          <div v-else-if="activeTab === 'photos'" class="tab-content">
            <PhotoGallery
              v-if="note"
              :noteId="note.id"
              :photos="editingNote.photos || []"
              @photo-added="handlePhotoAdded"
              @photo-deleted="handlePhotoDeleted"
            />
          </div>
        </div>

        <!-- Footer fixe -->
        <div class="modal-footer">
          <button type="submit" class="primary-button">Enregistrer</button>
          <button type="button" @click="closeModal" class="secondary-button">Annuler</button>
        </div>
      </form>
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
        color: '#2b6451',
        weight: 2,
        opacity: 1,
        fillColor: '#2b6451',
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

  // Émettre un événement pour mettre à jour immédiatement le style sur la carte
  if (props.note?.id) {
    console.log('[NoteEditModal] Émission de l\'événement de mise à jour de couleur:', color);
    const updateEvent = new CustomEvent('geonote:updateStyle', {
      detail: {
        noteId: props.note.id,
        style: {
          color: color,
          fillColor: color
        }
      }
    });
    window.dispatchEvent(updateEvent);

    // Émettre également l'événement de mise à jour complète pour le popup
    const fullUpdateEvent = new CustomEvent('geonote:update', {
      detail: {
        noteId: props.note.id,
        properties: {
          name: editingNote.value.title,
          description: editingNote.value.description,
          columnId: editingNote.value.columnId,
          accessLevel: editingNote.value.accessLevel,
          style: editingNote.value.style
        }
      }
    });
    window.dispatchEvent(fullUpdateEvent);
  }
};

// Initialiser la note avec les valeurs par défaut
const initializeEditingNote = () => {
  editingNote.value = {
    title: props.note?.title || '',
    description: props.note?.description || '',
    columnId: props.note?.columnId || '',
    accessLevel: props.note?.accessLevel || 'private',
    style: props.note?.style || {
      color: '#2b6451',
      weight: 2,
      opacity: 1,
      fillColor: '#2b6451',
      fillOpacity: 0.6,
      radius: 8
    },
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
    // S'assurer que le style contient la couleur sélectionnée
    const selectedColor = editingNote.value.style.color;
    editingNote.value.style = {
      ...editingNote.value.style,
      color: selectedColor,
      fillColor: selectedColor,
      weight: 2,
      opacity: 1,
      fillOpacity: 0.6,
      radius: 8
    };

    // Préparer les données pour l'envoi
    const noteData: any = {
      title: editingNote.value.title,
      description: editingNote.value.description,
      columnId: editingNote.value.columnId,
      style: editingNote.value.style,
      access_level: editingNote.value.accessLevel,
      comments: editingNote.value.comments || [],
      photos: editingNote.value.photos || [],
      color: selectedColor // Ajouter explicitement la couleur
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
        color: selectedColor, // S'assurer que la couleur est mise à jour dans le store
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
            style: editingNote.value.style,
            color: selectedColor // Inclure la couleur dans l'événement de mise à jour
          }
        }
      });
      window.dispatchEvent(updateEvent);

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
        id: savedNote.id,
        columnId: noteData.columnId || defaultColumn.id,
        accessLevel: editingNote.value.accessLevel,
        style: noteData.style,
        color: selectedColor // S'assurer que la couleur est incluse
      };

      console.log('[NoteEditModal] Note à ajouter au store avec ID backend:', savedNote.id);
      notesStore.addNote(storeNote);

      notificationStore.success('Note créée avec succès');
    }

    // S'assurer que les commentaires et photos sont inclus dans la note sauvegardée
    if (savedNote) {
      if (!savedNote.comments && editingNote.value.comments) {
        savedNote.comments = editingNote.value.comments;
      }
      if (!savedNote.photos && editingNote.value.photos) {
        savedNote.photos = editingNote.value.photos;
      }
      // S'assurer que la couleur est incluse dans la note sauvegardée
      savedNote.color = selectedColor;
      savedNote.style = {
        ...savedNote.style,
        color: selectedColor,
        fillColor: selectedColor
      };
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

<style scoped>
/* Styles de base */
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.modal-container {
  width: 100%;
  height: 100%;
  max-width: 42rem;
  max-height: 90vh;
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-form {
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* Header */
.modal-header {
  padding: 1rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: white;
  position: sticky;
  top: 0;
  z-index: 10;
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
}

.close-button {
  color: #6b7280;
  padding: 0.5rem;
  border-radius: 0.375rem;
  transition: all 0.2s;
}

.close-button:hover {
  color: #374151;
  background-color: #f3f4f6;
}

/* Onglets */
.modal-tabs {
  display: flex;
  border-bottom: 1px solid #e5e7eb;
  background-color: white;
  position: sticky;
  top: 4rem;
  z-index: 10;
}

.tab-button {
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #6b7280;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.tab-button.active {
  color: #3b82f6;
  border-bottom-color: #3b82f6;
}

.badge {
  background-color: #eef2ff;
  color: #3b82f6;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.75rem;
}

/* Contenu */
.modal-content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  -webkit-overflow-scrolling: touch;
}

.tab-content {
  max-width: 100%;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.5rem;
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* Indicateur de localisation */
.location-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background-color: #f3f4f6;
  border-radius: 0.375rem;
  margin-bottom: 1rem;
}

.location-indicator .icon {
  width: 1.25rem;
  height: 1.25rem;
  color: #3b82f6;
}

.location-indicator span {
  font-size: 0.875rem;
  color: #4b5563;
}

/* Sélecteur de couleur */
.color-picker {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.color-option {
  width: 2rem;
  height: 2rem;
  border-radius: 9999px;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s;
}

.color-option.selected {
  border-color: #111827;
  transform: scale(1.1);
}

/* Footer */
.modal-footer {
  padding: 1rem;
  border-top: 1px solid #e5e7eb;
  background-color: #f9fafb;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  position: sticky;
  bottom: 0;
  z-index: 10;
}

.primary-button,
.secondary-button {
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s;
}

.primary-button {
  background-color: #3b82f6;
  color: white;
  border: none;
}

.primary-button:hover {
  background-color: #2563eb;
}

.secondary-button {
  background-color: white;
  color: #374151;
  border: 1px solid #d1d5db;
}

.secondary-button:hover {
  background-color: #f3f4f6;
}

/* Styles mobiles */
@media (max-width: 768px) {
  .modal-container {
    width: 100%;
    height: 100%;
    max-width: none;
    max-height: none;
    border-radius: 0;
  }

  .modal-content {
    padding-bottom: calc(1rem + env(safe-area-inset-bottom, 0));
  }

  .modal-footer {
    padding-bottom: calc(1rem + env(safe-area-inset-bottom, 0));
  }

  .primary-button,
  .secondary-button {
    flex: 1;
  }
}

/* Scrollbar personnalisée */
.modal-content::-webkit-scrollbar {
  width: 6px;
}

.modal-content::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.modal-content::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.modal-content::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>
