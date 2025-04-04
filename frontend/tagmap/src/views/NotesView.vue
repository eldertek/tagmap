<template>
  <div class="h-full bg-gray-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="sm:flex sm:items-center">
        <div class="sm:flex-auto">
          <h1 class="text-2xl font-semibold text-gray-900">Notes</h1>
          <p class="mt-2 text-sm text-gray-700">
            Liste de toutes vos notes.
          </p>
        </div>
        <div class="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            @click="goToMap"
            class="inline-flex items-center justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 sm:w-auto"
          >
            Créer une note
          </button>
        </div>
      </div>

      <!-- Filtres de recherche et bouton d'ajout de colonne -->
      <div class="mt-6 bg-white shadow rounded-lg p-4">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <option v-for="level in accessLevels" :key="level.id" :value="level.id">{{ level.title }}</option>
            </select>
          </div>
          <div class="flex items-end">
            <button
              @click="showNewColumnModal = true"
              class="w-full inline-flex items-center justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              <svg class="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Ajouter une colonne
            </button>
          </div>
        </div>
      </div>

      <!-- Tableau de type Trello -->
      <div v-if="loading" class="mt-6 p-6 text-center bg-white shadow rounded-lg">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <p class="mt-2 text-sm text-gray-500">Chargement des notes...</p>
      </div>

      <div v-else-if="filteredNotes.length === 0" class="mt-6 p-6 text-center bg-white shadow rounded-lg">
        <p class="text-sm text-gray-500">Aucune note trouvée</p>
      </div>

      <div v-else class="mt-6 overflow-x-auto pb-4">
        <!-- Colonnes de notes avec drag and drop -->
        <draggable
          v-model="columnsForDrag"
          class="flex space-x-4 min-w-max"
          item-key="id"
          handle=".column-drag-handle"
          @end="onColumnDragEnd"
          :animation="150"
        >
          <template #item="{ element: column }">
            <div class="w-80 flex-shrink-0">
              <div class="bg-white rounded-lg shadow overflow-hidden">
                <!-- En-tête de colonne avec poignée de drag -->
                <div
                  class="p-3 flex items-center justify-between column-drag-handle cursor-move no-select"
                  :style="{ backgroundColor: column.color + '20', borderBottom: '2px solid ' + column.color }"
                >
                  <div class="flex items-center">
                    <svg class="h-4 w-4 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" />
                    </svg>
                    <h3 class="text-sm font-semibold" :style="{ color: column.color }">
                      {{ column.title }}
                    </h3>
                  </div>
                  <div class="flex items-center space-x-2">
                    <span class="text-xs text-gray-500 bg-white px-2 py-1 rounded-full">
                      {{ getNotesByColumn(column.id).length }}
                    </span>
                    <button
                      v-if="!column.isDefault"
                      @click="removeColumn(column.id)"
                      class="text-gray-400 hover:text-red-500 focus:outline-none"
                      title="Supprimer la colonne">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                <!-- Liste des notes dans cette colonne avec drag and drop -->
                <div class="p-2 max-h-[calc(100vh-250px)] overflow-y-auto" :data-column-id="column.id">
                  <draggable
                    :list="getNotesByColumn(column.id)"
                    class="min-h-[100px] draggable-container"
                    group="notes"
                    item-key="id"
                    :animation="150"
                    ghost-class="ghost-card"
                    drag-class="dragging"
                    chosen-class="chosen"
                    handle=".drag-handle"
                    @change="(event) => onDragChange(event, column.id)"
                    :data-column-id="column.id"
                    :force-fallback="true"
                  >
                    <template #header v-if="getNotesByColumn(column.id).length === 0">
                      <div class="p-4 text-center text-gray-400 text-sm italic">
                        Aucune note dans cette colonne
                      </div>
                    </template>
                    <template #item="{ element: note }">
                      <div class="mb-2 p-3 bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 no-select" :data-note-id="note.id">
                        <!-- En-tête de la note avec poignée de drag -->
                        <div class="flex items-start justify-between mb-2 drag-handle cursor-move">
                          <div class="flex items-center">
                            <div
                              class="h-8 w-8 rounded-full flex items-center justify-center mr-2"
                              :style="{ backgroundColor: note.style.fillColor + '40', color: note.style.color }"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            </div>
                            <h4 class="text-sm font-medium text-gray-900 truncate max-w-[180px]" :title="note.title">{{ note.title }}</h4>
                          </div>
                          <div class="flex space-x-1">
                            <button
                              @click="viewOnMap(note)"
                              class="text-gray-400 hover:text-primary-600"
                              title="Voir sur la carte">
                              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                              </svg>
                            </button>
                            <button
                              @click="editNote(note)"
                              class="text-gray-400 hover:text-primary-600"
                              title="Modifier">
                              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              @click="confirmDeleteNote(note)"
                              class="text-gray-400 hover:text-red-600"
                              title="Supprimer">
                              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        <!-- Description de la note -->
                        <p class="text-xs text-gray-500 mb-2 line-clamp-2" :title="note.description">{{ note.description }}</p>

                        <!-- Pied de la note -->
                        <div class="flex justify-between items-center text-xs text-gray-400">
                          <span>{{ formatDate(note.createdAt) }}</span>
                          <div class="flex space-x-1">
                            <span
                              class="px-2 py-1 rounded-full"
                              :style="{ backgroundColor: getAccessLevelColor(note.accessLevel) + '20', color: getAccessLevelColor(note.accessLevel) }"
                              :title="accessLevels.find(l => l.id === note.accessLevel)?.description"
                            >
                              {{ getAccessLevelLabel(note.accessLevel) }}
                            </span>
                            <span class="px-2 py-1 rounded-full" :style="{ backgroundColor: column.color + '20', color: column.color }">
                              {{ column.title }}
                            </span>
                          </div>
                        </div>
                      </div>
                    </template>
                  </draggable>
                </div>
              </div>
            </div>
          </template>
        </draggable>


        </div>
      </div>
    </div>

    <!-- Modal de confirmation de suppression -->
    <div v-if="showDeleteModal" class="fixed z-50 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div class="flex items-center justify-center min-h-screen w-full">
        <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
        <div class="relative bg-white w-full h-full md:rounded-lg md:max-w-lg md:h-auto md:max-h-[90vh] md:my-8 shadow-xl transform transition-all overflow-hidden">
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
    <div v-if="showEditModal" class="fixed z-50 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div class="flex items-center justify-center min-h-screen w-full">
        <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
        <div class="relative bg-white w-full h-full md:rounded-lg md:max-w-2xl md:h-auto md:max-h-[90vh] md:my-8 shadow-xl transform transition-all overflow-hidden">
          <form @submit.prevent="saveNote" class="h-full md:h-auto flex flex-col">
            <div class="p-4 md:p-6 flex-1 overflow-y-auto">
              <div class="flex justify-between items-center mb-4 border-b pb-4">
                <h3 class="text-xl font-semibold text-gray-900">{{ editingNote?.id ? 'Modifier la note' : 'Nouvelle note' }}</h3>
                <button type="button" @click="showEditModal = false" class="text-gray-400 hover:text-gray-500">
                  <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div class="mb-4">
                <label for="title" class="block text-sm font-medium text-gray-700">Titre</label>
                <input type="text" id="title" :value="editingNote?.title || ''" @input="updateNoteField('title', $event)" required
                  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" />
              </div>
              <div class="mb-4">
                <label for="description" class="block text-sm font-medium text-gray-700">Description</label>
                <textarea id="description" :value="editingNote?.description || ''" @input="updateNoteField('description', $event)" rows="3"
                  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"></textarea>
              </div>
              <div class="mb-4">
                <label for="column" class="block text-sm font-medium text-gray-700">État</label>
                <select id="column" :value="editingNote?.columnId || ''" @change="updateNoteField('columnId', $event)"
                  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm">
                  <option v-for="column in sortedColumns" :key="column.id" :value="column.id">
                    {{ column.title }}
                  </option>
                </select>
              </div>
              <div class="mb-4">
                <label for="accessLevel" class="block text-sm font-medium text-gray-700">Niveau d'accès</label>
                <select id="accessLevel" :value="editingNote?.accessLevel || ''" @change="updateNoteField('accessLevel', $event)"
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
                    :class="{ 'border-gray-400': !(editingNote && editingNote.style && editingNote.style.color === color), 'border-black': editingNote && editingNote.style && editingNote.style.color === color }"
                    :style="{ backgroundColor: color }"
                    @click="if (editingNote && editingNote.style) { editingNote.style.color = color; editingNote.style.fillColor = color; }">
                  </div>
                </div>
              </div>
            </div>
            <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button type="submit" class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm">
                Enregistrer
              </button>
              <button @click="showEditModal = false" type="button" class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
                Annuler
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Modal d'ajout de colonne -->
    <div v-if="showNewColumnModal" class="fixed z-50 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div class="flex items-center justify-center min-h-screen w-full">
        <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
        <div class="relative bg-white w-full h-full md:rounded-lg md:max-w-lg md:h-auto md:max-h-[90vh] md:my-8 shadow-xl transform transition-all overflow-hidden">
          <form @submit.prevent="addColumn" class="h-full md:h-auto flex flex-col">
            <div class="p-4 md:p-6 flex-1 overflow-y-auto">
              <div class="flex justify-between items-center mb-4 border-b pb-4">
                <h3 class="text-xl font-semibold text-gray-900">Ajouter une nouvelle colonne</h3>
                <button type="button" @click="showNewColumnModal = false" class="text-gray-400 hover:text-gray-500">
                  <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div class="mb-4">
                <label for="columnName" class="block text-sm font-medium text-gray-700">Nom de la colonne</label>
                <input type="text" id="columnName" v-model="newColumnName" required
                  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" />
              </div>
              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700">Couleur</label>
                <div class="mt-1 flex space-x-2">
                  <div v-for="color in colors" :key="color"
                    class="w-8 h-8 rounded-full cursor-pointer border-2"
                    :class="{ 'border-gray-400': newColumnColor !== color, 'border-black': newColumnColor === color }"
                    :style="{ backgroundColor: color }"
                    @click="newColumnColor = color">
                  </div>
                </div>
              </div>
            </div>
            <div class="p-4 md:px-6 border-t bg-gray-50 flex flex-col-reverse sm:flex-row-reverse sm:justify-end gap-3">
              <button type="submit" class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:w-auto sm:text-sm">
                Ajouter
              </button>
              <button @click="showNewColumnModal = false" type="button" class="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:w-auto sm:text-sm">
                Annuler
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useNotificationStore } from '../stores/notification';
import { useNotesStore, type Note, NoteAccessLevel } from '../stores/notes';
import { useAuthStore } from '../stores/auth';
import draggable from 'vuedraggable';

