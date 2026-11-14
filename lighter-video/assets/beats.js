// Story beats in real voiceover time (seconds), read off assets/transcript.json. world.js and index.html run on these.
export const DURATION = 48;
export const HANDLE = "animoro studio";
export const T = {
  gasGlow: [1.1, 2.6],          // "gas yang boleh meletup": the liquid pulses
  flick: 6.45,                  // "petik": wheel flicks, flame on
  flickOff: 7.45,
  explode: [7.45, 8.7],         // "bongkar"
  toTank: [8.5, 9.6],           // "Badan dia ni sebenarnya tangki"
  cutTank: [10.35, 11.4],       // "Dalam tu ada butana"
  squeeze: [12.2, 14.0],        // "dimampat kuat-kuat"
  liquidHi: [14.0, 14.8],       // "cecair"
  joinStart: 14.7, joinEnd: 15.75, // parts come back
  cutAll: [15.6, 16.6],         // "belah dia"
  toParts: [16.5, 17.4],
  springPush: [20.9, 23.6],     // "tolak batu tu supaya sentiasa rapat"
  toWheel: [23.7, 24.8],        // close on the wheel
  spin1: [25.1, 29.6],          // slow-motion spin: "pusing roda ... kikis ... percikan"
  sparks1: [26.5, 29.7],
  toLever: [29.7, 30.8],
  press: 31.45,                 // "tekan tuas"
  valveOpen: 32.35,             // "injap pun terbuka"
  toGas: [33.6, 34.8],          // pull back to see the tank
  gasOn: 34.9,                  // "terus jadi gas"
  toTop: [36.9, 38.2],          // "keluar kat atas"
  spin2: [38.55, 39.1],         // "Percikan jumpa gas"
  ignite: 39.5,                 // "pap"
  release: 41.45,               // "Lepas je tuas"
  valveShut: 42.0,
  flameOut: 42.75,              // "api padam"
  uncut: [43.5, 44.7],          // "Simple kan?": the sheet sweeps back
  toEnd: [43.4, 45.2],
  fadeOut: 47.3,
};
// End card (no voice): top title + bottom line.
export const END_TITLE = [45.0, 47.4, "Nak aku *bongkar* apa lepas ni?"];
export const END_LINE = [45.7, 47.4, "Tulis kat *komen,* dan *follow* dulu!"];
// Labels: [anchor in world.js, text, show, hide, text offset px from anchor (1080x1920), highlight window or null]
export const LABELS = [
  ["shell", "tangki", 9.75, 14.6, [-200, -90], [9.75, 10.4]],
  ["liquid", "butana cecair", 11.0, 14.6, [250, 250], [14.0, 14.6]],
  ["wheel", "roda besi", 17.0, 23.6, [250, -150], [17.0, 18.0]],
  ["flint", "batu api", 19.3, 23.6, [280, 0], [19.3, 20.0]],
  ["spring", "spring", 20.2, 23.6, [270, 120], [20.2, 23.4]],
  ["wheel", "roda", 25.2, 29.6, [140, -260], null],
  ["flint", "batu api", 27.0, 29.6, [330, 170], [27.0, 28.0]],
  ["spark", "percikan", 28.85, 29.6, [-300, -300], [28.85, 29.6]],
  ["lever", "tuas", 31.5, 33.5, [120, -330], [31.5, 32.2]],
  ["jet", "injap", 32.3, 33.5, [-230, 170], [32.3, 33.5]],
  ["liquid", "cecair", 34.2, 36.7, [270, 200], null],
  ["tube", "tiub", 36.6, 38.0, [-260, 60], [36.6, 37.4]],
  ["gas", "gas", 35.6, 38.3, [-240, -120], [35.6, 36.4]],
  ["flame", "api", 39.8, 42.6, [-270, 40], [39.8, 40.6]],
];
