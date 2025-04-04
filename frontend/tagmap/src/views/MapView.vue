<template>
  <div class="h-full flex">
    <!-- Carte -->
    <div class="flex-1 relative">
      <!-- Overlay de génération -->
      <div v-if="isGeneratingSynthesis"
        class="absolute inset-0 bg-black/30 backdrop-blur-sm z-[2000] flex items-center justify-center">
        <div class="bg-white/90 rounded-2xl p-8 max-w-md shadow-2xl border border-gray-100">
          <div class="flex flex-col items-center">
            <!-- Animation de chargement améliorée -->
            <div class="relative w-24 h-24 mb-6">
              <!-- Cercle principal rotatif -->
              <div class="absolute inset-0 border-4 border-primary-200 rounded-full"></div>
              <div class="absolute inset-0 border-4 border-primary-600 border-t-transparent rounded-full animate-spin">
              </div>
              <!-- Effet de progression -->
              <div class="absolute inset-2 border-2 border-primary-400/30 rounded-full animate-pulse"></div>
              <!-- Icône au centre -->
              <div class="absolute inset-0 flex items-center justify-center">
                <svg class="w-8 h-8 text-primary-600 animate-bounce" fill="none" stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <!-- Textes explicatifs -->
            <h3 class="text-xl font-semibold text-gray-900 mb-2">
              Génération de la synthèse
            </h3>
            <div class="space-y-2 text-center">
              <p class="text-primary-600 font-medium">
                Capture des formes en cours...
              </p>
              <p class="text-sm text-gray-500">
                Nous optimisons la qualité de vos captures pour un rendu parfait
              </p>
            </div>
          </div>
        </div>
      </div>
      <!-- Vue d'accueil quand aucun plan n'est chargé -->
      <div v-if="!currentPlan" class="absolute inset-0 flex items-center justify-center bg-gray-50 z-[3000]">
        <div class="text-center max-w-lg mx-auto p-8">
          <div
            class="relative w-48 h-48 mx-auto mb-12 rounded-full bg-gradient-to-br from-primary-100 to-primary-50 p-8 shadow-lg ring-4 ring-white">
            <img src="@/assets/logo.svg" alt="TagMap Logo"
              class="w-full h-full object-contain filter drop-shadow-md" />
            <div
              class="absolute inset-0 rounded-full bg-gradient-to-t from-transparent to-white/10 pointer-events-none">
            </div>
          </div>
          <h1 class="text-3xl font-bold text-gray-900 mb-4">Bienvenue sur TagMap</h1>
          <p class="text-gray-600 mb-8">Pour commencer à dessiner, vous devez d'abord créer un nouveau plan ou charger
            un plan existant.</p>
          <div class="space-y-4">
            <button @click="showNewPlanModal = true"
              class="w-full flex items-center justify-center px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors duration-200">
              <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              Créer un nouveau plan
            </button>
            <button @click="showLoadPlanModal = true"
              class="w-full flex items-center justify-center px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors duration-200">
              <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Charger un plan existant
            </button>
          </div>
        </div>
      </div>
      <!-- Conteneur de la carte avec positionnement relatif -->
      <div v-show="currentPlan" class="map-parent">
        <!-- Utiliser Teleport pour déplacer la MapToolbar après la barre de navigation -->
        <Teleport to="body">
          <div v-if="currentPlan && !isGeneratingSynthesis" class="fixed left-0 right-0 z-[1500]" :style="{ top: 'var(--header-height)' }">
            <MapToolbar
              :last-save="currentPlan?.date_modification ? new Date(currentPlan.date_modification) : undefined"
              :plan-name="currentPlan?.nom" :plan-description="currentPlan?.description" :save-status="saveStatus"
              @change-map-type="changeBaseMap" @create-new-plan="showNewPlanModal = true"
              @load-plan="showLoadPlanModal = true" @save-plan="savePlan" @adjust-view="handleAdjustView"
              @generate-summary="generateSynthesis" />
          </div>
        </Teleport>

        <!-- Conteneur principal avec carte et outils -->
        <div class="map-content flex flex-col md:flex-row relative">
          <!-- Overlay semi-transparent quand le panneau d'outils est ouvert sur mobile -->
          <div
            v-if="showDrawingTools && currentPlan && !isGeneratingSynthesis"
            @click="toggleDrawingTools"
            class="md:hidden fixed inset-0 bg-black/30 z-[1999] transition-opacity duration-300"
          ></div>
          <!-- Barre d'outils compacte sur mobile -->
          <div
            v-if="currentPlan && !isGeneratingSynthesis"
            @click="toggleDrawingTools"
            class="md:hidden fixed left-0 right-0 z-[2500] bg-white py-3 px-3 shadow-lg border-t border-gray-200 flex items-center justify-between"
            style="height: var(--mobile-bottom-toolbar-height); bottom: 0;">

            <div class="flex items-center w-full justify-center">
              <div class="flex items-center space-x-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                </svg>
                <span class="text-sm text-gray-500 font-medium">Outils de dessin</span>
              </div>
            </div>
          </div>

          <!-- Conteneur de la carte -->
          <div class="flex-1 relative">
            <div ref="mapContainer" class="absolute inset-0 z-[1000]"></div>
          </div>

          <!-- Panneau d'outils de dessin (s'ouvre du bas vers le haut sur mobile) -->
          <div v-if="currentPlan && !isGeneratingSynthesis"
            :class="[showDrawingTools ? 'translate-y-0' : 'translate-y-full md:translate-y-0',
                    'w-full md:w-64 bg-white border-t md:border-t-0 md:border-l border-gray-200 flex-shrink-0 z-[2000] transition-transform duration-300 ease-out',
                    'fixed md:relative bottom-0 md:bottom-auto right-0 md:top-0 h-[80%] md:h-auto rounded-t-xl md:rounded-none shadow-lg md:shadow-none overflow-y-auto']"
            :style="{ 'bottom': 'var(--mobile-bottom-toolbar-height)' }">
            <!-- Poignée de fermeture pour le panneau mobile (style tiroir) -->
            <div class="md:hidden w-full flex justify-between items-center px-4 py-2 border-b border-gray-200">
              <div class="flex items-center">
                <div @click="toggleDrawingTools" class="w-10 h-1.5 bg-gray-300 rounded-full cursor-pointer mr-3"></div>
              </div>
              <button
                @click="toggleDrawingTools"
                class="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <DrawingTools :current-tool="currentTool" :selected-shape="selectedShape as any"
              :all-layers="featureGroup?.getLayers() || []" @tool-change="setDrawingTool"
              @style-update="updateShapeStyle" @properties-update="updateShapeProperties"
              @delete-shape="deleteSelectedShape"/>
          </div>
        </div>
        <!-- Interface de synthèse -->
        <div v-if="isGeneratingSynthesis"
          class="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-50">
          <div class="text-center">
            <div class="mb-4">
              <svg class="animate-spin h-10 w-10 mx-auto text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none"
                viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                </path>
              </svg>
            </div>
            <p class="text-lg font-medium text-gray-900">Génération de la synthèse en cours...</p>
            <p class="text-sm text-gray-500 mt-2">Veuillez patienter pendant que nous analysons votre plan.</p>
          </div>
        </div>
      </div>
      <!-- Modal Nouveau Plan -->
      <Teleport to="body">
        <NewPlanModal ref="newPlanModalRef" v-model="showNewPlanModal" @created="onPlanCreated"
          @salarieSelected="salarie => selectedSalarie = salarie"
          @visiteurSelected="visiteur => selectedVisiteur = visiteur" />
      </Teleport>
      <!-- Modal Charger un Plan -->
      <Teleport to="body">
        <div v-if="showLoadPlanModal"
          class="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-[9999] p-4 overflow-y-auto">
          <div class="bg-white rounded-lg p-6 max-w-2xl w-full my-8 relative">
            <div class="flex justify-between items-center mb-4 sticky top-0 bg-white pb-4 border-b">
              <h2 class="text-xl font-semibold text-gray-900">Charger un plan existant</h2>
              <button @click="showLoadPlanModal = false" class="text-gray-400 hover:text-gray-500 focus:outline-none">
                <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div class="overflow-y-auto max-h-[calc(100vh-12rem)]">
              <!-- Interface administrateur -->
              <div v-if="authStore.isAdmin" class="space-y-4">
                <!-- Étape 1: Sélection de l'entreprise -->
                <div v-if="!selectedEntreprise" class="space-y-2">
                  <h3 class="font-medium text-gray-700">Sélectionnez une entreprise</h3>
                  <div class="grid grid-cols-1 gap-2">
                    <template v-if="isLoadingEntreprises">
                      <div v-for="i in 3" :key="i" class="animate-pulse">
                        <div class="p-3 bg-white rounded-lg border border-gray-200">
                          <div class="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                          <div class="h-4 bg-gray-100 rounded w-1/2"></div>
                        </div>
                      </div>
                    </template>
                    <template v-else>
                      <button v-for="entreprise in entreprises" :key="entreprise.id" @click="selectEntreprise(entreprise)"
                        class="flex items-center p-3 text-left bg-white hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors duration-200">
                        <div>
                          <div class="font-medium text-gray-900">{{ formatUserDisplay(entreprise) }}</div>
                        </div>
                        <svg class="w-5 h-5 ml-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </template>
                  </div>
                </div>

                <!-- Étape 2: Sélection du salarie -->
                <div v-else-if="!selectedSalarie" class="space-y-2">
                  <div class="flex items-center mb-4">
                    <button @click="backToEntrepriseList" class="flex items-center text-sm text-gray-600 hover:text-gray-900">
                      <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                      </svg>
                      Retour à la liste des entreprises
                    </button>
                    <span class="mx-2 text-gray-400">|</span>
                    <span class="text-sm text-gray-600">
                      {{ formatUserDisplay(selectedEntreprise) }}
                    </span>
                  </div>
                  <h3 class="font-medium text-gray-700">Sélectionnez un salarie</h3>
                  <div class="grid grid-cols-1 gap-2">
                    <template v-if="isLoadingSalaries">
                      <div v-for="i in 3" :key="i" class="animate-pulse">
                        <div class="p-3 bg-white rounded-lg border border-gray-200">
                          <div class="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                          <div class="h-4 bg-gray-100 rounded w-1/2"></div>
                        </div>
                      </div>
                    </template>
                    <template v-else>
                      <button v-for="salarie in filteredSalaries" :key="salarie.id"
                        @click="selectSalarie(salarie)"
                        class="flex items-center p-3 text-left bg-white hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors duration-200">
                        <div>
                          <div class="font-medium text-gray-900">{{ formatUserDisplay(salarie) }}</div>
                        </div>
                        <svg class="w-5 h-5 ml-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </template>
                  </div>
                </div>

                <!-- Étape 3: Sélection du client -->
                <div v-else-if="!selectedClient" class="space-y-2">
                  <div class="flex items-center mb-4">
                    <button @click="backToSalarieList"
                      class="flex items-center text-sm text-gray-600 hover:text-gray-900">
                      <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                      </svg>
                      Retour à la liste des salaries
                    </button>
                    <span class="mx-2 text-gray-400">|</span>
                    <span class="text-sm text-gray-600">
                      {{ formatUserDisplay(selectedSalarie) }}
                    </span>
                  </div>
                  <h3 class="font-medium text-gray-700">Sélectionnez un visiteur</h3>
                  <div class="grid grid-cols-1 gap-2">
                    <template v-if="isLoadingClients">
                      <div v-for="i in 3" :key="i" class="animate-pulse">
                        <div class="p-3 bg-white rounded-lg border border-gray-200">
                          <div class="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                          <div class="h-4 bg-gray-100 rounded w-1/2"></div>
                        </div>
                      </div>
                    </template>
                    <template v-else>
                      <div v-if="filteredClients.length === 0" class="text-center py-8">
                        <div class="text-gray-500 mb-2">Aucun visiteur trouvé pour ce salarie</div>
                        <div class="text-sm text-gray-400">
                          Veuillez vérifier que des visiteurs ont été assignés à ce salarie
                        </div>
                      </div>
                      <button v-else v-for="client in filteredClients" :key="client.id" @click="selectClient(client)"
                        class="flex items-center p-3 text-left bg-white hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors duration-200">
                        <div>
                          <div class="font-medium text-gray-900">{{ formatUserDisplay(client) }}</div>
                        </div>
                        <svg class="w-5 h-5 ml-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </template>
                  </div>
                </div>

                <!-- Étape 4: Liste des plans du client -->
                <div v-else class="space-y-2">
                  <div class="flex items-center mb-4">
                    <button @click="backToClientList" class="flex items-center text-sm text-gray-600 hover:text-gray-900">
                      <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                      </svg>
                      Retour à la liste des clients
                    </button>
                    <span class="mx-2 text-gray-400">|</span>
                    <span class="text-sm text-gray-600">
                      {{ formatUserDisplay(selectedClient) }}
                    </span>
                  </div>
                  <h3 class="font-medium text-gray-700">Plans disponibles</h3>
                  <div class="grid grid-cols-1 gap-2">
                    <template v-if="isLoadingPlans">
                      <div v-for="i in 3" :key="i" class="animate-pulse">
                        <div class="p-3 bg-white rounded-lg border border-gray-200">
                          <div class="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                          <div class="h-4 bg-gray-100 rounded w-2/3 mb-2"></div>
                          <div class="h-3 bg-gray-50 rounded w-1/3"></div>
                        </div>
                      </div>
                    </template>
                    <template v-else>
                      <button v-for="plan in clientPlans" :key="plan.id" @click="loadPlan(plan.id)"
                        class="w-full px-4 py-3 text-left bg-white hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors duration-200">
                        <div class="font-medium text-gray-900">{{ plan.nom }}</div>
                        <div class="text-sm text-gray-500">{{ plan.description }}</div>
                        <div class="text-xs text-gray-400 mt-1">
                          Modifié le {{ formatLastSaved(plan.date_modification) }}
                        </div>
                      </button>
                    </template>
                  </div>
                </div>
              </div>

              <!-- Interface salarie -->
              <div v-else-if="authStore.isSalarie" class="space-y-4">
                <!-- Liste des clients -->
                <div v-if="!selectedClient" class="space-y-2">
                  <h3 class="font-medium text-gray-700">Sélectionnez un visiteur</h3>
                  <div class="grid grid-cols-1 gap-2">
                    <template v-if="isLoadingClients">
                      <div v-for="i in 3" :key="i" class="animate-pulse">
                        <div class="p-3 bg-white rounded-lg border border-gray-200">
                          <div class="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                          <div class="h-4 bg-gray-100 rounded w-1/2"></div>
                        </div>
                      </div>
                    </template>
                    <template v-else>
                      <div v-if="filteredClients.length === 0" class="text-center py-8">
                        <div class="text-gray-500 mb-2">Aucun visiteur trouvé pour ce salarie</div>
                        <div class="text-sm text-gray-400">
                          Veuillez vérifier que des visiteurs ont été assignés à ce salarie
                        </div>
                      </div>
                      <button v-else v-for="client in filteredClients" :key="client.id" @click="selectClient(client)"
                        class="flex items-center p-3 text-left bg-white hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors duration-200">
                        <div>
                          <div class="font-medium text-gray-900">{{ formatUserDisplay(client) }}</div>
                        </div>
                        <svg class="w-5 h-5 ml-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </template>
                  </div>
                </div>
                <!-- Liste des plans du client -->
                <div v-else class="space-y-2">
                  <div class="flex items-center mb-4">
                    <button @click="backToClientList" class="flex items-center text-sm text-gray-600 hover:text-gray-900">
                      <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                      </svg>
                      Retour à la liste des clients
                    </button>
                    <span class="mx-2 text-gray-400">|</span>
                    <span class="text-sm text-gray-600">
                      {{ formatUserDisplay(selectedClient) }}
                    </span>
                  </div>
                  <h3 class="font-medium text-gray-700">Plans disponibles</h3>
                  <div class="grid grid-cols-1 gap-2">
                    <template v-if="isLoadingPlans">
                      <div v-for="i in 3" :key="i" class="animate-pulse">
                        <div class="p-3 bg-white rounded-lg border border-gray-200">
                          <div class="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                          <div class="h-4 bg-gray-100 rounded w-2/3 mb-2"></div>
                          <div class="h-3 bg-gray-50 rounded w-1/3"></div>
                        </div>
                      </div>
                    </template>
                    <template v-else>
                      <button v-for="plan in clientPlans" :key="plan.id" @click="loadPlan(plan.id)"
                        class="w-full px-4 py-3 text-left bg-white hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors duration-200">
                        <div class="font-medium text-gray-900">{{ plan.nom }}</div>
                        <div class="text-sm text-gray-500">{{ plan.description }}</div>
                        <div class="text-xs text-gray-400 mt-1">
                          Modifié le {{ formatLastSaved(plan.date_modification) }}
                        </div>
                      </button>
                    </template>
                  </div>
                </div>
              </div>

              <!-- Interface entreprise -->
              <div v-else-if="authStore.isEntreprise" class="space-y-4">
                <!-- Contenu existant de l'interface entreprise -->
                {{ authStore.isEntreprise ? '...' : '' }}
              </div>

              <!-- Interface client -->
              <div v-else class="space-y-4">
                <div v-if="irrigationStore.plans.length === 0" class="text-center py-8">
                  <p class="text-gray-500">Aucun plan disponible</p>
                </div>
                <div v-else class="space-y-2">
                  <button v-for="plan in irrigationStore.plans" :key="plan.id" @click="loadPlan(plan.id)"
                    class="w-full px-4 py-3 text-left bg-white hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors duration-200">
                    <div class="font-medium text-gray-900">{{ plan.nom }}</div>
                    <div class="text-sm text-gray-500">{{ plan.description }}</div>
                    <div class="text-xs text-gray-400 mt-1">
                      Modifié le {{ formatLastSaved(plan.date_modification) }}
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Teleport>
    </div>
  </div>

  <!-- Modal d'édition de note -->
  <NoteEditModal
    v-if="showNoteEditModal"
    :note="editingMapNote"
    :is-new-note="!editingMapNote?.id"
    :location="editingMapNote?.location"
    @close="closeNoteEditModal"
    @save="handleNoteSave"
  />
