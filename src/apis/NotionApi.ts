import { Client } from '@notionhq/client'
import { BlockObjectRequest, PageObjectResponse } from '@notionhq/client/build/src/api-endpoints.js'
import { fromHtml } from 'hast-util-from-html'
import { toMdast } from 'hast-util-to-mdast'
import { toMarkdown } from 'mdast-util-to-markdown'
import { markdownToBlocks } from '@tryfabric/martian'
import { Emoji } from './types.js'
import config from 'config'

export class NotionAuth {
  token: string

  constructor() {
    this.token = config.get('NOTION_TOKEN')
  }
}

export class NotionApi {
  notion: Client

  constructor(auth: NotionAuth) {
    this.notion = new Client({
      auth: auth.token,
    })
  }

  async addHtmlPageAsync(
    databaseId: string,
    icon: { type: 'emoji'; emoji: Emoji } | { type: 'external'; external: { url: string } } | null,
    title: string,
    properties: object,
    htmlContent: string,
  ): Promise<PageObjectResponse> {
    const notionContent = htmlToNotionBlocks(htmlContent)
    const response = await this.notion.pages.create({
      parent: { database_id: databaseId },
      icon,
      properties: {
        ...properties,
        title: {
          title: [
            {
              text: {
                content: title,
              },
            },
          ],
        },
      },
      children: notionContent,
    })

    return response as PageObjectResponse
  }

  async runSampleAsync(): Promise<void> {
    const databaseId = 'fb0e51d76fa14145a48a797b02b6138b'
    console.log()

    const htmlContent = '<b>bold</b><i>italic</i>'
    const notionContent = htmlToNotionBlocks(htmlContent)

    await this.notion.pages.create({
      parent: { database_id: databaseId },
      icon: {
        emoji: '🚀',
      },
      properties: {
        title: {
          title: [
            {
              text: {
                content: 'Тестовый проект',
              },
            },
          ],
        },
        Статус: {
          select: { name: 'Заявка ' },
        },
        'Тип проекта': {
          select: { name: '⚙инженерный' },
        },
        'Максимум команд': {
          number: 1,
        },
      },
      children: notionContent,
    })
  }
}

function htmlToNotionBlocks(html: string): BlockObjectRequest[] {
  const hast = fromHtml(html, { fragment: true })
  const mdast = toMdast(hast)
  const markdown = toMarkdown(mdast)
  const blocks = markdownToBlocks(markdown)
  return blocks as unknown as BlockObjectRequest[]
}
