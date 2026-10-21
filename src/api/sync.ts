import { api } from "./client"
import type { PullResponse, PushRequest, PushResponse } from "./types"

export const push = async (req: PushRequest): Promise<PushResponse> => {
    const { data } = await api.post<PushResponse>('/sync', req)
    return data
}

export const pull = async (since: number): Promise<PullResponse> => {
    const { data } = await api.get<PullResponse>('/sync', { params: { since } })
    return data
}