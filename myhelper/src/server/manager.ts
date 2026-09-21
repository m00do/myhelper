// zarządca uruchomionych serwerów: jeden proces Node może obsługiwać publikację
// wielu konwentów jednocześnie, każdy na osobnym porcie (i opcjonalnie własnym slug.local).
import type { Server } from 'node:http';
import os from 'node:os';
import { utworzAplikacjeKonwentu } from './createApp.js';
import { znajdzWolnyPort } from './port.js';
import { ogłośDNS, zatrzymajDNS } from './mdns.js';
import type { StatusPublikacji } from '../dane/typy.js';

type WpisSerwera = { serwer: Server; port: number; dnsAktywny: boolean };

const uruchomione = new Map<string, WpisSerwera>();
const PORT_STARTOWY = 3100;

export function pobierzLokalneIP(): string {
    const interfejsy = os.networkInterfaces();
    for (const nazwa of Object.keys(interfejsy)) {
        for (const iface of interfejsy[nazwa] ?? []) {
            if (iface.family === 'IPv4' && !iface.internal) return iface.address;
        }
    }
    return '127.0.0.1';
}

function zbudujUrl(slug: string, port: number, dns: boolean): string {
    return dns ? `http://${slug}.local:${port}` : `http://${pobierzLokalneIP()}:${port}`;
}

/** Uruchamia serwer WWW danego konwentu (jeśli już działa — zwraca jego bieżący adres). */
export async function uruchomKonwent(slug: string, nazwaKonwentu: string, lanDnsEnable: boolean): Promise<StatusPublikacji> {
    const istniejacy = uruchomione.get(slug);
    if (istniejacy) {
        return { dziala: true, port: istniejacy.port, dns: istniejacy.dnsAktywny, url: zbudujUrl(slug, istniejacy.port, istniejacy.dnsAktywny) };
    }

    const port = await znajdzWolnyPort(PORT_STARTOWY);
    const app = utworzAplikacjeKonwentu(slug, nazwaKonwentu);

    const serwer = await new Promise<Server>((resolve, reject) => {
        const s = app.listen(port, () => resolve(s));
        s.on('error', reject);
    });

    let dnsAktywny = false;
    if (lanDnsEnable) {
        try {
            ogłośDNS(slug, port);
            dnsAktywny = true;
        } catch (blad) {
            console.error(`Nie udało się uruchomić rozgłaszania DNS (${slug}.local) — dostępne będzie tylko IP.`, blad);
        }
    }

    uruchomione.set(slug, { serwer, port, dnsAktywny });
    return { dziala: true, port, dns: dnsAktywny, url: zbudujUrl(slug, port, dnsAktywny) };
}

/** Zatrzymuje serwer WWW danego konwentu, jeśli działa. */
export async function zatrzymajKonwent(slug: string): Promise<void> {
    const wpis = uruchomione.get(slug);
    if (!wpis) return;
    await new Promise<void>((resolve, reject) => {
        wpis.serwer.close((blad) => (blad ? reject(blad) : resolve()));
    });
    if (wpis.dnsAktywny) zatrzymajDNS(slug);
    uruchomione.delete(slug);
}

export function statusKonwentu(slug: string): StatusPublikacji {
    const wpis = uruchomione.get(slug);
    if (!wpis) return { dziala: false };
    return { dziala: true, port: wpis.port, dns: wpis.dnsAktywny, url: zbudujUrl(slug, wpis.port, wpis.dnsAktywny) };
}

export function listaUruchomionych(): string[] {
    return [...uruchomione.keys()];
}
