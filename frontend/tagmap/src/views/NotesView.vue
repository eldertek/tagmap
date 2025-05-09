<template>
  <div class="min-h-full bg-gray-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="sm:flex sm:items-center">
        <div class="sm:flex-auto">
          <h1 class="text-2xl font-semibold text-gray-900">Notes</h1>
          <p class="mt-2 text-sm text-gray-700">
            Liste de toutes vos notes.
          </p>
        </div>
        <div class="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <div class="relative" ref="dropdownRef">
            <button
              @click="toggleDropdown"
              class="inline-flex items-center justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 sm:w-auto"
            >
              Créer
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <!-- Menu déroulant -->
            <div
              v-if="showDropdown"
              class="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10"
            >
              <div class="py-1">
                <button
                  @click="createSimpleNote"
                  class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Note simple
                </button>
                <button
                  @click="goToMap"
                  class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Note géolocalisée
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Filtres de recherche -->
      <div class="mt-6 bg-white shadow rounded-lg p-4">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label for="search" class="block text-sm font-medium text-gray-700">Recherche</label>
            <input
              type="text"
              id="search"
              v-model="filters.search"
              placeholder="Rechercher par titre ou description..."
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            />
          </div>
          <div>
            <label for="date" class="block text-sm font-medium text-gray-700">Date</label>
            <select
              id="date"
              v-model="filters.date"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            >
              <option value="">Toutes les dates</option>
              <option value="today">Aujourd'hui</option>
              <option value="week">Cette semaine</option>
              <option value="month">Ce mois</option>
            </select>
          </div>
          <div>
            <label for="accessLevel" class="block text-sm font-medium text-gray-700">Niveau d'accès</label>
            <select
              id="accessLevel"
              v-model="filters.accessLevel"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            >
              <option value="">Tous les niveaux</option>
              <option v-for="level in ACCESS_LEVELS" :key="level.id" :value="level.id">{{ level.title }}</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Tableau de type Trello -->
      <div v-if="loading" class="mt-6 p-6 text-center bg-white shadow rounded-lg">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <p class="mt-2 text-sm text-gray-500">Chargement des notes...</p>
      </div>

      <div v-else class="mt-6 pb-4">
        <div v-if="filteredNotes.length === 0" class="p-6 text-center bg-white shadow rounded-lg mb-4">
          <p class="text-sm text-gray-500">Aucune note trouvée</p>
        </div>

        <!-- Colonnes de notes (drag and drop désactivé) -->
        <div v-if="filteredNotes.length > 0" class="md:flex md:space-x-4 md:overflow-x-auto gap-4 grid grid-cols-1">
          <div v-for="column in columnsForDrag" :key="column.id" class="column-wrapper md:w-80 md:flex-shrink-0 mb-4 md:mb-0">
              <div class="bg-white rounded-lg shadow overflow-hidden">
                <!-- En-tête de colonne (sans poignée de drag) -->
                <div
                  class="p-3 flex items-center justify-between no-select"
                  :style="{ backgroundColor: column.color + '20', borderBottom: '2px solid ' + column.color }"
                >
                  <div class="flex items-center">
                    <h3 class="text-sm font-semibold" :style="{ color: column.color }">
                      {{ column.title }}
                    </h3>
                  </div>
                  <div class="flex items-center">
                    <span class="text-xs text-gray-500 bg-white px-2 py-1 rounded-full">
                      {{ getNotesByColumn(column.id).length }}
                    </span>
                  </div>
                </div>

                <!-- Liste des notes dans cette colonne -->
                <div class="p-2">
                  <div class="min-h-[100px] draggable-container">
                    <draggable
                      :list="getNotesByColumn(column.id)"
                      class="space-y-2 empty-column-drop-zone"
                      group="notes"
                      item-key="id"
                      :handle="isMobile ? null : '.note-drag-handle'"
                      @change="(event) => onDragChange(event, column.id)"
                      :animation="150"
                      ghost-class="ghost-card"
                      chosen-class="chosen"
                      drag-class="dragging"
                      :disabled="isMobile"
                    >
                      <template #item="{element: note}">
                        <div class="note-container">
                          <!-- Carte de note -->
                          <div class="bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden">
                            <div class="p-3 flex items-center justify-between" :class="{ 'note-drag-handle cursor-move': !isMobile, 'no-select': true }">
                              <div class="flex items-center">
                                <svg v-if="!isMobile" class="h-4 w-4 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" />
                                </svg>
                                <h4 class="text-sm font-medium text-gray-900 truncate">{{ note.title }}</h4>
                              </div>
                              <div>
                                <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                                  :style="{ backgroundColor: getAccessLevelColor(note.accessLevel) + '20', color: getAccessLevelColor(note.accessLevel) }">
                                  {{ getAccessLevelLabel(note.accessLevel) || 'Non défini' }}
                                </span>
                              </div>
                            </div>
                            <div class="px-3 py-2">
                              <p class="text-sm text-gray-500 line-clamp-2">{{ note.description || 'Aucune description' }}</p>
                            </div>
                            <div class="px-3 py-2 bg-gray-50 border-t border-gray-100 flex items-center space-x-2">
                              <span v-if="authStore.isAdmin" class="text-xs text-gray-700">
                                {{ note.enterprise_name || 'Non assignée' }}
                              </span>
                              <div class="flex space-x-1 ml-auto">
                                <!-- Indicateur de note géolocalisée ou non -->
                                <span v-if="note.location" class="text-xs text-primary-500 flex items-center mr-1" title="Note géolocalisée">
                                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                </span>
                                <span v-else class="text-xs text-gray-400 flex items-center mr-1" title="Note simple">
                                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                </span>

                                <!-- Boutons d'interaction avec la carte, uniquement pour les notes géolocalisées -->
                                <template v-if="note.location">
                                  <button @click="openInGoogleMaps(note)" class="p-1 text-gray-400 hover:text-primary-500 focus:outline-none" title="Ouvrir dans Google Maps">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                  </button>
                                  <button @click="viewOnMap(note)" class="p-1 text-gray-400 hover:text-primary-500 focus:outline-none" title="Voir sur la carte">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                    </svg>
                                  </button>
                                </template>

                                <!-- Boutons d'édition et de suppression pour toutes les notes -->
                                <button @click="editNote(note)" class="p-1 text-gray-400 hover:text-primary-500 focus:outline-none" title="Éditer la note">
                                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button @click="confirmDeleteNote(note)" class="p-1 text-gray-400 hover:text-red-500 focus:outline-none" title="Supprimer la note">
                                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </template>
                      <template #empty-content>
                        <div class="p-4 text-center text-gray-400 text-sm italic">
                          Aucune note dans cette colonne
                        </div>
                      </template>
                    </draggable>
                  </div>
                </div>
              </div>
            </div>
        </div>
      </div>
    </div>

    <!-- Modal de confirmation de suppression -->
    <div v-if="showDeleteModal" class="fixed z-[3001] inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div class="flex items-center justify-center min-h-screen w-full">
        <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
        <div class="relative bg-white w-full md:rounded-lg md:max-w-lg md:h-auto md:max-h-[90vh] md:my-8 shadow-xl transform transition-all overflow-hidden mx-auto my-auto">
          <div class="p-4 md:p-6">
            <div class="flex items-start">
              <div class="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg class="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div class="ml-4 flex-1">
                <h3 class="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                  Supprimer la note
                </h3>
                <div class="mt-2">
                  <p class="text-sm text-gray-500">
                    Êtes-vous sûr de vouloir supprimer cette note ? Cette action est irréversible.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div class="mt-6 flex flex-col-reverse sm:flex-row-reverse sm:justify-end gap-3 p-4 md:px-6">
            <button @click="deleteNote" type="button" class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:w-auto sm:text-sm">
              Supprimer
            </button>
            <button @click="showDeleteModal = false" type="button" class="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:w-auto sm:text-sm">
              Annuler
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal d'édition de note -->
    <NoteEditModal
      v-if="showEditModal"
      :note="editingNote"
      :is-new-note="!editingNote?.id"
      :location="editingNote?.location"
      @close="showEditModal = false"
      @save="handleNoteSave"
    />


  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { useNotificationStore } from '../stores/notification';
