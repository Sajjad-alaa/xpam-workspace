import { describe, expect, it } from "vitest";

import { normalizeLanguageCode, toDjangoLanguageCode, toIntlLocale } from "./index";

// XPAM ships English only: every system or stored language resolves to English.
describe("language normalization", () => {
  it.each(["en", "en-US", "zh-CN", "zh-TW", "pt_BR", "ru-RU", "de-DE", "", null, undefined])("maps %s to en", (input) => {
    expect(normalizeLanguageCode(input)).toBe("en");
  });

  it("returns a valid BCP 47 locale tag", () => {
    expect(toIntlLocale("zh_hant")).toBe("en");
    expect(() => new Intl.DateTimeFormat(toIntlLocale("pt_br"))).not.toThrow();
  });

  it("maps the app language to the Django i18n code", () => {
    expect(toDjangoLanguageCode("en")).toBe("en");
  });
});
