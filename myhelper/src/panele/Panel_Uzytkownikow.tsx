import { Box, Text, useInput } from 'ink';
import React, { useEffect, useState } from 'react';
import { Form, FormProps } from 'ink-form';
import type { ZalogowanyKontekst, Uzytkownik, Rola } from '../dane/typy.js';
import { ROLE_DO_WYBORU, NAZWY_ROL } from '../dane/typy.js';
import { odczytajUzytkownikow, dodajUzytkownika, usunUzytkownika } from '../dane/uzytkownicy.js';
import { hashujHaslo } from '../dane/haslo.js';

type Widok = 'lista' | 'dodaj';

export default function Panel_Uzytkownikow({
    kontekst,
    onBack,
}: {
    kontekst: ZalogowanyKontekst;
    onBack: () => void;
}) {
    const [widok, setWidok] = useState<Widok>('lista');
    const [uzytkownicy, setUzytkownicy] = useState<Uzytkownik[]>([]);
    const [zaznaczony, setZaznaczony] = useState(0);
    const [ladowanie, setLadowanie] = useState(true);
    const [info, setInfo] = useState<string | null>(null);

    async function odswiez() {
        setLadowanie(true);
        const lista = await odczytajUzytkownikow(kontekst.slug);
        setUzytkownicy(lista);
        setZaznaczony((z) => Math.min(z, Math.max(0, lista.length - 1)));
        setLadowanie(false);
    }

    useEffect(() => {
        void odswiez();
    }, []);

    useInput((input, key) => {
        if (widok !== 'lista') return;
        if (key.escape) {
            onBack();
            return;
        }
        if (key.upArrow) setZaznaczony((i) => Math.max(0, i - 1));
        if (key.downArrow) setZaznaczony((i) => Math.min(uzytkownicy.length - 1, i + 1));
        if (input === 'a' || input === 'A') {
            setInfo(null);
            setWidok('dodaj');
        }
        if ((input === 'd' || input === 'D') && uzytkownicy[zaznaczony]) {
            const login = uzytkownicy[zaznaczony].login;
            void (async () => {
                await usunUzytkownika(kontekst.slug, login);
                setInfo(`Usunięto konto: ${login}`);
                await odswiez();
            })();
        }
    });

    if (widok === 'dodaj') {
        return (
            <Formularz_Nowy_Uzytkownik
                kontekst={kontekst}
                onAnuluj={() => setWidok('lista')}
                onDodano={async (wiadomosc) => {
                    setInfo(wiadomosc);
                    setWidok('lista');
                    await odswiez();
                }}
            />
        );
    }

    return (
        <Box flexDirection="column" width={'100%'}>
            <Box borderStyle={'round'} borderColor={'white'} width={'100%'} flexDirection="column" padding={1}>
                <Text bold>Użytkownicy: {kontekst.nazwa}</Text>
                <Text> </Text>
                {ladowanie && <Text dimColor>Wczytywanie…</Text>}
                {!ladowanie && uzytkownicy.length === 0 && (
                    <Text dimColor>Brak dodatkowych kont. Konto root loguje się danymi podanymi przy tworzeniu konwentu.</Text>
                )}
                {!ladowanie &&
                    uzytkownicy.map((u, i) => (
                        <Text key={u.login} color={i === zaznaczony ? 'green' : undefined}>
                            {i === zaznaczony ? '-> ' : '   '}
                            {u.login}  [{NAZWY_ROL[u.rola]}]
                            {u.dzial ? `  dział: ${u.dzial}` : ''}
                        </Text>
                    ))}
                {info && <Text color="yellow">{info}</Text>}
                <Text> </Text>
                <Text dimColor>[A] = dodaj konto   [D] = usuń zaznaczone   [Esc] = powrót</Text>
            </Box>
        </Box>
    );
}

function Formularz_Nowy_Uzytkownik({
    kontekst,
    onAnuluj,
    onDodano,
}: {
    kontekst: ZalogowanyKontekst;
    onAnuluj: () => void;
    onDodano: (wiadomosc: string) => void;
}) {
    const [blad, setBlad] = useState<string | null>(null);

    useInput((input, key) => {
        if (key.escape) onAnuluj();
    });

    const form: FormProps['form'] = {
        title: 'Nowe konto',
        sections: [
            {
                title: 'Dane konta',
                fields: [
                    { type: 'string', name: 'login', label: 'Login', required: true },
                    { type: 'string', name: 'haslo', label: 'Hasło', mask: '#', required: true },
                    {
                        type: 'select',
                        name: 'rola',
                        label: 'Rola',
                        options: ROLE_DO_WYBORU.map((r) => ({ label: NAZWY_ROL[r], value: r })),
                        required: true,
                    },
                    {
                        type: 'string',
                        name: 'dzial',
                        label: 'Przypisany dział (opcjonalnie — dla kont kadr/programu)',
                        required: false,
                    },
                ],
            },
        ],
    };

    const handleSubmit = async (value: object) => {
        const { login, haslo, rola, dzial } = value as { login: string; haslo: string; rola: Rola; dzial?: string };
        setBlad(null);

        const Password_hash = await hashujHaslo(haslo);
        const wynik = await dodajUzytkownika(kontekst.slug, {
            login,
            Password_hash,
            rola,
            dzial: dzial ? dzial : undefined,
        });

        if (!wynik.ok) {
            setBlad(wynik.blad);
            return;
        }

        onDodano(`Dodano konto: ${login} (${NAZWY_ROL[rola]})`);
    };

    return (
        <Box flexDirection="column" width={'100%'}>
            {blad && <Text color="red">{blad}</Text>}
            <Form form={form} onSubmit={handleSubmit}></Form>
            <Text dimColor>(Esc = anuluj)</Text>
        </Box>
    );
}
