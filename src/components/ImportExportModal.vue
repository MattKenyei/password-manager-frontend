<template>
    <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="close">
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">

            <div class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-100">Data Management</h2>
                <button type="button" class="text-gray-500 hover:text-gray-700 dark:hover:text-gray-200"
                    @click="close">✕</button>
            </div>

            <div class="flex border-b border-gray-200 dark:border-gray-700 px-6 pt-4 gap-6">
                <button type="button" class="pb-2 text-sm font-medium border-b-2 transition-colors"
                    :class="activeTab === 'export' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'"
                    @click="activeTab = 'export'; resetState()">
                    Export
                </button>
                <button type="button" class="pb-2 text-sm font-medium border-b-2 transition-colors"
                    :class="activeTab === 'import' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'"
                    @click="activeTab = 'import'; resetState()">
                    Import
                </button>
            </div>

            <div class="p-6 overflow-auto space-y-6">

                <div v-if="activeTab === 'export'" class="space-y-6">

                    <div class="space-y-3">
                        <h3 class="text-lg font-medium text-gray-800 dark:text-gray-100">Encrypted Backup (Recommended)
                        </h3>
                        <p class="text-sm text-gray-600 dark:text-gray-400">
                            Creates a secure JSON file encrypted with a password of your choice. You will need this
                            password to restore the backup.
                        </p>
                        <div class="flex gap-2 items-start">
                            <input v-model="backupPassword" type="password" placeholder="Backup password"
                                class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                            <button type="button"
                                class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                                :disabled="!backupPassword || isExporting" @click="handleExportEncrypted">
                                {{ isExporting ? 'Exporting...' : 'Export' }}
                            </button>
                        </div>
                        <p v-if="exportError" class="text-sm text-red-600 dark:text-red-400">{{ exportError }}</p>
                    </div>

                    <hr class="border-gray-200 dark:border-gray-700" />

                    <div class="space-y-3">
                        <h3 class="text-lg font-medium text-gray-800 dark:text-gray-100">Plaintext Export (Unsafe)</h3>
                        <p class="text-sm text-red-600 dark:text-red-400 font-medium">
                            Warning: Your data will be saved in plain text. Anyone with access to the file can read your
                            passwords.
                        </p>
                        <div class="flex gap-2">
                            <button type="button"
                                class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                                :disabled="isExporting" @click="handleExportPlaintext('json')">
                                Export JSON
                            </button>
                            <button type="button"
                                class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                                :disabled="isExporting" @click="handleExportPlaintext('csv')">
                                Export CSV
                            </button>
                        </div>
                    </div>
                </div>

                <div v-if="activeTab === 'import'" class="space-y-6">

                    <div v-if="importSuccess"
                        class="p-3 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 rounded-md border border-green-200 dark:border-green-900/50 text-sm">
                        {{ importSuccess }}
                    </div>

                    <div v-else class="space-y-4">
                        <p class="text-sm text-gray-600 dark:text-gray-400">
                            Upload a <strong>.json</strong> or <strong>.csv</strong> file. Supports encrypted backups,
                            Bitwarden, 1Password, and Chrome exports.
                        </p>

                        <div v-if="!isEncryptedFile">
                            <label
                                class="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                <div class="flex flex-col items-center justify-center pt-5 pb-6">
                                    <p class="mb-2 text-sm text-gray-500 dark:text-gray-400">
                                        <span class="font-semibold">Click to select</span> or drag and drop
                                    </p>
                                    <p class="text-xs text-gray-500 dark:text-gray-400">JSON, CSV</p>
                                </div>
                                <input type="file" class="hidden" accept=".json,.csv" @change="handleFileSelect" />
                            </label>
                        </div>

                        <div v-else
                            class="p-4 bg-gray-50 dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-700 space-y-3">
                            <p class="text-sm font-medium text-gray-800 dark:text-gray-100">
                                This backup is encrypted. Enter the backup password:
                            </p>
                            <div class="flex gap-2">
                                <input v-model="importPassword" type="password" placeholder="Backup password"
                                    class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                                <button type="button"
                                    class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 min-w-24"
                                    :disabled="!importPassword || isImporting" @click="handleDecryptImport">
                                    {{ isImporting ? 'Decrypting...' : 'Decrypt' }}
                                </button>
                                <button type="button"
                                    class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    @click="resetState">
                                    Cancel
                                </button>
                            </div>
                        </div>

                        <p v-if="importError" class="text-sm text-red-600 dark:text-red-400">{{ importError }}</p>
                    </div>
                </div>

            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { getAllItems } from '@/db/items-repo';
