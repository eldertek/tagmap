<template>
  <div class="container mx-auto px-4 py-8">
    <div class="mb-8">
      <h1 class="text-3xl font-bold mb-4">Météo</h1>

      <!-- Sélecteur d'entreprise (uniquement pour les admins) -->
      <div v-if="isAdmin" class="mb-6">
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Sélectionner une entreprise
        </label>
        <div class="flex gap-4">
          <select
            v-model="selectedCompany"
            class="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            :disabled="!companies.length"
            @change="fetchDevicesWithCompany"
          >
            <option v-if="!companies.length" value="">Chargement des entreprises...</option>
            <option
              v-for="company in companies"
              :key="company.id"
              :value="company.id"
            >
              {{ company.company_name || `${company.first_name} ${company.last_name}` }}
            </option>
          </select>
        </div>
      </div>

      <!-- Message d'erreur API -->
      <div v-if="apiError" class="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-red-800">{{ apiError }}</h3>
          </div>
        </div>
      </div>

      <!-- Sélecteur d'appareils -->
      <div class="mb-6">
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Sélectionner une station
        </label>
        <div class="flex gap-4">
          <select
            v-model="selectedDevice"
            class="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            :disabled="Boolean(!devices.length || apiError)"
          >
            <option v-if="!devices.length && !apiError" value="">Chargement des stations...</option>
            <option v-if="apiError" value="">Aucune station disponible</option>
            <option
              v-for="device in devices"
              :key="device.mac"
              :value="device.mac"
            >
              {{ device.name }} ({{ device.model }} - v{{ device.firmware_version }})
            </option>
          </select>
          <button
            @click="fetchWeatherData"
            class="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            :disabled="Boolean(!selectedDevice || apiError)"
          >
            Actualiser
          </button>
        </div>

        <!-- Informations sur la station sélectionnée -->
        <div v-if="selectedDeviceInfo" class="mt-4 bg-white rounded-lg shadow-md p-4">
          <h3 class="text-lg font-semibold mb-2">Informations sur la station</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div>
              <span class="text-gray-500">Modèle:</span>
              <p class="font-medium">{{ selectedDeviceInfo.model }}</p>
            </div>
            <div>
              <span class="text-gray-500">Version:</span>
              <p class="font-medium">{{ selectedDeviceInfo.firmware_version }}</p>
            </div>
            <div>
              <span class="text-gray-500">ID:</span>
              <p class="font-medium">{{ selectedDeviceInfo.id }}</p>
            </div>
            <div>
              <span class="text-gray-500">MAC:</span>
              <p class="font-medium">{{ selectedDeviceInfo.mac }}</p>
            </div>
            <div>
              <span class="text-gray-500">Fuseau horaire:</span>
              <p class="font-medium">{{ selectedDeviceInfo.timezone }}</p>
            </div>
            <div>
              <span class="text-gray-500">Installation:</span>
              <p class="font-medium">{{ new Date(selectedDeviceInfo.created_at).toLocaleDateString() }}</p>
            </div>
            <div class="md:col-span-2 lg:col-span-3 flex items-center">
              <span class="text-gray-500 mr-2">Position:</span>
              <a
                v-if="hasLocation(selectedDeviceInfo)"
                :href="getGoogleMapsUrl(selectedDeviceInfo)"
                target="_blank"
                class="text-primary-600 hover:text-primary-800 flex items-center"
                title="Ouvrir dans Google Maps"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
                </svg>
                {{ formatCoordinates(selectedDeviceInfo) }}
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- Onglets -->
      <div class="mb-6">
        <div class="border-b border-gray-200">
          <nav class="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              @click="currentTab = tab.id"
              :class="[
                currentTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm'
              ]"
            >
              {{ tab.name }}
            </button>
          </nav>
        </div>
      </div>

      <!-- Contenu des onglets -->
      <div v-if="currentTab === 'realtime'" class="mb-8">
        <!-- Dernière mise à jour -->
        <p class="text-sm text-gray-600 mb-4">
          Dernière mise à jour : {{ lastUpdate ? new Date(lastUpdate).toLocaleString() : 'Jamais' }}
        </p>

        <!-- Grille de widgets météo -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <!-- Widget Température -->
          <div class="bg-white rounded-lg shadow-md p-6">
            <h2 class="text-xl font-semibold mb-4">Température Extérieure</h2>
            <div class="text-4xl font-bold text-primary-600 mb-2">
              {{ formatTemperature(weatherData.outdoor?.temperature?.value) }}°C
            </div>
            <div class="text-sm text-gray-600">
              Min: {{ formatTemperature(weatherData.outdoor?.temperature?.min || '0') }}°C
              Max: {{ formatTemperature(weatherData.outdoor?.temperature?.max || '0') }}°C
            </div>
          </div>

          <!-- Widget Humidité -->
          <div class="bg-white rounded-lg shadow-md p-6">
            <h2 class="text-xl font-semibold mb-4">Humidité</h2>
            <div class="text-4xl font-bold text-primary-600 mb-2">
              {{ weatherData.outdoor?.humidity?.value || '0' }}%
            </div>
            <div class="mt-4">
              <div class="w-full bg-gray-200 rounded-full h-2.5">
                <div class="bg-primary-600 h-2.5 rounded-full" :style="{ width: `${weatherData.outdoor?.humidity?.value || 0}%` }"></div>
              </div>
            </div>
          </div>

          <!-- Widget Pression -->
          <div class="bg-white rounded-lg shadow-md p-6">
            <h2 class="text-xl font-semibold mb-4">Pression Atmosphérique</h2>
            <div class="text-4xl font-bold text-primary-600 mb-2">
              {{ formatPressure(weatherData.pressure?.absolute?.value) }} hPa
            </div>
            <div class="text-sm text-gray-600">
              Tendance: {{ getPressureTrend(weatherData.pressure?.absolute?.trend) }}
            </div>
          </div>

          <!-- Widget Vent -->
          <div class="bg-white rounded-lg shadow-md p-6">
            <h2 class="text-xl font-semibold mb-4">Vent</h2>
            <div class="text-4xl font-bold text-primary-600 mb-2">
              {{ formatWindSpeed(weatherData.wind?.speed?.value || weatherData.wind?.wind_speed?.value) }} km/h
            </div>
            <div class="text-sm text-gray-600">
              Direction: {{ formatWindDirection(weatherData.wind?.direction?.value || weatherData.wind?.wind_direction?.value) }}
              <br>
              Rafales: {{ formatWindSpeed(weatherData.wind?.gust?.value || weatherData.wind?.wind_gust?.value) }} km/h
            </div>
          </div>

          <!-- Widget Précipitations -->
          <div class="bg-white rounded-lg shadow-md p-6">
            <h2 class="text-xl font-semibold mb-4">Précipitations</h2>
            <div class="text-4xl font-bold text-primary-600 mb-2">
              {{ formatRainfall(weatherData.rainfall?.daily?.value) }} mm
            </div>
            <div class="text-sm text-gray-600">
              Taux: {{ formatRainfall(weatherData.rainfall?.rate?.value || weatherData.rainfall?.rain_rate?.value) }} mm/h
              <br>
              Mensuel: {{ formatRainfall(weatherData.rainfall?.monthly?.value) }} mm
            </div>
          </div>

          <!-- Widget Rayonnement -->
          <div class="bg-white rounded-lg shadow-md p-6">
            <h2 class="text-xl font-semibold mb-4">Rayonnement</h2>
            <div class="text-4xl font-bold text-primary-600 mb-2">
              {{ weatherData.solar_and_uvi?.solar?.value || '0' }} W/m²
            </div>
            <div class="text-sm text-gray-600">
              UV: {{ weatherData.solar_and_uvi?.uvi?.value || '0' }}
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="currentTab === 'history'" class="mb-8">
        <!-- Sélecteurs de période et type de données -->
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-semibold">Données historiques</h2>
          <div class="flex items-center gap-4">
            <div v-if="lastRefresh" class="text-sm text-gray-600">
              Dernière mise à jour: {{ lastRefresh }}
            </div>
            <button
              @click="updateAllCharts"
              class="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              :disabled="!selectedDevice"
            >
              Actualiser
            </button>
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Période
            </label>
            <select
              v-model="historyPeriod"
              class="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="today">Aujourd'hui</option>
              <option value="yesterday">Hier</option>
              <option value="week">7 derniers jours</option>
              <option value="month">30 derniers jours</option>
              <option value="custom">Période personnalisée</option>
            </select>
          </div>

          <div v-if="historyPeriod === 'custom'" class="md:col-span-2 grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Date de début
              </label>
              <input
                type="date"
                v-model="customStartDate"
                class="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Date de fin
              </label>
              <input
                type="date"
                v-model="customEndDate"
                class="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Intervalle
            </label>
            <select
              v-model="historyInterval"
              class="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option 
                v-for="interval in availableIntervals" 
                :key="interval.value" 
                :value="interval.value"
              >
                {{ interval.label }}
              </option>
            </select>
            <div v-if="periodIntervalError" class="mt-1 text-sm text-red-600">
              {{ periodIntervalError }}
            </div>
          </div>
        </div>

        <!-- Graphiques -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Température -->
          <div class="bg-white rounded-lg shadow-md p-6">
            <h3 class="text-lg font-semibold mb-4">Température</h3>
            <div class="chart-container">
              <canvas ref="tempChart"></canvas>
            </div>
          </div>

          <!-- Humidité -->
          <div class="bg-white rounded-lg shadow-md p-6">
            <h3 class="text-lg font-semibold mb-4">Humidité</h3>
            <div class="chart-container">
              <canvas ref="humidityChart"></canvas>
            </div>
          </div>

          <!-- Pression -->
          <div class="bg-white rounded-lg shadow-md p-6">
            <h3 class="text-lg font-semibold mb-4">Pression</h3>
            <div class="chart-container">
              <canvas ref="pressureChart"></canvas>
            </div>
          </div>

          <!-- Vent -->
          <div class="bg-white rounded-lg shadow-md p-6">
            <h3 class="text-lg font-semibold mb-4">Vent</h3>
            <div class="chart-container">
              <canvas ref="windChart"></canvas>
            </div>
          </div>

          <!-- Précipitations -->
          <div class="bg-white rounded-lg shadow-md p-6">
            <h3 class="text-lg font-semibold mb-4">Précipitations</h3>
            <div class="chart-container">
              <canvas ref="rainChart"></canvas>
            </div>
          </div>

          <!-- Rayonnement -->
          <div class="bg-white rounded-lg shadow-md p-6">
            <h3 class="text-lg font-semibold mb-4">Rayonnement</h3>
            <div class="chart-container">
              <canvas ref="solarChart"></canvas>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { useNotificationStore } from '@/stores/notification';
