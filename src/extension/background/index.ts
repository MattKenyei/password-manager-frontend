import * as handlers from './handlers'
import type { ExtensionMessage, ExtensionResponse } from '../shared/messages'

let bootstrapped = false
let bootstrapPromise: Promise<void> | null = null

const ensureBootstrapped = async () => {
    if (bootstrapped) return
    if (!bootstrapPromise) {
        bootstrapPromise = handlers.bootstrap().then(() => {
            bootstrapped = true
        }).finally(() => {
            bootstrapPromise = null
        })
    }
    await bootstrapPromise
}

chrome.runtime.onInstalled.addListener(() => {
    void ensureBootstrapped()
})

chrome.runtime.onStartup.addListener(() => {
    void ensureBootstrapped()
})

chrome.runtime.onMessage.addListener((msg: ExtensionMessage, _sender, sendResponse) => {
    ; (async () => {
        try {
            await ensureBootstrapped()

            let data: unknown
            switch (msg.type) {
                case 'STATUS':
                    data = await handlers.getStatus()
                    break
                case 'UNLOCK_START':
                    data = await handlers.unlockStart(msg.email)
                    break
                case 'UNLOCK_FINISH':
                    await handlers.unlockFinish({
                        email: msg.email,
                        authKeyB64: msg.authKey,
                        accountKeyB64: msg.accountKey,
                        accessToken: msg.accessToken,
                        refreshToken: msg.refreshToken,
                    })
                    data = null
                    break
                case 'LOCK':
                    await handlers.lock()
                    data = null
                    break
                case 'SYNC':
                    await handlers.sync()
                    data = null
                    break
                case 'LIST_ITEMS':
                    data = await handlers.listItems()
                    break
                case 'CREATE_ITEM':
                    data = await handlers.createItem(msg.payload)
                    break
                case 'UPDATE_ITEM':
                    await handlers.updateItem(msg.id, msg.payload)
                    data = null
                    break
                case 'DELETE_ITEM':
                    await handlers.deleteItem(msg.id)
                    data = null
                    break
                case 'GET_CREDENTIALS_FOR_URL':
                    data = await handlers.getCredentialsForUrl(msg.url)
                    break
                default:
                    throw new Error(`unknown message type: ${(msg as { type: string }).type}`)
            }

            sendResponse({ ok: true, data } as ExtensionResponse)
        } catch (err) {
            sendResponse({
                ok: false,
                error: err instanceof Error ? err.message : String(err),
            } as ExtensionResponse)
        }
    })()

    return true
})