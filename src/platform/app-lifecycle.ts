import { App } from "@capacitor/app"
import { isCapacitor } from "./env"

export const onAppStateChange = (handler: (isActive: boolean) => void): (() => void) => {
    if (!isCapacitor()) {
        return () => { }
    }

    let listenerHandle: { remove: () => void } | null = null

    App.addListener('appStateChange', (state) => {
        handler(state.isActive)
    }).then((handle) => {
        listenerHandle = handle
    })

    return () => {
        listenerHandle?.remove()
    }
} 