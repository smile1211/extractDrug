// ============================================================================
// 유사도 계산 유틸리티
// ============================================================================

/**
 * 한글 초성 추출
 */
function getInitials(str) {
  const CHO = [
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
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i) - 0xac00;
    if (code > -1 && code < 11172) {
      result += CHO[Math.floor(code / 588)];
    } else {
      result += str[i];
    }
  }
  return result;
}

/**
 * Levenshtein Distance 계산
 */
function levenshteinDistance(str1, str2) {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix = [];

  if (len1 === 0) return len2;
  if (len2 === 0) return len1;

  for (let i = 0; i <= len2; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len1; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len2; i++) {
    for (let j = 1; j <= len1; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[len2][len1];
}

/**
 * 유사도 점수 계산 (0~100)
 */
function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;

  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 100;

  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 100;

  const distance = levenshteinDistance(s1, s2);
  return Math.round(((maxLen - distance) / maxLen) * 100);
}

/**
 * 문자열 정규화 (공백, 특수문자 제거)
 */
function normalizeString(str) {
  if (!str) return "";
  return str
    .trim()
    .replace(/\s+/g, "") // 모든 공백 제거
    .replace(/[^\w가-힣]/g, "") // 특수문자 제거 (한글, 영문, 숫자만 남김)
    .toLowerCase();
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

  // 검색어 정규화
  const normalizedSearch = normalizeString(searchTerm);

  console.log("=".repeat(80));
  console.log(`🔍 검색 시작`);
  console.log(`   원본 검색어: "${searchTerm}"`);
  console.log(`   정규화 검색어: "${normalizedSearch}"`);
  console.log(`   알고리즘: ${algorithm}, threshold: ${threshold}`);
  console.log(`   DB 크기: ${drugDatabase.length}개`);
  console.log("=".repeat(80));

  const results = drugDatabase.map((drug, index) => {
    // content 필드를 약품명으로 사용
    const originalDrugName = (drug.content || "").trim();
    const normalizedDrugName = normalizeString(originalDrugName);

    let score = 0;

    // 정규화된 문자열로 비교
    if (algorithm === "levenshtein") {
      score = calculateSimilarity(normalizedSearch, normalizedDrugName);
    } else if (algorithm === "initial") {
      score = calculateSimilarity(
        getInitials(normalizedSearch),
        getInitials(normalizedDrugName)
      );
    } else {
      // combined: 직접 유사도 70% + 초성 유사도 30%
      const direct = calculateSimilarity(normalizedSearch, normalizedDrugName);
      const initial = calculateSimilarity(
        getInitials(normalizedSearch),
        getInitials(normalizedDrugName)
      );
      score = direct * 0.7 + initial * 0.3;
    }

    // 처음 5개만 상세 로그 출력
    if (index < 5 || score >= threshold) {
      console.log(`\n📋 약품 #${index + 1}:`);
      console.log(`   원본: "${originalDrugName}"`);
      console.log(`   정규화: "${normalizedDrugName}"`);
      console.log(`   점수: ${Math.round(score)}`);
    }

    return {
      ...drug,
      score: Math.round(score),
      matchedName: originalDrugName,
      normalizedName: normalizedDrugName,
    };
  });

  const filtered = results.filter((r) => r.score >= threshold);

  console.log("\n" + "=".repeat(80));
  console.log(`✅ threshold ${threshold} 이상: ${filtered.length}개`);

  if (filtered.length > 0) {
    console.log(`\n🏆 최고 점수 결과:`);
    filtered.slice(0, 3).forEach((r, i) => {
      console.log(`   ${i + 1}. ${r.matchedName} (점수: ${r.score})`);
    });
  } else {
    console.log(`\n❌ 매칭된 결과 없음`);
    console.log(`\n💡 상위 5개 약품 점수:`);
    results
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .forEach((r, i) => {
        console.log(`   ${i + 1}. ${r.matchedName} (점수: ${r.score})`);
      });
  }
  console.log("=".repeat(80));

  return filtered.sort((a, b) => b.score - a.score).slice(0, limit);
}

// ============================================================================
// Export
// ============================================================================
module.exports = {
  getInitials,
  levenshteinDistance,
  calculateSimilarity,
  normalizeString,
  searchDrugs,
};