import { useAuthStore } from '@/stores/auth';
import { weatherService, userService } from '@/services/api';
import Chart from 'chart.js/auto';
import 'chartjs-adapter-date-fns';

const notificationStore = useNotificationStore();
const authStore = useAuthStore();
const weatherData = ref<any>({});
const lastUpdate = ref<Date>(new Date());
const lastRefresh = ref<string>('');
const devices = ref<any[]>([]);
const selectedDevice = ref<string>('');
const companies = ref<any[]>([]);
const selectedCompany = ref<number | null>(null);
const apiError = ref<string>('');
const periodIntervalError = ref('');

// Vérifier si l'utilisateur est admin
const isAdmin = computed(() => authStore.isAdmin);
let updateInterval: number | null = null;

const selectedDeviceInfo = computed(() => {
  if (!selectedDevice.value || !devices.value.length) return null;
  return devices.value.find(d => d.mac === selectedDevice.value);
});

// Vérifie si l'appareil a des coordonnées GPS valides
function hasLocation(device: any): boolean {
  if (!device) return false;
  return device.latitude && device.longitude &&
         device.latitude !== 0 && device.longitude !== 0;
}

// Formate les coordonnées GPS pour l'affichage
function formatCoordinates(device: any): string {
  if (!hasLocation(device)) return '';
  return `${device.latitude.toFixed(6)}, ${device.longitude.toFixed(6)}`;
}

