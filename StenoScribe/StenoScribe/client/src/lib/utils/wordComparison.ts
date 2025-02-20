import { WordMistakes } from "@shared/schema";

export function compareWords(original: string, typed: string): WordMistakes {
  const originalWords = original.trim().split(/\s+/);
  const typedWords = typed.trim().split(/\s+/);
  
  const mistakes: WordMistakes = {
    missed: [],
    wrong: [],
    misspelled: []
  };

  const maxLen = Math.max(originalWords.length, typedWords.length);
  
  for (let i = 0; i < maxLen; i++) {
    const originalWord = originalWords[i];
    const typedWord = typedWords[i];

    if (!originalWord) {
      // Extra words typed
      mistakes.wrong.push(typedWord);
      continue;
    }

    if (!typedWord) {
      // Missing words
      mistakes.missed.push(originalWord);
      continue;
    }

    if (typedWord !== originalWord) {
      // Check if it's a misspelling or completely wrong word
      const similarity = calculateSimilarity(originalWord, typedWord);
      if (similarity > 0.7) {
        mistakes.misspelled.push(originalWord);
      } else {
        mistakes.wrong.push(typedWord);
      }
    }
  }

  return mistakes;
}

function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) {
    return 1.0;
  }

  const costs = [];
  for (let i = 0; i <= longer.length; i++) {
    costs[i] = i;
  }

  let currentValue;
  for (let i = 1; i <= shorter.length; i++) {
    costs[0] = i;
    let nw = i - 1;
    for (let j = 1; j <= longer.length; j++) {
      const cj = Math.min(
        1 + Math.min(costs[j], costs[j - 1]),
        shorter[i - 1] === longer[j - 1] ? nw : nw + 1
      );
      nw = costs[j];
      costs[j] = cj;
    }
  }

  return (longer.length - costs[longer.length]) / longer.length;
}

export function calculateWPM(text: string, durationInSeconds: number): number {
  const words = text.trim().split(/\s+/).length;
  const minutes = durationInSeconds / 60;
  return Math.round(words / minutes);
}

export function calculateAccuracy(original: string, typed: string): number {
  const mistakes = compareWords(original, typed);
  const totalMistakes = mistakes.missed.length + mistakes.wrong.length + mistakes.misspelled.length;
  const totalWords = original.trim().split(/\s+/).length;
  return Math.round(((totalWords - totalMistakes) / totalWords) * 100);
}
