<template>
  <div class="openlayers-map-view h-full flex flex-col">
      <!-- Vue d'accueil quand aucun plan n'est chargé -->
      <div v-if="showWelcomeScreen" class="absolute inset-0 flex items-center justify-center bg-gray-50 z-[3000]">
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
            <button @click="openLoadPlanModal"
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
      <!-- Map Toolbar -->
    <MapToolbar :lastSave="lastSave ? lastSave : undefined" :planName="displayPlanName" :planDescription="planDescription"
      :saveStatus="saveStatus" @create-new-plan="createNewPlan" @load-plan="loadPlan" @save-plan="savePlan"
      @adjust-view="adjustView" @toggle-edit-mode="toggleEditMode" @change-map-type="handleChangeBaseMap" />
      
      <!-- Main content area with map and drawing tools -->
      <div class="flex-1 flex flex-col md:flex-row relative">
        <!-- Mobile overlay when drawing tools are open -->
      <div v-if="isMobile && showDrawingTools" @click="toggleDrawingTools"
        class="md:hidden fixed inset-0 bg-black/30 z-[1800] transition-opacity duration-300"></div>

        <!-- Map container -->
        <div class="flex-1 relative">
          <div ref="mapContainer" class="map-container"></div>
        </div>

        <!-- Drawing tools panel -->
        <Teleport v-if="isMobile" to="body">
        <DrawingTools v-model:show="showDrawingTools" :selected-tool="selectedDrawingTool"
          :selected-feature="selectedFeature" :is-drawing="isDrawing" @tool-selected="handleToolSelection"
          @delete-feature="deleteSelectedFeature" @properties-update="handlePropertiesUpdate"
          @style-update="handleStyleUpdate" @filter-change="handleFilterChange"
          @edit-geo-note="handleEditGeoNote" @route-geo-note="handleRouteGeoNote"
          class="md:w-80 md:flex-shrink-0" />
        </Teleport>
      <DrawingTools v-else v-model:show="showDrawingTools" :selected-tool="selectedDrawingTool"
        :selected-feature="selectedFeature" :is-drawing="isDrawing" @tool-selected="handleToolSelection"
        @delete-feature="deleteSelectedFeature" @properties-update="handlePropertiesUpdate"
        @style-update="handleStyleUpdate" @filter-change="handleFilterChange"
        @edit-geo-note="handleEditGeoNote" @route-geo-note="handleRouteGeoNote"
        class="md:w-80 md:flex-shrink-0" />

        <!-- Mobile bottom toolbar -->
      <div v-if="isMobile"
          class="md:hidden fixed left-0 right-0 z-[1900] bg-white py-3 px-3 shadow-lg border-t border-gray-200 flex items-center justify-center cursor-pointer"
        style="height: var(--mobile-bottom-toolbar-height); bottom: 0;" @click="toggleDrawingTools">
          <div class="flex items-center space-x-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24"
            stroke="currentColor">
            <path v-if="!showDrawingTools" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M5 15l7-7 7 7" />
              <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span class="text-sm text-gray-500 font-medium">Outils</span>
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
                        <div class="font-medium text-gray-900">{{ formatUserName(entreprise) }}</div>
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
                  <button @click="backToEntrepriseList"
                    class="flex items-center text-sm text-gray-600 hover:text-gray-900">
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                    </svg>
                    Retour à la liste des entreprises
                  </button>
                  <span class="mx-2 text-gray-400">|</span>
                  <span class="text-sm text-gray-600">
                    {{ formatUserName(selectedEntreprise) }}
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
                    <button v-for="salarie in filteredSalaries" :key="salarie.id" @click="selectSalarie(salarie)"
                      class="flex items-center p-3 text-left bg-white hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors duration-200">
                      <div>
                        <div class="font-medium text-gray-900">{{ formatUserName(salarie) }}</div>
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
                    {{ formatUserName(selectedSalarie) }}
                  </span>
                </div>
                <h3 class="font-medium text-gray-700">Sélectionnez un visiteur</h3>
                <div class="grid grid-cols-1 gap-2">
                  <!-- Option pour charger les plans sans visiteur -->
                  <button @click="loadPlansWithoutVisiteur"
                    class="flex items-center p-3 text-left bg-primary-50 hover:bg-primary-100 rounded-lg border border-primary-200 transition-colors duration-200">
                    <div>
                      <div class="font-medium text-primary-700">Plans sans visiteur</div>
                      <div class="text-xs text-primary-600">Afficher les plans créés sans visiteur associé</div>
                    </div>
                    <svg class="w-5 h-5 ml-auto text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  <template v-if="isLoadingClients">
                    <div v-for="i in 3" :key="i" class="animate-pulse">
                      <div class="p-3 bg-white rounded-lg border border-gray-200">
                        <div class="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div class="h-4 bg-gray-100 rounded w-1/2"></div>
                      </div>
                    </div>
                  </template>
                  <template v-else>
                    <div v-if="filteredClients.length === 0" class="text-center py-4">
                      <div class="text-gray-500 mb-2">Aucun visiteur trouvé pour ce salarie</div>
                      <div class="text-sm text-gray-400">
                        Vous pouvez utiliser l'option "Plans sans visiteur" ci-dessus
                      </div>
                    </div>
                    <button v-else v-for="client in filteredClients" :key="client.id" @click="selectClient(client)"
                      class="flex items-center p-3 text-left bg-white hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors duration-200">
                      <div>
                        <div class="font-medium text-gray-900">{{ formatUserName(client) }}</div>
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
                    {{ formatUserName(selectedClient) }}
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
                    <div v-for="plan in clientPlans" :key="plan.id"
                      class="relative w-full px-4 py-3 text-left bg-white hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors duration-200 group">
                      <button @click="loadPlan(plan.id)" class="w-full text-left">
                        <div class="font-medium text-gray-900">{{ plan.nom }}</div>
                        <div class="text-sm text-gray-500">{{ plan.description }}</div>
                        <div class="text-xs text-gray-400 mt-1">
                          Modifié le {{ formatDate(plan.date_modification) }}
                        </div>
                      </button>
                      <button v-if="authStore.isAdmin || authStore.isEntreprise"
                        @click.stop="confirmDeletePlanModal(plan)"
                        class="absolute top-1/2 right-3 transform -translate-y-1/2 px-3 py-1 text-sm text-red-600 hover:text-white hover:bg-red-600 border border-red-600 rounded transition-colors duration-200 h-8 flex items-center justify-center">
                        Supprimer
                      </button>
                    </div>
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
                  <!-- Option pour charger les plans sans visiteur (ajouté pour les salariés) -->
                  <button @click="loadPlansWithoutVisiteur"
                    class="flex items-center p-3 text-left bg-primary-50 hover:bg-primary-100 rounded-lg border border-primary-200 transition-colors duration-200">
                    <div>
                      <div class="font-medium text-primary-700">Plans sans visiteur</div>
                      <div class="text-xs text-primary-600">Afficher les plans créés sans visiteur associé</div>
                    </div>
                    <svg class="w-5 h-5 ml-auto text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  <!-- Fin ajout bouton -->
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
                        <div class="font-medium text-gray-900">{{ formatUserName(client) }}</div>
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
                    {{ formatUserName(selectedClient) }}
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
                    <div v-for="plan in clientPlans" :key="plan.id"
                      class="relative w-full px-4 py-3 text-left bg-white hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors duration-200 group">
                      <button @click="loadPlan(plan.id)" class="w-full text-left">
                        <div class="font-medium text-gray-900">{{ plan.nom }}</div>
                        <div class="text-sm text-gray-500">{{ plan.description }}</div>
                        <div class="text-xs text-gray-400 mt-1">
                          Modifié le {{ formatDate(plan.date_modification) }}
                        </div>
                      </button>
                      <button v-if="authStore.isAdmin || authStore.isEntreprise"
                        @click.stop="confirmDeletePlanModal(plan)"
                        class="absolute top-1/2 right-3 transform -translate-y-1/2 px-3 py-1 text-sm text-red-600 hover:text-white hover:bg-red-600 border border-red-600 rounded transition-colors duration-200 h-8 flex items-center justify-center">
                        Supprimer
                      </button>
                    </div>
                  </template>
                </div>
              </div>
            </div>

            <!-- Interface entreprise -->
            <div v-else-if="authStore.isEntreprise" class="space-y-4">
              <!-- Étape 1: Sélection du salarié -->
              <div v-if="!selectedSalarie" class="space-y-2">
                <h3 class="font-medium text-gray-700">Sélectionnez un salarié</h3>
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
                    <button v-for="salarie in salaries" :key="salarie.id" @click="selectSalarie(salarie)"
                      class="flex items-center p-3 text-left bg-white hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors duration-200">
                      <div>
                        <div class="font-medium text-gray-900">{{ formatUserName(salarie) }}</div>
                      </div>
                      <svg class="w-5 h-5 ml-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </template>
                </div>
              </div>

              <!-- Étape 2: Sélection du visiteur -->
              <div v-else-if="!selectedClient" class="space-y-2">
                <div class="flex items-center mb-4">
                  <button @click="backToSalarieList"
                    class="flex items-center text-sm text-gray-600 hover:text-gray-900">
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                    </svg>
                    Retour à la liste des salariés
                  </button>
                  <span class="mx-2 text-gray-400">|</span>
                  <span class="text-sm text-gray-600">
                    {{ formatUserName(selectedSalarie) }}
                  </span>
                </div>
                <h3 class="font-medium text-gray-700">Sélectionnez un visiteur</h3>
                <div class="grid grid-cols-1 gap-2">
                  <!-- Option pour charger les plans sans visiteur -->
                  <button @click="loadPlansWithoutVisiteur"
                    class="flex items-center p-3 text-left bg-primary-50 hover:bg-primary-100 rounded-lg border border-primary-200 transition-colors duration-200">
                    <div>
                      <div class="font-medium text-primary-700">Plans sans visiteur</div>
                      <div class="text-xs text-primary-600">Afficher les plans créés sans visiteur associé</div>
                    </div>
                    <svg class="w-5 h-5 ml-auto text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  <template v-if="isLoadingClients">
                    <div v-for="i in 3" :key="i" class="animate-pulse">
                      <div class="p-3 bg-white rounded-lg border border-gray-200">
                        <div class="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div class="h-4 bg-gray-100 rounded w-1/2"></div>
                      </div>
                    </div>
                  </template>
                  <template v-else>
                    <div v-if="filteredClients.length === 0" class="text-center py-4">
                      <div class="text-gray-500 mb-2">Aucun visiteur trouvé pour ce salarié</div>
                      <div class="text-sm text-gray-400">
                        Vous pouvez utiliser l'option "Plans sans visiteur" ci-dessus
                      </div>
                    </div>
                    <button v-else v-for="client in filteredClients" :key="client.id" @click="selectClient(client)"
                      class="flex items-center p-3 text-left bg-white hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors duration-200">
                      <div>
                        <div class="font-medium text-gray-900">{{ formatUserName(client) }}</div>
                      </div>
                      <svg class="w-5 h-5 ml-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </template>
                </div>
              </div>

              <!-- Étape 3: Liste des plans du visiteur -->
              <div v-else class="space-y-2">
                <div class="flex items-center mb-4">
                  <button @click="backToClientList" class="flex items-center text-sm text-gray-600 hover:text-gray-900">
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                    </svg>
                    Retour à la liste des visiteurs
                  </button>
                  <span class="mx-2 text-gray-400">|</span>
                  <span class="text-sm text-gray-600">
                    {{ formatUserName(selectedClient) }}
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
                    <div v-for="plan in clientPlans" :key="plan.id"
                      class="relative w-full px-4 py-3 text-left bg-white hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors duration-200 group">
                      <button @click="loadPlan(plan.id)" class="w-full text-left">
                        <div class="font-medium text-gray-900">{{ plan.nom }}</div>
                        <div class="text-sm text-gray-500">{{ plan.description }}</div>
                        <div class="text-xs text-gray-400 mt-1">
                          Modifié le {{ formatDate(plan.date_modification) }}
                        </div>
                      </button>
                      <button v-if="authStore.isAdmin || authStore.isEntreprise"
                        @click.stop="confirmDeletePlanModal(plan)"
                        class="absolute top-1/2 right-3 transform -translate-y-1/2 px-3 py-1 text-sm text-red-600 hover:text-white hover:bg-red-600 border border-red-600 rounded transition-colors duration-200 h-8 flex items-center justify-center">
                        Supprimer
                      </button>
                    </div>
                  </template>
                </div>
              </div>
            </div>

            <!-- Interface client -->
            <div v-else class="space-y-4">
              <div v-if="irrigationStore.plans.length === 0" class="text-center py-8">
                <p class="text-gray-500">Aucun plan disponible</p>
              </div>
              <div v-else class="space-y-2">
                <div v-for="plan in irrigationStore.plans" :key="plan.id"
                  class="relative w-full px-4 py-3 text-left bg-white hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors duration-200 group">
                  <button @click="loadPlan(plan.id)" class="w-full text-left">
                    <div class="font-medium text-gray-900">{{ plan.nom }}</div>
                    <div class="text-sm text-gray-500">{{ plan.description }}</div>
                    <div class="text-xs text-gray-400 mt-1">
                      Modifié le {{ formatDate(plan.date_modification) }}
                    </div>
                  </button>
                  <button v-if="authStore.isAdmin || authStore.isEntreprise" @click.stop="confirmDeletePlanModal(plan)"
                    class="absolute top-1/2 right-3 transform -translate-y-1/2 px-3 py-1 text-sm text-red-600 hover:text-white hover:bg-red-600 border border-red-600 rounded transition-colors duration-200 h-8 flex items-center justify-center">
                    Supprimer
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
    <!-- Modal de confirmation de suppression de plan -->
    <Teleport to="body">
      <div v-if="showDeletePlanModal"
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
        <div class="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
          <div class="text-center mb-4">
            <svg class="h-12 w-12 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <h3 class="text-xl font-semibold text-gray-900">Supprimer le plan</h3>
            <p class="mt-2 text-gray-600">
              Êtes-vous sûr de vouloir supprimer le plan "{{ planToDelete ? planToDelete.nom : '' }}" ? Cette action est
              irréversible.
            </p>
          </div>
          <div class="flex justify-center space-x-4">
            <button @click="cancelDeletePlan"
              class="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300">
              Annuler
            </button>
            <button @click="confirmDeletePlan"
              class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500">
              Supprimer
            </button>
          </div>
        </div>
      </div>
    </Teleport>
    <!-- Note Edit Modal -->
    <Teleport to="body">
      <NoteEditModal v-if="showNoteEditModal" :note="noteToEdit" @close="showNoteEditModal = false" @save="onGeoNoteSaved" />
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, onUnmounted, computed, watch, Teleport } from 'vue'
import { useRouter } from 'vue-router'
import 'ol/ol.css'
import Map from 'ol/Map'
import View from 'ol/View'
import { useMapState } from './useMapState'
import { useMapDrawing } from './useMapDrawing'
import MapToolbar from './MapToolbar.vue'
import DrawingTools from './DrawingTools.vue'
import Feature from 'ol/Feature'
import { Polygon, LineString, Point } from 'ol/geom'
import { GeoJSON } from 'ol/format'
import { fromLonLat, toLonLat } from 'ol/proj'
import { getArea, getLength } from 'ol/sphere'
import type { Geometry } from 'ol/geom'
import NewPlanModal from '@/components/NewPlanModal.vue'
import { useAuthStore, formatUserName } from '@/stores/auth'
import { useIrrigationStore, type Plan } from '@/stores/irrigation'
import { useDrawingStore } from '@/stores/drawing'
import { useNotificationStore } from '@/stores/notification'
import { userService } from '@/services/api'
import api from '@/services/api'
import { formatDate } from '@/utils/dateUtils'
import { useNotesStore } from '@/stores/notes'
import { noteService } from '@/services/api'
import NoteEditModal from '@/components/NoteEditModal.vue'
import type { Note } from '@/types/notes'
import { 
  Style, 
  Fill, 
  Stroke, 
  Text, 
  Circle as CircleStyle, 
  Icon // Ajout de Icon
} from 'ol/style'
import VectorSource from 'ol/source/Vector'
import VectorLayer from 'ol/layer/Vector'

