<template>
  <div class="min-h-screen bg-gray-50 py-12">
    <div class="max-w-7xl mx-auto sm:px-6 lg:px-8">
      <div class="md:grid md:grid-cols-3 md:gap-6">
        <!-- Informations du profil -->
        <div class="md:col-span-1">
          <div class="px-4 sm:px-0">
            <h3 class="text-lg font-medium leading-6 text-gray-900">
              Profil
            </h3>
            <p class="mt-1 text-sm text-gray-600">
              Ces informations seront affichées publiquement, soyez prudent avec ce que vous partagez.
            </p>
          </div>
        </div>
        <div class="mt-5 md:mt-0 md:col-span-2">
          <form @submit.prevent="updateProfile">
            <div class="shadow sm:rounded-md sm:overflow-hidden">
              <div class="px-4 py-5 bg-white space-y-6 sm:p-6">
                <div v-if="profileError" :class="[
                  'rounded-md p-4',
                  profileError === 'Email mis à jour avec succès' 
                    ? 'bg-green-50' 
                    : 'bg-red-50'
                ]">
                  <div class="flex">
                    <div class="flex-shrink-0">
                      <svg
                        v-if="profileError !== 'Email mis à jour avec succès'"
                        class="h-5 w-5 text-red-400"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fill-rule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                          clip-rule="evenodd"
                        />
                      </svg>
                      <svg
                        v-else
                        class="h-5 w-5 text-green-400"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fill-rule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clip-rule="evenodd"
                        />
                      </svg>
                    </div>
                    <div class="ml-3">
                      <h3 class="text-sm font-medium" :class="[
                        profileError === 'Email mis à jour avec succès'
                          ? 'text-green-800'
                          : 'text-red-800'
                      ]">
                        {{ profileError }}
                      </h3>
                    </div>
                  </div>
                </div>
                
                <!-- Ajout de la section de logo -->
                <div class="space-y-4">
                  <label class="block text-sm font-medium text-gray-700">
                    Logo utilisateur
                  </label>
                  <div class="flex items-start space-x-6">
                    <div>
                      <div class="h-24 w-24 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center">
                        <img 
                          v-if="logoPreview || authStore.user?.logo" 
                          :src="logoPreview || authStore.user?.logo || ''" 
                          class="h-full w-full object-cover" 
                          alt="Logo utilisateur"
                        />
                        <svg v-else class="h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    </div>
                    <div class="flex-1">
                      <div class="flex items-center space-x-4">
                        <label for="logo-upload" class="cursor-pointer inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                          <svg class="-ml-1 mr-2 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Choisir un fichier
                        </label>
                        <input 
                          id="logo-upload" 
                          type="file" 
                          class="sr-only" 
                          accept="image/*"
                          @change="handleLogoChange"
                        />
                        <button 
                          v-if="logoFile || authStore.user?.logo" 
                          type="button" 
                          @click="clearLogo"
                          class="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                          <svg class="-ml-1 mr-2 h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Supprimer
                        </button>
                      </div>
                      <p class="mt-2 text-sm text-gray-500">
                        PNG, JPG, JPEG jusqu'à 2Mo. Ce logo sera utilisé pour représenter votre entreprise.
                      </p>
                      <div v-if="logoError" class="mt-2 text-sm text-red-600">
                        {{ logoError }}
                      </div>
                      <div v-if="logoSuccess" class="mt-2 text-sm text-green-600">
                        {{ logoSuccess }}
                      </div>
                      <div v-if="logoFile" class="mt-2">
                        <button 
                          type="button" 
                          @click="uploadLogo"
                          :disabled="logoUploading"
                          class="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                        >
                          <svg v-if="logoUploading" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          {{ logoUploading ? 'Téléversement en cours...' : 'Téléverser le logo' }}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <label
                    for="username"
                    class="block text-sm font-medium text-gray-700"
                  >
                    Nom d'utilisateur
                  </label>
                  <div class="mt-1">
                    <input
                      type="text"
                      name="username"
                      id="username"
                      v-model="profileForm.username"
                      disabled
                      class="shadow-sm bg-gray-100 block w-full sm:text-sm border-gray-300 rounded-md cursor-not-allowed"
                    />
                    <p class="mt-1 text-sm text-gray-500">Le nom d'utilisateur ne peut pas être modifié.</p>
                  </div>
                </div>
                <div>
                  <label
                    for="email"
                    class="block text-sm font-medium text-gray-700"
                  >
                    Adresse e-mail
                  </label>
                  <div class="mt-1">
                    <input
                      type="email"
                      name="email"
                      id="email"
                      v-model="profileForm.email"
                      class="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </div>
              <div class="px-4 py-3 bg-gray-50 text-right sm:px-6">
                <button
                  type="submit"
                  :disabled="profileLoading"
                  class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  {{ profileLoading ? 'Enregistrement...' : 'Enregistrer' }}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
      <div class="hidden sm:block" aria-hidden="true">
        <div class="py-5">
          <div class="border-t border-gray-200"></div>
        </div>
      </div>
      <!-- Changement de mot de passe -->
      <div class="mt-10 sm:mt-0">
        <div class="md:grid md:grid-cols-3 md:gap-6">
          <div class="md:col-span-1">
            <div class="px-4 sm:px-0">
              <h3 class="text-lg font-medium leading-6 text-gray-900">
                Mot de passe
              </h3>
              <p class="mt-1 text-sm text-gray-600">
                Assurez-vous d'utiliser un mot de passe sécurisé.
              </p>
            </div>
          </div>
          <div class="mt-5 md:mt-0 md:col-span-2">
            <form @submit.prevent="changePassword">
              <div class="shadow sm:rounded-md sm:overflow-hidden">
                <div class="px-4 py-5 bg-white space-y-6 sm:p-6">
                  <div v-if="passwordError || passwordSuccess" :class="[
                    'rounded-md p-4',
                    passwordSuccess ? 'bg-green-50' : 'bg-red-50'
                  ]">
                    <div class="flex">
                      <div class="flex-shrink-0">
                        <svg
                          v-if="passwordSuccess"
                          class="h-5 w-5 text-green-400"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fill-rule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clip-rule="evenodd"
                          />
                        </svg>
                        <svg
                          v-else
                          class="h-5 w-5 text-red-400"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fill-rule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                            clip-rule="evenodd"
                          />
                        </svg>
                      </div>
                      <div class="ml-3">
                        <h3 class="text-sm font-medium" :class="[
                          passwordSuccess ? 'text-green-800' : 'text-red-800'
                        ]">
                          {{ passwordSuccess || passwordError }}
                        </h3>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label
                      for="current-password"
                      class="block text-sm font-medium text-gray-700"
                    >
                      Mot de passe actuel
                    </label>
                    <div class="mt-1">
                      <input
                        type="password"
                        name="current-password"
                        id="current-password"
                        v-model="passwordForm.old_password"
                        required
                        class="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                  <div>
                    <label
                      for="new-password"
                      class="block text-sm font-medium text-gray-700"
                    >
                      Nouveau mot de passe
                    </label>
                    <div class="mt-1">
                      <input
                        type="password"
                        name="new-password"
                        id="new-password"
                        v-model="passwordForm.new_password"
                        required
                        class="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                  <div>
                    <label
                      for="confirm-password"
                      class="block text-sm font-medium text-gray-700"
                    >
                      Confirmer le nouveau mot de passe
                    </label>
                    <div class="mt-1">
                      <input
                        type="password"
                        name="confirm-password"
                        id="confirm-password"
                        v-model="passwordForm.confirm_password"
                        required
                        class="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                </div>
                <div class="px-4 py-3 bg-gray-50 text-right sm:px-6">
                  <button
                    type="submit"
                    :disabled="passwordLoading"
                    class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    {{ passwordLoading ? 'Modification...' : 'Modifier le mot de passe' }}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
