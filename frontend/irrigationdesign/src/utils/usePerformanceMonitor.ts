import { reactive, readonly, ref, onMounted, onUnmounted } from 'vue'

export interface CriticalPathNode {
  operation: string;
  duration: number;
  component?: string;
  children: CriticalPathNode[];
}

interface PerformanceEntry {
  name: string;
  startTime: number;
  duration: number;
  component?: string;
  info?: Record<string, any>;
  parentOperation?: string; // Pour tracer les relations parent-enfant
}

interface LongTaskEntry {
  duration: number;
  startTime: number;
  name: string;
  component?: string;
}

interface MemoryInfo {
  jsHeapSizeLimit?: number;
  totalJSHeapSize?: number;
  usedJSHeapSize?: number;
  timestamp: number;
}

// State centralisé pour les métriques de performance
const state = reactive({
  measures: [] as PerformanceEntry[],
  longTasks: [] as LongTaskEntry[],
  memorySnapshots: [] as MemoryInfo[],
  framesPerSecond: 0,
  lastFpsUpdate: 0,
  frameCount: 0,
  isRecording: false,
  isEnabled: false,
  startTime: 0,
  currentOperation: null as string | null, // Pour suivre l'opération en cours
  operationStack: [] as string[], // Pour suivre la pile d'opérations
  operationHistory: [] as {
    operation: string;
    component: string;
    durationMs: number;
    timestamp: number;
  }[]
})

// Référence au PerformanceObserver pour les longues tâches
let longTasksObserver: PerformanceObserver | null = null;
let animationFrameId: number | null = null;
const fpsUpdateInterval = 1000; // Mise à jour FPS chaque seconde

/**
 * Démarre l'enregistrement des mesures de performance
 */
function startRecording() {
  if (!state.isEnabled) return;
  
  state.isRecording = true;
  state.startTime = performance.now();
  state.frameCount = 0;
  state.lastFpsUpdate = performance.now();
  
  // Observer les longues tâches (tâches bloquant le thread principal > 50ms)
  try {
    if (window.PerformanceObserver && PerformanceObserver.supportedEntryTypes.includes('longtask')) {
      longTasksObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          state.longTasks.push({
            duration: entry.duration,
            startTime: entry.startTime,
            name: entry.name,
            component: getCurrentComponentName()
          });
        });
      });
      longTasksObserver.observe({ entryTypes: ['longtask'] });
    }
  } catch (e) {
    console.warn('PerformanceObserver pour longues tâches non supporté', e);
  }
  
  // Mesurer les FPS
  startFpsMeasurement();
  
  // Prendre un snapshot de la mémoire
  captureMemorySnapshot();
}

/**
 * Arrête l'enregistrement des mesures de performance
 */
function stopRecording() {
  state.isRecording = false;
  
  if (longTasksObserver) {
    longTasksObserver.disconnect();
    longTasksObserver = null;
  }
  
  stopFpsMeasurement();
}

/**
 * Efface toutes les mesures de performance enregistrées
 */
function clearRecording() {
  // Arrêter l'enregistrement actuel
  if (longTasksObserver) {
    longTasksObserver.disconnect();
    longTasksObserver = null;
  }
  stopFpsMeasurement();
  
  // Réinitialiser toutes les données
  state.measures = [];
  state.longTasks = [];
  state.memorySnapshots = [];
  state.operationHistory = [];
  state.frameCount = 0;
  state.framesPerSecond = 0;
  state.lastFpsUpdate = 0;
  
  // Redémarrer l'enregistrement si activé
  if (state.isEnabled) {
    startRecording();
  }
}

/**
 * Démarre la mesure d'une opération spécifique
 */
