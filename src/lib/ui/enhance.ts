import type { SubmitFunction } from '@sveltejs/kit';
import { toast } from './toast.svelte';
import { confirm, type ConfirmOptions } from './confirm.svelte';

/**
 * `use:enhance` callback for admin actions: optional confirmation, then shows the action's
 * `message` / `error` as a toast and refreshes the page data.
 */
export function actionFeedback(confirmation?: ConfirmOptions): SubmitFunction {
	return async ({ cancel }) => {
		if (confirmation && !(await confirm(confirmation))) {
			cancel();
			return;
		}
		return async ({ result, update }) => {
			if (result.type === 'success' && typeof result.data?.message === 'string') {
				toast.success(result.data.message);
			} else if (result.type === 'failure') {
				toast.error(typeof result.data?.error === 'string' ? result.data.error : 'L’action a échoué.');
			} else if (result.type === 'error') {
				toast.error(result.error?.message ?? 'Une erreur est survenue.');
			}
			await update({ reset: false });
		};
	};
}