</template>
<script setup lang="ts">
import { onMounted, ref, watch, onBeforeUnmount, onUnmounted, computed, nextTick } from 'vue';
import type { LatLngTuple } from 'leaflet';
import * as L from 'leaflet';
import 'leaflet-simple-map-screenshoter';
import DrawingTools from '../components/DrawingTools.vue';
import MapToolbar from '../components/MapToolbar.vue';
import NoteEditModal from '../components/NoteEditModal.vue';
import { useMapDrawing } from '../composables/useMapDrawing';
import { useMapState } from '../composables/useMapState';
import { useIrrigationStore } from '@/stores/irrigation';
import { useDrawingStore } from '@/stores/drawing';
import { useNotesStore } from '@/stores/notes';
import { useNotificationStore } from '@/stores/notification';
import { performanceMonitor } from '@/utils/usePerformanceMonitor';
import type { Plan } from '@/stores/irrigation';
import type { DrawingElement, ShapeType, CircleData, RectangleData, LineData, PolygonData, DrawingElementType, ElevationLineData } from '@/types/drawing';
import { Rectangle } from '@/utils/Rectangle';
import { Line } from '@/utils/Line';
import { Polygon } from '@/utils/Polygon';
import { useAuthStore } from '@/stores/auth';
import api from '@/services/api';
import NewPlanModal from '@/components/NewPlanModal.vue';
import jsPDF from 'jspdf';
import logo from '@/assets/logo.svg';
import { debounce } from 'lodash';
import { Circle } from '@/utils/Circle';
import { ElevationLine } from '@/utils/ElevationLine';

// Types étendus pour les utilisateurs et plans
interface UserDetails {
  id: number;
  username: string;
  email?: string;
  first_name: string;
  last_name: string;
  company_name?: string;
  role?: string;
  salarie?: number;
  salarie_name?: string;
  is_active?: boolean;
  display_name?: string;
  logo?: string;
}

interface ExtendedUserDetails extends UserDetails {
  entreprise?: number;
  entreprise_details?: ExtendedUserDetails;
  salarie_details?: ExtendedUserDetails;
  client_details?: ExtendedUserDetails;
}

interface ExtendedPlan extends Plan {
  salarie_details?: ExtendedUserDetails;
  client_details?: ExtendedUserDetails;
  entreprise_details?: ExtendedUserDetails;
}

