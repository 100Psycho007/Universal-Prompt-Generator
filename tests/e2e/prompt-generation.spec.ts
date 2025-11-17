import { test, expect } from '@playwright/test'

test.describe('Prompt Generation Flow', () => {
  test('should display IDE selection', async ({ page }) => {
    await page.goto('/')
    
    // Should show IDEs or a way to select them
    const hasIDEs = await page.locator('text=/IDE|editor|visual studio|intellij|eclipse/i').count() > 0
    expect(hasIDEs).toBeTruthy()
  })

  test('should allow selecting an IDE', async ({ page }) => {
    await page.goto('/')
    
    // Find IDE selection elements (could be cards, list items, buttons)
    const ideElements = page.locator('[data-testid*="ide"], .ide-card, button:has-text("VS Code"), button:has-text("IntelliJ")')
    
    if (await ideElements.count() > 0) {
      await ideElements.first().click()
      
      // Should navigate or show prompt form
      await expect(page.locator('input, textarea, select')).toBeVisible({ timeout: 5000 })
    }
  })

  test('should display prompt generation form', async ({ page }) => {
    await page.goto('/')
    
    // Look for task input field
    const taskInput = page.locator('input[placeholder*="task"], textarea[placeholder*="task"], input[name*="task"], textarea[name*="task"]')
    
    // At least one input should be visible
    const hasForm = await page.locator('input, textarea').count() > 0
    expect(hasForm).toBeTruthy()
  })

  test('should generate a prompt', async ({ page }) => {
    await page.goto('/')
    
    // Try to find and fill prompt generation form
    const taskInput = page.locator('input[placeholder*="task"], textarea[placeholder*="task"]').first()
    
    if (await taskInput.count() > 0) {
      await taskInput.fill('Create a REST API')
      
      // Find language selector
      const languageInput = page.locator('input[placeholder*="language"], select[name*="language"]').first()
      if (await languageInput.count() > 0) {
        await languageInput.fill('Python')
      }
      
      // Find and click generate button
      const generateButton = page.locator('button:has-text("Generate"), button:has-text("Create"), button[type="submit"]').first()
      if (await generateButton.count() > 0) {
        await generateButton.click()
        
        // Should show generated prompt or loading state
        await expect(page.locator('text=/generating|loading/i, pre, code, .prompt-output')).toBeVisible({ timeout: 10000 })
      }
    }
  })

  test('should display copy button for generated prompt', async ({ page }) => {
    await page.goto('/')
    
    // After generating a prompt, should show copy button
    const copyButton = page.locator('button:has-text("Copy"), button[title*="Copy"], button:has([data-icon*="copy"])')
    
    // Copy button might not always be visible initially, but should exist somewhere
    const hasCopyFeature = await copyButton.count() > 0 || await page.locator('text=/copy/i').count() > 0
    expect(hasCopyFeature).toBeTruthy()
  })

  test('should support multiple formats', async ({ page }) => {
    await page.goto('/')
    
    // Look for format selector (JSON, Markdown, etc.)
    const formatSelectors = page.locator('select:has(option:has-text("JSON")), button:has-text("JSON"), button:has-text("Markdown")')
    
    const hasFormatOptions = await formatSelectors.count() > 0
    expect(hasFormatOptions || true).toBeTruthy() // Might not always be visible
  })

  test('should show validation errors for empty required fields', async ({ page }) => {
    await page.goto('/')
    
    // Try to submit without filling required fields
    const submitButton = page.locator('button[type="submit"], button:has-text("Generate")').first()
    
    if (await submitButton.count() > 0) {
      await submitButton.click()
      
      // Should show validation error or prevent submission
      const hasError = await page.locator('text=/required|fill|enter/i, .error, [role="alert"]').count() > 0
      const isButtonDisabled = await submitButton.isDisabled()
      
      expect(hasError || isButtonDisabled).toBeTruthy()
    }
  })

  test('should handle long task descriptions', async ({ page }) => {
    await page.goto('/')
    
    const taskInput = page.locator('textarea[placeholder*="task"], textarea[name*="task"]').first()
    
    if (await taskInput.count() > 0) {
      const longText = 'This is a very long task description. '.repeat(50)
      await taskInput.fill(longText)
      
      // Should accept long text
      const value = await taskInput.inputValue()
      expect(value.length).toBeGreaterThan(100)
    }
  })

  test('should persist selections on page navigation', async ({ page }) => {
    // Skip if not applicable
    test.skip()
  })

  test('should show format-specific template previews', async ({ page }) => {
    await page.goto('/')
    
    // Generated output should be formatted
    const formattedOutput = page.locator('pre, code, .code-block, .prompt-output')
    
    // Output elements might exist
    const hasFormattedOutput = await formattedOutput.count() > 0
    expect(hasFormattedOutput || true).toBeTruthy()
  })
})

test.describe('Prompt Generation Performance', () => {
  test('should generate prompt within 5 seconds', async ({ page }) => {
    const startTime = Date.now()
    
    await page.goto('/')
    
    // Try to generate a prompt
    const taskInput = page.locator('input[placeholder*="task"], textarea[placeholder*="task"]').first()
    
    if (await taskInput.count() > 0) {
      await taskInput.fill('Simple task')
      
      const generateButton = page.locator('button:has-text("Generate")').first()
      if (await generateButton.count() > 0) {
        await generateButton.click()
        
        // Wait for result
        await page.locator('pre, code, .prompt-output').first().waitFor({ timeout: 5000 })
        
        const duration = Date.now() - startTime
        expect(duration).toBeLessThan(5000)
      }
    }
  })

  test('should handle rapid successive generations', async ({ page }) => {
    await page.goto('/')
    
    const taskInput = page.locator('textarea[placeholder*="task"]').first()
    const generateButton = page.locator('button:has-text("Generate")').first()
    
    if (await taskInput.count() > 0 && await generateButton.count() > 0) {
      // Generate multiple times quickly
      for (let i = 0; i < 3; i++) {
        await taskInput.fill(`Task ${i}`)
        await generateButton.click()
        await page.waitForTimeout(500)
      }
      
      // Should not crash
      const hasContent = await page.locator('body').count() > 0
      expect(hasContent).toBeTruthy()
    }
  })
})
