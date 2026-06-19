const rankingFIFA = { "Argentina": 1, "Francia": 2, "Inglaterra": 3, "Bélgica": 4, "Brasil": 5, "Países Bajos": 6, "Portugal": 7, "España": 8, "Croacia": 10, "Estados Unidos": 11, "Colombia": 12, "Marruecos": 13, "México": 14, "Uruguay": 15, "Alemania": 16, "Senegal": 17, "Japón": 18, "Suiza": 19, "Irán": 20, "Corea del Sur": 22, "Australia": 23, "Austria": 25, "Suecia": 26, "Túnez": 28, "Argelia": 30, "Ecuador": 31, "Catar": 34, "Turquía": 35, "Chequia": 36, "Egipto": 36, "Canadá": 40, "Escocia": 42, "Panamá": 44, "Noruega": 46, "Costa de Marfil": 49, "Arabia Saudita": 53, "Paraguay": 56, "Sudáfrica": 58, "Irak": 59, "Cabo Verde": 65, "Uzbekistán": 66, "Ghana": 67, "Bosnia y Herzegovina": 71, "Jordania": 73, "República Democrática del Congo": 74, "Haití": 89, "Curazao": 90, "Nueva Zelanda": 104 };

const banderas = { "México": "mx", "Corea del Sur": "kr", "Chequia": "cz", "Sudáfrica": "za", "Suiza": "ch", "Canadá": "ca", "Catar": "qa", "Bosnia y Herzegovina": "ba", "Escocia": "gb-sct", "Marruecos": "ma", "Brasil": "br", "Haití": "ht", "Estados Unidos": "us", "Australia": "au", "Turquía": "tr", "Paraguay": "py", "Alemania": "de", "Costa de Marfil": "ci", "Ecuador": "ec", "Curazao": "cw", "Suecia": "se", "Japón": "jp", "Países Bajos": "nl", "Túnez": "tn", "Nueva Zelanda": "nz", "Irán": "ir", "Bélgica": "be", "Egipto": "eg", "Uruguay": "uy", "Arabia Saudita": "sa", "España": "es", "Cabo Verde": "cv", "Noruega": "no", "Francia": "fr", "Senegal": "sn", "Irak": "iq", "Argentina": "ar", "Austria": "at", "Jordania": "jo", "Argelia": "dz", "Colombia": "co", "República Democrática del Congo": "cd", "Portugal": "pt", "Uzbekistán": "uz", "Inglaterra": "gb-eng", "Ghana": "gh", "Panamá": "pa", "Croacia": "hr" };

