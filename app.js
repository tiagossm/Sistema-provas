(() => {
    // Internacionalização (exemplo, pode ser expandido)
    const i18n = {
        pt: {
            correct: "Correta",
            incorrect: "Incorreta",
            unanswered: "Não respondida",
            answered: "Respondida",
            exportHistory: "Exportar Histórico",
            exportResult: "Exportar Resultado",
            errorLoad: "Erro ao carregar questões.",
            errorName: "Por favor, digite seu nome para continuar.",
            errorUnanswered: "Responda esta questão antes de continuar.",
            errorSend: "Falha ao enviar o resultado.",
            successSend: "Resultado enviado com sucesso!",
            confirmResume: "Você tem um progresso salvo. Deseja retomar a avaliação?",
            home: "Menu Principal"
        }
        // Outras línguas podem ser adicionadas aqui
    };
    const lang = "pt";
    function t(key) { return i18n[lang][key] || key; }

    // Histórico local
    let historico = JSON.parse(localStorage.getItem('historicoAvaliacao') || "[]");

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
    let gabarito = [];
    let questoes = [];
    let respostasInicial = [];
    let respostasFinal = [];
    let currentQuestion = 1;
    let totalQuestions = 0;
    let avaliacaoAtual = 'inicial';
    let notaInicial = null;
    let notaFinal = null;
    let userCPF = "";
    let userNome = "";
    let userCargo = "";
    let userUnidade = "";
    let screens = null;
    let isLoggedIn = false;
    let isAdmin = false;
    let initialStartTime = null;
    let finalStartTime = null;
    let initialEndTime = null;
    let finalEndTime = null;

    // CPF master liberado
    const MASTER_CPF = "36505921850";

    function showScreen(screenId) {
        if (!screens) screens = document.querySelectorAll('.screen');
        screens.forEach(screen => {
            screen.classList.toggle('active', screen.id === screenId);
        });
        const exportBtn = document.getElementById('export-csv-btn');
        if (exportBtn) exportBtn.style.display = (screenId === 'resultado-final-screen') ? 'inline-block' : 'none';
        const exportHistBtn = document.getElementById('export-history-btn');
        if (exportHistBtn) {
            exportHistBtn.style.display = (screenId === 'home-screen' && userCPF === MASTER_CPF) ? 'inline-block' : 'none';
        }
        const uploadDiv = document.getElementById('upload-container');
        if (uploadDiv) {
            uploadDiv.style.display = (screenId === 'module-intro-screen' && isAdmin) ? '' : 'none';
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

    function shuffleArray(array) {
        // Algoritmo Fisher-Yates
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    function saveUploadedQuestions(modKey, data) {
        localStorage.setItem('questions_' + modKey, JSON.stringify(data));
    }

    function getUploadedQuestions(modKey) {
        const stored = localStorage.getItem('questions_' + modKey);
        if (!stored) return null;
        try { return JSON.parse(stored); } catch (e) { return null; }
    }

    function validateQuestionData(data) {
        if (!data || !Array.isArray(data.perguntas) || !Array.isArray(data.gabarito)) return false;
        if (data.perguntas.length !== data.gabarito.length || !data.perguntas.length) return false;
        return data.perguntas.every(q => q && q.pergunta && Array.isArray(q.alternativas));
    }

    function processQuestionData(data) {
        if (!validateQuestionData(data)) throw new Error('invalid');
        const indices = Array.from({ length: data.perguntas.length }, (_, i) => i);
        shuffleArray(indices);
        questoes = indices.map(i => data.perguntas[i]);
        gabarito = indices.map(i => data.gabarito[i]);
        totalQuestions = questoes.length;
        respostasInicial = Array(totalQuestions).fill(null);
        respostasFinal = Array(totalQuestions).fill(null);
    }

    function handleQuestionUpload(e) {
        const file = e.target.files[0];
        if (!file || !currentModule) return;
        const reader = new FileReader();
        reader.onload = function(ev) {
            try {
                const data = JSON.parse(ev.target.result);
                if (!validateQuestionData(data)) throw new Error();
                saveUploadedQuestions(currentModule.key, data);
                processQuestionData(data);
                const feed = document.getElementById('upload-feedback');
                if (feed) feed.textContent = 'Arquivo carregado!';
            } catch (err) {
                showInlineError('JSON inválido');
                const feed = document.getElementById('upload-feedback');
                if (feed) feed.textContent = '';
            }
        };
        reader.readAsText(file);
    }

    function fetchModuleQuestions(mod) {
        const uploaded = getUploadedQuestions(mod.key);
        if (uploaded) {
            try {
                processQuestionData(uploaded);
                return Promise.resolve();
            } catch (e) {
                localStorage.removeItem('questions_' + mod.key);
                showInlineError('Arquivo de questões inválido, usando padrão.');
            }
        }
        return fetch(mod.jsonPath)
            .then(res => res.json())
            .then(data => { processQuestionData(data); })
            .catch(() => showInlineError(t('errorLoad')));
    }

    function showInlineError(msg) {
        let el = document.getElementById('inline-error');
        if (!el) {
            el = document.createElement('div');
            el.id = 'inline-error';
            el.style.color = 'red';
            el.style.textAlign = 'center';
            el.style.margin = '10px 0';
            document.body.prepend(el);
        }
        el.textContent = msg;
        setTimeout(() => { el.textContent = ""; }, 4000);
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
        // Exibe botão de exportar histórico apenas para o CPF master
        let exportHistBtn = document.getElementById('export-history-btn');
        if (!exportHistBtn) {
            exportHistBtn = document.createElement('button');
            exportHistBtn.id = 'export-history-btn';
            exportHistBtn.className = 'btn btn--outline';
            exportHistBtn.textContent = 'Exportar Todos os Resultados';
            exportHistBtn.style.display = 'none';
            exportHistBtn.addEventListener('click', exportarHistoricoCSV);
            const homeScreen = document.querySelector('#home-screen .welcome');
            if (homeScreen) homeScreen.appendChild(exportHistBtn);
        }
        const progresso = localStorage.getItem('progressoAvaliacao');
        if (progresso) {
            const dadosProgresso = JSON.parse(progresso);
            currentModule = modulesConfig.find(m => m.key === dadosProgresso.moduleKey) || null;
            if (currentModule) {
                fetchModuleQuestions(currentModule).then(() => {
                    const confirmarRetomar = confirm(t('confirmResume'));
                    if (confirmarRetomar) {
                        currentQuestion = dadosProgresso.currentQuestion;
                        respostasInicial = dadosProgresso.respostasInicial;
                        respostasFinal = dadosProgresso.respostasFinal;
                        avaliacaoAtual = dadosProgresso.avaliacaoAtual;
                        notaInicial = dadosProgresso.notaInicial;
                        notaFinal = dadosProgresso.notaFinal;
                        userCPF = dadosProgresso.userCPF;
                        initialStartTime = dadosProgresso.initialStartTime || null;
                        finalStartTime = dadosProgresso.finalStartTime || null;
                        initialEndTime = dadosProgresso.initialEndTime || null;
                        finalEndTime = dadosProgresso.finalEndTime || null;
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
        // Corrige o botão de exportação para garantir que só exista um e sempre funcione
        let exportBtn = document.getElementById('export-csv-btn');
        if (!exportBtn) {
            exportBtn = document.createElement('button');
            exportBtn.id = 'export-csv-btn';
            exportBtn.className = 'btn btn--outline';
            exportBtn.textContent = 'Exportar Resultado';
            exportBtn.style.display = 'none';
            const actionBtns = document.querySelector('#resultado-final-screen .action-buttons');
            if (actionBtns) actionBtns.insertBefore(exportBtn, actionBtns.firstChild);
        }
        // Sempre remove event listeners antigos antes de adicionar o novo
        exportBtn.replaceWith(exportBtn.cloneNode(true));
        exportBtn = document.getElementById('export-csv-btn');
        exportBtn.addEventListener('click', exportarResultadoCSV);

        const fileInput = document.getElementById('question-file-input');
        if (fileInput) {
            fileInput.value = '';
            fileInput.addEventListener('change', handleQuestionUpload);
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
            userNome = document.getElementById('user-nome').value.trim();
            userCPF = document.getElementById('user-cpf').value.trim();
            userCargo = document.getElementById('user-cargo').value.trim();
            userUnidade = document.getElementById('user-unidade').value.trim();
            if (!userNome) {
                alert("Por favor, digite seu nome.");
                return;
            }
            if (!userCPF || !/^\d{11}$/.test(userCPF)) {
                alert("Por favor, digite um CPF válido (apenas números, 11 dígitos).");
                return;
            }
            // Limite de tentativas por CPF, exceto para master
            if (userCPF !== MASTER_CPF) {
                const tentativas = getTentativasCPF(userCPF, currentModule ? currentModule.key : "");
                if (tentativas >= 3) {
                    alert("Limite de 3 tentativas atingido para este CPF neste módulo.");
                    return;
                }
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
        if (type === 'inicial') {
            if (!initialStartTime) initialStartTime = new Date().toISOString();
        } else {
            if (!finalStartTime) finalStartTime = new Date().toISOString();
        }
        loadQuestion(currentQuestion);
        updateProgress();
        showScreen('avaliacao-screen');
        salvarProgresso();
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

        // Renderiza alternativas normais
        questao.alternativas.forEach((alternativa, index) => {
            const letter = String.fromCharCode(65 + index); // A, B, C, D...
            const isSelected = avaliacaoAtual === 'inicial'
                ? respostasInicial[num - 1] === letter
                : respostasFinal[num - 1] === letter;
            const alternativaEl = document.createElement('label');
            alternativaEl.className = `alternativa${isSelected ? ' selected' : ''}`;

            const inputEl = document.createElement('input');
            inputEl.type = 'radio';
            inputEl.name = `question${num}`;
            inputEl.value = letter;
            if (isSelected) inputEl.checked = true;

            const spanEl = document.createElement('span');
            spanEl.className = 'alternativa-text';
            spanEl.textContent = alternativa;

            alternativaEl.appendChild(inputEl);
            alternativaEl.appendChild(spanEl);

            alternativaEl.addEventListener('click', function(e) {
                // Permite selecionar clicando no label
                document.querySelectorAll(`input[name="question${num}"]`).forEach(inp => inp.checked = false);
                inputEl.checked = true;
                document.querySelectorAll('.alternativa').forEach(alt => alt.classList.remove('selected'));
                this.classList.add('selected');
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

        // Adiciona opção "Não responder"
        const isSelectedNR = (avaliacaoAtual === 'inicial'
            ? respostasInicial[num - 1]
            : respostasFinal[num - 1]) === 'nao-respondeu';
        const naoRespEl = document.createElement('label');
        naoRespEl.className = `alternativa${isSelectedNR ? ' selected' : ''}`;
        const inputNR = document.createElement('input');
        inputNR.type = 'radio';
        inputNR.name = `question${num}`;
        inputNR.value = 'nao-respondeu';
        if (isSelectedNR) inputNR.checked = true;
        const spanNR = document.createElement('span');
        spanNR.className = 'alternativa-text';
        spanNR.textContent = 'Não responder';
        naoRespEl.appendChild(inputNR);
        naoRespEl.appendChild(spanNR);
        naoRespEl.addEventListener('click', function(e) {
            document.querySelectorAll(`input[name="question${num}"]`).forEach(inp => inp.checked = false);
            inputNR.checked = true;
            document.querySelectorAll('.alternativa').forEach(alt => alt.classList.remove('selected'));
            this.classList.add('selected');
            if (avaliacaoAtual === 'inicial') {
                respostasInicial[num - 1] = 'nao-respondeu';
            } else {
                respostasFinal[num - 1] = 'nao-respondeu';
            }
            if (questionContainer) questionContainer.classList.remove('unanswered');
            if (warningEl) warningEl.classList.add('hidden');
            updateNavigationButtons();
            salvarProgresso();
        });
        alternativasContainer.appendChild(naoRespEl);

        // Adiciona atributo tabindex para acessibilidade
        document.querySelectorAll('.alternativa').forEach((alt, idx, arr) => {
            alt.setAttribute('tabindex', 0);
            alt.onkeydown = function(e) {
                if (e.key === " " || e.key === "Enter") {
                    alt.click();
                    e.preventDefault();
                } else if (e.key === "ArrowDown" || e.key === "ArrowRight") {
                    if (arr[idx + 1]) arr[idx + 1].focus();
                    else arr[0].focus();
                    e.preventDefault();
                } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
                    if (arr[idx - 1]) arr[idx - 1].focus();
                    else arr[arr.length - 1].focus();
                    e.preventDefault();
                }
            };
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
            userCPF,
            initialStartTime,
            finalStartTime,
            initialEndTime,
            finalEndTime
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
            if (!initialEndTime) initialEndTime = new Date().toISOString();
        } else {
            if (!finalEndTime) finalEndTime = new Date().toISOString();
        }
        if (avaliacaoAtual === 'inicial') {
            notaInicial = calculateScore(respostasInicial);
            showScreen('resultado-screen');
            document.getElementById('score-value').textContent = notaInicial;
            document.getElementById('score-percentage').textContent = `${Math.round((notaInicial / totalQuestions) * 100)}%`;
            salvarProgresso();
        } else {
            notaFinal = calculateScore(respostasFinal);
            showScreen('resultado-final-screen');
            // Atualiza campos do resultado final
            const initialFinalScore = document.getElementById('initial-final-score');
            const finalFinalScore = document.getElementById('final-final-score');
            const eficaciaPercentage = document.getElementById('eficacia-percentage');
            const eficaciaCategory = document.getElementById('eficacia-category');
            const eficaciaDesc = document.getElementById('eficacia-description');
            const eficaciaCircle = document.querySelector('.eficacia-circle');
            let eficacia = calcularEficacia(notaInicial, notaFinal, totalQuestions);
            if (initialFinalScore) initialFinalScore.textContent = `${notaInicial}/${totalQuestions}`;
            if (finalFinalScore) finalFinalScore.textContent = `${notaFinal}/${totalQuestions}`;
            if (eficaciaPercentage) eficaciaPercentage.textContent = `Eficácia: ${eficacia}%`;
            // Categoria de eficácia
            let cat = eficaciaCategorias.find(c => eficacia >= c.min) || eficaciaCategorias[eficaciaCategorias.length - 1];
            if (eficaciaCategory) {
                eficaciaCategory.textContent = cat.label;
                eficaciaCategory.className = `eficacia-category ${cat.cor}`;
            }
            if (eficaciaDesc) eficaciaDesc.textContent = cat.desc;
            if (eficaciaCircle) {
                eficaciaCircle.className = `eficacia-circle ${cat.cor}`;
            }
            // Exibe botão de exportação CSV
            const exportBtn = document.getElementById('export-csv-btn');
            if (exportBtn) exportBtn.style.display = 'inline-block';
            // Limpa mensagem de envio anterior
            const mensagemEnvio = document.getElementById('mensagem-envio');
            if (mensagemEnvio) mensagemEnvio.textContent = "";
            // Envia resultado para planilha (opcional, pode comentar se não usar)
            enviarResultadoParaPlanilha();
            // Salva no histórico local
            historico.push({
                data: new Date().toISOString(),
                modulo: currentModule ? currentModule.name : "",
                moduloKey: currentModule ? currentModule.key : "",
                cpf: userCPF,
                nome: userNome,
                cargo: userCargo,
                unidade: userUnidade,
                initialStartTime,
                initialEndTime,
                finalStartTime,
                finalEndTime,
                notaInicial,
                notaFinal,
                eficacia: calcularEficacia(notaInicial, notaFinal, totalQuestions),
                respostasInicial: [...respostasInicial],
                respostasFinal: [...respostasFinal]
            });
            localStorage.setItem('historicoAvaliacao', JSON.stringify(historico));
            salvarProgresso();
            renderReviewFinal();
        }
    }

    // Caminhos dos ícones (ajuste se necessário)
    const ICON_CORRECT = "check.png"; // nome do arquivo do ícone correto (verde)
    const ICON_INCORRECT = "x.png";   // nome do arquivo do ícone incorreto (vermelho)

    // Ícone de status para revisão final: verde para correto, X vermelho para errado, círculo para não respondido
    function getIconeStatus(resposta, gabarito) {
        if (resposta === 'nao-respondeu' || resposta == null) {
            return '<span class="answer-status unanswered" title="Não respondida">○</span>';
        }
        if (resposta === gabarito) {
            return `<span class="answer-status correct" title="Correta" style="color:#24cc85;background:none;">✔</span>`;
        }
        return `<span class="answer-status incorrect" title="Incorreta" style="color:#ea7070;background:none;">✖</span>`;
    }

    function renderReviewFinal() {
        const reviewDiv = document.getElementById('answers-review-final');
        if (!reviewDiv) return;
        reviewDiv.innerHTML = "";
        for (let i = 0; i < totalQuestions; i++) {
            const userResp = respostasFinal[i];
            const correct = gabarito[i];
            const statusIcon = getIconeStatus(userResp, correct);
            const item = document.createElement('div');
            item.className = 'answer-item';
            item.innerHTML = `
                ${statusIcon}
                <span><strong>${i + 1}.</strong> ${questoes[i].pergunta}</span>
            `;
            reviewDiv.appendChild(item);
        }
    }

    function exportarHistoricoCSV() {
        // Exporta todos os resultados apenas para o CPF master
        if (userCPF !== MASTER_CPF) {
            showInlineError("Apenas o usuário master pode exportar todos os resultados.");
            return;
        }
        if (!historico.length) {
            showInlineError("Nenhum histórico para exportar.");
            return;
        }
        const header = [
            'Data', 'Módulo', 'CPF', 'Nome', 'Cargo', 'Unidade', 'Nota Inicial', 'Nota Final', 'Eficácia', 'Respostas Inicial', 'Respostas Final'
        ];
        const rows = historico.map(h =>
            [
                h.data,
                h.modulo,
                h.cpf,
                h.nome,
                h.cargo || "",
                h.unidade || "",
                h.notaInicial,
                h.notaFinal,
                `${h.eficacia}%`,
                h.respostasInicial.join(','),
                h.respostasFinal.join(',')
            ].join(',')
        );
        const csvContent = [header.join(','), ...rows].join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `historico_avaliacoes.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Exportação de resultados em CSV individual
    function exportarResultadoCSV() {
        const header = [
            'CPF',
            'Nome',
            'Cargo',
            'Unidade',
            'Nota Inicial',
            'Nota Final',
            'Eficácia (%)'
        ];
        const eficacia = calcularEficacia(notaInicial, notaFinal, totalQuestions);
        const row = [
            userCPF,
            userNome,
            userCargo,
            userUnidade,
            notaInicial,
            notaFinal,
            eficacia
        ];
        const csvContent = [header.join(','), row.join(',')].join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `resultado_avaliacao_${userCPF}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function enviarResultadoParaPlanilha() {
        // Implemente aqui o envio real se desejar, ou apenas deixe vazio para evitar erro.
        // Exemplo de placeholder:
        // console.log("Função enviarResultadoParaPlanilha chamada (placeholder).");
    }

    function resetApplication() {
        currentQuestion = 1;
        respostasInicial = Array(totalQuestions).fill(null);
        respostasFinal = Array(totalQuestions).fill(null);
        notaInicial = 0;
        notaFinal = 0;
        userCPF = "";
        userNome = "";
        userCargo = "";
        userUnidade = "";
        avaliacaoAtual = "inicial";
        initialStartTime = null;
        finalStartTime = null;
        initialEndTime = null;
        finalEndTime = null;
        document.getElementById('user-cpf').value = "";
        document.getElementById('user-nome').value = "";
        document.getElementById('user-cargo').value = "";
        document.getElementById('user-unidade').value = "";
        localStorage.removeItem('progressoAvaliacao');
    }

    // Adicione categorias de eficácia e instrução de acessibilidade
    const eficaciaCategorias = [
        { min: 90, label: "Excelente", cor: "excelente", desc: "Parabéns! Seu desempenho foi excelente." },
        { min: 70, label: "Boa", cor: "boa", desc: "Muito bom! Você atingiu um bom nível de eficácia." },
        { min: 50, label: "Regular", cor: "regular", desc: "Você pode melhorar. Reveja os pontos de dúvida." },
        { min: 0,  label: "Baixa", cor: "baixa", desc: "Atenção! Procure reforçar seus conhecimentos." }
    ];

    // Instrução de acessibilidade para navegação por teclado
    document.addEventListener('DOMContentLoaded', () => {
        // Adiciona instrução na tela de avaliação
        let accInstr = document.getElementById('acessibilidade-instrucao');
        if (!accInstr) {
            accInstr = document.createElement('div');
            accInstr.id = 'acessibilidade-instrucao';
            accInstr.style.fontSize = '13px';
            accInstr.style.color = '#666';
            accInstr.style.margin = '8px 0 0 0';
            accInstr.innerHTML = 'Dica: Use Tab para navegar entre alternativas e Enter ou Espaço para selecionar.';
            const questaoContent = document.querySelector('.questao-content');
            if (questaoContent) questaoContent.appendChild(accInstr);
        }
    });

    function getTentativasCPF(cpf, moduloKey) {
        const hist = JSON.parse(localStorage.getItem('historicoAvaliacao') || "[]");
        return hist.filter(h => h.cpf === cpf && h.moduloKey === moduloKey).length;
    }

    // Supabase config
    const SUPABASE_URL = 'https://ejuwbfcspcfcltzqpnkk.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqdXdiZmNzcGNmY2x0enFwbmtrIiwicm9zZSI6ImFub24iLCJpYXQiOjE3NTA4Nzc4NTIsImV4cCI6MjA2NjQ1Mzg1Mn0.eZZ_5X44IMHkhxlZAYEeathw9jmuBtkvMgmNyHOTOEc';
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // --- LOGIN/CADASTRO USUÁRIO SUPABASE ---
    async function cadastrarUsuarioSupabase({ cpf, nome, senha, cargo, unidade }) {
        // Para produção, use hash de senha no backend!
        const { data, error } = await supabase
            .from('usuarios')
            .insert([{ cpf, nome, senha, cargo, unidade }]);
        if (error) return { error };
        return { data };
    }

    async function autenticarUsuarioSupabase({ cpf, senha }) {
        // Para produção, compare hash!
        const { data, error } = await supabase
            .from('usuarios')
            .select('*')
            .eq('cpf', cpf)
            .eq('senha', senha)
            .single();
        if (error) return { error };
        return { data };
    }

    // --- TELA DE LOGIN/CADASTRO/RECUPERAÇÃO ---
    function showLoginScreen() {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        let loginDiv = document.getElementById('login-screen');
        if (!loginDiv) {
            loginDiv = document.createElement('div');
            loginDiv.id = 'login-screen';
            loginDiv.className = 'screen active';
            document.body.prepend(loginDiv);
        }
        loginDiv.innerHTML = `
            <div class="container" style="max-width:400px;margin:48px auto;">
                <h2 style="text-align:center;">Entrar no Sistema</h2>
                <div class="form-group">
                    <label for="login-cpf" class="form-label">CPF <span style="color:red">*</span></label>
                    <input type="text" id="login-cpf" class="form-control" placeholder="Apenas números, 11 dígitos" required>
                </div>
                <div class="form-group">
                    <label for="login-senha" class="form-label">Senha <span style="color:red">*</span></label>
                    <input type="password" id="login-senha" class="form-control" placeholder="Senha" required>
                </div>
                <div class="action-buttons" style="justify-content:center;">
                    <button id="login-btn" class="btn btn--primary">Entrar</button>
                    <button id="show-cadastro-btn" class="btn btn--outline">Cadastrar</button>
                </div>
                <div style="text-align:center;margin-top:10px;">
                    <a href="#" id="show-recuperar-btn" style="font-size:13px;">Esqueci minha senha</a>
                </div>
                <div id="login-error" style="color:red;text-align:center;margin-top:10px;"></div>
            </div>
        `;
        document.getElementById('login-btn').onclick = handleLogin;
        document.getElementById('show-cadastro-btn').onclick = showCadastroScreen;
        document.getElementById('show-recuperar-btn').onclick = showRecuperarSenhaScreen;
    }

    function showCadastroScreen() {
        let loginDiv = document.getElementById('login-screen');
        loginDiv.innerHTML = `
            <div class="container" style="max-width:400px;margin:48px auto;">
                <h2 style="text-align:center;">Cadastro de Usuário</h2>
                <div class="form-group">
                    <label for="cadastro-cpf" class="form-label">CPF <span style="color:red">*</span></label>
                    <input type="text" id="cadastro-cpf" class="form-control" placeholder="Apenas números, 11 dígitos" required>
                </div>
                <div class="form-group">
                    <label for="cadastro-nome" class="form-label">Nome completo <span style="color:red">*</span></label>
                    <input type="text" id="cadastro-nome" class="form-control" placeholder="Digite seu nome completo" required>
                </div>
                <div class="form-group">
                    <label for="cadastro-senha" class="form-label">Senha <span style="color:red">*</span></label>
                    <input type="password" id="cadastro-senha" class="form-control" placeholder="Senha" required>
                </div>
                <div class="form-group">
                    <label for="cadastro-cargo" class="form-label">Cargo</label>
                    <input type="text" id="cadastro-cargo" class="form-control" placeholder="Seu cargo">
                </div>
                <div class="form-group">
                    <label for="cadastro-unidade" class="form-label">Unidade</label>
                    <input type="text" id="cadastro-unidade" class="form-control" placeholder="Sua unidade">
                </div>
                <div class="action-buttons" style="justify-content:center;">
                    <button id="cadastrar-btn" class="btn btn--primary">Cadastrar</button>
                    <button id="voltar-login-btn" class="btn btn--outline">Voltar</button>
                </div>
                <div id="cadastro-error" style="color:red;text-align:center;margin-top:10px;"></div>
            </div>
        `;
        document.getElementById('cadastrar-btn').onclick = handleCadastro;
        document.getElementById('voltar-login-btn').onclick = showLoginScreen;
    }

    function showRecuperarSenhaScreen() {
        let loginDiv = document.getElementById('login-screen');
        loginDiv.innerHTML = `
            <div class="container" style="max-width:400px;margin:48px auto;">
                <h2 style="text-align:center;">Recuperar Senha</h2>
                <div class="form-group">
                    <label for="recuperar-cpf" class="form-label">CPF <span style="color:red">*</span></label>
                    <input type="text" id="recuperar-cpf" class="form-control" placeholder="Apenas números, 11 dígitos" required>
                </div>
                <div class="form-group">
                    <label for="recuperar-nome" class="form-label">Nome completo <span style="color:red">*</span></label>
                    <input type="text" id="recuperar-nome" class="form-control" placeholder="Digite seu nome completo" required>
                </div>
                <div class="form-group">
                    <label for="recuperar-nova-senha" class="form-label">Nova senha <span style="color:red">*</span></label>
                    <input type="password" id="recuperar-nova-senha" class="form-control" placeholder="Nova senha" required>
                </div>
                <div class="action-buttons" style="justify-content:center;">
                    <button id="recuperar-btn" class="btn btn--primary">Alterar Senha</button>
                    <button id="voltar-login-btn" class="btn btn--outline">Voltar</button>
                </div>
                <div id="recuperar-error" style="color:red;text-align:center;margin-top:10px;"></div>
            </div>
        `;
        document.getElementById('recuperar-btn').onclick = handleRecuperarSenha;
        document.getElementById('voltar-login-btn').onclick = showLoginScreen;
    }

    async function handleRecuperarSenha() {
        const cpf = document.getElementById('recuperar-cpf').value.trim();
        const nome = document.getElementById('recuperar-nome').value.trim();
        const novaSenha = document.getElementById('recuperar-nova-senha').value.trim();
        const errorDiv = document.getElementById('recuperar-error');
        if (!cpf || !/^\d{11}$/.test(cpf)) {
            errorDiv.textContent = "Digite um CPF válido (apenas números, 11 dígitos).";
            return;
        }
        if (!nome) {
            errorDiv.textContent = "Digite seu nome completo.";
            return;
        }
        if (!novaSenha) {
            errorDiv.textContent = "Digite a nova senha.";
            return;
        }
        // Busca usuário
        const { data, error } = await supabase
            .from('usuarios')
            .select('*')
            .eq('cpf', cpf)
            .eq('nome', nome)
            .single();
        if (error || !data) {
            errorDiv.textContent = "Usuário não encontrado. Verifique CPF e nome.";
            return;
        }
        // Atualiza senha
        const { error: updateError } = await supabase
            .from('usuarios')
            .update({ senha: novaSenha })
            .eq('cpf', cpf);
        if (updateError) {
            errorDiv.textContent = "Erro ao atualizar senha.";
            return;
        }
        errorDiv.style.color = "green";
        errorDiv.textContent = "Senha alterada com sucesso! Faça login.";
        setTimeout(showLoginScreen, 1200);
    }

    async function handleCadastro() {
        const cpf = document.getElementById('cadastro-cpf').value.trim();
        const nome = document.getElementById('cadastro-nome').value.trim();
        const senha = document.getElementById('cadastro-senha').value.trim();
        const cargo = document.getElementById('cadastro-cargo').value.trim();
        const unidade = document.getElementById('cadastro-unidade').value.trim();
        const errorDiv = document.getElementById('cadastro-error');
        if (!cpf || !/^\d{11}$/.test(cpf)) {
            errorDiv.textContent = "Digite um CPF válido (apenas números, 11 dígitos).";
            return;
        }
        if (!nome) {
            errorDiv.textContent = "Digite seu nome completo.";
            return;
        }
        if (!senha) {
            errorDiv.textContent = "Digite uma senha.";
            return;
        }
        // Tenta cadastrar no Supabase
        const { error } = await cadastrarUsuarioSupabase({ cpf, nome, senha, cargo, unidade });
        if (error) {
            errorDiv.textContent = "Erro ao cadastrar: " + (error.message || "CPF já cadastrado.");
            return;
        }
        errorDiv.style.color = "green";
        errorDiv.textContent = "Cadastro realizado com sucesso! Faça login.";
        setTimeout(showLoginScreen, 1200);
    }

    async function handleLogin() {
        const cpf = document.getElementById('login-cpf').value.trim();
        const senha = document.getElementById('login-senha').value.trim();
        const errorDiv = document.getElementById('login-error');
        if (!cpf || !/^\d{11}$/.test(cpf)) {
            errorDiv.textContent = "Digite um CPF válido (apenas números, 11 dígitos).";
            return;
        }
        if (!senha) {
            errorDiv.textContent = "Digite sua senha.";
            return;
        }
        // Autentica no Supabase
        const { data, error } = await autenticarUsuarioSupabase({ cpf, senha });
        if (error || !data) {
            errorDiv.textContent = "CPF ou senha inválidos.";
            return;
        }
        userCPF = data.cpf;
        userNome = data.nome;
        userCargo = data.cargo || "";
        userUnidade = data.unidade || "";
        isLoggedIn = true;
        isAdmin = !!data.admin || (userCPF === MASTER_CPF);
        errorDiv.textContent = "";
        document.getElementById('login-screen').classList.remove('active');
        showScreen('home-screen');
        // Exibe dashboard e botões avançados só para admin
        let dashDiv = document.getElementById('dashboard-supabase');
        if (dashDiv) dashDiv.style.display = isAdmin ? '' : 'none';
        let exportSupabaseBtn = document.getElementById('export-supabase-btn');
        if (exportSupabaseBtn) exportSupabaseBtn.style.display = isAdmin ? '' : 'none';
    }

    // Chame showLoginScreen por último para garantir que a tela de login fique ativa
    setTimeout(showLoginScreen, 0);
})();

