<!-- DrawingTools.vue -->
<template>
  <div class="h-full flex flex-col bg-white overflow-y-auto">
    <!-- Header avec titre -->
    <div class="p-3 bg-gray-50 border-b border-gray-200">
      <h3 class="text-sm font-semibold text-gray-700">Outils de dessin</h3>
    </div>
    <!-- Outils de dessin - version compacte avec icônes -->
    <div class="p-3 border-b border-gray-200">
      <div class="grid grid-cols-4 gap-1">
        <button
          v-for="tool in drawingTools.filter(t => t.type !== 'delete')"
          :key="tool.type"
          class="flex items-center justify-center p-2 rounded border"
          :class="{ 'bg-blue-50 border-blue-200 text-blue-700': currentTool === tool.type }"
          @click="$emit('tool-change', currentTool === tool.type ? '' : tool.type)"
          :title="tool.label"
        >
          <span class="icon" v-html="getToolIcon(tool.type)"></span>
        </button>
      </div>
      <!-- Bouton de suppression -->
      <button
        v-if="selectedShape"
        class="w-full mt-2 p-2 rounded border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
        :class="{ 'bg-red-100': currentTool === 'delete' }"
        @click="$emit('delete-shape')"
        title="Supprimer la forme"
      >
        <svg class="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
    <!-- Sections collapsables pour les formes sélectionnées -->
    <div v-if="selectedShape && localProperties" class="flex-1 overflow-y-auto">
      <!-- Style - Section collapsable -->
      <div class="p-3 border-b border-gray-200">
        <button 
          class="flex items-center justify-between w-full text-sm font-semibold text-gray-700"
          @click="toggleSection('style')"
        >
          <span>Style</span>
          <svg 
            class="w-4 h-4"
            :class="{ 'rotate-180': !sectionsCollapsed.style }"
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
      <div v-show="!sectionsCollapsed.style" class="p-3">
        <!-- Couleurs prédéfinies - compact -->
        <div class="grid grid-cols-6 gap-2 mb-4">
          <button
            v-for="color in predefinedColors"
            :key="color"
            class="w-8 h-8 rounded-full"
            :style="{ backgroundColor: color }"
            @click="selectPresetColor(color)"
            :title="color"
          ></button>
        </div>
        <!-- Contrôles de style pour les formes standards (non TextRectangle) -->
        <div v-if="localProperties.type !== 'TextRectangle'" class="space-y-4">
          <div class="flex items-center gap-4">
            <span class="w-20 text-sm font-semibold text-gray-700">Contour</span>
            <div class="flex items-center gap-2">
              <input
                type="color"
                v-model="strokeColor"
                class="w-16 h-8 rounded border"
                @change="updateStyle({ strokeColor })"
                title="Couleur du contour"
              />
              <input
                type="range"
                v-model="strokeWidth"
                min="1"
                max="10"
                class="w-16 h-2 rounded-md"
                @change="updateStyle({ strokeWidth })"
                title="Épaisseur du contour"
              />
            </div>
          </div>
          <!-- Style de trait -->
          <div class="flex items-center gap-4">
            <span class="w-20 text-sm font-semibold text-gray-700">Style</span>
            <select
              v-model="strokeStyle"
              class="w-full rounded border"
              @change="updateStyle({ strokeStyle })"
            >
              <option v-for="style in strokeStyles" :key="style.value" :value="style.value">
                {{ style.label }}
              </option>
            </select>
          </div>
          <div v-if="showFillOptions" class="flex items-center gap-4">
            <span class="w-20 text-sm font-semibold text-gray-700">Remplir</span>
            <div class="flex items-center gap-2">
              <input
                type="color"
                v-model="fillColor"
                class="w-16 h-8 rounded border"
                @change="updateStyle({ fillColor })"
                title="Couleur de remplissage"
              />
              <input
                type="range"
                v-model="fillOpacity"
                min="0"
                max="1"
                step="0.1"
                class="w-16 h-2 rounded-md"
                @change="updateStyle({ fillOpacity })"
                title="Opacité du remplissage"
              />
            </div>
          </div>
        </div>
        <!-- Options spécifiques au TextRectangle -->
        <div v-if="localProperties.type === 'TextRectangle'" class="space-y-4">
          <!-- Contour du rectangle avec texte -->
          <div class="flex items-center gap-4">
            <span class="w-20 text-sm font-semibold text-gray-700">Contour</span>
            <div class="flex items-center gap-2">
              <input
                type="color"
                v-model="strokeColor"
                class="w-16 h-8 rounded border"
                @change="updateStyle({ strokeColor })"
                title="Couleur du contour"
              />
              <input
                type="range"
                v-model="strokeWidth"
                min="1"
                max="10"
                class="w-16 h-2 rounded-md"
                @change="updateStyle({ strokeWidth })"
                title="Épaisseur du contour"
              />
            </div>
          </div>
          <!-- Remplissage du rectangle -->
          <div class="flex items-center gap-4">
            <span class="w-20 text-sm font-semibold text-gray-700">Remplir</span>
            <div class="flex items-center gap-2">
              <input
                type="color"
                v-model="fillColor"
                class="w-16 h-8 rounded border"
                @change="updateStyle({ fillColor })"
                title="Couleur de remplissage"
              />
              <input
                type="range"
                v-model="fillOpacity"
                min="0"
                max="1"
                step="0.1"
                class="w-16 h-2 rounded-md"
                @change="updateStyle({ fillOpacity })"
                title="Opacité du remplissage"
              />
            </div>
          </div>
          <!-- Contrôles spécifiques au texte -->
          <div class="flex items-center gap-4">
            <span class="w-20 text-sm font-semibold text-gray-700">Texte</span>
            <div class="flex items-center gap-2">
              <input
                type="color"
                v-model="textColor"
                class="w-16 h-8 rounded border"
                @change="updateTextStyle({ textColor })"
                title="Couleur du texte"
              />
            </div>
          </div>
          <!-- Ajouter le contrôle de taille de police ici -->
          <div class="flex items-center gap-4">
            <span class="w-20 text-sm font-semibold text-gray-700">Taille</span>
            <div class="flex items-center gap-2 w-full">
              <select
                v-model="fontSize"
                class="w-full rounded border"
                @change="updateTextStyle({ fontSize })"
              >
                <option value="10px">Très petit</option>
                <option value="12px">Petit</option>
                <option value="14px">Normal</option>
                <option value="16px">Moyen</option>
                <option value="18px">Grand</option>
                <option value="24px">Très grand</option>
                <option value="32px">Énorme</option>
              </select>
            </div>
          </div>
          <!-- Police et alignement -->
          <div class="flex items-center gap-4">
            <span class="w-20 text-sm font-semibold text-gray-700">Police</span>
            <div class="flex items-center gap-2">
              <select
                v-model="fontFamily"
                class="w-full rounded border"
                @change="updateTextStyle({ fontFamily })"
              >
                <option value="Arial, sans-serif">Arial</option>
                <option value="'Times New Roman', serif">Times</option>
                <option value="'Courier New', monospace">Courier</option>
                <option value="Georgia, serif">Georgia</option>
                <option value="Verdana, sans-serif">Verdana</option>
              </select>
            </div>
          </div>
          <div class="flex items-center gap-4">
            <span class="w-20 text-sm font-semibold text-gray-700">Align.</span>
            <div class="flex items-center gap-2">
              <button
                v-for="align in textAlignOptions"
                :key="align.value"
                class="flex items-center justify-center p-2 rounded border"
                :class="{ 'bg-blue-50 border-blue-200 text-blue-700': currentTextAlign === align.value }"
                @click="updateTextStyle({ textAlign: align.value })"
                :title="align.label"
              >
                <span v-html="align.icon"></span>
              </button>
              <button
                class="flex items-center justify-center p-2 rounded border"
                :class="{ 'bg-blue-50 border-blue-200 text-blue-700': isBold }"
                @click="toggleBold"
                title="Gras"
              >
                B
              </button>
              <button
                class="flex items-center justify-center p-2 rounded border"
                :class="{ 'bg-blue-50 border-blue-200 text-blue-700': isItalic }"
                @click="toggleItalic"
                title="Italique"
              >
                I
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- Propriétés - Section collapsable -->
    <div v-if="selectedShape && localProperties && localProperties.type !== 'TextRectangle'" class="p-3 border-t border-gray-200">
      <button 
        class="flex items-center justify-between w-full text-sm font-semibold text-gray-700"
        @click="toggleSection('properties')"
      >
        <span>Propriétés</span>
        <svg 
          class="w-4 h-4"
          :class="{ 'rotate-180': !sectionsCollapsed.properties }"
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div v-show="!sectionsCollapsed.properties" class="mt-3">
        <div v-if="localProperties">
          <!-- Champ pour nommer la forme -->
          <div class="mb-4">
            <label for="shapeName" class="block text-sm font-medium text-gray-700 mb-1">Nom de la forme</label>
            <input 
              type="text" 
              id="shapeName" 
              v-model="shapeName" 
              @change="updateShapeName"
              placeholder="Donnez un nom à cette forme" 
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <!-- Tableau compact des propriétés pour tous les types -->
          <div class="grid grid-cols-1 gap-4">
            <!-- Cercle -->
            <template v-if="localProperties.type === 'Circle'">
              <div class="space-y-1">
                <div class="flex justify-between items-center">
                  <span class="text-sm font-semibold text-gray-700">Rayon :</span>
                  <span class="text-sm font-medium text-gray-500">{{ formatLength(localProperties.radius || 0) }}</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-sm font-semibold text-gray-700">Surface :</span>
                  <span class="text-sm font-medium text-gray-500">{{ formatArea(localProperties.surface || 0) }}</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-sm font-semibold text-gray-700">Surface totale d'irrigation :</span>
                  <span class="text-sm font-medium text-gray-500">{{ formatArea(totalCoverageArea || 0) }}</span>
                </div>
              </div>
            </template>
            <!-- Cercle avec sections -->
            <template v-else-if="localProperties.type === 'CircleWithSections'">
              <div class="space-y-1">
                <div class="flex justify-between items-center">
                  <span class="text-sm font-semibold text-gray-700">Rayon total :</span>
                  <span class="text-sm font-medium text-gray-500">{{ formatLength(localProperties.radius || 0) }}</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-sm font-semibold text-gray-700">Surface totale :</span>
                  <span class="text-sm font-medium text-gray-500">{{ formatArea(localProperties.surface || 0) }}</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-sm font-semibold text-gray-700">Surface des sections :</span>
                  <span class="text-sm font-medium text-gray-500">{{ formatArea(localProperties.sectionArea || 0) }}</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-sm font-semibold text-gray-700">Nombre de sections :</span>
                  <span class="text-sm font-medium text-gray-500">{{ circleSections.length }}</span>
                </div>
              </div>
            </template>
            <!-- Rectangle -->
            <template v-else-if="localProperties.type === 'Rectangle'">
              <div class="space-y-1">
                <!-- Add numeric input fields for width and height -->
                <div class="flex items-center mb-2">
                  <label for="rectangle-width" class="text-sm font-semibold text-gray-700 w-20">Largeur :</label>
                  <div class="flex-1 flex items-center">
                    <input 
                      id="rectangle-width" 
                      type="number" 
                      v-model="rectangleWidth"
                      min="1" 
                      step="0.01" 
                      class="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                      @change="updateRectangleDimensions"
                    />
                    <span class="text-sm text-gray-500 ml-1">m</span>
                  </div>
                </div>
                <div class="flex items-center mb-2">
                  <label for="rectangle-height" class="text-sm font-semibold text-gray-700 w-20">Hauteur :</label>
                  <div class="flex-1 flex items-center">
                    <input 
                      id="rectangle-height" 
                      type="number" 
                      v-model="rectangleHeight"
                      min="1" 
                      step="0.01" 
                      class="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                      @change="updateRectangleDimensions"
                    />
                    <span class="text-sm text-gray-500 ml-1">m</span>
                  </div>
                </div>
                
                <div class="flex justify-between items-center">
                  <span class="text-sm font-semibold text-gray-700">Surface :</span>
                  <span class="text-sm font-medium text-gray-500">{{ formatArea(localProperties.surface || 0) }}</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-sm font-semibold text-gray-700">Surface totale d'irrigation :</span>
                  <span class="text-sm font-medium text-gray-500">{{ formatArea(totalCoverageArea || 0) }}</span>
                </div>
              </div>
            </template>
            <!-- Demi-cercle -->
            <template v-else-if="localProperties.type === 'Semicircle'">
              <div class="space-y-1">
                <div class="flex justify-between items-center">
                  <span class="text-sm font-semibold text-gray-700">Rayon :</span>
                  <span class="text-sm font-medium text-gray-500">{{ formatLength(localProperties.radius || 0) }}</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-sm font-semibold text-gray-700">Surface :</span>
                  <span class="text-sm font-medium text-gray-500">{{ formatArea(localProperties.surface || 0) }}</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-sm font-semibold text-gray-700">Surface totale d'irrigation :</span>
                  <span class="text-sm font-medium text-gray-500">{{ formatArea(totalCoverageArea || 0) }}</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-sm font-semibold text-gray-700">Angle :</span>
                  <span class="text-sm font-medium text-gray-500">{{ Math.round(localProperties.openingAngle || 0) }}°</span>
                </div>
              </div>
            </template>
            <!-- Ligne -->
            <template v-else-if="localProperties.type === 'Line'">
              <span class="text-sm font-semibold text-gray-700">Longueur :</span>
              <span class="text-sm font-medium text-gray-500">{{ formatLength(localProperties.length || 0) }}</span>
            </template>
            <!-- Polygone -->
            <template v-else-if="localProperties.type === 'Polygon'">
              <div class="space-y-1">
                <div class="flex justify-between items-center">
                  <span class="text-sm font-semibold text-gray-700">Surface :</span>
                  <span class="text-sm font-medium text-gray-500">{{ formatArea(localProperties.surface || 0) }}</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-sm font-semibold text-gray-700">Surface totale d'irrigation :</span>
                  <span class="text-sm font-medium text-gray-500">{{ formatArea(totalCoverageArea || 0) }}</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-sm font-semibold text-gray-700">Périmètre :</span>
                  <span class="text-sm font-medium text-gray-500">{{ formatLength(localProperties.perimeter || 0) }}</span>
                </div>
              </div>
            </template>
            <!-- ElevationLine -->
            <template v-else-if="localProperties.type === 'ElevationLine'">
              <!-- Propriétés sur une seule colonne -->
              <div class="flex flex-col space-y-2 w-full">
                <div class="flex justify-between items-center">
                  <span class="text-sm font-semibold text-gray-700 whitespace-nowrap">Distance totale :</span>
                  <span class="text-sm font-medium text-gray-500 ml-2">{{ formatLength(localProperties.length || 0) }}</span>
                </div>
                
                <div class="flex justify-between items-center">
                  <span class="text-sm font-semibold text-gray-700 whitespace-nowrap">Dénivelé + :</span>
                  <span class="text-sm font-medium text-gray-500 ml-2">{{ formatLength(localProperties.elevationGain || 0) }}</span>
                </div>
                
                <div class="flex justify-between items-center">
                  <span class="text-sm font-semibold text-gray-700 whitespace-nowrap">Dénivelé - :</span>
                  <span class="text-sm font-medium text-gray-500 ml-2">{{ formatLength(localProperties.elevationLoss || 0) }}</span>
                </div>
                
                <div class="flex justify-between items-center">
                  <span class="text-sm font-semibold text-gray-700 whitespace-nowrap">Pente moy. :</span>
                  <span class="text-sm font-medium text-gray-500 ml-2">{{ formatSlope(localProperties.averageSlope || 0) }}</span>
                </div>
                
                <div class="flex justify-between items-center">
                  <span class="text-sm font-semibold text-gray-700 whitespace-nowrap">Pente max :</span>
                  <span class="text-sm font-medium text-gray-500 ml-2">{{ formatSlope(localProperties.maxSlope || 0) }}</span>
                </div>
              </div>

              <!-- Graphique du profil sur toute la largeur -->
              <div 
                ref="elevationProfileContainer"
                class="elevation-profile-container w-full h-48 bg-gray-50 rounded border border-gray-200 relative mt-4"
                @mousemove="handleProfileHover"
                @mouseleave="handleProfileLeave"
              >
                <canvas ref="elevationCanvas"></canvas>
              </div>
            </template>
          </div>
        </div>
        <div v-else class="text-center text-sm text-gray-500">
          Aucune propriété disponible
        </div>
      </div>
    </div>
    <!-- Section de personnalisation des points d'échantillonnage -->
    <div v-if="selectedShape && localProperties && localProperties.type === 'ElevationLine'" class="p-3 border-t border-gray-200">
      <!-- Section Points d'échantillonnage (toujours fermée par défaut) -->
      <button 
        class="flex items-center justify-between w-full text-sm font-semibold text-gray-700"
        @click="toggleSection('samplePoints')"
      >
        <span>Points d'échantillonnage</span>
        <svg 
          class="w-4 h-4"
          :class="{ 'rotate-180': !sectionsCollapsed.samplePoints }"
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div v-show="!sectionsCollapsed.samplePoints" class="mt-3">
        <!-- Points normaux -->
        <div class="mb-4">
          <h4 class="text-sm font-semibold mb-2">Points normaux</h4>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="text-xs text-gray-600">Taille</label>
              <input type="number" v-model="samplePointStyle.radius" min="2" max="10" step="1" 
                     class="w-full px-2 py-1 border rounded" @change="updateSamplePointStyle">
            </div>
            <div>
              <label class="text-xs text-gray-600">Couleur</label>
              <input type="color" v-model="samplePointStyle.color" 
                     class="w-full h-8 px-1 border rounded" @change="updateSamplePointStyle">
            </div>
            <div>
              <label class="text-xs text-gray-600">Opacité</label>
              <input type="range" v-model="samplePointStyle.fillOpacity" min="0" max="1" step="0.1" 
                     class="w-full" @change="updateSamplePointStyle">
            </div>
            <div>
              <label class="text-xs text-gray-600">Bordure</label>
              <input type="number" v-model="samplePointStyle.weight" min="1" max="5" step="1" 
                     class="w-full px-2 py-1 border rounded" @change="updateSamplePointStyle">
            </div>
          </div>
        </div>

        <!-- Points min/max -->
        <div>
          <h4 class="text-sm font-semibold mb-2">Points min/max</h4>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="text-xs text-gray-600">Taille</label>
              <input type="number" v-model="minMaxPointStyle.radius" min="4" max="12" step="1" 
                     class="w-full px-2 py-1 border rounded" @change="updateMinMaxPointStyle">
            </div>
            <div>
              <label class="text-xs text-gray-600">Bordure</label>
              <input type="number" v-model="minMaxPointStyle.weight" min="1" max="5" step="1" 
                     class="w-full px-2 py-1 border rounded" @change="updateMinMaxPointStyle">
            </div>
            <div>
              <label class="text-xs text-gray-600">Opacité</label>
              <input type="range" v-model="minMaxPointStyle.fillOpacity" min="0" max="1" step="0.1" 
                     class="w-full" @change="updateMinMaxPointStyle">
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Section des sections d'irrigation pour CircleWithSections -->
    <div v-if="selectedShape && localProperties && localProperties.type === 'CircleWithSections'" class="p-3 border-t border-gray-200">
      <button 
        class="flex items-center justify-between w-full text-sm font-semibold text-gray-700"
        @click="toggleSection('circleSections')"
      >
        <span>Sections</span>
        <svg 
          class="w-4 h-4"
          :class="{ 'rotate-180': !sectionsCollapsed.circleSections }"
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div v-show="!sectionsCollapsed.circleSections" class="mt-3">
        <!-- En-tête avec bouton d'ajout -->
        <div class="flex justify-between items-center mb-3">
          <h4 class="text-sm font-semibold">Sections d'irrigation</h4>
          <button 
            class="p-1 rounded-full bg-blue-500 text-white hover:bg-blue-600"
            @click="addSection"
            title="Ajouter une section"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
        </div>
        
        <!-- Liste des sections existantes -->
        <div v-if="circleSections.length > 0" class="space-y-3">
          <div 
            v-for="section in circleSections" 
            :key="section.id" 
            class="border rounded p-2 relative"
          >
            <!-- Barre de couleur de la section -->
            <div class="absolute top-0 left-0 w-1 h-full" :style="{ backgroundColor: section.color }"></div>
            
            <!-- Informations et contrôles de la section -->
            <div class="pl-3">
              <!-- Nom et actions de la section -->
              <div class="flex justify-between items-center mb-2">
                <div class="flex-grow min-w-0 mr-2">
                  <input 
                    type="text" 
                    v-model="section.name" 
                    class="w-full font-medium px-2 py-1 border border-gray-200 focus:border-blue-300 rounded text-sm truncate text-ellipsis"
                    @change="updateSection(section.id, { name: section.name })"
                  />
                </div>
                <button 
                  class="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 flex-shrink-0"
                  @click="removeSection(section.id)"
                  title="Supprimer la section"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <!-- Propriétés de la section -->
              <div class="grid grid-cols-2 gap-2 mb-2">
                <!-- Angles -->
                <div class="min-w-0">
                  <label class="text-xs text-gray-600 block truncate">Angle début</label>
                  <input 
                    type="number" 
                    v-model.number="section.startAngle" 
                    min="0" 
                    max="360" 
                    step="5"
                    class="w-full px-2 py-1 border rounded text-sm" 
                    @change="updateSection(section.id, { startAngle: section.startAngle })"
                  />
                </div>
                <div class="min-w-0">
                  <label class="text-xs text-gray-600 block truncate">Angle fin</label>
                  <input 
                    type="number" 
                    v-model.number="section.endAngle" 
                    min="0" 
                    max="360" 
                    step="5"
                    class="w-full px-2 py-1 border rounded text-sm" 
                    @change="updateSection(section.id, { endAngle: section.endAngle })"
                  />
                </div>
                
                <!-- Rayon et surface -->
                <div class="min-w-0">
                  <label class="text-xs text-gray-600 block truncate">Rayon (m)</label>
                  <input 
                    type="number" 
                    v-model.number="section.radius" 
                    :min="1" 
                    step="1"
                    class="w-full px-2 py-1 border rounded text-sm" 
                    @change="updateSection(section.id, { radius: section.radius })"
                  />
                </div>
                <div class="min-w-0">
                  <label class="text-xs text-gray-600 block truncate">Surface</label>
                  <div class="w-full px-2 py-1 text-sm text-gray-700 bg-gray-50 rounded truncate">
                    {{ formatArea((Math.PI * section.radius * section.radius * (section.endAngle - section.startAngle) / 360) || 0) }}
                  </div>
                </div>
                <div class="col-span-2">
                  <label class="text-xs text-gray-600 block truncate">Couleur</label>
                  <input 
                    type="color" 
                    v-model="section.color" 
                    class="w-full h-8 px-1 border rounded" 
                    @change="updateSection(section.id, { color: section.color })"
                  />
                </div>
              </div>
              
              <!-- Aperçu des angles -->
              <div class="w-full h-8 bg-gray-100 rounded relative overflow-hidden">
                <!-- Visualisation des angles -->
                <div 
                  v-if="isFullCircle(section)"
                  class="absolute h-full w-full" 
                  :style="{ 
                    backgroundColor: section.color,
                    opacity: 0.5
                  }"
                ></div>
                <div 
                  v-else
                  class="absolute h-full" 
                  :style="{ 
                    backgroundColor: section.color,
                    opacity: 0.5,
                    left: (section.startAngle / 360 * 100) + '%',
                    width: (((section.endAngle - section.startAngle + 360) % 360) / 360 * 100) + '%'
                  }"
                ></div>

                <!-- Bouton pour faire un cercle complet -->
                <button 
                  v-if="!isFullCircle(section)"
                  class="absolute right-0 top-0 p-0.5 text-xs text-gray-500 hover:text-gray-700 z-10"
                  title="Faire un cercle complet"
                  @click="makeFullCircle(section)"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>

                <!-- Repères -->
                <div class="absolute h-full w-px bg-gray-400 left-0"></div>
                <div class="absolute h-full w-px bg-gray-400 left-25%"></div>
                <div class="absolute h-full w-px bg-gray-400 left-50%"></div>
                <div class="absolute h-full w-px bg-gray-400 left-75%"></div>
                <div class="absolute h-full w-px bg-gray-400 right-0"></div>
                <!-- Labels repères -->
                <div class="absolute text-xs bottom-0 left-0 text-gray-600">0°</div>
                <div class="absolute text-xs bottom-0 left-25% -ml-2 text-gray-600">90°</div>
                <div class="absolute text-xs bottom-0 left-50% -ml-2 text-gray-600">180°</div>
                <div class="absolute text-xs bottom-0 left-75% -ml-2 text-gray-600">270°</div>
                <div class="absolute text-xs bottom-0 right-0 -mr-6 text-gray-600">360°</div>
              </div>

              <!-- Badge indiquant si c'est un cercle complet -->
              <div v-if="isFullCircle(section)" class="mt-1 text-xs text-center p-1 bg-blue-100 text-blue-800 rounded">
                Cercle complet (360°)
              </div>
            </div>
          </div>
        </div>
        
        <!-- Message si aucune section -->
        <div v-else class="text-center text-sm text-gray-500 py-2">
          Aucune section d'irrigation définie.
          <br>
          Cliquez sur le bouton + pour en ajouter.
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useDrawingStore } from '@/stores/drawing'

