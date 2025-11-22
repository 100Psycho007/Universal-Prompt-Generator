import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should display signup page', async ({ page }) => {
    await page.goto('/auth/signup')
    
    await expect(page).toHaveTitle(/Sign Up|Universal IDE/i)
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('should display login page', async ({ page }) => {
    await page.goto('/auth/login')
    
    await expect(page).toHaveTitle(/Log In|Login|Sign In|Universal IDE/i)
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('should show validation errors for invalid email', async ({ page }) => {
    await page.goto('/auth/signup')
    
    await page.fill('input[type="email"]', 'invalid-email')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    
    // Wait for validation error
    await expect(page.locator('text=/invalid|email/i')).toBeVisible({ timeout: 5000 })
  })

  test('should show validation errors for short password', async ({ page }) => {
    await page.goto('/auth/signup')
    
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'short')
    await page.click('button[type="submit"]')
    
    // Wait for validation error about password length
    await expect(page.locator('text=/password.*8/i')).toBeVisible({ timeout: 5000 })
  })

  test('should navigate between signup and login', async ({ page }) => {
    await page.goto('/auth/signup')
    
    // Find and click login link
    const loginLink = page.locator('a[href*="/auth/login"], text=/already.*account|log in/i')
    await loginLink.first().click()
    
    await expect(page).toHaveURL(/\/auth\/login/)
    
    // Navigate back to signup
    const signupLink = page.locator('a[href*="/auth/signup"], text=/create.*account|sign up/i')
    await signupLink.first().click()
    
    await expect(page).toHaveURL(/\/auth\/signup/)
  })

  test('should display Google OAuth button', async ({ page }) => {
    await page.goto('/auth/signup')
    
    const googleButton = page.locator('button:has-text("Google"), a:has-text("Google")')
    await expect(googleButton.first()).toBeVisible()
  })

  test('should display password reset page', async ({ page }) => {
    await page.goto('/auth/reset-password')
    
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('should show loading state during submission', async ({ page }) => {
    await page.goto('/auth/login')
    
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'password123')
    
    // Click submit and immediately check for loading state
    await page.click('button[type="submit"]')
    
    // Should show loading indicator (disabled button or loading text)
    const submitButton = page.locator('button[type="submit"]')
    await expect(submitButton).toBeDisabled({ timeout: 1000 }).catch(() => {
      // If not disabled, should have loading text
      expect(submitButton).toContainText(/loading|signing|processing/i)
    })
  })
})

test.describe('Guest Mode', () => {
  test('should allow browsing without authentication', async ({ page }) => {
    await page.goto('/')
    
    // Should be able to see content without logging in
    await expect(page).toHaveURL('/')
    
    // Check if there's a guest-accessible section
    const hasGuestContent = await page.locator('text=/browse|explore|get started/i').count() > 0
    expect(hasGuestContent).toBeTruthy()
  })

  test('should prompt to sign up for authenticated features', async ({ page }) => {
    await page.goto('/')
    
    // Try to access an authenticated feature
    // This might show a modal or redirect to login
    const signInPrompts = page.locator('text=/sign in|log in|sign up/i')
    const count = await signInPrompts.count()
    
    expect(count).toBeGreaterThan(0)
  })
})
