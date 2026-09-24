import { TaskEventDetails } from './TaskEvents'

// Задание не может быть выполнено: CompositeTableTaskExecutor превращает ошибку в одно событие error
// (с details) вместо исключения. Её же бросают поставщики API (например, нет учётных данных в CLI).
export class TaskExecutionError extends Error {
  readonly details?: TaskEventDetails

  constructor(message: string, details?: TaskEventDetails) {
    super(message)
    this.name = 'TaskExecutionError'
    this.details = details
  }
}