// Store references
const authStore = useAuthStore()
const irrigationStore = useIrrigationStore()
const drawingStore = useDrawingStore()
const notificationStore = useNotificationStore()
const notesStore = useNotesStore()
const router = useRouter()

// Computed property for current plan
const currentPlan = computed(() => irrigationStore.currentPlan)

// Map container reference
const mapContainer = ref<HTMLElement | null>(null)
let olMap: Map | null = null

// Plan information
const planName = ref<string>('')
const planDescription = ref<string>('')
const lastSave = ref<Date | null>(null)
const saveStatus = ref<'saving' | 'success' | null>(null)

// Computed to show welcome screen only when no plan is loaded
const showWelcomeScreen = computed(() => !currentPlan.value)

// Computed for display name (fallback to default if empty)
const displayPlanName = computed(() => {
  if (currentPlan.value?.nom) return currentPlan.value.nom
  if (planName.value) return planName.value
  return 'Plan sans titre'
})

// Drawing tools state
const isEditModeEnabled = ref(true)
const isDrawingToolsVisible = ref(true)
const isMobile = ref(false)
const selectedDrawingTool = ref('none')
const isDrawing = ref(false)

// Modal states
const showNewPlanModal = ref(false)
const showLoadPlanModal = ref(false)
const showDeletePlanModal = ref(false)
const planToDelete = ref<Plan | null>(null)
const newPlanModalRef = ref<InstanceType<typeof NewPlanModal> | null>(null)
// Note editing modal state
const showNoteEditModal = ref(false)
const noteToEdit = ref<Note | null>(null)