const mapContainer = ref<HTMLElement | null>(null);
const showDrawingTools = ref(false);
const irrigationStore = useIrrigationStore();
const drawingStore = useDrawingStore();
const notesStore = useNotesStore();
const notificationStore = useNotificationStore();
const shapes = ref<any[]>([]);
const {
  currentTool,
  selectedShape: selectedLeafletShape,
  map,
  initMap: initDrawing,
  setDrawingTool,
  updateShapeStyle,
  updateShapeProperties: updatePropertiesFromDestruct,
  featureGroup,
  adjustView,
  clearActiveControlPoints,
  calculateConnectedCoverageArea,
} = useMapDrawing();
const {
  initMap: initState,
  changeBaseMap
} = useMapState();
// Ajout des refs pour les modals
const showNewPlanModal = ref(false);
const showLoadPlanModal = ref(false);
const showNoteEditModal = ref(false);
const currentPlan = ref<ExtendedPlan | null>(null);
const editingMapNote = ref<any>(null);
// État pour la sauvegarde
const saving = ref(false);
const saveStatus = ref<'saving' | 'success' | null>(null);
// Ajout des imports et des refs nécessaires
const authStore = useAuthStore();
const salaries = ref<ExtendedUserDetails[]>([]);
const salarieVisiteurs = ref<ExtendedUserDetails[]>([]);
const clientPlans = ref<Plan[]>([]);
const selectedSalarie = ref<any | null>(null);
const selectedVisiteur = ref<any | null>(null);
const selectedClient = ref<ExtendedUserDetails | null>(null);
const isLoadingSalaries = ref(false);
const isLoadingClients = ref(false);
const isLoadingPlans = ref(false);
// Référence vers le composant NewPlanModal
const newPlanModalRef = ref<InstanceType<typeof NewPlanModal> | null>(null);
// Computed pour les clients filtrés selon le salarie
const filteredClients = computed(() => {
  console.log('[MapView][filteredClients] Computing with:', {
    userType: authStore.user?.user_type,
    selectedSalarie: selectedSalarie.value,
    salarieVisiteurs: salarieVisiteurs.value,
    visiteurCount: salarieVisiteurs.value?.length || 0
  });

  // Si l'utilisateur est un salarie, retourner directement ses visiteurs
  if (authStore.isSalarie) {
    return salarieVisiteurs.value;
  }

  // Pour les autres rôles (admin, entreprise), vérifier si un salarie est sélectionné
  if (selectedSalarie.value) {
    return salarieVisiteurs.value;
  }

  return [];
});
// Computed property to transform Leaflet Layer to ShapeType
const selectedShape = computed((): ShapeType | null => {
  if (!selectedLeafletShape.value) return null;

  // Log the complete state of the selected layer
  console.log('[MapView][selectedShape] Initial layer state:', {
    layer: selectedLeafletShape.value,
    hasName: 'name' in selectedLeafletShape.value,
    name: selectedLeafletShape.value.name,
    hasProperties: 'properties' in selectedLeafletShape.value,
    propertiesName: selectedLeafletShape.value.properties?.name,
    allLayerKeys: Object.keys(selectedLeafletShape.value),
    allPropertiesKeys: selectedLeafletShape.value.properties ? Object.keys(selectedLeafletShape.value.properties) : [],
    _leaflet_id: selectedLeafletShape.value._leaflet_id,
    _dbId: selectedLeafletShape.value._dbId,
    // Essayer de détecter le nom même s'il n'est pas énumérable
    descriptor: Object.getOwnPropertyDescriptor(selectedLeafletShape.value, 'name')
  });

  // Get the raw properties object and ensure we're capturing all properties
  const rawProperties = selectedLeafletShape.value.properties || {};

  // Check multiple places for the name
  let shapeName = undefined;

  // Check in style.name which is the most reliable place
  if (rawProperties.style && rawProperties.style.name) {
    shapeName = rawProperties.style.name;
    console.log('[MapView][selectedShape] Using name from style:', shapeName);
  }
  // Fall back to direct name on properties
  else if (rawProperties.name) {
    shapeName = rawProperties.name;
    console.log('[MapView][selectedShape] Using name from properties:', shapeName);
  }
  // Fall back to name on the layer itself
  else if (selectedLeafletShape.value.name) {
    shapeName = selectedLeafletShape.value.name;
    console.log('[MapView][selectedShape] Using name from layer:', shapeName);
  }
  // Last resort: check for non-enumerable properties
  else {
    // Try to find non-enumerable name property
    const layerDescriptor = Object.getOwnPropertyDescriptor(selectedLeafletShape.value, 'name');
    if (layerDescriptor && layerDescriptor.value) {
      shapeName = layerDescriptor.value;
      console.log('[MapView][selectedShape] Found name in non-enumerable layer property:', shapeName);
    }

    // Check if there's a direct _name or similar property
    const possibleNameProps = ['_name', 'displayName', 'title'];
    for (const prop of possibleNameProps) {
      if ((selectedLeafletShape.value as any)[prop]) {
        shapeName = (selectedLeafletShape.value as any)[prop];
        console.log(`[MapView][selectedShape] Found name in ${prop}:`, shapeName);
        break;
      }
    }
  }

  // Force l'attribution du nom aux deux endroits
  if (shapeName) {
    console.log(`[MapView][selectedShape] Ensuring name "${shapeName}" is set everywhere`);
    // Ensure properties exists
    if (!selectedLeafletShape.value.properties) {
      selectedLeafletShape.value.properties = {};
    }

    // Set in properties.name
    selectedLeafletShape.value.properties.name = shapeName;

    // Set in properties.style.name
    if (!selectedLeafletShape.value.properties.style) {
      selectedLeafletShape.value.properties.style = {};
    }
    selectedLeafletShape.value.properties.style.name = shapeName;

    // Set directly on the layer
    (selectedLeafletShape.value as any).name = shapeName;

    // Utiliser la méthode setName si disponible
    if (typeof selectedLeafletShape.value.setName === 'function') {
      selectedLeafletShape.value.setName(shapeName);
      console.log(`[MapView][selectedShape] Used setName method to set name "${shapeName}"`);
    }
  }

  // Log detailed information about the properties
  console.log('[MapView][selectedShape] Preparing properties for DrawingTools:', {
    type: rawProperties.type,
    name: rawProperties.name,
    foundName: shapeName,
    hasNameProperty: 'name' in rawProperties,
    allPropertiesKeys: Object.keys(rawProperties),
    layerId: selectedLeafletShape.value._leaflet_id,
    rawProperties,
    layerName: selectedLeafletShape.value.name,
    layerPropertiesName: selectedLeafletShape.value.properties?.name
  });

  // Create a fresh copy of the properties with explicit name handling
  const properties = {
    ...rawProperties,
    // Ensure name is explicitly included if it exists anywhere
    name: shapeName || selectedLeafletShape.value.name || rawProperties.name || undefined
  };

  // Create the shape object to pass to DrawingTools
  const shape = {
    type: properties.type || 'unknown',
    properties,
    layer: selectedLeafletShape.value
  };

  console.log('[MapView][selectedShape] Final shape object for DrawingTools:', {
    type: shape.type,
    hasName: 'name' in shape.properties,
    name: shape.properties.name,
    layerName: shape.layer.name,
    layerPropertiesName: shape.layer.properties?.name
  });

  return shape;
});
// Fonction pour sauvegarder la position dans les cookies
function saveMapPosition(mapInstance: L.Map) {
  const center = mapInstance.getCenter();
  const zoom = mapInstance.getZoom();
  const mapState = {
    lat: center.lat,
    lng: center.lng,
    zoom: zoom
  };
  document.cookie = `mapState=${JSON.stringify(mapState)};max-age=2592000;path=/`; // expire dans 30 jours
}
// Fonction pour récupérer la position depuis les cookies
function getMapPosition(): { lat: number; lng: number; zoom: number } | null {
  const cookies = document.cookie.split(';');
  const mapCookie = cookies.find(cookie => cookie.trim().startsWith('mapState='));
  if (mapCookie) {
    try {
      return JSON.parse(mapCookie.split('=')[1]);
    } catch (e) {
      console.error('Erreur lors de la lecture du cookie de position:', e);
      return null;
    }
  }
  return null;
}
onMounted(async () => {
  try {
    // Charger les plans
    await irrigationStore.fetchPlans();

    // Si admin ou entreprise, charger les entreprises
    if (authStore.isAdmin || authStore.isEntreprise) {
      await loadEntreprises();
    }

    // Si entreprise, charger directement ses salaries
    if (authStore.isEntreprise) {
      isLoadingSalaries.value = true;
      try {
        const response = await api.get('/users/', {
          params: {
            role: 'SALARIE',
            entreprise: authStore.user?.id
          }
        });
        salaries.value = response.data;
      } catch (error) {
        console.error('Error loading salaries:', error);
        salaries.value = [];
      } finally {
        isLoadingSalaries.value = false;
      }
    }

    // Si salarie, charger ses clients
    if (authStore.isSalarie) {
      isLoadingClients.value = true;
      try {
        const result = await authStore.fetchSalarieVisiteurs(authStore.user?.id || 0);
        salarieVisiteurs.value = (Array.isArray(result) ? result : [result]) as ExtendedUserDetails[];
      } catch (error) {
        console.error('Error loading clients:', error);
      } finally {
        isLoadingClients.value = false;
      }
    }

    // Récupérer la dernière position sauvegardée ou utiliser la position par défaut
    const savedPosition = getMapPosition();
    const center: LatLngTuple = savedPosition
      ? [savedPosition.lat, savedPosition.lng]
      : [46.603354, 1.888334];
    const zoom = savedPosition?.zoom ?? 6;

    // Initialiser la carte une seule fois
    if (mapContainer.value && !map.value) {
      const mapInstance = initDrawing(mapContainer.value, center, zoom) as L.Map;
      mapInstance.pm.setLang('fr');
      mapInstance.pm.addControls({
        rotateMode: false
      });
      initState(mapInstance);
      mapInstance.on('moveend', () => {
        saveMapPosition(mapInstance);
      });
      window.addEventListener('map-set-location', ((event: CustomEvent) => {
        if (mapInstance && event.detail) {
          const { lat, lng, zoom } = event.detail;
          mapInstance.flyTo([lat, lng], zoom, {
            duration: 1.5,
            easeLinearity: 0.25
          });
        }
      }) as EventListener);
    }

    // Charger le dernier plan consulté immédiatement
    const lastPlanId = localStorage.getItem('lastPlanId');
    if (lastPlanId) {
      try {
        console.log('[MapView][onMounted] Chargement immédiat du dernier plan:', lastPlanId);
        await loadPlan(parseInt(lastPlanId));
        // Forcer l'affichage de la carte et cacher l'écran d'accueil
        const mapParent = document.querySelector('.map-parent');
        if (mapParent instanceof HTMLElement) {
          mapParent.style.display = 'block';
        }
      } catch (error) {
        console.error('[MapView][onMounted] Erreur chargement dernier plan:', error);
        currentPlan.value = null;
        irrigationStore.clearCurrentPlan();
        drawingStore.clearCurrentPlan();
        clearMap();
        localStorage.removeItem('lastPlanId');
      }
    } else {
      console.log('[MapView][onMounted] Aucun dernier plan à charger');
      currentPlan.value = null;
      irrigationStore.clearCurrentPlan();
      drawingStore.clearCurrentPlan();
      clearMap();
    }

    // Écouter l'événement de création de forme
    window.addEventListener('shape:created', ((event: CustomEvent) => {
      const { shape, type, properties } = event.detail;
      console.log('[MapView] Nouvelle forme créée', { shape, type, properties });
      drawingStore.addElement(shape);
      // Désélectionner l'outil de dessin après la création
      setDrawingTool('');
    }) as EventListener);

    // Écouter l'événement d'édition de note (via Leaflet)
    const handleNoteEdit = (e: any) => {
      console.log('[MapView] Édition de note via Leaflet', e);
      console.log('[MapView] Type de e:', typeof e, 'Contenu de e:', JSON.stringify(e));

      // Vérifier si e.note existe
      if (!e || !e.note) {
        console.error('[MapView] Erreur: e.note est undefined ou null', e);
        return;
      }

      const note = e.note;
      console.log('[MapView] Note à éditer:', note);

      // Convertir la note Leaflet en note compatible avec le store
      editingMapNote.value = {
        id: note.id,
        title: note.title || note.name,
        description: note.description,
        location: note.location,
        columnId: note.columnId || notesStore.getDefaultColumn.id,
        accessLevel: note.accessLevel,
        style: note.style || {
          color: '#3B82F6',
          weight: 2,
          opacity: 1,
          fillColor: '#3B82F6',
          fillOpacity: 0.6,
          radius: 8
        },
        order: 0,
        createdAt: note.createdAt || new Date().toISOString(),
        updatedAt: note.updatedAt || new Date().toISOString(),
        comments: note.comments || [],
        photos: note.photos || []
      };

      console.log('[MapView] editingMapNote.value après conversion:', editingMapNote.value);

      // Ouvrir le modal d'édition
      showNoteEditModal.value = true;
      console.log('[MapView] showNoteEditModal.value:', showNoteEditModal.value);
    };

    // Écouter l'événement d'édition de note (via événement global)
    const handleGlobalNoteEdit = (event: CustomEvent) => {
      console.log('[MapView] Édition de note via événement global', event);

      if (!event.detail || !event.detail.note) {
        console.error('[MapView] Erreur: event.detail.note est undefined ou null', event);
        return;
      }

      const note = event.detail.note;
      console.log('[MapView] Note à éditer (global):', note);

      // Convertir la note en note compatible avec le store
      editingMapNote.value = {
        id: note.id,
        title: note.title || note.name,
        description: note.description,
        location: note.location,
        columnId: note.columnId || notesStore.getDefaultColumn.id,
        accessLevel: note.accessLevel,
        style: note.style || {
          color: '#3B82F6',
          weight: 2,
          opacity: 1,
          fillColor: '#3B82F6',
          fillOpacity: 0.6,
          radius: 8
        },
        order: 0,
        createdAt: note.createdAt || new Date().toISOString(),
        updatedAt: note.updatedAt || new Date().toISOString(),
        comments: note.comments || [],
        photos: note.photos || []
      };

      // Ouvrir le modal d'édition
      showNoteEditModal.value = true;
    };

    // Ajouter l'écouteur global
    window.addEventListener('geonote:edit', handleGlobalNoteEdit as EventListener);

    if (featureGroup.value) {
      // Supprimer l'écouteur existant s'il y en a un
      featureGroup.value.off('note:edit');
      // Ajouter le nouvel écouteur
      featureGroup.value.on('note:edit', handleNoteEdit);
    }
  } catch (error) {
    console.error('Error during component mount:', error);
    currentPlan.value = null;
    irrigationStore.clearCurrentPlan();
    drawingStore.clearCurrentPlan();
    clearMap();
    localStorage.removeItem('lastPlanId');
  }
});
// Surveiller les changements dans le dessin
watch(() => drawingStore.hasUnsavedChanges, (newValue) => {
  console.log('[MapView][watch drawingStore.hasUnsavedChanges]', newValue);
  if (newValue && currentPlan.value) {
    irrigationStore.markUnsavedChanges();
  }
});
// Surveiller l'initialisation de la carte
watch(map, async (newMap) => {
  console.log('\n[MapView][watch map] Nouvelle carte:', !!newMap);
  if (newMap && irrigationStore.currentPlan && !featureGroup.value?.getLayers().length) {
    console.log('[MapView][watch map] Chargement initial des éléments du plan:', irrigationStore.currentPlan.id);
    clearMap();
    await drawingStore.loadPlanElements(irrigationStore.currentPlan.id);
  }
});
// Surveiller le plan courant dans le store
watch(() => irrigationStore.currentPlan, async (newPlan, oldPlan) => {
  // Éviter les rechargements inutiles si le plan n'a pas changé
  if (newPlan?.id === oldPlan?.id) {
    console.log('[MapView][watch currentPlan] Plan identique, pas de rechargement nécessaire');
    return;
  }

  console.log('\n[MapView][watch currentPlan] ====== CHANGEMENT DE PLAN ======');
  console.log('[MapView][watch currentPlan] Nouveau plan:', newPlan?.id);

  try {
    if (newPlan) {
      console.log('[MapView][watch currentPlan] Mise à jour du plan courant...');
      currentPlan.value = newPlan;

      // Forcer l'affichage de la carte et cacher l'écran d'accueil
      const mapParent = document.querySelector('.map-parent');
      if (mapParent instanceof HTMLElement) {
        mapParent.style.display = 'block';
      }
      console.log('[MapView][watch currentPlan] Plan mis à jour avec succès');
    } else {
      console.log('[MapView][watch currentPlan] Nettoyage du plan courant...');
      currentPlan.value = null;
      clearMap();

      // Cacher la carte et montrer l'écran d'accueil
      const mapParent = document.querySelector('.map-parent');
      if (mapParent instanceof HTMLElement) {
        mapParent.style.display = 'none';
      }
    }
  } catch (error) {
    console.error('[MapView][watch currentPlan] ERREUR:', error);
    currentPlan.value = null;
    clearMap();
  }

  console.log('[MapView][watch currentPlan] État final:', {
    currentPlanId: currentPlan.value?.id,
    storePlanId: irrigationStore.currentPlan?.id,
    mapVisible: map.value !== null,
    mapParentDisplay: document.querySelector('.map-parent')?.getAttribute('style')
  });
  console.log('[MapView][watch currentPlan] ====== FIN CHANGEMENT ======\n');
}, { immediate: true });
// Nettoyer l'écouteur d'événement lors de la destruction du composant
onBeforeUnmount(() => {
  if (map.value) {
    map.value.off('moveend');
  }
  window.removeEventListener('shape:created', (() => { }) as EventListener);
});
// Fonction pour afficher/masquer les outils de dessin sur mobile
function toggleDrawingTools() {
  showDrawingTools.value = !showDrawingTools.value;
}

