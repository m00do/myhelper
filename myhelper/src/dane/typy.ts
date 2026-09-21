// wspólne typy danych używane przez panel TUI oraz serwer WWW

export type Rola = 'admin' | 'program' | 'kadry' | 'magazyn' | 'sklepik';
// 'root' jest traktowany jako osobna, nadrzędna rola (konto właściciela konwentu)
export type RolaZalogowanego = Rola | 'root';

export type TypDanych = 'program' | 'kadry' | 'magazyn' | 'sklepik';
export const TYPY_DANYCH: TypDanych[] = ['program', 'kadry', 'magazyn', 'sklepik'];

export const NAZWY_ROL: Record<Rola, string> = {
    admin: 'Administrator',
    program: 'Program',
    kadry: 'Kadry',
    magazyn: 'Magazyn',
    sklepik: 'Sklepik',
};

export const ROLE_DO_WYBORU: Rola[] = ['admin', 'program', 'kadry', 'magazyn', 'sklepik'];

export type Konwent = {
    nazwa: string;
    Login_root: string;
    Password_root: string; // hash bcrypt
    LAN_DNS_enable: boolean;
    KADRY: boolean;
    PROGRAM: boolean;
    MAGAZYN: boolean;
    SKLEPIK: boolean;
    slug: string;
};

export type WpisSpisu = {
    slug: string;
    nazwa: string;
};

export type Stats = {
    Eula_acepted: boolean;
};

export type Uzytkownik = {
    login: string;
    Password_hash: string;
    rola: Rola;
    dzial?: string; // opcjonalne przypisanie do działu (np. dla kont kadr/programu)
};

// dane wpisane do sesji po zalogowaniu (na TUI i na serwerze WWW)
export type ZalogowanyKontekst = {
    slug: string;
    nazwa: string;
    login: string;
    rola: RolaZalogowanego;
    dzial?: string;
};

export type StatusPublikacji = {
    dziala: boolean;
    port?: number;
    url?: string;
    dns?: boolean;
};
