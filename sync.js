/**
 * sync.js — Módulo de sincronización automática con API-Football
 * Mundial FIFA 2026 Tracker
 *
 * INSTALACIÓN:
 *   1. Agrega tu API key de api-football.com abajo
 *   2. Incluye este script en tu HTML DESPUÉS de todos tus otros scripts:
 *      <script src="sync.js"></script>
 *
 * La API gratuita de API-Football (via RapidAPI) permite 100 peticiones/día.
 * Este módulo gestiona las peticiones de forma inteligente para no agotar el cupo.
 */

const SYNC_CONFIG = {
    // ─────────────────────────────────────────────
    //  IMPORTANTE: Pon aquí tu API key de RapidAPI
    //  Regístrate gratis en: https://dashboard.api-football.com
    // ─────────────────────────────────────────────
    API_KEY: "15da44817cc7cd70a26c7ebc51419543",

    // ID del Mundial 2026 en API-Football (se confirma automáticamente al init)
    LEAGUE_ID: 1,       // Copa del Mundo FIFA
    SEASON: 2026,

    // Intervalo de auto-refresco en milisegundos (5 minutos por defecto)
    // Cámbialo a 60000 (1 min) cuando haya partidos en vivo
    REFRESH_INTERVAL: 5 * 60 * 1000,

    // Umbral de "partido en vivo": si hay partido en progreso, refresca cada 60s
    LIVE_REFRESH_INTERVAL: 60 * 1000,

    BASE_URL: "https://v3.football.api-sports.io",
};

// ─────────────────────────────────────────────────────────────────────────────
// MAPEO: nombres en tu app → nombres en API-Football
// Ajusta si la API devuelve nombres distintos
// ─────────────────────────────────────────────────────────────────────────────
const NOMBRE_EQUIPO_MAP = {
    // Ejemplos — la mayoría coinciden, ajusta los que no
    "USA":          "United States",
    "Corea del Sur":"South Korea",
    "Corea del Norte":"North Korea",
    "Irán":         "Iran",
    "Arabia Saudita":"Saudi Arabia",
    "Costa de Marfil":"Ivory Coast",
    "República Checa":"Czech Republic",
    "Bosnia":       "Bosnia and Herzegovina",
    "Países Bajos": "Netherlands",
    "Eslovaquia":   "Slovakia",
    "Australia":    "Australia",
    // Agrega más si encuentras discrepancias al probar
};

// Inverso del mapa (API → tu app)
const API_A_LOCAL = Object.fromEntries(
    Object.entries(NOMBRE_EQUIPO_MAP).map(([local, api]) => [api, local])
);

function normalizarNombre(nombreApi) {
    return API_A_LOCAL[nombreApi] || nombreApi;
}

