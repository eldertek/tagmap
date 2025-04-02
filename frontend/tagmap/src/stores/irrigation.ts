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
  salarie?: number | null;
}

export interface Plan {
  id: number;
  nom: string;
  description: string;
  date_creation: string;
  date_modification: string;
  createur: UserDetails;
  entreprise: UserDetails | null;
  entreprise_id?: number | null;
  salarie: UserDetails | null;
  salarie_id?: number | null;
  visiteur: UserDetails | null;
  visiteur_id?: number | null;
  preferences?: any;
  elements?: any[];
  historique?: PlanHistory[];
  version?: number;
}

export interface NewPlan {
  nom: string;
  description: string;
  entreprise?: number | null;
  entreprise_id?: number | null;
  visiteur?: number | null;
  visiteur_id?: number | null;
  salarie?: number | null;
  salarie_id?: number | null;
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
        
        if (authStore.isSalarie) {
          params.salarie = authStore.user?.id;
        } else if (authStore.isVisiteur) {
          params.visiteur = authStore.user?.id;
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
        
        if (authStore.isSalarie) {
          params.salarie = authStore.user?.id;
        } else if (authStore.isVisiteur) {
          params.visiteur = authStore.user?.id;
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
            entreprise: typeof plan.entreprise === 'object' ? plan.entreprise : null,
            salarie: typeof plan.salarie === 'object' ? plan.salarie : null,
            visiteur: typeof plan.visiteur === 'object' ? plan.visiteur : null
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
        const response = await irrigationService.getVisiteurPlans(clientId);
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
        
        if (authStore.user?.user_type === 'visiteur') {
          planData = {
            ...planData,
            visiteur: authStore.user.id,
            salarie: authStore.user.salarie,
            entreprise: authStore.user.entreprise
          };
        }

        const formattedData = this.performanceMonitor.measure(
          'createPlan_formatData',
          () => ({
            ...planData,
            entreprise: planData.entreprise ? (typeof planData.entreprise === 'object' && planData.entreprise && 'id' in planData.entreprise ? (planData.entreprise as { id: number }).id : Number(planData.entreprise)) : null,
            salarie: planData.salarie ? (typeof planData.salarie === 'object' && planData.salarie && 'id' in planData.salarie ? (planData.salarie as { id: number }).id : Number(planData.salarie)) : null,
            visiteur: planData.visiteur ? (typeof planData.visiteur === 'object' && planData.visiteur && 'id' in planData.visiteur ? (planData.visiteur as { id: number }).id : Number(planData.visiteur)) : null
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
        const data = { ...planData, visiteur: clientId };
        const response = await irrigationService.createPlanForVisiteur(data);
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
            const { visiteur_id, salarie_id, entreprise_id, ...otherData } = planData;
            const data: Record<string, any> = { ...otherData };
            
            if (visiteur_id !== undefined) data.visiteur_id = visiteur_id;
            if (salarie_id !== undefined) data.salarie_id = salarie_id;
            if (entreprise_id !== undefined) data.entreprise_id = entreprise_id;
            
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