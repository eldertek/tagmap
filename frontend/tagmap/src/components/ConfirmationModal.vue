<template>
  <div class="fixed inset-0 z-[3001] overflow-y-auto">
    <div class="flex items-center justify-center min-h-screen w-full">
      <div class="fixed inset-0 transition-opacity" aria-hidden="true">
        <div class="absolute inset-0 bg-gray-500 opacity-75"></div>
      </div>
      <div
        class="relative bg-white w-full h-full md:rounded-lg md:max-w-lg md:h-auto md:max-h-[90vh] md:my-8 shadow-xl transform transition-all overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-headline"
      >
        <div class="p-4 md:p-6">
        <div class="flex items-start">
          <div class="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
            <svg class="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div class="ml-4 flex-1">
            <h3 class="text-lg leading-6 font-medium text-gray-900" id="modal-headline">
              {{ title }}
            </h3>
            <div class="mt-2">
              <p class="text-sm text-gray-500">
                {{ message }}
              </p>
            </div>
          </div>
        </div>
        <div class="mt-6 flex flex-col-reverse sm:flex-row-reverse sm:justify-end gap-3">
          <button
            type="button"
            class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:w-auto sm:text-sm"
            @click="$emit('confirm')"
          >
            Confirmer
          </button>
          <button
            type="button"
            class="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:w-auto sm:text-sm"
            @click="$emit('cancel')"
          >
            Annuler
          </button>
        </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
defineProps({
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  }
})
defineEmits(['confirm', 'cancel'])
</script>