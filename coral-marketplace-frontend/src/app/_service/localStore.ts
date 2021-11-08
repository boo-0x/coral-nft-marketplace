const SIGNER_POINTER = 'signer-pointer';
const CORAL_DARK_THEME = 'coral-dark-theme';

export const saveSignerPointer = (index: number): void => {
  localStorage.setItem(SIGNER_POINTER, `${index}`);
};

export const getSignerPointer = (): number => {
  const item = localStorage.getItem(SIGNER_POINTER);
  return item ? parseInt(item, 10) : 0;
};

export const saveTheme = (dark: boolean): void => {
  localStorage.setItem(CORAL_DARK_THEME, `${dark}`);
};

export const getTheme = (): boolean => {
  const item = localStorage.getItem(CORAL_DARK_THEME);
  return item === 'true';
};
