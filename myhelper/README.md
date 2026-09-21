# MyHelper — panel zarządzania konwentami

Ten projekt to przeróbka Twojej aplikacji terminalowej (Ink/React) o:

1. **Panel obsługi konwentu** w TUI — wchodzisz w niego od razu po utworzeniu nowego konwentu
   albo po zalogowaniu się do istniejącego. Ma trzy sekcje:
   - **Publikacja** — uruchamia/zatrzymuje serwer WWW danego konwentu i pokazuje jego adres.
   - **Użytkownicy** — dodawanie/usuwanie kont dla ról: `admin`, `program`, `kadry`, `magazyn`, `sklepik`.
   - **Wgraj własne strony** — podmiana domyślnego szablonu danej roli na własny plik/folder HTML.
2. **Serwer WWW**, osobny dla każdego konwentu, trzymający pliki każdego konwentu w osobnym
   folderze (`Konwenty/<slug>/`), z logowaniem, API i (opcjonalnie) rozgłaszaniem `slug.local`
   przez mDNS w sieci lokalnej — a jeśli DNS jest wyłączony (albo się nie uda), publikacja pokazuje
   po prostu adres IP.
3. **6 stron** dostępnych po zalogowaniu: logowanie, panel admina (upload/download plików `.json`
   dla programu/kadr/magazynu/sklepiku), panel kadr, panel programu, panel magazynowy i panel
   sklepikowy (pełna funkcjonalność z Twojego `sklepik.html`, tylko przepięta na serwer zamiast
   pamięci przeglądarki).

Poniżej opisuję dokładnie co i jak, oraz jakie założenia przyjąłem tam, gdzie w opisie było miejsce
na interpretację.

---

## Szybki start

```bash
npm install
npm start           # uruchamia panel TUI (src/App.tsx)
```

Przy pierwszym uruchomieniu zobaczysz ekran EULA (domyślny tekst — możesz go podmienić w
`Pliki/Eula.txt` po pierwszym uruchomieniu, plik tworzy się automatycznie). Po zaakceptowaniu
trafiasz do menu głównego: **Nowy Konwent** / **Wczytaj Konwent** / **Wyłącz aplikację**.

Po utworzeniu lub wczytaniu konwentu trafiasz automatycznie do **Panelu Konwentu** (to jest ta
nowa część, o którą prosiłeś).

### Podgląd samego serwera (bez TUI)

Jeżeli chcesz przetestować/zobaczyć sam serwer bez przechodzenia przez cały terminal:

```bash
npx tsx src/server/dev.ts
```

Tworzy (jeśli nie istnieje) konwent testowy `Konwent Testowy` (login `root` / hasło `root1234`) i
publikuje go pod `http://<Twoje IP>:3100`. Otwórz ten adres w przeglądarce.

---

## Struktura plików na dysku

```
Pliki/                              — pliki globalne aplikacji
  Eula.txt                          — treść EULA (edytowalna)
  Stats.json                        — czy EULA zaakceptowane
  Spis_Konwentow.json               — lista wszystkich konwentów (do wyboru w "Wczytaj Konwent")

Konwenty/<slug>/                    — WSZYSTKO co dotyczy jednego konwentu
  config.json                       — nazwa, dane konta root, flagi usług, LAN_DNS_enable
  Uzytkownicy.json                  — konta ról (admin/program/kadry/magazyn/sklepik)
  Dane/
    program.json                    — wgrywane z panelu admina (z narzędzia program.html)
    kadry.json                      — wgrywane z panelu admina (z narzędzia grafik.html)
    magazyn.json                    — wgrywane z panelu admina (dowolny JSON stanu magazynu)
    sklepik.json                    — produkty/ustawienia/historia sklepiku (odczyt+zapis przez panel sklepikowy)
  WWW/<rola>/                       — TU trafiają "własne strony" wgrane przez Panel Konwentu
    login/ admin/ kadry/ program/ magazyn/ sklepik/
```

**Konwent 1 może mieć strony domyślne, a konwent 2 własne** — dokładnie jak prosiłeś: serwer dla
danej roli najpierw sprawdza `Konwenty/<slug>/WWW/<rola>/`, a dopiero gdy tam nic nie ma (albo dany
plik tam nie istnieje), sięga po domyślny szablon z `web/default/<rola>/`. To jest zaimplementowane
jako dwa `express.static` middleware jeden za drugim — nic nie trzeba ręcznie sprawdzać, Express sam
"spada" na drugi, gdy pierwszy nie znajdzie pliku. Przetestowałem to bezpośrednio (podmieniłem
`WWW/kadry/index.html` i serwer faktycznie zaczął zwracać własną wersję, a `admin` bez podmiany dalej
zwracał domyślną).

