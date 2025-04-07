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
            Min: {{ formatTemperature(weatherData.outdoor?.temperature?.min) }}°C
            Max: {{ formatTemperature(weatherData.outdoor?.temperature?.max) }}°C
          </div>
        </div>

        <!-- Widget Humidité -->
        <div class="bg-white rounded-lg shadow-md p-6">
          <h2 class="text-xl font-semibold mb-4">Humidité</h2>
          <div class="text-4xl font-bold text-primary-600 mb-2">
            {{ weatherData.outdoor?.humidity?.value }}%
          </div>
          <div class="mt-4">
            <div class="w-full bg-gray-200 rounded-full h-2.5">
              <div class="bg-primary-600 h-2.5 rounded-full" :style="{ width: `${weatherData.outdoor?.humidity?.value}%` }"></div>
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
            {{ formatWindSpeed(weatherData.wind?.speed?.value) }} km/h
          </div>
          <div class="text-sm text-gray-600">
            Direction: {{ formatWindDirection(weatherData.wind?.direction?.value) }}
            <br>
            Rafales: {{ formatWindSpeed(weatherData.wind?.gust?.value) }} km/h
          </div>
        </div>

        <!-- Widget Précipitations -->
        <div class="bg-white rounded-lg shadow-md p-6">
          <h2 class="text-xl font-semibold mb-4">Précipitations</h2>
          <div class="text-4xl font-bold text-primary-600 mb-2">
            {{ formatRainfall(weatherData.rainfall?.daily?.value) }} mm
          </div>
          <div class="text-sm text-gray-600">
            Taux: {{ formatRainfall(weatherData.rainfall?.rate?.value) }} mm/h
            <br>
            Mensuel: {{ formatRainfall(weatherData.rainfall?.monthly?.value) }} mm
          </div>
        </div>

        <!-- Widget Rayonnement -->
        <div class="bg-white rounded-lg shadow-md p-6">
          <h2 class="text-xl font-semibold mb-4">Rayonnement</h2>
          <div class="text-4xl font-bold text-primary-600 mb-2">
            {{ weatherData.solar_and_uvi?.solar?.value }} W/m²
          </div>
          <div class="text-sm text-gray-600">
            UV: {{ weatherData.solar_and_uvi?.uvi?.value }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useNotificationStore } from '@/stores/notification';
import { useAuthStore } from '@/stores/auth';
import { weatherService, userService } from '@/services/api';

const notificationStore = useNotificationStore();
const authStore = useAuthStore();
const weatherData = ref<any>({});
const lastUpdate = ref<Date>(new Date());
const devices = ref<any[]>([]);
const selectedDevice = ref<string>('');
const companies = ref<any[]>([]);
const selectedCompany = ref<number | null>(null);
const apiError = ref<string>('');

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

    const response = await weatherService.getDevices(params);
    devices.value = response.data;
    if (devices.value.length > 0) {
      selectedDevice.value = devices.value[0].mac;
      await fetchWeatherData();
    }
  } catch (error: any) {
    console.error('Erreur lors de la récupération des appareils:', error);

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

    const response = await weatherService.getRealTimeData(params);
    weatherData.value = response.data;
    lastUpdate.value = new Date();
  } catch (error: any) {
    console.error('Erreur:', error);

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
function formatTemperature(value: number): string {
  if (!value) return '0';
  // Convertir de Fahrenheit en Celsius
  return ((value - 32) * 5/9).toFixed(1);
}

function formatWindSpeed(value: number): string {
  if (!value) return '0';
  // Convertir de mph en km/h
  return (value * 1.60934).toFixed(1);
}

function formatRainfall(value: number): string {
  if (!value) return '0';
  // Convertir de in en mm
  return (value * 25.4).toFixed(1);
}

function formatPressure(value: number): string {
  if (!value) return '0';
  return value.toFixed(1);
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
  // Réinitialiser les données
  devices.value = [];
  selectedDevice.value = '';
  weatherData.value = {};
  apiError.value = '';

  // Récupérer les appareils
  await fetchDevices();
}

// Gestion du cycle de vie du composant
onMounted(async () => {
  // Si l'utilisateur est admin, récupérer la liste des entreprises
  if (isAdmin.value) {
    await fetchCompanies();
  }

  await fetchDevices();
  // Mise à jour toutes les 5 minutes
  updateInterval = window.setInterval(fetchWeatherData, 5 * 60 * 1000);
});

onUnmounted(() => {
  if (updateInterval) {
    clearInterval(updateInterval);
  }
});
</script>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

@media (max-width: 640px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>