// Plan loading variables
const selectedEntreprise = ref<any>(null)
const selectedSalarie = ref<any>(null)
const selectedClient = ref<any>(null)
const selectedVisiteur = ref<any>(null)
const entreprises = ref<any[]>([])
const salaries = ref<any[]>([])
const filteredSalaries = ref<any[]>([])
const filteredClients = ref<any[]>([])
const clientPlans = ref<any[]>([])
const isLoadingEntreprises = ref(false)
const isLoadingSalaries = ref(false)
const isLoadingClients = ref(false)
const isLoadingPlans = ref(false)

const showDrawingTools = isDrawingToolsVisible;
function toggleDrawingTools() {
  showDrawingTools.value = !showDrawingTools.value;
}
function checkMobile() {
  isMobile.value = window.innerWidth < 768;
  if (!isMobile.value) {
    showDrawingTools.value = true;
  }
}
onMounted(() => {
  window.addEventListener('resize', checkMobile);
  checkMobile();
});
onUnmounted(() => {
  window.removeEventListener('resize', checkMobile);
});

// Get map state and drawing tools
const { 
  initMap, 
  changeBaseMap: setBaseMap, 
  initialView, 
  vectorSource, 
  vectorLayer 
} = useMapState()

const { 
  initDrawing, 
  setDrawingTool, 
  clearDrawing,
  deleteFeature,
  updateFeatureProperties,
  updateFeatureStyle,
  selectedFeature,
  isDrawing: drawingInProgress,
  features,
  drawSource
} = useMapDrawing()