---

## Publikacja i DNS lokalny

- **[S] w panelu Publikacji** uruchamia/zatrzymuje serwer danego konwentu na pierwszym wolnym porcie
  (od 3100 w górę).
- Jeśli przy tworzeniu konwentu zaznaczysz `LAN_DNS_enable`, serwer dodatkowo rozgłasza się przez
  mDNS jako `http://<slug>.local:<port>` (biblioteka `bonjour-service`).
- **Ważne ograniczenie mDNS**: macOS/iOS i większość Linuksów (Avahi) widzą `.local` "z pudełka".
  **Windows zwykle wymaga zainstalowanej usługi Bonjour** (instaluje się np. razem z iTunes) — bez
  niej `slug.local` się nie rozwiąże. Dlatego panel Publikacji zawsze pokazuje też surowe IP jako
  zapasowy adres, i jeśli rozgłoszenie DNS się nie powiedzie z jakiegoś powodu, aplikacja i tak
  wystartuje serwer, tylko na samym IP (nic się nie wywala).

---

## Panel admina — upload/download JSON

Zgodnie z opisem: panel admina **tylko** wgrywa/pobiera 4 pliki `.json` (program, kadry, magazyn,
sklepik) — nic więcej. Strona czyta plik lokalnie w przeglądarce (`<input type=file>` +
`FileReader`), sprawdza czy to poprawny JSON, i wysyła go na `/api/admin/dane/<typ>`. Dogodnie do
tego jest też **API**, dokładnie jak prosiłeś ("dodaj API pod upload i download"):

| Metoda | Endpoint                    | Opis                                      |
|--------|------------------------------|--------------------------------------------|
| GET    | `/api/admin/stan`            | czy każdy z 4 plików jest wgrany + kiedy   |
| GET    | `/api/admin/dane/:typ`       | pobiera dany plik (`program\|kadry\|magazyn\|sklepik`) |
| POST   | `/api/admin/dane/:typ`       | nadpisuje dany plik (body = JSON)          |

Wymaga roli `admin` (albo `root`) — token z logowania w nagłówku `Authorization: Bearer <token>`.

---

## Panel kadr

Czyta `Dane/kadry.json` (dokładnie w formacie, jaki eksportuje Twój `grafik.html`: `Wolontariusze`,
`Działy[].Grafik_dzialu.Dni[].dyzury[]` z prawdziwymi datami `YYYY-MM-DD`). Strona:
- pokazuje **dyżury trwające teraz** (po dacie + godzinie, na żywo, odświeża się co 30s),
- pozwala wybrać dział i zobaczyć jego pełną rozpiskę na dziś, z podświetleniem trwającego dyżuru.

To przetestowałem end-to-end na sfabrykowanych danych z dyżurem obejmującym bieżącą godzinę —
serwer poprawnie zwraca go jako "trwający", a inny dyżur (spoza zakresu) — nie.

## Panel programu

Czyta `Dane/program.json` (format z Twojego `program.html`: `Dni[]`, `Program[].Sale[].Punkty_programu[]`).

**Jedno zastrzeżenie, o którym chcę Cię uprzedzić:** pliki z `program.html` nie mają prawdziwej daty
przy dniu — tylko dowolną etykietę tekstową (np. "Dzień 1"). Jeśli w tej etykiecie da się rozpoznać
datę (np. "12.08.2026") albo nazwę dnia tygodnia (np. "Sobota"), serwer użyje jej do trafnego
dopasowania "dzisiaj". Jeśli nie — podświetlanie "trwa teraz" działa **tylko po godzinie**,
niezależnie od dnia, i strona wtedy pokazuje żółty baner ostrzegawczy o tym ograniczeniu. To jest
świadomy kompromis, bo dane źródłowe po prostu nie zawierają prawdziwej daty — jeśli wolisz, mogę
dodać do `program.html` pole z prawdziwą datą przy każdym dniu, żeby to dopasowanie było zawsze
pewne.

## Panel magazynowy

Pokazuje `Dane/magazyn.json`. Nie dostałem od Ciebie konkretnego formatu tego pliku, więc przyjąłem
strukturę `{ "przedmioty": [{ "nazwa": "...", "ilosc": 0, "jednostka": "..." }] }` i renderuję ją
jako tabelę — a jeśli plik ma inny kształt, strona po prostu pokazuje sformatowany JSON zamiast
zgadywać kolumny. Napisałeś, że stronę magazynową (tak jak kadry/program) i tak zrobisz sam później —
zostawiłem więc czysty, udokumentowany endpoint (`GET /api/magazyn/stan`), żebyś mógł podłączyć pod
niego dowolny własny widok, a obecną stronę traktuj jako działający punkt startowy, nie ostateczny UI.

