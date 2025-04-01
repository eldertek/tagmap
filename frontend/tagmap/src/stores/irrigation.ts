import { defineStore } from 'pinia';
import api, { irrigationService } from '@/services/api';
import { useAuthStore } from './auth';
import { useNotificationStore } from './notification';
import { usePerformanceMonitor } from '@/utils/usePerformanceMonitor';

interface PlanHistory {
  id: number;
  plan_id: number;
  date_modification: string;
  modifications: any;
  utilisateur: number;
}

export interface UserDetails {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  company_name?: string;
  phone?: string | null;
  concessionnaire?: number | null;
}

export interface Plan {
  id: number;
  nom: string;
  description: string;
  date_creation: string;
  date_modification: string;
  createur: UserDetails;
  usine: UserDetails | null;
  usine_id?: number | null;
  concessionnaire: UserDetails | null;
  concessionnaire_id?: number | null;
  agriculteur: UserDetails | null;
  agriculteur_id?: number | null;
  preferences?: any;
  elements?: any[];
  historique?: PlanHistory[];
  version?: number;
}

export interface NewPlan {
  nom: string;
  description: string;
  usine?: number | null;
  usine_id?: number | null;
  agriculteur?: number | null;
  agriculteur_id?: number | null;
  concessionnaire?: number | null;
  concessionnaire_id?: number | null;
}