function startMeasure(name: string, component?: string, info?: Record<string, any>): () => void {
  if (!state.isEnabled || !state.isRecording) return () => {};
  
  const startTime = performance.now();
  const parentOperation = state.currentOperation;
  
  // Mettre à jour la pile d'opérations
  state.currentOperation = name;
  state.operationStack.push(name);
  
  // Retourne la fonction pour terminer la mesure
  return () => {
    const duration = performance.now() - startTime;
    
    // Retirer l'opération de la pile
    state.operationStack.pop();
    state.currentOperation = state.operationStack[state.operationStack.length - 1] || null;
    
    state.measures.push({
      name,
      startTime,
      duration,
      component: component || getCurrentComponentName(),
      info,
      parentOperation: parentOperation || undefined
    });
    
    // Ajouter à l'historique des opérations si la durée est significative (> 10ms)
    if (duration > 10) {
      state.operationHistory.push({
        operation: name,
        component: component || getCurrentComponentName() || 'unknown',
        durationMs: duration,
        timestamp: Date.now()
      });
    }
  };
}

/**
 * Mesure le temps d'exécution d'une fonction
 */
async function measureAsync<T>(
  name: string, 
  fn: () => Promise<T>, 
  component?: string, 
  info?: Record<string, any>
): Promise<T> {
  if (!state.isEnabled || !state.isRecording) return fn();
  
  const startTime = performance.now();
  const parentOperation = state.currentOperation;
  
  // Mettre à jour la pile d'opérations
  state.currentOperation = name;
  state.operationStack.push(name);
  
  try {
    return await fn();
  } finally {
    const duration = performance.now() - startTime;
    
    // Retirer l'opération de la pile
    state.operationStack.pop();
    state.currentOperation = state.operationStack[state.operationStack.length - 1] || null;
    
    state.measures.push({
      name,
      startTime,
      duration,
      component: component || getCurrentComponentName(),
      info,
      parentOperation: parentOperation || undefined
    });
    
    // Ajouter à l'historique des opérations si la durée est significative (> 10ms)
    if (duration > 10) {
      state.operationHistory.push({
        operation: name,
        component: component || getCurrentComponentName() || 'unknown',
        durationMs: duration,
        timestamp: Date.now()
      });
    }
  }
}

/**
 * Mesure le temps d'exécution d'une fonction synchrone
 */
function measure<T>(
  name: string, 
  fn: () => T, 
  component?: string, 
  info?: Record<string, any>
): T {
  if (!state.isEnabled || !state.isRecording) return fn();
  
  const startTime = performance.now();
  const parentOperation = state.currentOperation;
  
  // Mettre à jour la pile d'opérations
  state.currentOperation = name;
  state.operationStack.push(name);
  
  try {
    return fn();
  } finally {
    const duration = performance.now() - startTime;
    
    // Retirer l'opération de la pile
    state.operationStack.pop();
    state.currentOperation = state.operationStack[state.operationStack.length - 1] || null;
    
    state.measures.push({
      name,
      startTime,
      duration,
      component: component || getCurrentComponentName(),
      info,
      parentOperation: parentOperation || undefined
    });
    
    // Ajouter à l'historique des opérations si la durée est significative (> 10ms)
    if (duration > 10) {
      state.operationHistory.push({
        operation: name,
        component: component || getCurrentComponentName() || 'unknown',
        durationMs: duration,
        timestamp: Date.now()
      });
    }
  }
}

/**
 * Capture l'état actuel de la mémoire
 */
function captureMemorySnapshot() {
  if (!state.isEnabled || !state.isRecording) return;
  
  // Vérifier si l'API mémoire est disponible
  if ((performance as any).memory) {
    state.memorySnapshots.push({
      jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
      totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
      usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
      timestamp: performance.now()
    });
  } else {
    state.memorySnapshots.push({
      timestamp: performance.now()
    });
  }
}

/**
 * Démarrer la mesure des FPS
 */
function startFpsMeasurement() {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
  }
  
  state.frameCount = 0;
  state.lastFpsUpdate = performance.now();
  
  function measureFrame() {
    state.frameCount++;
    const now = performance.now();
    
    if (now - state.lastFpsUpdate >= fpsUpdateInterval) {
      state.framesPerSecond = Math.round((state.frameCount * 1000) / (now - state.lastFpsUpdate));
      state.frameCount = 0;
      state.lastFpsUpdate = now;
    }
    
    if (state.isRecording) {
      animationFrameId = requestAnimationFrame(measureFrame);
    }
  }
  
  animationFrameId = requestAnimationFrame(measureFrame);
}

