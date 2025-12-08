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
 * content 필드에서 약품명 추출
 */
function extractDrugName(content) {
  if (!content) return "";

  // "의약품명: XXX" 패턴에서 약품명 추출
  const match = content.match(/의약품명[:\s]*([^\n]+)/);
  if (match && match[1]) {
    return match[1].trim();
  }

  // 매칭 실패 시 원본 반환
  return content;
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

  console.log(
    `🔍 검색 시작: "${searchTerm}", 알고리즘: ${algorithm}, threshold: ${threshold}`
  );
  console.log(`📊 DB 크기: ${drugDatabase.length}개`);

  const results = drugDatabase.map((drug) => {
    // content에서 약품명 추출
    const drugName = extractDrugName(drug.content || "");
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

  const filtered = results.filter((r) => r.score >= threshold);
  console.log(`✅ threshold ${threshold} 이상: ${filtered.length}개`);

  if (filtered.length > 0) {
    console.log(
      `   최고 점수: ${filtered[0].score}, 약품명: ${filtered[0].matchedName}`
    );
  }

  return filtered.sort((a, b) => b.score - a.score).slice(0, limit);
}

module.exports = {
  levenshteinDistance,
  calculateSimilarity,
  getInitials,
  searchDrugs,
};
