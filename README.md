# Gra statki online

Bezpłatna bitwa morska dla dwóch graczy w przeglądarce. Utwórz pokój, podziel się kodem i zatop flotę przeciwnika.

## Funkcje

- Gra przez internet w prywatnych pokojach z kodem.
- Losowe lub ręczne ustawianie pięciu okrętów.
- Odstęp między statkami, również po skosie.
- Animowana woda i okręty wojenne.
- Serwer kontroluje ruchy, trafienia i zwycięstwo oraz ukrywa flotę przeciwnika.

## Uruchomienie

Node.js 20 lub nowszy. Uruchom `npm start` i otwórz `http://localhost:3000`.
Port określa zmienna `PORT`. Konfiguracja Render znajduje się w `render.yaml`.

Pokoje są przechowywane w pamięci jednego procesu i znikają po restarcie serwera. Projekt jest przeznaczony do gry hobbystycznej.
