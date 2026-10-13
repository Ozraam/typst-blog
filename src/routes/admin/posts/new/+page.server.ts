import type { PageServerLoad } from './$types';
import { getAllTagNames } from '$lib/server/posts';

const STARTER_CONTENT = `Une introduction qui donne envie de lire la suite. Le texte est composé par *Typst* : _italique_, *gras*, \`code\`, #link("https://typst.app")[liens], notes de bas de page#footnote[Comme celle-ci.]…

= Une première section

Les titres de l'article (\`= Section\`, \`== Sous-section\`) forment automatiquement le sommaire. Le titre de l'article lui-même se saisit au-dessus de l'éditeur.

$ integral_0^infinity e^(-x^2) dif x = sqrt(pi) / 2 $

= Et tout le reste

- Tableaux avec \`#table(...)\`
- Images de la médiathèque (bouton image de la barre d'outils)
- Formules en ligne : $E = m c^2$
`;

export const load: PageServerLoad = async () => {
	return { starterContent: STARTER_CONTENT, knownTags: getAllTagNames() };
};
