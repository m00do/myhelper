import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import {
    folderKonwentu,
    plikKonfiguracji,
    plikUzytkownikow,
    folderDanych,
    folderStron,
    ROLE_STRON,
} from './sciezki.js';
import { dodajDoSpisu } from './spis.js';
import type { Konwent } from './typy.js';

export function generujSlug(tekst: string): string {
    return tekst
        .replace(/ł/g, 'l')
        .replace(/Ł/g, 'L')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_-]/g, '');
}

export async function utworzStrukturKonwentu(slug: string): Promise<void> {
    await mkdir(folderKonwentu(slug), { recursive: true });
    await mkdir(folderDanych(slug), { recursive: true });
    await mkdir(folderStron(slug), { recursive: true });
    for (const rola of ROLE_STRON) {
        await mkdir(path.join(folderStron(slug), rola), { recursive: true });
    }
    if (!existsSync(plikUzytkownikow(slug))) {
        await writeFile(plikUzytkownikow(slug), '[]', 'utf-8');
    }
}

export async function czyKonwentIstnieje(slug: string): Promise<boolean> {
    return existsSync(plikKonfiguracji(slug));
}

export async function zapiszKonwent(konwent: Konwent): Promise<void> {
    await utworzStrukturKonwentu(konwent.slug);
    await writeFile(plikKonfiguracji(konwent.slug), JSON.stringify(konwent, null, 4), 'utf-8');
    await dodajDoSpisu(konwent.nazwa, konwent.slug);
}

export async function odczytajKonwent(slug: string): Promise<Konwent | null> {
    try {
        const zawartosc = await readFile(plikKonfiguracji(slug), 'utf-8');
        return JSON.parse(zawartosc) as Konwent;
    } catch (blad) {
        console.error('nie udało się odczytać konfiguracji konwentu', blad);
        return null;
    }
}
