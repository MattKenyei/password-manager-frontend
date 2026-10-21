import { api } from "./client";
import type { DeviceResponse } from "./types";

export const listDevices = async (): Promise<DeviceResponse[]> => {
    const { data } = await api.get<DeviceResponse[]>('/devices')
    return data
}

export const revokeDevice = async (id: string): Promise<void> => {
    await api.delete(`/device/${id}`)
}