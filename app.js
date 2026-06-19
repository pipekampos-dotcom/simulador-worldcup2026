const codigosFIFA = {
    "México": "MEX", "Sudáfrica": "RSA", "Corea del Sur": "KOR", "Chequia": "CZE",
    "Canadá": "CAN", "Bosnia y Herzegovina": "BIH", "Catar": "QAT", "Suiza": "SUI",
    "Brasil": "BRA", "Marruecos": "MAR", "Haití": "HAI", "Escocia": "SCO",
    "Estados Unidos": "USA", "Paraguay": "PAR", "Australia": "AUS", "Turquía": "TUR",
    "Alemania": "GER", "Curazao": "CUW", "Costa de Marfil": "CIV", "Ecuador": "ECU",
    "Países Bajos": "NED", "Japón": "JPN", "Suecia": "SWE", "Túnez": "TUN",
    "Bélgica": "BEL", "Egipto": "EGY", "Irán": "IRN", "Nueva Zelanda": "NZL",
    "España": "ESP", "Cabo Verde": "CPV", "Arabia Saudita": "KSA", "Uruguay": "URU",
    "Francia": "FRA", "Senegal": "SEN", "Irak": "IRQ", "Noruega": "NOR",
    "Argentina": "ARG", "Argelia": "ALG", "Austria": "AUT", "Jordania": "JOR",
    "Portugal": "POR", "República Democrática del Congo": "COD", "Colombia": "COL", "Uzbekistán": "UZB",
    "Inglaterra": "ENG", "Croacia": "CRO", "Ghana": "GHA", "Panamá": "PAN"
};

function getFifaCode(nombre) {
    if (!nombre) return "";
    return codigosFIFA[nombre] || nombre.substring(0, 3).toUpperCase();
}

let estadoGrupales = {};
let todosLosTerceros = []; 
let mejoresTercerosOficiales = []; 
let bracket = {
    R32: Array.from({length: 16}, (_, i) => ({ id: i, eq1: null, eq2: null, g1: null, g2: null, p1: null, p2: null, nextId: Math.floor(i/2), isEq1: i%2===0 })),
    R16: Array.from({length: 8},  (_, i) => ({ id: i, eq1: null, eq2: null, g1: null, g2: null, p1: null, p2: null, nextId: Math.floor(i/2), isEq1: i%2===0 })),
    QF:  Array.from({length: 4},  (_, i) => ({ id: i, eq1: null, eq2: null, g1: null, g2: null, p1: null, p2: null, nextId: Math.floor(i/2), isEq1: i%2===0 })),
    SF:  Array.from({length: 2},  (_, i) => ({ id: i, eq1: null, eq2: null, g1: null, g2: null, p1: null, p2: null, nextId: 0, isEq1: i%2===0 })),
    F:   [{ id: 0, eq1: null, eq2: null, g1: null, g2: null, p1: null, p2: null }],
    Tercero: [{ id: 0, eq1: null, eq2: null, g1: null, g2: null, p1: null, p2: null }] 
};

function getFlag(equipo) {
    if (!equipo || equipo === "TBD") return '';
    const cod = banderas[equipo];
    return cod ? `<img src="https://flagcdn.com/w40/${cod}.png" class="flag" alt="${equipo}">` : '<div class="flag" style="background:#eee"></div>';
}

