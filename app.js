const questions = Array.isArray(window.OFFICIAL_QUESTIONS) ? window.OFFICIAL_QUESTIONS : [];
const WRONG_BOOK_KEY = "motorcycle-license-wrong-book";
const PROGRESS_KEY = "motorcycle-license-progress";
const questionIds = new Set(questions.map((question) => question.id));

const els = {
  searchInput: document.getElementById("searchInput"),
  categoryFilter: document.getElementById("categoryFilter"),
  allQuestionsButton: document.getElementById("allQuestionsButton"),
  wrongBookButton: document.getElementById("wrongBookButton"),
  orderedModeButton: document.getElementById("orderedModeButton"),
  randomModeButton: document.getElementById("randomModeButton"),
  answeredCount: document.getElementById("answeredCount"),
  correctRate: document.getElementById("correctRate"),
  correctCount: document.getElementById("correctCount"),
  filteredCount: document.getElementById("filteredCount"),
  wrongBookCount: document.getElementById("wrongBookCount"),
  shuffleButton: document.getElementById("shuffleButton"),
  resetStatsButton: document.getElementById("resetStatsButton"),
  clearWrongBookButton: document.getElementById("clearWrongBookButton"),
  previousButton: document.getElementById("previousButton"),
  nextButton: document.getElementById("nextButton"),
  questionMeta: document.getElementById("questionMeta"),
  questionPosition: document.getElementById("questionPosition"),
  questionCard: document.getElementById("questionCard"),
  emptyState: document.getElementById("emptyState"),
  emptyStateTitle: document.getElementById("emptyStateTitle"),
  emptyStateText: document.getElementById("emptyStateText"),
  questionContent: document.getElementById("questionContent"),
  questionImageWrap: document.getElementById("questionImageWrap"),
  questionImage: document.getElementById("questionImage"),
  questionText: document.getElementById("questionText"),
  optionsList: document.getElementById("optionsList"),
  feedbackBox: document.getElementById("feedbackBox"),
  videoBox: document.getElementById("videoBox"),
  videoLink: document.getElementById("videoLink"),
  sourceText: document.getElementById("sourceText"),
};

const state = {
  filtered: [],
  currentIndex: 0,
  mode: "ordered",
  scope: "all",
  selectedIndex: null,
  answered: false,
  feedbackNote: "",
  wrongBookIds: loadWrongBookIds(),
  progressByScope: loadProgressByScope(),
  stats: {
    answered: 0,
    correct: 0,
  },
};

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function loadWrongBookIds() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(WRONG_BOOK_KEY) || "[]");
    if (!Array.isArray(stored)) {
      return new Set();
    }
    return new Set(stored.filter((id) => questionIds.has(id)));
  } catch {
    return new Set();
  }
}

function saveWrongBookIds() {
  try {
    window.localStorage.setItem(WRONG_BOOK_KEY, JSON.stringify(Array.from(state.wrongBookIds)));
  } catch {
    // The site still works if browser storage is unavailable.
  }
}

function emptyProgress() {
  return {
    all: null,
    wrongBook: null,
  };
}

function loadProgressByScope() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(PROGRESS_KEY) || "{}");
    const progress = emptyProgress();
    Object.keys(progress).forEach((scope) => {
      if (questionIds.has(stored?.[scope])) {
        progress[scope] = stored[scope];
      }
    });
    return progress;
  } catch {
    return emptyProgress();
  }
}

function saveProgressByScope() {
  try {
    window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(state.progressByScope));
  } catch {
    // The site still works if browser storage is unavailable.
  }
}

function rememberProgress() {
  const question = currentQuestion();
  if (!question || !Object.prototype.hasOwnProperty.call(state.progressByScope, state.scope)) {
    return;
  }
  state.progressByScope[state.scope] = question.id;
  saveProgressByScope();
}

function restoreProgressIndex() {
  const savedId = state.progressByScope[state.scope];
  const savedIndex = savedId ? state.filtered.findIndex((question) => question.id === savedId) : -1;
  state.currentIndex = savedIndex >= 0 ? savedIndex : 0;
}

function searchableText(question) {
  return normalize([
    question.id,
    question.category,
    question.question,
    ...(question.options || []),
    question.source?.officialNumber,
    question.videoId,
  ].join(" "));
}

function categoryCounts() {
  return questions.reduce((counts, question) => {
    counts.set(question.category, (counts.get(question.category) || 0) + 1);
    return counts;
  }, new Map());
}

function populateCategories() {
  const counts = categoryCounts();
  const sorted = Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0], "zh-Hant"));
  els.categoryFilter.innerHTML = "";

  const allOption = document.createElement("option");
  allOption.value = "";
  allOption.textContent = `全部分類（${questions.length}）`;
  els.categoryFilter.appendChild(allOption);

  sorted.forEach(([category, count]) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = `${category}（${count}）`;
    els.categoryFilter.appendChild(option);
  });
}