import { useNotesStore, type Note, NoteAccessLevel } from '../stores/notes';
import { useAuthStore, formatUserName } from '../stores/auth';
import { noteService, userService } from '../services/api';
import NoteEditModal from '../components/NoteEditModal.vue';
import { formatDate, parseDate } from '@/utils/dateUtils';
import { ACCESS_LEVELS } from '../utils/noteHelpers';

import draggable from 'vuedraggable';

// Liste des entreprises (pour affichage admin)
const entreprisesList = ref<Array<{ id: number; first_name?: string; last_name?: string; company_name?: string }>>([]);

// Utilisation du type Note importé depuis le store

const router = useRouter();
const notificationStore = useNotificationStore();
const notesStore = useNotesStore();
const authStore = useAuthStore();
const loading = ref(true);
const showDeleteModal = ref(false);
const showEditModal = ref(false);
const noteToDelete = ref<Note | null>(null);
const editingNote = ref<Note | null>(null);
const activeTab = ref('info'); // Onglet actif dans le modal d'édition

// Détection du mobile
const isMobile = ref(window.innerWidth < 768);

// Mettre à jour isMobile quand la fenêtre est redimensionnée
const handleResize = () => {
  isMobile.value = window.innerWidth < 768;
};

// Colonnes fixes (drag and drop désactivé)
const columnsForDrag = computed(() => {
  const sortedColumns = notesStore.getSortedColumns;
  return sortedColumns;
});

