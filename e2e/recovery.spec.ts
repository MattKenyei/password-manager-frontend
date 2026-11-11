import { test, expect, type Page } from '@playwright/test'

const uniqueEmail = () => `recover-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`
const OLD_PASSWORD = 'old-master-password-123'
const NEW_PASSWORD = 'new-master-password-456'

const registerAndGetRecoveryCode = async (page: Page, email: string): Promise<string> => {
    await page.goto('/register')
    await page.locator('input[type="email"]').fill(email)
    await page.locator('input[autocomplete="new-password"]').first().fill(OLD_PASSWORD)
    await page.locator('input[autocomplete="new-password"]').nth(1).fill(OLD_PASSWORD)
    await page.locator('button[type="submit"]').click()

    await expect(page.getByTestId('recovery-code-modal')).toBeVisible({ timeout: 15_000 })

    const codeEl = page.getByTestId('recovery-code-value')
    const code = (await codeEl.textContent())?.trim() ?? ''
    expect(code.length).toBeGreaterThan(0)

    await page.getByTestId('recovery-confirm-checkbox').check()
    await page.getByTestId('recovery-continue').click()
    await expect(page).toHaveURL(/\/vault/, { timeout: 15_000 })

    return code
}

test('recovery: forgot password → recover → login with new password → items intact', async ({ page }) => {
    const email = uniqueEmail()

    const recoveryCode = await registerAndGetRecoveryCode(page, email)

    await page.getByTestId('new-item').click()
    await page.getByTestId('item-title').fill('Survives Recovery')
    await page.getByTestId('item-save').click()
    await expect(page.getByText('Survives Recovery', { exact: true })).toBeVisible({ timeout: 10_000 })

    await page.getByTestId('nav-settings').click()
    await page.getByTestId('logout').click()
    await expect(page).toHaveURL(/\/unlock/)

    await page.getByTestId('forgot-password-link').click()
    await expect(page).toHaveURL(/\/recover/)

    await page.locator('input[type="email"]').fill(email)
    await page.getByTestId('recover-continue').click()

    await expect(page.getByTestId('recover-code-input')).toBeVisible({ timeout: 10_000 })
    await page.getByTestId('recover-code-input').fill(recoveryCode)
    await page.getByTestId('recover-new-password').fill(NEW_PASSWORD)
    await page.getByTestId('recover-new-password-confirm').fill(NEW_PASSWORD)
    await page.getByTestId('recover-submit').click()

    await expect(page.getByTestId('recovery-code-modal')).toBeVisible({ timeout: 15_000 })
    await page.getByTestId('recovery-confirm-checkbox').check()
    await page.getByTestId('recovery-continue').click()

    await expect(page).toHaveURL(/\/unlock/, { timeout: 15_000 })
    await page.locator('input[type="email"]').fill(email)
    await page.locator('input[autocomplete="current-password"]').fill(NEW_PASSWORD)
    await page.locator('button[type="submit"]').click()

    await expect(page).toHaveURL(/\/vault/, { timeout: 15_000 })
    await expect(page.getByText('Survives Recovery', { exact: true })).toBeVisible({ timeout: 10_000 })
})

test('recovery: old password no longer works after recovery', async ({ page }) => {
    const email = uniqueEmail()

    const recoveryCode = await registerAndGetRecoveryCode(page, email)

    await page.getByTestId('nav-settings').click()
    await page.getByTestId('logout').click()
    await expect(page).toHaveURL(/\/unlock/)

    await page.getByTestId('forgot-password-link').click()
    await page.locator('input[type="email"]').fill(email)
    await page.getByTestId('recover-continue').click()

    await expect(page.getByTestId('recover-code-input')).toBeVisible({ timeout: 10_000 })
    await page.getByTestId('recover-code-input').fill(recoveryCode)
    await page.getByTestId('recover-new-password').fill(NEW_PASSWORD)
    await page.getByTestId('recover-new-password-confirm').fill(NEW_PASSWORD)
    await page.getByTestId('recover-submit').click()

    await expect(page.getByTestId('recovery-code-modal')).toBeVisible({ timeout: 15_000 })
    await page.getByTestId('recovery-confirm-checkbox').check()
    await page.getByTestId('recovery-continue').click()

    await expect(page).toHaveURL(/\/unlock/, { timeout: 15_000 })

    await page.locator('input[type="email"]').fill(email)
    await page.locator('input[autocomplete="current-password"]').fill(OLD_PASSWORD)
    await page.locator('button[type="submit"]').click()

    await expect(page).toHaveURL(/\/unlock/)
    await expect(page.getByText(/invalid email or password/i)).toBeVisible({ timeout: 5_000 })
})

test('recovery: wrong recovery code fails', async ({ page }) => {
    const email = uniqueEmail()

    await registerAndGetRecoveryCode(page, email)

    await page.getByTestId('nav-settings').click()
    await page.getByTestId('logout').click()

    await page.getByTestId('forgot-password-link').click()
    await page.locator('input[type="email"]').fill(email)
    await page.getByTestId('recover-continue').click()

    await expect(page.getByTestId('recover-code-input')).toBeVisible({ timeout: 10_000 })

    await page.getByTestId('recover-code-input').fill('AAAAAAAA AAAAAAAA AAAAAAAA AAAAAAAA AAAAAAAA AAAAAAAA AAAA')
    await page.getByTestId('recover-new-password').fill(NEW_PASSWORD)
    await page.getByTestId('recover-new-password-confirm').fill(NEW_PASSWORD)
    await page.getByTestId('recover-submit').click()

    await expect(page.getByText(/invalid recovery code/i)).toBeVisible({ timeout: 10_000 })
    await expect(page).toHaveURL(/\/recover/)
})