const passwordInput = document.getElementById("passwordInput");
const togglePasswordBtn = document.getElementById("togglePasswordBtn");
const darkModeBtn = document.getElementById("darkModeBtn");
const generateBtn = document.getElementById("generateBtn");
const copyBtn = document.getElementById("copyBtn");

const meterBar = document.getElementById("meterBar");
const strengthText = document.getElementById("strengthText");
const scoreText = document.getElementById("scoreText");
const crackTimeText = document.getElementById("crackTimeText");
const breachText = document.getElementById("breachText");
const feedbackList = document.getElementById("feedbackList");

const commonPasswords = new Set([
  "password", "password123", "123456", "12345678", "qwerty", "abc123",
  "111111", "letmein", "admin", "welcome", "iloveyou", "monkey",
  "dragon", "football", "baseball", "sunshine", "master", "hello123"
]);

const commonWords = ["password", "admin", "qwerty", "welcome", "letmein", "login", "user"];

const sequencePatterns = [
  "0123456789", "1234567890", "abcdefghijklmnopqrstuvwxyz", "qwertyuiop"
];

function hasUppercase(value) {
  return /[A-Z]/.test(value);
}

function hasLowercase(value) {
  return /[a-z]/.test(value);
}

function hasNumber(value) {
  return /[0-9]/.test(value);
}

function hasSpecialChar(value) {
  return /[^A-Za-z0-9]/.test(value);
}

function hasRepeatedPattern(value) {
  return /(.)\1{2,}/.test(value);
}

function hasSequence(value) {
  const lower = value.toLowerCase();
  if (/\d{4,}/.test(value)) {
    return true;
  }
  return sequencePatterns.some((pattern) => {
    for (let i = 0; i < pattern.length - 3; i += 1) {
      const chunk = pattern.slice(i, i + 4);
      if (lower.includes(chunk)) {
        return true;
      }
    }
    return false;
  });
}

function hasCommonWord(value) {
  const lower = value.toLowerCase();
  return commonWords.some((word) => lower.includes(word));
}

function complexityPoolSize(password) {
  let pool = 0;
  if (hasLowercase(password)) pool += 26;
  if (hasUppercase(password)) pool += 26;
  if (hasNumber(password)) pool += 10;
  if (hasSpecialChar(password)) pool += 32;
  return pool || 1;
}

function estimateCrackTime(password) {
  if (!password) return "Instantly";

  const pool = complexityPoolSize(password);
  const attemptsPerSecond = 1e10;
  const combinations = Math.pow(pool, password.length);
  const seconds = combinations / attemptsPerSecond;

  if (seconds < 1) return "Instantly";
  if (seconds < 60) return "Few seconds";
  if (seconds < 3600) return "Minutes";
  if (seconds < 86400) return "Hours";
  if (seconds < 31536000) return "Months";
  if (seconds < 31536000 * 100) return "Years";
  return "Centuries";
}

async function checkBreach(password) {
  if (!password) {
    breachText.textContent = "Not checked";
    return;
  }

  if (!window.crypto || !window.crypto.subtle) {
    breachText.textContent = "Unavailable in this browser";
    return;
  }

  try {
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-1", encoder.encode(password));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const sha1 = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
    const prefix = sha1.slice(0, 5);
    const suffix = sha1.slice(5);

    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
    if (!response.ok) {
      breachText.textContent = "Check failed";
      return;
    }

    const data = await response.text();
    const found = data.split("\n").some((line) => line.split(":")[0].trim() === suffix);
    breachText.textContent = found ? "Found in breached datasets" : "Not found in breach list";
  } catch (error) {
    breachText.textContent = "Check unavailable";
  }
}

function getStrengthLabel(score) {
  if (score <= 39) return "Weak";
  if (score <= 69) return "Medium";
  return "Strong";
}

function meterColor(label) {
  if (label === "Weak") return "var(--weak)";
  if (label === "Medium") return "var(--medium)";
  return "var(--strong)";
}

