import { BrsApi, TechnologyCard } from '../apis/BrsApi.js'
import { TaskReporter } from '../tasks/TaskReporter.js'

export async function fillTechnologyCardAsync(
  brsApi: BrsApi,
  card: TechnologyCard,
  agree: boolean,
  save = false,
  reporter: TaskReporter,
) {
  const scope = card.disciplineLoad
  reporter.started(
    scope,
    `Обработка техкарты по предмету "${card.discipline}" для групп "${card.group}" ${card.isModule ? 'из ИТС' : ''}`,
  )

  if (card.agreed) {
    reporter.unchanged(scope, 'Техкарта уже согласована')
    reporter.separator()
    return
  }

  const factors = await brsApi.getTechnologyCardFactorsAsync(card)
  if (!factors) {
    reporter.error(scope, 'Не удалось получить коэффициенты', { stopped: true })
    reporter.separator()
    return
  }
  const intermediate = await brsApi.getTechnologyCardIntermediateAsync(card)
  if (!intermediate) {
    reporter.error(scope, 'Не удалось получить данные по промежуточной аттестации', { stopped: true })
    reporter.separator()
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
      reporter.error(scope, 'Не удалось установить тип промежуточной аттестации', { stopped: true })
      reporter.separator()
      return
    }

    if (save) {
      await brsApi.putTechnologyCardIntermediateAsync(intermediate, intermediateCardType)
    }
    const intermediateCardTypeTitle =
      intermediate.availableCardTypes.filter((it) => it.cardType === intermediateCardType)[0]?.cardTypeTitle ??
      intermediateCardType
    reporter.changed(scope, `Промежуточная аттестация установлена: "${intermediateCardTypeTitle}"`)
  } else {
    const intermediateCardTypeTitle =
      intermediate.availableCardTypes.filter((it) => it.cardType === intermediateCardType)[0]?.cardTypeTitle ??
      intermediateCardType
    reporter.unchanged(scope, `Промежуточная аттестация уже выбрана: "${intermediateCardTypeTitle}"`)
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
        reporter.changed(scope, `Нагрузка в "${cardTypeTitle}" добавлена: "${name}" на ${value}`)
      } else {
        let currentSum = 0
        const currentLoadMessages = []
        for (const load of currentLoads) {
          currentSum += load.maxValue
          currentLoadMessages.push(`"${load.name}"=${load.maxValue}`)
        }
        if (currentSum === 100) {
          reporter.unchanged(scope, `Нагрузки в "${cardTypeTitle}" на 100 уже установлены: ${currentLoadMessages.join(', ')}`)
        } else {
          let sum = 100
          let count = currentLoads.length
          for (const load of currentLoads) {
            const value = Math.floor(sum / count)
            if (load.maxValue === value) {
              reporter.unchanged(scope, `Нагрузка в "${cardTypeTitle}" уже установлена: "${load.name}" на ${value}`)
            } else {
              if (save) {
                await brsApi.updateTechnologyCardLoadAsync(card, load, load.name, value)
              }
              reporter.changed(scope, `Нагрузка в "${cardTypeTitle}" обновлена: "${load.name}" на ${value}`)
            }
            sum -= value
            count -= 1
          }
        }
      }
    } else {
      reporter.error(scope, `Не удалось получить нагрузку по "${cardTypeTitle}"`)
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
      reporter.unchanged(
        scope,
        `Коэффициенты в "${cardTypeTitle}" уже установлены: текущая=${current}, промежуточная=${intermediate}, вес типа занятий=${total}`,
      )
    } else {
      if (save) {
        await brsApi.updateTechnologyCardFactorsAsync(card, factor.technologyCardType, current, intermediate, total)
      }
      reporter.changed(
        scope,
        `Коэффициенты в "${cardTypeTitle}" обновлены: текущая=${current}, промежуточная=${intermediate}, вес типа занятий=${total}`,
      )
    }
    factorSum -= total
    factorCount -= 1
  }

  const checkResult = await brsApi.checkTechnologyCardAsync(card)
  if (checkResult.isFilled) {
    reporter.verdict('ok', scope, 'Техкарта заполнена корректно')
    if (checkResult.isAllowedToAgree) {
      reporter.verdict('ok', scope, 'Техкарта может быть согласована')
      if (agree) {
        if (card.agreed) {
          reporter.unchanged(scope, 'Техкарта уже согласована')
        } else {
          if (save) {
            await brsApi.agreeTechnologyCardAsync(card, agree)
          }
          reporter.changed(scope, 'Техкарта согласована')
        }
      } else {
        reporter.verdict('attention', scope, 'Согласование карты не запрошено')
      }
    } else {
      reporter.verdict('attention', scope, 'Можно запросить согласование техкарты')
    }
  } else {
    if (save) {
      reporter.verdict('failed', scope, 'Техкарта содержит ошибки')
      reporter.verdict('failed', scope, 'Для согласования требуется исправить ошибки')
    } else {
      reporter.verdict('attention', scope, 'Техкарта содержит ошибки, потому что заполняется только в режиме save')
    }
  }

  reporter.finished(scope, 'Обработка техкарты завершена')
  reporter.separator()
}
