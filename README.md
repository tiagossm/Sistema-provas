# Sistema de Provas

Sistema de avaliação modular desenvolvido em HTML, CSS e JavaScript. Ele
permite que o usuário realize provas em dois momentos (inicial e final) e
calcula a eficácia do aprendizado ao final.

## Executando

1. Clone este repositório ou faça o download dos arquivos.
2. Abra `index.html` em um navegador moderno. Não é necessário servidor ou
instalação de dependências.

O aplicativo carrega as perguntas a partir do arquivo `questoes_soc.json` e
utiliza `app.js` para controlar a navegação e o cálculo das notas.

## Adicionando Conjuntos de Questões

As perguntas ficam armazenadas em `questoes_soc.json`. Cada questão segue o
formato:

```json
{
  "numero": 1,
  "pergunta": "Texto da pergunta",
  "alternativas": ["A) ...", "B) ...", "C) ...", "D) ..."]
}
```

1. Adicione novas questões ao array em `questoes_soc.json` mantendo a
numeração sequencial.
2. Atualize o gabarito (ordem das respostas corretas) no início de `app.js` em
`const gabarito = [...]` para corresponder às novas perguntas.

## Instalação e Configuração

Não há etapas de instalação. Para desenvolvimento, recomenda-se manter os
arquivos em um servidor local (ex.: `npx serve` ou o servidor do seu editor)
caso o navegador bloqueie requisições locais ao JSON.

## Contribuindo

Contribuições são bem-vindas! Abra issues para reportar problemas ou sugerir
melhorias. Para enviar código, faça um fork do projeto, crie uma branch com sua
alteração e envie um pull request descrevendo suas mudanças.

## Licença

Este projeto está licenciado sob os termos da [MIT License](LICENSE).
