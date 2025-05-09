import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import ChangePasswordForm from '@/components/auth/ChangePasswordForm.vue'
import LoginView from '../views/LoginView.vue'
import MapView from '../views/MapView.vue'
import UserListView from '@/views/UserListView.vue'
import NotesView from '../views/NotesView.vue'
import MeteoView from '../views/MeteoView.vue'
import ParametresView from '../views/ParametresView.vue'

const router = createRouter({
  history: createWebHistory('/'),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/openlayers/MapView.vue'),
      meta: {
        requiresAuth: true,
        allowedRoles: ['admin', 'entreprise', 'salarie', 'visiteur'],
        isMapRoute: true
      }
    },
    {
      path: '/leaflet',
      name: 'leaflet',
      component: MapView,
      meta: {
        requiresAuth: true,
        allowedRoles: ['admin', 'entreprise', 'salarie', 'visiteur'],
        isMapRoute: true
      }
    },
    {
      path: '/meteo',
      name: 'meteo',
      component: MeteoView,
      meta: {
        requiresAuth: true,
        allowedRoles: ['admin', 'entreprise', 'salarie', 'visiteur']
      }
    },
    {
      path: '/users',
      name: 'users',
      component: UserListView,
      meta: {
        requiresAuth: true,
        allowedRoles: ['admin', 'entreprise', 'salarie']
      }
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('@/views/ProfileView.vue'),
      meta: {
        requiresAuth: true,
        allowedRoles: ['admin', 'entreprise', 'salarie', 'visiteur']
      }
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { requiresGuest: true }
    },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: () => import('@/views/ForgotPasswordView.vue'),
      meta: { requiresGuest: true }
    },
    {
      path: '/reset-password/:token',
      name: 'reset-password',
      component: () => import('@/views/ResetPasswordView.vue'),
      meta: { requiresGuest: true }
    },
    {
      path: '/change-password',
      name: 'changePassword',
      component: ChangePasswordForm,
      meta: {
        requiresAuth: true,
        allowedRoles: ['admin', 'entreprise', 'salarie', 'visiteur']
      }
    },
    {
      path: '/notes',
      name: 'notes',
      component: NotesView,
      meta: {
        requiresAuth: true,
        allowedRoles: ['admin', 'entreprise', 'salarie', 'visiteur']
      }
    },
    {
      path: '/parametres',
      name: 'parametres',
      component: ParametresView,
      meta: {
        requiresAuth: true,
        allowedRoles: ['admin']
      }
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundView.vue')
    }
  ]
})
// Navigation guard
router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore()
  // Vérifier l'état initial au premier chargement
  if (!authStore.initialized) {
    try {
      await authStore.initialize(window.INITIAL_STATE)
    } catch (error) {
      console.error('Error initializing auth store:', error)
    }
  }
  const isAuthenticated = authStore.isAuthenticated
  const mustChangePassword = authStore.user?.must_change_password
  const userType = authStore.user?.user_type
  // Si la route nécessite une authentification et que l'utilisateur n'est pas authentifié
  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/login')
    return
  }
  // Si l'utilisateur doit changer son mot de passe
  if (isAuthenticated && mustChangePassword && to.name !== 'changePassword') {
    next({ name: 'changePassword' })
    return
  }
  // Si l'utilisateur est sur la route de changement de mot de passe mais n'a pas besoin de le changer
  if (to.name === 'changePassword' && !mustChangePassword) {
    next({ name: 'home' })
    return
  }
  // Vérification des rôles autorisés
  if (to.meta.allowedRoles && userType) {
    const allowedRoles = to.meta.allowedRoles as string[]
    if (!allowedRoles.includes(userType)) {
      next({ name: 'home' })
      return
    }
  }
  // Si l'utilisateur est authentifié et essaie d'accéder à une route guest
  if (to.meta.requiresGuest && isAuthenticated) {
    next({ name: 'home' })
    return
  }
  next()
})
export default router
