# Kandidat Lokal: Make the best flight game

Bounty: best-flight-game-20261126-0057 ($500, top 50). Juri menilai pairwise
dengan kriteria: (1) game terbang lengkap di screenshot — cockpit/chase view
di atas terrain yang dikenali, pesawat dalam frame dengan instrumen menyala,
runway atau target ring di depan, HUD altitude/speed/heading; (2) fun & depth —
throttle/turn discipline, misi berbeda, fuel/damage; (3) feel & polish —
kontrol responsif, kamera stabil, landing/crash terbaca; (4) look &
originalitas — satu gaya terrain+langit, pesawat terlihat dibangun, instrumen
terlihat diterbangkan; (5) struktur source — file terpisah per tugas, nama
fungsional.

## L1 — Kestrel Valley Run (Bush Pilot: 3 Missions)
Bush pilot di lembah bernama Kestrel Valley. Chase view 3D di atas terrain
pegunungan prosedural (lembah hijau, sungai, puncak salju). Tiga misi dalam
satu game: (a) Ring Run — terbang menembus 12 cincin emas di lembah, skor
bonus presisi tengah; (b) Dirt Strip Landing — mendarat di landasan tanah
Kestrel Strip dengan flap, hembusan angin, flare, dan penilaian touchdown;
(c) Supply Drop — jatuhkan 3 paket ke pondok pegunungan, kelola bahan bakar.
Fuel + damage + stall warning membuat setiap sortie jadi keputusan. HUD
lengkap: altimeter tape, airspeed, compass strip, horizon buatan, fuel,
damage, angin. Pesawat STOL bermesin tunggal digambar sebagai model 3D
vektor (fuselage, sayap, tail, propeller berputar).

## L2 — Storm Carrier (Night Carrier Landing)
Jet tempur mendarat di kapal induk malam badai. Cockpit HUD hijau menyala,
deck lights + meatball glide-slope, arrestor hook, AoA indexer, turbulensi.
Satu misi yang dalam (pendekatan presisi), tapi terrain = laut gelap (kurang
"recognisable terrain"), tanpa ring, dan replayability rendah.

## L3 — Cloud Harvest Glider (Thermal Soaring)
Glider riset tanpa mesin, naik lewat thermal di dalam awan thunderhead.
Variometer, manajemen baterai surya, cincin vektor angin. Sangat orisinal,
tapi tanpa runway, tanpa mesin/throttle (kriteria 2 "throttle discipline"
tidak terpenuhi), dan terrain sulit dikenali dari dalam awan.

## L4 — Sunset Island Hopper (Vintage Mail Biplane)
Biplan 1930-an antar surat antar pulau tropis: campuran karburator,
navigasi kompas tanpa GPS, pendaratan pantai pasir. Suasana kuat, tapi
mekanik campuran karburator membingungkan untuk pemain kasual, dan satu
misi pengiriman berulang tanpa variasi gol yang jelas.

## L5 — Stratos Solar (Edge of Space)
Pesawat surya di tepi angkasa, horizon melengkung Bumi, manajemen sudut
panel surya. Visual spektakuler, tapi tanpa runway/ring yang dikenali di
depan, terrain = lengkung Bumi yang abstrak, dan gameplay (optimasi sudut
panel) lambat untuk game arcade.

## Catatan turnamen
L1 sengaja dirancang sebagai fusi: mengambil kekuatan Hermes #2 (bush
landing + runway), #1/#3 (ring run + target ring di depan), dan #6/#8
(supply drop + named world), sehingga SATU game memenuhi semua elemen
kriteria 1 sekaligus (runway DAN ring), plus 3 misi + fuel/damage untuk
kriteria 2. Lihat TOURNAMENT.md untuk skor pairwise.
