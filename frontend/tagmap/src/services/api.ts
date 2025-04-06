import axios from 'axios';
import { useAuthStore } from '@/stores/auth';
import { usePerformanceMonitor } from '@/utils/usePerformanceMonitor';

// Types nécessaires
export interface UserFilter {
  role?: string;
  entreprise?: number;
  salarie?: number;
  include_plans?: boolean;
  search?: string;
  salarie_id?: number;
  include_details?: boolean;
}

// Type pour les erreurs d'API standardisées
export interface ApiError {
  field: string;
  message: string;
}

// Configuration de base de l'API
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  withCredentials: true
});

const performanceMonitor = usePerformanceMonitor();

// Fonction utilitaire pour obtenir un cookie
function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

// Intercepteur pour ajouter le token aux requêtes
api.interceptors.request.use(
  async (config) => {
    const endMeasure = performanceMonitor.startMeasure('api_request_interceptor', 'ApiService');
    try {
      const token = getCookie('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      // Log pour debug
      console.log('Request config:', {
        url: config.url,
        method: config.method,
        headers: config.headers,
        withCredentials: config.withCredentials
      });
      return config;
    } finally {
      endMeasure();
    }
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Intercepteur pour gérer les erreurs d'authentification
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const endMeasure = performanceMonitor.startMeasure('api_response_interceptor', 'ApiService');
    const originalRequest = error.config;
    try {
      // Ne pas tenter de refresh si c'est déjà une requête de refresh ou si on a déjà essayé
      if (error.response?.status === 401 &&
          !originalRequest._retry &&
          !originalRequest.url?.includes('/token/refresh/')) {
        originalRequest._retry = true;
        const authStore = useAuthStore();

        try {
          await performanceMonitor.measureAsync(
            'token_refresh',
            () => authStore.refreshToken(),
            'ApiService'
          );

          const newToken = getCookie('access_token');
          if (newToken) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
          }
        } catch (refreshError) {
          // Si le refresh échoue, déconnecter et rediriger vers login
          await authStore.logout();
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
          return Promise.reject(refreshError);
        }
      }
      return Promise.reject(error);
    } finally {
      endMeasure();
    }
  }
);

// Utilitaire pour formater les erreurs d'API de manière standardisée
export function formatApiErrors(error: any): ApiError[] {
  const formatted: ApiError[] = [];

  // Si nous avons une réponse d'erreur du serveur
  if (error.response?.data) {
    const errorData = error.response.data;

    // Erreurs sous forme de dictionnaire (champ -> [erreurs])
    if (typeof errorData === 'object' && !Array.isArray(errorData)) {
      Object.entries(errorData).forEach(([field, messages]) => {
        if (Array.isArray(messages)) {
          messages.forEach(message => {
            formatted.push({ field, message });
          });
        } else if (typeof messages === 'string') {
          formatted.push({ field, message: messages });
        }
      });
    }
    // Message d'erreur global
    else if (typeof errorData === 'string') {
      formatted.push({ field: 'non_field_error', message: errorData });
    }
    // Erreur détaillée (DRF)
    else if (errorData.detail) {
      formatted.push({ field: 'non_field_error', message: errorData.detail });
    }
  }
  // Pas de réponse du serveur (erreur réseau)
  else if (error.message) {
    formatted.push({ field: 'non_field_error', message: `Erreur de connexion: ${error.message}` });
  }

  // Si aucune erreur n'a été formatée, ajouter un message générique
  if (formatted.length === 0) {
    formatted.push({ field: 'non_field_error', message: 'Une erreur inconnue s\'est produite' });
  }

  return formatted;
}

// Service d'authentification
export const authService = {
  async login(username: string, password: string) {
    const endMeasure = performanceMonitor.startMeasure('auth_login', 'AuthService');
    try {
      const response = await performanceMonitor.measureAsync(
        'login_request',
        () => api.post('/token/', { username, password }),
        'AuthService'
      );
      return response.data;
    } finally {
      endMeasure();
    }
  },
  async logout() {
    const endMeasure = performanceMonitor.startMeasure('auth_logout', 'AuthService');
    try {
      await performanceMonitor.measureAsync(
        'logout_request',
        () => api.post('/token/logout/'),
        'AuthService'
      );
    } finally {
      endMeasure();
    }
  },
  async register(userData: { username: string; email: string; password: string }) {
    const endMeasure = performanceMonitor.startMeasure('auth_register', 'AuthService');
    try {
      return await performanceMonitor.measureAsync(
        'register_request',
        () => api.post('/register/', userData),
        'AuthService'
      );
    } finally {
      endMeasure();
    }
  },
};