function matchingQuestions() {
  const keyword = normalize(els.searchInput.value);
  const category = els.categoryFilter.value;

  return questions.filter((question) => {
    const matchesScope = state.scope !== "wrongBook" || state.wrongBookIds.has(question.id);
    const matchesCategory = !category || question.category === category;
    const matchesKeyword = !keyword || searchableText(question).includes(keyword);
    return matchesScope && matchesCategory && matchesKeyword;
  });
}

function applyFilters(keepCurrent = false) {
  const previousId = state.filtered[state.currentIndex]?.id;
  state.filtered = matchingQuestions();

  if (keepCurrent && previousId) {
    const nextIndex = state.filtered.findIndex((question) => question.id === previousId);
    if (nextIndex >= 0) {
      state.currentIndex = nextIndex;
    } else {
      restoreProgressIndex();
    }
  } else {
    restoreProgressIndex();
  }

  clearAnswer();
  render();
}

function clearAnswer() {
  state.selectedIndex = null;
  state.answered = false;
  state.feedbackNote = "";
}

function currentQuestion() {
  return state.filtered[state.currentIndex] || null;
}

function setMode(mode) {
  state.mode = mode;
  els.orderedModeButton.classList.toggle("is-active", mode === "ordered");
  els.randomModeButton.classList.toggle("is-active", mode === "random");
}

function setScope(scope) {
  rememberProgress();
  state.scope = scope;
  els.allQuestionsButton.classList.toggle("is-active", scope === "all");
  els.wrongBookButton.classList.toggle("is-active", scope === "wrongBook");
  applyFilters(false);
}

function randomIndex() {
  if (state.filtered.length <= 1) {
    return 0;
  }
  let next = state.currentIndex;
  while (next === state.currentIndex) {
    next = Math.floor(Math.random() * state.filtered.length);
  }
  return next;
}

function goToQuestion(index) {
  if (!state.filtered.length) {
    state.currentIndex = 0;
  } else {
    state.currentIndex = (index + state.filtered.length) % state.filtered.length;
  }
  clearAnswer();
  rememberProgress();
  render();
}

function goNext() {
  const question = currentQuestion();
  if (state.scope === "wrongBook" && question && state.answered && !state.wrongBookIds.has(question.id)) {
    state.filtered = matchingQuestions();
    goToQuestion(state.currentIndex);
    return;
  }

  const nextIndex = state.mode === "random" ? randomIndex() : state.currentIndex + 1;
  goToQuestion(nextIndex);
}

function goPrevious() {
  goToQuestion(state.currentIndex - 1);
}

function chooseOption(index) {
  if (state.answered) {
    return;
  }

  const question = currentQuestion();
  if (!question) {
    return;
  }

  state.selectedIndex = index;
  state.answered = true;
  state.stats.answered += 1;
  const isCorrect = index === question.answerIndex;
  const wasInWrongBook = state.wrongBookIds.has(question.id);

  if (isCorrect) {
    state.stats.correct += 1;
    if (wasInWrongBook) {
      state.wrongBookIds.delete(question.id);
      saveWrongBookIds();
      state.feedbackNote = "答對了。這題已從錯題本移除。";
    }
  } else {
    state.wrongBookIds.add(question.id);
    saveWrongBookIds();
    state.feedbackNote = wasInWrongBook ? "答錯了。這題會繼續留在錯題本。" : "答錯了。這題已加入錯題本。";
  }
  rememberProgress();
  render();
}

function renderStats() {
  const { answered, correct } = state.stats;
  const rate = answered ? Math.round((correct / answered) * 100) : 0;
  els.answeredCount.textContent = answered;
  els.correctCount.textContent = correct;
  els.correctRate.textContent = `${rate}%`;
  els.filteredCount.textContent = state.filtered.length;
  els.wrongBookCount.textContent = state.wrongBookIds.size;
  els.wrongBookButton.textContent = `錯題本（${state.wrongBookIds.size}）`;
  els.clearWrongBookButton.disabled = state.wrongBookIds.size === 0;
}

function optionLabel(index) {
  return ["A", "B", "C"][index] || String(index + 1);
}

function renderOptions(question) {
  els.optionsList.innerHTML = "";

  question.options.forEach((option, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "option-button";
    button.disabled = state.answered;
    button.addEventListener("click", () => chooseOption(index));

    if (state.answered) {
      if (index === question.answerIndex) {
        button.classList.add("is-correct");
      } else if (index === state.selectedIndex) {
        button.classList.add("is-wrong");
      } else {
        button.classList.add("is-dimmed");
      }
    }

    const key = document.createElement("span");
    key.className = "option-key";
    key.textContent = optionLabel(index);

    const text = document.createElement("span");
    text.className = "option-text";
    text.textContent = option;

    button.append(key, text);
    els.optionsList.appendChild(button);
  });
}

