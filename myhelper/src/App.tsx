import { Text, render, Box, useStdout, useApp, useInput } from 'ink';
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ScrollView, ScrollViewRef } from 'ink-scroll-view';
import Gradient from 'ink-gradient';
import BigText from 'ink-big-text';
import fs from 'fs';
import { ConfirmInput } from '@inkjs/ui';
import { Form, FormProps } from 'ink-form';

import { _Eula_file_path } from './dane/sciezki.js';
import { inicjalizujFoldery, odczytajStatus, zapiszStatus } from './dane/status.js';
import { inicjalizujSpisKonwentow, odczytajSpisKonwentow } from './dane/spis.js';
import { zapiszKonwent, odczytajKonwent, generujSlug } from './dane/konwent.js';
import { znajdzUzytkownika } from './dane/uzytkownicy.js';
import { hashujHaslo, sprawdzHaslo } from './dane/haslo.js';
import type { Konwent, WpisSpisu, ZalogowanyKontekst } from './dane/typy.js';
import Panel_Konwentu from './panele/Panel_Konwentu.js';

//#region typy paneli
type Panele = 'logo' | 'Eula' | 'Main_Menu' | 'Panel_Konwentu';
type Opcje_Menu = 'glowna' | 'Nowy' | 'Wczytaj' | 'Wyjscie';
//#endregion

// panele

const App_Display = () => {
    const [panele, setPanel] = useState<Panele>('logo');
    const [kontekst, setKontekst] = useState<ZalogowanyKontekst | null>(null);

    const onZalogowano = (nowyKontekst: ZalogowanyKontekst) => {
        setKontekst(nowyKontekst);
        setPanel('Panel_Konwentu');
    };

    const onWyloguj = () => {
        setKontekst(null);
        setPanel('Main_Menu');
    };

    return (
        <Box flexDirection="column" padding={1}>
            {panele === 'logo' && <Logo_Panel Next_Panel={setPanel} />}
            {panele === 'Eula' && <Eula_Panel Next_Panel={setPanel} />}
            {panele === 'Main_Menu' && <Menu onZalogowano={onZalogowano} />}
            {panele === 'Panel_Konwentu' && kontekst && (
                <Panel_Konwentu kontekst={kontekst} onWyloguj={onWyloguj} />
            )}
        </Box>
    );
};

//#region Main_Menu

const Main_Menu = ({ onSelect }: { onSelect: (_opcje_Menu: Opcje_Menu) => void }) => {
    const [Opcje_Menu, setOpcje] = useState(0);
    const { exit } = useApp();
    const items: { label: string; _opcja: Opcje_Menu }[] = [
        { label: 'Nowy Konwent', _opcja: 'Nowy' },
        { label: 'Wczytaj Konwent', _opcja: 'Wczytaj' },
        { label: 'Wyłącz aplikacje', _opcja: 'Wyjscie' },
    ];

    useInput((input, key) => {
        if (key.upArrow) setOpcje((i) => Math.max(0, i - 1));
        if (key.downArrow) setOpcje((i) => Math.min(items.length - 1, i + 1));
        if (key.return) {
            if (items[Opcje_Menu].label === 'Wyłącz aplikacje') {
                setTimeout(() => exit(), 1000);
            } else {
                onSelect(items[Opcje_Menu]._opcja);
            }
        }
    });

    return (
        <Box flexDirection="column" width={'100%'}>
            <Box borderStyle={'round'} borderColor={'white'} width={'100%'} justifyContent="center">
                <Gradient name="morning">
                    <BigText text="Menu Glowne" />
                </Gradient>
            </Box>
            <Box borderStyle={'round'} borderColor={'white'} width={'100%'} justifyContent="center" flexDirection="column">
                {items.map((item, i) => (
                    <Box key={item._opcja} justifyContent="center" flexDirection="row">
                        <Text color={i === Opcje_Menu ? 'green' : undefined}>
                            {i === Opcje_Menu ? '-> ' : '   '}
                            {item.label}
                        </Text>
                    </Box>
                ))}
            </Box>
        </Box>
    );
};
//#endregion

