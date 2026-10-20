// Generates infinite, adaptive questions
export function generateQuestion(diff, forceType = null) {
  let d = Math.max(1, Math.round(diff));
  let prompt = "", answer = 0;
  let type = forceType || ['numeric', 'mc', 'text', 'voice'][Math.floor(Math.random() * 4)];

  // --- MATH LOGIC ---
  if (d === 1) {
    let a = Math.floor(Math.random() * 10) + 1, b = Math.floor(Math.random() * 10) + 1;
    prompt = `${a} + ${b}`; answer = a + b;
  } else if (d === 2) {
    let a = Math.floor(Math.random() * 20) + 1, b = Math.floor(Math.random() * 20) + 1;
    if (Math.random() > 0.5) { prompt = `${a} + ${b}`; answer = a + b; }
    else { prompt = `${a + b} - ${b}`; answer = a; }
  } else if (d === 3) {
    let a = Math.floor(Math.random() * 10) + 1, b = Math.floor(Math.random() * 10) + 1;
    prompt = `${a} \\times ${b}`; answer = a * b;
  } else if (d === 4) {
    let a = Math.floor(Math.random() * 10) + 1, b = Math.floor(Math.random() * 10) + 1;
    prompt = `${a * b} \\div ${a}`; answer = b;
  } else if (d === 5) {
    let x = Math.floor(Math.random() * 10) + 1;
    let a = Math.floor(Math.random() * 5) + 2;
    let b = Math.floor(Math.random() * 10) + 1;
    prompt = `${a}x + ${b} = ${a * x + b}`; answer = x;
  } else if (d === 6) {
    let p = Math.floor(Math.random() * 8 + 2) * 10;
    let n = Math.floor(Math.random() * 10 + 2) * 10;
    prompt = `${p}\\% \\text{ of } ${n}`; answer = (p / 100) * n;
  } else if (d === 7) {
    let a = Math.floor(Math.random() * 20) - 10;
    let b = Math.floor(Math.random() * 20) - 10;
    prompt = `(${a}) + (${b})`; answer = a + b;
  } else {
    let a = Math.floor(Math.random() * 5) + 2;
    let b = Math.floor(Math.random() * 3) + 2;
    prompt = `${a}^{${b}}`; answer = Math.pow(a, b);
  }

  // Adjust for type
  let finalAnswer = answer;
  let displayPrompt = `$${prompt} = \\text{?}$`;
  let options = [];

  if (type === 'mc') {
    options = [answer, answer + 1, answer - 1, answer + 2].sort(() => Math.random() - 0.5);
  } else if (type === 'text') {
    // For text, we ask them to spell a simple number (e.g., if answer is 8, "eight")
    // We only do this for numbers 1-10 to keep it simple
    if (answer > 0 && answer <= 10) {
       const words = ["zero","one","two","three","four","five","six","seven","eight","nine","ten"];
       finalAnswer = words[answer];
       displayPrompt = `Write the answer to $${prompt}$ in words.`;
    } else {
       type = 'numeric'; // fallback
    }
  } else if (type === 'voice') {
    displayPrompt = `Say the answer to $${prompt}$ out loud.`;
  }

  return { prompt: displayPrompt, answer: finalAnswer, originalAnswer: answer, type, options, difficulty: d };
}
