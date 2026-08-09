import { expect, test } from '@playwright/test'

test.describe('AI Organizer sidebar — critical local-first path', () => {
  test('creates a nested folder and the organization survives a reload', async ({ page }) => {
    await page.goto('/sidebar.html')
    await expect(page.getByRole('heading', { name: 'AI Organizer' })).toBeVisible()

    await page.getByRole('button', { name: '+ Dossier' }).click()
    await expect(page.getByRole('button', { name: 'Nouveau dossier' })).toBeVisible()

    await page.getByRole('button', { name: 'Sous-dossier' }).click()
    await expect(page.getByRole('button', { name: 'Nouveau dossier' })).toHaveCount(2)

    // Simulates closing and reopening Firefox: IndexedDB must be the source of truth, not React state.
    await page.reload()

    await expect(page.getByRole('heading', { name: 'AI Organizer' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Nouveau dossier' })).toHaveCount(2)
  })

  test('deleting a folder persists across a reload', async ({ page }) => {
    await page.goto('/sidebar.html')
    await page.getByRole('button', { name: '+ Dossier' }).click()
    await expect(page.getByRole('button', { name: 'Nouveau dossier' })).toBeVisible()

    page.once('dialog', (dialog) => void dialog.accept())
    await page.getByRole('button', { name: 'Supprimer' }).click()
    await expect(page.getByRole('button', { name: 'Nouveau dossier' })).toHaveCount(0)

    await page.reload()
    await expect(page.getByRole('button', { name: 'Nouveau dossier' })).toHaveCount(0)
  })

  test('exports the workspace as a versioned JSON file', async ({ page }) => {
    await page.goto('/sidebar.html')
    await page.getByRole('button', { name: '+ Dossier' }).click()
    await expect(page.getByRole('button', { name: 'Nouveau dossier' })).toBeVisible()

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exporter (JSON)' }).click()
    const download = await downloadPromise

    const stream = await download.createReadStream()
    const chunks: Buffer[] = []
    for await (const chunk of stream) chunks.push(chunk as Buffer)
    const payload = JSON.parse(Buffer.concat(chunks).toString('utf-8')) as {
      version: number
      folders: unknown[]
    }

    expect(payload.version).toBe(1)
    expect(payload.folders).toHaveLength(1)
  })
})
