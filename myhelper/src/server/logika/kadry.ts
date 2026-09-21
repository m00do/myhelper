// logika liczenia "obecnych dyżurów" na podstawie pliku Dane/kadry.json
// wygenerowanego przez grafik.html (narzędzie do tworzenia grafiku).
//
// Format pliku (zgodny z grafik.html):
// {
//   Wolontariusze: [{ id, nazwa }],
//   Działy: [{
//     id, nazwa, color, wolontariusze_dzialu: [id],
//     godz_start, godz_koniec, dlugosc_dyzuru,
//     Grafik_dzialu: { Dni: [{ data: "YYYY-MM-DD", dyzury: [
//       { id_dyzuru, start_dyzuru: "HH:MM", koniec_dyzuru: "HH:MM", wolontariusze: [id] }
//     ]}]}
//   }]
// }

export type Wolontariusz = { id: string; nazwa: string };
export type Dyzur = { id_dyzuru: string; start_dyzuru: string; koniec_dyzuru: string; wolontariusze: string[] };
export type DzienGrafiku = { data: string; dyzury: Dyzur[] };
export type Dzial = {
    id: string;
    nazwa: string;
    color?: string;
    wolontariusze_dzialu: string[];
    Grafik_dzialu: { Dni: DzienGrafiku[] };
};
export type StanKadr = { Wolontariusze: Wolontariusz[]; Działy: Dzial[] };

export type ObecnyDyzur = {
    dzialId: string;
    dzial: string;
    kolor?: string;
    idDyzuru: string;
    start: string;
    koniec: string;
    wolontariusze: { id: string; nazwa: string }[];
};

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

function nazwaWolontariusza(stan: StanKadr, id: string): string {
    return stan.Wolontariusze?.find((w) => w.id === id)?.nazwa ?? '(usunięty)';
}

function czyStanPoprawny(stan: unknown): stan is StanKadr {
    return !!stan && typeof stan === 'object' && Array.isArray((stan as StanKadr).Działy);
}

/** Zwraca listę dyżurów trwających w podanym momencie (domyślnie: teraz), opcjonalnie tylko dla jednego działu. */
export function obliczObecneDyzury(stan: unknown, opcje?: { dzialId?: string; teraz?: Date }): ObecnyDyzur[] {
    if (!czyStanPoprawny(stan)) return [];
    const teraz = opcje?.teraz ?? new Date();
    const dzisiaj = dzisiejszaData(teraz);
    const minutaTeraz = teraz.getHours() * 60 + teraz.getMinutes();

    const wynik: ObecnyDyzur[] = [];
    for (const dzial of stan.Działy || []) {
        if (opcje?.dzialId && dzial.id !== opcje.dzialId) continue;
        const dzien = (dzial.Grafik_dzialu?.Dni || []).find((d) => d.data === dzisiaj);
        if (!dzien) continue;
        for (const dyzur of dzien.dyzury || []) {
            const start = czasNaMinuty(dyzur.start_dyzuru);
            const koniec = czasNaMinuty(dyzur.koniec_dyzuru);
            if (minutaTeraz >= start && minutaTeraz < koniec) {
                wynik.push({
                    dzialId: dzial.id,
                    dzial: dzial.nazwa,
                    kolor: dzial.color,
                    idDyzuru: dyzur.id_dyzuru,
                    start: dyzur.start_dyzuru,
                    koniec: dyzur.koniec_dyzuru,
                    wolontariusze: (dyzur.wolontariusze || []).map((id) => ({ id, nazwa: nazwaWolontariusza(stan, id) })),
                });
            }
        }
    }
    return wynik.sort((a, b) => a.dzial.localeCompare(b.dzial, 'pl'));
}

/** Zwraca pełną rozpiskę danego działu na dany dzień (domyślnie dzisiejszy), z oznaczeniem, które dyżury trwają teraz. */
export function rozpiskaDzialu(stan: unknown, dzialId: string, opcje?: { data?: string; teraz?: Date }) {
    if (!czyStanPoprawny(stan)) return null;
    const dzial = stan.Działy.find((d) => d.id === dzialId);
    if (!dzial) return null;
    const teraz = opcje?.teraz ?? new Date();
    const data = opcje?.data ?? dzisiejszaData(teraz);
    const minutaTeraz = teraz.getHours() * 60 + teraz.getMinutes();
    const dzisiaj = dzisiejszaData(teraz);

    const dzien = (dzial.Grafik_dzialu?.Dni || []).find((d) => d.data === data);
    const dyzury = (dzien?.dyzury || []).map((dz) => ({
        idDyzuru: dz.id_dyzuru,
        start: dz.start_dyzuru,
        koniec: dz.koniec_dyzuru,
        wolontariusze: (dz.wolontariusze || []).map((id) => ({ id, nazwa: nazwaWolontariusza(stan, id) })),
        trwaTeraz: data === dzisiaj && minutaTeraz >= czasNaMinuty(dz.start_dyzuru) && minutaTeraz < czasNaMinuty(dz.koniec_dyzuru),
    }));

    return {
        dzial: { id: dzial.id, nazwa: dzial.nazwa, kolor: dzial.color },
        data,
        dostepneDni: (dzial.Grafik_dzialu?.Dni || []).map((d) => d.data).sort(),
        dyzury,
    };
}

/** Zwraca listę wszystkich działów (id, nazwa, kolor) — do wypełnienia selektora na stronie kadr. */
export function listaDzialow(stan: unknown): { id: string; nazwa: string; kolor?: string }[] {
    if (!czyStanPoprawny(stan)) return [];
    return stan.Działy.map((d) => ({ id: d.id, nazwa: d.nazwa, kolor: d.color }));
}

/** Zwraca posortowaną listę wszystkich unikalnych dat (YYYY-MM-DD) obecnych w grafiku, do selektora dnia. */
export function listaDostepnychDni(stan: unknown): string[] {
    if (!czyStanPoprawny(stan)) return [];
    const zbior = new Set<string>();
    for (const dzial of stan.Działy) {
        for (const dzien of dzial.Grafik_dzialu?.Dni || []) {
            if (dzien.data) zbior.add(dzien.data);
        }
    }
    return [...zbior].sort();
}

/** Zwraca rozpiski WSZYSTKICH działów na jeden wybrany dzień — do widoku "kolumn" (dział obok działu). */
export function tabliceNaDzien(stan: unknown, data: string, teraz: Date = new Date()) {
    if (!czyStanPoprawny(stan)) return [];
    return stan.Działy.map((dzial) => {
        const rozpiska = rozpiskaDzialu(stan, dzial.id, { data, teraz });
        return {
            dzialId: dzial.id,
            dzial: dzial.nazwa,
            kolor: dzial.color,
            dyzury: rozpiska?.dyzury ?? [],
        };
    });
}