/**
 * Arrêter la mesure des FPS
 */
function stopFpsMeasurement() {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
}

/**
 * Obtenir le nom du composant actuellement actif (si possible)
 */
function getCurrentComponentName(): string {
  // À améliorer si une méthode plus précise est disponible
  return '';
}

/**
 * Active ou désactive le monitoring des performances
 */
function setEnabled(enabled: boolean) {
  state.isEnabled = enabled;
  if (enabled && !state.isRecording) {
    startRecording();
  } else if (!enabled && state.isRecording) {
    stopRecording();
  }
}

/**
 * Crée un wrapper pour une fonction afin de mesurer ses performances
 */
function createPerformanceTracker<T extends (...args: any[]) => any>(
  fn: T, 
  name: string, 
  component?: string
): ((...args: Parameters<T>) => ReturnType<T>) {
  
  return (...args: Parameters<T>): ReturnType<T> => {
    if (!state.isEnabled || !state.isRecording) {
      return fn(...args);
    }
    
    const startTime = performance.now();
    
    try {
      return fn(...args);
    } finally {
      const duration = performance.now() - startTime;
      state.measures.push({
        name,
        startTime,
        duration,
        component: component || getCurrentComponentName(),
        info: { args }
      });
      
      // Ajouter à l'historique des opérations si la durée est significative (> 10ms)
      if (duration > 10) {
        state.operationHistory.push({
          operation: name,
          component: component || getCurrentComponentName() || 'unknown',
          durationMs: duration,
          timestamp: Date.now()
        });
      }
    }
  };
}

/**
 * Crée un wrapper pour une fonction asynchrone afin de mesurer ses performances
 */
function createAsyncPerformanceTracker<T extends (...args: any[]) => Promise<any>>(
  fn: T, 
  name: string, 
  component?: string
): ((...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>>) {
  
  return async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    if (!state.isEnabled || !state.isRecording) {
      return await fn(...args);
    }
    
    const startTime = performance.now();
    
    try {
      return await fn(...args);
    } finally {
      const duration = performance.now() - startTime;
      state.measures.push({
        name,
        startTime,
        duration,
        component: component || getCurrentComponentName(),
        info: { args }
      });
      
      // Ajouter à l'historique des opérations si la durée est significative (> 10ms)
      if (duration > 10) {
        state.operationHistory.push({
          operation: name,
          component: component || getCurrentComponentName() || 'unknown',
          durationMs: duration,
          timestamp: Date.now()
        });
      }
    }
  };
}

/**
 * Construit l'arbre du chemin critique à partir des mesures
 */
function buildCriticalPath(startTime: number, endTime: number): CriticalPathNode[] {
  const relevantMeasures = state.measures.filter(
    m => m.startTime >= startTime && (m.startTime + m.duration) <= endTime
  );

  // Créer un map des opérations parentes vers leurs enfants
  const operationMap = new Map<string, PerformanceEntry[]>();
  const rootOperations: PerformanceEntry[] = [];

  relevantMeasures.forEach(measure => {
    if (measure.parentOperation) {
      if (!operationMap.has(measure.parentOperation)) {
        operationMap.set(measure.parentOperation, []);
      }
      operationMap.get(measure.parentOperation)!.push(measure);
    } else {
      rootOperations.push(measure);
    }
  });

  // Fonction récursive pour construire l'arbre
  function buildNode(entry: PerformanceEntry): CriticalPathNode {
    const children = operationMap.get(entry.name) || [];
    return {
      operation: entry.name,
      duration: entry.duration,
      component: entry.component,
      children: children
        .sort((a, b) => b.duration - a.duration)
        .map(child => buildNode(child))
    };
  }

  return rootOperations
    .sort((a, b) => b.duration - a.duration)
    .map(entry => buildNode(entry));
}

