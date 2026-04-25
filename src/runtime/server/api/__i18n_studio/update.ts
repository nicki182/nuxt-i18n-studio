import { defineEventHandler, readValidatedBody, createError } from 'h3'
import fs from 'node:fs/promises'
import path from 'node:path'
import { z } from 'zod'
// Ensure this utility is exported correctly from your utils folder
import { updateTranslation } from '../../../utils/updateTranslation'

const updateSchema = z.object({
  updates: z.record(z.string(), z.string()),
  locale: z.string().optional()
})

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, updateSchema.parse)

  // 1. Grab config from the module setup
  const config = useRuntimeConfig(event).public.i18nStudio

  // 2. Resolve target locale (Input > Module Default)
  const targetLocale = body.locale || config?.defaultLocale
  // 3. Construct path dynamically using project root (process.cwd)
  const filePath = path.resolve(
    process.cwd(),
    config?.localesPath || 'i18n/locales',
    `${targetLocale}.json`
  )
  try {
    // Check if file exists before trying to read
    try {
      await fs.access(filePath)
    } catch {
      throw createError({
        statusCode: 404,
        message: `Locale file not found at: ${filePath}`
      })
    }

    const fileContent = await fs.readFile(filePath, 'utf-8')
    const json = JSON.parse(fileContent)
    let update = { ...json }
    // Apply updates
    for (const [key, newValue] of Object.entries(body.updates)) {
      update = updateTranslation(update, key, newValue)
    }

    // Write back to disk
    await fs.writeFile(filePath, JSON.stringify(update, null, 2))
    console.log(`✅ Successfully updated ${filePath} with changes:`, body.updates, "Resulting JSON:", update)
    return {
      success: true,
      path: filePath,
      json: update,
      updates: body.updates
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      message: `Studio Save Error: ${error.message}`
    })
  }
})
