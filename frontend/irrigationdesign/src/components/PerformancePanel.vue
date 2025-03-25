<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { usePerformanceMonitor } from '@/utils/usePerformanceMonitor';

const props = defineProps<{
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
}>();

const position = props.position || 'bottom-left';
const isExpanded = ref(false);

const {
  isQueryParamEnabled,
  isRecording,
  measures,
  longTasks,
  memorySnapshots,
  framesPerSecond,
  operationHistory,
  startRecording,
  stopRecording,
  clearRecording,
  captureMemorySnapshot,
  getSlowOperations,
  getPerformanceReport,
  getOperationDetails
} = usePerformanceMonitor();

// Calculer les statistiques
const stats = computed(() => {
  const report = getPerformanceReport() ?? {
    totalMeasures: 0,
    totalLongTasks: 0,
    slowestOperations: [],
    averageFps: 0,
    memoryUsage: null
  };
  return {
    totalMeasures: report.totalMeasures,
    totalLongTasks: report.totalLongTasks,
    averageDuration: report.slowestOperations.length > 0
      ? report.slowestOperations.reduce((acc, m) => acc + m.duration, 0) / report.slowestOperations.length
      : 0,
    fps: report.averageFps,
    slowestOperations: report.slowestOperations,
    memoryUsage: report.memoryUsage
  };
});

// Calculer les 5 opérations les plus lentes
const slowestOperations = computed(() => {
  const report = getPerformanceReport() ?? { slowestOperations: [] };
  return report.slowestOperations.slice(0, 5).map(op => ({
    operation: op.name,
    component: op.component || 'unknown',
    durationMs: op.duration,
    timestamp: op.startTime
  }));
});

// Suivre et afficher les métriques
const updateIntervalId = ref<number | null>(null);

onMounted(() => {
  // Mettre à jour les statistiques régulièrement si le monitoring est activé
  if (isQueryParamEnabled.value) {
    updateIntervalId.value = window.setInterval(() => {
      captureMemorySnapshot();
    }, 1000); // Mise à jour plus fréquente
  }
});

onUnmounted(() => {
  if (updateIntervalId.value !== null) {
    clearInterval(updateIntervalId.value);
  }
});

// Formater un nombre comme une taille de fichier (MB, KB, etc.)
function formatSize(bytes: number | undefined): string {
  if (bytes === undefined) return 'N/A';
  
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

// Formater un nombre avec 2 décimales
function formatNumber(value: number): string {
  return value.toFixed(2);
}

const updateMetrics = () => {
  captureMemorySnapshot();
};

// Télécharger les données de performance au format JSON
function downloadPerformanceData() {
  const report = getPerformanceReport();
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report, null, 2));
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", "performance_report.json");
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
}

// Réinitialiser et forcer la mise à jour
function handleClearRecording() {
  clearRecording();
  // Forcer une mise à jour immédiate
  updateMetrics();
}

// Copier toutes les données de performance dans le presse-papiers
function copyPerformanceData() {
  const report = getPerformanceReport();
  navigator.clipboard.writeText(JSON.stringify(report, null, 2))
    .then(() => {
      alert('Données de performance copiées dans le presse-papiers');
    })
    .catch(err => {
      console.error('Erreur lors de la copie des données', err);
      alert('Erreur lors de la copie des données');
    });
}

