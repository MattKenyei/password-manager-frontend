export const bytesToBase64 = (bytes: Uint8Array): string => {
    let binary = ''
    for (let i = 0; i < bytes.length; i++)
        binary += String.fromCharCode(bytes[i])
    return btoa(binary)
}

export const base64ToBytes = (b64: string): Uint8Array => {
    const binary = atob(b64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++)
        bytes[i] = binary.charCodeAt(i)
    return bytes
}

export const bytesToBase64Url = (bytes: Uint8Array): string => {
    return bytesToBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export const base64UrlToBytes = (b64url: string): Uint8Array => {
    const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((b64url.length + 3) % 4)
    return base64ToBytes(b64)
}