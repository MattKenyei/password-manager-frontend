import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json'

export default defineManifest({
    manifest_version: 3,
    name: 'Password Manager',
    version: pkg.version,
    description: 'Zero-knowledge password manager with end-to-end encryption',
    action: {
        default_popup: 'src/extension/popup/index.html',
        default_title: 'Password Manager',
    },
    background: {
        service_worker: 'src/extension/background/index.ts',
        type: 'module',
    },
    content_scripts: [
        {
            matches: ['https://*/*', 'http://*/*'],
            js: ['src/extension/content/index.ts'],
            run_at: 'document_idle',
            exclude_matches: [
                'http://localhost:5173/*',
            ],
        },
    ],
    permissions: ['storage', 'activeTab', 'scripting'],
    host_permissions: ['http://localhost:8080/*'],
    web_accessible_resources: [
        {
            resources: ['*.wasm', 'assets/*.wasm', 'assets/*.js'],
            matches: ['<all_urls>'],
        },
    ],
})