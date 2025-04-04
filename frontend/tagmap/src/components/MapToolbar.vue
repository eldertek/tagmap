<template>
  <div class="map-toolbar w-full">
    <!-- Version desktop -->
    <div class="hidden md:flex items-center space-x-2">
      <!-- Type de carte -->
      <div class="dropdown">
        <button class="btn-toolbar dropdown-toggle" @mouseover="updateDropdownPosition">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M12 1.586l-4 4V17h8V5.586l-4-4zM2 17V9.276l4-3.638V17H2zM2 8.162V3h4.5L12 8.5V17H6V5.638L2 8.162z" clip-rule="evenodd" />
          </svg>
          <span>{{ mapTypes[selectedMapType] }}</span>
        </button>
        <div class="dropdown-menu">
          <button
            v-for="(label, type) in mapTypes"
            :key="type"
            class="dropdown-item"
            :class="{ 'active': type === selectedMapType }"
            @click="changeMapType(type)"
          >
            {{ label }}
          </button>
        </div>
      </div>
      <!-- Informations du plan actif -->
      <div v-if="planName" class="border-l pl-2 flex-1">
        <div class="flex items-center">
          <div class="plan-info">
            <h2 class="plan-name">{{ planName }}</h2>
            <p v-if="planDescription" class="plan-description">{{ planDescription }}</p>
          </div>
        </div>
      </div>
      <!-- Outils de plan -->
      <div class="border-l pl-2">
        <div class="flex items-center space-x-1">
          <button @click="createNewPlan" class="btn-toolbar" title="Nouveau plan">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V8z" clip-rule="evenodd" />
            </svg>
            <span class="hidden lg:inline ml-1">Nouveau</span>
          </button>
          <button @click="loadPlan" class="btn-toolbar" title="Charger un plan">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd" />
              <path d="M10 9a1 1 0 011-1h5a1 1 0 110 2h-5a1 1 0 01-1-1z" />
              <path fill-rule="evenodd" d="M13 5a1 1 0 011 1v4a1 1 0 11-2 0V6a1 1 0 011-1z" clip-rule="evenodd" />
            </svg>
            <span class="hidden lg:inline ml-1">Charger</span>
          </button>
          <button @click="savePlan" class="btn-toolbar" title="Enregistrer le plan">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293zM9 4a1 1 0 012 0v2H9V4z" />
            </svg>
            <span class="hidden lg:inline ml-1">Enregistrer</span>
          </button>
        </div>
      </div>
      <!-- Outils de vue -->
      <div class="border-l pl-2">
        <div class="flex items-center space-x-1">
          <button @click="adjustView" class="btn-toolbar" title="Ajuster la vue">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            <span class="hidden lg:inline ml-1">Ajuster</span>
          </button>
          <button @click="generateSummary" class="btn-toolbar" title="Générer une synthèse">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd" />
            </svg>
            <span class="hidden lg:inline ml-1">Synthèse</span>
          </button>
        </div>
      </div>
      <!-- Information de sauvegarde -->
      <div class="border-l pl-2 ml-auto">
        <div
          class="text-xs hidden lg:flex items-center"
          :class="{
            'text-gray-500': !saveStatus,
            'text-primary-600 font-medium': saveStatus === 'success',
            'text-blue-600 font-medium': saveStatus === 'saving'
          }"
        >
          <!-- Icône de chargement quand sauvegarde en cours -->
          <svg v-if="saveStatus === 'saving'" class="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <!-- Icône de succès quand sauvegarde réussie -->
          <svg v-if="saveStatus === 'success'" class="h-4 w-4 mr-2 text-primary-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
          </svg>
          <transition
            name="fade-slide"
            mode="out-in"
          >
            <span v-if="saveStatus === 'saving'" key="saving">
              Sauvegarde en cours...
            </span>
            <span v-else-if="saveStatus === 'success'" key="success" class="save-success-text">
              Sauvegarde réussie !
            </span>
            <span v-else key="default">
              Dernière modification : {{ lastSaveFormatted }}
            </span>
          </transition>
        </div>
      </div>
    </div>
    <!-- Version mobile -->
    <div class="md:hidden">
      <div class="flex justify-between items-center">
        <button @click="showMobileMenu = !showMobileMenu" class="p-2 rounded-md border bg-white shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd" />
          </svg>
        </button>
        <!-- Nom du plan en version mobile -->
        <div v-if="planName" class="truncate mx-2 text-sm font-medium">
          {{ planName }}
        </div>
        <div class="flex space-x-2">
          <button @click="createNewPlan" class="p-2 rounded-md border bg-white shadow-sm flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V8z" clip-rule="evenodd" />
            </svg>
          </button>
          <button @click="savePlan" class="p-2 rounded-md border bg-white shadow-sm flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
              <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293zM9 4a1 1 0 012 0v2H9V4z" />
            </svg>
          </button>
          <button @click="adjustView" class="p-2 rounded-md border bg-white shadow-sm flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
              <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
        </div>
      </div>
      <!-- Menu mobile -->
      <div v-if="showMobileMenu" class="mobile-menu mt-0 bg-white shadow-lg p-4 z-[2000] fixed left-0 right-0 w-full">
        <div class="flex justify-between items-center mb-3 border-b pb-2">
          <h3 class="text-base font-semibold text-gray-800">Menu</h3>
          <button @click="showMobileMenu = false" class="p-1 rounded-full hover:bg-gray-100">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="flex flex-col space-y-4">
          <!-- Informations du plan -->
          <div v-if="planName" class="flex flex-col pb-3 border-b">
            <h3 class="text-sm font-semibold text-gray-800">{{ planName }}</h3>
            <p v-if="planDescription" class="text-xs text-gray-600 mt-1">{{ planDescription }}</p>
          </div>
          <!-- Type de carte -->
          <div class="flex flex-col">
            <span class="text-sm font-medium text-gray-700 mb-2">Type de carte</span>
            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="(label, type) in mapTypes"
                :key="type"
                class="px-3 py-2 text-sm rounded-md border shadow-sm"
                :class="{ 'bg-blue-50 border-blue-300 text-blue-700 font-medium': type === selectedMapType }"
                @click="changeMapType(type)"
              >
                {{ label }}
              </button>
            </div>
          </div>
          <!-- Outils de plan -->
          <div class="flex flex-col">
            <span class="text-sm font-medium text-gray-700 mb-2">Outils de plan</span>
            <div class="grid grid-cols-3 gap-2">
              <button @click="createNewPlan" class="px-3 py-2 text-sm rounded-md border shadow-sm flex items-center justify-center bg-white">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V8z" clip-rule="evenodd" />
                </svg>
                Nouveau
              </button>
              <button @click="loadPlan" class="px-3 py-2 text-sm rounded-md border shadow-sm flex items-center justify-center bg-white">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd" />
                  <path d="M10 9a1 1 0 011-1h5a1 1 0 110 2h-5a1 1 0 01-1-1z" />
                  <path fill-rule="evenodd" d="M13 5a1 1 0 011 1v4a1 1 0 11-2 0V6a1 1 0 011-1z" clip-rule="evenodd" />
                </svg>
                Charger
              </button>
              <button @click="generateSummary" class="px-3 py-2 text-sm rounded-md border shadow-sm flex items-center justify-center bg-white">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd" />
                </svg>
                Synthèse
              </button>
            </div>
          </div>
          <!-- Information de sauvegarde -->
          <div
            class="text-sm text-center pt-3 border-t flex items-center justify-center space-x-1 mt-2"
            :class="{
              'text-gray-500': !saveStatus,
              'text-primary-600 font-medium': saveStatus === 'success',
              'text-blue-600 font-medium': saveStatus === 'saving'
            }"
          >
            <!-- Icône de chargement quand sauvegarde en cours -->
            <svg v-if="saveStatus === 'saving'" class="animate-spin h-4 w-4 mr-2 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <!-- Icône de succès quand sauvegarde réussie -->
            <svg v-if="saveStatus === 'success'" class="h-4 w-4 mr-2 text-primary-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
            </svg>
            <transition
              name="fade-slide"
              mode="out-in"
            >
              <span v-if="saveStatus === 'saving'" key="saving">
                Sauvegarde en cours...
              </span>
              <span v-else-if="saveStatus === 'success'" key="success" class="save-success-text">
                Sauvegarde réussie !
              </span>
              <span v-else key="default">
                Dernière modification : {{ lastSaveFormatted }}
              </span>
            </transition>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, computed } from 'vue';
