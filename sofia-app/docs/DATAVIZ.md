# Graphiques et indicateurs

Les règles qui gardent les graphiques de SOFIA lisibles, honnêtes et cohérents d'un écran à l'autre. Elles s'appliquent au dashboard aujourd'hui et aux analytics de la Phase 9.

## Une couleur, un rôle

Les couleurs des graphiques sont des jetons (`--viz-*` dans `src/app/globals.css`), jamais des valeurs écrites dans un composant. Chacune a un rôle fixe :

| Jeton | Couleur | Rôle |
|---|---|---|
| `--viz-ink` | `#3a3938` | Les volumes : conversations, leads |
| `--viz-sofia` | `#d97757` | Ce que SOFIA a obtenu : rendez-vous honorés, CA récupéré |
| `--viz-planned` | `#3a6ea5` | Ce qui est à venir : rendez-vous prévus |
| `--viz-muted` | `#b9b4ab` | Ce qui est relégué au second plan : rendez-vous non honorés |
| `--viz-step-1` à `--viz-step-4` | `#e8987a` → `#8c4128` | Les étapes ordonnées de l'entonnoir de conversion, du plus clair au plus foncé |

L'orange de SOFIA garde ainsi son sens : quand il apparaît dans un graphique, il désigne ce que SOFIA a rapporté.

## Vérifiées, pas choisies à l'œil

Chaque combinaison a été mesurée, pas jugée « assez différente ». La distance entre deux couleurs est calculée dans l'espace OKLab, sous une simulation des deux formes de daltonisme les plus fréquentes (protanopie et deutéranopie, modèle de Machado, Oliveira et Fernandes 2009), puis en vision normale :

| Combinaison | Daltonisme (cible ≥ 8) | Vision normale (minimum 15) | Contraste sur le fond blanc des cartes |
|---|---|---|---|
| Orange SOFIA et bleu « prévus » | 17,1 | 26,7 | 3,1:1 et plus de 4,5:1 |
| Orange SOFIA et gris « non honorés » | 11,8 | 15,7 | Gris à 2,1:1 : compensé, voir plus bas |

L'entonnoir utilise une rampe d'une seule teinte : la luminosité diminue régulièrement d'une étape à l'autre (écart d'au moins 0,06), la teinte varie de moins de 3 degrés, et l'étape la plus claire garde un contraste de 2,3:1 sur le fond.

Le gris des rendez-vous non honorés est volontairement discret, sous le seuil de 3:1 : chaque valeur reste lisible autrement, par la légende, l'info-bulle et la vue en tableau.

## Les règles de dessin

Les colonnes font au plus 24 pixels de large, avec une extrémité arrondie de 4 pixels et une base droite, et les segments empilés sont séparés par un espace de 2 pixels de la couleur du fond plutôt que par un trait. Les lignes de grille sont des traits fins et pleins, jamais pointillés. Un graphique à une seule série n'a pas de légende (son titre la nomme) ; à partir de deux séries, la légende est toujours présente. Les valeurs ne sont pas écrites sur chaque colonne : seule la dernière période l'est quand c'est utile, le reste passe par l'axe, l'info-bulle et le tableau.

Chaque graphique a une info-bulle au survol et au clavier (les flèches parcourent les valeurs, qui sont annoncées aux lecteurs d'écran), et une vue « Voir les données » sous forme de tableau. Aucune valeur n'est accessible uniquement par la souris.

Les montants et nombres affichés par les graphiques sont formatés sans la notation compacte d'`Intl` : le serveur et le navigateur n'ont pas les mêmes données de langue et écrivaient « 0,0 € » d'un côté et « 0 € » de l'autre. Le format compact (« 1,5 k€ ») est construit dans `column-chart.tsx`, et les espaces fines des formats français sont remplacées par des espaces insécables classiques (`formatNumber` dans `src/lib/format.ts`), que la police des titres affiche correctement.

## Les indicateurs

Les définitions exactes des 12 indicateurs sont en tête de `src/server/services/dashboard.ts`, et chaque tuile du dashboard affiche la sienne. Deux règles évitent les chiffres trompeurs. Le CA récupéré ne compte que les rendez-vous honorés, à la date de la visite, une seule fois chacun. Les indicateurs de conversion d'une période se mesurent à la fin de cette période, pour que la comparaison avec la période précédente soit équitable.

## Mode sombre

L'application n'a pas encore de thème sombre. Quand il arrivera, chaque couleur recevra sa propre valeur pour le fond sombre, vérifiée avec les mêmes mesures, et non une inversion automatique.
