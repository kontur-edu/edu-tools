import { Telegraf } from 'telegraf'
import { message } from 'telegraf/filters'
import { toHTML } from '@telegraf/entity'
import 'dotenv/config'
import { NotionApi, NotionAuth } from './apis/NotionApi.js'
import { showLoader } from './helpers/TelegramBotHelpers.js'

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || ''
const TELEGRAM_URL = process.env.TELEGRAM_URL || ''
const NOTION_RESOURCES_DB = process.env.NOTION_RESOURCES_DB || ''

const bot = new Telegraf(TELEGRAM_TOKEN, {
  handlerTimeout: Infinity,
})

const notionApi = new NotionApi(new NotionAuth())

bot.command('start', (ctx) => {
  ctx.reply('Добро пожаловать!')
})

bot.on(message('text'), async (ctx) => {
  let hideLoader = null
  try {
    const text = ctx.message.text.trim()
    if (!text) {
      ctx.reply('Текст не может быть пустым!')
      return
    }
    hideLoader = await showLoader(ctx)

    const htmlText = toHTML(ctx.message).trim()

    const newLineIndex = htmlText.indexOf('\n')
    const header = 0 < newLineIndex ? htmlText.substring(0, newLineIndex).trim() : htmlText
    const content = 0 < newLineIndex && newLineIndex + 1 < htmlText.length ? htmlText.substring(newLineIndex + 1) : null

    const notionResponse = await notionApi.addHtmlPageAsync(
      NOTION_RESOURCES_DB,
      null, //{ type: 'external', external: { url: RESOURCE_ICON } },
      header ?? 'Ресурс',
      {},
      content ?? '',
    )
    hideLoader()

    ctx.reply(`Создан ресурс\n${header}\n\n${notionResponse.url}`)
  } catch (e: unknown) {
    if (typeof e === 'string') {
      console.log('Error while processing text', e)
    } else if (e instanceof Error) {
      console.log('Error while processing text', e.message)
    } else {
      console.log('Error while processing text')
    }

    hideLoader && hideLoader()
    ctx.reply('Что-то пошло не так...')
  }
})

export const cloudHandler = async function (event: any, context: any) {
  try {
    if (!event || !event.body) {
      return {
        statusCode: 200,
        body: 'pong',
      }
    }

    const message = JSON.parse(event.body)
    await bot.handleUpdate(message)
    return {
      statusCode: 200,
      body: '',
    }
  } catch (e) {
    console.error(e)
    return {
      statusCode: 500,
      body: '',
    }
  }
}

export async function cloudRegister() {
  console.log('cloudRegister')
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/setWebhook?url=${encodeURIComponent(TELEGRAM_URL)}`
  const response = await fetch(url)
  console.log(response)
}

export async function localLaunch() {
  console.log('localLaunch')
  await bot.launch()
}
