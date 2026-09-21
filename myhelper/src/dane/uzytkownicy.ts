import { readFile, writeFile } from 'node:fs/promises';
import { plikUzytkownikow } from './sciezki.js';
import type { Uzytkownik } from './typy.js';

export async function odczytajUzytkownikow(slug: string): Promise<Uzytkownik[]> {
    try {
        const zawartosc = await readFile(plikUzytkownikow(slug), 'utf-8');
        return JSON.parse(zawartosc) as Uzytkownik[];
    } catch {
        return [];
    }
}

export async function zapiszUzytkownikow(slug: string, uzytkownicy: Uzytkownik[]): Promise<void> {
    await writeFile(plikUzytkownikow(slug), JSON.stringify(uzytkownicy, null, 4), 'utf-8');
}

export async function znajdzUzytkownika(slug: string, login: string): Promise<Uzytkownik | null> {
    const lista = await odczytajUzytkownikow(slug);
    return lista.find((u) => u.login.toLowerCase() === login.toLowerCase()) ?? null;
}

export async function dodajUzytkownika(
    slug: string,
    uzytkownik: Uzytkownik
): Promise<{ ok: true } | { ok: false; blad: string }> {
    const lista = await odczytajUzytkownikow(slug);
    if (lista.some((u) => u.login.toLowerCase() === uzytkownik.login.toLowerCase())) {
        return { ok: false, blad: 'Użytkownik o takim loginie już istnieje.' };
    }
    lista.push(uzytkownik);
    await zapiszUzytkownikow(slug, lista);
    return { ok: true };
}

export async function usunUzytkownika(slug: string, login: string): Promise<void> {
    const lista = await odczytajUzytkownikow(slug);
    await zapiszUzytkownikow(
        slug,
        lista.filter((u) => u.login.toLowerCase() !== login.toLowerCase())
    );
}
