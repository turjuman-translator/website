// What the demos on the website say: a short khutbah, the prayer moments and the live headline.
// Shared by the page build (static markup) and the browser bundle (the simulations).
// Quran text: Tanzil Uthmani (tanzil.net), unmodified; Dutch 49:13: Siregar (Tanzil); English
// 49:13: Saheeh International.

/** The pages of the website. */
export const SITE_LANGS = ["en", "nl", "ar"] as const;
export type SiteLang = (typeof SITE_LANGS)[number];

/** The language the demo screens translate into: the page's, or Dutch on the Arabic page. */
export function captionLang(lang: SiteLang): "en" | "nl" {
  return lang === "ar" ? "nl" : lang;
}

export interface CaptionLine {
  ar: string;
  en: string;
  nl: string;
  /** A Quran verse: Amiri Quran, the translation settles as a whole, with its reference. */
  verse?: { ref: string };
}

const OPENING: CaptionLine = {
  ar: "إن الحمد لله، نحمده ونستعينه ونستغفره",
  en: "Indeed, all praise is for Allah. We praise Him, seek His help and ask His forgiveness.",
  nl: "Alle lof is voor Allah. Wij prijzen Hem, zoeken Zijn hulp en vragen Hem om vergeving.",
};

const QUOTE: CaptionLine = {
  ar: "يقول الله في كتابه الكريم",
  en: "Allah says in His noble Book:",
  nl: "Allah zegt in Zijn edele Boek:",
};

/** 49:13 (its first sentence), the verse the Quran demos recite. */
export const VERSE: CaptionLine = {
  ar: "يَـٰٓأَيُّهَا ٱلنَّاسُ إِنَّا خَلَقْنَـٰكُم مِّن ذَكَرٍ وَأُنثَىٰ وَجَعَلْنَـٰكُمْ شُعُوبًا وَقَبَآئِلَ لِتَعَارَفُوٓا۟",
  en: "O mankind, indeed We have created you from male and female and made you peoples and tribes that you may know one another.",
  nl: "O mensheid, Wij hebben jullie geschapen uit een man en een vrouw en Wij hebben jullie tot volken en stammen gemaakt, opdat jullie elkaar leren kennen.",
  verse: { ref: "49:13" },
};

const BROTHERHOOD: CaptionLine = {
  ar: "فالتعارف بداية الأخوة",
  en: "Knowing one another is where brotherhood begins.",
  nl: "Elkaar leren kennen is het begin van broederschap.",
};

const HADITH: CaptionLine = {
  ar: "قال رسول الله صلى الله عليه وسلم: لا يؤمن أحدكم حتى يحب لأخيه ما يحب لنفسه",
  en: "The Messenger of Allah ﷺ said: “None of you truly believes until he loves for his brother what he loves for himself.”",
  nl: "De Boodschapper van Allah ﷺ zei: “Niemand van jullie gelooft werkelijk totdat hij voor zijn broeder wenst wat hij voor zichzelf wenst.”",
};

export const KHUTBAH: readonly CaptionLine[] = [OPENING, QUOTE, VERSE, BROTHERHOOD, HADITH];

/** The lines the caption-style preview shows: an opening, the verse and a hadith. */
export const PREVIEW_LINES = { opening: OPENING, verse: VERSE, hadith: HADITH } as const;

export type Moment = "athan" | "iqama" | "salah";
export const MOMENTS: readonly Moment[] = ["athan", "iqama", "salah"];

/** A phrase as it is said during a prayer moment; `weight` is its length relative to others. */
export interface Phrase {
  ar: string;
  quran: boolean;
  weight: number;
}

const said = (ar: string, weight = 1): Phrase => ({ ar, quran: false, weight });
const recited = (ar: string): Phrase => ({ ar, quran: true, weight: 1 });

export const PHRASES: Readonly<Record<Moment, readonly Phrase[]>> = {
  athan: [
    said("الله أكبر، الله أكبر"),
    said("الله أكبر، الله أكبر"),
    said("أشهد أن لا إله إلا الله"),
    said("أشهد أن لا إله إلا الله"),
    said("أشهد أن محمدًا رسول الله"),
    said("أشهد أن محمدًا رسول الله"),
    said("حي على الصلاة"),
    said("حي على الصلاة"),
    said("حي على الفلاح"),
    said("حي على الفلاح"),
    said("الله أكبر، الله أكبر"),
    said("لا إله إلا الله"),
  ],
  iqama: [
    said("الله أكبر، الله أكبر"),
    said("أشهد أن لا إله إلا الله"),
    said("أشهد أن محمدًا رسول الله"),
    said("حي على الصلاة"),
    said("حي على الفلاح"),
    said("قد قامت الصلاة، قد قامت الصلاة"),
    said("الله أكبر، الله أكبر"),
    said("لا إله إلا الله"),
  ],
  salah: [
    said("الله أكبر", 0.65),
    recited("بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ"),
    recited("ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَـٰلَمِينَ"),
    recited("ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ"),
    recited("مَـٰلِكِ يَوْمِ ٱلدِّينِ"),
  ],
};

/** Milliseconds per phrase weight in the simulation (the Athan is drawn out, Salah is slow). */
export const PHRASE_PACE: Readonly<Record<Moment, number>> = {
  athan: 1900,
  iqama: 1650,
  salah: 2700,
};

/** The Friday as chapters of the simulation: the clock time each one starts and ends. */
export interface Chapter {
  key: "m_athan" | "m_khutbah" | "m_iqama" | "m_salah";
  /** "12:45" */
  label: string;
  /** Seconds since midnight at the start and the end of the chapter. */
  from: number;
  to: number;
}

const at = (h: number, m: number): number => h * 3600 + m * 60;

export const CHAPTERS: readonly Chapter[] = [
  { key: "m_athan", label: "12:45", from: at(12, 45), to: at(12, 50) },
  { key: "m_khutbah", label: "12:50", from: at(12, 50), to: at(13, 20) },
  { key: "m_iqama", label: "13:20", from: at(13, 20), to: at(13, 22) },
  { key: "m_salah", label: "13:22", from: at(13, 22), to: at(13, 30) },
];

/** The live headline: said in Arabic, translated word by word into each of these in turn. */
export const HEADLINE_AR = "خطبة الجمعة مترجمة للجميع";
export const HEADLINES: ReadonlyArray<readonly [string, string]> = [
  ["en", "The Friday khutbah, translated for all."],
  ["nl", "De vrijdagkhutbah, vertaald voor iedereen."],
  ["tr", "Cuma hutbesi, herkes için tercüme ediliyor."],
  ["fr", "Le sermon du vendredi, traduit pour tous."],
  ["de", "Die Freitagspredigt, übersetzt für alle."],
  ["id", "Khutbah Jumat, diterjemahkan untuk semua."],
];

/** Each language in its own name. */
export const LANG_NAMES: Readonly<Record<string, string>> = {
  en: "English",
  nl: "Nederlands",
  tr: "Türkçe",
  fr: "Français",
  de: "Deutsch",
  id: "Bahasa Indonesia",
  ar: "العربية",
};

export function headlineFor(lang: string): string {
  return HEADLINES.find(([l]) => l === lang)?.[1] ?? HEADLINE_AR;
}
