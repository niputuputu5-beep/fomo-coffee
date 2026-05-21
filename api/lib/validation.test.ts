import { describe, expect, it } from "vitest";
import { moneyString, nonNegativeInt, positiveInt } from "./validation";
import { getAffectedRows, getInsertId } from "./db-result";

describe("validation helpers", () => {
  it("accepts money values with up to two decimals", () => {
    expect(moneyString.parse("10000")).toBe("10000");
    expect(moneyString.parse("10000.50")).toBe("10000.50");
  });

  it("rejects negative or malformed money values", () => {
    expect(() => moneyString.parse("-1")).toThrow();
    expect(() => moneyString.parse("100.999")).toThrow();
    expect(() => moneyString.parse("abc")).toThrow();
  });

  it("validates inventory quantities", () => {
    expect(positiveInt.parse(1)).toBe(1);
    expect(nonNegativeInt.parse(0)).toBe(0);
    expect(() => positiveInt.parse(0)).toThrow();
    expect(() => nonNegativeInt.parse(-1)).toThrow();
  });
});

describe("database result helpers", () => {
  it("reads insert id and affected row packets", () => {
    expect(getInsertId([{ insertId: "12" }])).toBe(12);
    expect(getAffectedRows([{ affectedRows: "3" }])).toBe(3);
  });
});
