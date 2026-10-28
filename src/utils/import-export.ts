import Papa from 'papaparse'
import { encrypt, decrypt } from '@/crypto/cipher'
import { deriveKey, DEFAULT_KDF_PARAMS } from '@/crypto/argon2'
import { bytesToBase64, base64ToBytes } from '@/crypto/base64'
import { getAccountKey } from '@/crypto/session'
import { decryptPayload } from '@/crypto/item'
import type { DbItem, IItemPayload } from '@/db/types'

const sanitizeForCsv = (val: string): string => {
    if (!val) return ''
    return /^[=+\-@]/.test(val) ? `'${val}` : val
}

export const exportPlaintextJson = async (items: DbItem[]): Promise<string> => {
    const accountKey = getAccountKey()
    const payloads: IItemPayload[] = []

    for (const item of items) {
        if (item.deleted) continue
        try {
            const payload = await decryptPayload(accountKey, item.id, item.encrypted_blob)
            payloads.push(payload)
        } catch (err) {
            console.error('Skipping item due to decryption error:', item.id, err)
        }
    }

    return JSON.stringify(payloads, null, 2)
}

export const exportPlaintextCsv = async (items: DbItem[]): Promise<string> => {
    const accountKey = getAccountKey()
    const rows: Record<string, string>[] = []

    for (const item of items) {
        if (item.deleted) continue
        try {
            const p = await decryptPayload(accountKey, item.id, item.encrypted_blob)
            rows.push({
                name: sanitizeForCsv(p.title),
                url: sanitizeForCsv(p.url),
                username: sanitizeForCsv(p.username),
                password: sanitizeForCsv(p.password),
                notes: sanitizeForCsv(p.notes),
                tags: sanitizeForCsv(p.tags.join(',')),
            })
        } catch (err) {
            console.error('Skipping item due to decryption error:', item.id, err)
        }
    }

    return Papa.unparse(rows)
}

export const exportEncryptedBackup = async (
    exportPassword: string,
    items: DbItem[],
): Promise<string> => {
    const accountKey = getAccountKey()
    const payloads: IItemPayload[] = []

    for (const item of items) {
        if (item.deleted) continue
        const payload = await decryptPayload(accountKey, item.id, item.encrypted_blob)
        payloads.push(payload)
    }

    const salt = crypto.getRandomValues(new Uint8Array(16))
    const backupKey = await deriveKey(
        new TextEncoder().encode(exportPassword),
        salt,
        DEFAULT_KDF_PARAMS,
    )

    const jsonStr = JSON.stringify(payloads)
    const encryptedBlob = await encrypt(backupKey, new TextEncoder().encode(jsonStr))
    backupKey.fill(0)

    const backupFile = {
        format: 'pm-backup',
        version: 1,
        kdf: {
            algo: 'argon2id',
            memoryKiB: DEFAULT_KDF_PARAMS.memoryKiB,
            iterations: DEFAULT_KDF_PARAMS.iterations,
            parallelism: DEFAULT_KDF_PARAMS.parallelism,
        },
        salt: bytesToBase64(salt),
        blob: bytesToBase64(encryptedBlob),
    }

    return JSON.stringify(backupFile, null, 2)
}

export const importEncryptedBackup = async (
    exportPassword: string,
    jsonContent: string,
): Promise<IItemPayload[]> => {
    let backup
    try {
        backup = JSON.parse(jsonContent)
    } catch {
        throw new Error('Invalid JSON file')
    }

    if (backup.format !== 'pm-backup' || backup.version !== 1) {
        throw new Error('Unrecognized backup format')
    }

    const salt = base64ToBytes(backup.salt)
    const backupKey = await deriveKey(
        new TextEncoder().encode(exportPassword),
        salt,
        DEFAULT_KDF_PARAMS,
    )

    try {
        const decrypted = await decrypt(backupKey, base64ToBytes(backup.blob))
        return JSON.parse(new TextDecoder().decode(decrypted)) as IItemPayload[]
    } catch {
        throw new Error('Incorrect export password or corrupted backup')
    } finally {
        backupKey.fill(0)
    }
}

const normalizeRow = (row: any): IItemPayload => {
    const title = row.title || row.name || row.Name || row.Title || 'Imported Item'
    const username = row.username || row.Username || row.login_username || row.login || ''
    const password = row.password || row.Password || row.login_password || ''
    const url = row.url || row.URL || row.login_uri || row.website || ''
    const notes = row.notes || row.Notes || row.note || ''

    let tags: string[] = []
    if (Array.isArray(row.tags)) tags = row.tags
    else if (typeof row.tags === 'string') tags = row.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
    else if (typeof row.folder === 'string') tags = [row.folder]

    return { title, username, password, url, notes, tags }
}

export const importPlaintext = async (
    content: string,
    filename: string,
): Promise<IItemPayload[]> => {
    const ext = filename.split('.').pop()?.toLowerCase()

    if (ext === 'json') {
        const data = JSON.parse(content)
        if (!Array.isArray(data)) throw new Error('JSON root must be an array of items')
        return data.map(normalizeRow)
    }

    if (ext === 'csv') {
        const { data, errors } = Papa.parse(content, {
            header: true,
            skipEmptyLines: true,
        })
        if (errors.length > 0) {
            throw new Error(`CSV parse error: ${errors[0].message}`)
        }
        return (data as any[]).map(normalizeRow)
    }

    throw new Error('Unsupported file format. Please use .json or .csv')
}

export const downloadFile = (content: string, filename: string, mime: string): void => {
    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
}