async function inicializar() {
    if(localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
        document.getElementById('btnTheme').textContent = "☀️ Modo Claro";
    }

    if (window.location.protocol.includes('http')) {
        try {
            const cacheBuster = new Date().getTime();
            const respuesta = await fetch(`./datos_fifa.json?t=${cacheBuster}`);
            if (respuesta.ok) {
                const datosEnVivo = await respuesta.json();
                datosGruposV3 = datosEnVivo;
                console.log("✅ Datos FIFA sincronizados");
            }
        } catch (error) {
            console.log("⚠️ Trabajando offline: Usando data.js");
        }
    } else {
        console.log("💻 Modo Local: Saltando fetch para evitar bloqueos del navegador.");
    }

    if (typeof datosGruposV3 === 'undefined') {
        alert("🚨 Error crítico: No se detecta 'data.js'. Verifica que el archivo exista en la misma carpeta.");
        return;
    }

    const datosGuardados = localStorage.getItem('mundial2026_data');
    if (datosGuardados) {
        const data = JSON.parse(datosGuardados);
        estadoGrupales = data.estadoGrupales;
        bracket = data.bracket;
        for (let r in bracket) {
            bracket[r].forEach(m => {
                if (m.p1 === undefined) m.p1 = null;
                if (m.p2 === undefined) m.p2 = null;
            });
        }
        if(!bracket.Tercero) bracket.Tercero = [{ id: 0, eq1: null, eq2: null, g1: null, g2: null, p1: null, p2: null }];
        todosLosTerceros = data.todosLosTerceros || [];
        mejoresTercerosOficiales = data.mejoresTercerosOficiales || [];
        renderizarGrupos();
        renderizarTerceros();
        renderizarBracket();
        return;
    }

    let pId = 0;
    for (let g in datosGruposV3) {
        let equiposSet = new Set();
        datosGruposV3[g].forEach(p => { equiposSet.add(p.e1); equiposSet.add(p.e2); });
        estadoGrupales[g] = {
            equipos: Array.from(equiposSet).map(name => ({
                name, pts:0, gf:0, gc:0, dg:0, ta:0, tr:0, fairplay:0, rank: rankingFIFA[name] || 999,
                h2h_pts:0, h2h_gf:0, h2h_gc:0, h2h_dg:0
            })),
            partidos: datosGruposV3[g].map(p => ({
                id: `p-${pId++}`, jornada: p.j, eq1: p.e1, eq2: p.e2, g1: null, g2: null, ta1: 0, tr1: 0, ta2: 0, tr2: 0
            }))
        };
    }
    renderizarGrupos();
    calcularClasificados();
}

function toggleTema() {
    document.body.classList.toggle('dark-mode');
    if(document.body.classList.contains('dark-mode')) {
        localStorage.setItem('theme', 'dark');
        document.getElementById('btnTheme').textContent = "☀️ Modo Claro";
    } else {
        localStorage.setItem('theme', 'light');
        document.getElementById('btnTheme').textContent = "🌙 Modo Oscuro";
    }
}

function guardarDatos() {
    localStorage.setItem('mundial2026_data', JSON.stringify({ estadoGrupales, bracket, mejoresTercerosOficiales, todosLosTerceros }));
    alert("¡Tus resultados han sido guardados exitosamente!");
}

function borrarDatos() {
    if (confirm("¿Estás seguro de que quieres borrar todos los datos ingresados y reiniciar el simulador?")) {
        localStorage.removeItem('mundial2026_data');
        location.reload();
    }
}