const authStore = useAuthStore()
const profileLoading = ref(false)
const passwordLoading = ref(false)
const profileError = ref<string | null>(null)
const passwordError = ref<string | null>(null)
const passwordSuccess = ref<string | null>(null)
const profileForm = reactive({
  username: '',
  email: ''
})
const passwordForm = reactive({
  old_password: '',
  new_password: '',
  confirm_password: ''
})

// Gestion du logo
const logoFile = ref<File | null>(null)
const logoPreview = ref<string | null>(null)
const logoError = ref<string | null>(null)
const logoSuccess = ref<string | null>(null)
const logoUploading = ref(false)

onMounted(() => {
  if (authStore.user) {
    profileForm.username = authStore.user.username
    profileForm.email = authStore.user.email
  }
})

function handleLogoChange(event: Event) {
  const target = event.target as HTMLInputElement;
  if (!target.files || target.files.length === 0) return;

  const file = target.files[0];
  
  // Vérifications du fichier
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
  if (!allowedTypes.includes(file.type)) {
    logoError.value = 'Le format du fichier doit être JPG, JPEG ou PNG';
    logoFile.value = null;
    logoPreview.value = null;
    return;
  }
  
  const maxSize = 2 * 1024 * 1024; // 2Mo
  if (file.size > maxSize) {
    logoError.value = 'Le fichier est trop volumineux (maximum 2Mo)';
    logoFile.value = null;
    logoPreview.value = null;
    return;
  }

  // Vérifier les dimensions de l'image
  const img = new Image();
  img.onload = () => {
    URL.revokeObjectURL(img.src);
    const maxDimension = 2000; // Dimension maximale en pixels
    if (img.width > maxDimension || img.height > maxDimension) {
      logoError.value = `L'image ne doit pas dépasser ${maxDimension}x${maxDimension} pixels`;
      logoFile.value = null;
      logoPreview.value = null;
      return;
    }
    
    logoError.value = null;
    logoFile.value = file;
    
    // Créer une prévisualisation
    const reader = new FileReader();
    reader.onload = (e) => {
      logoPreview.value = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };
  img.onerror = () => {
    logoError.value = 'Le fichier sélectionné n\'est pas une image valide';
    logoFile.value = null;
    logoPreview.value = null;
  };
  img.src = URL.createObjectURL(file);
}

async function uploadLogo() {
  if (!logoFile.value) return;
  
  logoUploading.value = true;
  logoError.value = null;
  logoSuccess.value = null;
  
  try {
    await authStore.uploadLogo(logoFile.value);
    logoSuccess.value = 'Logo téléversé avec succès';
    logoFile.value = null;
    
    setTimeout(() => {
      logoSuccess.value = null;
    }, 3000);
  } catch (err: any) {
    if (err.response?.data?.error) {
      logoError.value = err.response.data.error;
    } else if (err.response?.data?.detail) {
      logoError.value = err.response.data.detail;
    } else {
      logoError.value = 'Une erreur est survenue lors du téléversement du logo';
    }
  } finally {
    logoUploading.value = false;
  }
}

function clearLogo() {
  logoFile.value = null
  logoPreview.value = null
  
  // Pour supprimer le logo, nous devrions appeler une API pour le supprimer 
  // sur le serveur, mais cette fonctionnalité n'est pas implémentée côté backend
  // Pour l'instant, laissons simplement l'utilisateur choisir un nouveau logo
  // sans supprimer l'existant sur le serveur
}

async function updateProfile() {
  profileLoading.value = true
  profileError.value = null
  try {
    await authStore.updateUserEmail(profileForm.email)
    // Afficher un message de succès temporaire
    const originalError = profileError.value
    profileError.value = 'Email mis à jour avec succès'
    setTimeout(() => {
      if (profileError.value === 'Email mis à jour avec succès') {
        profileError.value = null
      }
    }, 3000)
  } catch (err: any) {
    if (err.response?.data) {
      const errors = err.response.data
      if (typeof errors === 'object') {
        // Si l'erreur est un objet avec des champs spécifiques
        const errorMessages = Object.entries(errors)
          .map(([field, messages]) => {
            const message = Array.isArray(messages) ? messages[0] : messages
            return `${field}: ${message}`
          })
          .join('\n')
        profileError.value = errorMessages
      } else {
        // Si l'erreur est une chaîne simple
        profileError.value = String(errors)
      }
    } else if (err.message) {
      profileError.value = err.message
    } else {
      profileError.value = 'Une erreur est survenue lors de la mise à jour de l\'email'
    }
  } finally {
    profileLoading.value = false
  }
}
async function changePassword() {
  if (passwordForm.new_password !== passwordForm.confirm_password) {
    passwordError.value = 'Les mots de passe ne correspondent pas'
    passwordSuccess.value = null
    return
  }
  passwordLoading.value = true
  passwordError.value = null
  passwordSuccess.value = null
  try {
    await authStore.changePassword(
      passwordForm.old_password,
      passwordForm.new_password
    )
    // Réinitialiser le formulaire
    passwordForm.old_password = ''
    passwordForm.new_password = ''
    passwordForm.confirm_password = ''
    // Afficher un message de succès temporaire
    passwordSuccess.value = 'Mot de passe modifié avec succès'
    setTimeout(() => {
      if (passwordSuccess.value === 'Mot de passe modifié avec succès') {
        passwordSuccess.value = null
      }
    }, 3000)
  } catch (err: any) {
    if (err.response?.data) {
      const errors = err.response.data
      if (typeof errors === 'object') {
        const errorMessages = Object.entries(errors)
          .map(([field, messages]) => {
            const message = Array.isArray(messages) ? messages[0] : messages
            return `${field}: ${message}`
          })
          .join('\n')
        passwordError.value = errorMessages
      } else {
        passwordError.value = String(errors)
      }
    } else if (err.message) {
      passwordError.value = err.message
    } else {
      passwordError.value = 'Une erreur est survenue lors du changement de mot de passe'
    }
  } finally {
    passwordLoading.value = false
  }
}
</script> 