<template>
    <div v-if="password" class="space-y-1">
        <div class="flex justify-between text-xs text-gray-600 dark:text-gray-400">
            <span>{{ strength.label }}</span>
        </div>
        <div class="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div :class="[strength.color, strength.width, 'h-full transition-all duration-300']" />
        </div>
        <p v-if="strength.warning" class="text-xs text-red-500 dark:text-red-400">
            {{ strength.warning }}
        </p>
        <ul v-if="strength.suggestions.length" class="text-xs text-gray-500 dark:text-gray-400 list-disc list-inside">
            <li v-for="s in strength.suggestions" :key="s">{{ s }}</li>
        </ul>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { checkPasswordStrength } from '@/utils/password-strength'

const props = defineProps<{ password: string }>()

const strength = computed(() => checkPasswordStrength(props.password))
</script>