// Fonction pour nettoyer la carte
function clearMap() {
  if (featureGroup.value) {
    featureGroup.value.clearLayers();
  }
  shapes.value = [];
  clearActiveControlPoints();
  selectedLeafletShape.value = null;
  currentTool.value = '';
}
// Fonction pour rafraîchir la carte avec un nouveau plan
async function refreshMapWithPlan(planId: number) {
  return await performanceMonitor.measureAsync('refreshMapWithPlan', async () => {
    try {
      // Nettoyer la carte actuelle
      performanceMonitor.measure('refreshMapWithPlan:clearMap', () => {
        clearMap();
      }, 'MapView');

      // Charger les éléments du plan
      await performanceMonitor.measureAsync('refreshMapWithPlan:loadPlanElements', async () => {
        await drawingStore.loadPlanElements(planId);
      }, 'MapView');

      // Récupérer le plan depuis le store
      const loadedPlan = performanceMonitor.measure('refreshMapWithPlan:getPlanById', () => {
        return irrigationStore.getPlanById(planId);
      }, 'MapView');

      if (loadedPlan) {
        // Mettre à jour le plan courant
        performanceMonitor.measure('refreshMapWithPlan:updateCurrentPlan', () => {
          currentPlan.value = loadedPlan;
          irrigationStore.setCurrentPlan(loadedPlan);
          drawingStore.setCurrentPlan(loadedPlan.id);
          localStorage.setItem('lastPlanId', loadedPlan.id.toString());
        }, 'MapView');

        // Ajouter les formes à la carte
        if (map.value && featureGroup.value) {
          await performanceMonitor.measureAsync('refreshMapWithPlan:addShapesToMap', async () => {
            console.log('[MapView][refreshMapWithPlan] Éléments disponibles:', {
              count: drawingStore.getCurrentElements.length,
              elements: drawingStore.getCurrentElements.map(e => ({
                id: e.id,
                type: e.type_forme,
                hasName: e.data && 'name' in e.data,
                name: e.data?.name
              }))
            });

            // Regrouper les éléments par type pour un traitement par lots
            const elementsByType = drawingStore.getCurrentElements.reduce((acc, element) => {
              if (!acc[element.type_forme]) {
                acc[element.type_forme] = [];
              }
              acc[element.type_forme].push(element);
              return acc;
            }, {} as Record<string, any[]>);

            // Traiter chaque type d'élément en parallèle
            const batchSize = 10; // Nombre d'éléments à traiter par lot
            const creationPromises = Object.entries(elementsByType).map(async ([type, elements]) => {
              // Diviser les éléments en lots
              for (let i = 0; i < elements.length; i += batchSize) {
                const batch = elements.slice(i, i + batchSize);

                // Traiter le lot en parallèle
                await Promise.all(batch.map(async (element) => {
                  await performanceMonitor.measureAsync(`refreshMapWithPlan:createElement:${element.type_forme}`, async () => {
                    if (!featureGroup.value || !element.data) return;
                    let layer: L.Layer | null = null;

                    switch (element.type_forme) {
                      case 'Circle': {
                        const circleData = element.data as CircleData;
                        if (circleData.center && circleData.radius) {
                          layer = new Circle(
                            L.latLng(circleData.center[1], circleData.center[0]),
                            { ...circleData.style, radius: circleData.radius }
                          );
                          if (circleData.name) {
                            (layer as any).properties = {
                              type: 'Circle',
                              name: circleData.name,
                              style: circleData.style,
                              radius: circleData.radius,
                              diameter: circleData.radius * 2,
                              surface: Math.PI * circleData.radius * circleData.radius,
                              perimeter: 2 * Math.PI * circleData.radius
                            };
                            (layer as any).name = circleData.name;
                          }
                        }
                        break;
                      }
                      case 'Rectangle': {
                        const rectData = element.data as RectangleData;
                        if (rectData.bounds) {
                          const bounds = L.latLngBounds(
                            L.latLng(rectData.bounds.southWest[1], rectData.bounds.southWest[0]),
                            L.latLng(rectData.bounds.northEast[1], rectData.bounds.northEast[0])
                          );
                          layer = new Rectangle(bounds, rectData.style);
                          if (rectData.name) {
                            (layer as any).properties = { name: rectData.name };
                            (layer as any).name = rectData.name;
                          }
                        }
                        break;
                      }
                      case 'Polygon': {
                        const polygonData = element.data as PolygonData;
                        if (polygonData.points && polygonData.points.length > 0) {
                          const latLngs = polygonData.points.map(point => L.latLng(point[1], point[0]));
                          layer = new Polygon(latLngs, polygonData.style);
                          if (polygonData.name) {
                            (layer as any).properties = { name: polygonData.name };
                            (layer as any).name = polygonData.name;
                          }
                        }
                        break;
                      }
                      case 'Line': {
                        const lineData = element.data as LineData;
                        if (lineData.points && lineData.points.length > 0) {
                          const latLngs = lineData.points.map(point => L.latLng(point[1], point[0]));
                          layer = new Line(latLngs, lineData.style);
                          if (lineData.name) {
                            (layer as any).properties = { name: lineData.name };
                            (layer as any).name = lineData.name;
                          }
                        }
                        break;
                      }
                      case 'ElevationLine': {
                        const lineData = element.data as ElevationLineData;
                        if (lineData.points && lineData.points.length > 0) {
                          const latLngs = lineData.points.map(point => L.latLng(point[1], point[0]));
                          layer = new ElevationLine(latLngs, lineData.style);
                          if (lineData.name) {
                            (layer as any).properties = {
                              name: lineData.name,
                              type: 'ElevationLine',
                              elevationData: lineData.elevationData,
                              minElevation: lineData.minElevation,
                              maxElevation: lineData.maxElevation,
                              elevationGain: lineData.elevationGain,
                              elevationLoss: lineData.elevationLoss,
                              averageSlope: lineData.averageSlope,
                              maxSlope: lineData.maxSlope
                            };
                            (layer as any).name = lineData.name;
                          }
                          if (lineData.elevationData) {
                            (layer as any).elevationData = lineData.elevationData;
                          }
                        }
                        break;
                      }
                    }

                    if (layer) {
                      (layer as any)._dbId = element.id;
                      featureGroup.value?.addLayer(layer);
                      shapes.value.push({
                        id: element.id,
                        type: element.type_forme,
                        layer: layer,
                        properties: (layer as any).properties
                      });
                    }
                  }, 'MapView');
                }));

                // Petit délai entre les lots pour éviter de bloquer le thread principal
                await new Promise(resolve => setTimeout(resolve, 0));
              }
            });

            // Attendre que tous les éléments soient créés
            await Promise.all(creationPromises);

            // Ajuster la vue après avoir ajouté toutes les formes
            performanceMonitor.measure('refreshMapWithPlan:adjustView', () => {
              adjustView();
            }, 'MapView');
          }, 'MapView');
        }
        console.log(`Plan ${planId} chargé avec succès avec ${drawingStore.getCurrentElements.length} formes`);
      } else {
        console.error(`Plan ${planId} introuvable après chargement`);
      }
      showLoadPlanModal.value = false;
    } catch (error) {
      console.error('Erreur lors du rafraîchissement de la carte:', error);
      throw error;
    }
  }, 'MapView');
}
// Modifier la fonction loadPlan pour utiliser refreshMapWithPlan
async function loadPlan(planId: number) {
  return await performanceMonitor.measureAsync('loadPlan', async () => {
    console.log('\n[MapView][loadPlan] ====== DÉBUT CHARGEMENT PLAN ======');
    console.log('[MapView][loadPlan] Tentative de chargement du plan:', planId);

    try {
      // Vérifier si le plan existe dans le store
      const plan = await performanceMonitor.measureAsync('loadPlan:getPlanFromStore', async () => {
        return irrigationStore.getPlanById(planId);
      }, 'MapView');

      console.log('[MapView][loadPlan] Plan trouvé dans le store:', !!plan);

      // Si le plan n'existe pas dans le store, vérifier avec l'API
      if (!plan) {
        console.log('[MapView][loadPlan] Plan non trouvé dans le store, vérification API...');
        try {
          await performanceMonitor.measureAsync('loadPlan:apiCheck', async () => {
            await api.get(`/plans/${planId}/`);
          }, 'MapView');
        } catch (error: any) {
          if (error.response?.status === 404) {
            console.warn('[MapView][loadPlan] Plan non trouvé - Nettoyage du localStorage');
            localStorage.removeItem('lastPlanId');
            currentPlan.value = null;
            irrigationStore.clearCurrentPlan();
            drawingStore.clearCurrentPlan();
            clearMap();
          }
          throw error;
        }
      }

      console.log('[MapView][loadPlan] Rafraîchissement de la carte...');
      await performanceMonitor.measureAsync('loadPlan:refreshMap', async () => {
        await refreshMapWithPlan(planId);
      }, 'MapView');

      showLoadPlanModal.value = false;

      console.log('[MapView][loadPlan] Invalidation de la taille de la carte...');
      invalidateMapSize();

      console.log('[MapView][loadPlan] Plan chargé avec succès:', {
        planId,
        elementsCount: drawingStore.getCurrentElements.length
      });
    } catch (error) {
      console.error('Erreur lors du chargement du plan:', error);
      // En cas d'erreur, réinitialiser complètement l'état
      performanceMonitor.measure('loadPlan:errorRecovery', () => {
        currentPlan.value = null;
        irrigationStore.clearCurrentPlan();
        drawingStore.clearCurrentPlan();
        clearMap();
        localStorage.removeItem('lastPlanId');
      }, 'MapView');
      throw error;
    }
  }, 'MapView');
}
// Modifier la fonction savePlan
async function savePlan() {
  if (!currentPlan.value || !featureGroup.value) {
    console.warn('Aucun plan actif ou groupe de formes à sauvegarder');
    return;
  }
  saving.value = true;
  saveStatus.value = 'saving';
  try {
    const elements: DrawingElement[] = [];
    // Récupérer les identifiants existants dans la base de données
    const existingIds = new Set(drawingStore.getCurrentElements
      .filter(el => el.id !== undefined)
      .map(el => el.id as number));
    // Identifiants actuellement présents sur la carte
    const currentLayerIds = new Set<number>();

    // Log pour le debug
    console.log('[savePlan] Début de la sauvegarde', {
      featureGroupLayers: featureGroup.value.getLayers().length,
      existingIds: Array.from(existingIds),
      currentElements: drawingStore.getCurrentElements
    });

    featureGroup.value.eachLayer((layer: L.Layer) => {
      console.log('[savePlan] Traitement de la couche', {
        type: (layer as any).properties?.type,
        name: (layer as any).properties?.name,
        isPolygon: layer instanceof L.Polygon,
        properties: (layer as any).properties
      });

      let type_forme: DrawingElementType | undefined;
      let data: any;

      // Extraire le style commun
      const commonStyle = {
        color: (layer.options as L.PathOptions).color || '#3388ff',
        weight: (layer.options as L.PathOptions).weight || 3,
        opacity: (layer.options as L.PathOptions).opacity || 1,
        fillColor: (layer.options as L.PathOptions).fillColor || '#3388ff',
        fillOpacity: (layer.options as L.PathOptions).fillOpacity || 0.2,
        dashArray: (layer.options as L.PathOptions).dashArray || ''
      };

      if (layer instanceof Rectangle) {
        type_forme = 'Rectangle';
        const bounds = layer.getBounds();
        data = {
          bounds: {
            southWest: [bounds.getSouthWest().lng, bounds.getSouthWest().lat],
            northEast: [bounds.getNorthEast().lng, bounds.getNorthEast().lat]
          },
          style: commonStyle,
          name: layer.properties?.name || '', // Assurer que le nom est inclus
          rotation: layer.getRotation(),
          width: layer.getDimensions().width,
          height: layer.getDimensions().height,
          center: [layer.getCenter().lng, layer.getCenter().lat]
        };
      } else if (layer instanceof L.Circle) {
        type_forme = 'Circle';
        data = {
          center: [layer.getLatLng().lng, layer.getLatLng().lat],
          radius: layer.getRadius(),
          name: (layer as any).properties?.name || '', // Assurer que le nom est inclus
          style: commonStyle
        };
      } else if (layer instanceof L.Rectangle) {
        type_forme = 'Rectangle';
        const bounds = layer.getBounds();
        data = {
          bounds: {
            southWest: [bounds.getSouthWest().lng, bounds.getSouthWest().lat],
            northEast: [bounds.getNorthEast().lng, bounds.getNorthEast().lat]
          },
          name: (layer as any).properties?.name || '', // Assurer que le nom est inclus
          style: commonStyle
        };
      } else if (layer instanceof L.Polyline && !(layer instanceof L.Polygon)) {
        // Vérifier d'abord si c'est une ElevationLine
        if ((layer as any).properties?.type === 'ElevationLine') {
          type_forme = 'ElevationLine';
          const latLngs = layer.getLatLngs() as L.LatLng[];
          data = {
            points: latLngs.map(ll => [ll.lng, ll.lat]),
            style: {
              ...commonStyle,
              color: (layer as any).properties.style?.color || '#FF4500',
              weight: (layer as any).properties.style?.weight || 4,
              opacity: (layer as any).properties.style?.opacity || 0.8
            },
            name: (layer as any).properties?.name || '', // Assurer que le nom est inclus
            elevationData: (layer as any).properties.elevationData,
            samplePointStyle: (layer as any).properties.samplePointStyle,
            minMaxPointStyle: (layer as any).properties.minMaxPointStyle,
            minElevation: (layer as any).properties.minElevation,
            maxElevation: (layer as any).properties.maxElevation,
            elevationGain: (layer as any).properties.elevationGain,
            elevationLoss: (layer as any).properties.elevationLoss,
            averageSlope: (layer as any).properties.averageSlope,
            maxSlope: (layer as any).properties.maxSlope
          };
        } else {
          type_forme = 'Line';
          const latLngs = layer.getLatLngs() as L.LatLng[];
          data = {
            points: latLngs.map(ll => [ll.lng, ll.lat]),
            name: (layer as any).properties?.name || '', // Assurer que le nom est inclus
            style: commonStyle
          };
        }
      } else if (layer instanceof L.Polygon && !(layer instanceof L.Rectangle)) {
        type_forme = 'Polygon';
        const latLngs = (layer.getLatLngs()[0] as L.LatLng[]);
        data = {
          points: latLngs.map(ll => [ll.lng, ll.lat]),
          name: (layer as any).properties?.name || '', // Assurer que le nom est inclus
          style: commonStyle
        };
      }

      if (type_forme && data) {
        let elementId: number | undefined = (layer as any)._elementId;
        if ((layer as any)._dbId) {
          elementId = (layer as any)._dbId;
          if (typeof elementId === 'number') {
            currentLayerIds.add(elementId);
          }
        }
        elements.push({
          id: elementId,
          type_forme,
          data
        });
      }
    });

    // Log pour le debug
    console.log('[savePlan] Éléments à sauvegarder', {
      totalElements: elements.length,
      elements: elements.map(el => ({
        type: el.type_forme,
        hasPoints: 'points' in el.data,
        hasStyle: 'style' in el.data
      }))
    });

    // Identifier les éléments supprimés
    const elementsToDelete = Array.from(existingIds).filter(id => !currentLayerIds.has(id));

    drawingStore.elements = elements;
    // Passer les éléments à supprimer au store
    const updatedPlan = await drawingStore.saveToPlan(currentPlan.value.id, { elementsToDelete });

    // Mettre à jour le plan courant avec les nouvelles données
    if (updatedPlan && currentPlan.value?.id) {
      const planId = currentPlan.value.id;
      currentPlan.value = {
        ...currentPlan.value,
        ...updatedPlan
      };
      irrigationStore.updatePlanDetails(planId, updatedPlan);
    }

    saveStatus.value = 'success';
    setTimeout(() => {
      saveStatus.value = null;
    }, 3000);
  } catch (error) {
    console.error('Erreur lors de la sauvegarde du plan:', error);
    saveStatus.value = null;
  } finally {
    saving.value = false;
  }
}
// Nettoyer lors du démontage du composant
onUnmounted(() => {
  // Si l'utilisateur n'est plus connecté
  if (!authStore.user) {
    clearLastPlan();
  }
  irrigationStore.clearCurrentPlan();
  drawingStore.clearCurrentPlan();

  // Nettoyer l'écouteur d'événements de note:edit
  if (featureGroup.value) {
    featureGroup.value.off('note:edit');
  }

  // Nettoyer l'écouteur d'événements global
  window.removeEventListener('geonote:edit', (() => {}) as EventListener);
});
// Fonction pour mettre à jour les propriétés d'une forme
function updateShapeProperties(properties: any) {
  updatePropertiesFromDestruct(properties);
}
// Fonction pour formater la date de dernière sauvegarde
function formatLastSaved(date: string): string {
  try {
    // Créer un objet Date à partir de la chaîne ISO
    const dateObj = new Date(date);
    // Vérifier si la date est valide
    if (isNaN(dateObj.getTime())) {
      console.error('Date invalide reçue:', date);
      return 'Date invalide';
    }
    // Formater la date en utilisant l'API Intl avec la timezone de Paris
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Paris'
    }).format(dateObj);
  } catch (error) {
    console.error('Erreur lors du formatage de la date:', error);
    return 'Date invalide';
  }
}
// Handlers pour les intégrations avec MapToolbar
const handleAdjustView = () => {
  if (featureGroup.value) {
    adjustView();
  }
};
// La méthode generateSynthesis est déjà définie plus bas dans le composant et sera utilisée par MapToolbar
// via l'événement @generate-summary="generateSynthesis"
// Fonction pour supprimer la forme sélectionnée
const deleteSelectedShape = () => {
  if (selectedLeafletShape.value && featureGroup.value) {
    setDrawingTool('');  // Ceci va nettoyer les points de contrôle
    featureGroup.value.removeLayer(selectedLeafletShape.value as L.Layer);
    selectedLeafletShape.value = null;
  }
};
// Ajouter la fonction de callback
async function onPlanCreated(planId: number) {
  console.log(`onPlanCreated - Tentative de chargement du plan ${planId}`);
  // Actualiser la liste des plans pour s'assurer que le nouveau plan est bien présent
  await irrigationStore.fetchPlans();
  const plan = irrigationStore.getPlanById(planId);
  if (plan) {
    console.log(`Plan ${planId} trouvé, chargement en cours...`);
    // Mettre à jour l'ID du dernier plan consulté dans localStorage
    localStorage.setItem('lastPlanId', planId.toString());
    currentPlan.value = plan;
    irrigationStore.setCurrentPlan(plan);
    drawingStore.setCurrentPlan(plan.id);
    showNewPlanModal.value = false;
    // Invalider la taille de la carte après le chargement
    invalidateMapSize();
    console.log(`Plan ${planId} chargé avec succès`);
  } else {
    console.error(`Plan ${planId} introuvable après création! Vérifiez les permissions.`);
  }
}
// Ajouter un watcher pour charger les clients quand un salarie est sélectionné
watch(selectedSalarie, async (newSalarie) => {
  if (newSalarie && authStore.user?.user_type === 'admin') {
    isLoadingClients.value = true;
    try {
      const result = await authStore.fetchSalarieVisiteurs(newSalarie.id);
      salarieVisiteurs.value = (Array.isArray(result) ? result : [result]) as ExtendedUserDetails[];
    } catch (error) {
      console.error('[MapView][watch selectedSalarie] Error:', error);
      salarieVisiteurs.value = [];
    } finally {
      isLoadingClients.value = false;
    }
  }
});
// Ajouter une fonction pour nettoyer le localStorage lors de la déconnexion
function clearLastPlan() {
  localStorage.removeItem('lastPlanId');
}
// Fonction pour formater les mesures
function formatMeasure(value: number, unit: string = 'm'): string {
  if (unit === 'm²') {
    return `${(value / 10000).toFixed(2)} ha`;
  } else if (unit === 'm') {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(2)} km`;
    }
    return `${value.toFixed(2)} m`;
  }
  return `${value.toFixed(2)} ${unit}`;
}
// Fonction pour générer la synthèse
const isGeneratingSynthesis = ref(false);
// Fonction pour traduire le type de forme en français
function getShapeTypeFr(type: string): string {
  const types: { [key: string]: string } = {
    'Circle': 'Cercle',
    'Rectangle': 'Rectangle',
    'Semicircle': 'Demi-cercle',
    'Line': 'Ligne',
    'Polygon': 'Polygone',
    'TextRectangle': 'Annotation',
    'ElevationLine': 'Profil altimétrique'
  };
  return types[type] || type;
}
async function generateSynthesis() {
  if (!currentPlan.value || !map.value || !featureGroup.value) {
    console.error('[generateSynthesis] Plan, map ou featureGroup manquant');
    return;
  }
  const plan = currentPlan.value; // Store in local variable to maintain type narrowing
  try {
    // Définition des constantes pour les dimensions des logos dès le début de la fonction
    const pageWidth = 297; // A4 landscape width in mm
    const pageHeight = 210; // A4 landscape height in mm
    const centerX = pageWidth / 2;

    // Dimensions des logos sur la page de garde
    const logoSize = 40; // Reduced from 60
    const logoSpacing = 30; // Increased from 20 for better separation

    // Dimensions des logos miniatures pour les autres pages
    const miniLogoSize = 15;
    const miniLogoSpacing = 5;
    const headerHeight = 25;

    // Sauvegarder automatiquement le plan avant de générer la synthèse
    console.log('[generateSynthesis] Début de la génération');
    console.log('[generateSynthesis] Plan courant complet:', plan);

    await savePlan();

    // Vérifier si les détails sont présents, sinon tenter de les récupérer explicitement
    let planToUse = plan;
    if (!plan.salarie_details && !plan.entreprise_details && !plan.client_details) {
      console.log('[generateSynthesis] Détails manquants, tentative de récupération...');
      try {
        const response = await api.get(`/plans/${plan.id}/`);
        if (response.status === 200) {
          console.log('[generateSynthesis] Plan mis à jour:', response.data);

          // Mettre à jour le plan courant avec les détails complets
          currentPlan.value = {
            ...plan,
            ...response.data
          };

          // Utiliser les données mises à jour
          planToUse = response.data;

          // Mettre à jour le plan dans le store
          irrigationStore.updatePlanDetails(plan.id, response.data);
        }
      } catch (error) {
        console.error('[generateSynthesis] Erreur lors de la récupération des détails:', error);
      }
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
    isGeneratingSynthesis.value = true;

    // Utiliser les détails du plan mis à jour
    const salarieDetails = planToUse.salarie_details as ExtendedUserDetails | undefined;
    const clientDetails = planToUse.client_details as ExtendedUserDetails | undefined;
    const entrepriseDetails = (salarieDetails?.entreprise_details || planToUse.entreprise_details) as ExtendedUserDetails | undefined;

    console.log('[generateSynthesis] Détails du plan utilisé:', planToUse);

    console.log('[generateSynthesis] Détails des utilisateurs:', {
      salarie: salarieDetails ? {
        id: salarieDetails.id,
        nom: `${salarieDetails.first_name} ${salarieDetails.last_name}`,
        company: salarieDetails.company_name,
        logo: salarieDetails.logo
      } : null,
      entreprise: entrepriseDetails ? {
        id: entrepriseDetails.id,
        nom: `${entrepriseDetails.first_name} ${entrepriseDetails.last_name}`,
        company: entrepriseDetails.company_name,
        logo: entrepriseDetails.logo
      } : null,
      client: clientDetails ? {
        id: clientDetails.id,
        nom: `${clientDetails.first_name} ${clientDetails.last_name}`,
        company: clientDetails.company_name
      } : null
    });

    // Désélectionner toute forme active
    if (selectedLeafletShape.value) {
      clearActiveControlPoints();
      selectedLeafletShape.value = null;
    }

    // Créer le PDF en mode paysage
    const pdf = new jsPDF('l', 'mm', 'a4');

    // Page de garde
    // Charger le logo de l'application
    console.log('[generateSynthesis] Chargement du logo de l\'application');
    const logoImg = new Image();
    logoImg.src = logo;
    await new Promise<void>((resolve) => {
      logoImg.onload = () => {
        console.log('[generateSynthesis] Logo application chargé');
        resolve();
      };
      logoImg.onerror = (error) => {
        console.error('[generateSynthesis] Erreur chargement logo application:', error);
        resolve();
      };
    });

    // Charger le logo de l'entreprise si disponible
    console.log('[generateSynthesis] Tentative de chargement du logo entreprise:', entrepriseDetails?.logo);
    let entrepriseLogoImg: HTMLImageElement | null = null;
    if (entrepriseDetails?.logo) {
      entrepriseLogoImg = new Image();
      entrepriseLogoImg.src = entrepriseDetails.logo;
      await new Promise<void>((resolve) => {
        if (entrepriseLogoImg) {
          entrepriseLogoImg.onload = () => {
            console.log('[generateSynthesis] Logo entreprise chargé avec succès');
            resolve();
          };
          entrepriseLogoImg.onerror = (error) => {
            console.error('[generateSynthesis] Erreur chargement logo entreprise:', error);
            resolve();
          };
        } else {
          resolve();
        }
      });
    }

    // Charger le logo du salarie si disponible
    console.log('[generateSynthesis] Tentative de chargement du logo salarie:', salarieDetails?.logo);
    let salarieLogoImg: HTMLImageElement | null = null;
    if (salarieDetails?.logo) {
      salarieLogoImg = new Image();
      salarieLogoImg.src = salarieDetails.logo;
      await new Promise<void>((resolve) => {
        if (salarieLogoImg) {
          salarieLogoImg.onload = () => {
            console.log('[generateSynthesis] Logo salarie chargé avec succès');
            resolve();
          };
          salarieLogoImg.onerror = (error) => {
            console.error('[generateSynthesis] Erreur chargement logo salarie:', error);
            resolve();
          };
        } else {
          resolve();
        }
      });
    }

    console.log('[generateSynthesis] Ajout des logos au PDF:', {
      logoApplication: true,
      logoEntreprise: entrepriseLogoImg !== null,
      logoSalarie: salarieLogoImg !== null
    });

    // Positions précises des logos avec espacement uniforme
    // Nouvelle disposition des logos (entreprise - application - salarie)
    // Logo de l'entreprise à gauche
    if (entrepriseLogoImg !== null) {
      pdf.addImage(entrepriseLogoImg, 'JPEG', centerX - logoSize - logoSpacing, 20, logoSize, logoSize);
    }

    // Logo central (application)
    pdf.addImage(logoImg, 'JPEG', centerX - (logoSize / 2), 20, logoSize, logoSize);

    // Logo du salarie à droite
    if (salarieLogoImg !== null) {
      pdf.addImage(salarieLogoImg, 'JPEG', centerX + logoSpacing, 20, logoSize, logoSize);
    }

    // Titre du plan
    pdf.setFontSize(24);
    pdf.setTextColor(0);
    pdf.text(plan.nom || 'Sans titre', pageWidth / 2, 100, { align: 'center' });

    // Informations du plan
    let yPos = 120;

    // Informations de l'entreprise si disponible
    if (entrepriseDetails) {
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Entreprise:', 20, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${entrepriseDetails.first_name} ${entrepriseDetails.last_name}${entrepriseDetails.company_name ? ` (${entrepriseDetails.company_name})` : ''}`, 20, yPos + 6);
      yPos += 15; // Reduced from 25
    }

    // Informations du salarie
    if (salarieDetails) {
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Salarie:', 20, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${salarieDetails.first_name} ${salarieDetails.last_name}${salarieDetails.company_name ? ` (${salarieDetails.company_name})` : ''}`, 20, yPos + 6);
      yPos += 15; // Reduced from 25
    }

    // Informations du client
    if (clientDetails) {
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Client:', 20, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${clientDetails.first_name} ${clientDetails.last_name}${clientDetails.company_name ? ` (${clientDetails.company_name})` : ''}`, 20, yPos + 6);
      yPos += 15; // Reduced from 25
    }

    // Description
    if (plan.description) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('Description:', 20, yPos);
      pdf.setFont('helvetica', 'normal');
      const splitDescription = pdf.splitTextToSize(plan.description, 150);
      pdf.text(splitDescription, 20, yPos + 6);
      yPos += 8 * splitDescription.length + 10; // Reduced spacing
    }

    // Ensure yPos doesn't go beyond page height - 30 for dates
    yPos = Math.min(yPos, pageHeight - 30);

    // Dates en bas de page
    pdf.setFontSize(10);
    pdf.setTextColor(100);
    pdf.text(`Date de création: ${formatLastSaved(plan.date_creation)}`, 20, pageHeight - 20);
    pdf.text(`Dernière modification: ${formatLastSaved(plan.date_modification)}`, pageWidth - 20, pageHeight - 20, { align: 'right' });

    // Récupérer les formes
    const layers: L.Layer[] = [];
    featureGroup.value.eachLayer((layer: L.Layer) => layers.push(layer));

    // Initialiser le screenshoter avec des options améliorées
    const screenshoter = L.simpleMapScreenshoter({
      hideElementsWithSelectors: [
        '.leaflet-control-container',
        '.leaflet-pm-toolbar',
        '.leaflet-grid-layer',
        '.leaflet-grid-label'
      ],
      preventDownload: true
    }).addTo(map.value as L.Map);

    // Attendre que la carte soit chargée avant la capture
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Pour chaque forme, créer une nouvelle page
    for (let i = 0; i < layers.length; i++) {
      pdf.addPage();

      // En-tête réduit avec disposition précise des logos miniatures
      // Fond de l'en-tête
      pdf.setFillColor(248, 250, 252);
      pdf.setDrawColor(226, 232, 240);
      pdf.rect(0, 0, pageWidth, headerHeight, 'F');

      // Titre du plan en petit
      pdf.setFontSize(10);
      pdf.setTextColor(50, 50, 50);
      pdf.setFont('helvetica', 'bold');
      pdf.text(plan.nom || 'Sans titre', 20, 12);

      // Logos miniatures avec espacement constant
      const rightMargin = 20;
      const miniLogosStartX = pageWidth - rightMargin - (
        miniLogoSize * (1 + (entrepriseLogoImg !== null ? 1 : 0) + (salarieLogoImg !== null ? 1 : 0)) +
        miniLogoSpacing * (1 + (entrepriseLogoImg !== null ? 1 : 0))
      );

      let currentX = miniLogosStartX;

      // Logo de l'entreprise
      if (entrepriseLogoImg !== null) {
        pdf.addImage(entrepriseLogoImg, 'JPEG', currentX, 5, miniLogoSize, miniLogoSize);
        currentX += miniLogoSize + miniLogoSpacing;
      }

      // Logo de l'application
      pdf.addImage(logoImg, 'JPEG', currentX, 5, miniLogoSize, miniLogoSize);
      currentX += miniLogoSize + miniLogoSpacing;

      // Logo du salarie
      if (salarieLogoImg !== null) {
        pdf.addImage(salarieLogoImg, 'JPEG', currentX, 5, miniLogoSize, miniLogoSize);
      }

      // Bordure fine en bas de l'en-tête
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.5);
      pdf.line(0, headerHeight, pageWidth, headerHeight);

      const layer = layers[i];
      const properties = (layer as any).properties;

      // Titre de la forme sous l'en-tête
      if (properties) {
        pdf.setTextColor(0);
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        // Utiliser le nom personnalisé s'il existe, sinon le type de forme
        const shapeTitle = properties.name || getShapeTypeFr(properties.type);

        // Calculer la surface d'irrigation pour cette forme seulement si ce n'est pas un TextRectangle
        let areaText = '';
        if (properties.type !== 'TextRectangle') {
          const irrigationArea = calculateConnectedCoverageArea(layers, layer);
          areaText = irrigationArea > 0 ? ` (surface totale d'irrigation : ${formatMeasure(irrigationArea, 'm²')})` : '';
        }

        // Combiner le titre et la surface
        const fullTitle = `${shapeTitle}${areaText}`;
        pdf.text(fullTitle, 20, headerHeight + 10);
      }

      // Layout spécial pour le profil altimétrique
      if (properties && properties.type === 'ElevationLine') {
        try {
          // Ajuster la vue
          const bounds = (layer as any).getBounds?.() || (layer as any).getLatLng?.();
          if (bounds) {
            map.value.fitBounds(bounds instanceof L.LatLng ? L.latLngBounds([bounds]) : bounds, {
              padding: [50, 50]
            });
          }

          // Ajouter la gestion standard pour les autres types de formes
          // Ajuster la vue avec sécurité
          try {
            const bounds = (layer as any).getBounds?.() || (layer as any).getLatLng?.();
            if (!bounds || !map.value) {
              console.warn('[generateSynthesis] Bounds ou carte invalide');
            } else {
              const validBounds = bounds instanceof L.LatLng ? L.latLngBounds([bounds]) : bounds;
              if (validBounds && validBounds.isValid && validBounds.isValid()) {
                // Vérifier que la carte est toujours valide
                if (map.value.getContainer() && document.body.contains(map.value.getContainer())) {
                  map.value.fitBounds(validBounds, {
                    padding: [50, 50],
                    animate: false // Désactiver l'animation pour éviter les erreurs
                  });
                }
              }
            }
          } catch (error) {
            console.warn('[generateSynthesis] Erreur lors de l\'ajustement de la vue:', error);
          }
          // Attendre que la carte soit complètement chargée
          await new Promise(resolve => setTimeout(resolve, 2000));
          // Forcer un rafraîchissement de la carte
          map.value.invalidateSize();

          // Forcer un rafraîchissement de la carte avec vérification
          try {
            if (map.value && map.value.getContainer() && document.body.contains(map.value.getContainer())) {
              map.value.invalidateSize({ animate: false });
            } else {
              console.warn('[generateSynthesis] Carte non valide pour l\'invalidation de taille');
            }
          } catch (error) {
            console.warn('[generateSynthesis] Erreur lors de l\'invalidation de la taille de la carte:', error);
          }
          // Attendre que toutes les tuiles soient chargées
          await new Promise<void>((resolve) => {
            const checkTiles = () => {
              const container = map.value?.getContainer();
              if (!container) {
                resolve();
                return;
              }
              const tiles = container.querySelectorAll('.leaflet-tile-loaded');
              const loading = container.querySelectorAll('.leaflet-tile-loading');
              if (loading.length === 0 && tiles.length > 0) {
                resolve();
              } else {
                setTimeout(checkTiles, 100);
              }
            };
            checkTiles();
          });

          // Capturer la carte
          const dataUrl = await screenshoter.takeScreen('image');
          const mapImage = await new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = (error) => reject(error);
            img.src = dataUrl as unknown as string;
          });

          // Définir les dimensions pour le layout avec graphique et carte côte à côte
          // Position Y après l'en-tête
          const contentY = headerHeight + 15;

          // Largeur de chaque colonne (carte et graphique)
          const colWidth = (pageWidth - 60) / 2; // 30px de marge de chaque côté, 2 colonnes

          // Calculer les dimensions proportionnelles pour la carte
          const imgHeight = Math.min(70, (mapImage.height * colWidth) / mapImage.width);

          // Ajouter l'image de la carte (colonne de gauche)
          pdf.addImage(mapImage, 'PNG', 20, contentY, colWidth, imgHeight);

          // Créer le graphique du profil à droite
          if (properties.elevationData && properties.elevationData.length > 0) {
            // Créer un canvas temporaire pour le graphique
            const canvas = document.createElement('canvas');
            canvas.width = 800; // Taille suffisante pour une bonne résolution
            canvas.height = 400;
            const ctx = canvas.getContext('2d');

            if (ctx) {
              // Extraire les données
              const data = properties.elevationData;
              const minElevation = properties.minElevation;
              const maxElevation = properties.maxElevation;
              const elevationRange = maxElevation - minElevation;

              // Ajouter une marge de 5%
              const margin = elevationRange * 0.05;
              const yMin = minElevation - margin;
              const yMax = maxElevation + margin;

              // Dimensions utiles du canvas
              const padding = 40;
              const width = canvas.width - 2 * padding;
              const height = canvas.height - 2 * padding;

              // Fonctions de conversion
              const scaleX = (distance: number) => padding + (distance / data[data.length - 1].distance) * width;
              const scaleY = (elevation: number) => padding + height - ((elevation - yMin) / (yMax - yMin)) * height;

              // Dessiner le fond
              ctx.fillStyle = '#f8fafc';
              ctx.fillRect(0, 0, canvas.width, canvas.height);

              // Titre du graphique
              ctx.fillStyle = '#334155';
              ctx.font = 'bold 20px Arial';
              ctx.textAlign = 'center';
              ctx.fillText('Profil altimétrique', canvas.width / 2, 25);

              // Dessiner la grille
              ctx.strokeStyle = '#e2e8f0';
              ctx.lineWidth = 1;

              // Dessiner les axes
              ctx.beginPath();
              ctx.moveTo(padding, padding);
              ctx.lineTo(padding, height + padding);
              ctx.lineTo(width + padding, height + padding);
              ctx.strokeStyle = '#94a3b8';
              ctx.stroke();

              // Graduations Y (altitude)
              const numYTicks = 5;
              for (let i = 0; i <= numYTicks; i++) {
                const elevation = yMin + (i / numYTicks) * (yMax - yMin);
                const y = scaleY(elevation);

                // Ligne de grille horizontale
                ctx.beginPath();
                ctx.strokeStyle = '#e2e8f0';
                ctx.moveTo(padding, y);
                ctx.lineTo(width + padding, y);
                ctx.stroke();

                // Graduation et label
                ctx.beginPath();
                ctx.strokeStyle = '#94a3b8';
                ctx.moveTo(padding - 5, y);
                ctx.lineTo(padding, y);
                ctx.stroke();

                ctx.fillStyle = '#64748b';
                ctx.font = '12px Arial';
                ctx.textAlign = 'right';
                ctx.fillText(`${Math.round(elevation)}m`, padding - 8, y + 4);
              }

              // Graduations X (distance)
              const numXTicks = 5;
              const maxDistance = data[data.length - 1].distance;
              for (let i = 0; i <= numXTicks; i++) {
                const distance = (i / numXTicks) * maxDistance;
                const x = scaleX(distance);

                // Ligne de grille verticale
                ctx.beginPath();
                ctx.strokeStyle = '#e2e8f0';
                ctx.moveTo(x, padding);
                ctx.lineTo(x, height + padding);
                ctx.stroke();

                // Graduation et label
                ctx.beginPath();
                ctx.strokeStyle = '#94a3b8';
                ctx.moveTo(x, height + padding);
                ctx.lineTo(x, height + padding + 5);
                ctx.stroke();

                ctx.fillStyle = '#64748b';
                ctx.font = '12px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(`${Math.round(distance)}m`, x, height + padding + 16);
              }

              // Dessiner la courbe avec un dégradé
              const gradient = ctx.createLinearGradient(0, padding, 0, height + padding);
              gradient.addColorStop(0, 'rgba(255, 69, 0, 0.8)');  // Orange plus foncé en haut
              gradient.addColorStop(1, 'rgba(255, 69, 0, 0.2)');  // Orange plus clair en bas

              // Dessiner la courbe
              ctx.beginPath();
              ctx.moveTo(scaleX(data[0].distance), scaleY(data[0].elevation));
              data.forEach((point: any, i: number) => {
                if (i > 0) {
                  ctx.lineTo(scaleX(point.distance), scaleY(point.elevation));
                }
              });

              // Tracer la courbe
              ctx.strokeStyle = '#FF4500';
              ctx.lineWidth = 2;
              ctx.stroke();

              // Remplir sous la courbe
              ctx.lineTo(scaleX(data[data.length - 1].distance), scaleY(yMin));
              ctx.lineTo(scaleX(data[0].distance), scaleY(yMin));
              ctx.closePath();
              ctx.fillStyle = gradient;
              ctx.fill();

              // Ajouter les points d'échantillonnage
              data.forEach((point: any) => {
                ctx.beginPath();
                ctx.arc(scaleX(point.distance), scaleY(point.elevation), 3, 0, Math.PI * 2);
                ctx.fillStyle = '#FF4500';
                ctx.fill();
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 1;
                ctx.stroke();
              });

              // Mettre en évidence les points min et max
              // Trouver les indices des points min et max
              let minIndex = 0;
              let maxIndex = 0;
              for (let i = 0; i < data.length; i++) {
                if (data[i].elevation === minElevation) minIndex = i;
                if (data[i].elevation === maxElevation) maxIndex = i;
              }

              // Point max (vert)
              ctx.beginPath();
              ctx.arc(
                scaleX(data[maxIndex].distance),
                scaleY(data[maxIndex].elevation),
                6, 0, Math.PI * 2
              );
              ctx.fillStyle = '#059669'; // Vert
              ctx.fill();
              ctx.strokeStyle = 'white';
              ctx.lineWidth = 2;
              ctx.stroke();

              // Point min (rouge)
              ctx.beginPath();
              ctx.arc(
                scaleX(data[minIndex].distance),
                scaleY(data[minIndex].elevation),
                6, 0, Math.PI * 2
              );
              ctx.fillStyle = '#DC2626'; // Rouge
              ctx.fill();
              ctx.strokeStyle = 'white';
              ctx.lineWidth = 2;
              ctx.stroke();

              // Ajouter une légende
              ctx.font = '12px Arial';
              ctx.fillStyle = '#059669';
              ctx.textAlign = 'left';
              ctx.fillText(`Point haut: ${formatMeasure(maxElevation, 'm')}`, padding, height + padding + 35);

              ctx.fillStyle = '#DC2626';
              ctx.fillText(`Point bas: ${formatMeasure(minElevation, 'm')}`, padding + 200, height + padding + 35);

              // Convertir le canvas en image pour le PDF
              const graphDataUrl = canvas.toDataURL('image/png');

              // Ajouter le graphique au PDF à côté de la carte
              pdf.addImage(
                graphDataUrl,
                'PNG',
                20 + colWidth + 20, // 20px après la première colonne, et 20px de marge entre les colonnes
                contentY,
                colWidth,
                imgHeight
              );
            }
          }

          // Ajouter un tableau des propriétés sous les deux colonnes
          const propStartY = contentY + imgHeight + 15; // Réduit de 20 à 15

          // Dessiner un fond pour le tableau des propriétés (hauteur réduite)
          pdf.setFillColor(248, 250, 252); // Couleur très légère
          pdf.setDrawColor(226, 232, 240); // Bordure légère
          pdf.roundedRect(20, propStartY, pageWidth - 40, 50, 3, 3, 'FD'); // Réduit de 55 à 50

          // Titre du tableau (position ajustée)
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(12);
          pdf.setTextColor(51, 65, 85); // Gris foncé
          pdf.text('Caractéristiques', 20 + 10, propStartY + 10);

          // Organiser les propriétés en deux colonnes
          const propCol1 = [
            { label: 'Distance totale', value: formatMeasure(properties.length || 0) },
            { label: 'Dénivelé positif', value: formatMeasure(properties.elevationGain || 0, 'm') },
            { label: 'Dénivelé négatif', value: formatMeasure(properties.elevationLoss || 0, 'm') }
          ];

          const propCol2 = [
            { label: 'Pente moyenne', value: `${(properties.averageSlope || 0).toFixed(1)}%` },
            { label: 'Pente maximale', value: `${(properties.maxSlope || 0).toFixed(1)}%` },
            { label: 'Altitude min/max', value: `${formatMeasure(properties.minElevation || 0, 'm')} / ${formatMeasure(properties.maxElevation || 0, 'm')}` }
          ];

          // Dessiner la première colonne de propriétés (espacement réduit)
          let propY = propStartY + 20;
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(10);

          propCol1.forEach(prop => {
            pdf.setTextColor(100, 116, 139); // Gris moyen pour le label
            pdf.text(prop.label, 20 + 10, propY);

            pdf.setTextColor(15, 23, 42); // Gris très foncé pour la valeur
            pdf.setFont('helvetica', 'bold');
            pdf.text(prop.value, 20 + 10 + 80, propY);
            pdf.setFont('helvetica', 'normal');

            propY += 9; // Réduit de 10 à 9
          });

          // Dessiner la deuxième colonne de propriétés (espacement réduit)
          propY = propStartY + 20;
          const col2X = pageWidth / 2;

          propCol2.forEach(prop => {
            pdf.setTextColor(100, 116, 139);
            pdf.text(prop.label, col2X, propY);

            pdf.setTextColor(15, 23, 42);
            pdf.setFont('helvetica', 'bold');
            pdf.text(prop.value, col2X + 80, propY);
            pdf.setFont('helvetica', 'normal');

            propY += 9; // Réduit de 10 à 9
          });

        } catch (error) {
          console.error(`[generateSynthesis] Erreur traitement profil altimétrique:`, error);
        }
      } else {
        // Ajouter la gestion standard pour les autres types de formes
        // Ajuster la vue
        const bounds = (layer as any).getBounds?.() || (layer as any).getLatLng?.();
        if (bounds) {
          map.value.fitBounds(bounds instanceof L.LatLng ? L.latLngBounds([bounds]) : bounds, {
            padding: [50, 50]
          });
        }

        // Ajouter la gestion standard pour les autres types de formes
        // Ajuster la vue avec sécurité
        try {
          const bounds = (layer as any).getBounds?.() || (layer as any).getLatLng?.();
          if (!bounds || !map.value) {
            console.warn('[generateSynthesis] Bounds ou carte invalide');
          } else {
            const validBounds = bounds instanceof L.LatLng ? L.latLngBounds([bounds]) : bounds;
            if (validBounds && validBounds.isValid && validBounds.isValid()) {
              // Vérifier que la carte est toujours valide
              if (map.value.getContainer() && document.body.contains(map.value.getContainer())) {
                map.value.fitBounds(validBounds, {
                  padding: [50, 50],
                  animate: false // Désactiver l'animation pour éviter les erreurs
                });
              }
            }
          }
        } catch (error) {
          console.warn('[generateSynthesis] Erreur lors de l\'ajustement de la vue:', error);
        }
        // Attendre que la carte soit complètement chargée
        await new Promise(resolve => setTimeout(resolve, 2000));
        // Forcer un rafraîchissement de la carte
        map.value.invalidateSize();
        // Attendre que toutes les tuiles soient chargées
        await new Promise<void>((resolve) => {
          const checkTiles = () => {
            const container = map.value?.getContainer();
            if (!container) {
              resolve();
              return;
            }
            const tiles = container.querySelectorAll('.leaflet-tile-loaded');
            const loading = container.querySelectorAll('.leaflet-tile-loading');
            if (loading.length === 0 && tiles.length > 0) {
              resolve();
            } else {
              setTimeout(checkTiles, 100);
            }
          };
          checkTiles();
        });
        try {
          // Capturer la carte
          const dataUrl = await screenshoter.takeScreen('image');
          const mapImage = await new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = (error) => reject(error);
            img.src = dataUrl as unknown as string;
          });

          // Position Y après l'en-tête et le titre de la forme
          const contentY = headerHeight + 20;

          // Calculer les dimensions pour 60% de la largeur
          const imgWidth = pageWidth * 0.6 - 30;
          let imgHeight = (mapImage.height * imgWidth) / mapImage.width;
          if (imgHeight > pageHeight * 0.9) {
            imgHeight = pageHeight * 0.9;
          }

          pdf.addImage(mapImage, 'PNG', 20, contentY, imgWidth, imgHeight);

          // Section des propriétés à droite de l'image
          if (properties) {
            // Position à droite de l'image avec plus d'espace disponible
            const propX = pageWidth * 0.6 + 10;

            // Calculer la hauteur nécessaire en fonction du type de forme
            let numberOfProperties = 0;
            if (properties.type === 'Circle') {
              numberOfProperties = 4; // Rayon, Diamètre, Surface, Périmètre
            } else if (properties.type === 'Rectangle') {
              numberOfProperties = 4; // Largeur, Hauteur, Surface, Périmètre
            } else if (properties.type === 'Line') {
              numberOfProperties = 1; // Longueur
              if (properties.dimensions?.width) numberOfProperties++;
              if (properties.surfaceInfluence) numberOfProperties++;
            } else if (properties.type === 'Semicircle') {
              numberOfProperties = 6; // Rayon, Diamètre, Surface, Périmètre, Longueur d'arc, Angle d'ouverture
            } else if (properties.type === 'Polygon') {
              numberOfProperties = 2; // Surface, Périmètre
            } else if (properties.type === 'CircleWithSections') {
              numberOfProperties = 3; // Rayon, Surface totale, Périmètre
              // Ajouter de l'espace supplémentaire pour le tableau des sections
              if (properties.sections && properties.sections.length > 0) {
                const rowsNeeded = Math.ceil(properties.sections.length / 3); // 3 sections par ligne
                numberOfProperties += rowsNeeded * 3; // Chaque ligne prend environ 3 propriétés d'espace
              }
            }

            // Calculer la hauteur minimale nécessaire (15px pour le titre + 12px par propriété + marges)
            const propHeight = Math.max(15 + (numberOfProperties * 12) + 30, 60);

            // Dessiner un fond pour le tableau des propriétés, ajusté pour le nouvel espace
            const propWidth = pageWidth - propX - 20;
            pdf.setFillColor(248, 250, 252);
            pdf.setDrawColor(226, 232, 240);
            pdf.roundedRect(propX, contentY, propWidth, propHeight, 3, 3, 'FD');

            // Titre du tableau
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(12);
            pdf.setTextColor(51, 65, 85);
            pdf.text('Caractéristiques', propX + 10, contentY + 15);

            // Initialiser la position Y pour les propriétés
            let propY = contentY + 30;
            pdf.setFontSize(10);

            // Ajouter les propriétés selon le type de forme
            if (properties.type === 'Circle') {
              // Propriétés du cercle
              addProperty('Rayon', formatMeasure(properties.radius), propX, propY, propWidth);
              propY += 12;
              addProperty('Diamètre', formatMeasure(properties.radius * 2), propX, propY, propWidth);
              propY += 12;
              addProperty('Surface', formatMeasure(properties.surface, 'm²'), propX, propY, propWidth);
              propY += 12;
              addProperty('Périmètre', formatMeasure(properties.perimeter), propX, propY, propWidth);
            }
            else if (properties.type === 'Rectangle') {
              // Propriétés du rectangle
              addProperty('Largeur', formatMeasure(properties.width), propX, propY, propWidth);
              propY += 12;
              addProperty('Hauteur', formatMeasure(properties.height), propX, propY, propWidth);
              propY += 12;
              addProperty('Surface', formatMeasure(properties.surface, 'm²'), propX, propY, propWidth);
              propY += 12;
              addProperty('Périmètre', formatMeasure(properties.perimeter), propX, propY, propWidth);
            }
            else if (properties.type === 'Line') {
              // Propriétés de la ligne
              addProperty('Longueur', formatMeasure(properties.length), propX, propY, propWidth);
              propY += 12;

              if (properties.dimensions?.width) {
                addProperty('Largeur d\'influence', formatMeasure(properties.dimensions.width), propX, propY, propWidth);
                propY += 12;
              }

              if (properties.surfaceInfluence) {
                addProperty('Surface d\'influence', formatMeasure(properties.surfaceInfluence, 'm²'), propX, propY, propWidth);
              }
            }
            else if (properties.type === 'Semicircle') {
              // Propriétés du demi-cercle
              addProperty('Rayon', formatMeasure(properties.radius), propX, propY, propWidth);
              propY += 12;
              addProperty('Diamètre', formatMeasure(properties.radius * 2), propX, propY, propWidth);
              propY += 12;
              addProperty('Surface', formatMeasure(properties.surface, 'm²'), propX, propY, propWidth);
              propY += 12;
              addProperty('Périmètre', formatMeasure(properties.perimeter), propX, propY, propWidth);
              propY += 12;
              addProperty('Longueur d\'arc', formatMeasure(properties.arcLength), propX, propY, propWidth);
              propY += 12;
              addProperty('Angle d\'ouverture', `${properties.openingAngle.toFixed(1)}°`, propX, propY, propWidth);
            }
            else if (properties.type === 'Polygon') {
              // Propriétés du polygone
              addProperty('Surface', formatMeasure(properties.surface, 'm²'), propX, propY, propWidth);
              propY += 12;
              addProperty('Périmètre', formatMeasure(properties.perimeter), propX, propY, propWidth);
            }
            else if (properties.type === 'CircleWithSections') {
              // Calculer la hauteur nécessaire pour les propriétés générales
              const baseHeight = 60;

              // Propriétés générales du cercle
              addProperty('Rayon', formatMeasure(properties.radius), propX, propY, propWidth);
              propY += 12;
              addProperty('Surface totale', formatMeasure(properties.surface, 'm²'), propX, propY, propWidth);
              propY += 12;
              addProperty('Périmètre', formatMeasure(properties.perimeter), propX, propY, propWidth);
              propY += 20;

              // Ajouter le tableau détaillé des sections
              if (properties.sections && properties.sections.length > 0) {
                propY = formatSectionsForPDF(properties.sections, pdf, propX, propY, propWidth);
              }
            }

            // Fonction helper pour ajouter une propriété
            function addProperty(label: string, value: string, x: number, y: number, width: number) {
              pdf.setTextColor(100, 116, 139);
              pdf.setFont('helvetica', 'normal');
              pdf.text(label, x + 10, y);

              pdf.setTextColor(15, 23, 42);
              pdf.setFont('helvetica', 'bold');
              pdf.text(value, x + width - 10, y, { align: 'right' });
            }
          }
        } catch (error) {
          console.error(`[generateSynthesis] Erreur capture forme ${i + 1}:`, error);
        }
      }
    }
    // Retirer le screenshoter
    map.value.removeControl(screenshoter);
    pdf.save(`synthese_${plan.nom}.pdf`);
  } catch (error) {
    console.error('[generateSynthesis] Erreur:', error);
    alert('Une erreur est survenue lors de la génération de la synthèse. Veuillez réessayer.');
  } finally {
    isGeneratingSynthesis.value = false;
  }
}

