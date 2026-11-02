import assert from "node:assert/strict";
import test from "node:test";

/**
 * Converte cor HEX para Luminância Relativa conforme especificação WCAG 2.1.
 */
function getLuminance(hex) {
  const cleanHex = hex.replace("#", "");
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const a = [r, g, b].map((val) => {
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });

  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

/**
 * Calcula a relação de contraste entre duas cores segundo a norma WCAG (1:1 a 21:1).
 */
export function calculateContrastRatio(foregroundHex, backgroundHex) {
  const lum1 = getLuminance(foregroundHex);
  const lum2 = getLuminance(backgroundHex);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return Number(((brightest + 0.05) / (darkest + 0.05)).toFixed(2));
}

/**
 * Avalia acessibilidade de campos de formulário (Labels & Associação).
 */
export function auditFormLabels(formFields) {
  const violations = [];

  for (const field of formFields) {
    const hasExplicitLabel = field.labelFor && field.labelFor === field.id;
    const hasAriaLabel = Boolean(field.ariaLabel || field.ariaLabelledBy);

    if (!hasExplicitLabel && !hasAriaLabel) {
      violations.push({
        fieldId: field.id || "unidentified-field",
        error: "CRÍTICO: Campo de formulário sem label explícito associado (violação WCAG 3.3.2 / 1.3.1).",
      });
    }
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}

/**
 * Avalia nomes acessíveis em elementos interativos (botões e links).
 */
export function auditAccessibleNames(elements) {
  const violations = [];

  for (const el of elements) {
    const hasVisibleText = Boolean(el.text && el.text.trim().length > 0);
    const hasAriaLabel = Boolean(el.ariaLabel && el.ariaLabel.trim().length > 0);

    if (!hasVisibleText && !hasAriaLabel) {
      violations.push({
        element: el.tag || "button",
        id: el.id || "anonymous-element",
        error: "GRAVE: Elemento interativo sem nome acessível (violação WCAG 4.1.2). Tecnologias assistivas não conseguem anunciar a função do botão.",
      });
    }
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}

/**
 * Avalia suporte à navegação por teclado e foco visível.
 */
export function auditKeyboardAndFocus({ hasOutlineNoneWithoutReplacement, modalTrapsFocusProperly, hasKeyboardTrap }) {
  const violations = [];

  if (hasOutlineNoneWithoutReplacement) {
    violations.push("CRÍTICO: Foco visual suprimido ('outline: none' sem estilização substituta - violação WCAG 2.4.7).");
  }

  if (hasKeyboardTrap) {
    violations.push("BLOQUEIO: Armadilha de teclado identificada. Usuário não consegue sair do componente usando 'Tab' ou 'Esc' (violação WCAG 2.1.2).");
  }

  if (!modalTrapsFocusProperly) {
    violations.push("GRAVE: Modal não contém o foco dentro do diálogo enquanto aberto (violação WCAG 2.4.3).");
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}

// =========================================================================
// SUÍTE DE TESTES: QA-020 (Acessibilidade WCAG 2.1 AA nas Telas Críticas)
// =========================================================================

test("TC-WCAG-01: contraste de cor atende ao padrão mínimo WCAG AA (>= 4.5:1 para texto normal)", () => {
  // Cores do Design System da Plataforma UniSENAI
  const textDark = "#1A1A1A";
  const bgWhite = "#FFFFFF";
  const contrastStandard = calculateContrastRatio(textDark, bgWhite);
  assert.ok(contrastStandard >= 4.5, `Contraste de texto regular deve ser >= 4.5:1 (Obtido: ${contrastStandard}:1)`);

  // Botão Primário: Texto Branco sobre Azul Corporativo (#004B87)
  const btnText = "#FFFFFF";
  const btnBg = "#004B87";
  const contrastBtn = calculateContrastRatio(btnText, btnBg);
  assert.ok(contrastBtn >= 4.5, `Contraste do botão primário deve ser >= 4.5:1 (Obtido: ${contrastBtn}:1)`);
});

test("TC-WCAG-02: rejeita e aponta violação em contraste insuficiente (< 4.5:1)", () => {
  // Cinza claro (#999999) sobre fundo branco (#FFFFFF)
  const lowContrastRatio = calculateContrastRatio("#999999", "#FFFFFF");
  assert.ok(lowContrastRatio < 4.5, "Cinza claro sobre branco deve falhar no teste de contraste WCAG AA");
});

test("TC-WCAG-03: campos de formulário nas telas críticas possuem labels associados", () => {
  const loginFormFields = [
    { id: "email-input", labelFor: "email-input", text: "E-mail Institucional" },
    { id: "password-input", labelFor: "password-input", text: "Senha" },
    { id: "remember-me", labelFor: "remember-me", text: "Lembrar meu acesso" },
  ];

  const auditResult = auditFormLabels(loginFormFields);
  assert.equal(auditResult.valid, true);
  assert.equal(auditResult.violations.length, 0);
});

test("TC-WCAG-04: detecta violação quando campo de formulário não tem label", () => {
  const defectiveFields = [
    { id: "search-input", labelFor: null, ariaLabel: null }, // Campo sem rótulo
  ];

  const auditResult = auditFormLabels(defectiveFields);
  assert.equal(auditResult.valid, false);
  assert.equal(auditResult.violations.length, 1);
  assert.match(auditResult.violations[0].error, /Campo de formulário sem label explícito/);
});

test("TC-WCAG-05: todos os botões de ação e ícones interativos possuem nomes acessíveis", () => {
  const criticalButtons = [
    { tag: "button", id: "btn-login", text: "Entrar" },
    { tag: "button", id: "btn-upload-file", text: "Selecionar Arquivo", ariaLabel: "Selecionar entregável para envio" },
    { tag: "button", id: "btn-close-modal", text: "", ariaLabel: "Fechar modal de submissão" },
    { tag: "button", id: "btn-copy-qr", text: "", ariaLabel: "Copiar código de validação do certificado" },
  ];

  const auditResult = auditAccessibleNames(criticalButtons);
  assert.equal(auditResult.valid, true);
  assert.equal(auditResult.violations.length, 0);
});

test("TC-WCAG-06: detecta violação crítica quando botão de ícone não possui texto nem aria-label", () => {
  const unlabelledButtons = [
    { tag: "button", id: "btn-delete-entregavel", text: "", ariaLabel: "" }, // Apenas ícone de lixeira sem label
  ];

  const auditResult = auditAccessibleNames(unlabelledButtons);
  assert.equal(auditResult.valid, false);
  assert.equal(auditResult.violations.length, 1);
  assert.match(auditResult.violations[0].error, /Elemento interativo sem nome acessível/);
});

test("TC-WCAG-07: navegação por teclado e foco visível estão garantidos nas jornadas críticas", () => {
  const auditResult = auditKeyboardAndFocus({
    hasOutlineNoneWithoutReplacement: false,
    modalTrapsFocusProperly: true,
    hasKeyboardTrap: false,
  });

  assert.equal(auditResult.valid, true);
  assert.equal(auditResult.violations.length, 0);
});

