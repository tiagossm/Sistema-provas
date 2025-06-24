(() => {
    const modulesConfig = [
        {
            key: 'seguranca',
            name: 'Módulo 1 - Segurança do Trabalho',
            description: 'Sistema de avaliação de eficácia em Segurança Ocupacional e Saúde (SOC)',
            jsonPath: 'questoes_soc.json',
            icon: '🛡️',
            active: true
        },
        {
            key: 'saude',
            name: 'Módulo 2 - Saúde Ocupacional',
            description: 'Avaliação de programas de saúde ocupacional e medicina do trabalho',
            jsonPath: 'questoes_saude.json',
            icon: '🏥',
            active: false
        },
        {
            key: 'financeiro',
            name: 'Módulo 3 - Financeiro',
            description: 'Gestão financeira e análise de custos em segurança do trabalho',
            jsonPath: 'questoes_financeiro.json',
            icon: '💰',
            active: false
        }
    ];

    let currentModule = null;
    // Centralização do gabarito (ordem das respostas corretas)
    const gabarito = ["C","C","C","B","C","C","C","B","C","C"];

    // Encapsular variáveis principais
    let questoes = [];
    let respostasInicial = [];
    let respostasFinal = [];
    let currentQuestion = 1;
    let totalQuestions = 0;
    let avaliacaoAtual = 'inicial';
    let notaInicial = null;
    let notaFinal = null;
    let userName = "";

    let screens = null;

    function showScreen(screenId) {
        if (!screens) {
            screens = document.querySelectorAll('.screen');
        }
        screens.forEach(screen => {
            if (screen.id === screenId) {
                screen.classList.add('active');
            } else {
                screen.classList.remove('active');
            }
        });
        const exportBtn = document.getElementById('export-csv-btn');
        if (exportBtn) {
            exportBtn.style.display = (screenId === 'resultado-final-screen') ? 'inline-block' : 'none';
        }
    }

    function buildModulesGrid() {
        const grid = document.getElementById('modules-grid');
        if (!grid) return;
        grid.innerHTML = '';
        modulesConfig.forEach(mod => {
            const card = document.createElement('div');
            card.className = `module-card ${mod.active ? 'active' : 'disabled'}`;
            card.dataset.module = mod.key;
            card.innerHTML = `
                <div class="module-icon">${mod.icon}</div>
                <h3>${mod.name}</h3>
                <p>${mod.description}</p>
                <div class="module-status ${mod.active ? 'active' : 'development'}">${mod.active ? 'Ativo' : 'Em Desenvolvimento'}</div>
                <button class="btn ${mod.active ? 'btn--primary' : 'btn--secondary'}" ${mod.active ? '' : 'disabled'}>${mod.active ? 'Iniciar Avaliação' : 'Em Breve'}</button>
            `;
            grid.appendChild(card);
        });
    }

    function fetchModuleQuestions(mod) {
        return fetch(mod.jsonPath)
            .then(res => res.json())
            .then(data => {
                questoes = data;
                totalQuestions = questoes.length;
                respostasInicial = Array(totalQuestions).fill(null);
                respostasFinal = Array(totalQuestions).fill(null);
            })
            .catch(() => alert('Erro ao carregar questões.'));
    }

    function updateModuleTexts(mod) {
        document.getElementById('breadcrumb-module-name').textContent = mod.name;
        document.querySelectorAll('.breadcrumb-module').forEach(el => el.textContent = mod.name);
        const title = document.getElementById('module-title');
        const desc = document.getElementById('module-description');
        if (title) title.textContent = mod.name;
        if (desc) desc.textContent = mod.description;
    }

    function loadModule(mod) {
        currentModule = mod;
        fetchModuleQuestions(mod).then(() => {
            updateModuleTexts(mod);
            showScreen('module-intro-screen');
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        buildModulesGrid();
        setupEventListeners();

        const progresso = localStorage.getItem('progressoAvaliacao');
        if (progresso) {
            const dadosProgresso = JSON.parse(progresso);
            currentModule = modulesConfig.find(m => m.key === dadosProgresso.moduleKey) || null;
            if (currentModule) {
                fetchModuleQuestions(currentModule).then(() => {
                    const confirmarRetomar = confirm("Você tem um progresso salvo. Deseja retomar a avaliação?");
                    if (confirmarRetomar) {
                        currentQuestion = dadosProgresso.currentQuestion;
                        respostasInicial = dadosProgresso.respostasInicial;
                        respostasFinal = dadosProgresso.respostasFinal;
                        avaliacaoAtual = dadosProgresso.avaliacaoAtual;
                        notaInicial = dadosProgresso.notaInicial;
                        notaFinal = dadosProgresso.notaFinal;
                        userName = dadosProgresso.userName;
                        updateModuleTexts(currentModule);
                        if (avaliacaoAtual === 'inicial') {
                            showScreen('avaliacao-screen');
                            loadQuestion(currentQuestion);
                            updateProgress();
                        } else {
                            showScreen('resultado-final-screen');
                            document.getElementById('initial-final-score').textContent = `${notaInicial}/${totalQuestions}`;
                            document.getElementById('final-final-score').textContent = `${notaFinal}/${totalQuestions}`;
                            let eficacia = calcularEficacia(notaInicial, notaFinal, totalQuestions);
                            document.getElementById('eficacia-percentage').textContent = `${eficacia}%`;
                        }
                    }
                });
            }
        }

        screens = document.querySelectorAll('.screen');
        if (!document.getElementById('export-csv-btn')) {
            const exportBtn = document.createElement('button');
            exportBtn.id = 'export-csv-btn';
            exportBtn.className = 'btn btn--outline';
            exportBtn.textContent = 'Exportar Resultado';
            exportBtn.style.display = 'none';
            exportBtn.addEventListener('click', exportarResultadoCSV);
            const actionBtns = document.querySelector('#resultado-final-screen .action-buttons');
            if (actionBtns) actionBtns.insertBefore(exportBtn, actionBtns.firstChild);
        }
    });

    function setupEventListeners() {
        document.querySelectorAll('.module-card').forEach(card => {
            const moduleKey = card.getAttribute('data-module');
            const config = modulesConfig.find(m => m.key === moduleKey);
            const moduleButton = card.querySelector('button');
            if (!config || !moduleButton) return;
            moduleButton.addEventListener('click', function() {
                if (!config.active) {
                    alert('Este módulo está em desenvolvimento e estará disponível em breve.');
                    return;
                }
                loadModule(config);
            });
        });

        document.querySelectorAll('.back-to-home').forEach(button => {
            button.addEventListener('click', function() {
                showScreen('home-screen');
            });
        });

        document.getElementById('start-initial-btn').addEventListener('click', function() {
            userName = document.getElementById('user-name').value.trim();
            if (!userName) {
                alert('Por favor, digite seu nome para continuar.');
                return;
            }
            avaliacaoAtual = 'inicial';
            currentQuestion = 1;
            respostasInicial = Array(totalQuestions).fill(null);
            initializeAvaliacao('inicial');
        });

        document.getElementById('prev-question').addEventListener('click', function() {
            navigateQuestion(-1);
        });

        document.getElementById('next-question').addEventListener('click', function() {
            navigateQuestion(1);
        });

        document.getElementById('finish-evaluation').addEventListener('click', function() {
            finishEvaluation();
        });

        document.getElementById('continue-to-instructions').addEventListener('click', function() {
            showScreen('instrucoes-screen');
            document.getElementById('initial-score-display').textContent = notaInicial;
        });

        document.getElementById('start-final-btn').addEventListener('click', function() {
            avaliacaoAtual = 'final';
            currentQuestion = 1;
            respostasFinal = Array(totalQuestions).fill(null);
            initializeAvaliacao('final');
        });

        document.getElementById('new-evaluation-btn').addEventListener('click', function() {
            resetApplication();
            if (currentModule) updateModuleTexts(currentModule);
            showScreen('module-intro-screen');
        });
    }

    function initializeAvaliacao(type) {
        document.getElementById('avaliacao-title').textContent = type === 'inicial' ? 'Avaliação Inicial' : 'Avaliação Final';
        document.getElementById('breadcrumb-avaliacao').textContent = type === 'inicial' ? 'Avaliação Inicial' : 'Avaliação Final';
        currentQuestion = 1;
        loadQuestion(currentQuestion);
        updateProgress();
        showScreen('avaliacao-screen');
    }

    function loadQuestion(num) {
        const questao = questoes[num - 1];
        const alternativasContainer = document.getElementById('alternativas-container');
        const questionContainer = document.querySelector('.questao-container');
        if (questionContainer) questionContainer.classList.remove('unanswered');
        const warningEl = document.getElementById('unanswered-warning');
        if (warningEl) warningEl.classList.add('hidden');
        document.getElementById('questao-numero').textContent = num;
        document.getElementById('questao-texto').textContent = questao.pergunta;
        alternativasContainer.innerHTML = '';
        questao.alternativas.forEach((alternativa, index) => {
            const letter = String.fromCharCode(65 + index); // A, B, C, D...
            const isSelected = avaliacaoAtual === 'inicial'
                ? respostasInicial[num - 1] === letter
                : respostasFinal[num - 1] === letter;
            const alternativaEl = document.createElement('div');
            alternativaEl.className = `alternativa${isSelected ? ' selected' : ''}`;

            const inputEl = document.createElement('input');
            inputEl.type = 'radio';
            inputEl.id = `alt-${letter}`;
            inputEl.name = `question${num}`;
            inputEl.value = letter;
            if (isSelected) inputEl.checked = true;

            const labelEl = document.createElement('label');
            labelEl.setAttribute('for', `alt-${letter}`);
            labelEl.className = 'alternativa-text';
            labelEl.textContent = alternativa;

            alternativaEl.appendChild(inputEl);
            alternativaEl.appendChild(labelEl);

            alternativaEl.addEventListener('click', function() {
                document.querySelectorAll('.alternativa').forEach(alt => {
                    alt.classList.remove('selected');
                });
                this.classList.add('selected');
                this.querySelector('input').checked = true;
                if (avaliacaoAtual === 'inicial') {
                    respostasInicial[num - 1] = letter;
                } else {
                    respostasFinal[num - 1] = letter;
                }
                if (questionContainer) questionContainer.classList.remove('unanswered');
                if (warningEl) warningEl.classList.add('hidden');
                updateNavigationButtons();
                salvarProgresso();
            });
            alternativasContainer.appendChild(alternativaEl);
        });
        updateNavigationButtons();
    }

    function calculateScore(respostas) {
        let score = 0;
        for (let i = 0; i < totalQuestions; i++) {
            if (respostas[i] === gabarito[i]) score++;
        }
        return score;
    }

    function calcularEficacia(notaInicial, notaFinal, total) {
        if (notaInicial === null || notaFinal === null) return 0;
        let eficacia = ((notaFinal - notaInicial) / (total - notaInicial)) * 100;
        return Math.max(0, Math.round(eficacia));
    }

    function updateProgress() {
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        const progress = (currentQuestion / totalQuestions) * 100;
        progressFill.style.width = `${progress}%`;
        progressText.textContent = `Questão ${currentQuestion} de ${totalQuestions}`;
    }

    function navigateQuestion(direction) {
        const newQuestion = currentQuestion + direction;
        if (newQuestion < 1 || newQuestion > totalQuestions) {
            return;
        }
        currentQuestion = newQuestion;
        loadQuestion(currentQuestion);
        updateProgress();
    }

    function salvarProgresso() {
        localStorage.setItem('progressoAvaliacao', JSON.stringify({
            moduleKey: currentModule ? currentModule.key : null,
            currentQuestion,
            respostasInicial,
            respostasFinal,
            avaliacaoAtual,
            notaInicial,
            notaFinal,
            userName
        }));
    }

    function updateNavigationButtons() {
        const prevButton = document.getElementById('prev-question');
        const nextButton = document.getElementById('next-question');
        const finishButton = document.getElementById('finish-evaluation');
        prevButton.style.visibility = currentQuestion > 1 ? 'visible' : 'hidden';
        if (currentQuestion < totalQuestions) {
            nextButton.classList.remove('hidden');
            finishButton.classList.add('hidden');
            const respostas = (avaliacaoAtual === 'inicial') ? respostasInicial : respostasFinal;
            nextButton.disabled = !respostas[currentQuestion - 1];
        } else {
            nextButton.classList.add('hidden');
            finishButton.classList.remove('hidden');
        }
        const respostas = avaliacaoAtual === 'inicial' ? respostasInicial : respostasFinal;
        const allAnswered = respostas.every((resp, index) => index >= totalQuestions || resp !== null);
        finishButton.disabled = !allAnswered;
    }

    window.addEventListener('beforeunload', function(e) {
        if (currentQuestion > 0 && currentQuestion <= totalQuestions) {
            e.preventDefault();
            e.returnValue = "Tem certeza que deseja sair? O progresso da avaliação será perdido.";
        }
    });

    function finishEvaluation() {
        const respostas = avaliacaoAtual === 'inicial' ? respostasInicial : respostasFinal;
        const unansweredQuestions = respostas.findIndex((resp, index) => index < totalQuestions && resp === null);
        if (unansweredQuestions !== -1) {
            alert(`Por favor, responda a questão ${unansweredQuestions + 1} antes de finalizar.`);
            currentQuestion = unansweredQuestions + 1;
            loadQuestion(currentQuestion);
            updateProgress();
            const questionContainer = document.querySelector('.questao-container');
            const warningEl = document.getElementById('unanswered-warning');
            if (questionContainer) questionContainer.classList.add('unanswered');
            if (warningEl) {
                warningEl.textContent = 'Responda esta questão antes de continuar.';
                warningEl.classList.remove('hidden');
            }
            return;
        }
        if (avaliacaoAtual === 'inicial') {
            notaInicial = calculateScore(respostasInicial);
            showScreen('resultado-screen');
            document.getElementById('score-value').textContent = notaInicial;
            document.getElementById('score-percentage').textContent = `${Math.round((notaInicial / totalQuestions) * 100)}%`;
        } else {
            notaFinal = calculateScore(respostasFinal);
            showScreen('resultado-final-screen');
            const initialFinalScore = document.getElementById('initial-final-score');
            const finalFinalScore = document.getElementById('final-final-score');
            const eficaciaPercentage = document.getElementById('eficacia-percentage');
            if (initialFinalScore) initialFinalScore.textContent = `${notaInicial}/${totalQuestions}`;
            if (finalFinalScore) finalFinalScore.textContent = `${notaFinal}/${totalQuestions}`;
            let eficacia = calcularEficacia(notaInicial, notaFinal, totalQuestions);
            if (eficaciaPercentage) eficaciaPercentage.textContent = `${eficacia}%`;
        }
    }

    function resetApplication() {
        currentQuestion = 1;
        respostasInicial = Array(totalQuestions).fill(null);
        respostasFinal = Array(totalQuestions).fill(null);
        notaInicial = 0;
        notaFinal = 0;
        userName = "";
        avaliacaoAtual = "inicial";
        document.getElementById('user-name').value = "";
        localStorage.removeItem('progressoAvaliacao');
    }

    window.addEventListener('keydown', function(e) {
        if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
            alert("Modo desenvolvedor ativado. Jogue limpo!");
        }
    });

    function exportarResultadoCSV() {
        const header = [
            'Nome',
            'Nota Inicial',
            'Nota Final',
            'Eficácia',
            'Respostas Inicial',
            'Respostas Final'
        ];
        const eficacia = calcularEficacia(notaInicial, notaFinal, totalQuestions);
        const row = [
            userName,
            notaInicial,
            notaFinal,
            `${eficacia}%`,
            respostasInicial.join(','),
            respostasFinal.join(',')
        ];
        const csvContent = [header.join(','), row.join(',')].join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `resultado_avaliacao_${userName.replace(/\s+/g, '_')}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
})();
