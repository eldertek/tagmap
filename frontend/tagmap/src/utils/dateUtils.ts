/**
 * Utilitaires de formatage et manipulation de dates
 */

/**
 * Formate une date de manière sécurisée avec gestion des erreurs
 * @param dateString - Chaîne de date à formater
 * @param options - Options de formatage Intl.DateTimeFormat (facultatif)
 * @param defaultText - Texte à retourner en cas de date invalide (facultatif)
 * @returns Chaîne de date formatée ou message d'erreur
 */
export function formatDate(
  dateString: string | undefined | null, 
  options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  },
  defaultText: string = 'Date non définie'
): string {
  if (!dateString) {
    return defaultText;
  }

  try {
    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
      console.warn('[formatDate] Date invalide:', dateString);
      return 'Date invalide';
    }

    return new Intl.DateTimeFormat('fr-FR', options).format(date);
  } catch (error) {
    console.error('[formatDate] Erreur lors du formatage de la date:', error);
    return 'Date invalide';
  }
}

/**
 * Crée un objet Date à partir d'une chaîne de manière sécurisée
 * @param dateString - Chaîne de date à convertir
 * @returns Objet Date ou null si la date est invalide
 */
export function parseDate(dateString: string | undefined | null): Date | null {
  if (!dateString) return null;

  try {
    const date = new Date(dateString);

    // Vérifier si la date est valide
    if (isNaN(date.getTime())) {
      console.warn('[parseDate] Date invalide:', dateString);
      return null;
    }

    return date;
  } catch (error) {
    console.error('[parseDate] Erreur lors de la création de la date:', error);
    return null;
  }
}

/**
 * Formate une date relative (aujourd'hui, hier, cette semaine, etc.)
 * @param dateString - Chaîne de date à formater
 * @returns Chaîne de date relative
 */
export function formatRelativeDate(dateString: string | undefined | null): string {
  const date = parseDate(dateString);
  if (!date) return 'Date inconnue';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    // Aujourd'hui, afficher l'heure
    return `Aujourd'hui à ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  } else if (diffDays === 1) {
    // Hier
    return `Hier à ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  } else if (diffDays < 7) {
    // Cette semaine
    const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    return `${days[date.getDay()]} à ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  } else {
    // Plus ancien, afficher la date complète
    return formatDate(dateString);
  }
}

/**
 * Compare deux dates et vérifie si elles sont dans la même période
 * @param date - Date à comparer
 * @param period - Période de comparaison ('today', 'week', 'month', 'year')
 * @returns true si la date est dans la période spécifiée
 */
export function isDateInPeriod(date: Date | string | null, period: 'today' | 'week' | 'month' | 'year'): boolean {
  // Convertir la date en objet Date si nécessaire
  const dateObj = date instanceof Date ? date : parseDate(date as string);
  if (!dateObj) return false;

  const now = new Date();
  
  // Aujourd'hui : même jour
  if (period === 'today') {
    return dateObj.getDate() === now.getDate() && 
           dateObj.getMonth() === now.getMonth() && 
           dateObj.getFullYear() === now.getFullYear();
  }
  
  // Cette semaine : à partir du début de la semaine actuelle
  if (period === 'week') {
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Dimanche = 0
    startOfWeek.setHours(0, 0, 0, 0);
    return dateObj >= startOfWeek;
  }
  
  // Ce mois : à partir du début du mois actuel
  if (period === 'month') {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return dateObj >= startOfMonth;
  }
  
  // Cette année : à partir du début de l'année actuelle
  if (period === 'year') {
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    return dateObj >= startOfYear;
  }
  
  return false;
}

export default {
  formatDate,
  parseDate,
  formatRelativeDate,
  isDateInPeriod
};