// La colonne par défaut est gérée directement dans le store

// Niveaux d'accès disponibles

// Filtres
const filters = reactive({
  search: '',
  date: '',
  accessLevel: ''
});

// Interface pour les notes reçues du backend
interface BackendNote {
  id: number;
  title: string;
  description: string;
  location: any; // Le type exact dépend du format GeoJSON
  columnId?: string;
  column_id?: string;
  access_level: string;
  style: any;
  comments: any[];
  photos: any[];
  order: number;
  created_at: string;
  updated_at: string;
  column?: any;
  enterprise_id?: number | null;
  enterprise_name?: string;
}

// Interface pour les notes transformées
interface TransformedNote {
  id: number;
  title: string;
  description: string;
  location: any;
  columnId: string; // Assuré d'avoir une valeur après transformation
  access_level: string;
  style: any;
  comments: any[];
  photos: any[];
  order: number;
  createdAt: string;
  updatedAt: string;
  enterprise_id?: number | null;
  enterprise_name?: string;
}

// Notes filtrées
const filteredNotes = computed(() => {
  // D'abord filtrer par accès
  let filtered = notesStore.getAccessibleNotes;

  // Filtrer par recherche
  if (filters.search) {
    const searchTerm = filters.search.toLowerCase();
    filtered = filtered.filter(note =>
      note.title.toLowerCase().includes(searchTerm) ||
      note.description.toLowerCase().includes(searchTerm)
    );
  }

  // Filtrer par niveau d'accès
  if (filters.accessLevel) {
    filtered = filtered.filter(note => note.accessLevel === filters.accessLevel);
  }

  // Filtrer par date
  if (filters.date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    filtered = filtered.filter(note => {
      // Utiliser la fonction sécurisée pour éviter les erreurs de dates invalides
      const noteDate = parseDate(note.createdAt);
      if (!noteDate) return false;

      if (filters.date === 'today') {
        return noteDate >= today;
      } else if (filters.date === 'week') {
        return noteDate >= weekStart;
      } else if (filters.date === 'month') {
        return noteDate >= monthStart;
      }

      return true;
    });
  }

  return filtered;
});

// Obtenir les notes d'une colonne, après application des filtres
const getNotesByColumn = computed(() => (columnId: string) => {
  return filteredNotes.value.filter(note => note.columnId === columnId);
});

// Obtenir le libellé du niveau d'accès
function getAccessLevelLabel(level: NoteAccessLevel | undefined): string {
  if (level === undefined || level === null) {
    return 'Non défini';
  }

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
      return 'Non défini';
  }
}

// Obtenir la couleur du niveau d'accès
function getAccessLevelColor(level: NoteAccessLevel | undefined): string {
  if (level === undefined || level === null) {
    return '#9CA3AF'; // Gris par défaut
  }

  switch (level) {
    case NoteAccessLevel.PRIVATE:
      return '#9CA3AF'; // Gris
    case NoteAccessLevel.COMPANY:
      return '#EF4444'; // Rouge - pour l'entreprise uniquement
    case NoteAccessLevel.EMPLOYEE:
      return '#F59E0B'; // Orange - pour l'entreprise et salariés
    case NoteAccessLevel.VISITOR:
      return '#10B981'; // Vert - pour tous
    default:
      return '#6B7280';
  }
}