// Watch for drawing progress changes
watch(drawingInProgress, (newValue, oldValue) => {
  isDrawing.value = newValue
  // When drawing completes (went from true to false), deselect the drawing tool
  if (oldValue && !newValue) {
    if (olMap) {
      selectedDrawingTool.value = 'none'
      setDrawingTool('none', olMap!)
    }
  }
})

// Features collection
const shapes = ref<any[]>([])

// Initialize map when component is mounted
onMounted(async () => {
  // Load note columns before using default column
  try {
    await notesStore.loadColumns()
  } catch (err) {
    console.error('[MapView] Error loading note columns:', err)
  }
  
  if (mapContainer.value) {
    // Create the map instance
    initMap(mapContainer.value).then(async (map: Map) => {
      olMap = map;
      
      // Initialize drawing tools
      if (olMap) {
        initDrawing(olMap!);
        
        // Set up drawSource listener for GeoNotes
        drawSource.on('addfeature', async (e: any) => {
          const feature = e.feature as Feature<Geometry>
          const props = feature.get('properties') as any
          if (props && props.type === 'Note') {
            // Only process notes
            try {
              console.log('[MapView] Added feature is a GeoNote, processing...');
              
              const geometry = feature.getGeometry()
              if (geometry && geometry instanceof Point) {
                // Get coordinates and convert to longitude/latitude
                const coords = geometry.getCoordinates()
                console.log('[MapView] GeoNote raw coordinates (EPSG:3857):', coords);
                
                const [lng, lat] = toLonLat(coords)
                console.log('[MapView] GeoNote converted coordinates (EPSG:4326):', [lng, lat]);
                
                // Create note data for API
                const noteData: any = {
                  title: props.name || 'Nouvelle note',
                  description: props.description || '',
                  location: { 
                    type: 'Point', 
                    coordinates: [lng, lat]  // GeoJSON uses [longitude, latitude] format
                  },
                  column: notesStore.getDefaultColumn.id,
                  access_level: props.accessLevel || 'visitor',
                  style: props.style || {
                    color: '#3388ff',
                    weight: 3,
                    fillColor: 'rgba(51, 136, 255, 0.6)',
                    radius: 8
                  },
                  category: props.category || 'forages',
                  plan: irrigationStore.currentPlan?.id
                }
                
                console.log('[MapView] Sending GeoNote data to API:', noteData);
                
                // Create note via API
                const response = await noteService.createNote(noteData)
                const created = response.data
                console.log('[MapView] Created GeoNote API response:', created);
                
                // Remove the temporary feature from the draw source (important!)
                // so it doesn't get saved twice (once as a shape, once as a note)
                drawSource.removeFeature(feature)
                
                // Create a brand new feature with the correct ID from the server
                const newFeature = new Feature({
                  geometry: new Point(coords) // Use original OpenLayers coordinates (EPSG:3857)
                });
                
                // Copy properties and set ID
                newFeature.setId(created.id);
                newFeature.set('properties', props);
                
                // Add the note to the map separately from drawSource
                addNoteToMap(newFeature, created.id);
                
                // Add to notes store
                notesStore.addNote({
                  ...created,
                  id: created.id,
                  columnId: created.column
                });
                
                // Select the new feature
                selectedFeature.value = null; // Clear first to trigger reactivity
                setTimeout(() => {
                  selectedFeature.value = newFeature;
                }, 100);
                
                // Notify creation success
                notificationStore.success('Note créée avec succès')
              } else {
                console.warn('[MapView] Feature is not a Point geometry or is invalid:', geometry);
              }
            } catch (err) {
              console.error('[MapView] Error creating GeoNote:', err)
              notificationStore.error('Erreur lors de la création de la note')
              drawSource.removeFeature(feature)
            }
          }
        })
        
        // Ensure default interactions are active on initial load
        setDrawingTool('none', olMap);
        
        // Load last viewed plan from localStorage
        try {
          const lastPlanId = localStorage.getItem('lastPlanId')
          if (lastPlanId) {
            console.log('[MapView] Loading last opened plan:', lastPlanId)
            await loadPlanById(parseInt(lastPlanId))
          } else {
            // Only adjust view if no plan is loaded
            adjustView();
          }
        } catch (error) {
          console.error('[MapView] Error loading last plan:', error)
          // If error loading last plan, reset localStorage and adjust view
          localStorage.removeItem('lastPlanId')
          adjustView();
        }
      }
    });
  }
});

// Clean up when component is unmounted
onUnmounted(() => {
  if (olMap) {
    olMap.setTarget(undefined)
    olMap = null
  }
})

// Toolbar action methods
const createNewPlan = () => {
  showNewPlanModal.value = true
}

const loadPlan = (planId?: number) => {
  if (planId) {
    // Load a specific plan by ID
    console.log('Loading plan with ID:', planId)
    loadPlanById(planId)
    showLoadPlanModal.value = false
  } else {
    // Open the load plan modal
    openLoadPlanModal()
  }
}

const openLoadPlanModal = async () => {
  // Reset selection state
  selectedEntreprise.value = null
  selectedSalarie.value = null
  selectedClient.value = null

  // Load initial data based on user role
  if (authStore.isAdmin) {
    await loadEntreprises()
  } else if (authStore.isEntreprise) {
    await loadSalaries()
  } else if (authStore.isSalarie) {
    await loadClients()
  } else {
    // Regular client/visitor - load their available plans
    await irrigationStore.fetchPlans()
  }

  // Show the modal
  showLoadPlanModal.value = true
}

// Plan loading functions
async function loadEntreprises() {
  isLoadingEntreprises.value = true
  try {
    const response = await authStore.fetchEnterprises()
    entreprises.value = response
  } catch (error) {
    console.error('Error loading entreprises:', error)
    notificationStore.error('Erreur lors du chargement des entreprises')
  } finally {
    isLoadingEntreprises.value = false
  }
}

