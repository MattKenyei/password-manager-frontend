import { test, expect } from '@playwright/test'

const uniqueEmail = () => `e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`
const MASTER_PASSWORD = 'test-master-password-123'

test('register → create item → reload → unlock → item persists', async ({ page }) => {
    const email = uniqueEmail()

    await page.goto('/register')
    await page.locator('input[type="email"]').fill(email)
    await page.locator('input[autocomplete="new-password"]').first().fill(MASTER_PASSWORD)
    await page.locator('input[autocomplete="new-password"]').nth(1).fill(MASTER_PASSWORD)
    await page.locator('button[type="submit"]').click()

    await expect(page).toHaveURL(/\/vault/)

    await page.getByRole('button', { name: '+ New' }).click()
    await page.locator('input').first().fill('Playwright Test Item')
    await page.getByRole('button', { name: /^Save$/ }).click()

    await expect(page.getByText('Playwright Test Item')).toBeVisible()

    await page.reload()
    await expect(page).toHaveURL(/\/unlock/)

    await page.locator('input[type="email"]').fill(email)
    await page.locator('input[autocomplete="current-password"]').fill(MASTER_PASSWORD)
    await page.locator('button[type="submit"]').click()

    await expect(page).toHaveURL(/\/vault/)
    await expect(page.getByText('Playwright Test Item')).toBeVisible()
})

test('create item, lock, unlock, item still there', async ({ page }) => {
    const email = uniqueEmail()

    await page.goto('/register')
    await page.locator('input[type="email"]').fill(email)
    await page.locator('input[autocomplete="new-password"]').first().fill(MASTER_PASSWORD)
    await page.locator('input[autocomplete="new-password"]').nth(1).fill(MASTER_PASSWORD)
    await page.locator('button[type="submit"]').click()
    await expect(page).toHaveURL(/\/vault/)

    await page.getByRole('button', { name: '+ New' }).click()
    await page.locator('input').first().fill('Lock Test')
    await page.getByRole('button', { name: /^Save$/ }).click()
    await expect(page.getByText('Lock Test')).toBeVisible()

    await page.goto('/settings')
    await page.getByRole('button', { name: 'Log out' }).click()
    await expect(page).toHaveURL(/\/unlock/)

    await page.locator('input[type="email"]').fill(email)
    await page.locator('input[autocomplete="current-password"]').fill(MASTER_PASSWORD)
    await page.locator('button[type="submit"]').click()

    await expect(page.getByText('Lock Test')).toBeVisible()
})

test('dark theme toggle persists across reload', async ({ page }) => {
    const email = uniqueEmail()

    await page.goto('/register')
    await page.locator('input[type="email"]').fill(email)
    await page.locator('input[autocomplete="new-password"]').first().fill(MASTER_PASSWORD)
    await page.locator('input[autocomplete="new-password"]').nth(1).fill(MASTER_PASSWORD)
    await page.locator('button[type="submit"]').click()
    await expect(page).toHaveURL(/\/vault/)

    await page.goto('/settings')
    await page.getByRole('button', { name: /^Dark$/ }).click()

    await expect(page.locator('html')).toHaveClass(/dark/)

    await page.reload()
    await expect(page.locator('html')).toHaveClass(/dark/)
})