export const useIrrigationStore = defineStore('irrigation', {
  state: () => ({
    plans: [] as Plan[],
    currentPlan: null as Plan | null,
    loading: false,
    error: null as string | null,
    autoSaveInterval: null as any,
    unsavedChanges: false,
    planHistory: [] as PlanHistory[],
    performanceMonitor: usePerformanceMonitor()
  }),
  
  getters: {
    getPlanById: (state) => (id: number) => {
      return state.plans.find(plan => plan.id === id);
    },
    hasUnsavedChanges: (state) => state.unsavedChanges,
    getCurrentPlanHistory: (state) => state.planHistory
  },
  
  actions: {
    // Récupérer tous les plans selon les filtres appliqués
    async fetchPlans() {
      const endMeasure = this.performanceMonitor.startMeasure('fetchPlans', 'IrrigationStore');
      const authStore = useAuthStore();
      this.loading = true;
      try {
        let url = '/plans/';
        const params: Record<string, any> = {};
        
        if (authStore.isConcessionnaire) {
          params.concessionnaire = authStore.user?.id;
        } else if (authStore.isAgriculteur) {
          params.agriculteur = authStore.user?.id;
        }
        
        const response = await this.performanceMonitor.measureAsync(
          'fetchPlans_apiCall',
          () => api.get(url, { params }),
          'IrrigationStore'
        );
        this.plans = response.data;
      } catch (error) {
        this.error = 'Erreur lors du chargement des plans';
        throw error;
      } finally {
        this.loading = false;
        endMeasure();
      }
    },
    
    // Récupérer les plans avec tous les détails
    async fetchPlansWithDetails() {
      const endMeasure = this.performanceMonitor.startMeasure('fetchPlansWithDetails', 'IrrigationStore');
      const authStore = useAuthStore();
      this.loading = true;
      try {
        let url = '/plans/';
        const params: Record<string, any> = {
          include_details: true
        };
        
        if (authStore.isConcessionnaire) {
          params.concessionnaire = authStore.user?.id;
        } else if (authStore.isAgriculteur) {
          params.agriculteur = authStore.user?.id;
        }
        
        const response = await this.performanceMonitor.measureAsync(
          'fetchPlansWithDetails_apiCall',
          () => api.get(url, { params }),
          'IrrigationStore'
        );

        const processedPlans = this.performanceMonitor.measure(
          'fetchPlansWithDetails_processResponse',
          () => response.data.map((plan: any) => ({
            ...plan,
            usine: typeof plan.usine === 'object' ? plan.usine : null,
            concessionnaire: typeof plan.concessionnaire === 'object' ? plan.concessionnaire : null,
            agriculteur: typeof plan.agriculteur === 'object' ? plan.agriculteur : null
          })),
          'IrrigationStore'
        );
        
        this.plans = processedPlans;
        return { data: processedPlans };
      } catch (error) {
        console.error('[IrrigationStore] Error fetching plans:', error);
        this.error = 'Erreur lors du chargement des plans';
        throw error;
      } finally {
        this.loading = false;
        endMeasure();
      }
    },
    
    // Récupérer les plans d'un client spécifique
    async fetchClientPlans(clientId: number) {
      this.loading = true;
      try {
        const response = await irrigationService.getAgriculteurPlans(clientId);
        return response.data;
      } catch (error) {
        this.error = 'Erreur lors du chargement des plans du client';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    // Créer un nouveau plan
    async createPlan(planData: NewPlan) {
      const endMeasure = this.performanceMonitor.startMeasure('createPlan', 'IrrigationStore');
      this.clearCurrentPlan();
      this.loading = true;
      const notificationStore = useNotificationStore();
      try {
        const authStore = useAuthStore();
        
        if (authStore.user?.user_type === 'agriculteur') {
          planData = {
            ...planData,
            agriculteur: authStore.user.id,
            concessionnaire: authStore.user.concessionnaire,
            usine: authStore.user.usine
          };
        }

        const formattedData = this.performanceMonitor.measure(
          'createPlan_formatData',
          () => ({
            ...planData,
            usine: planData.usine ? (typeof planData.usine === 'object' && planData.usine && 'id' in planData.usine ? (planData.usine as { id: number }).id : Number(planData.usine)) : null,
            concessionnaire: planData.concessionnaire ? (typeof planData.concessionnaire === 'object' && planData.concessionnaire && 'id' in planData.concessionnaire ? (planData.concessionnaire as { id: number }).id : Number(planData.concessionnaire)) : null,
            agriculteur: planData.agriculteur ? (typeof planData.agriculteur === 'object' && planData.agriculteur && 'id' in planData.agriculteur ? (planData.agriculteur as { id: number }).id : Number(planData.agriculteur)) : null
          }),
          'IrrigationStore'
        );

        const response = await this.performanceMonitor.measureAsync(
          'createPlan_apiCall',
          () => irrigationService.createPlan(formattedData),
          'IrrigationStore'
        );
        
        this.plans.push(response.data);
        notificationStore.success(`Le plan "${response.data.nom}" a été créé avec succès`);
        return response.data;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Error creating plan:', errorMessage);
        this.error = errorMessage;
        notificationStore.error(`Erreur lors de la création du plan : ${errorMessage}`);
        throw error;
      } finally {
        this.loading = false;
        endMeasure();
      }
    },
    
    // Créer un plan pour un client spécifique
    async createPlanForClient(planData: NewPlan, clientId: number) {
      this.clearCurrentPlan();
      this.loading = true;
      try {
        const data = { ...planData, agriculteur: clientId };
        const response = await irrigationService.createPlanForAgriculteur(data);
        this.plans.push(response.data);
        return response.data;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Error creating plan for client:', errorMessage);
        this.error = 'Erreur lors de la création du plan pour le client';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    // Démarrer la sauvegarde automatique
    startAutoSave() {
      if (this.autoSaveInterval) return;
      this.autoSaveInterval = setInterval(async () => {
        if (this.unsavedChanges && this.currentPlan) {
          await this.savePlan(this.currentPlan.id);
        }
      }, 30000); // Sauvegarde toutes les 30 secondes
    },
    
    // Arrêter la sauvegarde automatique
    stopAutoSave() {
      if (this.autoSaveInterval) {
        clearInterval(this.autoSaveInterval);
        this.autoSaveInterval = null;
      }
    },
    
    // Sauvegarder un plan
    async savePlan(planId: number) {
      const endMeasure = this.performanceMonitor.startMeasure('savePlan', 'IrrigationStore');
      if (!this.unsavedChanges) {
        console.log('[IrrigationStore][savePlan] Aucun changement à sauvegarder');
        endMeasure();
        return;
      }

      this.loading = true;
      try {
        const response = await this.performanceMonitor.measureAsync(
          'savePlan_apiCall',
          () => api.patch(`/plans/${planId}/`, {
            ...this.currentPlan,
            version: this.currentPlan?.version || 1
          }),
          'IrrigationStore'
        );

        this.performanceMonitor.measure(
          'savePlan_updateState',
          () => {
            const index = this.plans.findIndex(p => p.id === planId);
            if (index !== -1) {
              this.plans[index] = response.data;
            }
            if (this.currentPlan?.id === planId) {
              this.currentPlan = response.data;
            }
          },
          'IrrigationStore'
        );

        this.unsavedChanges = false;
        return response.data;
      } catch (error) {
        console.error('[IrrigationStore][savePlan] ERREUR:', error);
        this.error = 'Erreur lors de la sauvegarde du plan';
        throw error;
      } finally {
        this.loading = false;
        endMeasure();
      }
    },
    
    // Mettre à jour les détails d'un plan
    async updatePlanDetails(planId: number, planData: Partial<Plan>) {
      const endMeasure = this.performanceMonitor.startMeasure('updatePlanDetails', 'IrrigationStore');
      const notificationStore = useNotificationStore();
      
      try {
        const response = await this.performanceMonitor.measureAsync(
          'updatePlanDetails_apiCall',
          () => {
            const { agriculteur_id, concessionnaire_id, usine_id, ...otherData } = planData;
            const data: Record<string, any> = { ...otherData };
            
            if (agriculteur_id !== undefined) data.agriculteur_id = agriculteur_id;
            if (concessionnaire_id !== undefined) data.concessionnaire_id = concessionnaire_id;
            if (usine_id !== undefined) data.usine_id = usine_id;
            
            return api.patch(`/plans/${planId}/`, data);
          },
          'IrrigationStore'
        );
        
        this.performanceMonitor.measure(
          'updatePlanDetails_updateState',
          () => {
            if (this.currentPlan && this.currentPlan.id === planId) {
              this.currentPlan = { ...this.currentPlan, ...response.data };
            }
            const index = this.plans.findIndex(p => p.id === planId);
            if (index !== -1) {
              this.plans[index] = { ...this.plans[index], ...response.data };
            }
          },
          'IrrigationStore'
        );
        
        return response.data;
      } catch (error) {
        console.error('Erreur lors de la mise à jour du plan:', error);
        notificationStore.error(`Erreur lors de la mise à jour du plan : ${error instanceof Error ? error.message : String(error)}`);
        throw error;
      } finally {
        endMeasure();
      }
    },
    
    // Récupérer l'historique d'un plan
    async fetchPlanHistory(planId: number) {
      this.loading = true;
      try {
        const response = await api.get(`/plans/${planId}/historique/`);
        this.planHistory = response.data;
        return response.data;
      } catch (error) {
        this.error = 'Erreur lors de la récupération de l\'historique';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    // Restaurer une version d'un plan
    async restorePlanVersion(planId: number, versionId: number) {
      this.loading = true;
      try {
        const response = await api.post(`/plans/${planId}/restaurer/`, {
          version_id: versionId
        });
        // Mettre à jour le plan restauré
        if (this.currentPlan?.id === planId) {
          this.currentPlan = response.data;
        }
        const index = this.plans.findIndex(p => p.id === planId);
        if (index !== -1) {
          this.plans[index] = response.data;
        }
        return response.data;
      } catch (error) {
        this.error = 'Erreur lors de la restauration de la version';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    // Définir le plan courant
    setCurrentPlan(plan: Plan) {
      this.currentPlan = plan;
      this.startAutoSave();
    },
    
    // Effacer le plan courant
    clearCurrentPlan() {
      this.currentPlan = null;
      this.unsavedChanges = false;
      if (this.autoSaveInterval) {
        clearInterval(this.autoSaveInterval);
        this.autoSaveInterval = null;
      }
    },
    
    // Marquer des changements non sauvegardés
    markUnsavedChanges() {
      this.unsavedChanges = true;
    },
    
    // Supprimer un plan
    async deletePlan(planId: number) {
      this.loading = true;
      const notificationStore = useNotificationStore();
      try {
        const planToDelete = this.plans.find(p => p.id === planId);
        await irrigationService.deletePlan(planId);
        // Retirer le plan de la liste locale
        this.plans = this.plans.filter(p => p.id !== planId);
        // Si c'était le plan courant, le nettoyer
        if (this.currentPlan?.id === planId) {
          this.clearCurrentPlan();
        }
        notificationStore.success(`Le plan "${planToDelete?.nom || ''}" a été supprimé avec succès`);
      } catch (error) {
        this.error = 'Erreur lors de la suppression du plan';
        notificationStore.error(`Erreur lors de la suppression du plan : ${error instanceof Error ? error.message : String(error)}`);
        throw error;
      } finally {
        this.loading = false;
      }
    }
  }
}); 