const drawingTools = [
  { type: 'polygon', label: 'Polygone' },
  { type: 'line', label: 'Ligne' },
  { type: 'elevation', label: 'Profil altimétrique' },
  { type: 'note', label: 'Note géolocalisée' }
]

const getToolIcon = (type: string) => {
  switch (type) {
    case 'polygon':
      return '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5l16 0l0 14l-16 0l0 -14z"/></svg>'
    case 'line':
      return '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 20l16 -16"/></svg>'
    case 'elevation':
      return '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 20h18l-3-3l-4 4l-4-7l-4 4l-3-3"/></svg>'
    case 'note':
      return '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>'
  }
}

// Propriétés pour les notes géolocalisées
const noteProperties = ref({
  title: '',
  description: '',
  visibility: 'private', // private, enterprise, employee, visitor
  attachments: [] as File[],
  location: null as any
})

// Permissions de visibilité selon le rôle de l'utilisateur
const visibilityOptions = computed(() => {
  const userType = useAuthStore().user?.user_type
  switch (userType) {
    case 'admin':
    case 'entreprise':
      return [
        { value: 'private', label: 'Privé' },
        { value: 'enterprise', label: 'Entreprise' },
        { value: 'employee', label: 'Salariés' },
        { value: 'visitor', label: 'Visiteurs' }
      ]
    case 'salarie':
      return [
        { value: 'private', label: 'Privé' },
        { value: 'employee', label: 'Salariés' },
        { value: 'visitor', label: 'Visiteurs' }
      ]
    default:
      return [
        { value: 'private', label: 'Privé' }
      ]
  }
})

