import { defineStore } from 'pinia';
import { mapFilterService } from '@/services/api';
import { useNotificationStore } from './notification';
import { usePerformanceMonitor } from '@/utils/usePerformanceMonitor';

export interface MapFilter {
  id: number;
  name: string;
  category: string;
  description: string;
  entreprise: number;
  entreprise_name: string;
  created_at: string;
  updated_at: string;
}

export const useMapFilterStore = defineStore('mapFilters', {
  state: () => ({
    filters: [] as MapFilter[],
    loading: false,
    error: null as string | null,
    performanceMonitor: usePerformanceMonitor()
  }),

  getters: {
    getFilterById: (state) => (id: number) => {
      return state.filters.find(filter => filter.id === id);
    },
    getFiltersByCategory: (state) => (category: string) => {
      return state.filters.filter(filter => filter.category === category);
    },
    getUniqueCategories: (state) => {
      const categories = new Set<string>();
      state.filters.forEach(filter => categories.add(filter.category));
      return Array.from(categories);
    }
  },

  actions: {
    async initializeStore() {
      await this.fetchFilters();
    },
    async fetchFilters() {
      const endMeasure = this.performanceMonitor.startMeasure('fetchFilters', 'MapFilterStore');
      const notificationStore = useNotificationStore();

      this.loading = true;
      this.error = null;

      try {
        const response = await this.performanceMonitor.measureAsync(
          'fetchFilters_apiCall',
          () => mapFilterService.getFilters(),
          'MapFilterStore'
        );
        this.filters = response.data;
        return this.filters;
      } catch (error: any) {
        this.error = 'Erreur lors du chargement des filtres';
        notificationStore.error('Impossible de charger les filtres de carte');
        console.error('[MapFilterStore] Erreur lors du chargement des filtres:', error);
        throw error;
      } finally {
        this.loading = false;
        endMeasure();
      }
    },

    async createFilter(data: { name: string; category: string; description?: string; entreprise: number }) {
      const endMeasure = this.performanceMonitor.startMeasure('createFilter', 'MapFilterStore');

      this.loading = true;
      this.error = null;

      try {
        const response = await this.performanceMonitor.measureAsync(
          'createFilter_apiCall',
          () => mapFilterService.createFilter(data),
          'MapFilterStore'
        );

        // Ajouter le nouveau filtre à la liste
        this.filters.push(response.data);

        console.log('[MapFilterStore] Filtre créé avec succès:', response.data);
        return response.data;
      } catch (error: any) {
        this.error = 'Erreur lors de la création du filtre';
        console.error('[MapFilterStore] Erreur lors de la création du filtre:', error);
        throw error;
      } finally {
        this.loading = false;
        endMeasure();
      }
    },

    async updateFilter(id: number, data: { name?: string; category?: string; description?: string }) {
      const endMeasure = this.performanceMonitor.startMeasure('updateFilter', 'MapFilterStore');

      this.loading = true;
      this.error = null;

      try {
        const response = await this.performanceMonitor.measureAsync(
          'updateFilter_apiCall',
          () => mapFilterService.updateFilter(id, data),
          'MapFilterStore'
        );

        // Mettre à jour le filtre dans la liste
        const index = this.filters.findIndex(f => f.id === id);
        if (index !== -1) {
          this.filters[index] = response.data;
        }

        console.log('[MapFilterStore] Filtre mis à jour avec succès:', response.data);
        return response.data;
      } catch (error: any) {
        this.error = 'Erreur lors de la mise à jour du filtre';
        console.error('[MapFilterStore] Erreur lors de la mise à jour du filtre:', error);
        throw error;
      } finally {
        this.loading = false;
        endMeasure();
      }
    },

    async deleteFilter(id: number) {
      const endMeasure = this.performanceMonitor.startMeasure('deleteFilter', 'MapFilterStore');

      this.loading = true;
      this.error = null;

      try {
        await this.performanceMonitor.measureAsync(
          'deleteFilter_apiCall',
          () => mapFilterService.deleteFilter(id),
          'MapFilterStore'
        );

        // Supprimer le filtre de la liste
        this.filters = this.filters.filter(f => f.id !== id);

        console.log('[MapFilterStore] Filtre supprimé avec succès:', id);
        return true;
      } catch (error: any) {
        this.error = 'Erreur lors de la suppression du filtre';
        console.error('[MapFilterStore] Erreur lors de la suppression du filtre:', error);
        throw error;
      } finally {
        this.loading = false;
        endMeasure();
      }
    }
  }
});
