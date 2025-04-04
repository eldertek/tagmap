<template>
  <div class="photo-gallery">
    <!-- Galerie de photos -->
    <div v-if="photos && photos.length > 0" class="grid grid-cols-2 gap-2 mb-4">
      <div v-for="photo in photos" :key="photo.id" class="relative group">
        <img 
          :src="photo.url" 
          :alt="photo.caption || 'Photo'" 
          class="w-full h-32 object-cover rounded-lg cursor-pointer"
          @click="openPhotoModal(photo)"
        />
        <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 rounded-lg flex items-center justify-center">
          <div class="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-2">
            <button 
              @click.stop="openCaptionModal(photo)" 
              class="p-1 bg-white rounded-full text-gray-700 hover:text-primary-600"
              title="Modifier la légende"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button 
              @click.stop="deletePhoto(photo.id)" 
              class="p-1 bg-white rounded-full text-gray-700 hover:text-red-600"
              title="Supprimer la photo"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
        <div v-if="photo.caption" class="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 truncate rounded-b-lg">
          {{ photo.caption }}
        </div>
      </div>
    </div>
    <div v-else class="text-center text-sm text-gray-500 italic my-4">
      Aucune photo pour le moment
    </div>

    <!-- Boutons d'ajout de photo -->
    <div class="flex space-x-2 mt-3">
      <button 
        @click="openCamera" 
        class="flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Prendre une photo
      </button>
      <label 
        for="photo-upload" 
        class="flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 cursor-pointer"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12" />
        </svg>
        Téléverser
        <input 
          id="photo-upload" 
          type="file" 
          accept="image/*" 
          class="hidden" 
          @change="handleFileUpload"
        />
      </label>
    </div>

    <!-- Modal pour afficher une photo en grand -->
    <div v-if="showPhotoModal" class="fixed inset-0 z-[3002] flex items-center justify-center p-4 bg-black bg-opacity-75">
      <div class="relative max-w-3xl max-h-[90vh] bg-white rounded-lg overflow-hidden">
        <button 
          @click="showPhotoModal = false" 
          class="absolute top-2 right-2 z-10 p-1 bg-white rounded-full text-gray-700 hover:text-red-600 shadow-md"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <img 
          v-if="selectedPhoto" 
          :src="selectedPhoto.url" 
          :alt="selectedPhoto.caption || 'Photo'" 
          class="max-h-[80vh] max-w-full object-contain"
        />
        <div v-if="selectedPhoto && selectedPhoto.caption" class="p-3 bg-white">
          <p class="text-sm text-gray-700">{{ selectedPhoto.caption }}</p>
        </div>
      </div>
    </div>

    <!-- Modal pour modifier la légende -->
    <div v-if="showCaptionModal" class="fixed inset-0 z-[3002] flex items-center justify-center p-4 bg-black bg-opacity-75">
      <div class="w-full max-w-md bg-white rounded-lg overflow-hidden">
        <div class="p-4 border-b">
          <h3 class="text-lg font-medium text-gray-900">Modifier la légende</h3>
        </div>
        <div class="p-4">
          <textarea 
            v-model="editingCaption" 
            placeholder="Ajouter une légende..." 
            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            rows="3"
          ></textarea>
        </div>
        <div class="p-4 bg-gray-50 flex justify-end space-x-3">
          <button 
            @click="showCaptionModal = false" 
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            Annuler
          </button>
          <button 
            @click="saveCaption" 
            class="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>

    <!-- Modal pour la caméra -->
    <div v-if="showCameraModal" class="fixed inset-0 z-[3002] flex items-center justify-center p-4 bg-black bg-opacity-75">
      <div class="w-full max-w-md bg-white rounded-lg overflow-hidden">
        <div class="p-4 border-b flex justify-between items-center">
          <h3 class="text-lg font-medium text-gray-900">Prendre une photo</h3>
          <button 
            @click="showCameraModal = false" 
            class="text-gray-400 hover:text-gray-500"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="relative">
          <video 
            v-if="!capturedImage" 
            ref="videoElement" 
            autoplay 
            class="w-full h-64 object-cover"
          ></video>
          <img 
            v-else 
            :src="capturedImage" 
            class="w-full h-64 object-cover" 
            alt="Captured"
          />
          <canvas ref="canvasElement" class="hidden"></canvas>
        </div>
        <div class="p-4 bg-gray-50 flex justify-center">
          <button 
            v-if="!capturedImage" 
            @click="capturePhoto" 
            class="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-full w-12 h-12 flex items-center justify-center hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            </svg>
          </button>
          <div v-else class="flex space-x-3">
            <button 
              @click="retakePhoto" 
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              Reprendre
            </button>
            <button 
              @click="savePhoto" 
              class="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              Utiliser
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue';
import { useNotesStore, type Photo } from '../stores/notes';
import { useNotificationStore } from '../stores/notification';

