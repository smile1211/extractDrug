// ============================================================================
// 유사도 계산 유틸리티
// ============================================================================

/**
 * Levenshtein Distance 계산
 */
function levenshteinDistance(str1, str2) {
  const m = str1.length;
  const n = str2.length;
  const dp = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        str1[i - 1] === str2[j - 1]
          ? dp[i - 1][j - 1]
          : Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + 1);
    }
  }
  return dp[m][n];
}

/**
 * 유사도 점수 계산 (0-100)
 */
function calculateSimilarity(input, target) {
  const a = input.toLowerCase();
  const b = target.toLowerCase();

  // 완전 일치
  if (a === b) return 100;

  // 부분 문자열 포함
  if (b.includes(a)) return 85 + (a.length / b.length) * 10;
  if (a.includes(b)) return 85 + (b.length / a.length) * 10;

  // Levenshtein 거리 기반 유사도
  const dist = levenshteinDistance(a, b);
  const maxLen = Math.max(a.length, b.length);
  return Math.max(0, ((maxLen - dist) / maxLen) * 100);
}

/**
 * 한글 초성 추출
 */
function getInitials(text) {
  const initials = [
    "ㄱ",
    "ㄲ",
    "ㄴ",
    "ㄷ",
    "ㄸ",
    "ㄹ",
    "ㅁ",
    "ㅂ",
    "ㅃ",
    "ㅅ",
    "ㅆ",
    "ㅇ",
    "ㅈ",
    "ㅉ",
    "ㅊ",
    "ㅋ",
    "ㅌ",
    "ㅍ",
    "ㅎ",
  ];
  let result = "";

  for (let char of text) {
    const code = char.charCodeAt(0) - 44032;
    if (code >= 0 && code <= 11171) {
      result += initials[Math.floor(code / 588)];
    } else {
      result += char;
    }
  }
  return result;
}

/**
 * 약품 검색 (유사도 기반)
 *
 * @param {Array} drugDatabase - 약품 데이터베이스
 * @param {string} searchTerm - 검색어
 * @param {string} algorithm - 'levenshtein' | 'initial' | 'combined'
 * @param {number} threshold - 최소 유사도 점수
 * @param {number} limit - 결과 개수 제한
 * @returns {Array} 검색 결과
 */
function searchDrugs(
  drugDatabase,
  searchTerm,
  algorithm = "combined",
  threshold = 30,
  limit = 5
) {
  if (!searchTerm?.trim()) return [];

  const results = drugDatabase.map((drug) => {
    // 약품명 필드 (여러 가능성 대응)
    const drugName = drug.content || drug.제품명 || drug.product_name || "";
    let score = 0;

    if (algorithm === "levenshtein") {
      score = calculateSimilarity(searchTerm, drugName);
    } else if (algorithm === "initial") {
      score = calculateSimilarity(
        getInitials(searchTerm),
        getInitials(drugName)
      );
    } else {
      // combined: 직접 유사도 70% + 초성 유사도 30%
      const direct = calculateSimilarity(searchTerm, drugName);
      const initial = calculateSimilarity(
        getInitials(searchTerm),
        getInitials(drugName)
      );
      score = direct * 0.7 + initial * 0.3;
    }

    return {
      ...drug,
      score: Math.round(score),
      matchedName: drugName,
    };
  });

  return results
    .filter((r) => r.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

module.exports = {
  levenshteinDistance,
  calculateSimilarity,
  getInitials,
  searchDrugs,
};
