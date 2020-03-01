![Logo](http://abond.me/levelshiftlogo.gif)

## Demo
Une démo est disponible sur [http://abond.me](http://abond.me).

## Principe du jeu

Level Shift tire son inspiration de jeux basés sur le rhythme & la musique tels que Audiosurf ou Guitar Hero.

Le jeu génère de manière procédurale une "map" qui correspond au fichier midi selectionné par l'utilisateur. 
Chaque track d'un fichier midi correspond aux notes qu'un instrument doit jouer. Chacun de ces tracks est ensuite transformé en un parcours 3D: quand la hauteur des notes monte, le parcours aussi, idem quand il descend.

Le but du jeu est de slalomer sur cette représentation graphique de la musique pour attraper un maximum de bonus, éviter les obstacles, etc.

## Détails techniques

J'utilise [CORS-ANYWHERE](https://cors-anywhere.herokuapp.com/) pour permettre au jeu de télécharger des fichiers midi d'autres sites depuis le navigateur.

J'utilise [Tone.js](https://tonejs.github.io/)  pour convertir les fichiers Midi en json. Je me sers ensuite de ce json pour créer un système de points pour chaque track avec Babylonjs, de sorte que le temps lors duquel chaque note est jouée correspond à l'axe X, et la hauteur normalisée de la note à l'axe Y. Je repasse sur ces points en vérifiant que les angles sont acceptables (éviter un parcours en dent de scie, voir `helpers.js / trackBuilder()`). Puis je lisse ces points avec la fonction `catmullRom` de BabylonJS qui donne le meilleur résultat après comparaison avec Bézier, Lagrange, moyenne roulante, etc. J'effectue ensuite une extrusion en Z de ce parcours, puis je fais une rotation de toute la mesh obtenue pour que les l'axe des Z devienne l'axe des X et vice versa. Cette étape est obligatoire parce que Babylon.js support l'extrusion uniquement sur l'axe Z actuellement.

Jouer le fichier midi avec de vrais instruments s'est révélé beaucoup plus compliqué que prévu: finalement, j'ai choisi de modifier [cette solution](https://github.com/Tonejs/Tone.js/issues/290) qui est un début d'implémentation de [WebAudioFont](https://surikov.github.io/webaudiofont/) pour tone.js. J'ai amélioré ce début d'implémentation notamment en ajoutant des fonctions pour TriggerAttackRelease.

Je me suis limité à une interprétation stricte du standard [GM](https://en.wikipedia.org/wiki/General_MIDI) qui malheureusement ne gére pas forcément tous les fichiers midi qu'ont peut trouver sur internet. Cela pose surtout des problèmes pour les percussions qui sont censées être uniquement sur le canal 10 et vice versa, mais ce n'est pas toujours le cas.

Lorsque le jeu charge un fichier midi, il récupère aussi les [WebAudioFont sur un site dédié](https://surikov.github.io/webaudiofontdata/sound/), en l'occurence les instruments qui correspondent à la [SoundFont](https://en.wikipedia.org/wiki/SoundFont) [FluidR3](http://www.emu-france.com/emulateurs/311-musiques-et-sons/313-musiques-et-sons-section-midi/4230-soundfont-fluidr3-gm/), qui sont en fait simplement des fichiers javascript encodés en base64.

Exemples:

https://surikov.github.io/webaudiofontdata/sound/0260_FluidR3_GM_sf2_file.html
https://surikov.github.io/webaudiofontdata/sound/0260_FluidR3_GM_sf2_file.js