// Appeler loadInitialData au montage du composant
onMounted(() => {
  loadInitialData()
    .catch(error => {
      console.error('[NotesView] Erreur lors du chargement des données:', error);
      notificationStore.error('Erreur lors du chargement des données');
    });
  document.addEventListener('click', handleClickOutside);
  window.addEventListener('resize', handleResize);
});

// Ajouter cette fonction pour charger les données initiales
async function loadInitialData() {
  try {
    loading.value = true;

    // Charger les colonnes d'abord
    await notesStore.loadColumns();

    // Si admin, charger la liste des entreprises pour affichage
    if (authStore.isAdmin) {
      try {
        const entResp = await userService.getEntreprises();
        entreprisesList.value = entResp.data;
      } catch (error) {
        console.error('[NotesView][loadInitialData] Erreur chargement entreprises:', error);
      }
    }
    // Récupérer les notes depuis le backend

    // Préparer les filtres pour les notes
    const filters: any = {};

    // Si l'utilisateur n'est pas admin, filtrer par son entreprise
    if (!authStore.isAdmin && authStore.user?.enterprise_id) {
      filters.enterprise_id = authStore.user.enterprise_id;
    }

    const response = await noteService.getNotes(filters);
// Vérifier en détail les notes reçues
    if (response.data.length > 0) {
response.data.forEach((note: BackendNote, index: number) => {
});
    } else {
      console.warn('[NotesView][loadInitialData] Aucune note reçue du backend!');
    }

    // Vérifier les notes avec des colonnes invalides
    const validColumnIds = notesStore.columns.map(col => col.id);
    const notesWithInvalidColumns = response.data.filter((note: BackendNote) => {
      const noteColumnId = (note.column || note.column_id || '').toString();
      return noteColumnId === '' || !validColumnIds.includes(noteColumnId);
    });

    if (notesWithInvalidColumns.length > 0) {
      console.warn(`[NotesView][loadInitialData] ${notesWithInvalidColumns.length} notes avec des colonnes invalides:`, notesWithInvalidColumns);

      // Assigner les notes à la colonne "À faire" par défaut
for (const note of notesWithInvalidColumns) {
        try {
          await noteService.updateNote(note.id, { column: '2' });
        } catch (error) {
          console.error(`[NotesView][loadInitialData] Erreur lors de l'assignation de la note ${note.id} à la colonne À faire:`, error);
        }
      }
    }

    // Transformer les notes pour le store
    const transformedNotes = response.data.map((note: BackendNote & { enterprise_id?: number | null; enterprise_name?: string }): TransformedNote => {
      // Déterminer le nom de l'entreprise pour les admins
      let entName: string | undefined;
      if (authStore.isAdmin && note.enterprise_id != null) {
        // Si back-end fournit enterprise_name, l'utiliser
        if ((note as any).enterprise_name) {
          entName = (note as any).enterprise_name;
        } else {
          // Sinon, chercher localement
          const ent = entreprisesList.value.find(e => e.id === note.enterprise_id);
          entName = ent ? formatUserName(ent) : undefined;
        }
      }
      return {
        id: note.id, // Utiliser l'ID exact du backend
        title: note.title,
        description: note.description,
        location: note.location,
        columnId: (note.column || note.column_id || '2').toString(), // Utiliser la colonne À faire par défaut
        access_level: note.access_level,
        style: note.style || {},
        comments: note.comments || [],
        photos: note.photos || [],
        order: note.order || 0,
        createdAt: note.created_at,
        updatedAt: note.updated_at,
        enterprise_id: note.enterprise_id,
        enterprise_name: entName,
      };
    });

    // Vider le store avant d'ajouter les nouvelles notes
    notesStore.notes.length = 0;

    // Mettre à jour le store de notes
    transformedNotes.forEach((note: TransformedNote) => {
      notesStore.addNote(note);
    });
// Vérifier la répartition des notes par colonne
    for (const column of notesStore.columns) {
      const notesInColumn = notesStore.getNotesByColumn(column.id);
if (notesInColumn.length > 0) {
        notesInColumn.forEach((note: Note) => {
});
      }
    }
  } catch (error) {
    console.error('[NotesView][loadInitialData] Erreur:', error);
    notificationStore.error('Erreur lors du chargement des données');
  } finally {
    loading.value = false;
}
}

