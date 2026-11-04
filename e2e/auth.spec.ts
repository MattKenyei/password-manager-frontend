import { test, expect } from '@playwright/test'

const uniqueEmail = () => `e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`
const MASTER_PASSWORD = 'test-master-password-123'

const register = async (page, email: string): Promise<void> => {
    await page.goto('/register')
    await page.locator('input[type="email"]').fill(email)
    await page.locator('input[autocomplete="new-password"]').first().fill(MASTER_PASSWORD)
    await page.locator('input[autocomplete="new-password"]').nth(1).fill(MASTER_PASSWORD)
    await page.locator('button[type="submit"]').click()
    await expect(page).toHaveURL(/\/vault/, { timeout: 15_000 })
}

const createItem = async (page, title: string): Promise<void> => {
    await page.getByTestId('new-item').click()
    await page.getByTestId('item-title').fill(title)
    await page.getByTestId('item-save').click()
    await expect(page.getByText(title, { exact: true })).toBeVisible({ timeout: 10_000 })
}

test('register → create item → reload → unlock → item persists', async ({ page }) => {
    const email = uniqueEmail()

    await register(page, email)
    await createItem(page, 'Playwright Test Item')

    await page.reload()
    await expect(page).toHaveURL(/\/unlock/)

    await page.locator('input[type="email"]').fill(email)
    await page.locator('input[autocomplete="current-password"]').fill(MASTER_PASSWORD)
    await page.locator('button[type="submit"]').click()

    await expect(page).toHaveURL(/\/vault/, { timeout: 15_000 })
    await expect(page.getByText('Playwright Test Item', { exact: true })).toBeVisible({ timeout: 10_000 })
})

test('create item, log out, unlock, item still there', async ({ page }) => {
    const email = uniqueEmail()

    await register(page, email)
    await createItem(page, 'Lock Test')

    await page.getByTestId('nav-settings').click()
    await expect(page).toHaveURL(/\/settings/)

    await page.getByTestId('logout').click()
    await expect(page).toHaveURL(/\/unlock/)

    await page.locator('input[type="email"]').fill(email)
    await page.locator('input[autocomplete="current-password"]').fill(MASTER_PASSWORD)
    await page.locator('button[type="submit"]').click()

    await expect(page.getByText('Lock Test', { exact: true })).toBeVisible({ timeout: 10_000 })
})

test('dark theme toggle persists across reload', async ({ page }) => {
    const email = uniqueEmail()

    await register(page, email)

    await page.getByTestId('nav-settings').click()
    await expect(page).toHaveURL(/\/settings/)

    await page.getByTestId('theme-dark').click()

    await expect(page.locator('html')).toHaveClass(/dark/)

    await page.reload()
    await expect(page.locator('html')).toHaveClass(/dark/)
})