// Ajouter un debounce pour l'invalidation de la taille
const debouncedInvalidateMapSize = debounce(() => {
  const endMeasure = performanceMonitor.startMeasure('invalidateMapSize', 'MapView');

  if (!map.value) {
    endMeasure();
    return;
  }

  // Attendre que le DOM soit mis à jour
  nextTick(() => {
    performanceMonitor.measure('invalidateMapSize:nextTick', () => {
      try {
        // Vérifier que la carte est toujours valide
        if (map.value && map.value.getContainer() && document.body.contains(map.value.getContainer())) {
          // Invalider la taille sans animation pour éviter des problèmes
          map.value.invalidateSize({ animate: false });

          // Si des formes sont présentes, ajuster la vue de manière sécurisée
          if (featureGroup.value?.getLayers().length) {
            try {
              adjustView();
            } catch (viewError) {
              console.warn('[invalidateMapSize] Erreur lors de l\'ajustement de la vue:', viewError);
            }
          }
        } else {
          console.warn('[invalidateMapSize] Carte non valide pour l\'invalidation');
        }
      } catch (error) {
        console.warn('[invalidateMapSize] Erreur lors de l\'invalidation de la taille de la carte:', error);
      }

      endMeasure();
    }, 'MapView');
  });
}, 250); // Debounce de 250ms