function actualizarPartido(grupo, partidoId, campo, valor) {
    let partido = estadoGrupales[grupo].partidos.find(p => p.id === partidoId);
    partido[campo] = (valor === "" || valor === null) ? (campo.startsWith('g') ? null : 0) : parseInt(valor);

    estadoGrupales[grupo].equipos.forEach(e => { 
        e.pts = 0; e.gf = 0; e.gc = 0; e.dg = 0; e.ta = 0; e.tr = 0; e.fairplay = 0; 
        e.h2h_pts = 0; e.h2h_gf = 0; e.h2h_gc = 0; e.h2h_dg = 0; 
    });

    estadoGrupales[grupo].partidos.forEach(p => {
        let e1 = estadoGrupales[grupo].equipos.find(e => e.name === p.eq1);
        let e2 = estadoGrupales[grupo].equipos.find(e => e.name === p.eq2);
        e1.ta += p.ta1; e1.tr += p.tr1; e2.ta += p.ta2; e2.tr += p.tr2;
        if (p.g1 !== null && p.g2 !== null) {
            e1.gf += p.g1; e1.gc += p.g2; e2.gf += p.g2; e2.gc += p.g1;
            if (p.g1 > p.g2) e1.pts += 3; else if (p.g2 > p.g1) e2.pts += 3; else { e1.pts += 1; e2.pts += 1; }
        }
    });

    estadoGrupales[grupo].equipos.forEach(e => { e.dg = e.gf - e.gc; e.fairplay = (e.ta * -1) + (e.tr * -4); });

    let gruposPorPuntos = {};
    estadoGrupales[grupo].equipos.forEach(e => {
        if(!gruposPorPuntos[e.pts]) gruposPorPuntos[e.pts] = [];
        gruposPorPuntos[e.pts].push(e.name);
    });

    for (let pts in gruposPorPuntos) {
        let empatados = gruposPorPuntos[pts];
        if (empatados.length > 1) {
            estadoGrupales[grupo].partidos.forEach(p => {
                if (p.g1 !== null && p.g2 !== null && empatados.includes(p.eq1) && empatados.includes(p.eq2)) {
                    let e1 = estadoGrupales[grupo].equipos.find(e => e.name === p.eq1);
                    let e2 = estadoGrupales[grupo].equipos.find(e => e.name === p.eq2);
                    e1.h2h_gf += p.g1; e1.h2h_gc += p.g2;
                    e2.h2h_gf += p.g2; e2.h2h_gc += p.g1;
                    if (p.g1 > p.g2) e1.h2h_pts += 3;
                    else if (p.g2 > p.g1) e2.h2h_pts += 3;
                    else { e1.h2h_pts += 1; e2.h2h_pts += 1; }
                }
            });
        }
    }
    estadoGrupales[grupo].equipos.forEach(e => { e.h2h_dg = e.h2h_gf - e.h2h_gc; });

    estadoGrupales[grupo].equipos.sort((a, b) => {
        if (b.pts !== a.pts) return b.pts - a.pts;
        if (b.h2h_pts !== a.h2h_pts) return b.h2h_pts - a.h2h_pts;
        if (b.h2h_dg !== a.h2h_dg) return b.h2h_dg - a.h2h_dg;
        if (b.h2h_gf !== a.h2h_gf) return b.h2h_gf - a.h2h_gf;
        if (b.dg !== a.dg) return b.dg - a.dg;
        if (b.gf !== a.gf) return b.gf - a.gf;
        if (b.fairplay !== a.fairplay) return b.fairplay - a.fairplay;
        return a.rank - b.rank;
    });

    let activeId = document.activeElement ? document.activeElement.id : null;
    renderizarGrupos();
    calcularClasificados();
    if (activeId) { let el = document.getElementById(activeId); if (el) el.focus(); }
}

function resolverTerceros(top8terceros, slotsOficiales) {
    let equipos = [...top8terceros].sort((a, b) => a.grupo.localeCompare(b.grupo));
    let ordenFifa = [79, 85, 81, 74, 82, 77, 87, 80];

    let slotsEval = slotsOficiales.map((slot, index) => ({
        slot: slot,
        originalIndex: index,
        prioridad: ordenFifa.indexOf(slot.partido)
    })).sort((a, b) => a.prioridad - b.prioridad);

    let asignacionesEval = new Array(slotsEval.length).fill(null);
    let usado = new Array(equipos.length).fill(false);
    
    function backtrack(idx) {
        if (idx === slotsEval.length) return true; 
        let currentSlot = slotsEval[idx].slot;
        
        for (let i = 0; i < equipos.length; i++) {
            if (!usado[i] && currentSlot.grupos3.includes(equipos[i].grupo)) {
                asignacionesEval[idx] = equipos[i];
                usado[i] = true;
                if (backtrack(idx + 1)) return true;
                usado[i] = false;
                asignacionesEval[idx] = null;
            }
        }
        return false;
    }
    
    if (backtrack(0)) {
        let resultadoFinal = new Array(slotsOficiales.length).fill(null);
        for(let i=0; i < slotsEval.length; i++) {
            resultadoFinal[slotsEval[i].originalIndex] = asignacionesEval[i];
        }
        return resultadoFinal;
    }
    return new Array(slotsOficiales.length).fill(null); 
}