const props = defineProps<{
  noteId: number;
  photos?: Photo[];
}>();

const emit = defineEmits<{
  (e: 'update:photos', photos: Photo[]): void;
}>();

const notesStore = useNotesStore();
const notificationStore = useNotificationStore();

// Références pour la caméra
const videoElement = ref<HTMLVideoElement | null>(null);
const canvasElement = ref<HTMLCanvasElement | null>(null);
let stream: MediaStream | null = null;

// États pour les modals
const showPhotoModal = ref(false);
const showCaptionModal = ref(false);
const showCameraModal = ref(false);
const selectedPhoto = ref<Photo | null>(null);
const editingPhoto = ref<Photo | null>(null);
const editingCaption = ref('');
const capturedImage = ref<string | null>(null);

// Ouvrir le modal pour afficher une photo
function openPhotoModal(photo: Photo) {
  selectedPhoto.value = photo;
  showPhotoModal.value = true;
}

// Ouvrir le modal pour modifier la légende
function openCaptionModal(photo: Photo) {
  editingPhoto.value = photo;
  editingCaption.value = photo.caption || '';
  showCaptionModal.value = true;
}

// Enregistrer la légende
function saveCaption() {
  if (!editingPhoto.value) return;
  
  try {
    notesStore.updatePhoto(props.noteId, editingPhoto.value.id, editingCaption.value);
    showCaptionModal.value = false;
    notificationStore.success('Légende mise à jour');
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la légende:', error);
    notificationStore.error('Erreur lors de la mise à jour de la légende');
  }
}

// Supprimer une photo
function deletePhoto(photoId: number) {
  if (confirm('Êtes-vous sûr de vouloir supprimer cette photo ?')) {
    try {
      notesStore.removePhoto(props.noteId, photoId);
      notificationStore.success('Photo supprimée');
    } catch (error) {
      console.error('Erreur lors de la suppression de la photo:', error);
      notificationStore.error('Erreur lors de la suppression de la photo');
    }
  }
}

// Gérer l'upload de fichier
async function handleFileUpload(event: Event) {
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;
  
  const file = input.files[0];
  
  // Vérifier le type de fichier
  if (!file.type.startsWith('image/')) {
    notificationStore.error('Le fichier doit être une image');
    return;
  }
  
  // Vérifier la taille du fichier (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    notificationStore.error('L\'image est trop volumineuse (max 5MB)');
    return;
  }
  
  try {
    // Convertir l'image en base64
    const base64 = await readFileAsDataURL(file);
    
    // Ajouter la photo
    notesStore.addPhoto(props.noteId, { url: base64 });
    
    // Réinitialiser l'input
    input.value = '';
    
    notificationStore.success('Photo ajoutée');
  } catch (error) {
    console.error('Erreur lors de l\'ajout de la photo:', error);
    notificationStore.error('Erreur lors de l\'ajout de la photo');
  }
}

// Lire un fichier en base64
function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Ouvrir la caméra
async function openCamera() {
  showCameraModal.value = true;
  capturedImage.value = null;
  
  try {
    stream = await navigator.mediaDevices.getUserMedia({ 
      video: { 
        facingMode: 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 }
      } 
    });
    
    if (videoElement.value) {
      videoElement.value.srcObject = stream;
    }
  } catch (error) {
    console.error('Erreur lors de l\'accès à la caméra:', error);
    notificationStore.error('Impossible d\'accéder à la caméra');
    showCameraModal.value = false;
  }
}

// Capturer une photo
function capturePhoto() {
  if (!videoElement.value || !canvasElement.value) return;
  
  const video = videoElement.value;
  const canvas = canvasElement.value;
  
  // Définir les dimensions du canvas
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  
  // Dessiner l'image sur le canvas
  const context = canvas.getContext('2d');
  if (context) {
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convertir en base64
    capturedImage.value = canvas.toDataURL('image/jpeg');
  }
}

// Reprendre une photo
function retakePhoto() {
  capturedImage.value = null;
}

// Enregistrer la photo capturée
function savePhoto() {
  if (!capturedImage.value) return;
  
  try {
    notesStore.addPhoto(props.noteId, { url: capturedImage.value });
    showCameraModal.value = false;
    stopCamera();
    notificationStore.success('Photo ajoutée');
  } catch (error) {
    console.error('Erreur lors de l\'ajout de la photo:', error);
    notificationStore.error('Erreur lors de l\'ajout de la photo');
  }
}

// Arrêter la caméra
function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }
}

// Nettoyer lors de la destruction du composant
onUnmounted(() => {
  stopCamera();
});
</script>