function invalidateMapSize() {
  debouncedInvalidateMapSize();
}

// Optimiser le watcher de currentPlan pour l'invalidation
watch(currentPlan, (newPlan, oldPlan) => {
  if (newPlan && newPlan.id !== oldPlan?.id) {
    // Attendre que le DOM soit mis à jour après l'affichage de la carte
    nextTick(() => {
      invalidateMapSize();
    });
  }
});

// Types
interface ExtendedUserDetails extends UserDetails {
  entreprise?: number;
  entreprise_details?: ExtendedUserDetails;
  salarie_details?: ExtendedUserDetails;
  client_details?: ExtendedUserDetails;
  logo?: string;
}

interface ExtendedPlan extends Plan {
  salarie_details?: ExtendedUserDetails;
  client_details?: ExtendedUserDetails;
  entreprise_details?: ExtendedUserDetails;
}

// Ajout des refs nécessaires
const selectedEntreprise = ref<ExtendedUserDetails | null>(null);
const isLoadingEntreprises = ref(false);
const entreprises = ref<ExtendedUserDetails[]>([]);

// Computed pour les salaries filtrés selon l'entreprise sélectionnée
const filteredSalaries = computed(() => {
  console.log('[MapView][filteredSalaries] Computing with:', {
    selectedEntreprise: selectedEntreprise.value,
    salaries: salaries.value,
    salariesLength: salaries.value.length
  });
  if (!selectedEntreprise.value) return [];
  const filtered = salaries.value.filter(salarie => {
    const salarieEntreprise = (salarie as ExtendedUserDetails).entreprise;
    // Vérifier si salarieEntreprise est un objet et extraire l'ID si c'est le cas
    const salarieEntrepriseId = typeof salarieEntreprise === 'object' && salarieEntreprise !== null
      ? (salarieEntreprise as any).id
      : salarieEntreprise;

    console.log('[MapView][filteredSalaries] Checking salarie:', {
      salarie,
      salarieEntreprise,
      salarieEntrepriseId,
      selectedEntrepriseId: selectedEntreprise.value?.id,
      matches: salarieEntrepriseId === selectedEntreprise.value?.id
    });

    return salarieEntrepriseId === selectedEntreprise.value?.id;
  });
  console.log('[MapView][filteredSalaries] Filtered result:', filtered);
  return filtered;
});

