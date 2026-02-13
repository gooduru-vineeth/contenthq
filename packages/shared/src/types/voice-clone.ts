export const INWORLD_LANG_CODES = [
  "EN_US",
  "ZH_CN",
  "KO_KR",
  "JA_JP",
  "RU_RU",
  "AUTO",
  "IT_IT",
  "ES_ES",
  "PT_BR",
  "DE_DE",
  "FR_FR",
  "AR_SA",
  "PL_PL",
  "NL_NL",
  "HI_IN",
  "HE_IL",
] as const;

export type InworldLangCode = (typeof INWORLD_LANG_CODES)[number];

export const INWORLD_LANG_LABELS: Record<InworldLangCode, string> = {
  EN_US: "English (US)",
  ZH_CN: "Chinese (Simplified)",
  KO_KR: "Korean",
  JA_JP: "Japanese",
  RU_RU: "Russian",
  AUTO: "Auto-detect",
  IT_IT: "Italian",
  ES_ES: "Spanish",
  PT_BR: "Portuguese (Brazil)",
  DE_DE: "German",
  FR_FR: "French",
  AR_SA: "Arabic",
  PL_PL: "Polish",
  NL_NL: "Dutch",
  HI_IN: "Hindi",
  HE_IL: "Hebrew",
};

export const CLONE_VOICE_STATUSES = [
  "pending",
  "processing",
  "ready",
  "failed",
] as const;

export type CloneVoiceStatus = (typeof CLONE_VOICE_STATUSES)[number];
