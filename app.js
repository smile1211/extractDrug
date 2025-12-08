// ============================================================================
// Express API Server - 약품 검색 서비스
// ============================================================================

const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const {
  searchDrugs,
  calculateSimilarity,
  getInitials,
  levenshteinDistance,
} = require("./utils/similarity");

const app = express();
app.use(express.json());

// Supabase 클라이언트 초기화
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// ============================================================================
// Health Check
// ============================================================================
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// 약품 검색 API
// ============================================================================
app.post("/api/search-drugs", async (req, res) => {
  try {
    const {
      drug_names, // 검색할 약품명 배열
      intent, // 검색 의도 (optional)
      question_summary, // 원본 질의 (optional)
      algorithm = "combined", // 'levenshtein' | 'initial' | 'combined'
      threshold = 50, // 유사도 최소 점수
      limit = 3, // 결과 개수 제한
    } = req.body;

    // 입력 검증
    if (!drug_names || !Array.isArray(drug_names) || drug_names.length === 0) {
      return res.status(400).json({
        success: false,
        error: "약품명 배열이 필요합니다.",
        message: "drug_names는 비어있지 않은 배열이어야 합니다.",
      });
    }

    // Supabase에서 약품 데이터 가져오기
    const { data: drugDatabase, error: dbError } = await supabase
      .from("drug_nomalization") // 실제 테이블명
      .select("content, metadata");

    if (dbError) {
      throw new Error(`DB 조회 실패: ${dbError.message}`);
    }

    if (!drugDatabase || drugDatabase.length === 0) {
      return res.status(500).json({
        success: false,
        error: "약품 데이터베이스가 비어 있습니다.",
        message: "Supabase 테이블을 확인해주세요.",
      });
    }

    // 각 약품명에 대해 검색 수행
    const searchResults = drug_names.map((drugName) => {
      const results = searchDrugs(
        drugDatabase,
        drugName,
        algorithm,
        threshold,
        limit
      );

      return {
        inputDrugName: drugName,
        found: results.length > 0,
        matchCount: results.length,
        matches: results.map((r) => {
          // metadata가 JSON 문자열이면 파싱
          const meta =
            typeof r.metadata === "string"
              ? JSON.parse(r.metadata)
              : r.metadata;

          return {
            약품명: r.content,
            제품명: meta?.제품명 || meta?.product_name,
            성분명: meta?.성분명 || meta?.ingredient,
            성분명_A: meta?.["성분명A"],
            유사도점수: r.score,
            // 원본 메타데이터 전체 포함
            metadata: meta,
          };
        }),
        bestMatch: results[0]
          ? {
              약품명: results[0].content,
              metadata:
                typeof results[0].metadata === "string"
                  ? JSON.parse(results[0].metadata)
                  : results[0].metadata,
              유사도점수: results[0].score,
            }
          : null,
      };
    });

    // 성공 응답
    res.json({
      success: true,
      intent,
      originalQuery: question_summary,
      drugCount: drug_names.length,
      searchResults,
      summary: {
        totalSearched: drug_names.length,
        totalFound: searchResults.filter((r) => r.found).length,
        notFound: searchResults
          .filter((r) => !r.found)
          .map((r) => r.inputDrugName),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// ============================================================================
// 단일 약품 검색 API (간단한 버전)
// ============================================================================
app.get("/api/search-drug/:drugName", async (req, res) => {
  try {
    const { drugName } = req.params;
    const { limit = 3, threshold = 50 } = req.query;

    const { data: drugDatabase, error: dbError } = await supabase
      .from("documents")
      .select("content, metadata");

    if (dbError) throw new Error(`DB 조회 실패: ${dbError.message}`);

    const results = searchDrugs(
      drugDatabase,
      drugName,
      "combined",
      parseInt(threshold),
      parseInt(limit)
    );

    res.json({
      success: true,
      inputDrugName: drugName,
      found: results.length > 0,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// ============================================================================
// 서버 시작
// ============================================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