// Aller à la carte pour créer une note
function goToMap() {
  router.push({ path: '/', query: { tool: 'Note' } });
}

// Voir la note sur la carte
async function viewOnMap(note: Note) {
  if (!note.location) {
    notificationStore.warning('Cette note n\'est pas géolocalisée');
    return;
  }

  try {
    // Récupérer les détails de la note pour obtenir le planId
    const response = await noteService.getNote(note.id);
    const noteDetails = response.data;
    const planId = noteDetails.plan;
// Rediriger vers la carte avec tous les paramètres nécessaires
    router.push({
      path: '/',
      query: {
        lat: Array.isArray(note.location) ? note.location[0].toString() : note.location.coordinates[1].toString(),
        lng: Array.isArray(note.location) ? note.location[1].toString() : note.location.coordinates[0].toString(),
        noteId: note.id.toString(),
        planId: planId ? planId.toString() : undefined
      }
    });
  } catch (error) {
    console.error('[NotesView][viewOnMap] Erreur lors de la récupération des détails de la note:', error);
    notificationStore.error('Erreur lors de l\'ouverture de la note sur la carte');
  }
}

// Ouvrir la note dans Google Maps avec itinéraire
function openInGoogleMaps(note: Note) {
  if (!note.location) {
    notificationStore.warning('Cette note n\'est pas géolocalisée');
    return;
  }

  // Importer les utilitaires
  import('@/utils/geoUtils').then(geoUtils => {
    import('@/utils/googleMapsLoader').then(googleMapsLoader => {
      // Extraire les coordonnées à l'aide de l'utilitaire
      const latLng = geoUtils.extractLatLng(note.location);
      
      if (!latLng) {
        notificationStore.warning('Coordonnées de la note invalides');
        return;
      }
      
      // Ouvrir Google Maps en utilisant l'utilitaire
      googleMapsLoader.openInGoogleMaps(latLng.lat, latLng.lng, 'directions', note.title);
    });
  });
}

// Éditer une note
function editNote(note: Note) {
  editingNote.value = JSON.parse(JSON.stringify(note)); // Clone profond
  activeTab.value = 'info'; // Réinitialiser l'onglet actif
  showEditModal.value = true;
}

// Fonction pour gérer l'enregistrement d'une note (création ou mise à jour)
async function handleNoteSave(savedNote: any) {
// S'assurer que l'enterprise_id est défini correctement
  let enterprise_id = savedNote.enterprise_id;
  
  // Si l'enterprise_id est manquant, essayer de le déterminer automatiquement
  if (enterprise_id === undefined || enterprise_id === null) {
    if (authStore.isAdmin) {
      // Admin: peut rester null
      enterprise_id = null;
    } else if (authStore.isEntreprise && authStore.user) {
      // Entreprise: utiliser son propre ID
      enterprise_id = authStore.user.id;
    } else if (authStore.isSalarie && authStore.user?.enterprise_id) {
      // Salarié: utiliser l'ID de son entreprise
      enterprise_id = authStore.user.enterprise_id;
    } else if (authStore.isVisiteur && authStore.user) {
      // Visiteur: utiliser l'ID de l'entreprise associée (déjà fourni par le backend)
      enterprise_id = authStore.user.enterprise_id ?? null;
    } else if (!authStore.isAdmin && authStore.user?.enterprise_id) {
      // Fallback: utiliser l'enterprise_id de l'utilisateur si disponible
      enterprise_id = authStore.user.enterprise_id;
    }
// Mettre à jour la note avec l'enterprise_id déterminé
    if (enterprise_id !== null && savedNote.id) {
      notesStore.updateNote(savedNote.id, {
        enterprise_id: enterprise_id
      });
    }
  }

  // Préserver ou mettre à jour le nom de l'entreprise pour tous les utilisateurs
  if (enterprise_id !== null && savedNote.id) {
    const noteIndex = notesStore.notes.findIndex(n => n.id === savedNote.id);
    if (noteIndex !== -1) {
      // Si le nom d'entreprise n'est pas retourné par l'API, le rechercher localement
      if (!savedNote.enterprise_name) {
        const enterprise = entreprisesList.value.find(e => e.id === enterprise_id);
        if (enterprise) {
          // Mettre à jour la propriété enterprise_name en local (cast pour éviter erreur TypeScript)
          (notesStore.notes[noteIndex] as any).enterprise_name = formatUserName(enterprise);
        }
      }
    }
  }

  // Mettre à jour directement la vue sans recharger toutes les données
  // Les modifications sont déjà reflétées dans le store par le modal
}

