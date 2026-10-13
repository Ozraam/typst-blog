export interface ConfirmOptions {
	title: string;
	message?: string;
	confirmLabel?: string;
	cancelLabel?: string;
	danger?: boolean;
}

class ConfirmState {
	request = $state<(ConfirmOptions & { resolve: (ok: boolean) => void }) | null>(null);

	ask(options: ConfirmOptions): Promise<boolean> {
		this.request?.resolve(false);
		return new Promise((resolve) => {
			this.request = { ...options, resolve };
		});
	}

	close(ok: boolean) {
		this.request?.resolve(ok);
		this.request = null;
	}
}

export const confirmDialog = new ConfirmState();

/** Shorthand: `if (await confirm({...})) …` */
export const confirm = (options: ConfirmOptions) => confirmDialog.ask(options);
