// ====== CONFIGURAÇÃO ======
const WEBHOOK_URL = "https://script.google.com/a/macros/grupobplan.com.br/s/AKfycbyZEnh1sstlXo2pgQzYRyPaoNP6Q9b111twVPVcYE0UI5LdkwImJBTWnW4BE1_pwhfLnA/exec"

// Global variables
let currentQuestion = 1;
let totalQuestions = 10;
let questoes = [];
let respostasInicial = Array(totalQuestions).fill(null);
let respostasFinal = Array(totalQuestions).fill(null);
let notaInicial = 0;
let notaFinal = 0;
let userName = "";
let avaliacaoAtual = "inicial"; // 'inicial' ou 'final'

// DOM elements
const screens = document.querySelectorAll('.screen');

// Load questions from JSON file
document.addEventListener('DOMContentLoaded', async function() {
    try {
        questoes = getQuestions();
        setupEventListeners();
    } catch (error) {
        console.error('Erro ao carregar as questões:', error);
        alert('Erro ao carregar as questões. Por favor, tente novamente mais tarde.');
    }
});

function getQuestions() {
    // ... Suas questões aqui ...
    return [
      // Coloque o array de questões aqui
    ];
}

function setupEventListeners() {
    // Module selection
    document.querySelectorAll('.module-card').forEach(card => {
        const moduleButton = card.querySelector('button');
        moduleButton.addEventListener('click', function() {
            const moduleType = card.getAttribute('data-module');
            if (moduleType === 'seguranca') {
                showScreen('seguranca-inicio');
            } else {
                alert('Este módulo está em desenvolvimento e estará disponível em breve.');
            }
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
        showScreen('seguranca-inicio');
    });
}

function showScreen(screenId) {
    screens.forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
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
        alternativaEl.innerHTML = `
            <input type="radio" id="alt-${letter}" name="question${num}" value="${letter}" ${isSelected ? 'checked' : ''}>
            <label for="alt-${letter}" class="alternativa-text">${alternativa}</label>
        `;
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
            updateNavigationButtons();
        });
        alternativasContainer.appendChild(alternativaEl);
    });
    updateNavigationButtons();
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

function updateNavigationButtons() {
    const prevButton = document.getElementById('prev-question');
    const nextButton = document.getElementById('next-question');
    const finishButton = document.getElementById('finish-evaluation');
    prevButton.style.visibility = currentQuestion > 1 ? 'visible' : 'hidden';
    if (currentQuestion < totalQuestions) {
        nextButton.classList.remove('hidden');
        finishButton.classList.add('hidden');
    } else {
        nextButton.classList.add('hidden');
        finishButton.classList.remove('hidden');
    }
    const respostas = avaliacaoAtual === 'inicial' ? respostasInicial : respostasFinal;
    const allAnswered = respostas.every((resp, index) => index >= totalQuestions || resp !== null);
    finishButton.disabled = !allAnswered;
}

function calculateScore(respostas) {
    let score = 0;
    questoes.forEach((questao, index) => {
        if (respostas[index] === questao.respostaCerta) {
            score++;
        }
    });
    return score;
}

function finishEvaluation() {
    const respostas = avaliacaoAtual === 'inicial' ? respostasInicial : respostasFinal;
    const unansweredQuestions = respostas.findIndex((resp, index) => index < totalQuestions && resp === null);
    if (unansweredQuestions !== -1) {
        alert(`Por favor, responda a questão ${unansweredQuestions + 1} antes de finalizar.`);
        currentQuestion = unansweredQuestions + 1;
        loadQuestion(currentQuestion);
        updateProgress();
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
        document.getElementById('initial-final-score').textContent = `${notaInicial}/${totalQuestions}`;
        document.getElementById('final-final-score').textContent = `${notaFinal}/${totalQuestions}`;
        let eficacia = 0;
        if (notaInicial < totalQuestions) {
            eficacia = ((notaFinal - notaInicial) / (totalQuestions - notaInicial)) * 100;
        }
        eficacia = Math.max(0, Math.round(eficacia));
        document.getElementById('eficacia-percentage').textContent = `${eficacia}%`;
        // Chamar função para enviar para a planilha
        enviarResultadoParaPlanilha({
            nome: userName,
            notaInicial: notaInicial,
            notaFinal: notaFinal,
            eficacia: eficacia,
            respostasInicial: respostasInicial.join(','),
            respostasFinal: respostasFinal.join(',')
        });
    }
}

function enviarResultadoParaPlanilha(dados) {
    fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(dados)
    }).then(response => {
        // Opcional: mostrar mensagem de sucesso
    }).catch(error => {
        alert('Erro ao salvar resultado na planilha.');
    });
}

function resetApplication() {
    currentQuestion = 1;
    respostasInicial = Array(totalQuestions).fill(null);
    respostasFinal = Array(totalQuestions).fill(null);
    notaInicial = 0;
    notaFinal = 0;
    userName = "";
    avaliacaoAtual = "inicial";
}

