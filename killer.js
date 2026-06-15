(function () {
  const existingKillerButton = document.getElementById("killerButton");

  if (existingKillerButton && typeof els !== "undefined" && els.killerButton) {
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

    .segment {
      min-width: 0;
      padding: 8px 8px;
      line-height: 1.25;
      overflow-wrap: anywhere;
    }
  `;
  document.head.appendChild(style);

  const killerButton = existingKillerButton || document.createElement("button");
  killerButton.id = "killerButton";
  killerButton.className = "segment";
  killerButton.type = "button";
  killerButton.textContent = "殺手題";
  rangeGroup.classList.add("is-three");
  if (!existingKillerButton) {
    rangeGroup.insertBefore(killerButton, wrongBookButton);
  }

  const hint = rangeGroup.parentElement.querySelector(".panel-hint");
  if (hint) {
    hint.textContent = "殺手題是依公開易錯主題延伸精選；答錯會自動加入錯題本。";
  }

  els.killerButton = killerButton;
  if (!state.progressByScope || typeof state.progressByScope !== "object") {
    state.progressByScope = {};
  }
  if (!("killer" in state.progressByScope)) {
    state.progressByScope.killer = null;
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
        (state.scope === "killer" && killerQuestionIds.has(question.id)) ||
        (state.scope === "wrongBook" && state.wrongBookIds.has(question.id));

      return matchesCategory && matchesSearch && matchesScope;
    });
  };

  setScope = function (scope) {
    originalSetScope(scope);
    allButton.classList.toggle("is-active", scope === "all");
    killerButton.classList.toggle("is-active", scope === "killer");
    wrongBookButton.classList.toggle("is-active", scope === "wrongBook");
  };

  renderStats = function () {
    originalRenderStats();
    killerButton.textContent = `殺手題（${killerQuestionIds.size}）`;
  };

  renderQuestion = function (question) {
    originalRenderQuestion(question);
    const activeQuestion = question || state.filtered[state.currentIndex];
    if (!activeQuestion || !killerQuestionIds.has(activeQuestion.id)) {
      return;
    }

    if (!els.questionMeta.textContent.includes("殺手題")) {
      els.questionMeta.textContent = `${els.questionMeta.textContent} · 殺手題`;
    }

    if (!els.sourceText.textContent.includes("殺手題精選")) {
      els.sourceText.textContent = `${els.sourceText.textContent} 此題列入殺手題精選，依公開易錯主題延伸整理。`;
    }
  };

  renderEmpty = function () {
    originalRenderEmpty();
    if (state.scope === "killer") {
      els.emptyStateTitle.textContent = "殺手題沒有符合條件的題目";
      els.emptyStateText.textContent = "換個分類或清除搜尋後再試一次。";
    }
  };

  killerButton.addEventListener("click", () => setScope("killer"));
  renderStats();
})();
