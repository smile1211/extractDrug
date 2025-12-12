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
    // ==========================================================
    // 🚨 수정된 부분: extractDrugName 대신 content 그대로 사용 🚨
    // ==========================================================
    const drugName = drug.content || ""; // const drugName = (drug.content || "").trim();
    // .trim()을 추가하여 혹시 모를 공백 문제를 방지합니다.
    // ==========================================================
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
      `   최고 점수: ${filtered[0].score}, 약품명: ${filtered[0].matchedName}`
    );
  }

  return filtered.sort((a, b) => b.score - a.score).slice(0, limit);
}