function calcularClasificados() {
    let ganadores = {}, segundos = {};
    todosLosTerceros = [];
    
    for (let g in estadoGrupales) {
        let eq = estadoGrupales[g].equipos;
        ganadores[g] = eq[0]; segundos[g] = eq[1];
        todosLosTerceros.push({ name: eq[2].name, grupo: g, pts: eq[2].pts, dg: eq[2].dg, gf: eq[2].gf, fp: eq[2].fairplay, rank: eq[2].rank });
    }

    todosLosTerceros.sort((a, b) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf || b.fp - a.fp || a.rank - b.rank);
    const top8terceros = todosLosTerceros.slice(0, 8);
    mejoresTercerosOficiales = top8terceros.map(t => t.name);

    let slotsTerceros = matrizFIFA_R32.filter(m => m.reqTercero);
    let asignacionesTerceros = resolverTerceros(top8terceros, slotsTerceros);
    let tercerIndex = 0;

    const cruces = matrizFIFA_R32.map(conf => {
        let eq1 = null, eq2 = null;
        if (conf.tipo === "2v2") { eq1 = segundos[conf.g1] || null; eq2 = segundos[conf.g2] || null; } 
        else if (conf.tipo === "1vS") { eq1 = ganadores[conf.g1] || null; eq2 = segundos[conf.g2] || null; } 
        else if (conf.tipo === "1v3") {
            eq1 = ganadores[conf.g1] || null;
            let candidato = asignacionesTerceros[tercerIndex];
            if (candidato) eq2 = candidato;
            tercerIndex++;
        }
        return { eq1: eq1 ? eq1.name : null, eq2: eq2 ? (eq2.name || eq2) : null };
    });

    bracket.R32.forEach((match, i) => { match.eq1 = cruces[i].eq1; match.eq2 = cruces[i].eq2; procesarAvanceLlave('R32', match); });
    
    renderizarTerceros();
    renderizarBracket();
}

function actualizarPenal(ronda, matchId, isEq1, valor) {
    let match = bracket[ronda].find(m => m.id === matchId);
    match[isEq1 ? 'p1' : 'p2'] = (valor === "" || valor === null) ? null : parseInt(valor);
    procesarAvanceLlave(ronda, match);
    renderizarBracket();
}

function actualizarBracket(ronda, matchId, isEq1, valor) {
    let match = bracket[ronda].find(m => m.id === matchId);
    match[isEq1 ? 'g1' : 'g2'] = (valor === "" || valor === null) ? null : parseInt(valor);
    if (match.g1 !== match.g2) { match.p1 = null; match.p2 = null; }
    procesarAvanceLlave(ronda, match);
    renderizarBracket();
}

function procesarAvanceLlave(ronda, match) {
    if (!match) return;
    let ganador = null; let perdedor = null;
    
    if (match.g1 !== null && match.g2 !== null && match.eq1 && match.eq2) { 
        if (match.g1 > match.g2) { ganador = match.eq1; perdedor = match.eq2; } 
        else if (match.g2 > match.g1) { ganador = match.eq2; perdedor = match.eq1; } 
        else if (match.g1 === match.g2) {
            if (match.p1 !== null && match.p2 !== null) {
                if (match.p1 > match.p2) { ganador = match.eq1; perdedor = match.eq2; }
                else if (match.p2 > match.p1) { ganador = match.eq2; perdedor = match.eq1; }
            }
        }
    }
    
    const nextRonda = { R32:'R16', R16:'QF', QF:'SF', SF:'F' }[ronda];
    if (nextRonda) {
        let nextMatch = bracket[nextRonda][match.nextId];
        if (match.isEq1) nextMatch.eq1 = ganador; else nextMatch.eq2 = ganador;
        procesarAvanceLlave(nextRonda, nextMatch);
    }
    if (ronda === 'SF') {
        let thirdMatch = bracket.Tercero[0];
        if (match.isEq1) thirdMatch.eq1 = perdedor; else thirdMatch.eq2 = perdedor;
    }
}

