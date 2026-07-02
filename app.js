/* ==========================================
   MEDSTUDY HUB: CORE APPLICATION LOGIC
   ========================================== */

document.addEventListener("DOMContentLoaded", () => {
  // Safe localStorage wrapper to prevent SecurityError when running under local file:// protocol
  const safeStorage = {
    memoryStore: {},
    getItem(key) {
      try {
        const val = localStorage.getItem(key);
        return val;
      } catch (e) {
        console.warn(`localStorage blocked for key '${key}', using memory fallback:`, e);
        return this.memoryStore[key] || null;
      }
    },
    setItem(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch (e) {
        console.warn(`localStorage write blocked for key '${key}', saving in memory:`, e);
        this.memoryStore[key] = String(value);
      }
    }
  };

  // Helper helper to parse JSON safely
  function safeJsonParse(jsonStr, fallback) {
    if (!jsonStr) return fallback;
    try {
      return JSON.parse(jsonStr) || fallback;
    } catch (e) {
      return fallback;
    }
  }

  // --- APPLICATION STATE ---
  const state = {
    xp: parseInt(safeStorage.getItem("med_xp")) || 0,
    level: parseInt(safeStorage.getItem("med_level")) || 1,
    completedTopics: safeJsonParse(safeStorage.getItem("med_completed_topics"), []),
    studiedCardsCount: parseInt(safeStorage.getItem("med_cards_count")) || 0,
    solvedCasesCount: parseInt(safeStorage.getItem("med_cases_count")) || 0,
    userResources: safeJsonParse(safeStorage.getItem("med_resources"), []),
    
    // Active modules states
    activeView: "dashboard",
    
    // System Workspace state
    activeSystemId: "cardiovascular",
    activeSubjectId: "anatomy",

    // Flashcards state
    currentDeck: [],
    currentCardIndex: 0,
    
    // Quiz state
    activeQuizQuestions: [],
    currentQuizQuestionIndex: 0,
    quizScore: 0,
    quizTimerInterval: null,
    quizSeconds: 0,

    // Clinical Case state
    activeCase: null,
    activeCaseStepIndex: 0,
    casePointsEarned: 150,

    // 3D Anatomy state
    selectedOrganId: null,

    // Clinical Quest state
    currentQuestIndex: 0,
    currentQuestSymptomCount: 1,
    questCompleted: false
  };

  // --- RANKS CONFIGURATION ---
  const RANKS = [
    { threshold: 0, title: "Младший интерн 🧑‍⚕️" },
    { threshold: 500, title: "Старший интерн 🩺" },
    { threshold: 1200, title: "Врач-ординатор 🏥" },
    { threshold: 2500, title: "Ассистент кафедры 🔬" },
    { threshold: 4500, title: "Доцент 🧠" },
    { threshold: 7000, title: "Профессор медицины 👑" }
  ];

  // --- DOM ELEMENTS CACHE ---
  const views = document.querySelectorAll(".app-view");
  const menuItems = document.querySelectorAll(".menu-item");
  const globalSearchInput = document.getElementById("global-search");
  
  // XP Widget
  const userLevelEl = document.getElementById("user-level");
  const userRankEl = document.getElementById("user-rank");
  const xpTextEl = document.getElementById("xp-text");
  const xpFillEl = document.getElementById("xp-fill");
  const headerXpEl = document.getElementById("header-xp");
  const headerCompletedEl = document.getElementById("header-completed-topics");

  // Dashboard elements
  const dashXpEl = document.getElementById("dash-xp");
  const dashCardsEl = document.getElementById("dash-cards-studied");
  const dashCasesEl = document.getElementById("dash-cases-solved");
  const dashMnemonicEl = document.getElementById("dash-mnemonic-text");
  const dashCaseTitleEl = document.getElementById("dash-case-title");
  const dashCaseDescEl = document.getElementById("dash-case-desc");
  const dashCaseDiffEl = document.getElementById("dash-case-diff");
  const dashStartCaseBtn = document.getElementById("dash-start-case-btn");

  // System Workspace elements
  const systemsGrid = document.getElementById("systems-grid-container");
  const systemWorkspace = document.getElementById("system-workspace");
  const wsSystemIcon = document.getElementById("ws-system-icon");
  const wsSystemName = document.getElementById("ws-system-name");
  const wsSystemDesc = document.getElementById("ws-system-description");
  const wsSubjectTabs = document.getElementById("ws-subject-tabs");
  const wsTopicTitle = document.getElementById("ws-topic-title");
  const wsTopicSources = document.getElementById("ws-topic-sources");
  const wsTopicLogicalLink = document.getElementById("ws-topic-logical-link");
  const wsTopicBody = document.getElementById("ws-topic-body");
  const btnMarkTopicComplete = document.getElementById("btn-mark-topic-complete");
  const wsPracticeCardsBtn = document.getElementById("ws-practice-cards-btn");
  const wsPracticeQuizBtn = document.getElementById("ws-practice-quiz-btn");

  // Subjects Workspace elements
  const subjectsGrid = document.getElementById("subjects-grid-container");
  const subjectWorkspace = document.getElementById("subject-workspace");
  const wsSubjectIcon = document.getElementById("ws-subject-icon");
  const wsSubjectName = document.getElementById("ws-subject-name");
  const subjectTopicsBySystem = document.getElementById("subject-topics-by-system");

  // Flashcard elements
  const flashcardElement = document.getElementById("flashcard-element");
  const fcQuestionText = document.getElementById("fc-question-text");
  const fcAnswerText = document.getElementById("fc-answer-text");
  const fcFrontSystem = document.getElementById("fc-front-system");
  const fcFrontSubject = document.getElementById("fc-front-subject");
  const fcBackSystem = document.getElementById("fc-back-system");
  const fcBackSubject = document.getElementById("fc-back-subject");
  const fcBtnRepeat = document.getElementById("fc-btn-repeat");
  const fcBtnKnow = document.getElementById("fc-btn-know");
  const fcDeckStatus = document.getElementById("fc-deck-status");
  const fcFilterSystem = document.getElementById("fc-filter-system");
  const fcFilterSubject = document.getElementById("fc-filter-subject");
  const fcFilterType = document.getElementById("fc-filter-type");

  // Quiz elements
  const quizSetupPanel = document.getElementById("quiz-setup-panel");
  const quizActivePanel = document.getElementById("quiz-active-panel");
  const quizResultsPanel = document.getElementById("quiz-results-panel");
  const qzSetupSystem = document.getElementById("qz-setup-system");
  const qzSetupSubject = document.getElementById("qz-setup-subject");
  const btnStartQuiz = document.getElementById("btn-start-quiz");
  const qzProgressFill = document.getElementById("qz-progress-fill");
  const qzQuestionNumber = document.getElementById("qz-question-number");
  const qzTimer = document.getElementById("qz-timer");
  const qzQuestionTitle = document.getElementById("qz-question-title");
  const qzOptionsList = document.getElementById("qz-options-list");
  const qzExplanationBox = document.getElementById("qz-explanation-box");
  const qzExplanationTitle = document.getElementById("qz-explanation-title");
  const qzExplanationText = document.getElementById("qz-explanation-text");
  const qzBtnNext = document.getElementById("qz-btn-next");
  const qzResultCorrect = document.getElementById("qz-result-correct");
  const qzResultTotal = document.getElementById("qz-result-total");
  const qzResultXp = document.getElementById("qz-result-xp");
  const qzBtnRestart = document.getElementById("qz-btn-restart");
  const qzBtnToDashboard = document.getElementById("qz-btn-to-dashboard");

  // Clinical Cases elements
  const casesListContainer = document.getElementById("cases-list-container");
  const caseActivePanel = document.getElementById("case-active-panel");
  const caseCompletedPanel = document.getElementById("case-completed-panel");
  const caseWorkspaceTitle = document.getElementById("case-workspace-title");
  const casePatientHistory = document.getElementById("case-patient-history");
  const caseStepIndicator = document.getElementById("case-step-indicator");
  const caseStepQuestion = document.getElementById("case-step-question");
  const caseStepOptions = document.getElementById("case-step-options");
  const caseStepFeedback = document.getElementById("case-step-feedback");
  const caseStepFeedbackTitle = document.getElementById("case-step-feedback-title");
  const caseStepFeedbackText = document.getElementById("case-step-feedback-text");
  const caseBtnNextStep = document.getElementById("case-btn-next-step");
  const caseCompletionXp = document.getElementById("case-completion-xp");

  // Library elements
  const booksListContainer = document.getElementById("books-list-container");
  const addResourceForm = document.getElementById("add-resource-form");
  const userResourcesContainer = document.getElementById("user-resources-container");
  const noResourcesText = document.getElementById("no-resources-text");

  // Search Results elements
  const searchResultsView = document.getElementById("view-search-results");
  const searchResultsContainer = document.getElementById("search-results-container");
  const searchQueryText = document.getElementById("search-query-text");

  // Clinical Quest elements
  const questStageText = document.getElementById("quest-stage-text");
  const questProgressFill = document.getElementById("quest-progress-fill");
  const questSymptomsContainer = document.getElementById("quest-symptoms-container");
  const questXpValue = document.getElementById("quest-xp-value");
  const questOptionsContainer = document.getElementById("quest-options-container");
  const questStatusMessage = document.getElementById("quest-status-message");
  const questExplanationContainer = document.getElementById("quest-explanation-container");
  const questExplanationAlert = document.getElementById("quest-explanation-alert");
  const questExplanationText = document.getElementById("quest-explanation-text");
  const questNextBtn = document.getElementById("quest-next-btn");
  const questInteractionContainer = document.getElementById("quest-interaction-container");


  // --- INIT APPLICATION ---
  function init() {
    setupLockScreen();
    populateSystemDropdowns();
    updateProfileUI();
    loadDashboardData();
    setupNavigation();
    setupSearch();
    renderSystemsList();
    renderSubjectsList();
    setupFlashcardsListeners();
    setupQuizListeners();
    renderClinicalCasesList();
    setupCasesListeners();
    renderBooksList();
    renderUserResources();
    setupLibraryListeners();
    setup3DAnatomy();
    setupQuestListeners();
    initConceptMap();
  }

  // Populate dynamic select dropdowns with all systems from data.js
  function populateSystemDropdowns() {
    const selectors = [fcFilterSystem, qzSetupSystem];
    selectors.forEach(sel => {
      if (!sel) return;
      sel.innerHTML = '<option value="all">Все системы</option>';
      Object.values(MedData.systems).forEach(sys => {
        const opt = document.createElement("option");
        opt.value = sys.id;
        opt.textContent = sys.name;
        sel.appendChild(opt);
      });
    });
  }

  // --- GAMIFICATION / XP MANAGEMENT ---
  function addXP(amount) {
    state.xp += amount;
    
    // Level Up Check: level-up threshold is level * 500
    const threshold = state.level * 500;
    if (state.xp >= threshold) {
      state.xp -= threshold;
      state.level += 1;
      showLevelUpNotification(state.level);
    }
    
    safeStorage.setItem("med_xp", state.xp);
    safeStorage.setItem("med_level", state.level);
    
    updateProfileUI();
    loadDashboardData();
  }

  function updateProfileUI() {
    userLevelEl.textContent = state.level;
    headerXpEl.textContent = state.xp + (state.level - 1) * 500;
    
    // Find rank
    const totalXp = state.xp + (state.level - 1) * 500;
    let activeRank = RANKS[0].title;
    for (let i = RANKS.length - 1; i >= 0; i--) {
      if (totalXp >= RANKS[i].threshold) {
        activeRank = RANKS[i].title;
        break;
      }
    }
    userRankEl.textContent = activeRank;
    
    // Progress bar
    const threshold = state.level * 500;
    const progressPercent = Math.min(100, (state.xp / threshold) * 100);
    xpFillEl.style.width = `${progressPercent}%`;
    xpTextEl.textContent = `${state.xp} / ${threshold} XP`;
    
    // Header completed topics
    headerCompletedEl.textContent = state.completedTopics.length;
  }

  function showLevelUpNotification(newLevel) {
    const levelUpToast = document.createElement("div");
    levelUpToast.className = "glass-panel";
    levelUpToast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 20px 30px;
      border-color: var(--accent-cyan);
      box-shadow: var(--glow-cyan);
      z-index: 9999;
      animation: slide-up 0.5s ease-out;
      text-align: center;
    `;
    levelUpToast.innerHTML = `
      <h3 style="color:var(--accent-cyan); font-family:var(--font-heading); margin-bottom:8px;">🎉 НОВЫЙ УРОВЕНЬ! 🎉</h3>
      <p style="font-size:14px;">Вы достигли <b>уровня ${newLevel}</b>! Продолжайте в том же духе.</p>
    `;
    document.body.appendChild(levelUpToast);
    
    setTimeout(() => {
      levelUpToast.style.animation = "fade-in 0.5s reverse ease-in";
      setTimeout(() => levelUpToast.remove(), 500);
    }, 4000);
  }

  // --- NAVIGATION (Routing) ---
  function setupNavigation() {
    menuItems.forEach(item => {
      item.addEventListener("click", (e) => {
        e.preventDefault();
        const targetView = item.getAttribute("data-view");
        navigateToView(targetView);
      });
    });

    // Handle internal redirects
    const systemDashCard = document.getElementById("dash-card-systems");
    if (systemDashCard) {
      systemDashCard.addEventListener("click", () => navigateToView("systems"));
    }
    
    const mnemonicDashCard = document.getElementById("dash-card-mnemonics");
    if (mnemonicDashCard) {
      mnemonicDashCard.addEventListener("click", () => {
        fcFilterType.value = "mnemonic";
        navigateToView("flashcards");
      });
    }
    
    // System workspace back button
    document.querySelectorAll(".back-to-systems-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        navigateToView("systems");
      });
    });

    // Subject workspace back button
    document.querySelectorAll(".back-to-subjects-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        navigateToView("subjects");
      });
    });

    // Search back buttons
    document.querySelectorAll(".back-to-dashboard-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        navigateToView("dashboard");
        globalSearchInput.value = "";
      });
    });
  }

  function navigateToView(viewId) {
    state.activeView = viewId;
    
    // Update menu items active class
    menuItems.forEach(item => {
      if (item.getAttribute("data-view") === viewId) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });

    // Hide all views
    views.forEach(view => {
      view.classList.add("hidden");
    });
    if (searchResultsView) {
      searchResultsView.classList.add("hidden");
    }

    // Show targets
    const targetEl = document.getElementById(`view-${viewId}`);
    if (targetEl) {
      targetEl.classList.remove("hidden");
    }

    // Trigger modules loading
    if (viewId === "dashboard") {
      loadDashboardData();
    } else if (viewId === "flashcards") {
      loadFlashcardDeck();
    } else if (viewId === "quizzes") {
      resetQuizUI();
    } else if (viewId === "cases") {
      closeCaseWorkspace();
      renderClinicalCasesList();
    } else if (viewId === "anatomy-3d") {
      if (typeof selectOrgan === "function" && !state.selectedOrganId) {
        selectOrgan("brain");
      }
    } else if (viewId === "clinical-quest") {
      startQuestSession();
    } else if (viewId === "concept-map") {
      initConceptMap();
    }
  }

  // --- SEARCH ENGINE ---
  function setupSearch() {
    if (globalSearchInput) {
      globalSearchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          const query = globalSearchInput.value.trim().toLowerCase();
          if (query.length > 0) {
            executeSearch(query);
          }
        }
      });
    }
  }

  function executeSearch(query) {
    if (!searchResultsView || !searchResultsContainer || !searchQueryText) return;
    
    searchQueryText.textContent = `"${query}"`;
    searchResultsContainer.innerHTML = "";
    
    // Hide all views and show search view
    views.forEach(v => v.classList.add("hidden"));
    searchResultsView.classList.remove("hidden");
    
    let resultsCount = 0;

    // Search in topics
    MedData.topics.forEach(topic => {
      if (topic.title.toLowerCase().includes(query) || topic.summary.toLowerCase().includes(query) || topic.logicalConnection.toLowerCase().includes(query)) {
        resultsCount++;
        const systemName = MedData.systems[topic.systemId].name;
        const subjectName = MedData.subjects[topic.subjectId].name;
        
        const card = document.createElement("div");
        card.className = "search-result-card glass-panel";
        card.innerHTML = `
          <div class="result-breadcrumbs">${systemName} • ${subjectName}</div>
          <h3>${topic.title}</h3>
          <p>${topic.logicalConnection}</p>
        `;
        card.addEventListener("click", () => {
          // Open system workspace with this topic
          state.activeSystemId = topic.systemId;
          state.activeSubjectId = topic.subjectId;
          navigateToView("systems");
          openSystemWorkspace(topic.systemId);
        });
        searchResultsContainer.appendChild(card);
      }
    });

    // Search in flashcards
    MedData.flashcards.forEach(cardData => {
      if (cardData.question.toLowerCase().includes(query) || cardData.answer.toLowerCase().includes(query)) {
        resultsCount++;
        const systemName = MedData.systems[cardData.systemId].name;
        const subjectName = MedData.subjects[cardData.subjectId].name;
        
        const card = document.createElement("div");
        card.className = "search-result-card glass-panel";
        card.innerHTML = `
          <div class="result-breadcrumbs">Карточка • ${systemName} • ${subjectName}</div>
          <h3>Вопрос: ${cardData.question}</h3>
          <p>Ответ: ${cardData.answer.replace(/<[^>]*>/g, "")}</p>
        `;
        card.addEventListener("click", () => {
          fcFilterSystem.value = cardData.systemId;
          fcFilterSubject.value = cardData.subjectId;
          navigateToView("flashcards");
        });
        searchResultsContainer.appendChild(card);
      }
    });

    if (resultsCount === 0) {
      searchResultsContainer.innerHTML = `
        <div style="text-align:center; padding: 40px; color: var(--text-muted);">
          <span style="font-size:40px;">🔍</span>
          <p style="margin-top:15px;">Ничего не найдено по вашему запросу. Попробуйте ввести другие ключевые слова.</p>
        </div>
      `;
    }
  }

  // --- DASHBOARD MODULE ---
  function loadDashboardData() {
    dashXpEl.textContent = state.xp + (state.level - 1) * 500;
    dashCardsEl.textContent = state.studiedCardsCount;
    dashCasesEl.textContent = state.solvedCasesCount;

    // Dynamically render and update systems progress mini cards in Dashboard
    const miniListEl = document.querySelector(".systems-mini-list");
    if (miniListEl) {
      miniListEl.innerHTML = "";
      Object.values(MedData.systems).forEach(sys => {
        const totalTopics = MedData.topics.filter(t => t.systemId === sys.id).length;
        const completedCount = MedData.topics.filter(t => t.systemId === sys.id && state.completedTopics.includes(t.id)).length;
        const percentage = totalTopics > 0 ? Math.round((completedCount / totalTopics) * 100) : 0;
        
        const item = document.createElement("div");
        item.className = "mini-item";
        item.setAttribute("data-system", sys.id);
        item.innerHTML = `
          <span class="mini-icon">${sys.icon}</span>
          <div class="mini-info">
            <h4>${sys.name}</h4>
            <div class="mini-progress-bar"><div class="mini-progress-fill" style="width:${percentage}%"></div></div>
          </div>
        `;
        item.addEventListener("click", (e) => {
          e.stopPropagation();
          navigateToView("systems");
          openSystemWorkspace(sys.id);
        });
        miniListEl.appendChild(item);
      });
    }

    // Mnemonic of the day
    const mnemonics = MedData.flashcards.filter(fc => fc.type === "mnemonic");
    if (mnemonics.length > 0) {
      // Pick a pseudo-random mnemonic based on date
      const day = new Date().getDate();
      const dailyMnemonic = mnemonics[day % mnemonics.length];
      dashMnemonicEl.innerHTML = `<b>${dailyMnemonic.question}</b><br><br>${dailyMnemonic.answer}`;
    }

    // Recommended clinical case
    if (MedData.clinicalCases.length > 0) {
      const dailyCase = MedData.clinicalCases[0];
      dashCaseTitleEl.textContent = dailyCase.title;
      dashCaseDescEl.textContent = dailyCase.description;
      dashCaseDiffEl.textContent = dailyCase.difficulty;
      
      // Wire button
      dashStartCaseBtn.onclick = () => {
        navigateToView("cases");
        openCaseWorkspace(dailyCase);
      };
    }
  }

  // --- SYSTEMS MODULE ---
  function renderSystemsList() {
    if (!systemsGrid) return;
    systemsGrid.innerHTML = "";
    Object.values(MedData.systems).forEach(system => {
      const totalTopics = MedData.topics.filter(t => t.systemId === system.id).length;
      const completedCount = MedData.topics.filter(t => t.systemId === system.id && state.completedTopics.includes(t.id)).length;
      const progressPercent = totalTopics > 0 ? Math.round((completedCount / totalTopics) * 100) : 0;

      const card = document.createElement("div");
      card.className = "system-card glass-panel";
      card.innerHTML = `
        <div class="card-title-row">
          <span class="sys-icon">${system.icon}</span>
          <h3>${system.name}</h3>
        </div>
        <p class="card-description">${system.description}</p>
        <div class="mini-progress-bar" style="margin-top:10px;"><div class="mini-progress-fill" style="width:${progressPercent}%"></div></div>
        <div class="card-stats-row">
          <span>Прогресс: ${progressPercent}%</span>
          <span>${completedCount} из ${totalTopics} тем</span>
        </div>
      `;
      
      card.addEventListener("click", () => {
        openSystemWorkspace(system.id);
      });
      
      systemsGrid.appendChild(card);
    });
  }

  function openSystemWorkspace(systemId) {
    state.activeSystemId = systemId;
    
    // Navigate to full workspace page
    navigateToView("system-workspace");

    // Populate header info
    const system = MedData.systems[systemId];
    wsSystemIcon.textContent = system.icon;
    wsSystemName.textContent = system.name;
    wsSystemDesc.textContent = system.description;

    // Populate Horizontal Tabs
    wsSubjectTabs.innerHTML = "";
    Object.values(MedData.subjects).forEach(subject => {
      // Check if topic exists for this system and subject
      const hasTopic = MedData.topics.some(t => t.systemId === systemId && t.subjectId === subject.id);
      
      const tab = document.createElement("div");
      tab.className = `subject-tab ${state.activeSubjectId === subject.id ? "active" : ""} ${!hasTopic ? "disabled" : ""}`;
      tab.style.opacity = hasTopic ? "1" : "0.5";
      tab.innerHTML = `<span>${subject.icon}</span> ${subject.name}`;
      
      if (hasTopic) {
        tab.addEventListener("click", () => {
          // Update active tab styling
          document.querySelectorAll(".subject-tab").forEach(t => t.classList.remove("active"));
          tab.classList.add("active");
          
          state.activeSubjectId = subject.id;
          renderSystemTheoryContent(systemId, subject.id);
        });
      }
      wsSubjectTabs.appendChild(tab);
    });

    // Load active theory
    // Fallback if the selected subject doesn't exist in this system
    const hasActiveTopic = MedData.topics.some(t => t.systemId === systemId && t.subjectId === state.activeSubjectId);
    if (!hasActiveTopic) {
      // Find first available subject that has a topic
      const firstAvail = Object.values(MedData.subjects).find(sub => MedData.topics.some(t => t.systemId === systemId && t.subjectId === sub.id));
      if (firstAvail) {
        state.activeSubjectId = firstAvail.id;
        // Remake tabs to highlight correct active one
        openSystemWorkspace(systemId);
        return;
      }
    }

    renderSystemTheoryContent(systemId, state.activeSubjectId);
  }

  function renderSystemTheoryContent(systemId, subjectId) {
    const topic = MedData.topics.find(t => t.systemId === systemId && t.subjectId === subjectId);
    if (!topic) return;
        wsTopicTitle.textContent = topic.title;
        wsTopicSources.textContent = `Источники: ${topic.sources.join(", ")}`;
        wsTopicLogicalLink.textContent = topic.logicalConnection;
        wsTopicBody.innerHTML = topic.summary;
        applyWikiLinks(wsTopicBody);

        // Re-render LaTeX math formulas if MathJax is loaded
        triggerMathJax();

        // Complete button state
        updateCompleteButtonState(topic.id);

        // Wire practice buttons
        wsPracticeCardsBtn.onclick = () => {
          fcFilterSystem.value = systemId;
          fcFilterSubject.value = subjectId;
          navigateToView("flashcards");
        };

        wsPracticeQuizBtn.onclick = () => {
          qzSetupSystem.value = systemId;
          qzSetupSubject.value = subjectId;
          navigateToView("quizzes");
          // Autostart quiz
          btnStartQuiz.click();
        };

        // Wire complete topic action
        btnMarkTopicComplete.onclick = () => {
          if (!state.completedTopics.includes(topic.id)) {
            state.completedTopics.push(topic.id);
            safeStorage.setItem("med_completed_topics", JSON.stringify(state.completedTopics));
            addXP(100); // 100 XP reward
            updateCompleteButtonState(topic.id);
            renderSystemsList(); // refresh systems progress
          }
        };
      }

      function updateCompleteButtonState(topicId) {
        if (state.completedTopics.includes(topicId)) {
          btnMarkTopicComplete.textContent = "✔ Изучено (+100 XP)";
          btnMarkTopicComplete.className = "btn btn-success btn-sm";
          btnMarkTopicComplete.disabled = true;
        } else {
          btnMarkTopicComplete.textContent = "Отметить как изучено";
          btnMarkTopicComplete.className = "btn btn-outline btn-sm";
          btnMarkTopicComplete.disabled = false;
        }
      }

      // --- SUBJECTS MODULE ---
      function renderSubjectsList() {
        if (!subjectsGrid) return;
        subjectsGrid.innerHTML = "";
        Object.values(MedData.subjects).forEach(subject => {
          const totalTopics = MedData.topics.filter(t => t.subjectId === subject.id).length;

          const card = document.createElement("div");
          card.className = "subject-card glass-panel";
          card.innerHTML = `
            <div class="card-title-row">
              <span class="sub-icon">${subject.icon}</span>
              <h3>${subject.name}</h3>
            </div>
            <p class="card-description">Изучение предмета во всех системах тела человека.</p>
            <div class="card-stats-row" style="margin-top:15px; border-top: 1px solid rgba(255,255,255,0.05); padding-top:10px;">
              <span>Доступно тем: ${totalTopics}</span>
            </div>
          `;
          
          card.addEventListener("click", () => {
            openSubjectWorkspace(subject.id);
          });

          subjectsGrid.appendChild(card);
        });
      }

      function openSubjectWorkspace(subjectId) {
        // Navigate to full subject workspace page
        navigateToView("subject-workspace");

        const subject = MedData.subjects[subjectId];
        wsSubjectIcon.textContent = subject.icon;
        wsSubjectName.textContent = subject.name;

        // Populate topics list grouped by system
        subjectTopicsBySystem.innerHTML = "";
        
        Object.values(MedData.systems).forEach(system => {
          const topics = MedData.topics.filter(t => t.systemId === system.id && t.subjectId === subjectId);
          if (topics.length === 0) return; // skip if no topics

          const sysGroup = document.createElement("div");
          sysGroup.className = "system-group-box";
          sysGroup.innerHTML = `
            <div class="system-group-title">${system.icon} ${system.name}</div>
            <div class="topics-list-mini" id="topics-list-${system.id}-${subjectId}"></div>
          `;
          subjectTopicsBySystem.appendChild(sysGroup);

          const miniList = document.getElementById(`topics-list-${system.id}-${subjectId}`);
          topics.forEach(topic => {
            const item = document.createElement("div");
            item.className = "topic-list-item";
            
            const isComplete = state.completedTopics.includes(topic.id);
            const statusBadge = isComplete ? `<span style="color:var(--accent-green)">✔ Изучено</span>` : `<span style="color:var(--text-dim)">Не начато</span>`;
            
            item.innerHTML = `
              <h4>${topic.title}</h4>
              ${statusBadge}
            `;
            item.addEventListener("click", () => {
              // Open System workspace preselected
              state.activeSystemId = system.id;
              state.activeSubjectId = subjectId;
              navigateToView("systems");
              openSystemWorkspace(system.id);
            });
            miniList.appendChild(item);
          });
        });
      }

      // --- FLASHCARDS MODULE ---
      function setupFlashcardsListeners() {
        if (flashcardElement) {
          flashcardElement.addEventListener("click", () => {
            flashcardElement.classList.toggle("flipped");
          });
        }

        fcFilterSystem.addEventListener("change", loadFlashcardDeck);
        fcFilterSubject.addEventListener("change", loadFlashcardDeck);
        fcFilterType.addEventListener("change", loadFlashcardDeck);

        fcBtnKnow.addEventListener("click", () => {
          addXP(15); // +15 XP per card known
          state.studiedCardsCount++;
          safeStorage.setItem("med_cards_count", state.studiedCardsCount);
          nextFlashcard();
        });

        fcBtnRepeat.addEventListener("click", () => {
          // Re-add to deck tail to repeat
          const currentCard = state.currentDeck[state.currentCardIndex];
          if (currentCard) {
            state.currentDeck.push(currentCard);
          }
          nextFlashcard();
        });
      }

      function loadFlashcardDeck() {
        const sysVal = fcFilterSystem.value;
        const subVal = fcFilterSubject.value;
        const typeVal = fcFilterType.value;

        let filtered = MedData.flashcards;

        if (sysVal !== "all") {
          filtered = filtered.filter(fc => fc.systemId === sysVal);
        }
        if (subVal !== "all") {
          filtered = filtered.filter(fc => fc.subjectId === subVal);
        }
        if (typeVal !== "all") {
          filtered = filtered.filter(fc => fc.type === typeVal);
        }

        // Shuffle active deck
        state.currentDeck = shuffleArray([...filtered]);
        state.currentCardIndex = 0;

        renderFlashcard();
      }

      function renderFlashcard() {
        // Reset flipped state
        flashcardElement.classList.remove("flipped");

        if (state.currentDeck.length === 0) {
          fcQuestionText.textContent = "Нет карточек для выбранных фильтров.";
          fcAnswerText.textContent = "Измените параметры фильтрации вверху.";
          fcFrontSystem.textContent = "—";
          fcFrontSubject.textContent = "—";
          fcBackSystem.textContent = "—";
          fcBackSubject.textContent = "—";
          fcBtnKnow.disabled = true;
          fcBtnRepeat.disabled = true;
          fcDeckStatus.textContent = "0 из 0";
          return;
        }

        fcBtnKnow.disabled = false;
        fcBtnRepeat.disabled = false;

        const card = state.currentDeck[state.currentCardIndex];
        fcQuestionText.innerHTML = card.question;
        fcAnswerText.innerHTML = card.answer;
        
        // Tag labels
        const sysName = MedData.systems[card.systemId].name;
        const subName = MedData.subjects[card.subjectId].name;

        fcFrontSystem.textContent = sysName;
        fcFrontSubject.textContent = subName;
        fcBackSystem.textContent = sysName;
        fcBackSubject.textContent = subName;

        // Status
        fcDeckStatus.textContent = `Карточка ${state.currentCardIndex + 1} из ${state.currentDeck.length}`;

        // Render LaTeX Math formulas
        triggerMathJax();
      }

      function nextFlashcard() {
        if (state.currentDeck.length === 0) return;
        
        // Wait for card flip animation reset before changing text
        flashcardElement.classList.remove("flipped");
        
        setTimeout(() => {
          state.currentCardIndex++;
          if (state.currentCardIndex >= state.currentDeck.length) {
            // Deck finished! Restart or wrap up
            showFlashcardCompletionSummary();
            state.currentCardIndex = 0;
          }
          renderFlashcard();
        }, 200);
      }

      function showFlashcardCompletionSummary() {
        const toast = document.createElement("div");
        toast.className = "glass-panel";
        toast.style.cssText = `
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          padding: 20px 30px;
          border-color: var(--accent-green);
          box-shadow: 0 0 15px rgba(16, 185, 129, 0.4);
          z-index: 9999;
          animation: fade-in 0.5s ease-out;
          text-align: center;
        `;
        toast.innerHTML = `
          <h3 style="color:var(--accent-green); font-family:var(--font-heading); margin-bottom:8px;">🌟 Колода пройдена! 🌟</h3>
          <p style="font-size:14px;">Отличная работа по запоминанию медицинских терминов.</p>
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
      }

      // --- QUIZZES MODULE ---
      function setupQuizListeners() {
        btnStartQuiz.addEventListener("click", startQuiz);
        qzBtnNext.addEventListener("click", nextQuizQuestion);
        qzBtnRestart.addEventListener("click", () => {
          quizResultsPanel.classList.add("hidden");
          quizSetupPanel.classList.remove("hidden");
        });
        qzBtnToDashboard.addEventListener("click", () => {
          navigateToView("dashboard");
        });
      }

      function resetQuizUI() {
        quizSetupPanel.classList.remove("hidden");
        quizActivePanel.classList.add("hidden");
        quizResultsPanel.classList.add("hidden");
        clearInterval(state.quizTimerInterval);
      }

      function startQuiz() {
        const sysVal = qzSetupSystem.value;
        const subVal = qzSetupSubject.value;

        let filtered = MedData.quizzes;
        if (sysVal !== "all") {
          filtered = filtered.filter(q => q.systemId === sysVal);
        }
        if (subVal !== "all") {
          filtered = filtered.filter(q => q.subjectId === subVal);
        }

        if (filtered.length === 0) {
          alert("Для выбранной комбинации фильтров нет доступных тестов. Мы сгенерировали для вас тест из общих медицинских вопросов.");
          filtered = MedData.quizzes; // Fallback to all
        }

        // Limit to max 5 questions for a quick study session
        state.activeQuizQuestions = shuffleArray([...filtered]).slice(0, 5);
        state.currentQuizQuestionIndex = 0;
        state.quizScore = 0;
        state.quizSeconds = 0;

        // UI swap
        quizSetupPanel.classList.add("hidden");
        quizActivePanel.classList.remove("hidden");

        // Start Timer
        qzTimer.textContent = "00:00";
        clearInterval(state.quizTimerInterval);
        state.quizTimerInterval = setInterval(() => {
          state.quizSeconds++;
          const mins = String(Math.floor(state.quizSeconds / 60)).padStart(2, "0");
          const secs = String(state.quizSeconds % 60).padStart(2, "0");
          qzTimer.textContent = `${mins}:${secs}`;
        }, 1000);

        renderQuizQuestion();
      }

      function renderQuizQuestion() {
        // Hide explanation box
        qzExplanationBox.classList.add("hidden");

        const question = state.activeQuizQuestions[state.currentQuizQuestionIndex];
        qzQuestionTitle.innerHTML = question.question;

        // Progress
        const total = state.activeQuizQuestions.length;
        qzQuestionNumber.textContent = `Вопрос ${state.currentQuizQuestionIndex + 1} из ${total}`;
        qzProgressFill.style.width = `${((state.currentQuizQuestionIndex) / total) * 100}%`;

        // Render options
        qzOptionsList.innerHTML = "";
        question.options.forEach((opt, idx) => {
          const btn = document.createElement("button");
          btn.className = "quiz-option-btn";
          btn.textContent = opt;
          btn.addEventListener("click", () => handleQuizAnswerSelection(idx));
          qzOptionsList.appendChild(btn);
        });

        triggerMathJax();
      }

      function handleQuizAnswerSelection(selectedIdx) {
        const question = state.activeQuizQuestions[state.currentQuizQuestionIndex];
        const correctIdx = question.correctAnswer;

        // Lock options
        const optionButtons = qzOptionsList.querySelectorAll(".quiz-option-btn");
        optionButtons.forEach(btn => btn.disabled = true);

        // Apply color highlights
        optionButtons[correctIdx].classList.add("correct");

        const isCorrect = selectedIdx === correctIdx;
        if (isCorrect) {
          state.quizScore++;
          qzExplanationTitle.textContent = "✅ Верно!";
          qzExplanationTitle.className = "explanation-title correct";
        } else {
          optionButtons[selectedIdx].classList.add("incorrect");
          qzExplanationTitle.textContent = "❌ Неверно";
          qzExplanationTitle.className = "explanation-title incorrect";
        }

        // Show explanation
        qzExplanationText.innerHTML = question.explanation;
        qzExplanationBox.classList.remove("hidden");
      }

      function nextQuizQuestion() {
        state.currentQuizQuestionIndex++;
        if (state.currentQuizQuestionIndex >= state.activeQuizQuestions.length) {
          finishQuiz();
        } else {
          renderQuizQuestion();
        }
      }

      function finishQuiz() {
        clearInterval(state.quizTimerInterval);
        quizActivePanel.classList.add("hidden");
        quizResultsPanel.classList.remove("hidden");

        // Calculate score & XP
        const total = state.activeQuizQuestions.length;
        const correct = state.quizScore;
        
        // Reward: 50 XP per correct answer. 100 XP bonus for perfect score.
        let xpGain = correct * 50;
        if (correct === total) {
          xpGain += 100;
        }

        addXP(xpGain);

        qzResultCorrect.textContent = correct;
        qzResultTotal.textContent = total;
        qzResultXp.textContent = `+${xpGain} XP`;
      }

      // --- CLINICAL CASES MODULE ---
      function renderClinicalCasesList() {
        if (!casesListContainer) return;
        casesListContainer.innerHTML = "";
        MedData.clinicalCases.forEach(c => {
          const card = document.createElement("div");
          card.className = "case-card glass-panel";
          card.innerHTML = `
            <div style="font-size:24px; margin-bottom:10px;">📋</div>
            <h3>${c.title}</h3>
            <p>${c.description.substring(0, 160)}...</p>
            <div class="case-card-footer">
              <span style="font-size:11px; color:var(--accent-rose); font-weight:600;">СЛОЖНОСТЬ: ${c.difficulty}</span>
              <button class="btn btn-primary btn-sm">Открыть кейс</button>
            </div>
          `;
          
          card.addEventListener("click", () => openCaseWorkspace(c));
          casesListContainer.appendChild(card);
        });
      }

      function openCaseWorkspace(medicalCase) {
        state.activeCase = medicalCase;
        state.activeCaseStepIndex = 0;
        state.casePointsEarned = 150; // starts with full points

        // Hide lists
        casesListContainer.classList.add("hidden");
        caseCompletedPanel.classList.add("hidden");
        caseActivePanel.classList.remove("hidden");

        caseWorkspaceTitle.textContent = medicalCase.title;
        casePatientHistory.innerHTML = `<strong>Клиническая картина:</strong><br><br>${medicalCase.description}`;
        
        renderCaseStep();
      }

      function renderCaseStep() {
        caseStepFeedback.classList.add("hidden");

        const step = state.activeCase.steps[state.activeCaseStepIndex];
        caseStepIndicator.textContent = `Шаг ${state.activeCaseStepIndex + 1} из ${state.activeCase.steps.length}`;
        caseStepQuestion.textContent = step.question;

        caseStepOptions.innerHTML = "";
        step.options.forEach((opt, idx) => {
          const btn = document.createElement("button");
          btn.className = "quiz-option-btn";
          btn.textContent = opt;
          btn.addEventListener("click", () => handleCaseOptionSelection(idx));
          caseStepOptions.appendChild(btn);
        });
      }

      function handleCaseOptionSelection(selectedIdx) {
        const step = state.activeCase.steps[state.activeCaseStepIndex];
        const correctIdx = step.correctAnswer;

        // Lock options
        const optionButtons = caseStepOptions.querySelectorAll(".quiz-option-btn");
        optionButtons.forEach(btn => btn.disabled = true);

        optionButtons[correctIdx].classList.add("correct");

        const isCorrect = selectedIdx === correctIdx;
        if (isCorrect) {
          caseStepFeedbackTitle.textContent = "✅ Верно! Отличное клиническое решение.";
          caseStepFeedbackTitle.className = "feedback-title correct";
        } else {
          optionButtons[selectedIdx].classList.add("incorrect");
          caseStepFeedbackTitle.textContent = "❌ Неверно. Пересмотрите логику диагноза.";
          caseStepFeedbackTitle.className = "feedback-title incorrect";
          state.casePointsEarned = Math.max(50, state.casePointsEarned - 30); // subtract points but floor at 50 XP
        }

        caseStepFeedbackText.innerHTML = step.explanation;
        caseStepFeedback.classList.remove("hidden");
      }

      function setupCasesListeners() {
        caseBtnNextStep.addEventListener("click", () => {
          state.activeCaseStepIndex++;
          if (state.activeCaseStepIndex >= state.activeCase.steps.length) {
            completeClinicalCase();
          } else {
            renderCaseStep();
          }
        });

        document.querySelectorAll(".back-to-cases-btn").forEach(btn => {
          btn.addEventListener("click", closeCaseWorkspace);
        });
      }

      function completeClinicalCase() {
        caseActivePanel.classList.add("hidden");
        caseCompletedPanel.classList.remove("hidden");

        addXP(state.casePointsEarned);
        state.solvedCasesCount++;
        safeStorage.setItem("med_cases_count", state.solvedCasesCount);

        caseCompletionXp.textContent = `+${state.casePointsEarned} XP`;
      }

      function closeCaseWorkspace() {
        caseActivePanel.classList.add("hidden");
        caseCompletedPanel.classList.add("hidden");
        casesListContainer.classList.remove("hidden");
      }

      // --- LIBRARY MODULE ---
      function renderBooksList() {
        if (!booksListContainer) return;
        booksListContainer.innerHTML = "";
        MedData.books.forEach(book => {
          const subName = MedData.subjects[book.subjectId].name;
          
          const card = document.createElement("div");
          card.className = "book-card";
          card.innerHTML = `
            <div class="book-title-row">
              <h4>${book.title}</h4>
              <span style="font-size:10px; color:var(--text-dim); text-transform:uppercase;">${subName}</span>
            </div>
            <p class="book-author">Автор: ${book.author}</p>
            <p class="book-desc">${book.description}</p>
          `;
          booksListContainer.appendChild(card);
        });
      }

      function renderUserResources() {
        if (!userResourcesContainer) return;
        userResourcesContainer.innerHTML = "";
        if (state.userResources.length === 0) {
          noResourcesText.style.display = "block";
          return;
        }
        noResourcesText.style.display = "none";

        state.userResources.forEach((res, index) => {
          const subName = MedData.subjects[res.subjectId].name;
          const item = document.createElement("div");
          item.className = "user-res-item";
          item.innerHTML = `
            <div>
              <strong>${res.title}</strong> (${subName})<br>
              <span style="font-size:11px; color:var(--text-muted);">${res.link}</span>
            </div>
            <button class="btn btn-link btn-sm" style="color:var(--accent-rose)" data-idx="${index}">Удалить</button>
          `;
          userResourcesContainer.appendChild(item);
        });

        // Wire deletes
        userResourcesContainer.querySelectorAll("button").forEach(btn => {
          btn.addEventListener("click", (e) => {
            const index = parseInt(btn.getAttribute("data-idx"));
            state.userResources.splice(index, 1);
            safeStorage.setItem("med_resources", JSON.stringify(state.userResources));
            renderUserResources();
          });
        });
      }

      function setupLibraryListeners() {
        if (!addResourceForm) return;
        addResourceForm.addEventListener("submit", (e) => {
          e.preventDefault();
          
          const title = document.getElementById("res-title").value.trim();
          const subjectId = document.getElementById("res-subject").value;
          const link = document.getElementById("res-link").value.trim();

          if (title && link) {
            state.userResources.push({ title, subjectId, link });
            safeStorage.setItem("med_resources", JSON.stringify(state.userResources));
            
            // Reset form
            addResourceForm.reset();
            
            renderUserResources();
            addXP(30); // small XP bonus for uploading resources
          }
        });
      }

      // --- INTERACTIVE 3D ANATOMY (Three.js WebGL) ---
      let scene, camera, renderer, controls;
      const organMeshes = {};

      const organNames = {
        brain: "Головной мозг",
        heart: "Сердце",
        lungs: "Легкие",
        stomach: "Желудок",
        liver: "Печень",
        kidneys: "Почки",
        skeleton: "Скелет и кости"
      };

      window.selectOrgan = function(organId) {
        state.selectedOrganId = organId;
        
        // Highlight the clicked 3D mesh, dim others
        Object.keys(organMeshes).forEach(key => {
          const mesh = organMeshes[key];
          if (!mesh) return;

          const isSelected = (key === organId);
          
          mesh.traverse(child => {
            if (child.isMesh && child.material) {
              if (isSelected) {
                // Bright glow and fully opaque
                if (child.material.emissive) {
                  child.material.emissive.setHex(0x555555);
                }
                child.material.opacity = 1.0;
              } else {
                // Dim and semi-transparent
                if (child.material.emissive) {
                  if (key === "heart") child.material.emissive.setHex(0x401010);
                  else if (key === "brain") child.material.emissive.setHex(0x301020);
                  else if (key === "lungs") child.material.emissive.setHex(0x052a35);
                  else if (key === "stomach") child.material.emissive.setHex(0x302505);
                  else if (key === "liver") child.material.emissive.setHex(0x052a1a);
                  else if (key === "kidneys") child.material.emissive.setHex(0x301505);
                  else child.material.emissive.setHex(0x000000);
                }
                child.material.opacity = 0.4;
              }
            }
          });

          // Highlight scale change
          if (isSelected) {
            if (key === "brain") mesh.scale.set(1.2, 0.9, 1.3);
            else if (key === "stomach") mesh.scale.set(1.3, 1.1, 1.1);
            else if (key === "liver") mesh.scale.set(1.6, 0.8, 1.0);
            else mesh.scale.set(1.1, 1.1, 1.1);
          } else {
            if (key === "brain") mesh.scale.set(1.1, 0.8, 1.2);
            else if (key === "stomach") mesh.scale.set(1.2, 1, 1);
            else if (key === "liver") mesh.scale.set(1.5, 0.7, 0.9);
            else mesh.scale.set(1.0, 1.0, 1.0);
          }
        });

    // Toggle details panels
    const detailsEmpty = document.getElementById("anatomy-details-empty");
    const detailsContent = document.getElementById("anatomy-details-content");
    if (detailsEmpty && detailsContent) {
      detailsEmpty.classList.add("hidden");
      detailsContent.classList.remove("hidden");
    }

    const data = MedData.anatomy3d ? MedData.anatomy3d[organId] : null;
    if (!data) return;

    // Achievements trigger
    unlockAchievement("anatomy_explorer");

    // Fill title details
    const detOrganIcon = document.getElementById("det-organ-icon");
    const detOrganTitle = document.getElementById("det-organ-title");
    const detOrganLatin = document.getElementById("det-organ-latin");

    if (detOrganIcon) detOrganIcon.textContent = data.icon;
    if (detOrganTitle) detOrganTitle.textContent = data.name;
    if (detOrganLatin) detOrganLatin.textContent = data.latin;

    // Retrieve active tab
    let activeTab = "anatomy";
    const activeTabBtn = document.querySelector(".organ-tab.active");
    if (activeTabBtn) {
      activeTab = activeTabBtn.getAttribute("data-tab");
    }

    renderOrganTabContent(organId, activeTab);
  };

  function renderOrganTabContent(organId, tabName) {
    const contentSheet = document.getElementById("det-textbook-content");
    if (!contentSheet) return;

    const organData = MedData.anatomy3d ? MedData.anatomy3d[organId] : null;
    if (!organData) {
      contentSheet.innerHTML = "<p>База данных анатомии временно недоступна.</p>";
      return;
    }

    const content = organData[tabName] || "<p>Раздел в процессе наполнения...</p>";
    contentSheet.innerHTML = content;
    applyWikiLinks(contentSheet);

    // Re-render LaTeX math formulas if MathJax is loaded
    triggerMathJax();
  }

  function setup3DAnatomy() {
    const container = document.getElementById("anatomy-canvas-container");
    if (!container) return;

    // 1. Initialise WebGL Renderer
    const width = container.clientWidth || 350;
    const height = container.clientHeight || 500;

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // Clear old canvases
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // 2. Scene & Camera
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 2, 9);

    // 3. OrbitControls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 2.5;
    controls.maxDistance = 12;
    controls.target.set(0, 1.2, 0);

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x00f2fe, 0.85);
    dirLight1.position.set(5, 10, 7);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xec4899, 0.45);
    dirLight2.position.set(-5, -5, -5);
    scene.add(dirLight2);

    // 5. Holographic Mannequin Envelope (Wireframe)
    const bodyGeo = new THREE.CylinderGeometry(1.4, 0.8, 4.8, 12, 6, true);
    const bodyMat = new THREE.MeshBasicMaterial({
      color: 0x00f2fe,
      wireframe: true,
      transparent: true,
      opacity: 0.06,
      side: THREE.DoubleSide
    });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.position.set(0, 1.2, 0);
    scene.add(bodyMesh);

    // Limb outline lines for a stylized hologram
    const limbMat = new THREE.LineBasicMaterial({ color: 0x00f2fe, transparent: true, opacity: 0.12 });
    
    const leftArmGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-1.4, 3.2, 0),
      new THREE.Vector3(-2.8, 1.8, 0),
      new THREE.Vector3(-3.2, 0.5, 0)
    ]);
    scene.add(new THREE.Line(leftArmGeo, limbMat));

    const rightArmGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(1.4, 3.2, 0),
      new THREE.Vector3(2.8, 1.8, 0),
      new THREE.Vector3(3.2, 0.5, 0)
    ]);
    scene.add(new THREE.Line(rightArmGeo, limbMat));

    const leftLegGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.7, -1.2, 0),
      new THREE.Vector3(-1.0, -3.2, 0),
      new THREE.Vector3(-1.2, -5.2, 0)
    ]);
    scene.add(new THREE.Line(leftLegGeo, limbMat));

    const rightLegGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0.7, -1.2, 0),
      new THREE.Vector3(1.0, -3.2, 0),
      new THREE.Vector3(1.2, -5.2, 0)
    ]);
    scene.add(new THREE.Line(rightLegGeo, limbMat));

    // 6. Skeleton Group (White bone styling)
    const skeletonGroup = new THREE.Group();
    skeletonGroup.userData = { organId: "skeleton" };
    scene.add(skeletonGroup);

    // Skull
    const skullGeo = new THREE.SphereGeometry(0.75, 12, 12);
    const skullMat = new THREE.MeshPhongMaterial({ color: 0xcccccc, wireframe: true, transparent: true, opacity: 0.45 });
    const skullMesh = new THREE.Mesh(skullGeo, skullMat);
    skullMesh.position.set(0, 4.4, 0);
    skeletonGroup.add(skullMesh);

    // Spine
    const spineMat = new THREE.MeshPhongMaterial({ color: 0xdddddd, wireframe: true });
    for (let i = 0; i < 18; i++) {
      const vertGeo = new THREE.BoxGeometry(0.35, 0.1, 0.25);
      const vertMesh = new THREE.Mesh(vertGeo, spineMat);
      vertMesh.position.set(0, 3.4 - i * 0.22, -0.18);
      skeletonGroup.add(vertMesh);
    }

    // Ribs
    const ribMat = new THREE.LineBasicMaterial({ color: 0xdddddd });
    for (let i = 0; i < 7; i++) {
      const radius = 0.9 - i * 0.04;
      const points = [];
      for (let j = 0; j <= 24; j++) {
        const theta = (j / 24) * Math.PI * 2;
        points.push(new THREE.Vector3(Math.cos(theta) * radius, 2.9 - i * 0.24, Math.sin(theta) * radius - 0.1));
      }
      const ribGeo = new THREE.BufferGeometry().setFromPoints(points);
      skeletonGroup.add(new THREE.Line(ribGeo, ribMat));
    }

    // Pelvis ring
    const pelvisPoints = [];
    for (let j = 0; j <= 24; j++) {
      const theta = (j / 24) * Math.PI * 2;
      pelvisPoints.push(new THREE.Vector3(Math.cos(theta) * 0.95, -0.8, Math.sin(theta) * 0.7));
    }
    const pelvisGeo = new THREE.BufferGeometry().setFromPoints(pelvisPoints);
    skeletonGroup.add(new THREE.Line(pelvisGeo, ribMat));

    organMeshes["skeleton"] = skeletonGroup;

    // 7. 3D Organs Generation
    // Brain (Pink/Magenta)
    const brainGeo = new THREE.SphereGeometry(0.6, 16, 16);
    brainGeo.scale(1.1, 0.8, 1.2);
    const brainMat = new THREE.MeshPhongMaterial({
      color: 0xec4899,
      emissive: 0x301020,
      shininess: 90,
      transparent: true,
      opacity: 0.85
    });
    const brainMesh = new THREE.Mesh(brainGeo, brainMat);
    brainMesh.position.set(0, 4.5, 0.08);
    brainMesh.userData = { organId: "brain" };
    scene.add(brainMesh);
    organMeshes["brain"] = brainMesh;

    // Heart (Red)
    const heartGroup = new THREE.Group();
    heartGroup.position.set(-0.2, 2.1, 0.25);
    heartGroup.userData = { organId: "heart" };
    
    const heartMat = new THREE.MeshPhongMaterial({
      color: 0xef4444,
      emissive: 0x401010,
      shininess: 90,
      transparent: true,
      opacity: 0.85
    });
    const leftV = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 12), heartMat);
    leftV.position.set(-0.1, 0, 0);
    leftV.scale.set(1, 1.25, 1);
    heartGroup.add(leftV);

    const rightV = new THREE.Mesh(new THREE.SphereGeometry(0.27, 12, 12), heartMat);
    rightV.position.set(0.1, 0.04, 0);
    rightV.scale.set(1, 1.15, 1);
    heartGroup.add(rightV);

    const aorta = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.5, 8), heartMat);
    aorta.position.set(0.04, 0.35, -0.08);
    aorta.rotation.z = -0.15;
    heartGroup.add(aorta);

    scene.add(heartGroup);
    organMeshes["heart"] = heartGroup;

    // Lungs (Cyan)
    const lungsGroup = new THREE.Group();
    lungsGroup.position.set(0, 2.1, 0);
    lungsGroup.userData = { organId: "lungs" };

    const lungsMat = new THREE.MeshPhongMaterial({
      color: 0x06b6d4,
      emissive: 0x052a35,
      shininess: 60,
      transparent: true,
      opacity: 0.75
    });
    const leftLung = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 1.2, 12), lungsMat);
    leftLung.position.set(-0.6, 0, 0.08);
    leftLung.scale.set(0.9, 1, 0.7);
    lungsGroup.add(leftLung);

    const rightLung = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 1.2, 12), lungsMat);
    rightLung.position.set(0.6, 0, 0.08);
    rightLung.scale.set(0.9, 1, 0.7);
    lungsGroup.add(rightLung);

    scene.add(lungsGroup);
    organMeshes["lungs"] = lungsGroup;

    // Stomach (Yellow)
    const stomachGeo = new THREE.TorusGeometry(0.25, 0.12, 8, 20, Math.PI * 1.2);
    const stomachMat = new THREE.MeshPhongMaterial({
      color: 0xeab308,
      emissive: 0x302505,
      shininess: 50,
      transparent: true,
      opacity: 0.8
    });
    const stomachMesh = new THREE.Mesh(stomachGeo, stomachMat);
    stomachMesh.position.set(0.25, 1.0, 0.28);
    stomachMesh.rotation.set(0, 0, -Math.PI / 3);
    stomachMesh.scale.set(1.2, 1, 1);
    stomachMesh.userData = { organId: "stomach" };
    scene.add(stomachMesh);
    organMeshes["stomach"] = stomachMesh;

    // Liver (Green)
    const liverGeo = new THREE.ConeGeometry(0.48, 0.8, 4);
    liverGeo.scale(1.4, 0.6, 0.85);
    const liverMat = new THREE.MeshPhongMaterial({
      color: 0x10b981,
      emissive: 0x052a1a,
      shininess: 50,
      transparent: true,
      opacity: 0.85
    });
    const liverMesh = new THREE.Mesh(liverGeo, liverMat);
    liverMesh.position.set(-0.38, 1.05, 0.2);
    liverMesh.rotation.set(0.25, 0.15, -0.45);
    liverMesh.userData = { organId: "liver" };
    scene.add(liverMesh);
    organMeshes["liver"] = liverMesh;

    // Kidneys (Orange)
    const kidneysGroup = new THREE.Group();
    kidneysGroup.position.set(0, 0.9, -0.3);
    kidneysGroup.userData = { organId: "kidneys" };

    const kidneyMat = new THREE.MeshPhongMaterial({
      color: 0xf97316,
      emissive: 0x301505,
      shininess: 70,
      transparent: true,
      opacity: 0.85
    });
    const leftKidney = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 12), kidneyMat);
    leftKidney.position.set(-0.35, 0, 0);
    leftKidney.scale.set(1, 1.4, 0.75);
    kidneysGroup.add(leftKidney);

    const rightKidney = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 12), kidneyMat);
    rightKidney.position.set(0.35, 0, 0);
    rightKidney.scale.set(1, 1.4, 0.75);
    kidneysGroup.add(rightKidney);

    scene.add(kidneysGroup);
    organMeshes["kidneys"] = kidneysGroup;

    // 8. Raycasting & Tooltips
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const tooltip = document.getElementById("anatomy-tooltip");

    let currentHoveredOrgan = null;

    container.addEventListener("mousemove", (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      const interactable = [
        organMeshes["brain"],
        organMeshes["heart"],
        organMeshes["lungs"],
        organMeshes["stomach"],
        organMeshes["liver"],
        organMeshes["kidneys"],
        organMeshes["skeleton"]
      ];

      const intersects = raycaster.intersectObjects(interactable, true);

      if (intersects.length > 0) {
        let obj = intersects[0].object;
        while (obj && !obj.userData.organId) {
          obj = obj.parent;
        }

        if (obj && obj.userData && obj.userData.organId) {
          const organId = obj.userData.organId;
          
          if (currentHoveredOrgan !== organId) {
            currentHoveredOrgan = organId;
            if (tooltip) {
              tooltip.textContent = organNames[organId];
              tooltip.style.borderColor = "var(--accent-cyan)";
            }
          }
          return;
        }
      }

      if (currentHoveredOrgan !== null) {
        currentHoveredOrgan = null;
        if (tooltip) {
          if (state.selectedOrganId) {
            tooltip.textContent = organNames[state.selectedOrganId];
          } else {
            tooltip.textContent = "Наведите на орган";
          }
        }
      }
    });

    container.addEventListener("click", (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      const interactable = [
        organMeshes["brain"],
        organMeshes["heart"],
        organMeshes["lungs"],
        organMeshes["stomach"],
        organMeshes["liver"],
        organMeshes["kidneys"],
        organMeshes["skeleton"]
      ];

      const intersects = raycaster.intersectObjects(interactable, true);

      if (intersects.length > 0) {
        let obj = intersects[0].object;
        while (obj && !obj.userData.organId) {
          obj = obj.parent;
        }

        if (obj && obj.userData && obj.userData.organId) {
          const organId = obj.userData.organId;
          selectOrgan(organId);
        }
      }
    });

    // 9. Organ Tabs Click handler
    const tabs = document.querySelectorAll(".organ-tab");
    tabs.forEach(tab => {
      tab.addEventListener("click", () => {
        tabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");

        if (state.selectedOrganId) {
          renderOrganTabContent(state.selectedOrganId, tab.getAttribute("data-tab"));
        }
      });
    });

    window.addEventListener("resize", onWindowResize);

    function onWindowResize() {
      if (!container || !renderer) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }

    // 10. Frame Loop & Floating effect
    let angle = 0;
    function animate() {
      requestAnimationFrame(animate);

      angle += 0.025;
      const floatOffset = Math.sin(angle) * 0.035;

      // Gentle floating animation to make organs look alive
      if (organMeshes["brain"]) organMeshes["brain"].position.y = 4.5 + floatOffset * 0.4;
      if (organMeshes["heart"]) organMeshes["heart"].position.y = 2.1 + floatOffset;
      if (organMeshes["lungs"]) lungsGroup.position.y = 2.1 + floatOffset;
      if (organMeshes["stomach"]) organMeshes["stomach"].position.y = 1.0 - floatOffset * 0.6;
      if (organMeshes["liver"]) organMeshes["liver"].position.y = 1.05 - floatOffset * 0.4;
      if (organMeshes["kidneys"]) kidneysGroup.position.y = 0.9 + floatOffset * 0.3;

      // Slow orbital rotation when not dragged
      if (controls && controls.state === -1) {
        bodyMesh.rotation.y += 0.0015;
        skeletonGroup.rotation.y += 0.0015;
        organMeshes["brain"].rotation.y += 0.0015;
        organMeshes["heart"].rotation.y += 0.0015;
        lungsGroup.rotation.y += 0.0015;
        organMeshes["stomach"].rotation.y += 0.0015;
        organMeshes["liver"].rotation.y += 0.0015;
        kidneysGroup.rotation.y += 0.0015;
      }

      if (controls) controls.update();
      if (renderer && scene && camera) renderer.render(scene, camera);
    }

    animate();
  }

  // --- ACCESS LOCK SCREEN LOGIC ---
  function setupLockScreen() {
    const lockScreen = document.getElementById("app-lock-screen");
    const passwordInput = document.getElementById("lock-password-input");
    const submitBtn = document.getElementById("lock-submit-btn");
    const errorMsg = document.getElementById("lock-error-msg");
    const lockCard = document.querySelector(".lock-card");

    const CORRECT_PASSWORD = "0981"; // Default passcode

    // Check if already authorized in current browser session
    if (localStorage.getItem("medstudy_authorized") === "true") {
      if (lockScreen) {
        lockScreen.classList.add("hidden");
      }
      return;
    }

    function checkPassword() {
      if (!passwordInput) return;
      if (passwordInput.value === CORRECT_PASSWORD) {
        localStorage.setItem("medstudy_authorized", "true");
        if (lockScreen) {
          lockScreen.classList.add("hidden");
        }
      } else {
        // Shake animation for incorrect password
        if (lockCard) {
          lockCard.classList.add("shake");
          setTimeout(() => lockCard.classList.remove("shake"), 400);
        }
        if (errorMsg) {
          errorMsg.classList.remove("hidden");
        }
        passwordInput.value = "";
        passwordInput.focus();
      }
    }

    if (submitBtn) {
      submitBtn.addEventListener("click", checkPassword);
    }

    if (passwordInput) {
      passwordInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          checkPassword();
        }
      });
    }
  }

  // --- CLINICAL QUEST LOGIC ---
  state.questGuessedOptions = [];
  state.questActiveOptions = [];

  function startQuestSession() {
    if (!MedData.quests || MedData.quests.length === 0) return;
    state.currentQuestIndex = Math.floor(Math.random() * MedData.quests.length);
    state.currentQuestSymptomCount = 1;
    state.questGuessedOptions = [];
    state.questCompleted = false;
    
    generateQuestOptions();
    renderQuestCard();
  }

  function generateQuestOptions() {
    const quest = MedData.quests[state.currentQuestIndex];
    if (!quest) return;

    // Get 4 random distractors from other diseases in the database
    const distractors = MedData.quests
      .filter(q => q.id !== quest.id)
      .map(q => q.name);
    
    const selectedDistractors = shuffleArray([...distractors]).slice(0, 4);
    
    // Combine correct answer and distractors, then shuffle
    const options = [quest.name, ...selectedDistractors];
    state.questActiveOptions = shuffleArray(options);
  }

  function renderQuestCard() {
    const quest = MedData.quests[state.currentQuestIndex];
    if (!quest) return;

    // Stage updates
    if (questStageText) {
      questStageText.textContent = `Кейс №${state.solvedCasesCount + 1}`;
    }
    if (questProgressFill) {
      // Progress fill goes 0% to 100% every 10 cases
      const progressPercent = ((state.solvedCasesCount % 10) / 10) * 100;
      questProgressFill.style.width = `${progressPercent}%`;
    }

    // Render current revealed symptoms
    if (questSymptomsContainer) {
      questSymptomsContainer.innerHTML = "";
      for (let i = 0; i < state.currentQuestSymptomCount; i++) {
        const card = document.createElement("div");
        card.className = "symptom-card";
        card.innerHTML = `
          <div class="symptom-number">${i + 1}</div>
          <div class="symptom-text">${quest.symptoms[i]}</div>
        `;
        questSymptomsContainer.appendChild(card);
      }
    }

    // Update potential XP reward
    const currentXpValue = 100 - (state.currentQuestSymptomCount - 1) * 25;
    if (questXpValue) {
      questXpValue.textContent = currentXpValue;
    }

    // Render option buttons (shuffled)
    if (questOptionsContainer) {
      questOptionsContainer.innerHTML = "";
      state.questActiveOptions.forEach(opt => {
        const btn = document.createElement("button");
        btn.className = "quest-option-btn";
        btn.textContent = opt;
        
        // If this option was already guessed incorrectly
        if (state.questGuessedOptions.includes(opt)) {
          btn.classList.add("wrong");
          btn.disabled = true;
        }

        btn.addEventListener("click", () => handleQuestAnswer(opt, btn));
        questOptionsContainer.appendChild(btn);
      });
    }

    // Reset visibility states
    if (questStatusMessage) questStatusMessage.classList.add("hidden");
    if (questExplanationContainer) questExplanationContainer.classList.add("hidden");
    if (questInteractionContainer) questInteractionContainer.classList.remove("hidden");
  }

  function handleQuestAnswer(selectedOption, btnElement) {
    if (state.questCompleted) return;
    const quest = MedData.quests[state.currentQuestIndex];
    if (!quest) return;

    if (selectedOption === quest.name) {
      // Success!
      state.questCompleted = true;
      const xpEarned = 100 - (state.currentQuestSymptomCount - 1) * 25;
      addXP(xpEarned);

      // Increment stats
      state.solvedCasesCount++;
      safeStorage.setItem("med_cases_count", state.solvedCasesCount);
      loadDashboardData();

      // Achievements triggers
      unlockAchievement("first_diagnosis");
      if (state.currentQuestSymptomCount === 1) {
        unlockAchievement("perfect_diagnosis");
      }

      if (questStatusMessage) {
        questStatusMessage.className = "quest-status-message success";
        questStatusMessage.textContent = `🎉 Правильно! Получено +${xpEarned} XP!`;
        questStatusMessage.classList.remove("hidden");
      }

      // Disable options
      document.querySelectorAll(".quest-option-btn").forEach(btn => btn.disabled = true);

      // Show explanation
      setTimeout(() => {
        if (questInteractionContainer) questInteractionContainer.classList.add("hidden");
        if (questExplanationContainer) {
          questExplanationContainer.classList.remove("hidden");
          if (questExplanationAlert) {
            questExplanationAlert.className = "explanation-alert success";
            questExplanationAlert.innerHTML = `<span>✅ Верно! Диагноз подтвержден: <strong>${quest.name}</strong></span>`;
          }
          if (questExplanationText) {
            questExplanationText.innerHTML = `
              <h4>Клинический разбор патогенеза:</h4>
              <p>${quest.explanation}</p>
            `;
          }
        }
        if (questProgressFill) {
          const progressPercent = ((state.solvedCasesCount % 10) / 10) * 100;
          questProgressFill.style.width = `${progressPercent}%`;
        }
      }, 1000);

    } else {
      // Wrong guess!
      state.questGuessedOptions.push(selectedOption);
      if (btnElement) {
        btnElement.classList.add("wrong");
        btnElement.disabled = true;
      }

      // Check if there are more symptoms to reveal
      if (state.currentQuestSymptomCount < quest.symptoms.length) {
        state.currentQuestSymptomCount++;
        
        if (questStatusMessage) {
          questStatusMessage.className = "quest-status-message error";
          questStatusMessage.textContent = "❌ Неверно. Получена дополнительная жалоба!";
          questStatusMessage.classList.remove("hidden");
        }

        // Shake symptoms area
        if (questSymptomsContainer) {
          questSymptomsContainer.classList.add("shake");
          setTimeout(() => questSymptomsContainer.classList.remove("shake"), 400);
        }

        // Re-render
        setTimeout(() => {
          renderQuestCard();
        }, 1200);

      } else {
        // Fail!
        state.questCompleted = true;

        if (questStatusMessage) {
          questStatusMessage.className = "quest-status-message error";
          questStatusMessage.textContent = "❌ Все подсказки исчерпаны. Вы ошиблись.";
          questStatusMessage.classList.remove("hidden");
        }

        document.querySelectorAll(".quest-option-btn").forEach(btn => btn.disabled = true);

        setTimeout(() => {
          if (questInteractionContainer) questInteractionContainer.classList.add("hidden");
          if (questExplanationContainer) {
            questExplanationContainer.classList.remove("hidden");
            if (questExplanationAlert) {
              questExplanationAlert.className = "explanation-alert fail";
              questExplanationAlert.innerHTML = `<span>❌ Ошибка. Правильный диагноз: <strong>${quest.name}</strong></span>`;
            }
            if (questExplanationText) {
              questExplanationText.innerHTML = `
                <h4>Клинический разбор патогенеза:</h4>
                <p>${quest.explanation}</p>
              `;
            }
          }
          if (questProgressFill) {
            const progressPercent = ((state.solvedCasesCount % 10) / 10) * 100;
            questProgressFill.style.width = `${progressPercent}%`;
          }
        }, 1200);
      }
    }
  }

  function setupQuestListeners() {
    if (questNextBtn) {
      questNextBtn.onclick = () => {
        startQuestSession();
      };
    }
  }

  // --- MEDICAL WIKI AUTO-LINKER ---
  const WikiMap = [
    {
      term: 'сердце',
      words: [/(?<![а-яА-ЯёЁ])(?:сердц[еауоыи]|сердечн(?:ый|ого|ому|ым|ом|ые|ых|ым|ыми))(?![а-яА-ЯёЁ])/iu],
      target: { type: 'organ', id: 'heart', tab: 'anatomy' }
    },
    {
      term: 'миокард',
      words: [/(?<![а-яА-ЯёЁ])миокард(?:а|у|ом|е|ы|ов|ам|ами|ах)?(?![а-яА-ЯёЁ])/iu],
      target: { type: 'organ', id: 'heart', tab: 'physiology' }
    },
    {
      term: 'клапан',
      words: [/(?<![а-яА-ЯёЁ])клапан(?:а|у|ом|е|ы|ов|ам|ами|ах)?(?![а-яА-ЯёЁ])/iu],
      target: { type: 'organ', id: 'heart', tab: 'anatomy' }
    },
    {
      term: 'аорта',
      words: [/(?<![а-яА-ЯёЁ])аорт(?:а|ы|е|у|кой)?(?![а-яА-ЯёЁ])/iu],
      target: { type: 'organ', id: 'heart', tab: 'anatomy' }
    },
    {
      term: 'мозг',
      words: [/(?<![а-яА-ЯёЁ])(?:мозг(?:а|у|ом|е|ы|ов|ам|ами|ах)?|головно(?:го|му|й|м) мозг(?:а|у|ом|е))(?![а-яА-ЯёЁ])/iu],
      target: { type: 'organ', id: 'brain', tab: 'anatomy' }
    },
    {
      term: 'нейрон',
      words: [/(?<![а-яА-ЯёЁ])нейрон(?:а|у|ом|е|ы|ов|ам|ами|ах)?(?![а-яА-ЯёЁ])/iu],
      target: { type: 'organ', id: 'brain', tab: 'histology' }
    },
    {
      term: 'синапс',
      words: [/(?<![а-яА-ЯёЁ])синапс(?:а|у|ом|е|ы|ов|ам|ами|ах)?(?![а-яА-ЯёЁ])/iu],
      target: { type: 'organ', id: 'brain', tab: 'physiology' }
    },
    {
      term: 'кора',
      words: [/(?<![а-яА-ЯёЁ])кор(?:а|ы|е|у|ой) головного мозга(?![а-яА-ЯёЁ])/iu],
      target: { type: 'organ', id: 'brain', tab: 'anatomy' }
    },
    {
      term: 'легкие',
      words: [/(?<![а-яА-ЯёЁ])легк(?:ие|их|им|ими|их|ах)(?![а-яА-ЯёЁ])/iu],
      target: { type: 'organ', id: 'lungs', tab: 'anatomy' }
    },
    {
      term: 'альвеола',
      words: [/(?<![а-яА-ЯёЁ])альвеол(?:а|ы|е|у|ой|ам|ами|ах)?(?![а-яА-ЯёЁ])/iu],
      target: { type: 'organ', id: 'lungs', tab: 'histology' }
    },
    {
      term: 'сурфактант',
      words: [/(?<![а-яА-ЯёЁ])сурфактант(?:а|у|ом|е|ы)?(?![а-яА-ЯёЁ])/iu],
      target: { type: 'organ', id: 'lungs', tab: 'biochemistry' }
    },
    {
      term: 'бронх',
      words: [/(?<![а-яА-ЯёЁ])бронх(?:а|у|ом|е|ы|ов|ам|ами|ах)?(?![а-яА-ЯёЁ])/iu],
      target: { type: 'organ', id: 'lungs', tab: 'anatomy' }
    },
    {
      term: 'желудок',
      words: [/(?<![а-яА-ЯёЁ])желуд(?:ок|ка|ку|ком|ке|ки|ков|кам|ках)?(?![а-яА-ЯёЁ])/iu],
      target: { type: 'organ', id: 'stomach', tab: 'anatomy' }
    },
    {
      term: 'пепсин',
      words: [/(?<![а-яА-ЯёЁ])пепсин(?:а|у|ом|е|ы|оген)?(?![а-яА-ЯёЁ])/iu],
      target: { type: 'organ', id: 'stomach', tab: 'biochemistry' }
    },
    {
      term: 'гастрин',
      words: [/(?<![а-яА-ЯёЁ])гастрин(?:а|у|ом|е|ы)?(?![а-яА-ЯёЁ])/iu],
      target: { type: 'organ', id: 'stomach', tab: 'physiology' }
    },
    {
      term: 'печень',
      words: [/(?<![а-яА-ЯёЁ])печен(?:ь|и|ью|еночный|еночная|еночное|еночные)(?![а-яА-ЯёЁ])/iu],
      target: { type: 'organ', id: 'liver', tab: 'anatomy' }
    },
    {
      term: 'гепатоцит',
      words: [/(?<![а-яА-ЯёЁ])гепатоцит(?:а|у|ом|е|ы|ов|ам|ами|ах)?(?![а-яА-ЯёЁ])/iu],
      target: { type: 'organ', id: 'liver', tab: 'histology' }
    },
    {
      term: 'желчь',
      words: [/(?<![а-яА-ЯёЁ])желч(?:ь|и|ью)?(?![а-яА-ЯёЁ])/iu],
      target: { type: 'organ', id: 'liver', tab: 'physiology' }
    },
    {
      term: 'почки',
      words: [/(?<![а-яА-ЯёЁ])поч(?:ка|ки|ку|кой|кам|ками|ках|ечный|ечные|ечной)(?![а-яА-ЯёЁ])/iu],
      target: { type: 'organ', id: 'kidneys', tab: 'anatomy' }
    },
    {
      term: 'нефрон',
      words: [/(?<![а-яА-ЯёЁ])нефрон(?:а|у|ом|е|ы|ов|ам|ами|ах)?(?![а-яА-ЯёЁ])/iu],
      target: { type: 'organ', id: 'kidneys', tab: 'histology' }
    },
    {
      term: 'мочевина',
      words: [/(?<![а-яА-ЯёЁ])мочевин(?:а|ы|е|у|ой)?(?![а-яА-ЯёЁ])/iu],
      target: { type: 'organ', id: 'kidneys', tab: 'biochemistry' }
    },
    {
      term: 'петля генле',
      words: [/(?<![а-яА-ЯёЁ])петл(?:я|и|е|ю|ей) генле(?![а-яА-ЯёЁ])/iu],
      target: { type: 'organ', id: 'kidneys', tab: 'physiology' }
    },
    {
      term: 'скелет',
      words: [/(?<![а-яА-ЯёЁ])скелет(?:а|у|ом|е|ы|ов)?(?![а-яА-ЯёЁ])/iu],
      target: { type: 'organ', id: 'skeleton', tab: 'anatomy' }
    },
    {
      term: 'кость',
      words: [/(?<![а-яА-ЯёЁ])кост(?:ь|и|ью|ями|ях|ный|ная|ное|ные|ных)(?![а-яА-ЯёЁ])/iu],
      target: { type: 'organ', id: 'skeleton', tab: 'anatomy' }
    },
    {
      term: 'остеобласт',
      words: [/(?<![а-яА-ЯёЁ])(?:остеобласт(?:а|у|ом|е|ы|ов)?|остеокласт(?:а|у|ом|е|ы|ов)?)(?![а-яА-ЯёЁ])/iu],
      target: { type: 'organ', id: 'skeleton', tab: 'histology' }
    },
    {
      term: 'гидроксиапатит',
      words: [/(?<![а-яА-ЯёЁ])гидроксиапатит(?:а|у|ом|е|ы)?(?![а-яА-ЯёЁ])/iu],
      target: { type: 'organ', id: 'skeleton', tab: 'biochemistry' }
    }
  ];

  function applyWikiLinks(rootElement) {
    if (!rootElement) return;
    
    const textNodes = [];
    const walk = document.createTreeWalker(rootElement, NodeFilter.SHOW_TEXT, null, false);
    let node;
    while (node = walk.nextNode()) {
      if (node.parentElement && (node.parentElement.tagName === 'A' || node.parentElement.tagName === 'BUTTON' || node.parentElement.closest('a') || node.parentElement.closest('.wiki-link'))) {
        continue;
      }
      textNodes.push(node);
    }

    textNodes.forEach(textNode => {
      let text = textNode.nodeValue;
      let matches = [];

      WikiMap.forEach(entry => {
        entry.words.forEach(regex => {
          let match;
          const globalRegex = new RegExp(regex.source, 'gi');
          while ((match = globalRegex.exec(text)) !== null) {
            matches.push({
              index: match.index,
              length: match[0].length,
              word: match[0],
              entry: entry
            });
          }
        });
      });

      matches.sort((a, b) => b.index - a.index);

      let lastIndex = text.length;
      const filteredMatches = [];
      matches.forEach(m => {
        if (m.index + m.length <= lastIndex) {
          filteredMatches.push(m);
          lastIndex = m.index;
        }
      });

      if (filteredMatches.length === 0) return;

      const fragment = document.createDocumentFragment();
      let currentPos = 0;
      
      filteredMatches.sort((a, b) => a.index - b.index);

      filteredMatches.forEach(m => {
        if (m.index > currentPos) {
          fragment.appendChild(document.createTextNode(text.substring(currentPos, m.index)));
        }
        
        const link = document.createElement("a");
        link.className = "wiki-link";
        link.href = "#";
        link.textContent = m.word;
        link.setAttribute("data-term", m.entry.term);
        link.title = `Вики-термин: ${m.word}`;
        link.onclick = (e) => {
          e.preventDefault();
          showWikiPopup(e.target);
        };
        fragment.appendChild(link);

        currentPos = m.index + m.length;
      });

      if (currentPos < text.length) {
        fragment.appendChild(document.createTextNode(text.substring(currentPos)));
      }

      if (textNode.parentNode) {
        textNode.parentNode.replaceChild(fragment, textNode);
      }
    });
  }

  function showWikiPopup(targetEl) {
    const term = targetEl.getAttribute("data-term");
    const popup = document.getElementById("wiki-popup");
    const titleEl = document.getElementById("wiki-popup-title");
    const descEl = document.getElementById("wiki-popup-desc");
    const goBtn = document.getElementById("wiki-popup-go-btn");

    if (!popup) return;

    // Look up dictionary definition
    const def = MedData.wikiDictionary[term] || {
      title: term.toUpperCase(),
      definition: "Справочное описание термина находится в процессе дополнения.",
      target: { type: 'organ', id: 'brain', tab: 'anatomy' }
    };

    if (titleEl) titleEl.textContent = def.title;
    if (descEl) descEl.textContent = def.definition;

    if (goBtn) {
      goBtn.onclick = () => {
        popup.classList.add("hidden");
        navigateWiki(def.target.type, def.target.id, def.target.tab);
      };
    }

    // Position popup
    const rect = targetEl.getBoundingClientRect();
    const leftPos = rect.left + rect.width / 2 + window.scrollX;
    const topPos = rect.top + window.scrollY;

    popup.style.left = `${leftPos}px`;
    popup.style.top = `${topPos}px`;
    popup.classList.remove("hidden");

    // Achievements trigger
    unlockAchievement("wiki_reader");
  }

  // Close wiki popup on close button or clicking outside
  document.addEventListener("click", (e) => {
    const popup = document.getElementById("wiki-popup");
    if (popup && !popup.classList.contains("hidden")) {
      if (!popup.contains(e.target) && !e.target.classList.contains("wiki-link")) {
        popup.classList.add("hidden");
      }
    }
  });

  // Wire close button
  setTimeout(() => {
    const closeBtn = document.getElementById("wiki-popup-close");
    if (closeBtn) {
      closeBtn.onclick = () => {
        document.getElementById("wiki-popup").classList.add("hidden");
      };
    }
  }, 500);

  function navigateWiki(type, targetId, tabName) {
    if (type === 'organ') {
      navigateToView("anatomy-3d");
      if (typeof window.selectOrgan === "function") {
        window.selectOrgan(targetId);
      }
      
      const tabBtn = document.querySelector(`.organ-tab[data-tab="${tabName}"]`);
      if (tabBtn) {
        document.querySelectorAll(".organ-tab").forEach(b => b.classList.remove("active"));
        tabBtn.classList.add("active");
        renderOrganTabContent(targetId, tabName);
      }
    }
  }

  // --- ACHIEVEMENT SYSTEM ---
  function unlockAchievement(id) {
    let achs = {};
    try {
      achs = JSON.parse(localStorage.getItem("medstudy_achievements") || "{}");
    } catch (e) {
      achs = {};
    }
    if (achs[id]) return;

    achs[id] = true;
    localStorage.setItem("medstudy_achievements", JSON.stringify(achs));

    // Award bonus XP!
    addXP(100);

    // Achievements metadata
    const metadata = {
      first_diagnosis: {
        title: "Первый пациент 🩺",
        desc: "Вы успешно диагностировали вашего первого сложного пациента!"
      },
      perfect_diagnosis: {
        title: "Клинический снайпер 🎯",
        desc: "Вы угадали болезнь с первой подсказки, проявив блестящую интуицию!"
      },
      wiki_reader: {
        title: "Медицинский книжник 📚",
        desc: "Вы впервые открыли справочное Вики-определение термина на месте."
      },
      anatomy_explorer: {
        title: "3D Исследователь 🧍",
        desc: "Вы детально изучили органы в WebGL-атласе трехмерного тела."
      }
    };

    const ach = metadata[id];
    if (!ach) return;

    // Show achievement toast
    const toast = document.getElementById("achievement-toast");
    const titleEl = document.getElementById("achievement-title");
    const descEl = document.getElementById("achievement-desc");

    if (toast && titleEl && descEl) {
      titleEl.textContent = ach.title;
      descEl.textContent = ach.desc;
      toast.classList.remove("hidden");

      // Auto hide after 4 seconds
      setTimeout(() => {
        toast.style.animation = "slideInToast 0.4s reverse ease-in";
        setTimeout(() => {
          toast.classList.add("hidden");
          toast.style.animation = ""; // reset animation
        }, 400);
      }, 4000);
    }
  }

  function triggerMathJax() {
    if (window.MathJax && typeof window.MathJax.typesetPromise === "function") {
      window.MathJax.typesetPromise().catch(err => console.warn("MathJax formatting error:", err));
    }
  }

  // --- CONCEPT MAP FUNCTIONS ---
  function renderConceptTree(node, systemId) {
    const li = document.createElement("li");
    const card = document.createElement("div");
    
    // System color mapping class
    let systemClass = "";
    if (systemId === "nervous") systemClass = "nervous-node";
    else if (systemId === "respiratory") systemClass = "respiratory-node";
    else if (systemId === "digestive") systemClass = "digestive-node";
    else if (systemId === "urinary") systemClass = "urinary-node";
    else if (systemId === "skeletal") systemClass = "skeletal-node";
    
    card.className = `tree-node-card ${systemClass}`;
    card.textContent = node.name;
    
    card.onclick = () => {
      // Highlight active node
      document.querySelectorAll(".tree-node-card").forEach(c => c.classList.remove("active-node"));
      card.classList.add("active-node");
      
      showConceptDetail(node);
    };
    
    li.appendChild(card);
    
    if (node.children && node.children.length > 0) {
      const ul = document.createElement("ul");
      node.children.forEach(child => {
        ul.appendChild(renderConceptTree(child, systemId));
      });
      li.appendChild(ul);
    }
    
    return li;
  }

  function showConceptDetail(node) {
    const detailCard = document.getElementById("map-detail-card");
    const titleEl = document.getElementById("map-detail-title");
    const descEl = document.getElementById("map-detail-desc");
    const goBtn = document.getElementById("map-detail-go-btn");
    
    if (!detailCard) return;
    
    titleEl.textContent = node.name;
    descEl.textContent = node.desc;
    
    if (goBtn) {
      if (node.organ) {
        goBtn.classList.remove("hidden");
        goBtn.onclick = () => {
          detailCard.classList.add("hidden");
          navigateWiki("organ", node.organ, node.tab || "anatomy");
        };
      } else {
        goBtn.classList.add("hidden");
      }
    }
    
    detailCard.classList.remove("hidden");
  }

  function initConceptMap() {
    const container = document.getElementById("concept-tree-root-container");
    if (!container) return;
    
    let activeSystemId = "cardio";
    let mapScale = 1.0;
    
    function buildMap() {
      container.innerHTML = "";
      mapScale = 1.0;
      container.style.transform = "scale(1.0)";
      
      const mapData = MedData.conceptMaps[activeSystemId];
      if (!mapData || !mapData.root) return;
      
      const ul = document.createElement("ul");
      ul.appendChild(renderConceptTree(mapData.root, activeSystemId));
      container.appendChild(ul);
      
      // Hide detail card
      const detailCard = document.getElementById("map-detail-card");
      if (detailCard) detailCard.classList.add("hidden");
    }
    
    // Wire system selectors
    document.querySelectorAll(".map-selector-btn").forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll(".map-selector-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        
        activeSystemId = btn.getAttribute("data-map-system");
        buildMap();
      };
    });
    
    // Zoom controls logic (with mouse wheel support!)
    const viewport = document.getElementById("map-tree-viewport");
    if (viewport) {
      function applyScale() {
        container.style.transform = `scale(${mapScale})`;
      }
      
      const zoomInBtn = document.getElementById("map-zoom-in-btn");
      const zoomOutBtn = document.getElementById("map-zoom-out-btn");
      const resetBtn = document.getElementById("map-reset-btn");
      
      if (zoomInBtn) {
        zoomInBtn.onclick = () => {
          mapScale = Math.min(2.0, mapScale + 0.1);
          applyScale();
        };
      }
      
      if (zoomOutBtn) {
        zoomOutBtn.onclick = () => {
          mapScale = Math.max(0.3, mapScale - 0.1);
          applyScale();
        };
      }
      
      if (resetBtn) {
        resetBtn.onclick = () => {
          mapScale = 1.0;
          applyScale();
        };
      }
      
      // Mouse wheel zoom listener
      viewport.addEventListener("wheel", (e) => {
        e.preventDefault();
        const zoomStep = 0.05;
        if (e.deltaY < 0) {
          mapScale = Math.min(2.0, mapScale + zoomStep);
        } else {
          mapScale = Math.max(0.3, mapScale - zoomStep);
        }
        applyScale();
      }, { passive: false });
    }
    
    // Wire close button
    const closeBtn = document.getElementById("map-detail-close");
    if (closeBtn) {
      closeBtn.onclick = () => {
        document.getElementById("map-detail-card").classList.add("hidden");
        document.querySelectorAll(".tree-node-card").forEach(c => c.classList.remove("active-node"));
      };
    }
    
    // Drag to pan viewport
    if (viewport) {
      let isDown = false;
      let startX, startY, scrollLeft, scrollTop;
      
      viewport.addEventListener("mousedown", (e) => {
        isDown = true;
        viewport.style.cursor = "grabbing";
        startX = e.pageX - viewport.offsetLeft;
        startY = e.pageY - viewport.offsetTop;
        scrollLeft = viewport.scrollLeft;
        scrollTop = viewport.scrollTop;
      });
      
      viewport.addEventListener("mouseleave", () => {
        isDown = false;
        viewport.style.cursor = "grab";
      });
      
      viewport.addEventListener("mouseup", () => {
        isDown = false;
        viewport.style.cursor = "grab";
      });
      
      viewport.addEventListener("mousemove", (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - viewport.offsetLeft;
        const y = e.pageY - viewport.offsetTop;
        const walkX = (x - startX) * 1.5;
        const walkY = (y - startY) * 1.5;
        viewport.scrollLeft = scrollLeft - walkX;
        viewport.scrollTop = scrollTop - walkY;
      });
    }
    
    buildMap();
  }

  // --- UTILS ---
  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  // Run the initialization
  init();
});
