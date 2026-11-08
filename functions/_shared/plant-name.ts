// Plant names come from a free-text field, so straight quotes ("Китайский"),
// numbers with №, slashes and similar punctuation are all normal input.

const ALLOWED = /^[\p{L}\p{M}\d][\p{L}\p{M}\d\s()«»„“”"'’`.,:;!?№/+×-]*$/u;

// Pairs of straight quotes become «ёлочки», the form the site uses in texts.
export const normalizePlantInput = (value: unknown) =>
  typeof value === 'string'
    ? value
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/"([^"]*)"/g, '«$1»')
    : '';

export const plantNameError = (plant: string, maximumLength: number): string | null => {
  if (plant.length < 2 || plant.length > maximumLength) {
    return `Введите название растения — от 2 до ${maximumLength} символов.`;
  }
  if (!ALLOWED.test(plant)) {
    const bad = [...new Set([...plant].filter((char) => !ALLOWED.test(`а${char}`)))].join(' ');
    return bad
      ? `В названии растения есть недопустимые символы: ${bad}. Уберите их и попробуйте снова.`
      : 'Название растения должно начинаться с буквы или цифры.';
  }
  return null;
};