// Utilisation du type Note importé depuis le store

const router = useRouter();
const notificationStore = useNotificationStore();
const notesStore = useNotesStore();
const authStore = useAuthStore();
const loading = ref(true);
const showDeleteModal = ref(false);
const showEditModal = ref(false);
const showNewColumnModal = ref(false);
const noteToDelete = ref<Note | null>(null);
const editingNote = ref<Note | null>(null);
const newColumnName = ref('');
const newColumnColor = ref('#6B7280');

// Colonnes pour le drag and drop
const columnsForDrag = computed({
  get: () => notesStore.getSortedColumns,
  set: (newColumns) => {
    // Mettre à jour l'ordre des colonnes
    const columnIds = newColumns.map(col => col.id);
    notesStore.reorderColumns(columnIds);
  }
});

// Niveaux d'accès disponibles
const accessLevels = [
  { id: NoteAccessLevel.PRIVATE, title: 'Privé', description: 'Visible uniquement par vous' },
  { id: NoteAccessLevel.COMPANY, title: 'Entreprise', description: 'Visible uniquement par l\'entreprise' },
  { id: NoteAccessLevel.EMPLOYEE, title: 'Salariés', description: 'Visible par l\'entreprise et ses salariés' },
  { id: NoteAccessLevel.VISITOR, title: 'Visiteurs', description: 'Visible par tous (entreprise, salariés et visiteurs)' }
];

