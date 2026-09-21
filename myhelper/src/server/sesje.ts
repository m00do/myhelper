import crypto from 'node:crypto';
import type { ZalogowanyKontekst } from '../dane/typy.js';

export type MagazynSesji = {
    utworz: (kontekst: ZalogowanyKontekst) => string;
    pobierz: (token: string | undefined) => ZalogowanyKontekst | null;
    usun: (token: string) => void;
};

/** Prosty magazyn tokenów sesji w pamięci — jedna instancja na jeden uruchomiony serwer konwentu. */
export function utworzMagazynSesji(): MagazynSesji {
    const sesje = new Map<string, ZalogowanyKontekst>();

    return {
        utworz(kontekst) {
            const token = crypto.randomBytes(24).toString('hex');
            sesje.set(token, kontekst);
            return token;
        },
        pobierz(token) {
            if (!token) return null;
            return sesje.get(token) ?? null;
        },
        usun(token) {
            sesje.delete(token);
        },
    };
}