// Fonction utilitaire centrale pour récupérer les utilisateurs selon leur rôle et hiérarchie
export async function fetchUsersByHierarchy(params: {
  role: string;
  entrepriseId?: number;
  salarieId?: number;
  includeDetails?: boolean;
  search?: string;
}) {
  console.log(`[fetchUsersByHierarchy] Récupération des utilisateurs:`, params);

  const filters: UserFilter = {
    role: params.role
  };

  if (params.entrepriseId) {
    filters.entreprise = params.entrepriseId;
  }

  if (params.salarieId) {
    filters.salarie = params.salarieId;
  }

  if (params.includeDetails) {
    filters.include_plans = true;
  }

  if (params.search) {
    filters.search = params.search;
  }

  console.log(`[fetchUsersByHierarchy] Filtres appliqués:`, filters);

  try {
    const response = await userService.getUsers(filters);
    console.log(`[fetchUsersByHierarchy] Résultat (${response.data.length} utilisateurs):`, response.data);
    return response.data;
  } catch (error) {
    console.error(`[fetchUsersByHierarchy] Erreur lors de la récupération des utilisateurs:`, error);
    throw error;
  }
}

// Service pour les utilisateurs
export const userService = {
  // Récupérer tous les utilisateurs avec filtrage optionnel
  async getUsers(filters: UserFilter = {}) {
    const endMeasure = performanceMonitor.startMeasure('get_users', 'UserService');
    try {
      return await performanceMonitor.measureAsync(
        'get_users_request',
        () => api.get('/users/', { params: filters }),
        'UserService'
      );
    } finally {
      endMeasure();
    }
  },

  // Récupérer un utilisateur spécifique
  async getUser(userId: number) {
    return await api.get(`/users/${userId}/`);
  },

  // Créer un nouvel utilisateur
  async createUser(userData: any) {
    return await api.post('/users/', userData);
  },

  // Mettre à jour un utilisateur existant
  async updateUser(userId: number, userData: any) {
    return await api.patch(`/users/${userId}/`, userData);
  },

  // Supprimer un utilisateur
  async deleteUser(userId: number) {
    return await api.delete(`/users/${userId}/`);
  },

  // Récupérer toutes les entreprises
  async getEntreprises() {
    return await api.get('/users/', { params: { role: 'ENTREPRISE' } });
  },

  // Récupérer tous les salaries (optionnellement filtrés par entreprise)
  async getSalaries(entrepriseId?: number) {
    const params: UserFilter = { role: 'SALARIE' };
    if (entrepriseId) {
      params.entreprise = entrepriseId;
    }
    return await api.get('/users/', { params });
  },

  // Récupérer tous les visiteurs d'un salarie
  async getSalarieVisiteurs(salarieId: number) {
    return await api.get('/users/', {
      params: {
        role: 'VISITEUR',
        salarie: salarieId
      }
    });
  },

  // Récupérer tous les visiteurs d'une entreprise
  async getEntrepriseVisiteurs(entrepriseId: number) {
    return await api.get('/users/', {
      params: {
        role: 'VISITEUR',
        entreprise: entrepriseId
      }
    });
  },

  // Fonction unifiée pour récupérer les utilisateurs selon la hiérarchie
  async getUsersByHierarchy(params: {
    role: string;
    entrepriseId?: number;
    salarieId?: number;
    includeDetails?: boolean;
    search?: string;
  }) {
    const endMeasure = performanceMonitor.startMeasure('get_users_hierarchy', 'UserService');
    try {
      const filters = performanceMonitor.measure(
        'prepare_hierarchy_filters',
        () => {
          const result: UserFilter = { role: params.role };
          if (params.entrepriseId) result.entreprise = params.entrepriseId;
          if (params.salarieId) result.salarie = params.salarieId;
          if (params.includeDetails) result.include_plans = true;
          if (params.search) result.search = params.search;
          return result;
        },
        'UserService'
      );

      return await performanceMonitor.measureAsync(
        'get_users_hierarchy_request',
        () => api.get('/users/', { params: filters }),
        'UserService'
      );
    } finally {
      endMeasure();
    }
  },

  // Récupérer les salaries d'une entreprise spécifique
  async getEntrepriseSalaries(entrepriseId: number) {
    return await api.get('/users/', {
      params: {
        role: 'SALARIE',
        entreprise: entrepriseId
      }
    });
  },

  // Récupérer tous les visiteurs liés à un salarie
  async getVisiteurs(salarieId?: number, entrepriseId?: number) {
    const params: UserFilter = { role: 'VISITEUR' };

    if (salarieId) {
      params.salarie = salarieId;
    }

    if (entrepriseId) {
      params.entreprise = entrepriseId;
    }

    return await api.get('/users/', { params });
  },

  // Assigner une entreprise à un salarie
  async assignEntrepriseToSalarie(salarieId: number, entrepriseId: number) {
    return await api.patch(`/users/${salarieId}/`, {
      entreprise: entrepriseId
    });
  },

  // Assigner un salarie à un visiteur
  async assignSalarieToVisiteur(visiteurId: number, salarieId: number) {
    return await api.patch(`/users/${visiteurId}/`, {
      salarie: salarieId
    });
  },

  // Formater le nom du fichier logo avec monitoring
  formatLogoFileName(file: File): string {
    return performanceMonitor.measure(
      'format_logo_filename',
      () => {
        const timestamp = new Date().getTime();
        const extension = file.name.split('.').pop()?.toLowerCase() || '';
        const sanitizedName = file.name
          .split('.')[0]
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
        return `${sanitizedName}-${timestamp}.${extension}`;
      },
      'UserService'
    );
  },

  // Télécharger un logo utilisateur avec monitoring
  async uploadLogo(logoFile: File) {
    const endMeasure = performanceMonitor.startMeasure('upload_logo', 'UserService');
    try {
      const formData = new FormData();
      const formattedFileName = this.formatLogoFileName(logoFile);
      const newFile = new File([logoFile], formattedFileName, { type: logoFile.type });
      formData.append('logo', newFile);

      return await performanceMonitor.measureAsync(
        'upload_logo_request',
        () => api.post('/users/upload_logo/', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }),
        'UserService'
      );
    } finally {
      endMeasure();
    }
  }
};

