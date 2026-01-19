import { getLanguage } from "obsidian";

/**
 * Language name mapping for common locales
 * Based on: https://github.com/obsidianmd/obsidian-translations#existing-languages
 */
export const LANGUAGE_CODE_TO_NAME = {
	en: "English",
	"en-GB": "English (GB)",
	af: "Afrikaans",
	am: "Amharic",
	ar: "Arabic",
	eu: "Basque",
	be: "Belarusian",
	bg: "Bulgarian",
	bn: "Bengali",
	ca: "Catalan",
	cs: "Czech",
	da: "Danish",
	de: "German",
	dv: "Dhivehi",
	el: "Greek",
	eo: "Esperanto",
	es: "Spanish",
	fa: "Persian",
	"fi-fi": "Finnish",
	fr: "French",
	gl: "Galician",
	he: "Hebrew",
	hi: "Hindi",
	hu: "Hungarian",
	id: "Indonesian",
	it: "Italian",
	ja: "Japanese",
	ko: "Korean",
	lv: "Latvian",
	ml: "Malayalam",
	ms: "Malay",
	ne: "Nepali",
	nl: "Dutch",
	no: "Norwegian",
	oc: "Occitan",
	pl: "Polish",
	pt: "Portuguese",
	"pt-BR": "Brazilian Portuguese",
	ro: "Romanian",
	ru: "Russian",
	sa: "Sanskrit",
	si: "Sinhalese",
	sk: "Slovak",
	sq: "Albanian",
	sr: "Serbian",
	sv: "Swedish",
	ta: "Tamil",
	te: "Telugu",
	th: "Thai",
	tl: "Filipino (Tagalog)",
	tr: "Turkish",
	tt: "Tatar",
	uk: "Ukrainian",
	ur: "Urdu",
	vi: "Vietnamese",
	zh: "Simplified Chinese",
	"zh-TW": "Traditional Chinese",
} as const;

/**
 * Language native names from Obsidian translations
 * Based on: https://github.com/obsidianmd/obsidian-translations#existing-languages
 */
export const LANGUAGE_CODE_TO_NATIVE_NAME: Record<string, string> = {
	en: "English",
	"en-GB": "English (GB)",
	af: "Afrikaans",
	am: "አማርኛ",
	ar: "العربية",
	eu: "Euskara",
	be: "Беларуская мова",
	bg: "български език",
	bn: "বাংলা",
	ca: "català",
	cs: "čeština",
	da: "Dansk",
	de: "Deutsch",
	dv: "ދިވެህި",
	el: "Ελληνικά",
	eo: "Esperanto",
	es: "Español",
	fa: "فارسی",
	"fi-fi": "suomi",
	fr: "français",
	gl: "Galego",
	he: "עברית",
	hi: "हिन्दी",
	hu: "Magyar nyelv",
	id: "Bahasa Indonesia",
	it: "Italiano",
	ja: "日本語",
	ko: "한국어",
	lv: "Latviešu",
	ml: "മലയാളം",
	ms: "Bahasa Melayu",
	ne: "नेपाली",
	nl: "Nederlands",
	no: "Norsk",
	oc: "Occitan",
	pl: "język polski",
	pt: "Português",
	"pt-BR": "Portugues do Brasil",
	ro: "Română",
	ru: "Русский",
	sa: "संस्कृतम्",
	si: "සිංහල",
	sk: "Slovenčina",
	sq: "Shqip",
	sr: "српски језик",
	sv: "Svenska",
	ta: "தமிழ்",
	te: "తెలుగు",
	th: "ไทย",
	tl: "Tagalog",
	tr: "Türkçe",
	tt: "Татарча",
	uk: "Українська",
	ur: "اردو",
	vi: "Tiếng Việt",
	zh: "简体中文",
	"zh-TW": "繁體中文",
} as const;

/**
 * 语言代码类型
 */
export type LanguageCode = keyof typeof LANGUAGE_CODE_TO_NAME;

/**
 * 响应语言类型：语言代码或跟随界面语言
 */
export type LanguageOption = "follow-display" | LanguageCode;

export function getLanguageCode(languageOption: LanguageOption): LanguageCode {
	return languageOption === "follow-display"
		? (getLanguage() as LanguageCode)
		: languageOption;
}

/**
 * 根据语言选项获取语言名称
 */
export function getLanguageName(languageOption: LanguageOption): string {
	const languageCode = getLanguageCode(languageOption);
	const name = LANGUAGE_CODE_TO_NAME[languageCode];
	return name ?? "English";
}

export function isChineseLanguage(languageOption: LanguageOption): boolean {
	const languageCode = getLanguageCode(languageOption);
	return ["zh", "zh-TW"].includes(languageCode);
}