const emit = defineEmits<{
  (e: 'change-map-type', type: 'Hybride' | 'Cadastre' | 'IGN'): void;
  (e: 'create-new-plan'): void;
  (e: 'load-plan'): void;
  (e: 'save-plan'): void;
  (e: 'adjust-view'): void;
  (e: 'generate-summary'): void;
}>();
const props = defineProps<{
  lastSave?: Date;
  planName?: string;
  planDescription?: string;
  saveStatus?: 'saving' | 'success' | null;
}>();
// État
const selectedMapType = ref<'Hybride' | 'Cadastre' | 'IGN'>('Hybride');
const showMobileMenu = ref(false);

// Ajout du positionnement du dropdown
const updateDropdownPosition = (event: MouseEvent) => {
  const button = event.currentTarget as HTMLElement;
  const dropdown = button.nextElementSibling as HTMLElement;
  if (dropdown && dropdown.classList.contains('dropdown-menu')) {
    const rect = button.getBoundingClientRect();
    dropdown.style.top = `${rect.bottom}px`;
    dropdown.style.left = `${rect.left}px`;
  }
};

// Types de carte disponibles
const mapTypes: Record<'Hybride' | 'Cadastre' | 'IGN', string> = {
  Hybride: 'Hybride',
  Cadastre: 'Cadastre',
  IGN: 'IGN'
};
// Formater la date de dernière sauvegarde
const lastSaveFormatted = computed(() => {
  if (!props.lastSave) return 'Jamais';
  const date = new Date(props.lastSave);
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
});
// Méthodes
const changeMapType = (type: 'Hybride' | 'Cadastre' | 'IGN') => {
  selectedMapType.value = type;
  emit('change-map-type', type);
  closeMobileMenu();
};
const createNewPlan = () => {
  emit('create-new-plan');
  closeMobileMenu();
};
const loadPlan = () => {
  emit('load-plan');
  closeMobileMenu();
};
const savePlan = () => {
  emit('save-plan');
  closeMobileMenu();
};
const adjustView = () => {
  emit('adjust-view');
  closeMobileMenu();
};
const generateSummary = () => {
  emit('generate-summary');
  closeMobileMenu();
};
const closeMobileMenu = () => {
  showMobileMenu.value = false;
};
</script>
<style scoped>
.map-toolbar {
  background-color: white;
  border-bottom: 1px solid #e5e7eb;
  border-top: 1px solid #e5e7eb;
  padding: 0.5rem 1rem;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  width: 100%;
  z-index: 1000;
  overflow: visible;
  flex-shrink: 0;
  min-height: 49px;
  position: relative;
  top: 0;
}
.dropdown {
  position: relative;
  display: inline-block;
  overflow: visible;
}
.dropdown-toggle {
  display: flex;
  align-items: center;
}
.dropdown-menu {
  display: none;
  position: fixed;
  z-index: 3001;
  min-width: 10rem;
  padding: 0.5rem 0;
  background-color: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.25rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  overflow: visible;
}
.dropdown:hover .dropdown-menu {
  display: block;
}
.dropdown-item {
  display: block;
  width: 100%;
  padding: 0.25rem 1rem;
  text-align: left;
  font-size: 0.875rem;
}
.dropdown-item:hover {
  background-color: #f3f4f6;
}
.dropdown-item.active {
  background-color: #ebf5ff;
  color: #2563eb;
}
.btn-toolbar {
  display: flex;
  align-items: center;
  background-color: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.25rem;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: #4b5563;
  transition: all 0.2s;
}
.btn-toolbar:hover {
  background-color: #f9fafb;
  border-color: #d1d5db;
}
.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.25rem;
  padding: 0.25rem;
  color: #4b5563;
  transition: all 0.2s;
}
.btn-icon:hover {
  background-color: #f9fafb;
  border-color: #d1d5db;
}
.plan-info {
  max-width: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.plan-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.25;
}
.plan-description {
  font-size: 0.75rem;
  color: #6b7280;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.25;
}
.mobile-menu {
  position: fixed;
  top: 65px;
  left: 0;
  right: 0;
  margin: 0;
  max-height: calc(100vh - 80px);
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  width: 100%;
  border-bottom: 1px solid #e5e7eb;
}
/* Animations de transition */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s ease;
}
.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(10px);
}
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
.save-success-text {
  position: relative;
  display: inline-block;
}
.save-success-text::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 100%;
  height: 2px;
  background-color: currentColor;
  transform: scaleX(0);
  transform-origin: right;
  transition: transform 0.5s ease-out;
  animation: underline-grow 0.5s forwards 0.2s;
}
@keyframes underline-grow {
  0% { transform: scaleX(0); }
  100% { transform: scaleX(1); }
}
</style>