// Filtres
const filters = reactive({
  search: '',
  date: '',
  accessLevel: ''
});

// Couleurs disponibles pour les notes
const colors = [
  '#3B82F6', // Bleu
  '#10B981', // Vert
  '#F59E0B', // Jaune
  '#EF4444', // Rouge
  '#8B5CF6', // Violet
  '#EC4899', // Rose
  '#6B7280', // Gris
];

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
      const noteDate = new Date(note.createdAt);

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

// Notes filtrées par colonne et triées par ordre
const getNotesByColumn = computed(() => (columnId: string) => {
  return filteredNotes.value
    .filter(note => note.columnId === columnId)
    .sort((a, b) => a.order - b.order);
});

// Obtenir le libellé du niveau d'accès
function getAccessLevelLabel(level: NoteAccessLevel): string {
  return notesStore.getAccessLevelLabel(level);
}

// Obtenir la couleur du niveau d'accès
function getAccessLevelColor(level: NoteAccessLevel): string {
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



// Colonnes triées par ordre
const sortedColumns = computed(() => {
  return notesStore.getSortedColumns;
});

// Charger les notes
onMounted(async () => {
  try {
    // Simuler le chargement des notes (à remplacer par un appel API réel)
    setTimeout(() => {
      // Les notes sont déjà chargées depuis le store
      loading.value = false;
    }, 500);
  } catch (error) {
    console.error('Erreur lors du chargement des notes:', error);
    notificationStore.error('Erreur lors du chargement des notes');
    loading.value = false;
  }
});

// Formater la date
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}



