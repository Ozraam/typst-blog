const dateFormatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
const shortDateFormatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
const timeFormatter = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });
const relativeFormatter = new Intl.RelativeTimeFormat('fr-FR', { numeric: 'auto' });

export function formatDate(timestamp: number | null | undefined): string {
	return timestamp ? dateFormatter.format(new Date(timestamp)) : '';
}

export function formatShortDate(timestamp: number | null | undefined): string {
	return timestamp ? shortDateFormatter.format(new Date(timestamp)) : '';
}

export function formatTime(timestamp: number): string {
	return timeFormatter.format(new Date(timestamp));
}

export function isoDate(timestamp: number | null | undefined): string | undefined {
	return timestamp ? new Date(timestamp).toISOString() : undefined;
}

/** "il y a 5 minutes", "hier", then a short date after a week. */
export function formatRelative(timestamp: number, now = Date.now()): string {
	const seconds = Math.round((timestamp - now) / 1000);
	const abs = Math.abs(seconds);
	if (abs < 45) return 'à l’instant';
	if (abs < 3600) return relativeFormatter.format(Math.round(seconds / 60), 'minute');
	if (abs < 86400) return relativeFormatter.format(Math.round(seconds / 3600), 'hour');
	if (abs < 7 * 86400) return relativeFormatter.format(Math.round(seconds / 86400), 'day');
	return formatShortDate(timestamp);
}

export function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} o`;
	const units = ['Ko', 'Mo', 'Go'];
	let value = bytes / 1024;
	let unit = 0;
	while (value >= 1024 && unit < units.length - 1) {
		value /= 1024;
		unit++;
	}
	return `${value.toLocaleString('fr-FR', { maximumFractionDigits: value < 10 ? 1 : 0 })} ${units[unit]}`;
}

export function initials(name: string): string {
	return name.trim().slice(0, 1).toUpperCase() || '?';
}

export const STATUS_LABELS: Record<string, string> = {
	draft: 'Brouillon',
	published: 'Publié',
	archived: 'Archivé',
	trash: 'Corbeille'
};

export const ROLE_LABELS: Record<string, string> = {
	admin: 'Administrateur',
	author: 'Auteur',
	reader: 'Lecteur'
};

export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
	return `${count.toLocaleString('fr-FR')} ${count > 1 ? pluralForm : singular}`;
}
