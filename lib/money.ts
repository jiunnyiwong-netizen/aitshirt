// All prices are whole sen (RM 79.00 = 7900).
export function formatRM(sen: number): string {
  return `RM ${(sen / 100).toFixed(2)}`;
}
