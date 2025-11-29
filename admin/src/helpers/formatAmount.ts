/**
 * Format the input amount string into a currency format (INR).
 * @param  amount - The amount to be formatted as a string.
 * @returns The formatted amount in INR currency format.
 */
export const formatAmount = (amount: string | number): string => {
  const amountInNumber =
    typeof amount === "string" ? parseFloat(amount) : amount;

  const formatted = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(amountInNumber);

  return formatted;
};
