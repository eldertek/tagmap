<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import { ref, computed, onMounted, watch, onBeforeUnmount, watchEffect, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notification'
import SearchBar from '@/components/SearchBar.vue'
import PerformancePanel from '@/components/PerformancePanel.vue'
import PWAUpdateNotification from '@/components/PWAUpdateNotification.vue'
import PWAInstallPrompt from '@/components/PWAInstallPrompt.vue'

const router = useRouter()
const authStore = useAuthStore()
const notificationStore = useNotificationStore()

const showProfileMenu = ref(false)
const showMobileMenu = ref(false)
const showNotificationsMenu = ref(false)
const bellAnimating = ref(false)
const activeNotification = ref<{id: number, message: string, type: string} | null>(null)
const isExpanded = ref(false)
const isMobile = ref(false)

// Références DOM pour le positionnement
const bellButtonRef = ref<HTMLElement | null>(null)
const islandPositionTop = ref('13px')
const islandPositionRight = ref('65px')

// Références aux composants PWA
const pwaUpdateNotification = ref<InstanceType<typeof PWAUpdateNotification> | null>(null)
const pwaInstallPrompt = ref<InstanceType<typeof PWAInstallPrompt> | null>(null)

const showUpdateNotification = ref(false)

// Fonction pour détecter si on est sur mobile
function checkMobile() {
  isMobile.value = window.innerWidth < 768
}

// Écouter les changements de taille d'écran et les événements PWA
onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
  window.addEventListener('resize', updateIslandPosition)

  // Écouter les événements PWA
  window.addEventListener('pwa-update-available', () => {
    showUpdateNotification.value = true
  })
})

// Nettoyer les écouteurs d'événement
onBeforeUnmount(() => {
  window.removeEventListener('resize', checkMobile)
  window.removeEventListener('resize', updateIslandPosition)
  window.removeEventListener('pwa-update-available', () => {})
})

// Fonction pour déterminer la position de la Dynamic Island par rapport à la cloche
function updateIslandPosition() {
  if (!bellButtonRef.value) return

  const rect = bellButtonRef.value.getBoundingClientRect()

  // Utiliser des valeurs en pourcentage pour le positionnement vertical
  // pour éviter les sauts visuels lors des animations
  islandPositionTop.value = `${rect.top + window.scrollY + 5}px`

  // Centrer horizontalement avec une approche qui évite les sauts
  // en utilisant transform au lieu d'ajuster directement le right
  const centerPoint = rect.left + rect.width/2

  // Position horizontale (ajustée pour être centrée sur la cloche)
  islandPositionRight.value = `${window.innerWidth - centerPoint - 22}px`
}

// Données utilisateur depuis le store d'authentification
const userName = computed(() => {
  const user = authStore.user
  if (!user) return ''
  const fullName = `${user.first_name} ${user.last_name.toUpperCase()}`
  if (user.company_name) {
    return `${fullName} (${user.company_name})`
  }
  return fullName
})
const userRole = computed(() => {
  const userType = authStore.user?.user_type
  switch (userType) {
    case 'admin':
      return 'Accès administrateur'
    case 'entreprise':
      return 'Accès entreprise'
    case 'salarie':
      return 'Accès salarie'
    case 'visiteur':
      return 'Accès visiteur'
    default:
      return ''
  }
})
const isAdmin = computed(() => authStore.user?.user_type === 'admin')
const isAuthenticated = computed(() => authStore.isAuthenticated)
// Items de navigation de base
const baseNavigationItems = [
  { name: 'Carte', to: '/' },
  { name: 'Météo', to: '/meteo' },
  { name: 'Notes', to: '/notes' }
]
// Items de navigation avec condition pour l'onglet Utilisateurs
const navigationItems = computed(() => {
  if (!isAuthenticated.value) return []
  const items = [...baseNavigationItems]

  // Ajouter l'accès aux utilisateurs pour admin, entreprise et salarie
  if (isAdmin.value || authStore.user?.user_type === 'entreprise' || authStore.user?.user_type === 'salarie') {
    items.push({ name: 'Utilisateurs', to: '/users' })
  }

  // Ajouter l'accès aux paramètres pour les admins
  if (isAdmin.value) {
    items.push({ name: 'Paramètres', to: '/parametres' })
  }

  return items
})
// Items du menu profil
const profileMenuItems = computed(() => {
  if (!isAuthenticated.value) return []
  return [
    { name: 'Mon profil', to: '/profile' },
  ]
})
// Interface pour le paramètre de localisation
interface Location {
  lat: number
  lng: number
}
async function handleLogout() {
  try {
    await authStore.logout()
    router.push('/login')
  } catch (error) {
    console.error('Erreur lors de la déconnexion:', error)
  }
}
// Fonction pour gérer la sélection d'une adresse
function handleLocationSelect(location: Location) {
  // Émettre un événement personnalisé pour la carte
  window.dispatchEvent(new CustomEvent('map-set-location', {
    detail: {
      lat: location.lat,
      lng: location.lng,
      zoom: 16
    }
  }))
}
// Vérifier l'authentification au chargement
onMounted(async () => {
  console.log('App mounted, checking auth...')
  try {
    // Vérifier si un token existe
    const token = localStorage.getItem('token')
    if (token) {
      console.log('Token found, checking auth...')
      await authStore.checkAuth()
      // Forcer la récupération du profil utilisateur
      await authStore.fetchUserProfile()

      // Vérifier s'il y a un dernier plan ouvert
      const lastPlanId = localStorage.getItem('lastPlanId')
      if (lastPlanId) {
        // Émettre un événement pour charger le dernier plan
        window.dispatchEvent(new CustomEvent('load-last-plan', {
          detail: { planId: lastPlanId }
        }))
      }
    } else {
      console.log('No token found')
    }
  } catch (error) {
    console.error('Auth check error:', error)
    router.push('/login')
  }
})
// Titre de la page
const pageTitle = computed(() => {
  const baseTitle = 'TagMap'
  if (!isAuthenticated.value) return `${baseTitle} - Connexion`
  const currentRoute = router.currentRoute.value
  const routeTitles: Record<string, string> = {
    home: 'Carte',
    meteo: 'Météo',
    notes: 'Notes',
    users: 'Utilisateurs',
    profile: 'Mon profil',
    changePassword: 'Changement de mot de passe',
    map: 'Carte'
  }
  const routeTitle = routeTitles[currentRoute.name as string] || ''
  return routeTitle ? `${baseTitle} - ${routeTitle}` : baseTitle
})
// Mettre à jour le titre de la page
watch(pageTitle, (newTitle) => {
  document.title = newTitle
}, { immediate: true })
// Réactif avec les notifications
const notificationCount = computed(() => notificationStore.notifications.length)
// Fonction pour marquer toutes les notifications comme lues
function clearAllNotifications() {
  notificationStore.clearAll()
  showNotificationsMenu.value = false
}

