import axios from 'axios';
import { useAuthStore } from '@/stores/auth';

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
    try {
      const token = getCookie('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    } catch (error) {
      return config;
    }
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur pour gérer les erreurs d'authentification
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    try {
      // Ne pas tenter de refresh si c'est déjà une requête de refresh ou si on a déjà essayé
      if (error.response?.status === 401 &&
          !originalRequest._retry &&
          !originalRequest.url?.includes('/token/refresh/')) {
        originalRequest._retry = true;
        const authStore = useAuthStore();

        try {
          await authStore.refreshToken();

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
    } catch (error) {
      return Promise.reject(error);
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
    try {
      const response = await api.post('/token/', { username, password });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  async logout() {
    try {
      await api.post('/token/logout/');
    } catch (error) {
      throw error;
    }
  },
  
  async register(userData: { username: string; email: string; password: string }) {
    try {
      return await api.post('/register/', userData);
    } catch (error) {
      throw error;
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

  try {
    const response = await userService.getUsers(filters);
    return response.data;
  } catch (error) {
    throw error;
  }
}

// Service pour les utilisateurs
export const userService = {
  // Récupérer tous les utilisateurs avec filtrage optionnel
  async getUsers(filters: UserFilter = {}) {
    try {
      return await api.get('/users/', { params: filters });
    } catch (error) {
      throw error;
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
    const filters: UserFilter = { role: params.role };
    if (params.entrepriseId) filters.entreprise = params.entrepriseId;
    if (params.salarieId) filters.salarie = params.salarieId;
    if (params.includeDetails) filters.include_plans = true;
    if (params.search) filters.search = params.search;
    
    return await api.get('/users/', { params: filters });
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

  // Formater le nom du fichier logo
  formatLogoFileName(file: File): string {
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

  // Télécharger un logo utilisateur
  async uploadLogo(logoFile: File) {
    try {
      const formData = new FormData();
      const formattedFileName = this.formatLogoFileName(logoFile);
      const newFile = new File([logoFile], formattedFileName, { type: logoFile.type });
      formData.append('logo', newFile);

      return await api.post('/users/upload_logo/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
    } catch (error) {
      throw error;
    }
  }
};

// Fonction utilitaire pour le retry avec backoff exponentiel
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000, // Délai initial en ms
  maxDelay: number = 10000  // Délai maximum en ms
): Promise<T> {
  let retries = 0;

  while (true) {
    try {
      return await operation();
    } catch (error: any) {
      retries++;

      // Si on a atteint le nombre maximum de tentatives, on propage l'erreur
      if (retries >= maxRetries) {
        throw error;
      }

      // Calculer le délai avec backoff exponentiel
      const delay = Math.min(baseDelay * Math.pow(2, retries - 1), maxDelay);

      // Ajouter un peu de "jitter" pour éviter que tous les clients retentent en même temps
      const jitter = Math.random() * 200;

      // Attendre avant la prochaine tentative
      await new Promise(resolve => setTimeout(resolve, delay + jitter));
    }
  }
}

// Service pour les plans d'irrigation
export const irrigationService = {
  async getPlans() {
    try {
      return await api.get('/plans/');
    } catch (error) {
      throw error;
    }
  },

  async createPlan(planData: any) {
    try {
      const formattedData = {
        ...planData,
        entreprise: planData.entreprise ? (typeof planData.entreprise === 'object' && 'id' in planData.entreprise ? planData.entreprise.id : Number(planData.entreprise)) : null,
        salarie: planData.salarie ? (typeof planData.salarie === 'object' && 'id' in planData.salarie ? planData.salarie.id : Number(planData.salarie)) : null,
        visiteur: planData.visiteur ? (typeof planData.visiteur === 'object' && 'id' in planData.visiteur ? planData.visiteur.id : Number(planData.visiteur)) : null
      };

      return await api.post('/plans/', formattedData);
    } catch (error) {
      throw error;
    }
  },

  async updatePlan(planId: number, planData: any) {
    try {
      return await api.put(`/plans/${planId}/`, planData);
    } catch (error) {
      throw error;
    }
  },

  async deletePlan(planId: number) {
    try {
      return await api.delete(`/plans/${planId}/`);
    } catch (error) {
      throw error;
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
    try {
      return await api.get('/notes/', { params: filters });
    } catch (error) {
      console.error('Error getting notes:', error);
      throw error;
    }
  },

  // Récupérer les notes associées à un plan spécifique
  async getNotesByPlan(planId: number) {
    try {
      return await api.get('/notes/', { params: { plan: planId } });
    } catch (error) {
      console.error('Error getting notes for plan:', error);
      throw error;
    }
  },

  // Récupérer une note spécifique
  async getNote(noteId: number) {
    try {
      return await api.get(`/notes/${noteId}/`);
    } catch (error) {
      console.error('Error getting note:', error);
      throw error;
    }
  },

  // Créer une nouvelle note
  async createNote(noteData: any) {
    try {
      // Si la note n'a pas de localisation, on laisse le champ undefined pour que le backend le gère
      const postData = {
        ...noteData
      };

      // Ne pas envoyer une location vide au backend, celui-ci s'attend à un GeoJSON valide
      if (postData.location && Object.keys(postData.location).length === 0) {
        delete postData.location;
      }

      return await api.post('/notes/', postData);
    } catch (error) {
      console.error('Error creating note:', error);
      throw error;
    }
  },

  // Mettre à jour une note existante
  async updateNote(noteId: number, noteData: any) {
    try {
      // Utiliser l'ID backend si disponible
      const backendId = noteData.backendId || noteId;

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

      // Supprimer les champs redondants et techniques
      delete updateData.columnId;
      delete updateData.column_id;
      delete updateData.column_details;
      delete updateData.backendId; // Supprimer l'ID backend des données envoyées
      delete updateData.leafletId; // Supprimer l'ID Leaflet des données envoyées
      // Conserver explicitement enterprise_id mais supprimer enterprise_name qui est juste pour affichage
      const enterpriseId = updateData.enterprise_id;
      delete updateData.enterprise_name; // Supprimer le nom de l'entreprise qui n'est pas attendu par l'API
      const response = await api.patch(`/notes/${backendId}/`, updateData);
      // Réinjecter enterprise_id si présent, car il pourrait ne pas être retourné par le serveur
      if (enterpriseId !== undefined) {
        response.data.enterprise_id = enterpriseId;
      }
      
      return response;
    } catch (error) {
      console.error('[noteService][updateNote] Erreur lors de la mise à jour:', error);
      throw error;
    }
  },

  // Supprimer une note
  async deleteNote(noteId: number) {
    try {
      return await api.delete(`/notes/${noteId}/`);
    } catch (error) {
      console.error('Error deleting note:', error);
      throw error;
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
    try {
      const response = await api.get('/columns/');
      return response;
    } catch (error) {
      console.error('[columnService][getColumns] Erreur:', error);
      throw error;
    }
  },

  // Créer une nouvelle colonne
  async createColumn(columnData: any) {
    try {
      const response = await api.post('/columns/', columnData);
      return response;
    } catch (error) {
      console.error('[columnService][createColumn] Erreur:', error);
      throw error;
    }
  },

  // Mettre à jour une colonne
  async updateColumn(columnId: string, columnData: any) {
    try {
      const response = await api.patch(`/columns/${columnId}/`, columnData);
      return response;
    } catch (error) {
      console.error('[columnService][updateColumn] Erreur:', error);
      throw error;
    }
  },

  // Supprimer une colonne
  async deleteColumn(columnId: string) {
    try {
      return await api.delete(`/columns/${columnId}/`);
    } catch (error) {
      console.error('Error deleting column:', error);
      throw error;
    }
  },

  // Mettre à jour l'ordre des colonnes
  async updateColumnsOrder(columnsOrder: string[]) {
    try {
      return await api.post('/columns/reorder/', { columns: columnsOrder });
    } catch (error) {
      console.error('Error updating columns order:', error);
      throw error;
    }
  }
};

// Service pour la météo
export const weatherService = {
  // Récupérer la liste des appareils disponibles
  async getDevices(params: any = {}) {
    try {
      return await retryWithBackoff(
        () => api.get('/weather/devices/', { params }),
        3, // maxRetries
        1000, // baseDelay
        10000 // maxDelay
      );
    } catch (error) {
      console.error('Error getting weather devices:', error);
      throw error;
    }
  },

  // Récupérer les données météo en temps réel
  async getRealTimeData(params: any) {
    try {
      const requestParams = typeof params === 'string' ? { mac: params } : params;
      return await retryWithBackoff(
        () => api.get('/weather/', { params: requestParams }),
        3,
        1000,
        10000
      );
    } catch (error) {
      console.error('Error getting real-time weather data:', error);
      throw error;
    }
  },

  // Récupérer les données historiques
  async getHistoryData(params: {
    mac: string;
    start_date: string;
    end_date: string;
    cycle_type?: string;
    entreprise?: number;
  }) {
    try {
      return await retryWithBackoff(
        () => api.get('/weather/history/', { params }),
        3,
        1000,
        10000
      );
    } catch (error) {
      console.error('Error getting weather history data:', error);
      throw error;
    }
  },
};

// Service pour les filtres de carte personnalisés
export const mapFilterService = {
  /**
   * Récupère tous les filtres de carte accessibles à l'utilisateur
   */
  async getFilters() {
    try {
      return await api.get('/map-filters/');
    } catch (error) {
      console.error('Error getting map filters:', error);
      throw error;
    }
  },

  /**
   * Récupère un filtre de carte spécifique
   */
  async getFilter(id: number) {
    try {
      return await api.get(`/map-filters/${id}/`);
    } catch (error) {
      console.error('Error getting map filter:', error);
      throw error;
    }
  },

  /**
   * Crée un nouveau filtre de carte
   */
  async createFilter(data: { name: string; category: string; description?: string; entreprise: number }) {
    try {
      return await api.post('/map-filters/', data);
    } catch (error) {
      console.error('Error creating map filter:', error);
      throw error;
    }
  },

  /**
   * Met à jour un filtre de carte existant
   */
  async updateFilter(id: number, data: { name?: string; category?: string; description?: string }) {
    try {
      return await api.patch(`/map-filters/${id}/`, data);
    } catch (error) {
      console.error('Error updating map filter:', error);
      throw error;
    }
  },

  /**
   * Supprime un filtre de carte
   */
  async deleteFilter(id: number) {
    try {
      return await api.delete(`/map-filters/${id}/`);
    } catch (error) {
      console.error('Error deleting map filter:', error);
      throw error;
    }
  }
};

// Service pour les paramètres de l'application
export const settingsService = {
  // Récupérer la clé API Google Maps
  async getGoogleMapsApiKey() {
    try {
      return await api.get('/settings/get_google_maps_api_key/');
    } catch (error) {
      console.error('Error getting Google Maps API key:', error);
      throw error;
    }
  },

  // Enregistrer la clé API Google Maps
  async setGoogleMapsApiKey(key: string) {
    try {
      return await api.post('/settings/set_google_maps_api_key/', { key });
    } catch (error) {
      console.error('Error setting Google Maps API key:', error);
      throw error;
    }
  }
};

// Service pour les fonctionnalités cartographiques
export const mapService = {
  /**
   * Récupère une tuile de carte avec l'authentification nécessaire
   * @param tileType Type de tuile (hybrid, cadastre, etc.)
   * @param z Niveau de zoom
   * @param x Coordonnée X
   * @param y Coordonnée Y
   * @returns Blob de l'image de la tuile
   */
  async getTile(tileType: string, z: number, x: number, y: number): Promise<Blob> {
    try {
      const response = await api.get(`/tiles/${tileType}/${z}/${x}/${y}.png`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching map tile (${tileType}/${z}/${x}/${y}):`, error);
      throw error;
    }
  },

  /**
   * Crée une URL pour les tuiles avec authentification
   * @param tileType Type de tuile (hybrid, cadastre, etc.)
   * @returns Fonction de génération d'URL pour les tuiles
   */
  getTileUrlFunction(tileType: string): (x: number, y: number, z: number) => string {
    return (x: number, y: number, z: number) => {
      // Ajouter un timestamp pour éviter les problèmes de cache
      const timestamp = Date.now();
      return `/api/tiles/${tileType}/${z}/${x}/${y}.png?_t=${timestamp}`;
    };
  },

  /**
   * Crée un transformRequest pour ajouter l'authentification aux requêtes de tuiles
   * @returns Fonction transformRequest pour MapLibre
   */
  getTransformRequest(): (url: string, resourceType: string) => { url: string, headers?: Record<string, string> } {
    return (url: string, resourceType: string) => {
      // Uniquement pour les requêtes de tuiles de notre API
      if (resourceType === 'Tile' && url.includes('/api/tiles/')) {
        const token = document.cookie
          .split('; ')
          .find(row => row.startsWith('access_token='))
          ?.split('=')[1];
        
        // Ajouter le token d'authentification si disponible
        if (token) {
          return {
            url,
            headers: {
              'Authorization': `Bearer ${token}`
            }
          };
        }
      }
      
      // Pour les autres ressources, ne pas modifier la requête
      return { url };
    };
  },

  /**
   * Récupère les informations d'élévation pour un ensemble de points
   * @param points Tableau de points avec latitude et longitude
   * @returns Données d'élévation
   */
  async getElevation(points: { latitude: number; longitude: number }[]) {
    try {
      const response = await api.post('/elevation/', { points });
      return response.data;
    } catch (error) {
      console.error('Error fetching elevation data:', error);
      throw error;
    }
  }
};

export default api;