async function loadSalaries(entrepriseId?: number) {
  isLoadingSalaries.value = true
  try {
    const params: any = { role: 'SALARIE' }
    if (entrepriseId) {
      params.entreprise = entrepriseId
    } else if (authStore.isEntreprise) {
      params.entreprise = authStore.user?.id
    }
    
    const response = await userService.getUsers(params)
    salaries.value = response.data
    filteredSalaries.value = response.data
  } catch (error) {
    console.error('Error loading salaries:', error)
    notificationStore.error('Erreur lors du chargement des salariés')
  } finally {
    isLoadingSalaries.value = false
  }
}

async function loadClients(salarieId?: number) {
  isLoadingClients.value = true
  try {
    const params: any = { role: 'VISITEUR' }
    
    if (salarieId) {
      params.salarie = salarieId
    } else if (authStore.isSalarie) {
      params.salarie = authStore.user?.id
    }
    
    if (authStore.isEntreprise) {
      params.entreprise = authStore.user?.id
    }
    
    const response = await userService.getUsers(params)
    filteredClients.value = response.data
  } catch (error) {
    console.error('Error loading clients:', error)
    notificationStore.error('Erreur lors du chargement des visiteurs')
  } finally {
    isLoadingClients.value = false
  }
}

async function loadPlansForClient(clientId: number) {
  isLoadingPlans.value = true
  try {
    // Build query params based on user type
    const params: any = { visiteur: clientId }
    
    if (selectedSalarie.value) {
      params.salarie = selectedSalarie.value.id
    } else if (authStore.isSalarie) {
      params.salarie = authStore.user?.id
    }
    
    if (authStore.isEntreprise) {
      params.entreprise = authStore.user?.id
    } else if (selectedEntreprise.value) {
      params.entreprise = selectedEntreprise.value.id
    }
    
    const response = await api.get('/plans/', { params })
    clientPlans.value = response.data
  } catch (error) {
    console.error('Error loading plans for client:', error)
    notificationStore.error('Erreur lors du chargement des plans')
  } finally {
    isLoadingPlans.value = false
  }
}

async function loadPlansWithoutVisiteur() {
  isLoadingPlans.value = true
  try {
    // Create a virtual client object to represent "no visiteur"
    selectedClient.value = { id: -1, first_name: 'Plans', last_name: 'sans visiteur' }
    
    // Build query parameters based on user type
    const params: any = { no_visiteur: true }
    
    if (selectedSalarie.value) {
      params.salarie = selectedSalarie.value.id
    } else if (authStore.isSalarie) {
      params.salarie = authStore.user?.id
    }
    
    if (authStore.isEntreprise) {
      params.entreprise = authStore.user?.id
    } else if (selectedEntreprise.value) {
      params.entreprise = selectedEntreprise.value.id
    }
    
    const response = await api.get('/plans/', { params })
    clientPlans.value = response.data
  } catch (error) {
    console.error('Error loading plans without visiteur:', error)
    notificationStore.error('Erreur lors du chargement des plans')
  } finally {
    isLoadingPlans.value = false
  }
}

// Selection functions for plan loading
function selectEntreprise(entreprise: any) {
  selectedEntreprise.value = entreprise
  loadSalaries(entreprise.id)
}

function selectSalarie(salarie: any) {
  selectedSalarie.value = salarie
  loadClients(salarie.id)
}

function selectClient(client: any) {
  selectedClient.value = client
  loadPlansForClient(client.id)
}

function backToEntrepriseList() {
  selectedSalarie.value = null
  selectedClient.value = null
  clientPlans.value = []
}

function backToSalarieList() {
  selectedClient.value = null
  clientPlans.value = []
}

function backToClientList() {
  selectedClient.value = null
  clientPlans.value = []
}

// Load a plan by ID
async function loadPlanById(planId: number) {
  if (!planId) {
    console.error('[MapView] loadPlanById: Invalid plan ID');
    return;
  }

  console.log(`[MapView] loadPlanById: Loading plan ${planId}`);
  try {
    // Clear current state without touching the computed currentPlan
    drawSource.clear();
    shapes.value = [];
    selectedFeature.value = null;
    planName.value = '';
    planDescription.value = '';
    lastSave.value = null;

    // Get plan details
    const plan = await irrigationStore.fetchPlanById(planId);
    if (!plan) {
      throw new Error(`Plan with ID ${planId} not found`);
    }

    // Set the current plan in the store
    irrigationStore.setCurrentPlan(plan);
    
    // Save plan ID to localStorage for future loading
    localStorage.setItem('lastPlanId', planId.toString());
    
    // Update local state - without setting readonly values
    planName.value = plan.nom || '';
    planDescription.value = plan.description || '';
    if (plan.date_modification) {
      lastSave.value = new Date(plan.date_modification);
    }

    // Load elements/shapes from plan
    if (plan.elements && Array.isArray(plan.elements)) {
      // Process only shapes (not points/GeoNotes)
      plan.elements.forEach(element => {
        try {
          if (element.type !== 'Point' && element.geometry) {
            const geoJson = new GeoJSON();
            const geometry = geoJson.readGeometry(element.geometry);
            
            // Create a feature with the geometry
            const feature = new Feature({
              geometry
            });
            
            // Set properties and ID
            if (element.id) {
              feature.setId(element.id);
            }
            
            // Set feature properties
            const properties = element.properties || {};
            feature.set('properties', {
              type: element.type,
              name: properties.name || '',
              category: properties.category || 'forages',
              accessLevel: properties.accessLevel || 'visitor',
              style: properties.style || {
                color: '#3388ff',
                fillColor: 'rgba(51, 136, 255, 0.2)',
                weight: 3
              }
            });
            
            // Add to source
            drawSource.addFeature(feature);
            
            // Add to shapes collection
            shapes.value.push({
              id: element.id,
              type: element.type,
              layer: feature,
              properties: feature.get('properties')
            });
          }
        } catch (err) {
          console.error(`[MapView] Error processing element:`, err);
        }
      });
    }

    // Adjust view after loading shapes
    adjustView();
    
    // Load GeoNotes separately
    await loadPlanGeoNotes(planId);

    return plan;
  } catch (error) {
    console.error('[MapView] loadPlanById error:', error);
    notificationStore.error('Erreur lors du chargement du plan');
    throw error;
  }
}

