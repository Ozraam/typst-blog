import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { createPost, generateUniqueSlug } from '$lib/server/posts';

const STARTER_TYPST = `= Mon Nouvel Article Typst

Bienvenue dans l'éditeur *Typst* ! Rédigez votre contenu ici en profitant de la coloration syntaxique et du rendu vectoriel en direct.

== Des mathématiques élégantes

Voici une formule mathématique compilée directement par Typst :

$ integral_0^infinity e^(-x^2) dif x = sqrt(pi) / 2 $

== Listes et organisation

Vous pouvez facilement créer :
- Des listes à puces avec des tirets
- Des équations mathématiques en ligne avec des dollars : $E = m c^2$
- Des images téléversées depuis la barre d'outils
- Des tableaux vectoriels avec \`#table(...)\`
`;

export const load: PageServerLoad = async ({ locals }) => {
	return {
		user: locals.user,
		starterContent: STARTER_TYPST
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		if (!locals.user) return fail(401);

		const data = await request.formData();
		const title = data.get('title')?.toString() || '';
		const slug = data.get('slug')?.toString() || '';
		const excerpt = data.get('excerpt')?.toString() || '';
		const content = data.get('content')?.toString() || '';
		const rendered_svg = data.get('rendered_svg')?.toString() || '';
		const status = (data.get('status')?.toString() || 'draft') as 'draft' | 'published';
		const tagsRaw = data.get('tags')?.toString() || '';
		const tags = tagsRaw.split(',').map((t) => t.trim()).filter(Boolean);

		if (!title.trim()) {
			return fail(400, {
				error: 'Le titre de l’article est requis.',
				title,
				slug,
				excerpt,
				content,
				tags: tagsRaw,
				status
			});
		}

		try {
			const post = createPost({
				title,
				slug: slug ? slug : generateUniqueSlug(title),
				excerpt,
				content,
				rendered_svg,
				status,
				tags,
				author_id: locals.user.id
			});

			throw redirect(303, `/admin/posts/${post.id}/edit?created=1`);
		} catch (e: any) {
			if (e?.status === 303) throw e;
			return fail(500, {
				error: e.message || 'Erreur lors de la création de l’article.',
				title,
				slug,
				excerpt,
				content,
				tags: tagsRaw,
				status
			});
		}
	}
};
