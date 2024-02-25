export async function showLoader(ctx: any) {
  const icons = ['🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚', '🕛']

  let index = 0
  const message = await ctx.reply(icons[index])
  const interval = setInterval(() => {
    index = (index + 1) % icons.length
    ctx.telegram.editMessageText(ctx.chat.id, message.message_id, null, icons[index])
  }, 500)
  let shown = true

  const hide = () => {
    if (shown) {
      clearInterval(interval)
      ctx.telegram.deleteMessage(ctx.chat.id, message.message_id)
      shown = false
    }
  }

  return hide
}
