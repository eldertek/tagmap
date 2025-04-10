<style>
/* Styles de base */
body {
  @apply bg-gray-50;
}

/* Sur desktop, on garde le overflow hidden */
@media (min-width: 768px) {
  body, #app {
    @apply h-screen overflow-hidden;
  }
}

/* Sur mobile, on permet le scroll mais on garde une structure fixe */
@media (max-width: 767px) {
  body, #app {
    @apply min-h-screen overflow-hidden;
    position: fixed;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
  }

  /* Ajuster la hauteur du contenu principal */
  main {
    height: calc(100vh - var(--header-height)) !important;
    min-height: calc(100vh - var(--header-height)) !important;
    position: relative;
    z-index: 1;
  }

  /* Ajuster la position de MapToolbar */
  .map-toolbar {
    position: fixed;
    top: var(--header-height);
    left: 0;
    right: 0;
    z-index: 1500;
    background-color: white;
    border-bottom: 1px solid #e5e7eb;
    height: var(--mobile-toolbar-height);
  }

  /* Ajuster la position de DrawingTools */
  .drawing-tools-panel {
    position: fixed;
    top: calc(var(--header-height) + var(--mobile-toolbar-height));
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 2000;
    background-color: white;
    transform: translateY(100%);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .drawing-tools-panel.open {
    transform: translateY(0);
  }

  /* Ajuster le conteneur de la carte */
  .map-container {
    position: absolute;
    top: calc(var(--header-height) + var(--mobile-toolbar-height));
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1;
  }

  /* Ajuster les menus déroulants */
  .dropdown-menu {
    position: fixed !important;
    top: calc(var(--header-height) + var(--mobile-toolbar-height)) !important;
    left: 0 !important;
    right: 0 !important;
    width: 100% !important;
    max-height: calc(100vh - var(--header-height) - var(--mobile-toolbar-height));
    overflow-y: auto;
    z-index: 3000;
  }

  /* Ajuster le menu mobile */
  .mobile-menu {
    position: fixed;
    top: var(--header-height);
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 3000;
    background-color: white;
    overflow-y: auto;
  }
}

/* Animation de la cloche de notification */
@keyframes bell-ring {
  0% { transform: rotate(0); }
  10% { transform: rotate(10deg); }
  20% { transform: rotate(-10deg); }
  30% { transform: rotate(6deg); }
  40% { transform: rotate(-6deg); }
  50% { transform: rotate(0); }
  100% { transform: rotate(0); }
}

.animate-bell {
  animation: bell-ring 0.6s cubic-bezier(0.36, 0.07, 0.19, 0.97);
  animation-iteration-count: 1;
  transform-origin: top center;
  will-change: transform;
}

/* Dynamic Island Style */
.dynamic-island {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
  overflow: hidden;
  backdrop-filter: blur(4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2), 0 2px 4px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  will-change: transform, width, border-radius;
  transform: translateZ(0);
}

.island-pill {
  width: 42px;
  height: 36px;
  border-radius: 20px;
  transform-origin: center right;
}

.island-expanded {
  width: auto;
  max-width: min(400px, 90%);
  min-width: 42px;
  height: 36px;
  border-radius: 20px;
  transform-origin: center right;
}

/* Animations pour Dynamic Island */
.island-enter-active,
.island-leave-active {
  transition: all 0.25s cubic-bezier(0.22, 1, 0.36, 1);
  will-change: transform, opacity;
}

.island-enter-from {
  transform: scale(0.9);
  opacity: 0;
}

.island-leave-to {
  transform: scale(0.9);
  opacity: 0;
}

/* Animation pour le message */
.message-container {
  max-width: 300px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  will-change: opacity, transform;
}

.message-enter-active {
  transition: all 0.2s cubic-bezier(0.22, 1, 0.36, 1);
}

.message-leave-active {
  transition: all 0.15s cubic-bezier(0.22, 1, 0.36, 1);
}

.message-enter-from {
  opacity: 0;
  transform: translateX(-10px);
}

.message-leave-to {
  opacity: 0;
  transform: translateX(10px);
}

/* Ajout d'une variable CSS pour la hauteur du header et de la barre d'outils mobile */
:root {
  --header-height: 64px; /* 4rem = 64px */
  --mobile-toolbar-height: 50px; /* Hauteur de la barre d'outils mobile */
  --mobile-bottom-toolbar-height: 48px; /* Hauteur de la barre d'outils en bas sur mobile */
}
</style> 