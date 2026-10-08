/* NEXO — Mapa do Nexo: miniatura da vila e lista de regiões com acesso direto às missões */

import { qs, escapeHtml } from '../core/dom.js';
import { REGIONS } from '../data/regions.js';
import { CHARACTERS } from '../data/characters.js';
import { MISSIONS } from '../missions/index.js';
import { isRegionOpen, isRegionDone, isMissionDone, isRegionOpenById, isWarmup, currentTrack, TRACKS } from '../game/progress.js';
import { startMission } from '../game/session.js';
import { renderMinimap } from '../world/renderer.js';
import { getMapPosition } from '../world/world.js';
import { openModal } from './modal.js';

export function openMapView() {
  const cards = REGIONS.map((region, index) => {
    const open = isRegionOpen(index);
    const done = isRegionDone(region);
    const npc = CHARACTERS[region.npc];
    const status = done ? 'reconectada' : open ? `${isWarmup(region) ? 'aquecimento opcional' : 'aberta'} · fale com ${npc.name}` : 'bloqueada por uma ruptura';
    const buttons = open
      ? region.missions.map((id) => `<button type="button" class="btn btn--small ${isMissionDone(id) ? 'btn--ghost' : ''}" data-mission="${id}">${escapeHtml(MISSIONS[id].title)}${isMissionDone(id) ? ' ✓' : ''}</button>`).join('')
      : '';
    return `
      <div class="region-card ${open ? '' : 'locked'}" style="--accent:${region.accent}">
        <h3>${index}. ${escapeHtml(region.name)}</h3>
        <p class="muted">“${escapeHtml(region.motto)}” · ${status}</p>
        <div class="row">${buttons}</div>
      </div>`;
  }).join('');

  const body = openModal({
    title: 'Mapa do Nexo',
    wide: true,
    body: `
      <div class="map-view">
        <div>
          <canvas width="520" aria-label="Mapa da vila com a sua posição"></canvas>
          <p class="small muted">O ponto vermelho é você. As faixas roxas são rupturas que ainda bloqueiam o caminho.
          As regiões se abrem em ordem; você pode refazer missões quando quiser.</p>
          <p class="small muted">${escapeHtml(TRACKS[currentTrack()].name)}: ${escapeHtml(TRACKS[currentTrack()].detail)}.</p>
        </div>
        <div class="map-regions">${cards}</div>
      </div>`,
  });

  const position = getMapPosition();
  renderMinimap(qs('canvas', body), { playerX: position.x, playerY: position.y, isOpen: isRegionOpenById });
  body.querySelectorAll('[data-mission]').forEach((button) => {
    button.addEventListener('click', () => startMission(button.dataset.mission));
  });
}
