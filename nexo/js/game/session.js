/* NEXO — Sessão de missão: início, tentativas, dicas, apoio automático, conclusão e saída
 *
 * Os nomes e os dados dos eventos registrados (attempt, hint_request, support_triggered,
 * success, retry, mission_start, mission_end, region_enter, region_return) são os mesmos
 * das versões anteriores, para manter os arquivos exportados comparáveis.
 */

import { MISSIONS } from '../missions/index.js';
import { REGIONS, regionById, regionIndexOf } from '../data/regions.js';
import { CHARACTERS } from '../data/characters.js';
import { state, saveState } from '../core/state.js';
import { runtime } from '../core/runtime.js';
import { logEvent } from '../core/research-log.js';
import { openMissionView } from '../ui/mission-view.js';
import { openQuestTracker } from '../ui/quest-tracker.js';
import { closeModal } from '../ui/modal.js';
import { closeDialogue } from '../ui/dialogue.js';
import { refreshHud } from '../ui/hud.js';
import { showToast } from '../ui/toast.js';
import { registerTable } from '../missions/widgets.js';
import { isRegionDone, isRegionOpen, isMissionDone } from './progress.js';
import { statStart, statAttempt, statHint, statWin, statAbandon } from './stats.js';

const FAILS_BEFORE_SUPPORT = 3;

export function startMission(missionId) {
  closeModal();
  closeDialogue();
  if (runtime.session) leaveMission();

  const mission = MISSIONS[missionId];
  const region = regionById(mission.region);
  const session = {
    id: missionId,
    t0: Date.now(),
    tries: 0,
    hints: 0,
    fails: 0,
    supp: 0,
    calc: 0,
    done: false,
    stage: null,
    cleanups: [],
    view: null,
  };
  runtime.session = session;

  logEvent(state.seen[region.id] ? 'region_return' : 'region_enter', { region: region.id });
  state.seen[region.id] = 1;
  logEvent('mission_start', { rep: Boolean(state.done[missionId]) });
  statStart(missionId);
  saveState();

  const viewOptions = {
    mission,
    region,
    npc: CHARACTERS[mission.npc],
    onHint: () => requestHint(false),
    onLeave: leaveMission,
    onNext: startMission,
  };

  // Missão de mundo: acontece no mapa, acompanhada por um rastreador no HUD (sem janela)
  if (mission.mode === 'world') {
    session.inWorld = true;
    session.npc = mission.npc;
    session.view = openQuestTracker(viewOptions);
    session.talk = () => session.view.repeat();
    mission.mountWorld(createMissionApi(session));
    return;
  }

  session.view = openMissionView(viewOptions);
  mission.mount(session.view.stage, createMissionApi(session));
}

/** Funções que cada missão usa para comunicar o que aconteceu. */
function createMissionApi(session) {
  const active = () => runtime.session === session && !session.done;
  return {
    attempt: (ok, data = {}) => (active() ? attempt(session, ok, data) : ok),
    fail: (message) => active() && fail(session, message),
    win: (message) => active() && win(session, message),
    say: (message, tone) => active() && session.view.say(message, tone),
    /** Atualiza o Registro técnico (caderno ao lado da cena). */
    record: (headers, rows, caption) => session.view.setNotebook(registerTable(headers, rows, caption)),
    log: (type, data) => active() && logEvent(type, data),
    /** Só nas missões de mundo: etapa atual e o que fazer agora (rastreador do HUD). */
    setStage: (index) => {
      session.stage = index;
      session.view.setStage?.(index);
    },
    setObjective: (text) => session.view.setObjective?.(text),
    onCleanup: (callback) => session.cleanups.push(callback),
    isActive: active,
  };
}

function attempt(session, ok, data) {
  session.tries++;
  logEvent('attempt', { n: session.tries, ok, ...data });
  statAttempt(session.id, Boolean(ok), session.stage);
  return ok;
}

function fail(session, message) {
  session.fails++;
  session.view.say(message, 'warn');
  if (session.fails % FAILS_BEFORE_SUPPORT === 0) {
    session.supp++;
    logEvent('support_triggered', { n: session.supp, fails: session.fails });
    requestHint(true);
  }
}

export function requestHint(automatic) {
  const session = runtime.session;
  if (!session || session.done) return;
  session.hints = Math.min(session.hints + 1, 3);
  logEvent('hint_request', { level: session.hints, auto: Boolean(automatic) });
  statHint(session.id, Boolean(automatic), session.stage);
  session.view.showHint(session.hints, MISSIONS[session.id].hints[session.hints - 1], automatic);
}

function win(session, message) {
  const mission = MISSIONS[session.id];
  const region = regionById(mission.region);
  const regionWasDone = isRegionDone(region);

  session.done = true;
  const sup = session.hints === 0 ? 'autonomo' : session.hints >= 3 ? 'apoio' : 'dicas';
  const sec = Math.round((Date.now() - session.t0) / 1000);
  const previous = state.done[session.id];
  if (previous) {
    previous.reps++;
    logEvent('retry', { rep: previous.reps, sup });
  } else {
    state.done[session.id] = { sup, tries: session.tries, hints: session.hints, sec, reps: 0 };
  }
  logEvent('success', { sup, tries: session.tries, hints: session.hints, sec, calc: session.calc });
  logEvent('mission_end', { sec });
  statWin(session.id, sec);
  saveState();

  const nextInRegion = region.missions.find((id) => !isMissionDone(id)) ?? null;
  session.view.complete(message, nextInRegion);
  refreshHud();

  if (!regionWasDone && isRegionDone(region)) announceRegion(region);
}

function announceRegion(region) {
  if (region.id === 'f') {
    showToast('Núcleo do Nexo religado!', 'Todas as regiões voltaram a se conectar.', 6000);
    return;
  }
  if (region.id === 'p') showToast('Prólogo concluído.');
  else showToast('Região reconectada:', region.name);
  const next = REGIONS[regionIndexOf(region.id) + 1];
  if (next && isRegionOpen(regionIndexOf(next.id))) {
    setTimeout(() => showToast('Caminho aberto:', next.id === 'f' ? 'o Núcleo está pronto para ser religado.' : `${next.name}, ${next.direction}.`), 900);
  }
}

/** Fecha a missão atual. Se não foi concluída, registra o abandono. */
export function leaveMission() {
  const session = runtime.session;
  if (!session) return;
  if (!session.done) {
    logEvent('mission_end', { abandon: true, tries: session.tries, hints: session.hints });
    statAbandon(session.id, Math.round((Date.now() - session.t0) / 1000));
  }
  // A sessão sai primeiro: um erro numa limpeza nunca pode deixar a missão presa
  runtime.session = null;
  for (const cleanup of session.cleanups) {
    try {
      cleanup();
    } catch (error) {
      console.error('Falha ao limpar a missão', error);
    }
  }
  session.view.close();
  refreshHud();
}

/** Usado pelo Calculador Arcano. */
export function countCalculatorUse() {
  if (runtime.session) runtime.session.calc++;
}
