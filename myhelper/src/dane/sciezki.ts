// scieszki -- centralne miejsce ze wszystkimi scieszkami plikow/folderow aplikacji
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { TypDanych } from './typy.js';

const __plik = fileURLToPath(import.meta.url);
const __folder_modulu = path.dirname(__plik); // .../src/dane

// katalog główny projektu (dwa poziomy wyżej niż src/dane)
export const __Folder_Aplikacji = path.join(__folder_modulu, '..', '..');

//#region Foldery globalne
export const __Folder_Plikow = path.join(__Folder_Aplikacji, 'Pliki'); // ważne pliki aplikacji
export const __Folder_Konwentowy = path.join(__Folder_Aplikacji, 'Konwenty'); // pliki wszystkich konwentów
export const __Folder_Stron_Domyslnych = path.join(__Folder_Aplikacji, 'web', 'default'); // domyślne szablony stron
//#endregion

//#region Pliki globalne
export const _Eula_file_path = path.join(__Folder_Plikow, 'Eula.txt');
export const _Stats_file_path = path.join(__Folder_Plikow, 'Stats.json');
export const _Spis_file_path = path.join(__Folder_Plikow, 'Spis_Konwentow.json');
//#endregion

//#region Scieszki per-konwent
export function folderKonwentu(slug: string): string {
    return path.join(__Folder_Konwentowy, slug);
}
export function plikKonfiguracji(slug: string): string {
    return path.join(folderKonwentu(slug), 'config.json');
}
export function plikUzytkownikow(slug: string): string {
    return path.join(folderKonwentu(slug), 'Uzytkownicy.json');
}
export function folderDanych(slug: string): string {
    return path.join(folderKonwentu(slug), 'Dane');
}
export function plikDanych(slug: string, typ: TypDanych): string {
    return path.join(folderDanych(slug), `${typ}.json`);
}
export function folderStron(slug: string): string {
    return path.join(folderKonwentu(slug), 'WWW');
}
export function folderStronyRoli(slug: string, rola: string): string {
    return path.join(folderStron(slug), rola);
}
//#endregion

export const ROLE_STRON = ['login', 'admin', 'kadry', 'program', 'magazyn', 'sklepik'] as const;