// Confirmer la suppression d'une note
function confirmDeleteNote(note: Note) {
  noteToDelete.value = note;
  showDeleteModal.value = true;
}

// Supprimer une note
async function deleteNote() {
  if (!noteToDelete.value) return;

  try {
    // Supprimer la note du backend
    try {
      await noteService.deleteNote(noteToDelete.value.id);
    } catch (error: any) {
      // Si l'erreur est 404, la note n'existe pas dans le backend
      if (error.response && error.response.status === 404) {
} else {
        // Pour toute autre erreur, on la propage
        throw error;
      }
    }

    // Dans tous les cas, supprimer la note du store local
    notesStore.removeNote(noteToDelete.value.id);
    notificationStore.success('Note supprimée avec succès');
  } catch (error) {
    console.error('Erreur lors de la suppression de la note:', error);
    notificationStore.error('Erreur lors de la suppression de la note');
  } finally {
    showDeleteModal.value = false;
    noteToDelete.value = null;
  }
}

// Gérer les changements lors du drag and drop
async function onDragChange(event: any, columnId: string) {
  try {
    // Gérer le déplacement d'une note entre colonnes
    if (event.added) {
      const { element: note } = event.added;
// S'assurer que nous avons le bon ID de note
      const noteId = typeof note === 'object' && note.id ? note.id : null;
      if (!noteId) {
        console.error('[NotesView][onDragChange] ID de note invalide:', note);
        throw new Error('ID de note invalide');
      }

      // Mettre à jour la note dans le store
      notesStore.moveNote(noteId, columnId);

      // Réorganiser les notes dans la colonne cible
      const notesInColumn = getNotesByColumn.value(columnId);
      const noteIds = notesInColumn.map(n => n.id);
      notesStore.reorderNotes(columnId, noteIds);

      const targetColumn = notesStore.getColumnById(columnId);
      notificationStore.success(`Note déplacée vers ${targetColumn?.title || 'une autre colonne'}`);

      // Mettre à jour la note dans le backend
      await updateNoteInBackend(noteId, { columnId });
    }

    // Gérer le réordonnancement des notes dans une même colonne
    if (event.moved) {
      // Réorganiser les notes dans la colonne
      const notesInColumn = getNotesByColumn.value(columnId);
      const noteIds = notesInColumn.map(n => n.id);
      notesStore.reorderNotes(columnId, noteIds);

      notificationStore.success('Ordre des notes mis à jour');

      // Mettre à jour l'ordre des notes dans le backend
      for (const [index, note] of notesInColumn.entries()) {
        await updateNoteInBackend(note.id, { order: index });
      }
    }
  } catch (error) {
    console.error('[NotesView][onDragChange] Erreur:', error);
    notificationStore.error('Une erreur est survenue lors du déplacement de la note');
  }
}

// Fonction utilitaire pour mettre à jour une note dans le backend
async function updateNoteInBackend(noteId: number, updates: Partial<Note>) {
try {
    // Trouver la note dans le store
    const note = notesStore.notes.find(n => n.id === noteId);
    if (!note) {
      console.error('[NotesView][updateNoteInBackend] Note non trouvée:', noteId);
      return;
    }

    // Si nous mettons à jour la colonne, utiliser l'ID de la colonne du backend
    const updateData: any = { ...updates };
    if (updates.columnId) {
      const column = notesStore.getColumnById(updates.columnId);
      if (column) {
        // Utiliser l'ID de la colonne du backend qui est stocké dans column.id
updateData.column = column.id; // Ne pas convertir en entier, laisser sous forme de chaîne
        delete updateData.columnId;
        delete updateData.column_id;
      } else {
        console.warn(`[NotesView][updateNoteInBackend] Colonne non trouvée: ${updates.columnId}`);
      }
    }

    // Mettre à jour la note dans le backend
    const updatedNote = {
      ...note,
      ...updateData,
      updatedAt: new Date().toISOString()
    };
await noteService.updateNote(noteId, updatedNote);
} catch (error) {
    console.error('[NotesView][updateNoteInBackend] Erreur:', error);
    throw error;
  }
}