function renderizarGrupos() {
    let htmlTotal = "";
    for (let g in estadoGrupales) {
        let eqArray = estadoGrupales[g].equipos;
        let grupoIniciado = estadoGrupales[g].partidos.some(p => p.g1 !== null);
        
        eqArray.forEach(e => delete e.desempateInfo);
        
        if (grupoIniciado) {
            for (let i = 0; i < eqArray.length - 1; i++) {
                let e1 = eqArray[i]; let e2 = eqArray[i+1];
                if (e1.pts === e2.pts) {
                    let criterio = ""; let v1 = "", v2 = "";
                    
                    if (e1.h2h_pts !== e2.h2h_pts) {
                        criterio = "Puntos en Miniliga (Directo)"; v1 = e1.h2h_pts; v2 = e2.h2h_pts;
                    } else if (e1.h2h_dg !== e2.h2h_dg) {
                        criterio = "DG en Miniliga (Directo)"; v1 = e1.h2h_dg > 0 ? `+${e1.h2h_dg}` : e1.h2h_dg; v2 = e2.h2h_dg > 0 ? `+${e2.h2h_dg}` : e2.h2h_dg;
                    } else if (e1.h2h_gf !== e2.h2h_gf) {
                        criterio = "GF en Miniliga (Directo)"; v1 = e1.h2h_gf; v2 = e2.h2h_gf;
                    } else if (e1.dg !== e2.dg) {
                        criterio = "Diferencia de Goles General"; v1 = e1.dg > 0 ? `+${e1.dg}` : e1.dg; v2 = e2.dg > 0 ? `+${e2.dg}` : e2.dg;
                    } else if (e1.gf !== e2.gf) {
                        criterio = "Goles a Favor General"; v1 = e1.gf; v2 = e2.gf;
                    } else if (e1.fairplay !== e2.fairplay) {
                        criterio = "Fair Play"; v1 = e1.fairplay; v2 = e2.fairplay;
                    } else if (e1.rank !== e2.rank) {
                        criterio = "Ranking FIFA"; v1 = `#${e1.rank}`; v2 = `#${e2.rank}`;
                    }
                    
                    if (criterio !== "") e1.desempateInfo = { criterio: criterio, valorGanador: v1, valorRival: v2, rival: e2.name };
                }
            }
        }

        let tHtml = `<div class="table-responsive"><table><tr><th>Pos</th><th style="text-align:left">Equipo</th><th>Pts</th><th>DG</th></tr>`;
        eqArray.forEach((e, i) => {
            let cl = i < 2 ? 'class="top-two"' : (i === 2 && mejoresTercerosOficiales.includes(e.name) ? 'class="best-third"' : '');
            let iconHtml = '';
            if (e.desempateInfo) {
                let d = e.desempateInfo;
                let msg = `Desempate por ${d.criterio}: ${d.valorGanador} vs ${d.valorRival} — supera a ${d.rival}`;
                iconHtml = `<span class="info-tooltip" onclick="alert('${msg}')" title="Desempate resuelto">ⓘ</span>`;
            }
            tHtml += `<tr ${cl}><td>${i+1}</td><td><div class="equipo-celda">${getFlag(e.name)} <span title="${e.name}">${e.name}</span>${iconHtml}</div></td><td><strong>${e.pts}</strong></td><td>${e.dg}</td></tr>`;
        });

        tHtml += `</table></div><div class="partidos">`;
        let cJor = 0;
        estadoGrupales[g].partidos.forEach(p => {
            if (p.jornada !== cJor) { tHtml += `<div class="jornada-header">Jornada ${p.jornada}</div>`; cJor = p.jornada; }
            tHtml += `
                <div class="partido">
                    <div class="partido-equipo derecha">
                        <span title="${p.eq1}"><strong>${getFifaCode(p.eq1)}</strong></span> ${getFlag(p.eq1)}
                        <input type="number" id="tr1-${p.id}" class="tarjeta-input bg-r" min="0" value="${p.tr1||''}" placeholder="TR" onchange="actualizarPartido('${g}','${p.id}','tr1',this.value)">
                        <input type="number" id="ta1-${p.id}" class="tarjeta-input bg-y" min="0" value="${p.ta1||''}" placeholder="TA" onchange="actualizarPartido('${g}','${p.id}','ta1',this.value)">
                    </div>
                    <div class="marcador">
                        <input type="number" id="g1-${p.id}" class="goles-input" min="0" value="${p.g1 !== null ? p.g1 : ''}" placeholder="0" onchange="actualizarPartido('${g}','${p.id}','g1',this.value)">
                        -
                        <input type="number" id="g2-${p.id}" class="goles-input" min="0" value="${p.g2 !== null ? p.g2 : ''}" placeholder="0" onchange="actualizarPartido('${g}','${p.id}','g2',this.value)">
                    </div>
                    <div class="partido-equipo izquierda">
                        <input type="number" id="ta2-${p.id}" class="tarjeta-input bg-y" min="0" value="${p.ta2||''}" placeholder="TA" onchange="actualizarPartido('${g}','${p.id}','ta2',this.value)">
                        <input type="number" id="tr2-${p.id}" class="tarjeta-input bg-r" min="0" value="${p.tr2||''}" placeholder="TR" onchange="actualizarPartido('${g}','${p.id}','tr2',this.value)">
                        ${getFlag(p.eq2)} <span title="${p.eq2}"><strong>${getFifaCode(p.eq2)}</strong></span>
                    </div>
                </div>`;
        });
        htmlTotal += `<div class="card-grupo"><h3 class="group-title">Grupo ${g}</h3>${tHtml}</div></div>`;
    }
    document.getElementById("contenedor-grupos").innerHTML = htmlTotal;
}

