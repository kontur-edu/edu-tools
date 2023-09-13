import { Client } from '@notionhq/client'
import { BlockObjectRequest } from '@notionhq/client/build/src/api-endpoints.js'
import * as fs from 'fs'
import { fromHtml } from 'hast-util-from-html'
import { toMdast } from 'hast-util-to-mdast'
import { toMarkdown } from 'mdast-util-to-markdown'
import { markdownToBlocks } from '@tryfabric/martian'
import { Emoji } from './types.js'

export class NotionAuth {
  token: string

  constructor() {
    const json = JSON.parse(fs.readFileSync('./secrets/notion.json', 'utf8'))
    this.token = json['token']
  }
}

export class NotionApi {
  notion: Client

  constructor(auth: NotionAuth) {
    this.notion = new Client({
      auth: auth.token,
    })
  }

  async addProjectAsync(
    databaseId: string,
    emoji: Emoji,
    title: string,
    properties: object,
    htmlContent: string,
  ): Promise<boolean> {
    const notionContent = htmlToBlocks(htmlContent)

    await this.notion.pages.create({
      parent: { database_id: databaseId },
      icon: {
        emoji: emoji,
      },
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

    return true
  }

  async runSampleAsync(): Promise<void> {
    const databaseId = 'fb0e51d76fa14145a48a797b02b6138b'
    console.log()

    const htmlContent = '<b>bold</b><i>italic</i>'
    const notionContent = htmlToBlocks(htmlContent)

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

function htmlToBlocks(html: string): BlockObjectRequest[] {
  const hast = fromHtml(html, { fragment: true })
  const mdast = toMdast(hast)
  const markdown = toMarkdown(mdast)
  const blocks = markdownToBlocks(markdown)
  return blocks as unknown as BlockObjectRequest[]
}