//#region Wczytaj_Konwent
const Wczytaj_Konwent_Panel = ({
    onBack,
    onZalogowano,
}: {
    onBack: () => void;
    onZalogowano: (kontekst: ZalogowanyKontekst) => void;
}) => {
    const [konwenty, setKonwenty] = useState<WpisSpisu[]>([]);
    const [ladowanie, setLadowanie] = useState(true);
    const [blad, setBlad] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            const spis = await odczytajSpisKonwentow();
            setKonwenty(spis);
            setLadowanie(false);
        })();
    }, []);

    useInput((input, key) => {
        if (key.escape) onBack();
    });

    if (ladowanie) {
        return <Text>Wczytywanie listy konwentów lokalnych…</Text>;
    }

    if (konwenty.length === 0) {
        return (
            <Box flexDirection="column">
                <Text color="yellow">Nie znaleziono żadnego zapisanego konwentu.</Text>
                <Text dimColor>Utwórz najpierw nowy konwent z menu głównego. (Esc = powrót)</Text>
            </Box>
        );
    }

    const form: FormProps['form'] = {
        title: 'Wczytaj Konwent',
        sections: [
            {
                title: 'Logowanie',
                fields: [
                    {
                        type: 'select',
                        name: 'slug',
                        label: 'Konwent',
                        options: konwenty.map((k) => ({ label: k.nazwa, value: k.slug })),
                        required: true,
                    },
                    {
                        type: 'string',
                        name: 'login',
                        label: 'Login',
                        required: true,
                    },
                    {
                        type: 'string',
                        name: 'haslo',
                        label: 'Hasło',
                        mask: '#',
                        required: true,
                    },
                ],
            },
        ],
    };

    const handleSubmit = async (value: object) => {
        const { slug, login, haslo } = value as { slug: string; login: string; haslo: string };
        setBlad(null);

        const konwent = await odczytajKonwent(slug);
        if (!konwent) {
            setBlad('Nie udało się odczytać konfiguracji tego konwentu (uszkodzony plik?).');
            return;
        }

        // konto root
        if (login === konwent.Login_root) {
            const ok = await sprawdzHaslo(haslo, konwent.Password_root);
            if (!ok) {
                setBlad('Nieprawidłowy login lub hasło.');
                return;
            }
            onZalogowano({ slug, nazwa: konwent.nazwa, login, rola: 'root' });
            return;
        }

        // konta ról (admin/program/kadry/magazyn/sklepik)
        const uzytkownik = await znajdzUzytkownika(slug, login);
        if (!uzytkownik || !(await sprawdzHaslo(haslo, uzytkownik.Password_hash))) {
            setBlad('Nieprawidłowy login lub hasło.');
            return;
        }

        onZalogowano({
            slug,
            nazwa: konwent.nazwa,
            login: uzytkownik.login,
            rola: uzytkownik.rola,
            dzial: uzytkownik.dzial,
        });
    };

    return (
        <Box flexDirection="column" width={'100%'}>
            {blad && <Text color="red">{blad}</Text>}
            <Form form={form} onSubmit={handleSubmit}></Form>
            <Text dimColor>(Esc = powrót do menu głównego)</Text>
        </Box>
    );
};
//#endregion