// Variable let para permitir sobrescritura con JSON externo
let datosGruposV3 = {
    A: [ {j:1, e1:"México", e2:"Sudáfrica"}, {j:1, e1:"Corea del Sur", e2:"Chequia"}, {j:2, e1:"Chequia", e2:"Sudáfrica"}, {j:2, e1:"México", e2:"Corea del Sur"}, {j:3, e1:"México", e2:"Chequia"}, {j:3, e1:"Sudáfrica", e2:"Corea del Sur"} ],
    B: [ {j:1, e1:"Canadá", e2:"Bosnia y Herzegovina"}, {j:1, e1:"Catar", e2:"Suiza"}, {j:2, e1:"Suiza", e2:"Bosnia y Herzegovina"}, {j:2, e1:"Canadá", e2:"Catar"}, {j:3, e1:"Suiza", e2:"Canadá"}, {j:3, e1:"Bosnia y Herzegovina", e2:"Catar"} ],
    C: [ {j:1, e1:"Brasil", e2:"Marruecos"}, {j:1, e1:"Haití", e2:"Escocia"}, {j:2, e1:"Escocia", e2:"Marruecos"}, {j:2, e1:"Brasil", e2:"Haití"}, {j:3, e1:"Escocia", e2:"Brasil"}, {j:3, e1:"Marruecos", e2:"Haití"} ],
    D: [ {j:1, e1:"Estados Unidos", e2:"Paraguay"}, {j:1, e1:"Australia", e2:"Turquía"}, {j:2, e1:"Estados Unidos", e2:"Australia"}, {j:2, e1:"Turquía", e2:"Paraguay"}, {j:3, e1:"Turquía", e2:"Estados Unidos"}, {j:3, e1:"Paraguay", e2:"Australia"} ],
    E: [ {j:1, e1:"Alemania", e2:"Curazao"}, {j:1, e1:"Costa de Marfil", e2:"Ecuador"}, {j:2, e1:"Alemania", e2:"Costa de Marfil"}, {j:2, e1:"Ecuador", e2:"Curazao"}, {j:3, e1:"Curazao", e2:"Costa de Marfil"}, {j:3, e1:"Ecuador", e2:"Alemania"} ],
    F: [ {j:1, e1:"Países Bajos", e2:"Japón"}, {j:1, e1:"Suecia", e2:"Túnez"}, {j:2, e1:"Países Bajos", e2:"Suecia"}, {j:2, e1:"Túnez", e2:"Japón"}, {j:3, e1:"Japón", e2:"Suecia"}, {j:3, e1:"Túnez", e2:"Países Bajos"} ],
    G: [ {j:1, e1:"Bélgica", e2:"Egipto"}, {j:1, e1:"Irán", e2:"Nueva Zelanda"}, {j:2, e1:"Bélgica", e2:"Irán"}, {j:2, e1:"Nueva Zelanda", e2:"Egipto"}, {j:3, e1:"Egipto", e2:"Irán"}, {j:3, e1:"Nueva Zelanda", e2:"Bélgica"} ],
    H: [ {j:1, e1:"España", e2:"Cabo Verde"}, {j:1, e1:"Arabia Saudita", e2:"Uruguay"}, {j:2, e1:"España", e2:"Arabia Saudita"}, {j:2, e1:"Uruguay", e2:"Cabo Verde"}, {j:3, e1:"Cabo Verde", e2:"Arabia Saudita"}, {j:3, e1:"Uruguay", e2:"España"} ],
    I: [ {j:1, e1:"Francia", e2:"Senegal"}, {j:1, e1:"Irak", e2:"Noruega"}, {j:2, e1:"Francia", e2:"Irak"}, {j:2, e1:"Noruega", e2:"Senegal"}, {j:3, e1:"Noruega", e2:"Francia"}, {j:3, e1:"Senegal", e2:"Irak"} ],
    J: [ {j:1, e1:"Argentina", e2:"Argelia"}, {j:1, e1:"Austria", e2:"Jordania"}, {j:2, e1:"Argentina", e2:"Austria"}, {j:2, e1:"Jordania", e2:"Argelia"}, {j:3, e1:"Argelia", e2:"Austria"}, {j:3, e1:"Jordania", e2:"Argentina"} ],
    K: [ {j:1, e1:"Portugal", e2:"República Democrática del Congo"}, {j:1, e1:"Colombia", e2:"Uzbekistán"}, {j:2, e1:"Portugal", e2:"Uzbekistán"}, {j:2, e1:"Colombia", e2:"República Democrática del Congo"}, {j:3, e1:"Colombia", e2:"Portugal"}, {j:3, e1:"República Democrática del Congo", e2:"Uzbekistán"} ],
    L: [ {j:1, e1:"Inglaterra", e2:"Croacia"}, {j:1, e1:"Ghana", e2:"Panamá"}, {j:2, e1:"Inglaterra", e2:"Ghana"}, {j:2, e1:"Panamá", e2:"Croacia"}, {j:3, e1:"Panamá", e2:"Inglaterra"}, {j:3, e1:"Croacia", e2:"Ghana"} ]
};

const matrizFIFA_R32 = [
    // --- LADO IZQUIERDO ---
    { partido: 74, tipo: "1v3", g1: "E", grupos3: ["A","B","C","D","F"], reqTercero: true },
    { partido: 77, tipo: "1v3", g1: "I", grupos3: ["C","D","F","G","H"], reqTercero: true },
    { partido: 73, tipo: "2v2", g1: "A", g2: "B", reqTercero: false },
    { partido: 75, tipo: "1vS", g1: "F", g2: "C", reqTercero: false },
    { partido: 83, tipo: "2v2", g1: "K", g2: "L", reqTercero: false },
    { partido: 84, tipo: "1vS", g1: "H", g2: "J", reqTercero: false },
    { partido: 81, tipo: "1v3", g1: "D", grupos3: ["B","E","F","I","J"], reqTercero: true },
    { partido: 82, tipo: "1v3", g1: "G", grupos3: ["A","E","H","I","J"], reqTercero: true },

    // --- LADO DERECHO ---
    { partido: 76, tipo: "1vS", g1: "C", g2: "F", reqTercero: false },
    { partido: 78, tipo: "2v2", g1: "E", g2: "I", reqTercero: false },
    { partido: 79, tipo: "1v3", g1: "A", grupos3: ["C","E","F","H","I"], reqTercero: true },
    { partido: 80, tipo: "1v3", g1: "L", grupos3: ["E","H","I","J","K"], reqTercero: true },
    { partido: 86, tipo: "1vS", g1: "J", g2: "H", reqTercero: false },
    { partido: 88, tipo: "2v2", g1: "D", g2: "G", reqTercero: false },
    { partido: 85, tipo: "1v3", g1: "B", grupos3: ["E","F","G","I","J"], reqTercero: true },
    { partido: 87, tipo: "1v3", g1: "K", grupos3: ["D","E","I","J","L"], reqTercero: true }
];