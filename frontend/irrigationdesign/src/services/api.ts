import axios from 'axios';
import { useAuthStore } from '@/stores/auth';
import { usePerformanceMonitor } from '@/utils/usePerformanceMonitor';

// Types nécessaires
export interface UserFilter {
  role?: string;
  usine?: number;
  concessionnaire?: number;
  include_plans?: boolean;
  search?: string;
  concessionnaire_id?: number;
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
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        const authStore = useAuthStore();
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
      }
      return Promise.reject(error);
    } catch (refreshError) {
      console.error('Token refresh failed:', refreshError);
      window.location.href = '/login';
      return Promise.reject(refreshError);
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
  usineId?: number;
  concessionnaireId?: number;
  includeDetails?: boolean;
  search?: string;
}) {
  console.log(`[fetchUsersByHierarchy] Récupération des utilisateurs:`, params);
  
  const filters: UserFilter = { 
    role: params.role 
  };

  if (params.usineId) {
    filters.usine = params.usineId;
  }

  if (params.concessionnaireId) {
    filters.concessionnaire = params.concessionnaireId;
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
  
  // Récupérer toutes les usines
  async getUsines() {
    return await api.get('/users/', { params: { role: 'USINE' } });
  },
  
  // Récupérer tous les concessionnaires (optionnellement filtrés par usine)
  async getConcessionnaires(usineId?: number) {
    const params: UserFilter = { role: 'CONCESSIONNAIRE' };
    if (usineId) {
      params.usine = usineId;
    }
    return await api.get('/users/', { params });
  },
  
  // Récupérer tous les agriculteurs d'un concessionnaire
  async getConcessionnaireAgriculteurs(concessionnaireId: number) {
    return await api.get('/users/', { 
      params: { 
        role: 'AGRICULTEUR',
        concessionnaire: concessionnaireId 
      } 
    });
  },
  
  // Récupérer tous les agriculteurs d'une usine
  async getUsineAgriculteurs(usineId: number) {
    return await api.get('/users/', { 
      params: { 
        role: 'AGRICULTEUR',
        usine: usineId 
      } 
    });
  },
  
  // Fonction unifiée pour récupérer les utilisateurs selon la hiérarchie
  async getUsersByHierarchy(params: {
    role: string;
    usineId?: number;
    concessionnaireId?: number;
    includeDetails?: boolean;
    search?: string;
  }) {
    const endMeasure = performanceMonitor.startMeasure('get_users_hierarchy', 'UserService');
    try {
      const filters = performanceMonitor.measure(
        'prepare_hierarchy_filters',
        () => {
          const result: UserFilter = { role: params.role };
          if (params.usineId) result.usine = params.usineId;
          if (params.concessionnaireId) result.concessionnaire = params.concessionnaireId;
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
  
  // Récupérer les concessionnaires d'une usine spécifique
  async getUsineConcessionnaires(usineId: number) {
    return await api.get('/users/', { 
      params: { 
        role: 'CONCESSIONNAIRE',
        usine: usineId 
      } 
    });
  },
  
  // Récupérer tous les agriculteurs liés à un concessionnaire
  async getAgriculteurs(concessionnaireId?: number, usineId?: number) {
    const params: UserFilter = { role: 'AGRICULTEUR' };
    
    if (concessionnaireId) {
      params.concessionnaire = concessionnaireId;
    }
    
    if (usineId) {
      params.usine = usineId;
    }
    
    return await api.get('/users/', { params });
  },
  
  // Assigner une usine à un concessionnaire
  async assignUsineToConcessionnaire(concessionnaireId: number, usineId: number) {
    return await api.patch(`/users/${concessionnaireId}/`, {
      usine: usineId
    });
  },
  
  // Assigner un concessionnaire à un agriculteur
  async assignConcessionnaireToAgriculteur(agriculteurId: number, concessionnaireId: number) {
    return await api.patch(`/users/${agriculteurId}/`, {
      concessionnaire: concessionnaireId
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
          usine: planData.usine ? (typeof planData.usine === 'object' && 'id' in planData.usine ? planData.usine.id : Number(planData.usine)) : null,
          concessionnaire: planData.concessionnaire ? (typeof planData.concessionnaire === 'object' && 'id' in planData.concessionnaire ? planData.concessionnaire.id : Number(planData.concessionnaire)) : null,
          agriculteur: planData.agriculteur ? (typeof planData.agriculteur === 'object' && 'id' in planData.agriculteur ? planData.agriculteur.id : Number(planData.agriculteur)) : null
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
  
  async getAgriculteurPlans(agriculteurId: number) {
    return await api.get('/plans/', { params: { agriculteur: agriculteurId } });
  },
  
  async createPlanForAgriculteur(planData: any) {
    return await api.post('/plans/', planData);
  },
  
  // Récupérer les plans d'une usine (inclut tous les plans des concessionnaires associés)
  async getUsinePlans(usineId: number) {
    return await api.get('/plans/', { params: { usine: usineId } });
  },
  
  // Récupérer les plans d'un concessionnaire
  async getConcessionnairePlans(concessionnaireId: number) {
    return await api.get('/plans/', { params: { concessionnaire: concessionnaireId } });
  },
  
  // Créer un plan pour un concessionnaire
  async createPlanForConcessionnaire(planData: any, concessionnaireId: number) {
    const data = { ...planData, concessionnaire: concessionnaireId };
    return await api.post('/plans/', data);
  },
  
  // Créer un plan pour une usine
  async createPlanForUsine(planData: any, usineId: number) {
    const data = { ...planData, usine: usineId };
    return await api.post('/plans/', data);
  }
};

export default api; 