// Génère l'URL Google Maps pour les coordonnées
function getGoogleMapsUrl(device: any): string {
  if (!hasLocation(device)) return '#';

  const latitude = device.latitude;
  const longitude = device.longitude;
  const name = encodeURIComponent(device.name || 'Station météo');

  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}&query_place_id=${name}`;
}

// Fonction pour récupérer la liste des appareils
async function fetchDevices() {
  try {
    // Réinitialiser l'erreur API
    apiError.value = '';

    // Préparer les paramètres de la requête
    const params: any = {};

    // Si l'utilisateur est admin et qu'une entreprise est sélectionnée
    if (isAdmin.value && selectedCompany.value) {
      params.entreprise = selectedCompany.value;
    }

    console.log('[fetchDevices] Appel API avec params:', params);
    const response = await weatherService.getDevices(params);
    console.log('[fetchDevices] Réponse API:', response.data);
    
    // Extraire les appareils de la réponse
    let devicesData;
    if (response.data && response.data.devices) {
      // Si la réponse contient un tableau d'appareils sous la clé 'devices'
      devicesData = response.data.devices;
    } else if (Array.isArray(response.data)) {
      // Si la réponse est directement un tableau d'appareils
      devicesData = response.data;
    } else {
      // Fallback: essayer d'extraire des données de la réponse
      devicesData = [];
      
      if (typeof response.data === 'object' && response.data !== null) {
        // Parcourir les propriétés de l'objet response.data
        for (const key in response.data) {
          if (Array.isArray(response.data[key])) {
            devicesData = response.data[key];
            break;
          }
        }
      }
    }
    
    // Traiter les données des appareils pour normaliser leur format
    devices.value = devicesData.map((device: any) => {
      return {
        id: device.id,
        name: device.name || `Station ${device.mac}`,
        mac: device.mac,
        model: device.stationtype?.split('_')[0] || 'Inconnu',
        firmware_version: device.stationtype?.includes('_V') ? device.stationtype.split('_V')[1] : '1.0',
        timezone: device.date_zone_id || 'UTC',
        created_at: device.createtime ? new Date(device.createtime * 1000).toISOString() : new Date().toISOString(),
        latitude: device.latitude || 0,
        longitude: device.longitude || 0
      };
    });
    
    console.log('[fetchDevices] Appareils normalisés:', devices.value);
    
    if (devices.value.length > 0) {
      selectedDevice.value = devices.value[0].mac;
      await fetchWeatherData();
    } else {
      console.warn('[fetchDevices] Aucun appareil disponible');
    }
  } catch (error: any) {
    console.error('[fetchDevices] Erreur lors de la récupération des appareils:', error);

    // Vérifier si l'erreur contient un message spécifique de l'API
    if (error.response && error.response.data && error.response.data.error) {
      apiError.value = error.response.data.error;
    } else {
      apiError.value = 'Erreur lors de la récupération des stations météo';
      notificationStore.error('Erreur lors de la récupération des stations météo');
    }

    // Réinitialiser les données
    devices.value = [];
    selectedDevice.value = '';
    weatherData.value = {};
  }
}

// Fonction pour récupérer les données météo
async function fetchWeatherData() {
  if (!selectedDevice.value) return;

  try {
    // Réinitialiser l'erreur API
    apiError.value = '';

    // Préparer les paramètres de la requête
    const params: any = {
      mac: selectedDevice.value
    };

    // Si l'utilisateur est admin et qu'une entreprise est sélectionnée
    if (isAdmin.value && selectedCompany.value) {
      params.entreprise = selectedCompany.value;
    }

    console.log('[fetchWeatherData] Appel API avec params:', params);
    const response = await weatherService.getRealTimeData(params);
    console.log('[fetchWeatherData] Réponse API:', response.data);
    
    // Analyser la structure de la réponse
    console.log('[fetchWeatherData] Structure de la réponse:', {
      hasData: response.data && 'data' in response.data,
      hasCode: response.data && 'code' in response.data,
      topLevelKeys: response.data ? Object.keys(response.data) : []
    });
    
    // Extraire les données de météo selon la structure de la réponse
    let extractedData;
    
    if (response.data && 'data' in response.data) {
      // Format standard: { code, msg, time, data }
      extractedData = response.data.data;
    } else if (response.data && ('outdoor' in response.data || 'indoor' in response.data)) {
      // Format alternatif: données directement au premier niveau
      extractedData = response.data;
    } else {
      // Aucun format reconnu, utiliser un objet vide
      extractedData = {};
      console.warn('[fetchWeatherData] Format de réponse non reconnu');
    }
    
    // Mettre à jour les données météo
    weatherData.value = extractedData;
    lastUpdate.value = new Date();
    
    console.log('[fetchWeatherData] Données météo extraites:', weatherData.value);
  } catch (error: any) {
    console.error('[fetchWeatherData] Erreur:', error);

    // Vérifier si l'erreur contient un message spécifique de l'API
    if (error.response && error.response.data && error.response.data.error) {
      apiError.value = error.response.data.error;
    } else {
      apiError.value = 'Erreur lors de la récupération des données météo';
      notificationStore.error('Erreur lors de la récupération des données météo');
    }

    // Réinitialiser les données
    weatherData.value = {};
  }
}

// Fonctions de formatage
function formatTemperature(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '0';
  
  // Convertir en nombre si c'est une chaîne
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  // Vérifier si c'est un nombre valide
  if (isNaN(numValue)) return '0';
  
  // Convertir de Fahrenheit en Celsius
  return ((numValue - 32) * 5/9).toFixed(1);
}

function formatWindSpeed(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '0';
  
  // Convertir en nombre si c'est une chaîne
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  // Vérifier si c'est un nombre valide
  if (isNaN(numValue)) return '0';
  
  // Convertir de mph en km/h
  return (numValue * 1.60934).toFixed(1);
}

function formatRainfall(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '0';
  
  // Convertir en nombre si c'est une chaîne
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  // Vérifier si c'est un nombre valide
  if (isNaN(numValue)) return '0';
  
  // Convertir de in en mm
  return (numValue * 25.4).toFixed(1);
}

function formatPressure(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '0';
  
  // Convertir en nombre si c'est une chaîne
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  // Vérifier si c'est un nombre valide
  if (isNaN(numValue)) return '0';
  
  // Convertir de inHg en hPa (1 inHg = 33.8639 hPa)
  return (numValue * 33.8639).toFixed(1);
}

function formatWindDirection(degrees: number): string {
  if (!degrees) return 'N/A';
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

function getPressureTrend(trend: number): string {
  if (!trend) return 'Stable';
  if (trend > 0) return 'En hausse';
  return 'En baisse';
}

// Fonction pour récupérer la liste des entreprises (pour les admins)
async function fetchCompanies() {
  if (!isAdmin.value) return;

  try {
    const response = await userService.getUsers({ role: 'ENTREPRISE' });
    companies.value = response.data;

    // Si des entreprises sont disponibles, sélectionner la première par défaut
    if (companies.value.length > 0 && !selectedCompany.value) {
      selectedCompany.value = companies.value[0].id;
    }
  } catch (error) {
    console.error('Erreur lors de la récupération des entreprises:', error);
    notificationStore.error('Erreur lors de la récupération des entreprises');
  }
}

// Fonction pour récupérer les appareils avec l'entreprise sélectionnée
async function fetchDevicesWithCompany() {
  try {
    // Réinitialiser les données
    devices.value = [];
    selectedDevice.value = '';
    weatherData.value = {};
    apiError.value = '';

    // Réinitialiser aussi les graphiques
    Object.values(charts).forEach(chart => {
      try {
        chart.destroy();
      } catch (e) {
        console.error('Erreur lors de la destruction d\'un graphique:', e);
      }
    });
    charts = {};

    // Récupérer les appareils
    await fetchDevices();
  } catch (error) {
    console.error('Erreur lors de la récupération des appareils avec l\'entreprise:', error);
    notificationStore.error('Erreur lors du changement d\'entreprise');
  }
}

// Configuration des onglets
const tabs = [
  { id: 'realtime', name: 'Temps réel' },
  { id: 'history', name: 'Historique' }
];
const currentTab = ref('realtime');

// Configuration de l'historique
const historyPeriod = ref('today');
const historyInterval = ref('5min');
const customStartDate = ref('');
const customEndDate = ref('');

// Initialiser les dates personnalisées avec des valeurs par défaut
const initializeCustomDates = () => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  
  customStartDate.value = yesterday.toISOString().split('T')[0];
  customEndDate.value = yesterday.toISOString().split('T')[0];
};

// Définir tous les intervalles possibles
const allIntervals = [
  { value: '5min', label: '5 minutes', maxDays: 1, maxPastDays: 90 },
  { value: '30min', label: '30 minutes', maxDays: 7, maxPastDays: 365 },
  { value: '4hour', label: '4 heures', maxDays: 31, maxPastDays: 730 },
  { value: '1day', label: '1 jour', maxDays: 365, maxPastDays: 1460 }
];

// Computed pour filtrer les intervalles disponibles selon la période sélectionnée
const availableIntervals = computed(() => {
  const dates = getHistoryDates();
  const start = new Date(dates.start);
  const end = new Date(dates.end);
  end.setHours(23, 59, 59, 999); // Fin de la journée
  
  // Calculer la différence en jours
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // Calculer l'ancienneté en jours
  const now = new Date();
  const pastTime = Math.abs(now.getTime() - start.getTime());
  const pastDays = Math.ceil(pastTime / (1000 * 60 * 60 * 24));
  
  // Filtrer les intervalles valides
  return allIntervals.filter(interval => {
    return diffDays <= interval.maxDays && pastDays <= interval.maxPastDays;
  });
});

// Surveiller les changements de période pour ajuster l'intervalle si nécessaire
watch(historyPeriod, (newValue) => {
  // Si on passe à la période personnalisée, initialiser les dates
  if (newValue === 'custom') {
    initializeCustomDates();
  }
  
  // Vérifier si l'intervalle actuel est toujours valide avec la nouvelle période
  const isCurrentIntervalValid = availableIntervals.value.some(
    interval => interval.value === historyInterval.value
  );
  
  // Si l'intervalle n'est plus valide, sélectionner le premier intervalle disponible
  if (!isCurrentIntervalValid && availableIntervals.value.length > 0) {
    historyInterval.value = availableIntervals.value[0].value;
  }
});

// Surveiller les changements des dates personnalisées pour ajuster l'intervalle
watch([customStartDate, customEndDate], () => {
  if (historyPeriod.value === 'custom') {
    // Vérifier si l'intervalle actuel est toujours valide avec les nouvelles dates
    const isCurrentIntervalValid = availableIntervals.value.some(
      interval => interval.value === historyInterval.value
    );
    
    // Si l'intervalle n'est plus valide, sélectionner le premier intervalle disponible
    if (!isCurrentIntervalValid && availableIntervals.value.length > 0) {
      historyInterval.value = availableIntervals.value[0].value;
    }
  }
});

// Références pour les graphiques
const tempChart = ref<HTMLCanvasElement | null>(null);
const humidityChart = ref<HTMLCanvasElement | null>(null);
const pressureChart = ref<HTMLCanvasElement | null>(null);
const windChart = ref<HTMLCanvasElement | null>(null);
const rainChart = ref<HTMLCanvasElement | null>(null);
const solarChart = ref<HTMLCanvasElement | null>(null);

// Instances des graphiques
let charts: { [key: string]: Chart } = {};

// Calcul des dates pour l'historique
const getHistoryDates = () => {
  let start = new Date();
  let end = new Date();

  switch (historyPeriod.value) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      break;
    case 'yesterday':
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      break;
    case 'week':
      start.setDate(start.getDate() - 7);
      break;
    case 'month':
      start.setDate(start.getDate() - 30);
      break;
    case 'custom':
      start = new Date(customStartDate.value);
      end = new Date(customEndDate.value);
      break;
  }

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0]
  };
};

// Fonction pour mettre à jour tous les graphiques
const updateAllCharts = async () => {
  try {
    // Éviter les mises à jour simultanées
    if (isUpdatingCharts.value) {
      console.log('[updateAllCharts] Mise à jour déjà en cours, annulation');
      return;
    }
    
    isUpdatingCharts.value = true;
    
    // Vérifier que l'intervalle choisi est disponible pour la période
    if (availableIntervals.value.length === 0) {
      notificationStore.warning("Aucun intervalle disponible pour cette période");
      isUpdatingCharts.value = false;
      return;
    }
    
    // Vérifier que l'intervalle sélectionné est valide
    const isValidInterval = availableIntervals.value.some(interval => interval.value === historyInterval.value);
    if (!isValidInterval) {
      // Sélectionner automatiquement le premier intervalle disponible
      historyInterval.value = availableIntervals.value[0].value;
    }
    
    console.log('[updateAllCharts] Début de la mise à jour des graphiques');

    // Récupérer les dates pour l'historique
    const dates = getHistoryDates();

    // Préparer les paramètres de la requête
    const params: any = {
      mac: selectedDevice.value,
      start_date: dates.start,
      end_date: dates.end,
      cycle_type: historyInterval.value
    };

    // Si l'utilisateur est admin et qu'une entreprise est sélectionnée
    if (isAdmin.value && selectedCompany.value) {
      params.entreprise = selectedCompany.value;
    }

    console.log(`[updateAllCharts] Récupération des données historiques:`, params);
    
    try {
      // Faire un unique appel pour récupérer toutes les données historiques
      const response = await weatherService.getHistoryData(params);
      const allHistoryData = response.data;
      
      console.log(`[updateAllCharts] Données historiques reçues:`, allHistoryData);
      
      // Types de graphiques avec leurs références et types de données correspondants
      const chartConfigs = [
        { type: 'temp', ref: tempChart },
        { type: 'humidity', ref: humidityChart },
        { type: 'pressure', ref: pressureChart },
        { type: 'wind', ref: windChart },
        { type: 'rain', ref: rainChart },
        { type: 'solar', ref: solarChart }
      ];
      
      // Mettre à jour chaque graphique avec les données déjà récupérées
      for (const config of chartConfigs) {
        console.log(`[updateAllCharts] Mise à jour du graphique ${config.type}`);
        if (config.ref.value) {
          const formattedData = formatHistoryDataForChart(allHistoryData, config.type);
          updateChart(config.type, config.ref.value, formattedData);
        }
      }
      
      // Mettre à jour le timestamp de dernière mise à jour
      lastRefresh.value = new Date().toLocaleString();
    } catch (error) {
      console.error(`[updateAllCharts] Erreur lors de la récupération des données:`, error);
      notificationStore.error("Erreur lors de la récupération des données historiques");
    } finally {
      isUpdatingCharts.value = false;
    }
  } catch (error) {
    console.error('[updateAllCharts] Erreur lors de la mise à jour des graphiques:', error);
    notificationStore.error('Erreur lors de la mise à jour des graphiques');
    isUpdatingCharts.value = false;
  }
};

// Variable pour éviter les mises à jour simultanées
const isUpdatingCharts = ref(false);

// Fonction pour mettre à jour un graphique spécifique
const updateChart = (type: string, chartElement: HTMLCanvasElement, data: any) => {
  try {
    // Détruire le graphique existant s'il existe
    if (charts[type]) {
      charts[type].destroy();
      // S'assurer que la référence est supprimée
      delete charts[type];
    }

    // Log pour déboguer le format des données
    console.log(`[updateChart] Données reçues pour ${type}:`, data);
    
    // Vérifier si nous avons des datasets
    if (!data.datasets || !data.datasets.length) {
      console.warn(`[updateChart] Pas de datasets pour ${type}`);
      // Créer un graphique vide
      charts[type] = new Chart(chartElement, {
        type: 'line',
        data: {
          labels: [],
          datasets: []
        },
        options: {
          plugins: {
            title: {
              display: true,
              text: 'Aucune donnée disponible'
            }
          }
        }
      });
      return;
    }

    // Déterminer l'unité de temps appropriée en fonction de l'intervalle
    let timeUnit: 'hour' | 'day' | 'week' | 'month' = 'hour';
    if (historyInterval.value === '5min' || historyInterval.value === '30min') {
      timeUnit = 'hour';
    } else if (historyInterval.value === '4hour') {
      timeUnit = 'day';
    } else if (historyInterval.value === '1day') {
      timeUnit = 'day';
    }

    // Déterminer les limites de l'axe X en fonction de la période sélectionnée
    const dates = getHistoryDates();
    const startDate = new Date(dates.start);
    const endDate = new Date(dates.end);
    endDate.setHours(23, 59, 59, 999); // Fin de la journée

    // Configuration commune des graphiques
    const commonOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top' as const
        },
        tooltip: {
          mode: 'index' as const,
          intersect: false,
          callbacks: {
            title: function(tooltipItems: any[]) {
              // Formater la date/heure pour l'affichage dans le tooltip
              if (tooltipItems.length > 0) {
                const date = new Date(tooltipItems[0].parsed.x);
                return date.toLocaleString();
              }
              return '';
            }
          }
        }
      },
      scales: {
        x: {
          type: 'time' as const,
          time: {
            unit: timeUnit,
            displayFormats: {
              hour: 'HH:mm',
              day: 'dd/MM',
              week: 'dd/MM',
              month: 'MM/yyyy'
            }
          },
          min: startDate.getTime(),
          max: endDate.getTime(),
          title: {
            display: true,
            text: 'Date/Heure'
          }
        },
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: getYAxisLabel(type)
          },
          // Ajouter des options pour l'échelle automatique
          ticks: {
            callback: function(tickValue: number | string) {
              const value = typeof tickValue === 'string' ? parseFloat(tickValue) : tickValue;
              // Formater les valeurs selon le type de graphique
              switch(type) {
                case 'temp':
                  return value.toFixed(1) + '°C';
                case 'humidity':
                  return value.toFixed(0) + '%';
                case 'pressure':
                  return value.toFixed(0) + ' hPa';
                case 'wind':
                case 'rain':
                  return value.toFixed(1) + (type === 'wind' ? ' km/h' : ' mm');
                case 'solar':
                  return value.toFixed(0) + ' W/m²';
                default:
                  return value;
              }
            }
          }
        }
      },
      interaction: {
        mode: 'nearest' as const,
        axis: 'x' as const,
        intersect: false
      }
    };

    // Créer le nouveau graphique
    charts[type] = new Chart(chartElement, {
      type: 'line',
      data: {
        datasets: data.datasets || []
      },
      options: commonOptions
    });
    
    console.log(`[updateChart] Graphique ${type} créé avec ${data.datasets.length} datasets`);
  } catch (error) {
    console.error(`[updateChart] Erreur lors de la mise à jour du graphique ${type}:`, error);
  }
};

// Fonction utilitaire pour obtenir le label de l'axe Y selon le type de graphique
const getYAxisLabel = (type: string): string => {
  switch (type) {
    case 'temp':
      return 'Température (°C)';
    case 'humidity':
      return 'Humidité (%)';
    case 'pressure':
      return 'Pression (hPa)';
    case 'wind':
      return 'Vitesse (km/h)';
    case 'rain':
      return 'Précipitations (mm)';
    case 'solar':
      return 'Rayonnement (W/m²)';
    default:
      return '';
  }
};

interface ChartDataset {
  label: string;
  data: { x: number; y: number }[];
  borderColor: string;
  fill: boolean;
  tension?: number;
}

// Fonction pour formater les données historiques en données de graphique
const formatHistoryDataForChart = (historyData: any, chartType: string) => {
  console.log(`[formatHistoryDataForChart] Données reçues pour ${chartType}:`, historyData);

  if (!historyData) {
    console.warn(`[formatHistoryDataForChart] Pas de données pour ${chartType}`);
    return null;
  }

  // Extraire les données selon la structure
  let data;
  if ('data' in historyData) {
    data = historyData.data;
  } else if (chartType in historyData) {
    data = historyData;
  } else {
    console.warn(`[formatHistoryDataForChart] Structure de données non reconnue pour ${chartType}`);
    return null;
  }

  console.log(`[formatHistoryDataForChart] Données extraites pour ${chartType}:`, data);

  const datasets: ChartDataset[] = [];

  const processTimeSeriesData = (
    items: Array<{ time: number; value: unknown }>,
    label: string,
    color: string,
    valueTransform?: (val: number) => number
  ) => {
    if (!Array.isArray(items)) {
      console.warn(`[formatHistoryDataForChart] Les données pour ${label} ne sont pas un tableau`);
      return;
    }

    const processedData = items
      .map(item => {
        const value = parseFloat(String(item.value));
        return {
          x: item.time,
          y: valueTransform ? valueTransform(value) : value
        };
      })
      .filter(point => !isNaN(point.y));

    if (processedData.length > 0) {
      datasets.push({
        label,
        data: processedData,
        borderColor: color,
        fill: false,
        tension: 0.4
      });
    }
  };

  switch (chartType) {
    case 'temp':
      if (data.outdoor?.temperature?.list) {
        processTimeSeriesData(
          Object.entries(data.outdoor.temperature.list).map(([time, value]) => ({ time: parseInt(time) * 1000, value })),
          'Température',
          '#FF6384',
          (val) => ((val - 32) * 5/9)
        );
      } else if (data.outdoor?.temperature) {
        processTimeSeriesData(
          data.outdoor.temperature,
          'Température',
          '#FF6384',
          (val) => ((val - 32) * 5/9)
        );
      }
      break;

    case 'humidity':
      if (data.outdoor?.humidity?.list) {
        processTimeSeriesData(
          Object.entries(data.outdoor.humidity.list).map(([time, value]) => ({ time: parseInt(time) * 1000, value })),
          'Humidité',
          '#36A2EB'
        );
      } else if (data.outdoor?.humidity) {
        processTimeSeriesData(
          data.outdoor.humidity,
          'Humidité',
          '#36A2EB'
        );
      }
      break;

    case 'pressure':
      if (data.pressure?.absolute?.list) {
        processTimeSeriesData(
          Object.entries(data.pressure.absolute.list).map(([time, value]) => ({ time: parseInt(time) * 1000, value })),
          'Pression',
          '#4BC0C0',
          (val) => val * 33.8639 // inHg vers hPa
        );
      } else if (data.pressure?.absolute) {
        processTimeSeriesData(
          data.pressure.absolute,
          'Pression',
          '#4BC0C0',
          (val) => val * 33.8639 // inHg vers hPa
        );
      }
      break;

    case 'wind':
      if (data.wind?.wind_speed?.list) {
        processTimeSeriesData(
          Object.entries(data.wind.wind_speed.list).map(([time, value]) => ({ time: parseInt(time) * 1000, value })),
          'Vitesse du vent',
          '#FFCE56',
          (val) => val * 1.60934 // mph vers km/h
        );
        if (data.wind.wind_gust?.list) {
          processTimeSeriesData(
            Object.entries(data.wind.wind_gust.list).map(([time, value]) => ({ time: parseInt(time) * 1000, value })),
            'Rafales',
            '#FF9F40',
            (val) => val * 1.60934 // mph vers km/h
          );
        }
      } else if (data.wind?.wind_speed) {
        processTimeSeriesData(
          data.wind.wind_speed,
          'Vitesse du vent',
          '#FFCE56',
          (val) => val * 1.60934 // mph vers km/h
        );
        if (data.wind.wind_gust) {
          processTimeSeriesData(
            data.wind.wind_gust,
            'Rafales',
            '#FF9F40',
            (val) => val * 1.60934 // mph vers km/h
          );
        }
      }
      break;

    case 'rain':
      if (data.rainfall?.daily?.list) {
        processTimeSeriesData(
          Object.entries(data.rainfall.daily.list).map(([time, value]) => ({ time: parseInt(time) * 1000, value })),
          'Précipitations journalières',
          '#9966FF',
          (val) => val * 25.4 // inches vers mm
        );
      } else if (data.rainfall?.daily) {
        processTimeSeriesData(
          data.rainfall.daily,
          'Précipitations journalières',
          '#9966FF',
          (val) => val * 25.4 // inches vers mm
        );
      }
      break;

    case 'solar':
      if (data.solar_and_uvi?.solar?.list) {
        processTimeSeriesData(
          Object.entries(data.solar_and_uvi.solar.list).map(([time, value]) => ({ time: parseInt(time) * 1000, value })),
          'Rayonnement solaire',
          '#FF9F40'
        );
      } else if (data.solar_and_uvi?.solar) {
        processTimeSeriesData(
          data.solar_and_uvi.solar,
          'Rayonnement solaire',
          '#FF9F40'
        );
      }
      break;
  }

  console.log(`[formatHistoryDataForChart] Datasets générés pour ${chartType}:`, datasets);
  return { datasets };
};

// Fonction pour récupérer les données de graphique par type
const fetchChartData = async (chartType: string) => {
  if (!selectedDevice.value) return null;

  try {
    const dates = getHistoryDates();

    // Préparer les paramètres de la requête
    const params: any = {
      mac: selectedDevice.value,
      start_date: dates.start,
      end_date: dates.end,
      cycle_type: historyInterval.value
    };

    // Si l'utilisateur est admin et qu'une entreprise est sélectionnée
    if (isAdmin.value && selectedCompany.value) {
      params.entreprise = selectedCompany.value;
    }

    console.log(`[fetchChartData] Récupération des données pour ${chartType}:`, params);
    const response = await weatherService.getHistoryData(params);
    console.log(`[fetchChartData] Données reçues pour ${chartType}:`, response.data);
    
    // Formater les données pour le graphique
    return formatHistoryDataForChart(response.data, chartType);
  } catch (error) {
    console.error(`[fetchChartData] Erreur pour ${chartType}:`, error);
    notificationStore.error(`Erreur lors de la récupération des données pour le graphique ${chartType}`);
    return null;
  }
};

// Fonction pour valider que les sélections de période et d'intervalle respectent les contraintes de l'API
const validatePeriodInterval = () => {
  const dates = getHistoryDates();
  const start = new Date(dates.start);
  const end = new Date(dates.end);
  end.setHours(23, 59, 59, 999); // Fin de la journée
  
  // Calculer la différence en jours
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  periodIntervalError.value = ''; // Réinitialiser l'erreur
  
  // Appliquer les règles selon la documentation Ecowitt
  switch (historyInterval.value) {
    case '5min':
      if (diffDays > 1) {
        periodIntervalError.value = 'Pour l\'intervalle 5min, la période ne doit pas dépasser 1 jour';
        ajustPeriodToMatchInterval('5min');
      }
      // Vérifier aussi la limite de 90 jours dans le passé
      const minDate = new Date();
      minDate.setDate(minDate.getDate() - 90);
      if (start < minDate) {
        periodIntervalError.value = 'Les données 5min sont disponibles uniquement pour les 90 derniers jours';
      }
      break;
    case '30min':
      if (diffDays > 7) {
        periodIntervalError.value = 'Pour l\'intervalle 30min, la période ne doit pas dépasser 7 jours';
        ajustPeriodToMatchInterval('30min');
      }
      // Vérifier aussi la limite de 365 jours dans le passé
      const minDate30 = new Date();
      minDate30.setDate(minDate30.getDate() - 365);
      if (start < minDate30) {
        periodIntervalError.value = 'Les données 30min sont disponibles uniquement pour les 365 derniers jours';
      }
      break;
    case '4hour':
      if (diffDays > 31) {
        periodIntervalError.value = 'Pour l\'intervalle 4h, la période ne doit pas dépasser 31 jours';
        ajustPeriodToMatchInterval('4hour');
      }
      // Vérifier aussi la limite de 730 jours dans le passé
      const minDate4h = new Date();
      minDate4h.setDate(minDate4h.getDate() - 730);
      if (start < minDate4h) {
        periodIntervalError.value = 'Les données 4h sont disponibles uniquement pour les 730 derniers jours';
      }
      break;
    case '1day':
      if (diffDays > 365) {
        periodIntervalError.value = 'Pour l\'intervalle 1 jour, la période ne doit pas dépasser 365 jours';
        ajustPeriodToMatchInterval('1day');
      }
      // Vérifier aussi la limite de 1460 jours dans le passé
      const minDate1d = new Date();
      minDate1d.setDate(minDate1d.getDate() - 1460);
      if (start < minDate1d) {
        periodIntervalError.value = 'Les données journalières sont disponibles uniquement pour les 1460 derniers jours';
      }
      break;
  }
  
  return periodIntervalError.value === '';
};

// Fonction pour ajuster automatiquement la période pour correspondre à l'intervalle
const ajustPeriodToMatchInterval = (interval: string) => {
  if (historyPeriod.value !== 'custom') {
    // Si on a une période prédéfinie, changer pour une période compatible
    switch (interval) {
      case '5min':
        historyPeriod.value = 'today'; // Aujourd'hui est toujours valide pour 5min
        break;
      case '30min':
        if (['month'].includes(historyPeriod.value)) {
          historyPeriod.value = 'week'; // Réduire à une semaine
        }
        break;
      case '4hour':
        if (historyPeriod.value === 'month' && new Date().getDate() > 28) {
          // Si on est à la fin du mois, ajuster à 28 jours max
          const today = new Date();
          customStartDate.value = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 28).toISOString().split('T')[0];
          customEndDate.value = today.toISOString().split('T')[0];
          historyPeriod.value = 'custom';
        }
        break;
    }
  } else {
    // Période personnalisée: ajuster la date de début
    const end = new Date(customEndDate.value);
    let start = new Date(customStartDate.value);
    
    switch (interval) {
      case '5min':
        // Date de début = date de fin (même jour)
        start = new Date(end);
        break;
      case '30min':
        // Date de début = date de fin - 7 jours max
        const sevenDaysAgo = new Date(end);
        sevenDaysAgo.setDate(end.getDate() - 7);
        if (start < sevenDaysAgo) {
          start = sevenDaysAgo;
        }
        break;
      case '4hour':
        // Date de début = date de fin - 31 jours max
        const monthAgo = new Date(end);
        monthAgo.setDate(end.getDate() - 31);
        if (start < monthAgo) {
          start = monthAgo;
        }
        break;
      case '1day':
        // Date de début = date de fin - 365 jours max
        const yearAgo = new Date(end);
        yearAgo.setDate(end.getDate() - 365);
        if (start < yearAgo) {
          start = yearAgo;
        }
        break;
    }
    
    customStartDate.value = start.toISOString().split('T')[0];
  }
};

// Nettoyage des graphiques
onUnmounted(() => {
  Object.values(charts).forEach(chart => chart.destroy());
});

// Watch pour mettre à jour les graphiques quand les filtres changent
watch([historyPeriod, historyInterval, customStartDate, customEndDate], () => {
  if (currentTab.value === 'history' && selectedDevice.value) {
    updateAllCharts();
  }
});

// Gestion du cycle de vie du composant
onMounted(async () => {
  // Exécuter les tâches d'initialisation en parallèle
  const initTasks = [];

  // Si l'utilisateur est admin, récupérer la liste des entreprises
  if (isAdmin.value) {
    initTasks.push(fetchCompanies());
  }

  // Attendre que toutes les tâches se terminent
  await Promise.all(initTasks);

  // Récupérer la liste des appareils après avoir chargé les entreprises
  // pour s'assurer que l'ID de l'entreprise est disponible pour les admins
  await fetchDevices();

  // Mise à jour toutes les 5 minutes
  updateInterval = window.setInterval(fetchWeatherData, 5 * 60 * 1000);
});

// Ajouter un watcher pour selectedCompany
watch(selectedCompany, (newValue) => {
  if (isAdmin.value && newValue) {
    fetchDevicesWithCompany();
  }
});

// Ajouter un watcher pour selectedDevice
watch(selectedDevice, (newValue) => {
  if (newValue && currentTab.value === 'history') {
    // Mettre à jour les graphiques lorsque l'appareil change
    updateAllCharts();
  }
});

// Ajouter un watcher pour currentTab
watch(currentTab, (newValue) => {
  if (newValue === 'history' && selectedDevice.value) {
    // Mettre à jour les graphiques lorsqu'on passe à l'onglet historique
    updateAllCharts();
  }
});

onUnmounted(() => {
  if (updateInterval) {
    clearInterval(updateInterval);
  }
});

// Cette fonction a été supprimée car elle n'est plus utilisée.
// Les données sont maintenant formatées directement par le backend.
</script>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.chart-container {
  position: relative;
  height: 300px;
  width: 100%;
}

@media (max-width: 640px) {
  .grid {
    grid-template-columns: 1fr;
  }

  .chart-container {
    height: 250px;
  }
}
</style>