// logika liczenia "obecnych punktów programu" na podstawie pliku Dane/program.json
// wygenerowanego przez program.html (narzędzie do tworzenia programu konwentu).
//
// Format pliku (zgodny z program.html):
// {
//   Dni: [{ id, nazwa_dnia }],                 // "nazwa_dnia" to DOWOLNA etykieta (np. "Dzień 1", "Sobota", "12.08")
//   Program: [{ id, nazwa_bloku, Sale: [{
//     id, nazwa_sali, nr_sali,
//     Punkty_programu: [{ id, dzien: <id_dnia>, start: "HH:MM", koniec: "HH:MM", typ, "prowadzący" }]
//   }]}]
// }
//
// UWAGA: pliki z program.html NIE przechowują prawdziwej daty kalendarzowej dla dnia
// (tylko dowolną etykietę tekstową). Jeżeli etykieta zawiera rozpoznawalną datę
// (np. "12.08.2026" albo "2026-08-12") lub nazwę dnia tygodnia (np. "Sobota"),
// używamy jej do trafnego dopasowania "dzisiaj". W przeciwnym razie podświetlanie
// "obecnych" punktów odbywa się wyłącznie po godzinie (niezależnie od dnia)
// i wynik zawiera flagę `pewnyDzien: false`, aby front-end mógł to zasygnalizować.

export type PunktProgramu = {
    id: string;
    dzien: string;
    start: string;
    koniec: string;
    typ?: string;
    'prowadzący'?: string;
};
export type Sala = { id: string; nazwa_sali: string; nr_sali?: string; Punkty_programu: PunktProgramu[] };
export type Blok = { id: string; nazwa_bloku: string; Sale: Sala[] };
export type DzienProgramu = { id: string; nazwa_dnia: string };
export type StanProgramu = { Dni: DzienProgramu[]; Program: Blok[] };

const DNI_TYGODNIA_PL = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];

function czasNaMinuty(t: string): number {
    const [h, m] = String(t || '0:0').split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
}

function dzisiejszaData(teraz: Date): string {
    const y = teraz.getFullYear();
    const m = String(teraz.getMonth() + 1).padStart(2, '0');
    const d = String(teraz.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function sprobujWyciagnacDate(etykieta: string): string | null {
    const iso = etykieta.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
    const dmy = etykieta.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
    if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
    return null;
}

function czyEtykietaToDzisiaj(etykieta: string, teraz: Date): boolean | null {
    const data = sprobujWyciagnacDate(etykieta);
    if (data) return data === dzisiejszaData(teraz);
    const nazwaDzisiaj = DNI_TYGODNIA_PL[teraz.getDay()];
    if (etykieta.toLowerCase().includes(nazwaDzisiaj)) return true;
    return null; // nie da się jednoznacznie stwierdzić
}

function czyStanPoprawny(stan: unknown): stan is StanProgramu {
    return !!stan && typeof stan === 'object' && Array.isArray((stan as StanProgramu).Program);
}

export type ObecnyPunkt = {
    id: string;
    blok: string;
    sala: string;
    nrSali?: string;
    dzien: string;
    start: string;
    koniec: string;
    typ?: string;
    prowadzacy?: string;
};

export function obliczObecnePunkty(stan: unknown, teraz: Date = new Date()): { pewnyDzien: boolean; punkty: ObecnyPunkt[] } {
    if (!czyStanPoprawny(stan)) return { pewnyDzien: true, punkty: [] };

    const etykietyDni = new Map(stan.Dni.map((d) => [d.id, d.nazwa_dnia]));
    const minutaTeraz = teraz.getHours() * 60 + teraz.getMinutes();

    // sprawdzamy, czy JAKAKOLWIEK etykieta dnia daje się jednoznacznie dopasować do dzisiaj
    const rozstrzygalne = stan.Dni.some((d) => czyEtykietaToDzisiaj(d.nazwa_dnia, teraz) !== null);

    const punkty: ObecnyPunkt[] = [];
    for (const blok of stan.Program || []) {
        for (const sala of blok.Sale || []) {
            for (const punkt of sala.Punkty_programu || []) {
                const start = czasNaMinuty(punkt.start);
                const koniec = czasNaMinuty(punkt.koniec);
                const wGodzinach = minutaTeraz >= start && minutaTeraz < koniec;
                if (!wGodzinach) continue;

                if (rozstrzygalne) {
                    const dopasowanie = czyEtykietaToDzisiaj(etykietyDni.get(punkt.dzien) ?? '', teraz);
                    if (dopasowanie !== true) continue;
                }

                punkty.push({
                    id: punkt.id,
                    blok: blok.nazwa_bloku,
                    sala: sala.nazwa_sali,
                    nrSali: sala.nr_sali,
                    dzien: etykietyDni.get(punkt.dzien) ?? '(brak dnia)',
                    start: punkt.start,
                    koniec: punkt.koniec,
                    typ: punkt.typ,
                    prowadzacy: punkt['prowadzący'],
                });
            }
        }
    }

    return { pewnyDzien: rozstrzygalne, punkty: punkty.sort((a, b) => a.start.localeCompare(b.start)) };
}

/** Zwraca cały program pogrupowany wg bloków/sal, z flagą `trwaTeraz` przy każdym punkcie. */
export function pelnyProgramZPodswietleniem(stan: unknown, teraz: Date = new Date()) {
    if (!czyStanPoprawny(stan)) return { Dni: [], Program: [] };
    const { pewnyDzien, punkty } = obliczObecnePunkty(stan, teraz);
    const idTrwajacych = new Set(punkty.map((p) => p.id));

    return {
        pewnyDzien,
        Dni: stan.Dni,
        Program: stan.Program.map((blok) => ({
            ...blok,
            Sale: blok.Sale.map((sala) => ({
                ...sala,
                Punkty_programu: sala.Punkty_programu.map((p) => ({ ...p, trwaTeraz: idTrwajacych.has(p.id) })),
            })),
        })),
    };
}
