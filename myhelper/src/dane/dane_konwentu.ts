// odczyt/zapis plikow Dane/{program,kadry,magazyn,sklepik}.json dla danego konwentu.
// Ten sam moduł jest używany zarówno przez panel TUI, jak i przez serwer WWW,
// dzięki czemu format plików jest zawsze spójny w obu miejscach.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import { plikDanych, folderDanych } from './sciezki.js';
import type { TypDanych } from './typy.js';

export async function odczytajDane<T = unknown>(slug: string, typ: TypDanych): Promise<T | null> {
    try {
        const zawartosc = await readFile(plikDanych(slug, typ), 'utf-8');
        return JSON.parse(zawartosc) as T;
    } catch {
        return null;
    }
}

export async function zapiszDane(slug: string, typ: TypDanych, dane: unknown): Promise<void> {
    await mkdir(folderDanych(slug), { recursive: true });
    await writeFile(plikDanych(slug, typ), JSON.stringify(dane, null, 2), 'utf-8');
}

export function czyDaneWgrane(slug: string, typ: TypDanych): boolean {
    return existsSync(plikDanych(slug, typ));
}

export function dataOstatniejAktualizacji(slug: string, typ: TypDanych): Date | null {
    try {
        return statSync(plikDanych(slug, typ)).mtime;
    } catch {
        return null;
    }
}
