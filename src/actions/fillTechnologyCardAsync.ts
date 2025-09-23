import { BrsApi, TechnologyCard } from '../apis/BrsApi.js'

export async function fillTechnologyCardAsync(
  brsApi: BrsApi,
  card: TechnologyCard,
  agree: boolean,
  save = false,
) {
  console.log(
    `🚩 Обработка техкарты по предмету "${card.discipline}" для групп "${card.group}" ${card.isModule ? 'из ИТС' : ''}`,
  )

  if (card.agreed) {
    console.log(`🟡 Техкарта уже согласована`)
    console.log()
    return
  }

  const factors = await brsApi.getTechnologyCardFactorsAsync(card)
  if (!factors) {
    console.log(`❌ Не удалось получить коэффициенты`)
    console.log()
    return
  }
  const intermediate = await brsApi.getTechnologyCardIntermediateAsync(card)
  if (!intermediate) {
    console.log(`❌ Не удалось получить данные по промежуточной аттестации`)
    console.log()
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
      console.log(`❌ Не удалось установить тип промежуточной аттестации`)
      console.log()
      return
    }

    if (save) {
      await brsApi.putTechnologyCardIntermediateAsync(intermediate, intermediateCardType)
    }
    const intermediateCardTypeTitle =
      intermediate.availableCardTypes.filter((it) => it.cardType === intermediateCardType)[0]?.cardTypeTitle ??
      intermediateCardType
    console.log(`🟢 Промежуточная аттестация установлена: "${intermediateCardTypeTitle}"`)
  } else {
    const intermediateCardTypeTitle =
      intermediate.availableCardTypes.filter((it) => it.cardType === intermediateCardType)[0]?.cardTypeTitle ??
      intermediateCardType
    console.log(`🟡 Промежуточная аттестация уже выбрана: "${intermediateCardTypeTitle}"`)
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
        console.log(`🟢 Нагрузка в "${cardTypeTitle}" добавлена: "${name}" на ${value}`)
      } else {
        let currentSum = 0
        const currentLoadMessages = []
        for (const load of currentLoads) {
          currentSum += load.maxValue
          currentLoadMessages.push(`"${load.name}"=${load.maxValue}`)
        }
        if (currentSum === 100) {
          console.log(`🟡 Нагрузки в "${cardTypeTitle}" на 100 уже установлены: ${currentLoadMessages.join(', ')}`)
        } else {
          let sum = 100
          let count = currentLoads.length
          for (const load of currentLoads) {
            const value = Math.floor(sum / count)
            if (load.maxValue === value) {
              console.log(`🟡 Нагрузка в "${cardTypeTitle}" уже установлена: "${load.name}" на ${value}`)
            } else {
              if (save) {
                await brsApi.updateTechnologyCardLoadAsync(card, load, load.name, value)
              }
              console.log(`🟢 Нагрузка в "${cardTypeTitle}" обновлена: "${load.name}" на ${value}`)
            }
            sum -= value
            count -= 1
          }
        }
      }
    } else {
      console.log(`🔴 Не удалось получить нагрузку по "${cardTypeTitle}"`)
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
      console.log(
        `🟡 Коэффициенты в "${cardTypeTitle}" уже установлены: текущая=${current}, промежуточная=${intermediate}, вес типа занятий=${total}`,
      )
    } else {
      if (save) {
        await brsApi.updateTechnologyCardFactorsAsync(card, factor.technologyCardType, current, intermediate, total)
      }
      console.log(
        `🟢 Коэффициенты в "${cardTypeTitle}" обновлены: текущая=${current}, промежуточная=${intermediate}, вес типа занятий=${total}`,
      )
    }
    factorSum -= total
    factorCount -= 1
  }

  const checkResult = await brsApi.checkTechnologyCardAsync(card)
  if (checkResult.isFilled) {
    console.log(`🟩 Техкарта заполнена корректно`)
    if (checkResult.isAllowedToAgree) {
      console.log(`🟩 Техкарта может быть согласована`)
      if (agree) {
        if (card.agreed) {
          console.log(`🟨 Техкарта уже согласована`)
        } else {
          if (save) {
            await brsApi.agreeTechnologyCardAsync(card, agree)
          }
          console.log(`🟩 Техкарта согласована`)
        }
      } else {
        console.log(`🟨 Согласование карты не запрошено`)
      }
    } else {
      console.log(`🟨 Можно запросить согласование техкарты`)
    }
  } else {
    if (save) {
      console.log(`🟥 Техкарта содержит ошибки`)
      console.log(`🟥 Для согласования требуется исправить ошибки`)
    } else {
      console.log(`🟨 Техкарта содержит ошибки, потому что заполняется только в режиме save`)
    }
  }

  console.log('✅ Обработка техкарты завершена')
  console.log()
}
