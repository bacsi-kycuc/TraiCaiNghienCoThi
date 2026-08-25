/**
 * Utility functions for cleaning and formatting Quiz questions and options
 */

/**
 * Strips out leading question numbers, labels, or prefixes such as:
 * - "25: Does She..." -> "Does She..."
 * - "44. Maria..." -> "Maria..."
 * - "31. They were..." -> "They were..."
 * - "3: She helped..." -> "She helped..."
 * - "Câu 1: Thủ đô..." -> "Thủ đô..."
 * - "Câu 24/30: ..." -> "..."
 * - "Question 5: ..." -> "..."
 * - "Q5. ..." -> "..."
 * - "(1) ...", "[Câu 1] ..."
 */
export function cleanQuestionText(text: string | undefined | null): string {
  if (!text) return '';
  let cleaned = text.trim();

  // Strip prefix like "Câu 1:", "Câu 1.", "Cau 1 -", "Question 1:", "Q1:", "[Câu 1]", "(Câu 1)"
  cleaned = cleaned.replace(/^(\(|\[)?\s*(câu|cau|bài|bai|question|q)\s*\d+(\s*[\/\-]\s*\d+)?\s*(\)|\])?\s*[\.\:\-\/\)]*\s*/i, '');
  
  // Strip number prefixes like "25:", "44.", "31. ", "3: ", "1/ ", "1) ", "1- "
  cleaned = cleaned.replace(/^(\(|\[)?\s*\d+(\s*[\/\-]\s*\d+)?\s*(\)|\])?\s*[\.\:\-\/\)]+\s*/, '');
  
  return cleaned.trim();
}

/**
 * Strips out leading option letter badges such as:
 * - "A. lemons" -> "lemons"
 * - "B) eggs" -> "eggs"
 * - "C: held off" -> "held off"
 * - "(D) ..." -> "..."
 */
export function cleanOptionText(text: string | undefined | null): string {
  if (!text) return '';
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^(\(|\[)?\s*[A-Da-d]\s*(\)|\])?\s*[\.\:\-\/\)]+\s*/, '');
  return cleaned.trim();
}
