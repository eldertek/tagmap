<template>
  <div class="comment-thread">
    <!-- Liste des commentaires -->
    <div v-if="comments && comments.length > 0" class="space-y-3 mb-4">
      <div v-for="comment in comments" :key="comment.id" class="bg-gray-50 rounded-lg p-3">
        <div class="flex justify-between items-start">
          <div class="flex items-center">
            <div class="font-medium text-sm text-gray-900">{{ comment.userName }}</div>
            <span class="ml-2 text-xs px-2 py-0.5 rounded-full"
                  :class="getRoleBadgeClass(comment.userRole)">
              {{ getRoleLabel(comment.userRole) }}
            </span>
          </div>
          <div class="flex items-center">
            <span class="text-xs text-gray-500">{{ formatDate(comment.createdAt) }}</span>
            <button v-if="canDelete(comment)"
                    @click.prevent="deleteComment(comment.id)"
                    class="ml-2 text-gray-400 hover:text-red-500">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <p class="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{{ comment.text }}</p>
      </div>
    </div>
    <div v-else class="text-center text-sm text-gray-500 italic my-4">
      Aucun commentaire pour le moment
    </div>

    <!-- Formulaire d'ajout de commentaire -->
    <div v-if="canAddComment" class="mt-3">
      <textarea
        v-model="newComment"
        placeholder="Ajouter un commentaire..."
        class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        rows="2"
      ></textarea>
      <div class="flex justify-end mt-2">
        <button
          type="button"
          @click.prevent="addComment"
          :disabled="!newComment.trim()"
          class="px-3 py-1 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Ajouter
        </button>
      </div>
    </div>
    <div v-else class="text-center text-sm text-gray-500 italic mt-2">
      Seuls les utilisateurs de l'entreprise peuvent ajouter des commentaires
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useNotesStore, type Comment } from '../stores/notes';
import { useNotificationStore } from '../stores/notification';
import { formatDate } from '@/utils/dateUtils';

const props = defineProps<{
  noteId: number;
  comments?: Comment[];
}>();
// Surveiller les changements dans les commentaires
watch(() => props.comments, (newComments) => {
}, { deep: true });

const emit = defineEmits<{
  (e: 'update:comments', comments: Comment[]): void;
  (e: 'comment-added'): void;
  (e: 'comment-deleted'): void;
}>();

const authStore = useAuthStore();
const notesStore = useNotesStore();
const notificationStore = useNotificationStore();
const newComment = ref('');

// Vérifier si l'utilisateur peut ajouter un commentaire
const canAddComment = computed(() => {
  return authStore.isEntreprise || authStore.isAdmin;
});

// Vérifier si l'utilisateur peut supprimer un commentaire
function canDelete(comment: Comment) {
  // L'utilisateur peut supprimer ses propres commentaires ou s'il est admin
  return (authStore.user && comment.userId === authStore.user.id) || authStore.isAdmin;
}

// Ajouter un commentaire
async function addComment() {
  if (!newComment.value.trim()) return;

  try {
    // Utiliser await pour capturer les erreurs correctement
    await notesStore.addComment(props.noteId, newComment.value.trim());
    newComment.value = '';
    notificationStore.success('Commentaire ajouté avec succès');

    // Émettre un événement pour indiquer qu'un commentaire a été ajouté
    emit('comment-added');
  } catch (error: any) {
    console.error('Erreur lors de l\'ajout du commentaire:', error);

    // Afficher un message d'erreur plus spécifique si possible
    if (error.response?.data) {
      const errorData = error.response.data;
      if (errorData.note) {
        notificationStore.error(`Erreur: ${errorData.note[0]}`);
      } else if (errorData.user) {
        notificationStore.error(`Erreur: ${errorData.user[0]}`);
      } else if (errorData.text) {
        notificationStore.error(`Erreur: ${errorData.text[0]}`);
      } else {
        notificationStore.error('Erreur lors de l\'ajout du commentaire');
      }
    } else {
      notificationStore.error('Erreur lors de l\'ajout du commentaire');
    }
  }
}

// Supprimer un commentaire
async function deleteComment(commentId: number) {
  if (!confirm('Voulez-vous vraiment supprimer ce commentaire ?')) return;

  try {
    await notesStore.removeComment(props.noteId, commentId);
    notificationStore.success('Commentaire supprimé');
    emit('comment-deleted');
  } catch (error: any) {
    console.error('Erreur lors de la suppression du commentaire:', error);

    // Afficher un message d'erreur plus spécifique si possible
    if (error.response?.data) {
      const errorData = error.response.data;
      if (errorData.detail) {
        notificationStore.error(`Erreur: ${errorData.detail}`);
      } else {
        notificationStore.error('Erreur lors de la suppression du commentaire');
      }
    } else {
      notificationStore.error('Erreur lors de la suppression du commentaire');
    }
  }
}

// Obtenir la classe CSS pour le badge de rôle
function getRoleBadgeClass(role: string): string {
  switch (role) {
    case 'admin':
      return 'bg-purple-100 text-purple-800';
    case 'entreprise':
      return 'bg-blue-100 text-blue-800';
    case 'salarie':
      return 'bg-green-100 text-green-800';
    case 'visiteur':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

// Obtenir le libellé du rôle
function getRoleLabel(role: string): string {
  switch (role) {
    case 'admin':
      return 'Admin';
    case 'entreprise':
      return 'Entreprise';
    case 'salarie':
      return 'Salarié';
    case 'visiteur':
      return 'Visiteur';
    default:
      return role;
  }
}
</script>
