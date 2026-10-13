type Theme = 'light' | 'dark';

class ThemeState {
	// The real theme is applied by an inline script in app.html before hydration; the server
	// cannot know it, so components call `sync()` once mounted.
	current = $state<Theme>('light');

	sync() {
		this.current = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
	}

	toggle() {
		this.set(this.current === 'dark' ? 'light' : 'dark');
	}

	set(theme: Theme) {
		this.current = theme;
		document.documentElement.dataset.theme = theme;
		try {
			localStorage.setItem('theme', theme);
		} catch {
			// Storage unavailable (private mode): the choice only lasts for this page
		}
	}
}

export const theme = new ThemeState();
