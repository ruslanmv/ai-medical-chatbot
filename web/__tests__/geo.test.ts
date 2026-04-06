import { describe, it, expect } from "vitest";
import { isPrivateIp } from "@/app/api/geo/route";
import {
  getLanguageForCountry,
  COUNTRY_TO_LANGUAGE,
} from "@/lib/i18n";

describe("isPrivateIp", () => {
  it("detects loopback and link-local", () => {
    expect(isPrivateIp("127.0.0.1")).toBe(true);
    expect(isPrivateIp("::1")).toBe(true);
    expect(isPrivateIp("169.254.1.1")).toBe(true);
    expect(isPrivateIp("fe80::1")).toBe(true);
  });

  it("detects RFC1918 ranges", () => {
    expect(isPrivateIp("10.0.0.1")).toBe(true);
    expect(isPrivateIp("192.168.1.1")).toBe(true);
    expect(isPrivateIp("172.16.0.1")).toBe(true);
    expect(isPrivateIp("172.31.255.255")).toBe(true);
  });

  it("allows public addresses through", () => {
    expect(isPrivateIp("8.8.8.8")).toBe(false);
    expect(isPrivateIp("203.0.113.1")).toBe(false);
    expect(isPrivateIp("172.15.0.1")).toBe(false); // just outside 172.16-31
    expect(isPrivateIp("172.32.0.1")).toBe(false);
  });

  it("treats empty and garbage as private (safe default)", () => {
    expect(isPrivateIp("")).toBe(true);
    expect(isPrivateIp("not-an-ip")).toBe(false); // unknown format → not explicitly private
  });
});

describe("getLanguageForCountry", () => {
  it("routes English-speaking countries to en", () => {
    expect(getLanguageForCountry("US")).toBe("en");
    expect(getLanguageForCountry("GB")).toBe("en");
    expect(getLanguageForCountry("ZA")).toBe("en");
  });

  it("routes Spanish-speaking countries to es", () => {
    expect(getLanguageForCountry("ES")).toBe("es");
    expect(getLanguageForCountry("MX")).toBe("es");
    expect(getLanguageForCountry("AR")).toBe("es");
  });

  it("routes Brazil to pt, France to fr, Germany to de", () => {
    expect(getLanguageForCountry("BR")).toBe("pt");
    expect(getLanguageForCountry("FR")).toBe("fr");
    expect(getLanguageForCountry("DE")).toBe("de");
  });

  it("routes CJK markets correctly", () => {
    expect(getLanguageForCountry("CN")).toBe("zh");
    expect(getLanguageForCountry("JP")).toBe("ja");
    expect(getLanguageForCountry("KR")).toBe("ko");
  });

  it("is case-insensitive", () => {
    expect(getLanguageForCountry("jp")).toBe("ja");
    expect(getLanguageForCountry("br")).toBe("pt");
  });

  it("falls back to English for unknown / unsupported codes", () => {
    expect(getLanguageForCountry("XX")).toBe("en");
    expect(getLanguageForCountry("")).toBe("en");
  });

  it("every value in COUNTRY_TO_LANGUAGE is a known language code", () => {
    const known = new Set([
      "en", "es", "fr", "pt", "it", "de", "ar", "hi", "sw", "zh",
      "ja", "ko", "ru", "tr", "vi", "th", "bn", "ur", "pl", "nl",
    ]);
    for (const v of Object.values(COUNTRY_TO_LANGUAGE)) {
      expect(known.has(v)).toBe(true);
    }
  });
});
