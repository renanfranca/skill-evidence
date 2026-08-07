export const normalize = (value: string): string => value.trim().toLowerCase();
export const validate = (value: string): boolean => value.length > 0;
export const processValue = (value: string): string | undefined => {
  const normalized = normalize(value);
  return validate(normalized) ? normalized : undefined;
};
