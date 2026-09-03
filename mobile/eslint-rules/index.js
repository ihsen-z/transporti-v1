/**
 * Plugin ESLint local du mobile.
 *
 * Chargé via `rulesdir` plutôt que publié : ces règles ne valent que pour ce
 * dépôt, parce qu'elles encodent des exigences de SA charte (cible tactile de
 * 44 dp) et des défauts réellement mesurés sur SES écrans.
 */

'use strict';

module.exports = {
  rules: {
    'pressable-accessible': require('./pressable-accessible'),
  },
};