// ... rest of the existing style code ...
</script>
<style scoped>
.h-full {
  height: 100%;
}
.flex {
  display: flex;
}
.flex-col {
  flex-direction: column;
}
.bg-white {
  background-color: white;
}
.overflow-y-auto {
  overflow-y: auto;
}
.p-3 {
  padding: 1rem;
}
.border-b {
  border-bottom: 1px solid #e2e8f0;
}
.text-sm {
  font-size: 0.875rem;
}
.font-semibold {
  font-weight: 600;
}
.text-gray-700 {
  color: #334155;
}
.sidebar-header {
  padding: 10px;
  background-color: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.sidebar-title {
  font-size: 16px;
  font-weight: 600;
  color: #334155;
  margin: 0;
}
.tools-section {
  padding: 10px;
}
.tools-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 5px;
}
.tool-button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 5px;
  border-radius: 4px;
  border: 1px solid #cbd5e1;
  background-color: white;
  color: #475569;
  transition: all 0.2s;
}
.tool-button:hover {
  background-color: #f1f5f9;
}
.tool-button.active {
  background-color: #e0f2fe;
  border-color: #7dd3fc;
  color: #0284c7;
}
.delete-button {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 5px;
  padding: 5px;
  width: 100%;
  border-radius: 4px;
  border: 1px solid #f87171;
  background-color: #fee2e2;
  color: #ef4444;
  transition: all 0.2s;
}
.delete-button:hover {
  background-color: #fecaca;
}
.delete-button.active {
  background-color: #fca5a5;
}
.sidebar-divider {
  height: 1px;
  background-color: #e2e8f0;
  margin: 0 10px;
}
.properties-container {
  padding: 10px;
  flex: 1;
  overflow-y: auto;
  max-height: calc(100vh - 200px); /* Ensure it doesn't overflow the viewport */
}
.sidebar-section {
  margin-bottom: 10px;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
}
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 8px 10px;
  background-color: #f8fafc;
  border: none;
  text-align: left;
  cursor: pointer;
}
.section-title {
  font-size: 14px;
  font-weight: 500;
  color: #334155;
}
.section-icon {
  width: 16px;
  height: 16px;
  transition: transform 0.2s;
}
.section-content {
  padding: 10px;
  background-color: white;
  max-height: 350px; /* Add max height to ensure it's scrollable */
  overflow-y: auto; /* Make it scrollable when content overflows */
}
/* Specific styles for text controls to ensure they're visible */
.text-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-bottom: 10px; /* Add padding to ensure last items are visible */
}
/* Ensure the style section expands when TextRectangle is selected */
.sidebar-section:has(.text-controls) .section-content {
  min-height: 250px;
}
.color-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 5px;
  margin-bottom: 10px;
}
.color-button {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1px solid #e2e8f0;
  cursor: pointer;
  transition: transform 0.2s;
}
.color-button:hover {
  transform: scale(1.2);
}
.style-controls, .text-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.control-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.control-label {
  width: 60px;
  font-size: 12px;
  color: #64748b;
}
.control-inputs {
  display: flex;
  flex: 1;
  gap: 5px;
  align-items: center;
}
.color-input {
  width: 20px;
  height: 20px;
  padding: 0;
  border: 1px solid #e2e8f0;
  cursor: pointer;
}
.range-input {
  flex: 1;
  height: 4px;
}
.select-input {
  width: 100%;
  padding: 2px 5px;
  font-size: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 3px;
  background-color: white;
}
.button-group {
  display: flex;
  border: 1px solid #e2e8f0;
  border-radius: 3px;
  overflow: hidden;
}
.align-button, .style-button {
  padding: 2px 6px;
  font-size: 12px;
  background-color: white;
  border: none;
  border-right: 1px solid #e2e8f0;
}
.align-button:last-child, .style-button:last-child {
  border-right: none;
}
.align-button.active, .style-button.active {
  background-color: #e0f2fe;
  color: #0284c7;
}
.properties-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5px;
}
.property-label {
  font-size: 12px;
  color: #64748b;
}
.property-value {
  font-size: 12px;
  font-weight: 500;
  color: #334155;
  text-align: right;
}
.no-properties {
  text-align: center;
  color: #94a3b8;
  font-size: 12px;
  padding: 10px 0;
}
/* Pour les écrans plus petits */
@media (max-width: 640px) {
  .drawing-tools-sidebar {
    width: 200px;
  }
  .sidebar-title {
    font-size: 14px;
  }
  .tool-button, .color-button {
    width: 18px;
    height: 18px;
  }
  .control-label {
    width: 50px;
    font-size: 10px;
  }
  .property-label, .property-value {
    font-size: 10px;
  }
}
/* Animations */
.rotate-180 {
  transform: rotate(180deg);
}
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 100%;
  height: 24px;
}
.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}
.switch-label {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #e2e8f0;
  border-radius: 12px;
  transition: .4s;
  text-align: center;
  line-height: 24px;
  font-size: 12px;
  color: #475569;
}
.switch-label:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  border-radius: 50%;
  transition: .4s;
}
input:checked + .switch-label {
  background-color: #3b82f6;
  color: white;
}
input:checked + .switch-label:before {
  transform: translateX(calc(100% - 6px));
}
input:focus + .switch-label {
  box-shadow: 0 0 1px #3b82f6;
}
/* Styles pour les inputs de type range */
input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: #e2e8f0;
  outline: none;
}
input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #3B82F6;
  cursor: pointer;
}
/* Styles pour les inputs de type color */
input[type="color"] {
  -webkit-appearance: none;
  appearance: none;
  padding: 0;
  border: none;
  border-radius: 4px;
  height: 32px;
}
input[type="color"]::-webkit-color-swatch-wrapper {
  padding: 0;
}
input[type="color"]::-webkit-color-swatch {
  border: none;
  border-radius: 4px;
}
.elevation-profile-container {
  width: 100% !important;
  height: 200px;
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  position: relative;
  overflow: hidden;
  margin-top: 1rem;
}