function renderizarTerceros() {
    if (todosLosTerceros.length === 0) return;
    let html = `<table><tr><th>Pos</th><th>Grupo</th><th style="text-align:left">Equipo</th><th>Pts</th><th>DG</th><th>GF</th><th>FP</th><th>Rank</th></tr>`;
    todosLosTerceros.forEach((t, i) => {
        let cl = i < 8 ? 'class="best-third"' : 'class="row-eliminated"';
        let status = i < 8 ? '✅' : '❌';
        html += `<tr ${cl}><td>${i+1} ${status}</td><td><strong>${t.grupo}</strong></td><td><div class="equipo-celda">${getFlag(t.name)} <span>${t.name}</span></div></td><td><strong>${t.pts}</strong></td><td>${t.dg}</td><td>${t.gf}</td><td>${t.fp}</td><td style="font-size:0.85em;color:#777">${t.rank !== 999 ? t.rank : '—'}</td></tr>`;
    });
    html += `</table>`;
    document.getElementById("contenedor-terceros").innerHTML = html;
}

function generarColumnaBracket(rondaName, matches, titulo) {
    let html = `<div class="bracket-col">`;
    if(titulo) html += `<div class="ronda-header">${titulo}</div>`;
    matches.forEach(m => {
        let cls1 = m.eq1 ? "" : "tbd"; let cls2 = m.eq2 ? "" : "tbd";
        let isTie = m.g1 !== null && m.g2 !== null && m.g1 === m.g2;
        let penStyles = isTie ? "" : "display: none;";
        html += `
        <div class="match-card">
            <div class="match-team">
                <div class="team-info ${cls1}">${getFlag(m.eq1)} <span title="${m.eq1 || ''}">${getFifaCode(m.eq1) || '---'}</span></div>
                <input type="number" class="penal-input" style="${penStyles}" min="0" value="${m.p1 !== null ? m.p1 : ''}" onchange="actualizarPenal('${rondaName}',${m.id},true,this.value)" placeholder="P">
                <input type="number" class="goles-input" min="0" value="${m.g1 !== null ? m.g1 : ''}" onchange="actualizarBracket('${rondaName}',${m.id},true,this.value)" ${!m.eq1 ? 'disabled' : ''}>
            </div>
            <div class="match-team">
                <div class="team-info ${cls2}">${getFlag(m.eq2)} <span title="${m.eq2 || ''}">${getFifaCode(m.eq2) || '---'}</span></div>
                <input type="number" class="penal-input" style="${penStyles}" min="0" value="${m.p2 !== null ? m.p2 : ''}" onchange="actualizarPenal('${rondaName}',${m.id},false,this.value)" placeholder="P">
                <input type="number" class="goles-input" min="0" value="${m.g2 !== null ? m.g2 : ''}" onchange="actualizarBracket('${rondaName}',${m.id},false,this.value)" ${!m.eq2 ? 'disabled' : ''}>
            </div>
        </div>`;
    });
    html += `</div>`; return html;
}

