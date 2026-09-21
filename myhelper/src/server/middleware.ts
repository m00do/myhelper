import type { Request, Response, NextFunction } from 'express';
import type { RolaZalogowanego } from '../dane/typy.js';
import { pobierzLocals } from './kontekst.js';

/** Middleware wymagający ważnego tokenu sesji z jedną z podanych ról (nagłówek `Authorization: Bearer <token>`). */
export function wymagajRoli(...dozwolone: RolaZalogowanego[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        const naglowek = req.headers.authorization || '';
        const token = naglowek.startsWith('Bearer ') ? naglowek.slice(7) : undefined;
        const { sesje } = pobierzLocals(req);
        const kontekst = sesje.pobierz(token);

        if (!kontekst) {
            res.status(401).json({ blad: 'Wymagane zalogowanie.' });
            return;
        }
        // 'root' ma zawsze dostęp, niezależnie od listy dozwolonych ról
        if (kontekst.rola !== 'root' && !dozwolone.includes(kontekst.rola)) {
            res.status(403).json({ blad: 'Brak uprawnień do tego panelu.' });
            return;
        }

        (req as Request & { uzytkownik?: typeof kontekst }).uzytkownik = kontekst;
        next();
    };
}