function renderFeedback(question) {
  if (!state.answered) {
    els.feedbackBox.hidden = true;
    els.feedbackBox.textContent = "";
    els.feedbackBox.className = "feedback-box";
    return;
  }

  const isCorrect = state.selectedIndex === question.answerIndex;
  const correctText = question.options[question.answerIndex];
  els.feedbackBox.hidden = false;
  els.feedbackBox.className = `feedback-box ${isCorrect ? "is-correct" : "is-wrong"}`;
  if (state.feedbackNote) {
    els.feedbackBox.textContent = isCorrect
      ? state.feedbackNote
      : `${state.feedbackNote} 正確答案是 ${optionLabel(question.answerIndex)}：${correctText}`;
    return;
  }
  els.feedbackBox.textContent = isCorrect ? "答對了。這題可以直接往下一題。" : `答錯了。正確答案是 ${optionLabel(question.answerIndex)}：${correctText}`;
}

function renderQuestion(question) {
  els.emptyState.hidden = true;
  els.questionContent.hidden = false;

  const wrongBookMark = state.wrongBookIds.has(question.id) ? " · 錯題本" : "";
  els.questionMeta.textContent = `${question.category} · ${question.id}${wrongBookMark}`;
  els.questionPosition.textContent = `${state.currentIndex + 1} / ${state.filtered.length}`;
  els.questionText.textContent = question.question;
  els.sourceText.textContent = `${question.source.file}，官方題號 ${question.source.officialNumber}，PDF 第 ${question.source.page} 頁。`;

  if (question.image) {
    els.questionImage.src = question.image;
    els.questionImage.alt = `${question.id} 題圖`;
    els.questionImageWrap.hidden = false;
  } else {
    els.questionImage.removeAttribute("src");
    els.questionImage.alt = "";
    els.questionImageWrap.hidden = true;
  }

  if (question.videoUrl) {
    els.videoLink.href = question.videoUrl;
    els.videoBox.hidden = false;
  } else {
    els.videoLink.removeAttribute("href");
    els.videoBox.hidden = true;
  }

  renderOptions(question);
  renderFeedback(question);
}

function renderEmpty() {
  if (state.scope === "wrongBook" && state.wrongBookIds.size === 0) {
    els.emptyStateTitle.textContent = "錯題本目前是空的";
    els.emptyStateText.textContent = "答錯的題目會自動放進這裡。";
  } else if (state.scope === "wrongBook") {
    els.emptyStateTitle.textContent = "錯題本沒有符合條件的題目";
    els.emptyStateText.textContent = "換個關鍵字或分類後再練習。";
  } else {
    els.emptyStateTitle.textContent = "找不到符合條件的題目";
    els.emptyStateText.textContent = "換個關鍵字或分類後再練習。";
  }
  els.questionMeta.textContent = "沒有題目";
  els.questionPosition.textContent = "";
  els.sourceText.textContent = "";
  els.questionContent.hidden = true;
  els.emptyState.hidden = false;
}

function render() {
  renderStats();
  const question = currentQuestion();
  if (!question) {
    renderEmpty();
    return;
  }
  renderQuestion(question);
}

function resetStats() {
  state.stats.answered = 0;
  state.stats.correct = 0;
  clearAnswer();
  render();
}

function clearWrongBook() {
  if (!state.wrongBookIds.size) {
    return;
  }
  if (!window.confirm("確定清空錯題本？")) {
    return;
  }
  state.wrongBookIds.clear();
  state.progressByScope.wrongBook = null;
  saveWrongBookIds();
  saveProgressByScope();
  if (state.scope === "wrongBook") {
    applyFilters(false);
  } else {
    render();
  }
}

function init() {
  populateCategories();
  setMode("ordered");
  setScope("all");

  els.searchInput.addEventListener("input", () => applyFilters(true));
  els.categoryFilter.addEventListener("change", () => applyFilters(false));
  els.allQuestionsButton.addEventListener("click", () => setScope("all"));
  els.wrongBookButton.addEventListener("click", () => setScope("wrongBook"));
  els.orderedModeButton.addEventListener("click", () => setMode("ordered"));
  els.randomModeButton.addEventListener("click", () => setMode("random"));
  els.shuffleButton.addEventListener("click", () => goToQuestion(randomIndex()));
  els.resetStatsButton.addEventListener("click", resetStats);
  els.clearWrongBookButton.addEventListener("click", clearWrongBook);
  els.previousButton.addEventListener("click", goPrevious);
  els.nextButton.addEventListener("click", goNext);
}

init();
