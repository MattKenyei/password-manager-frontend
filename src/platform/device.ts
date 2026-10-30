import { isExtension } from "./env"

const DEVICE_ID_KEY = 'pm.device_id'
const DEVICE_NAME_KEY = 'pm.device_name'
const DEVICE_PLATFORM_KEY = 'pm.device_platform'

const generateUUID = (): string => crypto.randomUUID()

export const getDeviceID = (): string => {
    let id = localStorage.getItem(DEVICE_ID_KEY)
    if (!id) {
        id = generateUUID()
        localStorage.setItem(DEVICE_ID_KEY, id)
    }
    return id
}

const detectPlatform = (): string => {
    const ua = navigator.userAgent.toLowerCase()
    if (/iphone|ipad|ipod/.test(ua)) return 'ios'
    if (/android/.test(ua)) return 'android'
    if (/macintosh|mac os x/.test(ua)) return 'desktop'
    if (/windows/.test(ua)) return 'desktop'
    if (/linux/.test(ua)) return 'desktop'
    return 'web'
}

export const getDeviceName = (): string => {
    const saved = localStorage.getItem(DEVICE_NAME_KEY)
    if (saved) return saved
    const ua = navigator.userAgent
    let guess = 'Web Browser'
    if (/Macintosh/.test(ua)) guess = 'Mac (Browser)'
    else if (/Windows/.test(ua)) guess = 'Windows (Browser)'
    else if (/iPhone/.test(ua)) guess = 'iPhone'
    else if (/Android/.test(ua)) guess = 'Android'
    else if (/Linux/.test(ua)) guess = 'Linux (Browser)'
    localStorage.setItem(DEVICE_NAME_KEY, guess)
    return guess
}

export const setDeviceName = (name: string) => {
    localStorage.setItem(DEVICE_NAME_KEY, name)
}

export const getDevicePlatform = (): string => {
    if (isExtension()) return 'extension'
    const saved = localStorage.getItem(DEVICE_PLATFORM_KEY)
    if (saved) return saved
    const p = detectPlatform()
    localStorage.setItem(DEVICE_PLATFORM_KEY, p)
    return p
}