// Aller à la carte pour créer une note
function goToMap() {
  router.push({ path: '/', query: { tool: 'Note' } });
}

// Voir la note sur la carte
function viewOnMap(note: Note) {
  router.push({
    path: '/',
    query: {
      lat: note.location[0].toString(),
      lng: note.location[1].toString(),
      noteId: note.id.toString()
    }
  });
}

// Éditer une note
function editNote(note: Note) {
  editingNote.value = JSON.parse(JSON.stringify(note)); // Clone profond
  showEditModal.value = true;
}

// Mettre à jour un champ de la note en cours d'édition
function updateNoteField(field: string, event: Event) {
  if (!editingNote.value) return;

  const target = event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

  if (field === 'title' || field === 'description' || field === 'columnId') {
    editingNote.value[field] = target.value;
  } else if (field === 'accessLevel') {
    editingNote.value.accessLevel = target.value as NoteAccessLevel;
  }
}

// Sauvegarder une note
function saveNote() {
  if (!editingNote.value) return;

  notesStore.updateNote(editingNote.value.id, editingNote.value);

  notificationStore.success('Note mise à jour avec succès');

  showEditModal.value = false;
}

// Confirmer la suppression d'une note
function confirmDeleteNote(note: Note) {
  noteToDelete.value = note;
  showDeleteModal.value = true;
}

// Supprimer une note
function deleteNote() {
  if (!noteToDelete.value) return;

  notesStore.removeNote(noteToDelete.value.id);

  notificationStore.success('Note supprimée avec succès');

  showDeleteModal.value = false;
  noteToDelete.value = null;
}

// Ajouter une nouvelle colonne
function addColumn() {
  if (!newColumnName.value.trim()) return;

  notesStore.addColumn(newColumnName.value.trim(), newColumnColor.value);

  notificationStore.success('Colonne ajoutée avec succès');

  newColumnName.value = '';
  newColumnColor.value = '#6B7280';
  showNewColumnModal.value = false;
}



// Supprimer une colonne
function removeColumn(columnId: string) {
  notesStore.removeColumn(columnId);

  notificationStore.success('Colonne supprimée avec succès');
}

// Gérer la fin du drag and drop des colonnes
function onColumnDragEnd() {
  // L'ordre est déjà mis à jour via le v-model de draggable
  notificationStore.success('Ordre des colonnes mis à jour');
}

// Gérer les changements lors du drag and drop
function onDragChange(event: any, columnId: string) {
  console.log('Drag change event:', event);

  try {
    // Gérer le déplacement d'une note entre colonnes
    if (event.added) {
      const { element: note } = event.added;

      // Mettre à jour la note dans le store
      notesStore.moveNote(note.id, columnId);

      // Réorganiser les notes dans la colonne cible
      const notesInColumn = getNotesByColumn.value(columnId);
      const noteIds = notesInColumn.map(n => n.id);
      notesStore.reorderNotes(columnId, noteIds);

      const targetColumn = notesStore.getColumnById(columnId);
      notificationStore.success(`Note déplacée vers ${targetColumn?.title || 'une autre colonne'}`);
    }

    // Gérer le réordonnancement des notes dans une même colonne
    if (event.moved) {
      // Réorganiser les notes dans la colonne
      const notesInColumn = getNotesByColumn.value(columnId);
      const noteIds = notesInColumn.map(n => n.id);
      notesStore.reorderNotes(columnId, noteIds);

      notificationStore.success('Ordre des notes mis à jour');
    }

    // Gérer la suppression d'une note d'une colonne (lors du déplacement vers une autre colonne)
    if (event.removed) {
      // Pas besoin de faire quoi que ce soit ici, car la note sera ajoutée à la nouvelle colonne
      // et gérée par le cas 'added' dans l'autre colonne
    }
  } catch (error) {
    console.error('Erreur lors du drag and drop:', error);
    notificationStore.error('Une erreur est survenue lors du déplacement de la note');
  }
}
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
</style>
