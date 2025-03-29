import chalk from 'chalk';

/**
 * Formatiert ein Datum in einen String im deutschen Format (dd.mm.yyyy, HH:MM:SS).
 *
 * @param {Date} date - Das zu formatierende Datum.
 * @returns {string} Das formatierte Datum.
 */
const formatDate = (date) => {
  return date.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
};

/**
 * Logger bietet verschiedene Methoden zur Konsolenausgabe.
 *
 * @typedef {Object} Logger
 * @property {function(string):void} info - Gibt eine Informationsnachricht aus.
 * @property {function(string):void} warn - Gibt eine Warnmeldung aus.
 * @property {function(string|Error):void} error - Gibt eine Fehlermeldung aus.
 * @property {function(string):void} debug - Gibt eine Debug-Nachricht aus.
 * @property {function(string):void} success - Gibt eine Erfolgsnachricht aus.
 * @property {function(string):void} report - Gibt eine Report-Nachricht aus.
 */
const Logger = {
  info: (msg) => console.log(chalk.white(`[INFO] [${formatDate(new Date())}]`), msg),
  warn: (msg) => console.log(chalk.yellow(`[WARN] [${formatDate(new Date())}]`), msg),
  error: (msg) => {
    if (msg instanceof Error) {
      console.log(chalk.red.bold(`[ERROR] [${formatDate(new Date())}]`), msg.message);
      console.log(chalk.red(msg.stack));
    } else {
      console.log(chalk.red.bold(`[ERROR] [${formatDate(new Date())}]`), msg);
    }
  },
  debug: (msg) => console.log(chalk.blue(`[DEBUG] [${formatDate(new Date())}]`), msg),
  success: (msg) => console.log(chalk.green(`[SUCCESS] [${formatDate(new Date())}]`), msg),
  report: (msg) => console.log(chalk.bgRed(`[REPORT] [${formatDate(new Date())} ${msg}]`)),
};

export default Logger;
