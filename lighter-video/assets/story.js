// Script, key words and labels. Times are canonical seconds (the animation is designed against these).
// Caption words are spread evenly inside each line until a voiceover gives real word times.
// *word* marks a key word (orange + glow).
export const DURATION = 60;
export const HANDLE = "nama.akaun"; // watermark pill, replace with the user's account

export const LINES = [
  [0.3, 4.6, "Macam mana *pemetik* *api* kecil ni boleh keluarkan *api?*"],
  [5.0, 8.6, "Jom kita *bongkar* isinya!"],
  [9.2, 11.8, "Kita mula dari *badan* dia."],
  [12.0, 15.2, "Dalam ni ada *butana,* gas yang dimampat"],
  [15.3, 18.6, "sampai jadi *cecair.*"],
  [21.0, 23.4, "Sekarang kita *belah* pemetik ni."],
  [23.8, 27.4, "Kat atas ada *roda* besi, bawahnya *batu* *api,*"],
  [27.6, 31.6, "ditolak *spring* supaya sentiasa rapat."],
  [32.2, 35.6, "Bila ibu jari pusing *roda,* dia kikis batu api"],
  [35.8, 39.6, "dan keluar *percikan* panas."],
  [40.2, 43.6, "Ibu jari yang sama tekan *tuas,* *injap* terbuka,"],
  [43.8, 47.6, "cecair butana jadi *gas* dan naik ke atas."],
  [48.2, 51.4, "Percikan jumpa gas, terus *menyala!*"],
  [51.6, 54.2, "Lepas tuas, injap *tutup,* api padam."],
  [56.6, 59.2, "Tulis pilihan kau kat *komen,* dan jangan lupa *follow!*"],
];

// End title (top of frame), same word-by-word reveal.
export const TITLE = [55.0, 59.2, "Next video nak bongkar *mangga* atau *enjin* *motor?*"];

// Labels: [anchor name in world.js, text, show from, hide at, text offset in px from the anchor (1080x1920), highlight from..to]
export const LABELS = [
  ["liquid", "butana cecair", 13.2, 19.0, [-250, 230], [15.3, 18.6]],
  ["tube", "tiub celup", 14.4, 19.0, [-300, -250], null],
  ["shell", "badan plastik", 10.4, 19.0, [-190, -60], [10.4, 11.8]],
  ["wheel", "roda pencucuh", 24.6, 31.8, [240, -110], [24.6, 26.0]],
  ["flint", "batu api", 26.2, 31.8, [260, 40], [26.2, 27.4]],
  ["spring", "spring", 28.2, 31.8, [250, 110], [28.2, 30.0]],
  ["lever", "tuas", 30.2, 31.8, [240, -60], null],
  ["jet", "injap", 30.8, 31.8, [-250, -150], null],
  ["wheel", "roda pencucuh", 33.0, 39.8, [30, -235], null],
  ["flint", "batu api", 34.4, 39.8, [330, 150], [34.4, 35.6]],
  ["spark", "percikan", 36.6, 39.8, [-300, -330], [36.6, 39.6]],
  ["lever", "tuas", 41.2, 44.8, [40, -330], [41.2, 42.6]],
  ["jet", "injap", 42.6, 44.8, [-200, 150], [42.6, 43.6]],
  ["gas", "gas butana", 45.4, 47.8, [-270, -30], [45.0, 47.6]],
  ["flame", "api", 49.6, 52.0, [-260, -80], [49.6, 51.4]],
];
