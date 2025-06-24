const { calculateScore, calcularEficacia } = require('../app');

describe('calculateScore', () => {
  const gabarito = ["C","C","C","B","C","C","C","B","C","C"];

  test('returns full score when all answers correct', () => {
    expect(calculateScore(gabarito)).toBe(10);
  });

  test('returns partial score for partially correct answers', () => {
    const respostas = [...gabarito];
    respostas[5] = 'A';
    respostas[6] = 'A';
    respostas[7] = 'A';
    respostas[8] = 'A';
    respostas[9] = 'A';
    expect(calculateScore(respostas)).toBe(5);
  });
});

describe('calcularEficacia', () => {
  test('calculates positive efficacy', () => {
    expect(calcularEficacia(5, 8, 10)).toBe(60);
  });

  test('returns zero when efficacy is negative', () => {
    expect(calcularEficacia(8, 5, 10)).toBe(0);
  });

  test('returns zero when any note is null', () => {
    expect(calcularEficacia(null, 5, 10)).toBe(0);
    expect(calcularEficacia(5, null, 10)).toBe(0);
  });
});