function analyzePassword(password) {
  let score = 0;
  const feedback = [];

  if (password.length >= 8) {
    score += 10;
  } else {
    feedback.push("Increase length to at least 8 characters.");
  }

  if (password.length >= 12) {
    score += 10;
  } else {
    feedback.push("Increase length to at least 12 characters.");
  }

  if (hasUppercase(password)) {
    score += 10;
  } else {
    feedback.push("Add uppercase letters.");
  }

  if (hasLowercase(password)) {
    score += 10;
  } else {
    feedback.push("Add lowercase letters.");
  }

  if (hasNumber(password)) {
    score += 10;
  } else {
    feedback.push("Add numbers.");
  }

  if (hasSpecialChar(password)) {
    score += 15;
  } else {
    feedback.push("Add special characters.");
  }

  if (!hasCommonWord(password)) {
    score += 15;
  } else {
    feedback.push("Avoid common words.");
  }

  if (!hasRepeatedPattern(password) && !hasSequence(password)) {
    score += 10;
  } else {
    feedback.push("Avoid repeated or sequential patterns.");
  }

  if (!commonPasswords.has(password.toLowerCase())) {
    score += 10;
  } else {
    feedback.push("This password is too common; choose a unique one.");
  }

  score = Math.max(0, Math.min(100, score));
  const strength = getStrengthLabel(score);

  if (password && feedback.length === 0) {
    feedback.push("Very strong password.");
  }

  if (!password) {
    feedback.length = 0;
    feedback.push("Start typing to analyze your password.");
  }

  return {
    score,
    strength,
    feedback
  };
}

function renderAnalysis(password) {
  const { score, strength, feedback } = analyzePassword(password);
  const crackTime = estimateCrackTime(password);

  strengthText.textContent = strength;
  scoreText.textContent = `${score}/100`;
  crackTimeText.textContent = crackTime;

  meterBar.style.width = `${score}%`;
  meterBar.style.background = meterColor(strength);
  meterBar.classList.remove("pulse");
  void meterBar.offsetWidth;
  meterBar.classList.add("pulse");

  feedbackList.innerHTML = "";
  feedback.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    feedbackList.appendChild(li);
  });
}

function generateStrongPassword(length = 14) {
  const lowers = "abcdefghijklmnopqrstuvwxyz";
  const uppers = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";
  const symbols = "!@#$%^&*()-_=+[]{};:,.?";
  const all = lowers + uppers + numbers + symbols;

  let password = "";
  password += lowers[Math.floor(Math.random() * lowers.length)];
  password += uppers[Math.floor(Math.random() * uppers.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];

  for (let i = password.length; i < length; i += 1) {
    password += all[Math.floor(Math.random() * all.length)];
  }

  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}

passwordInput.addEventListener("input", (event) => {
  const password = event.target.value;
  renderAnalysis(password);
  checkBreach(password);
});

togglePasswordBtn.addEventListener("click", () => {
  const isPassword = passwordInput.type === "password";
  passwordInput.type = isPassword ? "text" : "password";
  togglePasswordBtn.textContent = isPassword ? "Hide" : "Show";
});

darkModeBtn.addEventListener("click", () => {
  document.body.classList.toggle("dark");
});

generateBtn.addEventListener("click", () => {
  const newPassword = generateStrongPassword();
  passwordInput.value = newPassword;
  renderAnalysis(newPassword);
  checkBreach(newPassword);
});

copyBtn.addEventListener("click", async () => {
  if (!passwordInput.value) return;
  try {
    await navigator.clipboard.writeText(passwordInput.value);
    copyBtn.textContent = "Copied!";
    setTimeout(() => {
      copyBtn.textContent = "Copy Password";
    }, 900);
  } catch (error) {
    copyBtn.textContent = "Copy failed";
    setTimeout(() => {
      copyBtn.textContent = "Copy Password";
    }, 1200);
  }
});

renderAnalysis("");
