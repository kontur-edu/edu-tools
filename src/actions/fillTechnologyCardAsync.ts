import { BrsApi, TechnologyCard } from '../apis/BrsApi.js'

export async function fillTechnologyCardAsync(
  brsApi: BrsApi,
  card: TechnologyCard,
  agree: boolean,
  save = false,
  log: (message?: string) => void,
) {
  log(
    `🚩 Обработка техкарты по предмету "${card.discipline}" для групп "${card.group}" ${card.isModule ? 'из ИТС' : ''}`,
  )

  if (card.agreed) {
    log(`🟡 Техкарта уже согласована`)
    log()
    return
  }

  const factors = await brsApi.getTechnologyCardFactorsAsync(card)
  if (!factors) {
    log(`❌ Не удалось получить коэффициенты`)
    log()
    return
  }
  const intermediate = await brsApi.getTechnologyCardIntermediateAsync(card)
  if (!intermediate) {
    log(`❌ Не удалось получить данные по промежуточной аттестации`)
    log()
    return
  }

  let intermediateCardType = intermediate.currentCardType
  if (intermediateCardType === null) {
    if (intermediate.availableCardTypes.filter((it) => it.cardType === 'lecture').length > 0) {
      intermediateCardType = 'lecture'
    } else if (intermediate.availableCardTypes.filter((it) => it.cardType === 'practice').length > 0) {
      intermediateCardType = 'practice'
    } else if (intermediate.availableCardTypes.length > 0) {
      intermediateCardType = intermediate.availableCardTypes[0].cardType
    } else {
      log(`❌ Не удалось установить тип промежуточной аттестации`)
      log()
      return
    }

    if (save) {
      await brsApi.putTechnologyCardIntermediateAsync(intermediate, intermediateCardType)
    }
    const intermediateCardTypeTitle =
      intermediate.availableCardTypes.filter((it) => it.cardType === intermediateCardType)[0]?.cardTypeTitle ??
      intermediateCardType
    log(`🟢 Промежуточная аттестация установлена: "${intermediateCardTypeTitle}"`)
  } else {
    const intermediateCardTypeTitle =
      intermediate.availableCardTypes.filter((it) => it.cardType === intermediateCardType)[0]?.cardTypeTitle ??
      intermediateCardType
    log(`🟡 Промежуточная аттестация уже выбрана: "${intermediateCardTypeTitle}"`)
  }

  for (const factor of factors) {
    const cardType = factor.technologyCardType
    const cardTypeTitle = factor.technologyCardTypeTitle ?? cardType
    const loads = await brsApi.getTechnologyCardLoadsAsync(card, cardType)
    if (loads) {
      const currentLoads = loads.filter((it) => it.intermediate === 0)
      if (currentLoads.length === 0) {
        const name =
          cardType === 'laboratory'
            ? 'лабораторная работа'
            : cardType === 'practice'
            ? 'практическая работа'
            : 'домашняя работа'
        const value = 100
        if (save) {
          await brsApi.addTechnologyCardLoadAsync(card, cardType, name, value)
        }
        log(`🟢 Нагрузка в "${cardTypeTitle}" добавлена: "${name}" на ${value}`)
      } else {
        let currentSum = 0
        const currentLoadMessages = []
        for (const load of currentLoads) {
          currentSum += load.maxValue
          currentLoadMessages.push(`"${load.name}"=${load.maxValue}`)
        }
        if (currentSum === 100) {
          log(`🟡 Нагрузки в "${cardTypeTitle}" на 100 уже установлены: ${currentLoadMessages.join(', ')}`)
        } else {
          let sum = 100
          let count = currentLoads.length
          for (const load of currentLoads) {
            const value = Math.floor(sum / count)
            if (load.maxValue === value) {
              log(`🟡 Нагрузка в "${cardTypeTitle}" уже установлена: "${load.name}" на ${value}`)
            } else {
              if (save) {
                await brsApi.updateTechnologyCardLoadAsync(card, load, load.name, value)
              }
              log(`🟢 Нагрузка в "${cardTypeTitle}" обновлена: "${load.name}" на ${value}`)
            }
            sum -= value
            count -= 1
          }
        }
      }
    } else {
      log(`🔴 Не удалось получить нагрузку по "${cardTypeTitle}"`)
    }
  }

  let factorSum = 1
  let factorCount = factors.length
  for (const factor of factors) {
    const cardType = factor.technologyCardType
    const cardTypeTitle = factor.technologyCardTypeTitle || cardType
    const current = cardType === intermediateCardType ? 0.5 : 1.0
    const intermediate = cardType === intermediateCardType ? 0.5 : 0.0
    const total = Math.floor((10 * factorSum) / factorCount) / 10
    if (current === factor.current && intermediate === factor.intermediate && total === factor.total) {
      log(
        `🟡 Коэффициенты в "${cardTypeTitle}" уже установлены: текущая=${current}, промежуточная=${intermediate}, вес типа занятий=${total}`,
      )
    } else {
      if (save) {
        await brsApi.updateTechnologyCardFactorsAsync(card, factor.technologyCardType, current, intermediate, total)
      }
      log(
        `🟢 Коэффициенты в "${cardTypeTitle}" обновлены: текущая=${current}, промежуточная=${intermediate}, вес типа занятий=${total}`,
      )
    }
    factorSum -= total
    factorCount -= 1
  }

  const checkResult = await brsApi.checkTechnologyCardAsync(card)
  if (checkResult.isFilled) {
    log(`🟩 Техкарта заполнена корректно`)
    if (checkResult.isAllowedToAgree) {
      log(`🟩 Техкарта может быть согласована`)
      if (agree) {
        if (card.agreed) {
          log(`🟨 Техкарта уже согласована`)
        } else {
          if (save) {
            await brsApi.agreeTechnologyCardAsync(card, agree)
          }
          log(`🟩 Техкарта согласована`)
        }
      } else {
        log(`🟨 Согласование карты не запрошено`)
      }
    } else {
      log(`🟨 Можно запросить согласование техкарты`)
    }
  } else {
    if (save) {
      log(`🟥 Техкарта содержит ошибки`)
      log(`🟥 Для согласования требуется исправить ошибки`)
    } else {
      log(`🟨 Техкарта содержит ошибки, потому что заполняется только в режиме save`)
    }
  }

  log('✅ Обработка техкарты завершена')
  log()
}
