export type ToastKind = 'success' | 'error' | 'info';

export interface Toast {
	id: number;
	kind: ToastKind;
	message: string;
	action?: { label: string; href: string };
}

class ToastState {
	items = $state<Toast[]>([]);
	#nextId = 1;

	show(kind: ToastKind, message: string, options: { action?: Toast['action']; duration?: number } = {}) {
		const id = this.#nextId++;
		this.items = [...this.items, { id, kind, message, action: options.action }].slice(-4);
		setTimeout(() => this.dismiss(id), options.duration ?? (kind === 'error' ? 7000 : 4000));
	}

	success(message: string, options?: { action?: Toast['action']; duration?: number }) {
		this.show('success', message, options);
	}

	error(message: string, options?: { action?: Toast['action']; duration?: number }) {
		this.show('error', message, options);
	}

	info(message: string, options?: { action?: Toast['action']; duration?: number }) {
		this.show('info', message, options);
	}

	dismiss(id: number) {
		this.items = this.items.filter((t) => t.id !== id);
	}
}

export const toast = new ToastState();