// Fonction pour formater l'affichage des utilisateurs
function formatUserDisplay(user: ExtendedUserDetails | null): string {
  if (!user) return '';
  const firstName = user.first_name || '';
  const lastName = user.last_name ? user.last_name.toUpperCase() : '';
  const company = user.company_name || user.role || '';
  return `${firstName} ${lastName} (${company})`;
}

// Fonction pour charger les entreprises
async function loadEntreprises() {
  isLoadingEntreprises.value = true;
  try {
    const response = await api.get('/users/', {
      params: { role: 'ENTREPRISE' }
    });
    entreprises.value = response.data;
  } catch (error) {
    console.error('[MapView] Error loading entreprises:', error);
    entreprises.value = [];
  } finally {
    isLoadingEntreprises.value = false;
  }
}

// Fonction pour sélectionner une entreprise
async function selectEntreprise(entreprise: ExtendedUserDetails) {
  console.log('[MapView][selectEntreprise] Sélection de l\'entreprise:', entreprise);
  selectedEntreprise.value = entreprise;
  isLoadingSalaries.value = true;
  try {
    console.log('[MapView][selectEntreprise] Envoi de la requête avec params:', {
      role: 'SALARIE',
      entreprise: entreprise.id
    });
    const response = await api.get('/users/', {
      params: {
        role: 'SALARIE',
        entreprise: entreprise.id
      }
    });
    console.log('[MapView][selectEntreprise] Réponse reçue:', response.data);
    salaries.value = response.data;
    console.log('[MapView][selectEntreprise] Salaries mis à jour:', salaries.value);
  } catch (error) {
    console.error('[MapView] Error loading salaries for entreprise:', error);
    salaries.value = [];
  } finally {
    isLoadingSalaries.value = false;
  }
}

