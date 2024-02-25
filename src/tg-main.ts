import { Telegraf } from 'telegraf'
import { message } from 'telegraf/filters'
import { toHTML } from '@telegraf/entity'
import config from 'config'
import { NotionApi, NotionAuth } from './apis/NotionApi.js'
import { showLoader } from './helpers/TelegramBotHelpers.js'

const RESOURCE_ICON = 'https://www.notion.so/icons/bookmark_gray.svg'
const TASK_ICON = 'https://www.notion.so/icons/checkmark_gray.svg'

const bot = new Telegraf(config.get('TELEGRAM_TOKEN'), {
  handlerTimeout: Infinity,
})

const notionApi = new NotionApi(new NotionAuth())

bot.command('start', (ctx) => {
  ctx.reply('Добро пожаловать!')
})

bot.on(message('text'), async (ctx) => {
  try {
    const text = ctx.message.text.trim()
    if (!text) {
      ctx.reply('Текст не может быть пустым!')
      return
    }
    const hideLoader = await showLoader(ctx)

    const preHtmlText = toHTML(ctx.message).trim()
    const isResource = preHtmlText.startsWith('.')
    const htmlText = isResource ? preHtmlText.substring(1) : preHtmlText

    const newLineIndex = htmlText.indexOf('\n')
    const header = 0 < newLineIndex ? htmlText.substring(0, newLineIndex).trim() : htmlText
    const content = 0 < newLineIndex && newLineIndex + 1 < htmlText.length ? htmlText.substring(newLineIndex + 1) : null

    if (isResource) {
      const notionResponse = await notionApi.addHtmlPageAsync(
        config.get('NOTION_RESOURCES_DB'),
        { type: 'external', external: { url: RESOURCE_ICON } },
        header ?? 'Ресурс',
        {},
        content ?? '',
      )
      hideLoader()

      ctx.reply(`Создан ресурс\n${header}\n${notionResponse.url}`)
    } else {
      const notionResponse = await notionApi.addHtmlPageAsync(
        config.get('NOTION_TASKS_DB'),
        { type: 'external', external: { url: TASK_ICON } },
        header ?? 'Задача',
        {
          Приоритет: {
            select: { name: '🔵' },
          },
        },
        content ?? '',
      )
      hideLoader()

      ctx.reply(`Создана задача\n${header}\n${notionResponse.url}`)
    }
  } catch (e: unknown) {
    if (typeof e === 'string') {
      console.log('Error while processing text', e)
    } else if (e instanceof Error) {
      console.log('Error while processing text', e.message)
    } else {
      console.log('Error while processing text')
    }
    ctx.reply('Что-то пошло не так...')
  }
})

bot.launch()