// Fermer manuellement une notification active
function dismissActiveNotification() {
  if (activeNotification.value) {
    isExpanded.value = false
    setTimeout(() => {
      activeNotification.value = null
    }, 300)
  }
}

// Déclencher l'animation de la Dynamic Island quand une nouvelle notification est ajoutée
watchEffect(() => {
  if (notificationStore.lastAddedId !== null) {
    // Trouver la notification qui vient d'être ajoutée
    const notif = notificationStore.notifications.find(n => n.id === notificationStore.lastAddedId);

    if (notif) {
      // Mettre à jour la position immédiatement
      nextTick(() => {
        updateIslandPosition();

        // Animer la cloche et afficher la notification en même temps
        bellAnimating.value = true;

        // Afficher la Dynamic Island immédiatement
        activeNotification.value = {
          id: notif.id,
          message: notif.message,
          type: notif.type
        };

        // Développer l'island après un très court délai (pour permettre au rendu initial)
        requestAnimationFrame(() => {
          // Utiliser requestAnimationFrame pour s'assurer que l'animation est synchronisée avec le cycle de rendu
          setTimeout(() => {
            isExpanded.value = true;

            // Durée d'affichage avant de refermer
            setTimeout(() => {
              // Fermer l'island
              isExpanded.value = false;

              // Attendre la fin de l'animation de fermeture avant de masquer
              setTimeout(() => {
                if (activeNotification.value?.id === notif.id) {
                  activeNotification.value = null;
                  bellAnimating.value = false;
                }
              }, 300);
            }, 4000);
          }, 50);
        });
      });
    }
  }
})
</script>
<template>
  <div class="app-container">
    <!-- NavToolbar -->
    <header v-if="isAuthenticated" class="app-header bg-white shadow-sm z-[2500] flex-shrink-0">
      <nav class="mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex h-16 items-center justify-between">
          <!-- Logo et navigation -->
          <div class="flex items-center">
            <!-- Bouton menu mobile -->
            <button
              @click="showMobileMenu = !showMobileMenu"
              class="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 md:hidden"
            >
              <span class="sr-only">Ouvrir le menu</span>
              <svg
                class="h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  v-if="!showMobileMenu"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
                <path
                  v-else
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            <router-link
              to="/"
              class="text-xl font-semibold text-primary-600 truncate ml-2 md:ml-0"
            >
              <span class="md:inline hidden">TagMap</span>
              <span class="md:hidden inline">TM</span>
            </router-link>

            <div class="hidden md:flex md:ml-6 space-x-8">
              <router-link
                v-for="item in navigationItems"
                :key="item.name"
                :to="item.to"
                class="text-sm font-medium transition-colors duration-200"
                :class="[
                  $route.path === item.to
                    ? 'text-primary-600 border-b-2 border-primary-500'
                    : 'text-gray-500 hover:text-gray-900'
                ]"
              >
                {{ item.name }}
              </router-link>
            </div>
          </div>

          <!-- Barre de recherche -->
          <div v-if="$route.path === '/'" class="flex-1 mx-2">
            <div class="hidden md:block">
              <SearchBar @select-location="handleLocationSelect" />
            </div>
            <div class="md:hidden">
              <SearchBar @select-location="handleLocationSelect" class="max-w-full" />
            </div>
          </div>
          <div v-else class="flex-1"></div>

          <!-- Menu de droite (notifications et profil) -->
          <div class="flex items-center space-x-2 md:space-x-4">
            <!-- Notifications -->
            <div class="relative">
              <button
                ref="bellButtonRef"
                @click="showNotificationsMenu = !showNotificationsMenu"
                class="relative flex items-center justify-center p-2 text-gray-400 hover:text-gray-500 rounded-full hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                :class="{ 'animate-bell': bellAnimating }"
              >
                <span class="sr-only">Voir les notifications</span>
                <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
              </button>

              <!-- Menu notifications -->
              <div
                v-if="showNotificationsMenu"
                class="absolute right-0 mt-2 md:w-80 w-screen md:origin-top-right md:rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-[3500] md:right-0 right-0 left-0 md:left-auto"
                :style="isMobile ? 'position: fixed; top: 64px; left: 0; right: 0; margin: 0;' : ''"
              >
                <div class="px-4 py-2 border-b border-gray-100 flex justify-between items-center">
                  <div class="flex items-center justify-between w-full">
                    <h3 class="text-sm font-semibold text-gray-700">Notifications</h3>
                    <div class="flex items-center space-x-3">
                      <button
                        v-if="notificationCount > 0"
                        @click="clearAllNotifications"
                        class="text-xs text-primary-600 hover:text-primary-800"
                      >
                        Tout effacer
                      </button>
                      <button
                        @click="showNotificationsMenu = false"
                        class="md:hidden p-1 rounded-full hover:bg-gray-100"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                <div class="max-h-72 overflow-y-auto">
                  <div v-if="notificationCount === 0" class="px-4 py-3 text-sm text-gray-500 text-center">
                    Aucune notification
                  </div>

                  <div
                    v-for="notification in notificationStore.notifications"
                    :key="notification.id"
                    class="px-4 py-3 md:py-3 py-4 border-b border-gray-100 last:border-0 hover:bg-gray-50"
                  >
                    <div class="flex items-start">
                      <div class="flex-shrink-0 mr-3">
                        <!-- Success icon -->
                        <svg v-if="notification.type === 'success'" class="h-6 w-6 md:h-5 md:w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                        </svg>
                        <!-- Error icon -->
                        <svg v-else-if="notification.type === 'error'" class="h-6 w-6 md:h-5 md:w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                        </svg>
                        <!-- Warning icon -->
                        <svg v-else-if="notification.type === 'warning'" class="h-6 w-6 md:h-5 md:w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                        </svg>
                        <!-- Info icon -->
                        <svg v-else class="h-6 w-6 md:h-5 md:w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                        </svg>
                      </div>
                      <div class="flex-1">
                        <p class="text-sm md:text-sm text-gray-800">{{ notification.message }}</p>
                        <button
                          @click="notificationStore.removeNotification(notification.id)"
                          class="text-xs md:text-xs text-primary-600 hover:text-primary-800 mt-2 md:mt-1 py-1 md:py-0"
                        >
                          Fermer
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Menu profil -->
            <div class="relative">
              <button
                @click="showProfileMenu = !showProfileMenu"
                class="flex items-center space-x-2 md:space-x-3 focus:outline-none"
              >
                <div class="hidden md:flex flex-col items-end">
                  <span class="text-sm font-medium text-gray-700">{{ userName }}</span>
                  <span v-if="userRole" class="text-xs text-gray-500">{{ userRole }}</span>
                </div>
                <img
                  class="h-8 w-8 rounded-full ring-2 ring-white"
                  :src="authStore.user?.logo || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(userName)"
                  :alt="userName"
                />
              </button>
              <!-- Menu profil déroulant -->
              <div
                v-if="showProfileMenu"
                class="absolute right-0 mt-2 md:w-48 w-screen md:origin-top-right md:rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-[3500] md:right-0 right-0 left-0 md:left-auto"
                :style="isMobile ? 'position: fixed; top: 64px; left: 0; right: 0; margin: 0;' : ''"
              >
                <div class="md:hidden px-4 py-2 border-b border-gray-100 flex justify-between items-center">
                  <div>
                    <div class="text-sm font-semibold text-gray-700">{{ userName }}</div>
                    <div class="text-xs text-gray-500">{{ userRole }}</div>
                  </div>
                  <button @click="showProfileMenu = false" class="p-1 rounded-full hover:bg-gray-100">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <router-link
                  v-for="item in profileMenuItems"
                  :key="item.name"
                  :to="item.to"
                  class="block px-4 md:py-2 py-3 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                  @click="showProfileMenu = false"
                >
                  {{ item.name }}
                </router-link>
                <button
                  @click="handleLogout"
                  class="block w-full px-4 md:py-2 py-3 text-left text-sm text-red-600 hover:bg-gray-50 font-medium"
                >
                  Déconnexion
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Menu mobile -->
        <div
          v-if="showMobileMenu"
          class="md:hidden fixed inset-0 bg-white shadow-lg z-[3000] border-t border-gray-200"
          style="top: var(--header-height);"
        >
          <div class="space-y-1 px-2 pb-3 pt-2">
            <router-link
              v-for="item in navigationItems"
              :key="item.name"
              :to="item.to"
              class="block px-3 py-2 rounded-md text-base font-medium"
              :class="[
                $route.path === item.to
                  ? 'bg-primary-50 text-primary-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              ]"
              @click="showMobileMenu = false"
            >
              {{ item.name }}
            </router-link>
          </div>
        </div>
      </nav>
    </header>
    <!-- Main content -->
    <main class="app-main">
      <router-view></router-view>
    </main>

    <!-- Panneau de performance (visible si le paramètre URL perf=true est présent) -->
    <PerformancePanel position="bottom-left" />

    <!-- Composants PWA -->
    <PWAUpdateNotification ref="pwaUpdateNotification" />
    <PWAInstallPrompt ref="pwaInstallPrompt" />
  </div>