// Service pour les plans d'irrigation
export const irrigationService = {
  async getPlans() {
    const endMeasure = performanceMonitor.startMeasure('get_plans', 'IrrigationService');
    try {
      return await performanceMonitor.measureAsync(
        'get_plans_request',
        () => api.get('/plans/'),
        'IrrigationService'
      );
    } finally {
      endMeasure();
    }
  },

  async createPlan(planData: any) {
    const endMeasure = performanceMonitor.startMeasure('create_plan', 'IrrigationService');
    try {
      const formattedData = performanceMonitor.measure(
        'format_plan_data',
        () => ({
          ...planData,
          entreprise: planData.entreprise ? (typeof planData.entreprise === 'object' && 'id' in planData.entreprise ? planData.entreprise.id : Number(planData.entreprise)) : null,
          salarie: planData.salarie ? (typeof planData.salarie === 'object' && 'id' in planData.salarie ? planData.salarie.id : Number(planData.salarie)) : null,
          visiteur: planData.visiteur ? (typeof planData.visiteur === 'object' && 'id' in planData.visiteur ? planData.visiteur.id : Number(planData.visiteur)) : null
        }),
        'IrrigationService'
      );

      return await performanceMonitor.measureAsync(
        'create_plan_request',
        () => api.post('/plans/', formattedData),
        'IrrigationService'
      );
    } finally {
      endMeasure();
    }
  },

  async updatePlan(planId: number, planData: any) {
    const endMeasure = performanceMonitor.startMeasure('update_plan', 'IrrigationService');
    try {
      return await performanceMonitor.measureAsync(
        'update_plan_request',
        () => api.put(`/plans/${planId}/`, planData),
        'IrrigationService'
      );
    } finally {
      endMeasure();
    }
  },

  async deletePlan(planId: number) {
    const endMeasure = performanceMonitor.startMeasure('delete_plan', 'IrrigationService');
    try {
      return await performanceMonitor.measureAsync(
        'delete_plan_request',
        () => api.delete(`/plans/${planId}/`),
        'IrrigationService'
      );
    } finally {
      endMeasure();
    }
  },

  async getVisiteurPlans(visiteurId: number) {
    return await api.get('/plans/', { params: { visiteur: visiteurId } });
  },

  async createPlanForVisiteur(planData: any) {
    return await api.post('/plans/', planData);
  },

  // Récupérer les plans d'une entreprise (inclut tous les plans des salaries associés)
  async getEntreprisePlans(entrepriseId: number) {
    return await api.get('/plans/', { params: { entreprise: entrepriseId } });
  },

  // Récupérer les plans d'un salarie
  async getSalariePlans(salarieId: number) {
    return await api.get('/plans/', { params: { salarie: salarieId } });
  },

  // Créer un plan pour un salarie
  async createPlanForSalarie(planData: any, salarieId: number) {
    const data = { ...planData, salarie: salarieId };
    return await api.post('/plans/', data);
  },

  // Créer un plan pour une entreprise
  async createPlanForEntreprise(planData: any, entrepriseId: number) {
    const data = { ...planData, entreprise: entrepriseId };
    return await api.post('/plans/', data);
  }
};

