<template>
    <div class="space-y-4">
        <div class="flex items-center gap-2">
            <code
                class="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-900 rounded-md font-mono text-sm break-all text-gray-800 dark:text-gray-100">
        {{ preview }}
      </code>
            <button type="button"
                class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Regenerate" @click="regenerate">
                ↻
            </button>
        </div>

        <div>
            <div class="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                <span>Strength: {{ strength.label }}</span>
                <span>{{ entropy }} bits</span>
            </div>
            <div class="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div :class="[strength.color, strength.width, 'h-full transition-all']" />
            </div>
        </div>

        <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Length: {{ opts.length }}
            </label>
            <input type="range" min="8" max="64" :value="opts.length" class="w-full"
                @input="setLength(Number(($event.target as HTMLInputElement).value))" />
        </div>

        <div class="grid grid-cols-2 gap-2 text-sm">
            <label class="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <input type="checkbox" :checked="opts.useLowercase" @change="toggle('useLowercase')" />
                a-z
            </label>
            <label class="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <input type="checkbox" :checked="opts.useUppercase" @change="toggle('useUppercase')" />
                A-Z
            </label>
            <label class="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <input type="checkbox" :checked="opts.useDigits" @change="toggle('useDigits')" />
                0-9
            </label>
            <label class="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <input type="checkbox" :checked="opts.useSymbols" @change="toggle('useSymbols')" />
                !@#$
            </label>
            <label class="flex items-center gap-2 col-span-2 text-gray-700 dark:text-gray-300">
                <input type="checkbox" :checked="opts.avoidAmbiguous" @change="toggle('avoidAmbiguous')" />
                Avoid ambiguous (lI1O0o)
            </label>
        </div>

        <button type="button" class="w-full py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            @click="apply">
            Use this password
        </button>
    </div>
</template>

<script setup lang="ts">
import { DEFAULT_GENERATOR_OPTIONS, estimateEntropy, generatePassword, type IGeneratorOptions } from '@/utils/password-generator';
import { computed, ref } from 'vue';

const emit = defineEmits<{ generated: [password: string] }>()

const opts = ref<IGeneratorOptions>({ ...DEFAULT_GENERATOR_OPTIONS })
const preview = ref(generatePassword(opts.value))

const entropy = computed(() => estimateEntropy(opts.value))

const strength = computed<{ label: string; color: string; width: string }>(() => {
    const bits = entropy.value
    if (bits < 50) return { label: 'Weak', color: 'bg-red-500', width: 'w-1/4' }
    if (bits < 70) return { label: 'Fair', color: 'bg-yellow-500', width: 'w-2/4' }
    if (bits < 100) return { label: 'Good', color: 'bg-blue-500', width: 'w-3/4' }
    return { label: 'Strong', color: 'bg-green-500', width: 'w-full' }
})

const regenerate = () => {
    preview.value = generatePassword(opts.value)
}

const apply = () => {
    emit('generated', preview.value)
}

const setLength = (v: number) => {
    opts.value = { ...opts.value, length: Math.max(8, Math.min(64, v)) }
    regenerate()
}

const toggle = (key: keyof Omit<IGeneratorOptions, 'length'>) => {
    const next = { ...opts.value, [key]: !opts.value[key] }
    const anyClass = next.useLowercase || next.useUppercase || next.useDigits || next.useSymbols
    if (!anyClass) return
    opts.value = next
    regenerate()
}

</script>