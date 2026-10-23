// Backend AuthService.MinPasswordLength ile senkron tutulmalıdır
export const MIN_PASSWORD_LENGTH = 8;

export const isPasswordTooShort = (password: string): boolean => password.length < MIN_PASSWORD_LENGTH;