/**
 * Identifie les chemins critiques dans une période donnée
 */
function analyzeCriticalPaths(startTime?: number, endTime?: number): {
  criticalPaths: CriticalPathNode[];
  totalTime: number;
  bottlenecks: Array<{
    operation: string;
    duration: number;
    component?: string;
    impact: number;
  }>;
} {
  const start = startTime || state.startTime;
  const end = endTime || performance.now();
  
  const paths = buildCriticalPath(start, end);
  const totalTime = end - start;
  
  // Identifier les goulots d'étranglement
  const operationTimes = new Map<string, { duration: number; component?: string }>();
  
  function traversePath(node: CriticalPathNode) {
    const current = operationTimes.get(node.operation) || { duration: 0, component: node.component };
    current.duration += node.duration;
    operationTimes.set(node.operation, current);
    
    node.children.forEach(child => traversePath(child));
  }
  
  paths.forEach(path => traversePath(path));
  
  const bottlenecks = Array.from(operationTimes.entries())
    .map(([operation, { duration, component }]) => ({
      operation,
      duration,
      component,
      impact: (duration / totalTime) * 100
    }))
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 10);
  
  return {
    criticalPaths: paths,
    totalTime,
    bottlenecks
  };
}

/**
 * Hook personnalisé pour utiliser le moniteur de performance dans les composants
 */