// Créer une note simple (non géolocalisée)
function createSimpleNote() {
  // Déterminer l'enterprise_id en fonction du rôle de l'utilisateur
  let enterprise_id: number | null = null;
  
  if (authStore.isAdmin) {
    // Admin: peut être null ou défini manuellement dans l'interface d'édition
    enterprise_id = null;
  } else if (authStore.isEntreprise && authStore.user) {
    // Entreprise: utiliser son propre ID
    enterprise_id = authStore.user.id;
  } else if (authStore.isSalarie && authStore.user?.enterprise_id) {
    // Salarié: utiliser l'ID de son entreprise
    enterprise_id = authStore.user.enterprise_id;
  } else if (authStore.isVisiteur && authStore.user) {
    // Visiteur: essayer d'obtenir l'ID de l'entreprise via le salarié ou directement
    // Utiliser l'opérateur de nullish coalescing pour éviter les erreurs de typage
enterprise_id = authStore.user.enterprise_id ?? null;
  }
// Créer une note vide
  editingNote.value = {
    id: '' as unknown as number, // L'ID sera généré par le backend
    title: 'Nouvelle note',
    description: '',
    location: null as any, // Forcer le type pour permettre null
    columnId: notesStore.getDefaultColumn.id,
    accessLevel: NoteAccessLevel.PRIVATE,
    style: {
      color: '#3B82F6',
      weight: 2,
      opacity: 1,
      fillColor: '#3B82F6',
      fillOpacity: 0.6,
      radius: 8
    },
    order: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    comments: [],
    photos: [],
    enterprise_id: enterprise_id
  };

  // Afficher le modal d'édition
  showEditModal.value = true;
  activeTab.value = 'info';
}

// Gestion du menu déroulant
const dropdownRef = ref<HTMLElement | null>(null);
const showDropdown = ref(false);

// Fonction pour basculer l'affichage du menu déroulant
function toggleDropdown() {
  showDropdown.value = !showDropdown.value;
}

// Fermer le menu déroulant lors d'un clic à l'extérieur
function handleClickOutside(event: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    showDropdown.value = false;
  }
}

// Ajouter les écouteurs d'événements
onMounted(() => {
  document.addEventListener('click', handleClickOutside);
  window.addEventListener('resize', handleResize);
});

// Supprimer les écouteurs d'événements lors du démontage
onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside);
  window.removeEventListener('resize', handleResize);
});
</script>

<style scoped>
.dragging {
  opacity: 0.5;
  background-color: #f3f4f6;
  transform: rotate(2deg);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

.chosen {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.ghost-card {
  opacity: 0.4;
  background-color: #f9fafb;
  border: 2px dashed #d1d5db;
}

.sortable-ghost {
  opacity: 0.4;
  background-color: #f9fafb;
  border: 2px dashed #d1d5db;
}

.sortable-drag {
  cursor: grabbing;
}

.no-select {
  -webkit-touch-callout: none; /* iOS Safari */
  -webkit-user-select: none; /* Safari */
  -khtml-user-select: none; /* Konqueror HTML */
  -moz-user-select: none; /* Firefox */
  -ms-user-select: none; /* Internet Explorer/Edge */
  user-select: none; /* Non-prefixed version, currently supported by Chrome and Opera */
}

.drag-handle {
  cursor: move; /* fallback if grab cursor is unsupported */
  cursor: grab;
  cursor: -moz-grab;
  cursor: -webkit-grab;
}

.drag-handle:active {
  cursor: grabbing;
  cursor: -moz-grabbing;
  cursor: -webkit-grabbing;
}

.drag-indicator {
  pointer-events: none; /* Ensures the indicator doesn't interfere with drag events */
}

.draggable-container:empty {
  min-height: 100px;
  border: 2px dashed #e5e7eb;
  border-radius: 0.5rem;
  margin: 0.5rem 0;
}

.empty-column-drop-zone:empty {
  display: block;
  min-height: 120px;
  border: 2px dashed #cbd5e1;
  border-radius: 0.5rem;
  margin: 0.5rem 0;
  background-color: #f8fafc;
  position: relative;
}

.empty-column-drop-zone:empty::after {
  content: 'Déposer ici';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #94a3b8;
  font-size: 0.875rem;
  font-style: italic;
}
</style>
