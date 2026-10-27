import Dexie, { type Table } from "dexie";
import type { DbItem, DbMeta, DbPendingChange } from "./types";

class VaultDatabase extends Dexie {
    items!: Table<DbItem, string>
    pending_changes!: Table<DbPendingChange, string>
    meta!: Table<DbMeta, string>

    constructor() {
        super('pm_vault')

        this.version(1).stores({
            items: 'id, updated_at, sync_state, deleted',
            pending_changes: 'id, queued_at',
            meta: 'key'
        })
    }
}

export const db = new VaultDatabase()