export function usePerformanceMonitor() {
  const isQueryParamEnabled = ref(false);
  
  // Vérifier si le paramètre d'URL est présent au montage du composant
  onMounted(() => {
    try {
      const url = new URL(window.location.href);
      const perfEnabled = url.searchParams.get('perf') === 'true';
      isQueryParamEnabled.value = perfEnabled;
      setEnabled(perfEnabled);
      clearRecording(); // Clear all performance data on page load
    } catch (e) {
      console.warn('Erreur lors de la vérification du paramètre perf:', e);
      isQueryParamEnabled.value = false;
      setEnabled(false);
    }
  });
  
  // Nettoyer les ressources lors du démontage
  onUnmounted(() => {
    if (state.isRecording) {
      stopRecording();
    }
  });

  // Obtenir les détails d'une opération spécifique
  const getOperationDetails = (operationName: string, startTime: number) => {
    if (!state.isEnabled || !state.isRecording) return null;
    
    // Trouver l'opération principale
    const operation = state.measures.find(m => m.name === operationName && m.startTime === startTime);
    if (!operation) return null;

    // Trouver toutes les opérations qui se sont produites pendant cette opération
    const endTime = operation.startTime + operation.duration;
    const relatedOperations = state.measures.filter(m => 
      m.startTime >= operation.startTime && 
      m.startTime <= endTime &&
      m !== operation
    );

    // Trouver les tâches longues pendant cette opération
    const longTasksDuringOperation = state.longTasks.filter(t =>
      t.startTime >= operation.startTime && 
      t.startTime <= endTime
    );

    // Trouver les snapshots mémoire pendant cette opération
    const memorySnapshotsDuringOperation = state.memorySnapshots.filter(s =>
      s.timestamp >= operation.startTime && 
      s.timestamp <= endTime
    );

    return {
      operation: {
        name: operation.name,
        component: operation.component,
        startTime: operation.startTime,
        duration: operation.duration,
        info: operation.info
      },
      context: {
        relatedOperations: relatedOperations.map(op => ({
          name: op.name,
          component: op.component,
          startTime: op.startTime - operation.startTime, // Temps relatif
          duration: op.duration,
          info: op.info
        })),
        longTasks: longTasksDuringOperation.map(task => ({
          duration: task.duration,
          startTime: task.startTime - operation.startTime, // Temps relatif
          name: task.name,
          component: task.component
        })),
        memorySnapshots: memorySnapshotsDuringOperation.map(snap => ({
          ...snap,
          timestamp: snap.timestamp - operation.startTime // Temps relatif
        }))
      },
      summary: {
        totalRelatedOperations: relatedOperations.length,
        totalLongTasks: longTasksDuringOperation.length,
        maxLongTaskDuration: Math.max(...longTasksDuringOperation.map(t => t.duration), 0),
        memoryDelta: memorySnapshotsDuringOperation.length > 1 ? 
          (memorySnapshotsDuringOperation[memorySnapshotsDuringOperation.length - 1].usedJSHeapSize || 0) -
          (memorySnapshotsDuringOperation[0].usedJSHeapSize || 0) : 
          0
      }
    };
  };
  
  return {
    isEnabled: readonly(ref(state.isEnabled)),
    isQueryParamEnabled: readonly(isQueryParamEnabled),
    isRecording: readonly(ref(state.isRecording)),
    measures: readonly(ref(state.measures)),
    longTasks: readonly(ref(state.longTasks)),
    memorySnapshots: readonly(ref(state.memorySnapshots)),
    framesPerSecond: readonly(ref(state.framesPerSecond)),
    operationHistory: readonly(ref(state.operationHistory)),
    
    startRecording,
    stopRecording,
    clearRecording,
    startMeasure,
    measure,
    measureAsync,
    captureMemorySnapshot,
    createPerformanceTracker,
    createAsyncPerformanceTracker,
    getOperationDetails,
    
    // Helpers pour obtenir des statistiques
    getSlowOperations: () => {
      if (!state.isEnabled || !state.isRecording) return [];
      return [...state.measures]
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 10);
    },
    
    getLongTasks: () => {
      if (!state.isEnabled || !state.isRecording) return [];
      return [...state.longTasks]
        .sort((a, b) => b.duration - a.duration);
    },
    
    getPerformanceReport: () => {
      if (!state.isEnabled || !state.isRecording) return null;
      
      const criticalPathAnalysis = analyzeCriticalPaths();
      
      return {
        totalMeasures: state.measures.length,
        totalLongTasks: state.longTasks.length,
        slowestOperations: [...state.measures]
          .sort((a, b) => b.duration - a.duration)
          .slice(0, 10),
        averageFps: state.framesPerSecond,
        memoryUsage: state.memorySnapshots.length > 0
          ? state.memorySnapshots[state.memorySnapshots.length - 1]
          : null,
        operationsByComponent: groupByComponent(state.measures),
        criticalPaths: criticalPathAnalysis.criticalPaths,
        bottlenecks: criticalPathAnalysis.bottlenecks,
        recordingDuration: state.isRecording
          ? performance.now() - state.startTime
          : null
      };
    },
    analyzeCriticalPaths
  };
}

// Utilitaire pour grouper les mesures par composant
function groupByComponent(measures: PerformanceEntry[]) {
  if (!state.isEnabled || !state.isRecording) return {};
  
  const result: Record<string, { 
    totalTime: number, 
    callCount: number, 
    operations: Record<string, { totalTime: number, callCount: number }>
  }> = {};
  
  measures.forEach(measure => {
    const component = measure.component || 'unknown';
    
    if (!result[component]) {
      result[component] = { totalTime: 0, callCount: 0, operations: {} };
    }
    
    result[component].totalTime += measure.duration;
    result[component].callCount++;
    
    if (!result[component].operations[measure.name]) {
      result[component].operations[measure.name] = { totalTime: 0, callCount: 0 };
    }
    
    result[component].operations[measure.name].totalTime += measure.duration;
    result[component].operations[measure.name].callCount++;
  });
  
  return result;
}

// Instance singleton pour l'utilisation dans n'importe quel fichier
export const performanceMonitor = {
  startRecording,
  stopRecording,
  clearRecording,
  startMeasure,
  measure,
  measureAsync,
  captureMemorySnapshot,
  createPerformanceTracker,
  createAsyncPerformanceTracker,
  setEnabled,
  analyzeCriticalPaths
}; 