// Copier les détails d'une opération spécifique
async function copyOperationDetails(operation: { operation: string, timestamp: number }) {
  const details = getOperationDetails(operation.operation, operation.timestamp);
  if (!details) {
    alert('Impossible de trouver les détails de cette opération');
    return;
  }

  const formattedDetails = {
    operation: {
      ...details.operation,
      startTimeRelative: '0ms',
      startTimeAbsolute: new Date(details.operation.startTime).toISOString()
    },
    context: {
      ...details.context,
      relatedOperations: details.context.relatedOperations.map(op => ({
        ...op,
        startTime: `+${op.startTime.toFixed(2)}ms`
      })),
      longTasks: details.context.longTasks.map(task => ({
        ...task,
        startTime: `+${task.startTime.toFixed(2)}ms`
      })),
      memorySnapshots: details.context.memorySnapshots.map(snap => ({
        ...snap,
        timestamp: `+${snap.timestamp.toFixed(2)}ms`,
        usedJSHeapSize: snap.usedJSHeapSize ? formatSize(snap.usedJSHeapSize) : 'N/A',
        totalJSHeapSize: snap.totalJSHeapSize ? formatSize(snap.totalJSHeapSize) : 'N/A'
      }))
    },
    summary: {
      ...details.summary,
      memoryDelta: formatSize(details.summary.memoryDelta),
      maxLongTaskDuration: `${details.summary.maxLongTaskDuration.toFixed(2)}ms`
    }
  };

  try {
    await navigator.clipboard.writeText(JSON.stringify(formattedDetails, null, 2));
    alert('Détails de l\'opération copiés dans le presse-papiers');
  } catch (err) {
    console.error('Erreur lors de la copie des détails', err);
    alert('Erreur lors de la copie des détails');
  }
}
</script>

<template>
  <div v-if="isQueryParamEnabled" 
       :class="[
         'performance-panel',
         `position-${position}`,
         { expanded: isExpanded }
       ]">
    
    <!-- Barre de titre avec info de base -->
    <div class="perf-header" @click="isExpanded = !isExpanded">
      <div class="perf-title">
        <div class="perf-indicator" :class="{ active: isRecording }"></div>
        <span>Performance</span>
      </div>
      <div class="perf-basic-stats">
        <span class="perf-stat">{{ stats.fps }} FPS</span>
        <span class="perf-stat">{{ formatNumber(stats.averageDuration) }}ms</span>
      </div>
      <button class="perf-expand-btn">
        {{ isExpanded ? '▼' : '▲' }}
      </button>
    </div>
    
    <!-- Contenu détaillé -->
    <div v-if="isExpanded" class="perf-content">
      <div class="perf-section">
        <h3>Métriques générales</h3>
        <div class="perf-metrics">
          <div class="perf-metric">
            <span class="perf-metric-label">Mesures</span>
            <span class="perf-metric-value">{{ stats.totalMeasures }}</span>
          </div>
          <div class="perf-metric">
            <span class="perf-metric-label">Tâches longues</span>
            <span class="perf-metric-value">{{ stats.totalLongTasks }}</span>
          </div>
          <div class="perf-metric">
            <span class="perf-metric-label">Durée moyenne</span>
            <span class="perf-metric-value">{{ formatNumber(stats.averageDuration) }}ms</span>
          </div>
          <div class="perf-metric">
            <span class="perf-metric-label">FPS</span>
            <span class="perf-metric-value">{{ stats.fps }}</span>
          </div>
        </div>
      </div>
      
      <div class="perf-section">
        <h3>Mémoire</h3>
        <div class="perf-metrics">
          <div class="perf-metric" v-if="stats.memoryUsage?.usedJSHeapSize !== undefined">
            <span class="perf-metric-label">Utilisée</span>
            <span class="perf-metric-value">{{ formatSize(stats.memoryUsage?.usedJSHeapSize) }}</span>
          </div>
          <div class="perf-metric" v-if="stats.memoryUsage?.totalJSHeapSize !== undefined">
            <span class="perf-metric-label">Totale</span>
            <span class="perf-metric-value">{{ formatSize(stats.memoryUsage?.totalJSHeapSize) }}</span>
          </div>
          <div class="perf-metric" v-if="stats.memoryUsage?.jsHeapSizeLimit !== undefined">
            <span class="perf-metric-label">Limite</span>
            <span class="perf-metric-value">{{ formatSize(stats.memoryUsage?.jsHeapSizeLimit) }}</span>
          </div>
        </div>
      </div>
      
      <div class="perf-section">
        <h3>Opérations les plus lentes</h3>
        <div class="perf-table">
          <div class="perf-table-header">
            <div class="perf-table-cell">Opération</div>
            <div class="perf-table-cell">Composant</div>
            <div class="perf-table-cell">Durée</div>
            <div class="perf-table-cell">Actions</div>
          </div>
          <div class="perf-table-row" v-for="op in slowestOperations" :key="op.timestamp">
            <div class="perf-table-cell">{{ op.operation }}</div>
            <div class="perf-table-cell">{{ op.component }}</div>
            <div class="perf-table-cell">{{ formatNumber(op.durationMs) }}ms</div>
            <div class="perf-table-cell">
              <button 
                @click="copyOperationDetails(op)"
                class="perf-action-button"
                title="Copier les détails"
              >
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>
          <div v-if="slowestOperations.length === 0" class="perf-empty">
            Aucune opération enregistrée
          </div>
        </div>
      </div>
      
      <div class="perf-actions">
        <button @click="handleClearRecording" class="perf-button">
          Réinitialiser
        </button>
        <button @click="downloadPerformanceData" class="perf-button">
          Télécharger
        </button>
        <button @click="copyPerformanceData" class="perf-button">
          Copier
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.performance-panel {
  position: fixed;
  z-index: 9999;
  background-color: rgba(0, 0, 0, 0.85);
  color: #fff;
  font-family: monospace;
  font-size: 12px;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  width: 220px;
  transition: all 0.2s ease;
}