//#region Nowy_Konwent
const Nowy_Konwent_Panel = ({
    onBack,
    onUtworzono,
}: {
    onBack: () => void;
    onUtworzono: (kontekst: ZalogowanyKontekst) => void;
}) => {
    const [blad, setBlad] = useState<string | null>(null);

    useInput((input, key) => {
        if (key.escape) onBack();
    });

    const form: FormProps['form'] = {
        title: 'Nowy Konwent',
        sections: [
            {
                title: 'Dane konwentu/konto root',
                fields: [
                    {
                        type: 'string',
                        name: 'nazwa',
                        label: 'nazwa_konwentu',
                        required: true,
                    },
                    {
                        type: 'string',
                        name: 'Login_root',
                        label: 'login dla użytkownika root',
                        required: true,
                    },
                    {
                        type: 'string',
                        name: 'Password_root',
                        label: 'Hasło dla użytkownika root',
                        mask: '#',
                        required: true,
                    },
                ],
            },
            {
                title: 'Uslugi MyHelper',
                fields: [
                    { type: 'boolean', name: 'LAN_DNS_enable', label: 'DNS w sieci lokalnej:', required: true },
                    { type: 'boolean', name: 'KADRY', label: 'Panel kadr:', required: true },
                    { type: 'boolean', name: 'PROGRAM', label: 'Panel programowy:', required: true },
                    { type: 'boolean', name: 'MAGAZYN', label: 'Panel magazynowy:', required: true },
                    { type: 'boolean', name: 'SKLEPIK', label: 'Panel Sklepikowy:', required: true },
                ],
            },
        ],
    };

    const handleSubmit = async (value: object) => {
        const { nazwa, Login_root, Password_root, LAN_DNS_enable, KADRY, PROGRAM, MAGAZYN, SKLEPIK } = value as {
            nazwa: string;
            Login_root: string;
            Password_root: string;
            LAN_DNS_enable: boolean;
            KADRY: boolean;
            PROGRAM: boolean;
            MAGAZYN: boolean;
            SKLEPIK: boolean;
        };

        const slug = generujSlug(nazwa);
        if (!slug) {
            setBlad('Nazwa konwentu musi zawierać przynajmniej jeden znak alfanumeryczny.');
            return;
        }

        const istniejacy = await odczytajKonwent(slug);
        if (istniejacy) {
            setBlad(`Konwent o adresie "${slug}" już istnieje — wybierz inną nazwę.`);
            return;
        }

        const hashedPassword = await hashujHaslo(Password_root);

        const nowyKonwent: Konwent = {
            nazwa,
            Login_root,
            Password_root: hashedPassword,
            LAN_DNS_enable,
            KADRY,
            PROGRAM,
            MAGAZYN,
            SKLEPIK,
            slug,
        };

        await zapiszKonwent(nowyKonwent);

        onUtworzono({ slug, nazwa, login: Login_root, rola: 'root' });
    };

    return (
        <Box flexDirection="column" width={'100%'}>
            {blad && <Text color="red">{blad}</Text>}
            <Form form={form} onSubmit={handleSubmit}></Form>
            <Text dimColor>(Esc = powrót do menu głównego)</Text>
        </Box>
    );
};
//#endregion

//#region Menu
const Menu = ({ onZalogowano }: { onZalogowano: (kontekst: ZalogowanyKontekst) => void }) => {
    const [Opcje_Menu, setMenu] = useState<Opcje_Menu>('glowna');
    const onBack = () => setMenu('glowna');
    return (
        <Box>
            {Opcje_Menu === 'glowna' && <Main_Menu onSelect={setMenu} />}
            {Opcje_Menu === 'Nowy' && <Nowy_Konwent_Panel onBack={onBack} onUtworzono={onZalogowano} />}
            {Opcje_Menu === 'Wczytaj' && <Wczytaj_Konwent_Panel onBack={onBack} onZalogowano={onZalogowano} />}
        </Box>
    );
};
//#endregion

//#region Logo
const Logo_Panel = ({ Next_Panel }: { Next_Panel: (panele: Panele) => void }) => {
    useEffect(() => {
        const timer = setTimeout(async () => {
            await inicjalizujFoldery();
            await inicjalizujSpisKonwentow();
            const stats = await odczytajStatus();
            Next_Panel(stats.Eula_acepted ? 'Main_Menu' : 'Eula');
        }, 2000);
        return () => clearTimeout(timer);
    }, []);

    return (
        <Box borderStyle={'round'} borderColor={'white'} width={'100%'} justifyContent="center">
            <Gradient name="morning">
                <BigText text="MyHelper" />
            </Gradient>
        </Box>
    );
};
//#endregion

