(function () {
  const existingImageButton = document.getElementById("imageButton");
  const existingKillerButton = document.getElementById("killerButton");
  const existingPenaltyButton = document.getElementById("penaltyButton");

  if (typeof els !== "undefined" && els.imageButton && els.killerButton && els.penaltyButton) {
    return;
  }

  const killerIds = [
    "M094", "M095", "M097", "M107", "M139", "M143", "M144", "M305", "M378", "M391",
    "M393", "M480", "M495", "M083", "M084", "M085", "M091", "M142", "M093", "M141",
    "M380", "M382", "M388", "M488", "M381", "M343", "M344", "M379", "M383", "M384",
    "M030", "M290", "M307", "M308", "M324", "M389", "M390", "M392", "M394", "M395",
    "M396", "M397", "M255", "M523", "M492", "M497", "M559", "H006", "H008", "H049",
    "H079", "H115", "M219", "M408", "M409", "M416", "M426", "M443", "M510", "M514",
    "M515", "M516", "M517", "H013", "H019", "H020", "H023", "H025", "H033", "H034",
    "H063", "H064", "H065", "H066", "H067", "H080", "H087", "H092", "H093", "H094",
    "H095", "H096", "H105", "H109", "H110", "H111", "H112", "H124", "H125", "M123",
    "M134", "H088", "M245", "M541", "M553", "H009", "M019", "M026", "M482", "M499",
  ];
  const penaltyPatterns = [
    /罰鍰/,
    /罰款/,
    /罰金/,
    /新臺幣/,
    /新台幣/,
    /\d+\s*元/,
    /元以上/,
    /元以下/,
    /吊扣/,
    /吊銷/,
    /扣牌/,
    /扣留牌照/,
    /註銷/,
    /沒入/,
    /處罰/,
    /罰則/,
  ];

  const requiredGlobals = [
    typeof questions,
    typeof els,
    typeof state,
    typeof normalize,
    typeof applyFilters,
    typeof setScope,
    typeof matchingQuestions,
    typeof renderStats,
    typeof renderQuestion,
    typeof renderEmpty,
  ];

  if (requiredGlobals.includes("undefined")) {
    return;
  }

  const killerQuestionIds = new Set(
    killerIds.filter((id) => questions.some((question) => question.id === id))
  );
  const imageQuestionIds = new Set(
    questions.filter((question) => question.image).map((question) => question.id)
  );
  const penaltyQuestionIds = new Set(
    questions
      .filter((question) => {
        const text = [question.id, question.category, question.question, ...(question.options || [])].join(" ");
        return penaltyPatterns.some((pattern) => pattern.test(text));
      })
      .map((question) => question.id)
  );
  const allButton = document.getElementById("allQuestionsButton");
  const wrongBookButton = document.getElementById("wrongBookButton");
  const rangeGroup = allButton && wrongBookButton ? allButton.parentElement : null;

  if (!rangeGroup) {
    return;
  }

  const style = document.createElement("style");
  style.textContent = `
    .segmented.is-three {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .segmented.is-four {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    .segmented.is-five {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .segment {
      min-width: 0;
      padding: 8px 8px;
      line-height: 1.25;
      overflow-wrap: anywhere;
    }

    .segmented.is-five .segment {
      border-left: 0;
      border-top: 1px solid var(--line);
    }

    .segmented.is-five .segment:nth-child(-n + 2) {
      border-top: 0;
    }

    .segmented.is-five .segment:nth-child(even) {
      border-left: 1px solid var(--line);
    }

    .segmented.is-five .segment:nth-child(5) {
      grid-column: 1 / -1;
      border-left: 0;
    }
  `;
  document.head.appendChild(style);

  const imageButton = existingImageButton || document.createElement("button");
  imageButton.id = "imageButton";
  imageButton.className = "segment";
  imageButton.type = "button";
  imageButton.textContent = "圖片題";
  const killerButton = existingKillerButton || document.createElement("button");
  killerButton.id = "killerButton";
  killerButton.className = "segment";
  killerButton.type = "button";
  killerButton.textContent = "殺手題";
  const penaltyButton = existingPenaltyButton || document.createElement("button");
  penaltyButton.id = "penaltyButton";
  penaltyButton.className = "segment";
  penaltyButton.type = "button";
  penaltyButton.textContent = "罰則題";
  rangeGroup.classList.remove("is-three");
  rangeGroup.classList.remove("is-four");
  rangeGroup.classList.add("is-five");
  if (!existingKillerButton) {
    rangeGroup.insertBefore(killerButton, wrongBookButton);
  }
  if (!existingPenaltyButton) {
    rangeGroup.insertBefore(penaltyButton, wrongBookButton);
  }
  if (!existingImageButton) {
    rangeGroup.insertBefore(imageButton, killerButton.parentElement === rangeGroup ? killerButton : wrongBookButton);
  }

  const hint = rangeGroup.parentElement.querySelector(".panel-hint");
  if (hint) {
    hint.textContent = "圖片題含標誌、標線與圖示；答錯會自動加入錯題本。";
  }

  els.imageButton = imageButton;
  els.killerButton = killerButton;
  els.penaltyButton = penaltyButton;
  if (!state.progressByScope || typeof state.progressByScope !== "object") {
    state.progressByScope = {};
  }
  if (!("killer" in state.progressByScope)) {
    state.progressByScope.killer = null;
  }
  if (!("image" in state.progressByScope)) {
    state.progressByScope.image = null;
  }
  if (!("penalty" in state.progressByScope)) {
    state.progressByScope.penalty = null;
  }

  const originalSetScope = setScope;
  const originalRenderStats = renderStats;
  const originalRenderQuestion = renderQuestion;
  const originalRenderEmpty = renderEmpty;

  matchingQuestions = function () {
    const searchTerm = normalize(els.searchInput.value);
    const category = els.categoryFilter.value;

    return questions.filter((question) => {
      const matchesCategory = !category || category === "all" || question.category === category;
      const haystack = `${question.question} ${question.options.join(" ")} ${question.id}`.toLowerCase();
      const matchesSearch = !searchTerm || haystack.includes(searchTerm);
      const matchesScope =
        state.scope === "all" ||
        (state.scope === "image" && imageQuestionIds.has(question.id)) ||
        (state.scope === "killer" && killerQuestionIds.has(question.id)) ||
        (state.scope === "penalty" && penaltyQuestionIds.has(question.id)) ||
        (state.scope === "wrongBook" && state.wrongBookIds.has(question.id));

      return matchesCategory && matchesSearch && matchesScope;
    });
  };

  setScope = function (scope) {
    originalSetScope(scope);
    allButton.classList.toggle("is-active", scope === "all");
    imageButton.classList.toggle("is-active", scope === "image");
    killerButton.classList.toggle("is-active", scope === "killer");
    penaltyButton.classList.toggle("is-active", scope === "penalty");
    wrongBookButton.classList.toggle("is-active", scope === "wrongBook");
  };

  renderStats = function () {
    originalRenderStats();
    imageButton.textContent = `圖片題（${imageQuestionIds.size}）`;
    killerButton.textContent = `殺手題（${killerQuestionIds.size}）`;
    penaltyButton.textContent = `罰則題（${penaltyQuestionIds.size}）`;
  };

  renderQuestion = function (question) {
    originalRenderQuestion(question);
    const activeQuestion = question || state.filtered[state.currentIndex];
    if (!activeQuestion) {
      return;
    }

    if (imageQuestionIds.has(activeQuestion.id) && !els.questionMeta.textContent.includes("圖片題")) {
      els.questionMeta.textContent = `${els.questionMeta.textContent} · 圖片題`;
    }

    if (killerQuestionIds.has(activeQuestion.id) && !els.questionMeta.textContent.includes("殺手題")) {
      els.questionMeta.textContent = `${els.questionMeta.textContent} · 殺手題`;
    }

    if (penaltyQuestionIds.has(activeQuestion.id) && !els.questionMeta.textContent.includes("罰則題")) {
      els.questionMeta.textContent = `${els.questionMeta.textContent} · 罰則題`;
    }

    if (imageQuestionIds.has(activeQuestion.id) && !els.sourceText.textContent.includes("此題含圖片")) {
      els.sourceText.textContent = `${els.sourceText.textContent} 此題含圖片、標誌、標線或圖示。`;
    }

    if (killerQuestionIds.has(activeQuestion.id) && !els.sourceText.textContent.includes("殺手題精選")) {
      els.sourceText.textContent = `${els.sourceText.textContent} 此題列入殺手題精選，依公開易錯主題延伸整理。`;
    }

    if (penaltyQuestionIds.has(activeQuestion.id) && !els.sourceText.textContent.includes("罰則題集合")) {
      els.sourceText.textContent = `${els.sourceText.textContent} 此題列入罰則題集合，依罰鍰金額、吊扣、吊銷等題庫文字整理。`;
    }
  };

  renderEmpty = function () {
    originalRenderEmpty();
    if (state.scope === "image") {
      els.emptyStateTitle.textContent = "圖片題沒有符合條件的題目";
      els.emptyStateText.textContent = "換個分類或清除搜尋後再試一次。";
    } else if (state.scope === "killer") {
      els.emptyStateTitle.textContent = "殺手題沒有符合條件的題目";
      els.emptyStateText.textContent = "換個分類或清除搜尋後再試一次。";
    } else if (state.scope === "penalty") {
      els.emptyStateTitle.textContent = "罰則題沒有符合條件的題目";
      els.emptyStateText.textContent = "換個分類或清除搜尋後再試一次。";
    }
  };

  imageButton.addEventListener("click", () => setScope("image"));
  killerButton.addEventListener("click", () => setScope("killer"));
  penaltyButton.addEventListener("click", () => setScope("penalty"));
  renderStats();
})();
