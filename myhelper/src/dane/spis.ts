import { readFile, writeFile } from 'node:fs/promises';
import { _Spis_file_path } from './sciezki.js';
import type { WpisSpisu } from './typy.js';

export async function inicjalizujSpisKonwentow(): Promise<void> {
    try {
        await readFile(_Spis_file_path, 'utf-8');
    } catch {
        await zapiszSpisKonwentow([]);
    }
}

export async function odczytajSpisKonwentow(): Promise<WpisSpisu[]> {
    try {
        const zawartosc = await readFile(_Spis_file_path, 'utf-8');
        return JSON.parse(zawartosc) as WpisSpisu[];
    } catch (blad) {
        console.error('nie udało się odczytać pliku Spis_Konwentow.json', blad);
        return [];
    }
}

export async function zapiszSpisKonwentow(spis: WpisSpisu[]): Promise<void> {
    try {
        await writeFile(_Spis_file_path, JSON.stringify(spis, null, 4), 'utf-8');
    } catch (blad) {
        console.error('nie udało się zapisać pliku Spis_Konwentow.json', blad);
    }
}

export async function dodajDoSpisu(nazwa: string, slug: string): Promise<void> {
    const spis = await odczytajSpisKonwentow();
    if (spis.some((w) => w.slug === slug)) return;
    spis.push({ slug, nazwa });
    await zapiszSpisKonwentow(spis);
}
