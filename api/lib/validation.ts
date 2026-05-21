import { z } from "zod";

const MONEY_PATTERN = /^\d+(\.\d{1,2})?$/;
const DECIMAL_PATTERN = /^\d+(\.\d{1,3})?$/;

export const moneyString = z
  .string()
  .trim()
  .regex(MONEY_PATTERN, "Nilai uang harus berupa angka positif dengan maksimal 2 desimal.");

export const optionalMoneyString = moneyString.optional();

export const decimalString = z
  .string()
  .trim()
  .regex(DECIMAL_PATTERN, "Nilai harus berupa angka positif dengan maksimal 3 desimal.");

export const positiveInt = z.number().int().positive();
export const nonNegativeInt = z.number().int().min(0);