import { useVaultStore } from '@/stores/vault';
import { downloadFile, exportEncryptedBackup, exportPlaintextCsv, exportPlaintextJson, importEncryptedBackup, importPlaintext } from '@/utils/import-export';
import { ref } from 'vue';

interface IProps {
    open: boolean
}

interface IEmits {
    close: []
}

const props = defineProps<IProps>()
const emit = defineEmits<IEmits>()

const vault = useVaultStore()

type Tab = 'export' | 'import'
const activeTab = ref<Tab>('export')

const backupPassword = ref('')
const isExporting = ref(false)
const exportError = ref<string | null>(null)

const importPassword = ref('')
const isImporting = ref(false)
const importError = ref<string | null>(null)
const importSuccess = ref<string | null>(null)
const isEncryptedFile = ref(false)
const pendingFileContent = ref<string | null>(null)
const pendingFileName = ref<string | null>(null)

const resetState = () => {
    backupPassword.value = ''
    importPassword.value = ''
    exportError.value = null
    importError.value = null
    importSuccess.value = null
    isEncryptedFile.value = false
    pendingFileContent.value = null
    pendingFileName.value = null
    isExporting.value = false
    isImporting.value = false
}

const handleExportEncrypted = async () => {
    if (!backupPassword.value) return
    isExporting.value = true
    exportError.value = null
    try {
        const allDbItems = await getAllItems()

        const fileContent = await exportEncryptedBackup(backupPassword.value, allDbItems)
        downloadFile(fileContent, `vault-backup-${new Date().toISOString().split('T')[0]}.json`, 'application/json')
    } catch (error) {
        exportError.value = (error as Error).message
    } finally {
        isExporting.value = false;
        backupPassword.value = ''
    }
}

const handleExportPlaintext = async (format: 'json' | 'csv') => {
    if (!confirm('WARNING: Exporting in plaintext will expose all your passwords. Make sure you delete the file after use. Continue?')) return
    isExporting.value = true
    exportError.value = null

    try {
        const allDbItems = await getAllItems()

        const fileContent = format === 'json' ? await exportPlaintextJson(allDbItems) : await exportPlaintextCsv(allDbItems)
        downloadFile(fileContent, `vault-plaintext-${new Date().toISOString().split('T')[0]}.${format}`, format === 'json' ? 'application/json' : 'text/csv')
    } catch (error) {
        exportError.value = (error as Error).message
    } finally {
        isExporting.value = false
    }
}

const doImportPlaintext = async (content: string, filename: string): Promise<void> => {
    isImporting.value = true
    importError.value = null
    try {
        const payloads = await importPlaintext(content, filename)
        const count = await vault.importPayloads(payloads)
        importSuccess.value = `Successfully imported ${count} items`
        pendingFileContent.value = null
    } catch (err) {
        importError.value = (err as Error).message
    } finally {
        isImporting.value = false
    }
}

const handleFileSelect = async (e: Event) => {
    const target = e.target as HTMLInputElement
    const file = target.files?.[0]
    if (!file) return

    resetState()
    pendingFileName.value = file.name

    const reader = new FileReader()
    reader.onload = async (event) => {
        const content = event.target?.result as string
        pendingFileContent.value = content

        try {
            const parsed = JSON.parse(content)
            if (parsed.format === 'pm-backup')
                isEncryptedFile.value = true
            else await doImportPlaintext(content, file.name)
        } catch {
            if (file.name.endsWith('.csv'))
                await doImportPlaintext(content, file.name)
            else importError.value = 'Unsupported file format'
        }
    }
    reader.readAsText(file)
    target.value = ''
}

const handleDecryptImport = async (): Promise<void> => {
    if (!importPassword.value) {
        importError.value = 'Please enter the backup password'
        return
    }
    if (!pendingFileContent.value) {
        importError.value = 'File content is missing. Please select the file again.'
        return
    }

    isImporting.value = true
    importError.value = null
    try {
        const payloads = await importEncryptedBackup(importPassword.value, pendingFileContent.value)
        const count = await vault.importPayloads(payloads)
        importSuccess.value = `Successfully imported ${count} items`
        isEncryptedFile.value = false
        pendingFileContent.value = null
        importPassword.value = ''
    } catch (err) {
        importError.value = (err as Error).message
    } finally {
        isImporting.value = false
    }
}

const close = () => {
    resetState()
    emit('close')
}

</script>