// Function to load GeoNotes separately - simplified to use API directly
async function loadPlanGeoNotes(planId: number) {
  console.log(`[MapView] loadPlanGeoNotes: Loading notes for plan ${planId}`);
  
  try {
    // Get notes from API
    const resp = await noteService.getNotesByPlan(planId);
    const notesData = resp.data;
    console.log(`[MapView] loadPlanGeoNotes: Found ${notesData.length} notes`);
    
    // Log des détails de toutes les notes
    if (notesData.length > 0) {
      notesData.forEach((note: any, index: number) => {
        console.log(`[MapView] loadPlanGeoNotes: Note #${index} (id=${note.id}):`, {
          title: note.title,
          location: note.location,
          column: note.column,
          category: note.category
        });
      });
    }
    
    // Process each note
    notesData.forEach((note: any) => {
      try {
        // Skip notes without location
        if (!note.location) {
          console.warn(`[MapView] loadPlanGeoNotes: Note ${note.id} has no location`);
          return;
        }
        
        console.log(`[MapView] Processing note ${note.id} with location:`, note.location);
        
        // CORRECTION: Au lieu d'utiliser GeoJSON.readGeometry, créer manuellement un point avec les coordonnées converties
        if (note.location.type === 'Point' && Array.isArray(note.location.coordinates) && note.location.coordinates.length === 2) {
          const [lng, lat] = note.location.coordinates;
          console.log(`[MapView] Note ${note.id} original GeoJSON coordinates (EPSG:4326):`, [lng, lat]);
          
          // Convertir les coordonnées EPSG:4326 (lon/lat) en EPSG:3857 (projection mercator utilisée par OpenLayers)
          const mapCoords = fromLonLat([lng, lat]);
          console.log(`[MapView] Note ${note.id} converted coordinates (EPSG:3857):`, mapCoords);
          
          // Créer un point OpenLayers avec les coordonnées converties
          const geometry = new Point(mapCoords);
          
          // Create a new feature for the note
          const feature = new Feature({ geometry });
          
          // Assign properties for rendering and identification
          feature.setId(note.id);
          feature.set('properties', {
            type: 'Note',
            category: note.category || 'forages',
            accessLevel: note.access_level,
            style: note.style || {
              color: '#3388ff',
              weight: 3,
              fillColor: 'rgba(51, 136, 255, 0.6)',
              radius: 8
            },
            name: note.title,
            description: note.description
          });
          
          // Add note to map as a separate layer (not to drawSource)
          addNoteToMap(feature, note.id);
          
          // Add to notes store
          notesStore.addNote({ 
            ...note, 
            id: note.id,
            columnId: note.column 
          });
        } else {
          console.warn(`[MapView] Note ${note.id} has invalid location format:`, note.location);
        }
      } catch (err) {
        console.error(`[MapView] loadPlanGeoNotes: Error processing note ${note.id}:`, err);
      }
    });
  } catch (err) {
    console.error('[MapView] Error loading GeoNotes:', err);
  }
}

// Function to add a note to the map (separate from drawSource)
function addNoteToMap(feature: Feature<Geometry>, id: number) {
  const geometry = feature.getGeometry();
  if (geometry instanceof Point) {
    const coords = geometry.getCoordinates();
    const [lng, lat] = toLonLat(coords);
    console.log(`[MapView] addNoteToMap: Note id=${id} positions:`, {
      mapCoords: coords,
      geoCoords: [lng, lat]
    });
  }
  
  // Create separate source and layer for this note
  const noteSource = new VectorSource({
    features: [feature]
  });
  
  // Get style properties
  const props = feature.get('properties') || {};
  const style = props.style || {};

  // SVG de l'outil dessin (draw_point)
  const drawPointSVG =
    `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="8.5" r="2.5" stroke="${style.color || '#2b6451'}" stroke-width="2" fill="white"/>
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="${style.color || '#2b6451'}" stroke-width="2" fill="${style.fillColor || '#e6f0ee'}"/>
    </svg>`;
  // Encodage en data URI
  const svgUrl = `data:image/svg+xml;utf8,${encodeURIComponent(drawPointSVG)}`;

  // Create layer with custom SVG icon
  const noteLayer = new VectorLayer({
    source: noteSource,
    style: new Style({
      image: new Icon({
        src: svgUrl,
        anchor: [0.5, 1],
        anchorXUnits: 'fraction',
        anchorYUnits: 'fraction',
        scale: 1.5 // Fixed larger icon scale for optimal visibility
      }),
      text: props.name ? new Text({
        text: String(props.name),
        offsetY: -35,
        font: '12px Calibri,sans-serif',
        fill: new Fill({ color: '#000' }),
        stroke: new Stroke({ color: '#fff', width: 2 })
      }) : undefined
    })
  });
  
  // Add layer to map
  if (olMap) {
    olMap.addLayer(noteLayer);
    
    // Store reference to this note for later removal
    const noteInfo = {
      id: id,
      type: 'Note',
      layer: feature,
      properties: props,
      mapLayer: noteLayer,
      source: noteSource
    };
    
    // Add to shapes collection (but marked specially)
    shapes.value.push(noteInfo);
  }
}

// Clear plan data - modified to handle note layers
function clearPlan() {
  // Clear drawing source for regular shapes
  drawSource.clear();
  
  // Remove note layers from map
  shapes.value.forEach(shape => {
    if (shape.type === 'Note' && shape.mapLayer && olMap) {
      olMap.removeLayer(shape.mapLayer);
    }
  });
  
  // Clear shapes collection
  shapes.value = [];
  
  // Clear selected feature
  selectedFeature.value = null;
  
  // Reset plan data - DON'T modify currentPlan here, it's set by irrigationStore.setCurrentPlan
  planName.value = '';
  planDescription.value = '';
  lastSave.value = null;
}

// Modify deleteSelectedFeature to handle GeoNotes specially
const deleteSelectedFeature = async () => {
  console.log('[MapView] deleteSelectedFeature invoked for feature', selectedFeature.value)
  if (selectedFeature.value && olMap) {
    const feature = selectedFeature.value as unknown as Feature<Geometry>
    const props = feature.get('properties') as any
    const id = feature.getId() as number
    
    // Handle GeoNotes differently from regular shapes
    if (props.type === 'Note' && id) {
      // Log des coordonnées avant suppression
      const geometry = feature.getGeometry();
      if (geometry instanceof Point) {
        const coords = geometry.getCoordinates();
        const [lng, lat] = toLonLat(coords);
        console.log(`[MapView] Deleting GeoNote id=${id} at coordinates:`, {
          raw: coords,
          lonLat: [lng, lat]
        });
      }
      
      try {
        // Delete from backend via API
        await noteService.deleteNote(id)
        
        // Remove from notes store
        notesStore.removeNote(id)
        
        // Find and remove the note's layer from the map
        const noteShape = shapes.value.find(shape => shape.id === id && shape.type === 'Note')
        if (noteShape && noteShape.mapLayer && olMap) {
          olMap.removeLayer(noteShape.mapLayer)
        }
        
        // Remove from shapes collection
        shapes.value = shapes.value.filter(shape => !(shape.id === id && shape.type === 'Note'))
        
        // Success notification
        notificationStore.success('Note supprimée avec succès')
      } catch (err) {
        console.error('[MapView] Error deleting GeoNote:', err)
        notificationStore.error('Erreur lors de la suppression de la note')
      }
    } else {
      // Regular shape deletion
      console.log('[MapView] deleteSelectedFeature: deleting regular shape with id', id)
      deleteFeature(feature) // Removes from drawSource
      shapes.value = shapes.value.filter(shape => shape.id !== id)
    }
    
    // Clear selection
    selectedFeature.value = null
  }
}