canvas {
  width: 100% !important;
  height: 100%;
  display: block;
}

.elevation-tooltip {
  z-index: 1000;
  white-space: nowrap;
}

/* Ajout de styles pour les propriétés */
.whitespace-nowrap {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Ajuster la largeur de la section des propriétés */
.properties-container {
  min-width: 280px;
  padding: 1rem;
}

/* Ajuster l'espacement des propriétés */
.space-y-2 > * + * {
  margin-top: 0.5rem;
}

/* Ajuster l'espacement entre le label et la valeur */
.flex.justify-between > .ml-2 {
  margin-left: 1rem;
}

/* Ajout pour les sections du cercle */
.left-25\% {
  left: 25%;
}

.left-50\% {
  left: 50%;
}

.left-75\% {
  left: 75%;
}

.-ml-2 {
  margin-left: -0.5rem;
}

.-mr-6 {
  margin-right: -1.5rem;
}

/* Add styles for the tooltip that shows when groups are connected */
:global(.connected-group-tooltip) {
  background-color: rgba(59, 130, 246, 0.9);
  color: white;
  font-weight: bold;
  border: none;
  padding: 5px 10px;
  border-radius: 15px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
}

:global(.connected-group-tooltip::before) {
  display: none;
}

:global(.connected-group-tooltip div) {
  text-align: center;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Support for pattern display */
.pattern-dot {
  background-image: radial-gradient(circle, #3B82F6 1px, transparent 1px);
  background-size: 5px 5px;
}
</style> 