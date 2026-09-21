// obsługa "wgrywania własnych stron" — administrator/root konwentu wskazuje lokalną
// ścieżkę (plik .html lub cały folder strony), a my kopiujemy ją do
// Konwenty/<slug>/WWW/<rola>/, gdzie serwer WWW automatycznie zacznie ją serwować
// zamiast domyślnego szablonu (patrz src/server/createApp.ts).
import { cp, stat, readdir, rm, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { folderStronyRoli, ROLE_STRON } from './sciezki.js';

export type RolaStrony = (typeof ROLE_STRON)[number];

export function poprawnaRolaStrony(rola: string): rola is RolaStrony {
    return (ROLE_STRON as readonly string[]).includes(rola);
}

export async function wgrajStrone(
    slug: string,
    rola: RolaStrony,
    sciezkaZrodlowa: string
): Promise<{ ok: true } | { ok: false; blad: string }> {
    const oczyszczona = sciezkaZrodlowa.trim().replace(/^"|"$/g, '');
    if (!oczyszczona) return { ok: false, blad: 'Podaj ścieżkę do pliku .html lub folderu strony.' };
    if (!existsSync(oczyszczona)) return { ok: false, blad: `Nie znaleziono ścieżki: ${oczyszczona}` };

    const docelowy = folderStronyRoli(slug, rola);

    try {
        const info = await stat(oczyszczona);
        await mkdir(docelowy, { recursive: true });

        if (info.isDirectory()) {
            // pełny folder strony (html/css/js/obrazki) — kopiujemy całość
            await rm(docelowy, { recursive: true, force: true });
            await cp(oczyszczona, docelowy, { recursive: true });
        } else {
            // pojedynczy plik — zawsze zapisywany jako index.html tej roli
            await cp(oczyszczona, path.join(docelowy, 'index.html'));
        }
        return { ok: true };
    } catch (e) {
        return { ok: false, blad: e instanceof Error ? e.message : String(e) };
    }
}

export async function czyStronaWlasna(slug: string, rola: RolaStrony): Promise<boolean> {
    try {
        const zawartosc = await readdir(folderStronyRoli(slug, rola));
        return zawartosc.length > 0;
    } catch {
        return false;
    }
}

/** Usuwa własną wersję strony danej roli — serwer wróci do domyślnego szablonu. */
export async function przywrocDomyslnaStrone(slug: string, rola: RolaStrony): Promise<void> {
    await rm(folderStronyRoli(slug, rola), { recursive: true, force: true });
    await mkdir(folderStronyRoli(slug, rola), { recursive: true });
}