// Modify savePlan to use the plan API correctly
const savePlan = async () => {
  console.log(`[MapView] savePlan: start saving plan id=${currentPlan.value?.id}`);
  
  // Log des notes géolocalisées existantes
  const noteShapes = shapes.value.filter(shape => shape.type === 'Note');
  console.log(`[MapView] savePlan: ${noteShapes.length} GeoNotes before saving`);
  
  if (noteShapes.length > 0) {
    noteShapes.forEach((note, index) => {
      if (note.layer) {
        const feature = note.layer as Feature<Geometry>;
        const geometry = feature.getGeometry();
        if (geometry && geometry instanceof Point) {
          const coords = geometry.getCoordinates();
          const [lng, lat] = toLonLat(coords);
          console.log(`[MapView] savePlan: Note #${index} (id=${note.id}) coords:`, 
            { raw: coords, lonLat: [lng, lat] });
        }
      }
    });
  }
  
  if (!currentPlan.value) {
    notificationStore.error('Aucun plan n\'est chargé')
    return
  }
  
  // Ensure plan has a title
  if (!planName.value && !currentPlan.value.nom) {
    planName.value = 'Plan ' + new Date().toLocaleDateString()
    // Update plan metadata
    try {
      await irrigationStore.updatePlan(currentPlan.value.id, {
        nom: planName.value,
        description: planDescription.value || 'Plan créé le ' + new Date().toLocaleDateString()
      });
    } catch (error) {
      console.error('[MapView] Error updating plan metadata:', error);
    }
  }
  
  saveStatus.value = 'saving'
  
  try {
    // Convert features to elements the API expects
    const elements = [];
    
    // Get all features from drawSource
    const features = drawSource.getFeatures();
    for (const feature of features) {
      // Skip any Note type features - they're handled separately
      const props = feature.get('properties');
      if (props && props.type === 'Note') continue;
      
      const geometry = feature.getGeometry();
      if (!geometry) continue;
      
      // Convert to GeoJSON
      const geoJson = new GeoJSON();
      const geomJson = geoJson.writeGeometryObject(geometry);
      
      // Add element data
      elements.push({
        id: feature.getId(),
        type: geometry.getType(),
        geometry: geomJson,
        properties: props
      });
    }
    
    // Save elements
    await irrigationStore.updatePlanElements(currentPlan.value.id, { elements });
    
    // Update last save timestamp
    lastSave.value = new Date();
    saveStatus.value = 'success';
    
    // Reset save status after delay
    setTimeout(() => {
      saveStatus.value = null;
    }, 3000);
    
    console.log(`[MapView] savePlan: plan saved successfully`);
  } catch (error) {
    console.error('[MapView] savePlan error:', error);
    notificationStore.error('Erreur lors de la sauvegarde du plan');
    saveStatus.value = null;
  }
}

// Handle drawing tool selection 
const handleToolSelection = (toolType: string) => {
  console.log('[MapView] handleToolSelection:', toolType)
  selectedDrawingTool.value = toolType
  
  if (olMap !== null) {
    setDrawingTool(toolType, olMap!)
  }
}

// Handle properties update from DrawingTools component
const handlePropertiesUpdate = (properties: any) => {
  if (selectedFeature.value) {
    // TypeScript requires a type assertion here since Feature<Geometry> is expected
    const feature = selectedFeature.value as unknown as Feature<Geometry>
    updateFeatureProperties(feature, properties)
    
    // Update the shapes collection
    const featureId = selectedFeature.value.get('id')
    const shapeIndex = shapes.value.findIndex(shape => shape.id === featureId)
    if (shapeIndex !== -1) {
      shapes.value[shapeIndex].properties = {
        ...shapes.value[shapeIndex].properties,
        ...properties
      }
    }
  }
}

// Handle style update from DrawingTools component
const handleStyleUpdate = (style: any) => {
  console.log('[MapView] handleStyleUpdate received style', style)
  if (selectedFeature.value) {
    // TypeScript requires a type assertion here since Feature<Geometry> is expected
    const feature = selectedFeature.value as unknown as Feature<Geometry>
    updateFeatureStyle(feature, style)
    console.log('[MapView] handleStyleUpdate: style applied to feature', feature)
  }
}

// Handle filter changes from drawing tools
const handleFilterChange = (filters: any) => {
  // Apply filters to features visibility
  console.log('Applying filters:', filters)
  
  // This would filter features by category, access level, etc.
  // For now, we'll just log the filters
}

// Change the base map
const handleChangeBaseMap = (mapType: 'Hybride' | 'Cadastre' | 'IGN') => {
  if (olMap) {
    setBaseMap(mapType)
  }
}

// Plan creation handler
function onPlanCreated(planId: number) {
  console.log('[MapView] onPlanCreated: new plan created with ID:', planId)
  // Load the newly created plan
  loadPlanById(planId)
  showNewPlanModal.value = false // Ensure the modal is closed
}

// Plan deletion handlers
function confirmDeletePlanModal(plan: Plan) {
  planToDelete.value = plan
  showDeletePlanModal.value = true
}

