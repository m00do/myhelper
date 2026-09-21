import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync, writeFileSync } from 'node:fs';
import { _Eula_file_path, _Stats_file_path, __Folder_Plikow, __Folder_Konwentowy } from './sciezki.js';
import type { Stats } from './typy.js';

const DOMYSLNA_EULA = `WARUNKI UŻYTKOWANIA - MyHelper
================================

Aplikacja MyHelper służy do zarządzania konwentami: tworzenia kont
poszczególnych paneli (administrator, program, kadry, magazyn, sklepik)
oraz publikowania stron internetowych tych paneli w sieci lokalnej.

Korzystając z aplikacji akceptujesz, że:
1. Dane logowania (hasła) przechowywane są lokalnie w formie hashowanej.
2. Publikacja stron w sieci lokalnej udostępnia je wszystkim urządzeniom
   podłączonym do tej samej sieci.
3. Autorzy aplikacji nie ponoszą odpowiedzialności za utratę danych.

Przewiń w dół, aby zaakceptować lub odrzucić warunki.
`;

export async function inicjalizujFoldery(): Promise<void> {
    try {
        await mkdir(__Folder_Plikow, { recursive: true });
        await mkdir(__Folder_Konwentowy, { recursive: true });
        if (!existsSync(_Eula_file_path)) {
            writeFileSync(_Eula_file_path, DOMYSLNA_EULA, 'utf-8');
        }
    } catch (blad) {
        console.error('nie udało się utworzyć folderów aplikacji', blad);
    }
}

export async function odczytajStatus(): Promise<Stats> {
    try {
        const zawartosc = await readFile(_Stats_file_path, 'utf-8');
        return JSON.parse(zawartosc) as Stats;
    } catch {
        return { Eula_acepted: false };
    }
}

export async function zapiszStatus(stats: Stats): Promise<void> {
    try {
        await writeFile(_Stats_file_path, JSON.stringify(stats, null, 4), 'utf-8');
    } catch (blad) {
        console.error('nie udało się zapisać pliku Stats.json', blad);
    }
}
