import { ApiError } from '../api/client'
import type { useConfirm } from '../hooks/useConfirm'

type Confirm = ReturnType<typeof useConfirm>['confirm']

/** Ключи переводов для диалога: заголовок, «не вышло — повторить?», «нельзя». */
export interface RetryTexts {
  title: string
  failed: string
  conflict: string
}

export const CANCEL_TEXTS: RetryTexts = {
  title: 'cancel_failed_title',
  failed: 'cancel_failed',
  conflict: 'cancel_not_allowed',
}

export const ACCEPT_TEXTS: RetryTexts = {
  title: 'accept_failed_title',
  failed: 'accept_failed',
  conflict: 'accept_not_allowed',
}

/**
 * Выполнить действие над заказом (отмена, подтверждение работы) и не делать
 * вид, что оно прошло, если не вышло.
 *
 * Раньше ошибку глотал `.catch(() => {})`, а экран всё равно шёл дальше:
 * без сети клиент уходил уверенным, что отменил заказ или принял работу.
 * Теперь при ошибке — диалог с «Повторить». Повтор безопасен: если первая
 * попытка на самом деле прошла (потерялся только ответ), бэкенд на повтор
 * отвечает 200 — переходы статуса идемпотентны.
 *
 * 409 — действие больше невозможно (заказ уже завершён, в споре): повторять
 * нечего, показываем, почему.
 *
 * Возвращает результат или `null`, если не вышло и клиент закрыл диалог —
 * заказ в прежнем состоянии, экран уходить не должен.
 */
export async function withRetryDialog<R>(
  action: () => Promise<R>,
  confirm: Confirm,
  t: (key: string) => string,
  texts: RetryTexts,
): Promise<R | null> {
  for (;;) {
    try {
      return await action()
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        await confirm(t(texts.conflict), {
          title: t(texts.title),
          confirmLabel: t('dialog_got_it'),
          cancelLabel: '',
          confirmVariant: 'primary',
        })
        return null
      }
      const retry = await confirm(t(texts.failed), {
        title: t(texts.title),
        confirmLabel: t('dialog_retry'),
        cancelLabel: t('dialog_close'),
        confirmVariant: 'primary',
      })
      if (!retry) return null
    }
  }
}