</template>
<style>
/* Consistent layout variables */
:root {
  --header-height: 64px;
  --toolbar-height: 49px; /* MapToolbar height */
  --mobile-toolbar-height: 50px;
  --mobile-bottom-toolbar-height: 48px;
  --drawing-tools-width-desktop: 20rem;
}

/* Base layout */
.app-container {
  height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden; /* Prevent any scrolling on the main container */
}

.app-header {
  height: var(--header-height);
  flex-shrink: 0;
}

.app-main {
  flex: 1;
  height: calc(100vh - var(--header-height));
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* General styles */
body {
  @apply bg-gray-50;
}

/* Desktop specific styles */
@media (min-width: 768px) {
  body, #app {
    @apply h-screen overflow-hidden;
  }
  
  /* Ensure content scrolling works in tabs while preserving overall layout */
  .tab-content {
    overflow-y: auto;
  }
}

/* Mobile specific styles */
@media (max-width: 767px) {
  body, #app {
    @apply min-h-screen overflow-hidden;
    position: fixed;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
  }
}

/* Map layout components */
.map-container {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.map-toolbar {
  flex-shrink: 0;
  height: var(--toolbar-height);
}

.map-content {
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* Animation de la cloche de notification */
@keyframes bell-ring {
  0% { transform: rotate(0); }
  10% { transform: rotate(10deg); }
  20% { transform: rotate(-10deg); }
  30% { transform: rotate(6deg); }
  40% { transform: rotate(-6deg); }
  50% { transform: rotate(0); }
  100% { transform: rotate(0); }
}

.animate-bell {
  animation: bell-ring 0.6s cubic-bezier(0.36, 0.07, 0.19, 0.97);
  animation-iteration-count: 1;
  transform-origin: top center;
  will-change: transform;
}

/* Dynamic Island Style */
.dynamic-island {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
  overflow: hidden;
  backdrop-filter: blur(4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2), 0 2px 4px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  will-change: transform, width, border-radius;
  transform: translateZ(0);
}

.island-pill {
  width: 42px;
  height: 36px;
  border-radius: 20px;
  transform-origin: center right;
}

.island-expanded {
  width: auto;
  max-width: min(400px, 90%);
  min-width: 42px;
  height: 36px;
  border-radius: 20px;
  transform-origin: center right;
}

/* Animations pour Dynamic Island */
.island-enter-active,
.island-leave-active {
  transition: all 0.25s cubic-bezier(0.22, 1, 0.36, 1);
  will-change: transform, opacity;
}

.island-enter-from {
  transform: scale(0.9);
  opacity: 0;
}

.island-leave-to {
  transform: scale(0.9);
  opacity: 0;
}

/* Animation pour le message */
.message-container {
  max-width: 300px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  will-change: opacity, transform;
}

.message-enter-active {
  transition: all 0.2s cubic-bezier(0.22, 1, 0.36, 1);
}

.message-leave-active {
  transition: all 0.15s cubic-bezier(0.22, 1, 0.36, 1);
}

.message-enter-from {
  opacity: 0;
  transform: translateX(-10px);
}

.message-leave-to {
  opacity: 0;
  transform: translateX(10px);
}
</style>