// Fonction pour revenir à la liste des entreprises
function backToEntrepriseList() {
  // Réinitialiser la sélection
  selectedEntreprise.value = null;
  selectedSalarie.value = null;
  selectedClient.value = null;

  // Réinitialiser les listes
  salaries.value = [];
  salarieVisiteurs.value = [];
  clientPlans.value = [];
}

// Fonction pour revenir à la liste des salaries
function backToSalarieList() {
  // Réinitialiser la sélection tout en gardant l'entreprise
  selectedSalarie.value = null;
  selectedClient.value = null;

  // Réinitialiser les listes enfants
  salarieVisiteurs.value = [];
  clientPlans.value = [];
}

// Fonction pour revenir à la liste des clients
function backToClientList() {
  // Réinitialiser uniquement le client sélectionné
  selectedClient.value = null;
  clientPlans.value = [];
}

// Fonction pour sélectionner un salarie
async function selectSalarie(salarie: ExtendedUserDetails) {
  console.log('\n[MapView][selectSalarie] ====== DÉBUT SÉLECTION SALARIE ======');
  console.log('Informations du salarie:', {
    id: salarie.id,
    username: salarie.username,
    company: salarie.company_name,
    role: salarie.role
  });
  console.log('Contexte utilisateur:', {
    userType: authStore.user?.user_type,
    userId: authStore.user?.id,
    userRole: authStore.user?.role,
    selectedEntrepriseId: selectedEntreprise.value?.id
  });

  selectedSalarie.value = salarie;
  isLoadingClients.value = true;
  try {
    const params: Record<string, any> = {
      role: 'VISITEUR',
      salarie: salarie.id
    };

    // Ajouter l'ID de l'entreprise selon le contexte
    if (authStore.isEntreprise) {
      console.log('Ajout de l\'ID de l\'entreprise connectée:', authStore.user?.id);
      params.entreprise = authStore.user?.id;
    } else if (selectedEntreprise.value) {
      console.log('Ajout de l\'ID de l\'entreprise sélectionnée:', selectedEntreprise.value.id);
      params.entreprise = selectedEntreprise.value.id;
    }

    console.log('Paramètres de la requête:', params);

    const response = await api.get('/users/', { params });
    console.log('Réponse reçue du serveur:', {
      status: response.status,
      dataLength: Array.isArray(response.data) ? response.data.length : 'non-array',
      data: response.data
    });

    if (Array.isArray(response.data)) {
      salarieVisiteurs.value = response.data;
      console.log(`${response.data.length} visiteurs chargés`);

      // Log détaillé des visiteurs
      response.data.forEach((visiteur, index) => {
        console.log(`Visiteur ${index + 1}:`, {
          id: visiteur.id,
          username: visiteur.username,
          company: visiteur.company_name,
          salarie: visiteur.salarie
        });
      });
    } else {
      console.warn('Format de réponse inattendu:', response.data);
      salarieVisiteurs.value = [];
    }

    // Vérifier si la liste est vide
    if (salarieVisiteurs.value.length === 0) {
      console.warn('Aucun visiteur trouvé pour ce salarie');
    }

  } catch (error: unknown) {
    console.error('ERREUR lors du chargement des visiteurs:', error);
    if (error && typeof error === 'object' && 'response' in error) {
      const apiError = error as { response: { status: number; data: any } };
      console.error('Détails de l\'erreur:', {
        status: apiError.response.status,
        data: apiError.response.data
      });
    }
    salarieVisiteurs.value = [];
  } finally {
    isLoadingClients.value = false;
    console.log('[MapView][selectSalarie] ====== FIN SÉLECTION SALARIE ======\n');
  }
}

// Fonctions pour gérer l'édition des notes
function closeNoteEditModal() {
  showNoteEditModal.value = false;
  editingMapNote.value = null;
}

function handleNoteSave(note: any) {
  // Si c'est une note existante, mettre à jour la couche Leaflet
  if (featureGroup.value) {
    const layers = featureGroup.value.getLayers();
    const noteLayer = layers.find((layer: any) => layer._leaflet_id === note.id);

    if (noteLayer) {
      // Mettre à jour les propriétés de la note
      noteLayer.properties.name = note.title;
      noteLayer.properties.description = note.description;
      noteLayer.properties.columnId = note.columnId;
      noteLayer.properties.accessLevel = note.accessLevel;

      // Mettre à jour le style
      noteLayer.setNoteStyle({
        color: note.style.color,
        fillColor: note.style.fillColor,
        weight: note.style.weight,
        fillOpacity: note.style.fillOpacity,
        radius: note.style.radius
      });

      // Mettre à jour le popup
      noteLayer.closePopup();
      noteLayer.unbindPopup();
      noteLayer.bindPopup(noteLayer.createPopupContent());
    }
  }

  notificationStore.success('Note enregistrée avec succès');
}

// Fonction pour sélectionner un client
async function selectClient(client: ExtendedUserDetails) {
  selectedClient.value = client;
  // Charger les plans du client
  isLoadingPlans.value = true;
  try {
    const params: any = {
      visiteur: client.id
    };

    // Ajouter les paramètres selon le rôle
    if (authStore.isEntreprise) {
      params.entreprise = authStore.user?.id;
    } else if (selectedEntreprise.value) {
      params.entreprise = selectedEntreprise.value.id;
    }

    if (selectedSalarie.value) {
      params.salarie = selectedSalarie.value.id;
    }

    const response = await api.get('/plans/', { params });
    clientPlans.value = response.data;
  } catch (error) {
    console.error('[MapView] Error loading client plans:', error);
    clientPlans.value = [];
  } finally {
    isLoadingPlans.value = false;
  }
}

const emit = defineEmits(['shape-selected']);

// Fonction pour formater l'affichage des sections dans la synthèse
function formatSectionsForPDF(sections: any[], pdf: any, startX: number, startY: number, maxWidth: number): number {
  if (!sections || sections.length === 0) return startY;

  // Trier les sections par surface décroissante
  const sortedSections = [...sections].sort((a, b) => (b.surface || 0) - (a.surface || 0));

  // Configuration du tableau plus compacte
  const tableWidth = maxWidth;
  const headerHeight = 7; // Réduit de 10 à 7
  const rowHeight = 6;    // Réduit de 8 à 6
  const padding = 2;      // Réduit de 3 à 2

  // Définir les colonnes et leurs largeurs relatives optimisées
  const columns = [
    { header: 'Nom', width: 0.3, align: 'left' },    // Augmenté pour les noms longs
    { header: 'Surface', width: 0.2, align: 'right' },
    { header: 'Angles', width: 0.25, align: 'right' }, // Augmenté pour les angles
    { header: 'Rayon', width: 0.15, align: 'right' }, // Réduit car valeurs plus courtes
    { header: 'Type', width: 0.1, align: 'center' }   // Réduit car valeurs courtes
  ];

  // Dessiner le fond du tableau
  const tableHeight = headerHeight + (rowHeight * sortedSections.length);
  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(226, 232, 240);
  pdf.roundedRect(startX, startY, tableWidth, tableHeight + padding * 2, 2, 2, 'FD'); // Réduit le rayon des coins

  // Dessiner l'en-tête du tableau
  pdf.setFillColor(241, 245, 249);
  pdf.rect(startX + padding, startY + padding, tableWidth - padding * 2, headerHeight, 'F');

  // Style pour l'en-tête
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7); // Réduit de 8 à 7
  pdf.setTextColor(51, 65, 85);

  // Dessiner les en-têtes des colonnes
  let xPos = startX + padding;
  columns.forEach(col => {
    const colWidth = col.width * (tableWidth - padding * 2);
    if (col.align === 'right') {
      pdf.text(col.header, xPos + colWidth - padding, startY + padding + 5, { align: 'right' }); // Ajusté Y
    } else if (col.align === 'center') {
      pdf.text(col.header, xPos + colWidth/2, startY + padding + 5, { align: 'center' }); // Ajusté Y
    } else {
      pdf.text(col.header, xPos + padding/2, startY + padding + 5); // Ajusté Y et X
    }
    xPos += colWidth;
  });

  // Style pour les données
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6.5); // Réduit de 7 à 6.5
  pdf.setTextColor(71, 85, 105);

  // Dessiner les lignes de données
  sortedSections.forEach((section, index) => {
    const rowY = startY + headerHeight + padding + (index * rowHeight);

    // Alterner les couleurs de fond des lignes
    if (index % 2 === 0) {
      pdf.setFillColor(250, 252, 254);
      pdf.rect(startX + padding, rowY, tableWidth - padding * 2, rowHeight, 'F');
    }

    let xPos = startX + padding;

    // Nom de la section
    const name = section.name || `Section ${index + 1}`;
    pdf.text(name, xPos + padding/2, rowY + 4); // Ajusté Y et X
    xPos += columns[0].width * (tableWidth - padding * 2);

    // Surface
    const surface = formatMeasure(section.surface || 0, 'm²');
    pdf.text(surface, xPos + (columns[1].width * (tableWidth - padding * 2)) - padding, rowY + 4, { align: 'right' });
    xPos += columns[1].width * (tableWidth - padding * 2);

    // Angles
    const angles = section.startAngle === 0 && section.endAngle === 360
      ? 'Complet'  // Raccourci pour gagner de l'espace
      : `${section.startAngle}°-${section.endAngle}°`; // Supprimé l'espace autour du tiret
    pdf.text(angles, xPos + (columns[2].width * (tableWidth - padding * 2)) - padding, rowY + 4, { align: 'right' });
    xPos += columns[2].width * (tableWidth - padding * 2);

    // Rayon
    const radius = formatMeasure(section.radius || 0);
    pdf.text(radius, xPos + (columns[3].width * (tableWidth - padding * 2)) - padding, rowY + 4, { align: 'right' });
    xPos += columns[3].width * (tableWidth - padding * 2);

    // Type (simplifié)
    const type = section.startAngle === 0 && section.endAngle === 360 ? 'C' : 'P'; // Utilisé juste l'initiale
    pdf.text(type, xPos + (columns[4].width * (tableWidth - padding * 2))/2, rowY + 4, { align: 'center' });
  });

  // Ajouter une ligne de séparation plus fine
  pdf.setDrawColor(226, 232, 240);
  pdf.setLineWidth(0.05); // Réduit l'épaisseur de la ligne
  pdf.line(
    startX + padding,
    startY + headerHeight + padding,
    startX + tableWidth - padding,
    startY + headerHeight + padding
  );

  // Retourner la nouvelle position Y
  return startY + tableHeight + padding * 2;
}
</script>
<style>
@import '../styles/MapView.css';

.map-container {
  height: 100%;
  width: 100%;
  position: relative;
}

/* Style pour le wrapper des outils de dessin */
.drawing-tools-wrapper {
  position: relative;
  z-index: 2000;
  height: 100%;
}

/* Ajout des styles pour la gestion des dimensions */
.map-parent {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: visible;
  position: relative;
  padding-top: 49px;
  /* Hauteur de la MapToolbar */
}

.map-content {
  flex: 1 1 auto;
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: visible;
}

.leaflet-container {
  width: 100% !important;
  height: 100% !important;
  z-index: 1000 !important;
}
</style>
F