async function confirmDeletePlan() {
  if (!planToDelete.value?.id) return
  try {
    // Save the ID of the plan to delete and the current context
    const planIdToDelete = planToDelete.value.id
    const currentContext = {
      selectedClient: selectedClient.value,
      selectedSalarie: selectedSalarie.value,
      isNoVisiteurView: selectedClient.value && selectedClient.value.id === -1
    }

    // Delete the plan
    await irrigationStore.deletePlan(planIdToDelete)

    // Close the modal before reloading plans
    showDeletePlanModal.value = false
    planToDelete.value = null

    // Wait a brief moment for the UI to update
    await new Promise(resolve => setTimeout(resolve, 50))

    // Reload plans based on context
    if (currentContext.isNoVisiteurView) {
      // If we were in the "plans without visiteur" view
      await loadPlansWithoutVisiteur()
    } else if (currentContext.selectedClient) {
      // If we were in a client's plans view
      await loadClientPlans(currentContext.selectedClient.id)
    } else {
      // Otherwise, just reload all plans
      await irrigationStore.fetchPlans()
    }
  } catch (error) {
    console.error('Error deleting plan:', error)
    notificationStore.error('Erreur lors de la suppression du plan')
  }
}

function cancelDeletePlan() {
  showDeletePlanModal.value = false
  planToDelete.value = null
}

// Load client plans
async function loadClientPlans(clientId: number) {
  try {
    isLoadingPlans.value = true
    const response = await irrigationStore.fetchClientPlans(clientId)
    clientPlans.value = response
  } catch (error) {
    console.error('Error loading client plans:', error)
    notificationStore.error('Erreur lors du chargement des plans du client')
  } finally {
    isLoadingPlans.value = false
  }
}

// Add adjustView function before using it
const adjustView = () => {
  if (!olMap) return
  
  // Get all features from the draw source
  const allFeatures = drawSource.getFeatures()
  
  // Also include notes from our shapes collection
  const noteShapes = shapes.value.filter(shape => shape.type === 'Note' && shape.mapLayer)
  
  if (allFeatures.length > 0 || noteShapes.length > 0) {
    try {
      // Calculate the extent that encompasses all features
      let globalExtent: number[] | undefined;
      
      // Start with features from drawSource
      if (allFeatures.length > 0) {
        const firstGeometry = allFeatures[0].getGeometry()
        if (firstGeometry) {
          // Initialize with the first feature's extent
          globalExtent = [...firstGeometry.getExtent()]
          
          // Add all other features from drawSource
          allFeatures.slice(1).forEach((feature) => {
            const geometry = feature.getGeometry()
            if (geometry) {
              const extent = geometry.getExtent()
              if (globalExtent) {
                globalExtent = [
                  Math.min(globalExtent[0], extent[0]),
                  Math.min(globalExtent[1], extent[1]),
                  Math.max(globalExtent[2], extent[2]),
                  Math.max(globalExtent[3], extent[3])
                ]
              }
            }
          })
        }
      }
      
      // Add note layers to the extent
      noteShapes.forEach(shape => {
        if (shape.layer) {
          const geometry = (shape.layer as Feature<Geometry>).getGeometry()
          if (geometry) {
            const extent = geometry.getExtent()
            if (!globalExtent) {
              globalExtent = [...extent]
            } else {
              globalExtent = [
                Math.min(globalExtent[0], extent[0]),
                Math.min(globalExtent[1], extent[1]),
                Math.max(globalExtent[2], extent[2]),
                Math.max(globalExtent[3], extent[3])
              ]
            }
          }
        }
      })
      
      // Fit the view to the calculated extent
      if (globalExtent && olMap && globalExtent.length === 4) {
        olMap.getView().fit(globalExtent as [number, number, number, number], {
          padding: [50, 50, 50, 50],
          maxZoom: 18,
          duration: 500
        })
      }
    } catch (error) {
      console.error('[MapView] adjustView error:', error)
    }
  } else {
    // If no features, reset to initial view
    if (olMap) {
      olMap.getView().setZoom(6)
      olMap.getView().setCenter(fromLonLat([2.213749, 46.227638])) // Center of France
    }
  }
}

// Add toggleEditMode function that's referenced in the template
const toggleEditMode = (enabled: boolean) => {
  isEditModeEnabled.value = enabled
  
  if (olMap) {
    if (enabled) {
      // Show drawing tools panel when edit mode is enabled
      isDrawingToolsVisible.value = true
      selectedDrawingTool.value = 'none'
    } else {
      // Clear active drawing tool when edit mode is disabled
      setDrawingTool('none', olMap)
      isDrawingToolsVisible.value = false
      selectedDrawingTool.value = 'none'
    }
  }
}

// Handle edit GeoNote event
const handleEditGeoNote = () => {
  if (!selectedFeature.value) return;
  const id = selectedFeature.value.getId() as number;
  const note = notesStore.notes.find(n => n.id === id);
  if (!note) {
    console.warn(`[MapView] Note not found: id=${id}`);
    return;
  }
  noteToEdit.value = { ...note };
  showNoteEditModal.value = true;
}

// Handle route GeoNote event
const handleRouteGeoNote = () => {
  if (!selectedFeature.value) return;
  const geometry = (selectedFeature.value as Feature<Geometry>).getGeometry();
  if (geometry instanceof Point) {
    const coords = geometry.getCoordinates();
    const [lng, lat] = toLonLat(coords);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,'_blank');
  }
}

// Handle save from NoteEditModal
const onGeoNoteSaved = async (updatedNote: Note) => {
  try {
    // Update on backend
    await noteService.updateNote(updatedNote.id, {
      title: updatedNote.title,
      description: updatedNote.description,
      access_level: updatedNote.accessLevel
    });
    // Update in store
    notesStore.updateNote(updatedNote.id, {
      title: updatedNote.title,
      description: updatedNote.description,
      access_level: updatedNote.accessLevel
    });
    // Update properties on the map feature
    if (selectedFeature.value) {
      updateFeatureProperties(selectedFeature.value as Feature<Geometry>, {
        name: updatedNote.title,
        description: updatedNote.description,
        accessLevel: updatedNote.accessLevel
      });
    }
    notificationStore.success('Note mise à jour avec succès');
  } catch (err) {
    console.error('[MapView] Error updating note:', err);
    notificationStore.error('Erreur lors de la mise à jour de la note');
  } finally {
    showNoteEditModal.value = false;
  }
}
</script>

<style scoped>
.map-container {
  width: 100%;
  height: 100%;
}

.openlayers-map-view {
  position: relative;
}

/* Primary color theme */
.bg-primary-600 {
  background-color: #2b6451;
}

/* Button styles */
button {
  cursor: pointer;
}

.text-white {
  color: white;
}

.shadow-lg {
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

/* Responsive adjustments */
@media (min-width: 768px) {
  .md\:hidden {
    display: none;
  }
}
</style>