function renderizarBracket() {
    let html = "";
    
    // Contenedor del logo de la FIFA
    let logoHtml = `
        <div class="bracket-logo-container">
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/2026_FIFA_World_Cup_logo.svg/1200px-2026_FIFA_World_Cup_logo.svg.png" class="fifa-logo-render" alt="FIFA 2026">
        </div>
    `;

    let leftHtml = `<div class="bracket-half">`;
    leftHtml += generarColumnaBracket('R32', bracket.R32.slice(0, 8), '16avos'); leftHtml += generarColumnaBracket('R16', bracket.R16.slice(0, 4), 'Octavos'); leftHtml += generarColumnaBracket('QF', bracket.QF.slice(0, 2), 'Cuartos'); leftHtml += generarColumnaBracket('SF', bracket.SF.slice(0, 1), 'Semis');
    leftHtml += `</div>`;

    let f = bracket.F[0]; let isTieF = f.g1 !== null && f.g2 !== null && f.g1 === f.g2; let penStylesF = isTieF ? "" : "display: none;";
    let t = bracket.Tercero[0]; let isTieT = t.g1 !== null && t.g2 !== null && t.g1 === t.g2; let penStylesT = isTieT ? "" : "display: none;";
    
    let centerHtml = `<div class="bracket-center">
        <div><div class="center-title">FINAL</div>
            <div class="match-card">
                <div class="match-team"><div class="team-info ${!f.eq1 ? 'tbd' : ''}">${getFlag(f.eq1)} <span title="${f.eq1 || ''}">${getFifaCode(f.eq1) || '---'}</span></div><input type="number" class="penal-input" style="${penStylesF}" min="0" value="${f.p1 !== null ? f.p1 : ''}" onchange="actualizarPenal('F',${f.id},true,this.value)" placeholder="P"><input type="number" class="goles-input" min="0" value="${f.g1 !== null ? f.g1 : ''}" onchange="actualizarBracket('F',${f.id},true,this.value)" ${!f.eq1 ? 'disabled' : ''}></div>
                <div class="match-team"><div class="team-info ${!f.eq2 ? 'tbd' : ''}">${getFlag(f.eq2)} <span title="${f.eq2 || ''}">${getFifaCode(f.eq2) || '---'}</span></div><input type="number" class="penal-input" style="${penStylesF}" min="0" value="${f.p2 !== null ? f.p2 : ''}" onchange="actualizarPenal('F',${f.id},false,this.value)" placeholder="P"><input type="number" class="goles-input" min="0" value="${f.g2 !== null ? f.g2 : ''}" onchange="actualizarBracket('F',${f.id},false,this.value)" ${!f.eq2 ? 'disabled' : ''}></div>
            </div>
        </div>
        <div><div class="center-title">3er Puesto</div>
            <div class="match-card">
                <div class="match-team"><div class="team-info ${!t.eq1 ? 'tbd' : ''}">${getFlag(t.eq1)} <span title="${t.eq1 || ''}">${getFifaCode(t.eq1) || '---'}</span></div><input type="number" class="penal-input" style="${penStylesT}" min="0" value="${t.p1 !== null ? t.p1 : ''}" onchange="actualizarPenal('Tercero',${t.id},true,this.value)" placeholder="P"><input type="number" class="goles-input" min="0" value="${t.g1 !== null ? t.g1 : ''}" onchange="actualizarBracket('Tercero',${t.id},true,this.value)" ${!t.eq1 ? 'disabled' : ''}></div>
                <div class="match-team"><div class="team-info ${!t.eq2 ? 'tbd' : ''}">${getFlag(t.eq2)} <span title="${t.eq2 || ''}">${getFifaCode(t.eq2) || '---'}</span></div><input type="number" class="penal-input" style="${penStylesT}" min="0" value="${t.p2 !== null ? t.p2 : ''}" onchange="actualizarPenal('Tercero',${t.id},false,this.value)" placeholder="P"><input type="number" class="goles-input" min="0" value="${t.g2 !== null ? t.g2 : ''}" onchange="actualizarBracket('Tercero',${t.id},false,this.value)" ${!t.eq2 ? 'disabled' : ''}></div>
            </div>
        </div>
    </div>`;

    let rightHtml = `<div class="bracket-half right">`;
    rightHtml += generarColumnaBracket('R32', bracket.R32.slice(8, 16), '16avos'); rightHtml += generarColumnaBracket('R16', bracket.R16.slice(4, 8), 'Octavos'); rightHtml += generarColumnaBracket('QF', bracket.QF.slice(2, 4), 'Cuartos'); rightHtml += generarColumnaBracket('SF', bracket.SF.slice(1, 2), 'Semis');
    rightHtml += `</div>`;

    document.getElementById("contenedor-bracket").innerHTML = leftHtml + centerHtml + rightHtml;

    // Insertar el logo arriba del bracket
    const wrapper = document.querySelectorAll('.bracket-wrapper')[1]; // Seleccionamos el segundo wrapper (el del bracket)
    if (wrapper && !document.querySelector('.bracket-logo-container')) {
        const titulo = wrapper.querySelector('h2');
        if (titulo) {
            titulo.insertAdjacentHTML('afterend', logoHtml);
        }
    }
}

function exportarBracket() {
    const contenedor = document.querySelectorAll('.bracket-wrapper')[1];
    
    if (!contenedor) {
        alert("Primero debes cargar el bracket");
        return;
    }
    
    // Activamos temporalmente el logo
    contenedor.classList.add('modo-captura');
    
    html2canvas(contenedor, {
        useCORS: true,
        scale: 2,
        backgroundColor: getComputedStyle(document.body).getPropertyValue('--bg-card')
    }).then(canvas => {
        const enlace = document.createElement('a');
        enlace.download = 'mi-prediccion-mundial2026.jpg';
        enlace.href = canvas.toDataURL('image/jpeg', 0.9);
        enlace.click();
        
        // Ocultamos el logo nuevamente
        contenedor.classList.remove('modo-captura');
    }).catch(error => {
        console.error("Error al exportar la imagen:", error);
        contenedor.classList.remove('modo-captura');
        alert("Hubo un error al exportar la imagen. Intenta nuevamente.");
    });
}

window.onload = inicializar;