// Service pour les notes géolocalisées
export const noteService = {
  // Récupérer toutes les notes
  async getNotes(filters = {}) {
    const endMeasure = performanceMonitor.startMeasure('get_notes', 'NoteService');
    try {
      return await performanceMonitor.measureAsync(
        'get_notes_request',
        () => api.get('/notes/', { params: filters }),
        'NoteService'
      );
    } finally {
      endMeasure();
    }
  },

  // Récupérer les notes associées à un plan spécifique
  async getNotesByPlan(planId: number) {
    const endMeasure = performanceMonitor.startMeasure('get_notes_by_plan', 'NoteService');
    try {
      return await performanceMonitor.measureAsync(
        'get_notes_by_plan_request',
        () => api.get('/notes/', { params: { plan: planId } }),
        'NoteService'
      );
    } finally {
      endMeasure();
    }
  },

  // Récupérer une note spécifique
  async getNote(noteId: number) {
    const endMeasure = performanceMonitor.startMeasure('get_note', 'NoteService');
    try {
      return await performanceMonitor.measureAsync(
        'get_note_request',
        () => api.get(`/notes/${noteId}/`),
        'NoteService'
      );
    } finally {
      endMeasure();
    }
  },

  // Créer une nouvelle note
  async createNote(noteData: any) {
    const endMeasure = performanceMonitor.startMeasure('create_note', 'NoteService');
    try {
      // Si la note n'a pas de localisation, on laisse le champ undefined pour que le backend le gère
      const postData = {
        ...noteData
      };

      // Ne pas envoyer une location vide au backend, celui-ci s'attend à un GeoJSON valide
      if (postData.location && Object.keys(postData.location).length === 0) {
        delete postData.location;
      }

      return await performanceMonitor.measureAsync(
        'create_note_request',
        () => api.post('/notes/', postData),
        'NoteService'
      );
    } finally {
      endMeasure();
    }
  },

  // Mettre à jour une note existante
  async updateNote(noteId: number, noteData: any) {
    console.log('[noteService][updateNote] Mise à jour de la note:', { noteId, noteData });
    const endMeasure = performanceMonitor.startMeasure('update_note', 'NoteService');
    try {
      // Préparer les données pour la mise à jour
      const updateData = {
        ...noteData
      };

      // Ne pas envoyer une location vide au backend si elle est présente
      if (updateData.location && Object.keys(updateData.location).length === 0) {
        delete updateData.location;
      }

      // Gérer la conversion de l'ID de la colonne
      if (noteData.column !== undefined) {
        // S'assurer que column est envoyée telle quelle (sans conversion)
        updateData.column = noteData.column;
      } else if (noteData.columnId !== undefined) {
        // Si columnId est fourni mais pas column, utiliser columnId
        updateData.column = noteData.columnId;
      }

      // Supprimer les champs redondants
      delete updateData.columnId;
      delete updateData.column_id;
      delete updateData.column_details;

      console.log('[noteService][updateNote] Données formatées:', updateData);

      const response = await performanceMonitor.measureAsync(
        'update_note_request',
        () => api.patch(`/notes/${noteId}/`, updateData),
        'NoteService'
      );

      console.log('[noteService][updateNote] Réponse du serveur:', response.data);
      return response;
    } catch (error) {
      console.error('[noteService][updateNote] Erreur lors de la mise à jour:', error);
      throw error;
    } finally {
      endMeasure();
    }
  },

  // Supprimer une note
  async deleteNote(noteId: number) {
    const endMeasure = performanceMonitor.startMeasure('delete_note', 'NoteService');
    try {
      return await performanceMonitor.measureAsync(
        'delete_note_request',
        () => api.delete(`/notes/${noteId}/`),
        'NoteService'
      );
    } finally {
      endMeasure();
    }
  },

  // Gérer les commentaires
  async getComments(noteId: number) {
    return await api.get(`/notes/${noteId}/comments/`);
  },

  async addComment(noteId: number, commentText: any) {
    // Si le commentaire est déjà un objet, l'utiliser tel quel
    const data = typeof commentText === 'string'
      ? { text: commentText }
      : commentText;

    console.log(`[noteService][addComment] Envoi du commentaire pour la note ${noteId}:`, data);
    return await api.post(`/notes/${noteId}/comments/`, data);
  },

  async updateComment(noteId: number, commentId: number, commentData: any) {
    return await api.patch(`/notes/${noteId}/comments/${commentId}/`, commentData);
  },

  async deleteComment(noteId: number, commentId: number) {
    return await api.delete(`/notes/${noteId}/comments/${commentId}/`);
  },

  // Gérer les photos
  async getPhotos(noteId: number) {
    return await api.get(`/notes/${noteId}/photos/`);
  },

  async addPhoto(noteId: number, photoData: FormData) {
    return await api.post(`/notes/${noteId}/photos/`, photoData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },

  async updatePhoto(noteId: number, photoId: number, photoData: any) {
    return await api.patch(`/notes/${noteId}/photos/${photoId}/`, photoData);
  },

  async deletePhoto(noteId: number, photoId: number) {
    return await api.delete(`/notes/${noteId}/photos/${photoId}/`);
  }
};

// Service pour les colonnes de notes
export const columnService = {
  // Récupérer toutes les colonnes
  async getColumns() {
    console.log('\n[columnService][getColumns] Récupération des colonnes');
    const endMeasure = performanceMonitor.startMeasure('get_columns', 'ColumnService');
    try {
      const response = await performanceMonitor.measureAsync(
        'get_columns_request',
        () => api.get('/columns/'),
        'ColumnService'
      );
      console.log('[columnService][getColumns] Réponse:', response.data);
      return response;
    } catch (error) {
      console.error('[columnService][getColumns] Erreur:', error);
      throw error;
    } finally {
      endMeasure();
    }
  },

  // Créer une nouvelle colonne
  async createColumn(columnData: any) {
    console.log('\n[columnService][createColumn] Création d\'une colonne:', columnData);
    const endMeasure = performanceMonitor.startMeasure('create_column', 'ColumnService');
    try {
      const response = await performanceMonitor.measureAsync(
        'create_column_request',
        () => api.post('/columns/', columnData),
        'ColumnService'
      );
      console.log('[columnService][createColumn] Réponse:', response.data);
      return response;
    } catch (error) {
      console.error('[columnService][createColumn] Erreur:', error);
      throw error;
    } finally {
      endMeasure();
    }
  },

  // Mettre à jour une colonne
  async updateColumn(columnId: string, columnData: any) {
    console.log('\n[columnService][updateColumn] Mise à jour de la colonne:', columnId, columnData);
    const endMeasure = performanceMonitor.startMeasure('update_column', 'ColumnService');
    try {
      const response = await performanceMonitor.measureAsync(
        'update_column_request',
        () => api.patch(`/columns/${columnId}/`, columnData),
        'ColumnService'
      );
      console.log('[columnService][updateColumn] Réponse:', response.data);
      return response;
    } catch (error) {
      console.error('[columnService][updateColumn] Erreur:', error);
      throw error;
    } finally {
      endMeasure();
    }
  },

  // Supprimer une colonne
  async deleteColumn(columnId: string) {
    const endMeasure = performanceMonitor.startMeasure('delete_column', 'ColumnService');
    try {
      return await performanceMonitor.measureAsync(
        'delete_column_request',
        () => api.delete(`/columns/${columnId}/`),
        'ColumnService'
      );
    } finally {
      endMeasure();
    }
  },

  // Mettre à jour l'ordre des colonnes
  async updateColumnsOrder(columnsOrder: string[]) {
    const endMeasure = performanceMonitor.startMeasure('update_columns_order', 'ColumnService');
    try {
      return await performanceMonitor.measureAsync(
        'update_columns_order_request',
        () => api.post('/columns/reorder/', { columns: columnsOrder }),
        'ColumnService'
      );
    } finally {
      endMeasure();
    }
  }
};

export default api;