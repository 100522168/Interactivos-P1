// Importamos el módulo sentiment
const Sentiment = require('sentiment');
const sentiment = new Sentiment();

// Textos a analizar
const textos = [
  'I love this, it is wonderful and amazing',
  'I hate this, it is terrible and awful',
  'This is a book'
];

// Analizamos cada texto y mostramos el resultado
textos.forEach(texto => {
  const resultado = sentiment.analyze(texto);
  console.log(`\nTexto: "${texto}"`);
  console.log(`Puntuación: ${resultado.score}`);

  if (resultado.score > 0) {
    console.log('Sentimiento: POSITIVO 😊');
  } else if (resultado.score < 0) {
    console.log('Sentimiento: NEGATIVO 😞');
  } else {
    console.log('Sentimiento: NEUTRO 😐');
  }
});