//#region Eula
const Eula_Panel = ({ Next_Panel }: { Next_Panel: (panele: Panele) => void }) => {
    const scrollRef = useRef<ScrollViewRef>(null);
    const { stdout } = useStdout();
    const { exit } = useApp();

    const [hasRechedEnd, setHasRechedEnd] = useState(false);
    const [result, setResult] = useState<'zakceptowane' | 'odrzucone' | null>(null);
    const [contentHeight, setConcentHeight] = useState<number | null>(null);
    const [viewportHeight, setViewportHeight] = useState<number | null>(null);

    const lines: string[] = useMemo(() => {
        try {
            const zawartosc_euli = fs.readFileSync(_Eula_file_path, 'utf-8');
            return zawartosc_euli.split('\n');
        } catch (err) {
            return [`Nie udało się wczytać pliku: ${_Eula_file_path}`, String(err)];
        }
    }, []);

    useEffect(() => {
        const hendleResize = () => scrollRef.current?.remeasure();
        stdout?.on('resize', hendleResize);
        return () => {
            stdout?.off('resize', hendleResize);
        };
    }, [stdout]);

    useEffect(() => {
        if (contentHeight !== null && viewportHeight !== null && contentHeight <= viewportHeight) {
            setHasRechedEnd(true);
        }
    }, [contentHeight, viewportHeight]);

    const handleScroll = (offset: number) => {
        const bottomOffset = scrollRef.current?.getBottomOffset() ?? 0;
        if (offset >= bottomOffset) setHasRechedEnd(true);
    };

    useInput(
        (input, key) => {
            if (key.upArrow) scrollRef.current?.scrollBy(-1);
            if (key.downArrow) scrollRef.current?.scrollBy(1);
            if (key.pageUp) {
                const height = scrollRef.current?.getViewportHeight() || 1;
                scrollRef.current?.scrollBy(-height);
            }
            if (key.pageDown) {
                const height = scrollRef.current?.getViewportHeight() || 1;
                scrollRef.current?.scrollBy(height);
            }
            if (input === 'g') scrollRef.current?.scrollToTop();
            if (input === 'G') scrollRef.current?.scrollToBottom();
        },
        {
            isActive: !hasRechedEnd,
        }
    );

    const handleConfirm = async () => {
        setResult('zakceptowane');

        const aktualnyStatus = await odczytajStatus();
        await zapiszStatus({ ...aktualnyStatus, Eula_acepted: true });

        setTimeout(() => Next_Panel('Main_Menu'), 1000);
    };

    const handleDecline = () => {
        setResult('odrzucone');
        setTimeout(() => exit(), 1000);
    };

    return (
        <Box flexDirection="column">
            <Box height={12} width={'100%'} borderStyle={'round'} borderColor={hasRechedEnd ? 'yellow' : 'white'} flexDirection="column">
                <ScrollView ref={scrollRef} onScroll={handleScroll} onContentHeightChange={setConcentHeight} onViewportSizeChange={(layout) => setViewportHeight(layout.height)}>
                    {lines.map((line: string, i: number) => (
                        <Text key={i}>{line || ''}</Text>
                    ))}
                </ScrollView>
            </Box>

            {!hasRechedEnd && <Text dimColor>(↑/↓ = przewijanie, PgUP/PgDn = strona, G = przejdź na koniec, g = powrót)</Text>}

            {hasRechedEnd && result === null && (
                <Box marginTop={1}>
                    <Text>Czy akceptujesz warunki EULA? </Text>
                    <ConfirmInput onConfirm={handleConfirm} onCancel={handleDecline} />
                </Box>
            )}

            {result === 'zakceptowane' && <Text color={'green'}>Zaakceptowano warunki, przechodzimy do usługi</Text>}

            {result === 'odrzucone' && <Text color={'red'}>Odrzucono warunki. Zamykanie aplikacji</Text>}
        </Box>
    );
};
//#endregion

render(<App_Display />);
