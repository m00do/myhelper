import type { Request } from 'express';
import type { MagazynSesji } from './sesje.js';
import type { ZalogowanyKontekst } from '../dane/typy.js';

export type LocalsAplikacji = {
    slug: string;
    nazwaKonwentu: string;
    sesje: MagazynSesji;
};

/** Zwraca dane konwentu (slug, nazwę) przypięte do instancji Express dla tego serwera. */
export function pobierzLocals(req: Request): LocalsAplikacji {
    return req.app.locals as LocalsAplikacji;
}

/** Zwraca zalogowanego użytkownika ustawionego przez middleware `wymagajRoli`. */
export function pobierzZalogowanego(req: Request): ZalogowanyKontekst | undefined {
    return (req as Request & { uzytkownik?: ZalogowanyKontekst }).uzytkownik;
}