## Panel sklepikowy

To jest Twój `sklepik.html` przeniesiony jeden do jednego pod względem funkcji (produkty ze zdjęciami, koszyk,
płatność zwykłą + walutą specjalną, historia transakcji, eksport do `.json`) — zmieniłem tylko
warstwę zapisu: zamiast `window.storage` (pamięć przeglądarki z Twojego środowiska testowego) strona
teraz czyta/zapisuje przez `GET/POST /api/sklepik/stan`, czyli dane lądują trwale na serwerze
konwentu i są wspólne dla każdego, kto zaloguje się na konto `sklepik`. Usunąłem też mechanizm
"wygasania po 24h" — to była właściwość pamięci tymczasowej, a teraz dane są trwałe, więc zbędna.

---

## Konta i role

- **root** — konto właściciela konwentu (login/hasło podane przy tworzeniu konwentu). Ma pełny
  dostęp do wszystkiego, zawsze.
- **admin / program / kadry / magazyn / sklepik** — dodajesz je w Panelu Konwentu →
  Użytkownicy → `[A]`. Dla kont `kadry`/`program` możesz opcjonalnie przypisać `dział`
  (wtedy panel kadr może od razu pokazać "mój dział" bez ręcznego wybierania).

Logowanie (i w TUI, i na stronie WWW) sprawdza najpierw czy to konto root, potem szuka w
`Uzytkownicy.json` — ta sama logika w obu miejscach (`src/dane/*`), więc nie ma rozjazdu.

---

## Co naprawiłem po drodze

W oryginalnym `App.tsx` były dwa błędy, które uniemożliwiały używanie "Wczytaj Konwent":
1. `zapiszKonwent` zapisywał do `config.json`, ale `odczytajKonwent` próbował czytać z
   `<nazwa>.json` (inna nazwa pliku) — literówka uniemożliwiająca odczyt.
2. `Wczytaj_Konwent_Panel` w ogóle nie sprawdzał hasła ani nie przechodził dalej po zalogowaniu —
   `handleSubmit` tylko sprawdzał czy folder istnieje.

Naprawiłem oba (teraz logowanie realnie weryfikuje hasło — root albo konto roli — i przechodzi do
Panelu Konwentu).

---

## Struktura kodu

```
src/
  App.tsx                — TUI: Logo → EULA → Menu główne → (Nowy/Wczytaj Konwent) → Panel_Konwentu
  dane/                  — warstwa danych, współdzielona między TUI i serwerem WWW
  server/
    createApp.ts         — składa jeden serwer Express dla jednego konwentu
    manager.ts           — start/stop/status serwerów (używane przez TUI i przez dev.ts)
    mdns.ts, port.ts      — rozgłaszanie .local, szukanie wolnego portu
    routes/               — auth, admin, kadry, program, magazyn, sklepik
    logika/               — liczenie "co trwa teraz" dla kadr i programu
  panele/                — nowe ekrany TUI: Panel_Konwentu, Panel_Publikacji, Panel_Uzytkownikow, Panel_Stron
web/default/              — domyślne szablony 6 stron + wspólny styl.css/klient.js
```

---

## Co przetestowałem, a czego nie mogłem

Środowisko, w którym pracowałem, nie ma prawdziwego terminala interaktywnego (TTY z realnym
człowiekiem naciskającym klawisze), więc TUI dało się przetestować tylko przez symulację klawiszy —
co dobrze pokazało, że każdy pojedynczy mechanizm (nawigacja strzałkami, wpisywanie w pola, checkboxy,
przełączanie zakładek formularza, blokada wysyłki niepełnego formularza) **działa poprawnie**, ale nie
dało mi 100% pewności co do idealnego tempa całej sekwencji w Twoim realnym terminalu. Natomiast
serwer i cała logika danych (logowanie, upload/download, wyliczanie "trwa teraz" dla kadr i programu,
izolacja ról, nadpisywanie stron własnymi) są przetestowane end-to-end przez rzeczywiste wywołania
HTTP i wszystko działa zgodnie z opisem. Polecam przy pierwszym realnym uruchomieniu przejść raz
ręcznie przez "Nowy Konwent", żeby zobaczyć, czy formularz TUI zachowuje się u Ciebie tak, jak
powinien — jeśli coś zgrzytnie, daj znać co dokładnie, chętnie doszlifuję.