// ─────────────────────────────────────────────────────────────────────────────
// CLIENTE API
// ─────────────────────────────────────────────────────────────────────────────
async function apiRequest(endpoint, params = {}) {
    const url = new URL(`${SYNC_CONFIG.BASE_URL}/${endpoint}`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    const response = await fetch(url.toString(), {
        headers: {
            "x-apisports-key": SYNC_CONFIG.API_KEY,
        },
    });

    if (!response.ok) {
        throw new Error(`API error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.errors && Object.keys(data.errors).length > 0) {
        throw new Error(`API errors: ${JSON.stringify(data.errors)}`);
    }

    return data.response;
}

// ─────────────────────────────────────────────────────────────────────────────
// LÓGICA DE SINCRONIZACIÓN
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Obtiene todos los partidos de la fase de grupos del Mundial 2026
 * y actualiza estadoGrupales en la app.
 */
async function sincronizarGrupos() {
    syncUI.setStatus("Obteniendo partidos de grupos...", "loading");

    const fixtures = await apiRequest("fixtures", {
        league:  SYNC_CONFIG.LEAGUE_ID,
        season:  SYNC_CONFIG.SEASON,
        round:   "Group Stage",   // API-Football usa este string para fase de grupos
    });

    if (!fixtures || fixtures.length === 0) {
        syncUI.setStatus("No se encontraron partidos de fase de grupos.", "warn");
        return 0;
    }

    let actualizados = 0;
    let hayPartidoEnVivo = false;

    for (const fixture of fixtures) {
        const estado = fixture.fixture.status.short;

        // Estados posibles: TBD, NS (Not Started), 1H, HT, 2H, ET, P, FT, AET, PEN, SUSP, INT, PST, CANC, ABD, AWD, WO, LIVE
        if (estado === "NS" || estado === "TBD") continue; // Aún no jugado

        if (["1H", "HT", "2H", "ET", "P", "LIVE"].includes(estado)) {
            hayPartidoEnVivo = true;
        }

        const eq1Api = fixture.teams.home.name;
        const eq2Api = fixture.teams.away.name;
        const eq1    = normalizarNombre(eq1Api);
        const eq2    = normalizarNombre(eq2Api);
        const g1     = fixture.goals.home;
        const g2     = fixture.goals.away;

        // Tarjetas: vienen en fixture.events (array de eventos del partido)
        const { ta1, tr1, ta2, tr2 } = extraerTarjetas(fixture.events || [], eq1Api, eq2Api);

        // Encontrar el grupo correspondiente en estadoGrupales
        const grupo = encontrarGrupo(eq1, eq2);
        if (!grupo) {
            console.warn(`[Sync] No se encontró grupo para ${eq1} vs ${eq2}`);
            continue;
        }

        // Encontrar el partido exacto dentro del grupo
        const partido = estadoGrupales[grupo].partidos.find(
            p => (p.eq1 === eq1 && p.eq2 === eq2) || (p.eq1 === eq2 && p.eq2 === eq1)
        );

        if (!partido) {
            console.warn(`[Sync] Partido no encontrado en grupo ${grupo}: ${eq1} vs ${eq2}`);
            continue;
        }

        // Determinar si eq1/eq2 están en el orden correcto o invertido
        const invertido = partido.eq1 !== eq1;

        // Actualizar scores
        if (g1 !== null && g2 !== null) {
            const nuevoG1 = invertido ? g2 : g1;
            const nuevoG2 = invertido ? g1 : g2;

            if (partido.g1 !== nuevoG1 || partido.g2 !== nuevoG2) {
                // Usar la función existente de la app para mantener consistencia
                actualizarPartido(grupo, partido.id, "g1", nuevoG1);
                actualizarPartido(grupo, partido.id, "g2", nuevoG2);
                actualizados++;
            }
        }

        // Actualizar tarjetas
        const nuevaTa1 = invertido ? ta2 : ta1;
        const nuevaTr1 = invertido ? tr2 : tr1;
        const nuevaTa2 = invertido ? ta1 : ta2;
        const nuevaTr2 = invertido ? tr1 : tr2;

        if (partido.ta1 !== nuevaTa1) actualizarPartido(grupo, partido.id, "ta1", nuevaTa1);
        if (partido.tr1 !== nuevaTr1) actualizarPartido(grupo, partido.id, "tr1", nuevaTr1);
        if (partido.ta2 !== nuevaTa2) actualizarPartido(grupo, partido.id, "ta2", nuevaTa2);
        if (partido.tr2 !== nuevaTr2) actualizarPartido(grupo, partido.id, "tr2", nuevaTr2);
    }

    // Ajustar intervalo de refresco según si hay partidos en vivo
    ajustarIntervalo(hayPartidoEnVivo);

    return actualizados;
}

/**
 * Extrae conteo de tarjetas amarillas y rojas de los eventos del partido
 */
function extraerTarjetas(eventos, nombreHomeApi, nombreAwayApi) {
    let ta1 = 0, tr1 = 0, ta2 = 0, tr2 = 0;

    for (const ev of eventos) {
        if (ev.type !== "Card") continue;

        const esLocal = ev.team.name === nombreHomeApi;
        const tarjeta = ev.detail; // "Yellow Card", "Red Card", "Yellow Red Card"

        if (tarjeta === "Yellow Card") {
            if (esLocal) ta1++; else ta2++;
        } else if (tarjeta === "Red Card" || tarjeta === "Yellow Red Card") {
            if (esLocal) tr1++; else tr2++;
        }
    }

    return { ta1, tr1, ta2, tr2 };
}

/**
 * Busca en estadoGrupales el grupo que contiene ambos equipos
 */
function encontrarGrupo(eq1, eq2) {
    for (const g in estadoGrupales) {
        const nombres = estadoGrupales[g].equipos.map(e => e.name);
        if (nombres.includes(eq1) && nombres.includes(eq2)) return g;
    }
    return null;
}

/**
 * Sincroniza la fase eliminatoria (bracket) con los resultados de la API
 */
async function sincronizarBracket() {
    const rondas = [
        { api: "Round of 32",        local: "R32"     },
        { api: "Round of 16",        local: "R16"     },
        { api: "Quarter-finals",     local: "QF"      },
        { api: "Semi-finals",        local: "SF"      },
        { api: "3rd Place Final",    local: "Tercero" },
        { api: "Final",              local: "F"       },
    ];

    for (const ronda of rondas) {
        let fixtures;
        try {
            fixtures = await apiRequest("fixtures", {
                league: SYNC_CONFIG.LEAGUE_ID,
                season: SYNC_CONFIG.SEASON,
                round:  ronda.api,
            });
        } catch (e) {
            console.warn(`[Sync] Error obteniendo ronda ${ronda.api}:`, e);
            continue;
        }

        if (!fixtures || fixtures.length === 0) continue;

        for (const fixture of fixtures) {
            const estado = fixture.fixture.status.short;
            if (estado === "NS" || estado === "TBD") continue;

            const eq1Api = fixture.teams.home.name;
            const eq2Api = fixture.teams.away.name;
            const eq1    = normalizarNombre(eq1Api);
            const eq2    = normalizarNombre(eq2Api);
            const g1     = fixture.goals.home;
            const g2     = fixture.goals.away;

            // Penales: API-Football los reporta en fixture.score.penalty
            const p1 = fixture.score?.penalty?.home ?? null;
            const p2 = fixture.score?.penalty?.away ?? null;

            // Buscar el partido en el bracket local
            const match = bracket[ronda.local]?.find(
                m => (m.eq1 === eq1 && m.eq2 === eq2) ||
                     (m.eq1 === eq2 && m.eq2 === eq1)
            );

            if (!match) continue;

            const invertido = match.eq1 !== eq1;
            const nuevoG1   = invertido ? g2 : g1;
            const nuevoG2   = invertido ? g1 : g2;
            const nuevoP1   = invertido ? p2 : p1;
            const nuevoP2   = invertido ? p1 : p2;

            if (g1 !== null && g2 !== null) {
                if (match.g1 !== nuevoG1) actualizarBracket(ronda.local, match.id, true,  nuevoG1);
                if (match.g2 !== nuevoG2) actualizarBracket(ronda.local, match.id, false, nuevoG2);
            }
            if (nuevoP1 !== null) actualizarPenal(ronda.local, match.id, true,  nuevoP1);
            if (nuevoP2 !== null) actualizarPenal(ronda.local, match.id, false, nuevoP2);
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTROL DEL INTERVALO DE REFRESCO
// ─────────────────────────────────────────────────────────────────────────────
let refreshTimer = null;

function ajustarIntervalo(hayEnVivo) {
    const intervalo = hayEnVivo
        ? SYNC_CONFIG.LIVE_REFRESH_INTERVAL
        : SYNC_CONFIG.REFRESH_INTERVAL;

    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = setInterval(sincronizarTodo, intervalo);

    const mins = Math.round(intervalo / 60000);
    syncUI.setNextSync(mins);
}

// ─────────────────────────────────────────────────────────────────────────────
// SINCRONIZACIÓN COMPLETA
// ─────────────────────────────────────────────────────────────────────────────
async function sincronizarTodo() {
    if (!SYNC_CONFIG.API_KEY || SYNC_CONFIG.API_KEY.length < 10) {
        syncUI.setStatus("⚠️ Agrega tu API key en sync.js para activar la sincronización.", "warn");
        return;
    }

    syncUI.setStatus("Sincronizando...", "loading");
    syncUI.setBtnState(true);

    try {
        const actualizados = await sincronizarGrupos();
        await sincronizarBracket();

        // Guardar automáticamente después de sincronizar
        localStorage.setItem("mundial2026_data", JSON.stringify({
            estadoGrupales,
            bracket,
            mejoresTercerosOficiales,
            todosLosTerceros,
        }));

        const hora = new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
        syncUI.setStatus(
            actualizados > 0
                ? `✅ ${actualizados} partido(s) actualizado(s) — ${hora}`
                : `✅ Sin cambios — ${hora}`,
            "ok"
        );
    } catch (err) {
        console.error("[Sync] Error:", err);

        if (err.message.includes("403") || err.message.includes("invalid key")) {
            syncUI.setStatus("❌ API key inválida. Verifica tu clave en RapidAPI.", "error");
        } else if (err.message.includes("429")) {
            syncUI.setStatus("⚠️ Límite diario de peticiones alcanzado (100/día en plan gratuito).", "warn");
        } else {
            syncUI.setStatus(`❌ Error: ${err.message}`, "error");
        }
    } finally {
        syncUI.setBtnState(false);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERFAZ DE USUARIO (botón flotante + panel de estado)
// ─────────────────────────────────────────────────────────────────────────────
const syncUI = {
    panel: null,
    statusEl: null,
    nextSyncEl: null,
    btn: null,

    init() {
        const css = `
            #sync-panel {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: #1a1a2e;
                color: #e0e0e0;
                border-radius: 12px;
                padding: 14px 18px;
                font-family: system-ui, sans-serif;
                font-size: 13px;
                z-index: 9999;
                box-shadow: 0 4px 20px rgba(0,0,0,0.4);
                min-width: 240px;
                max-width: 300px;
                user-select: none;
            }
            #sync-panel .sync-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 10px;
            }
            #sync-panel .sync-title {
                font-weight: 600;
                font-size: 14px;
                color: #fff;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            #sync-panel .sync-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #888;
                flex-shrink: 0;
                transition: background 0.3s;
            }
            #sync-panel .sync-dot.ok      { background: #4caf50; }
            #sync-panel .sync-dot.loading { background: #2196F3; animation: pulse 1s infinite; }
            #sync-panel .sync-dot.warn    { background: #ff9800; }
            #sync-panel .sync-dot.error   { background: #f44336; }
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50%       { opacity: 0.3; }
            }
            #sync-panel .sync-status {
                color: #b0b0c0;
                font-size: 12px;
                line-height: 1.4;
                margin-bottom: 10px;
                min-height: 30px;
            }
            #sync-panel .sync-next {
                color: #888;
                font-size: 11px;
                margin-bottom: 10px;
            }
            #sync-panel button {
                background: #2979ff;
                color: #fff;
                border: none;
                border-radius: 7px;
                padding: 7px 14px;
                font-size: 12px;
                cursor: pointer;
                width: 100%;
                font-weight: 500;
                transition: background 0.2s, opacity 0.2s;
            }
            #sync-panel button:hover { background: #1565c0; }
            #sync-panel button:disabled { opacity: 0.5; cursor: default; }
            #sync-panel .sync-toggle {
                background: none;
                border: none;
                color: #888;
                font-size: 16px;
                cursor: pointer;
                padding: 0 4px;
                line-height: 1;
                width: auto;
                font-weight: 400;
            }
            #sync-panel .sync-toggle:hover { color: #fff; background: none; }
            #sync-panel .sync-body.collapsed { display: none; }
        `;

        const style = document.createElement("style");
        style.textContent = css;
        document.head.appendChild(style);

        const panel = document.createElement("div");
        panel.id = "sync-panel";
        panel.innerHTML = `
            <div class="sync-header">
                <div class="sync-title">
                    <span class="sync-dot" id="sync-dot"></span>
                    ⚽ Auto-Sync API
                </div>
                <button class="sync-toggle" id="sync-toggle" title="Minimizar">−</button>
            </div>
            <div class="sync-body" id="sync-body">
                <div class="sync-status" id="sync-status">Iniciando...</div>
                <div class="sync-next" id="sync-next"></div>
                <button id="sync-btn" onclick="sincronizarTodo()">🔄 Sincronizar ahora</button>
            </div>
        `;
        document.body.appendChild(panel);

        this.panel    = panel;
        this.statusEl = document.getElementById("sync-status");
        this.nextEl   = document.getElementById("sync-next");
        this.dotEl    = document.getElementById("sync-dot");
        this.btn      = document.getElementById("sync-btn");

        document.getElementById("sync-toggle").addEventListener("click", () => {
            const body    = document.getElementById("sync-body");
            const toggle  = document.getElementById("sync-toggle");
            const hidden  = body.classList.toggle("collapsed");
            toggle.textContent = hidden ? "+" : "−";
            toggle.title       = hidden ? "Expandir" : "Minimizar";
        });
    },

    setStatus(msg, type = "ok") {
        if (!this.statusEl) return;
        this.statusEl.textContent = msg;
        this.dotEl.className = `sync-dot ${type}`;
    },

    setNextSync(mins) {
        if (!this.nextEl) return;
        this.nextEl.textContent = `Próximo refresco: en ${mins} min`;
    },

    setBtnState(disabled) {
        if (!this.btn) return;
        this.btn.disabled = disabled;
        this.btn.textContent = disabled ? "⏳ Sincronizando..." : "🔄 Sincronizar ahora";
    },
};

// ─────────────────────────────────────────────────────────────────────────────
// ARRANQUE
// ─────────────────────────────────────────────────────────────────────────────
(function arrancar() {
    // Esperar a que la app principal termine de inicializar
    const MAX_ESPERA = 10000;
    const inicio     = Date.now();

    function esperarApp() {
        if (typeof estadoGrupales !== "undefined" &&
            typeof actualizarPartido === "function" &&
            typeof actualizarBracket === "function") {

            syncUI.init();

            if (!SYNC_CONFIG.API_KEY || SYNC_CONFIG.API_KEY.length < 10) {
                syncUI.setStatus(
                    "Agrega tu API key de RapidAPI en sync.js para activar la sincronización automática.",
                    "warn"
                );
                return;
            }

            // Primera sincronización al cargar
            setTimeout(sincronizarTodo, 1500);

            // Refresco periódico inicial (se ajusta automáticamente si hay partido en vivo)
            refreshTimer = setInterval(sincronizarTodo, SYNC_CONFIG.REFRESH_INTERVAL);
            syncUI.setNextSync(Math.round(SYNC_CONFIG.REFRESH_INTERVAL / 60000));

        } else if (Date.now() - inicio < MAX_ESPERA) {
            setTimeout(esperarApp, 300);
        } else {
            console.error("[Sync] La app principal no cargó a tiempo.");
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", esperarApp);
    } else {
        esperarApp();
    }
})();
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", esperarApp);
    } else {
        esperarApp();
    }
})();