.position-top-left {
  top: 20px;
  left: 20px;
}

.position-top-right {
  top: 20px;
  right: 20px;
}

.position-bottom-left {
  bottom: 20px;
  left: 20px;
}

.position-bottom-right {
  bottom: 20px;
  right: 20px;
}

.performance-panel.expanded {
  width: 320px;
}

.perf-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background-color: rgba(30, 30, 30, 0.9);
  cursor: pointer;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.perf-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: bold;
}

.perf-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #ccc;
}

.perf-indicator.active {
  background-color: #4CAF50;
  box-shadow: 0 0 8px #4CAF50;
}

.perf-basic-stats {
  display: flex;
  gap: 8px;
}

.perf-stat {
  font-size: 10px;
  color: #ccc;
}

.perf-expand-btn {
  background: none;
  border: none;
  color: #ccc;
  font-size: 10px;
  cursor: pointer;
}

.perf-content {
  padding: 10px;
  max-height: 500px;
  overflow-y: auto;
}

.perf-section {
  margin-bottom: 12px;
}

.perf-section h3 {
  font-size: 12px;
  margin: 0 0 8px 0;
  padding-bottom: 4px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
}

.perf-metrics {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.perf-metric {
  display: flex;
  flex-direction: column;
  background-color: rgba(50, 50, 50, 0.5);
  padding: 6px 8px;
  border-radius: 3px;
}

.perf-metric-label {
  font-size: 10px;
  color: #aaa;
}

.perf-metric-value {
  font-size: 12px;
  color: #fff;
  font-weight: bold;
}

.perf-table {
  background-color: rgba(40, 40, 40, 0.5);
  border-radius: 3px;
  overflow: hidden;
  font-size: 10px;
}

.perf-table-header {
  display: flex;
  background-color: rgba(50, 50, 50, 0.8);
  padding: 6px 0;
  font-weight: bold;
}

.perf-table-row {
  display: flex;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  padding: 6px 0;
}

.perf-table-row:last-child {
  border-bottom: none;
}

.perf-table-cell {
  flex: 1;
  padding: 0 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.perf-table-cell:first-child {
  flex: 1.5;
}

.perf-empty {
  padding: 10px;
  text-align: center;
  color: #888;
  font-style: italic;
}

.perf-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 12px;
}

.perf-button {
  flex: 1;
  min-width: 70px;
  background-color: rgba(70, 70, 70, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  color: #fff;
  font-size: 10px;
  padding: 6px 10px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.perf-button:hover {
  background-color: rgba(90, 90, 90, 0.8);
}

.perf-action-button {
  padding: 2px;
  background: none;
  border: none;
  color: #ccc;
  cursor: pointer;
  transition: color 0.2s;
}

.perf-action-button:hover {
  color: #fff;
}

.perf-table-cell {
  padding: 4px 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style> 