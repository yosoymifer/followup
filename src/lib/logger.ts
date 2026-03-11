import fs from 'fs';
import path from 'path';

const LOG_FILE = path.join(process.cwd(), 'webhook_debug.log');

export function logToFile(message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message} ${data ? JSON.stringify(data, null, 2) : ''}\n---\n`;
    
    try {
        fs.appendFileSync(LOG_FILE, logEntry);
        // Also keep console log for local dev
        console.log(message, data || '');
    } catch (err) {
        console.error('Failed to write to log file:', err);
    }
}

export function getLogs() {
    try {
        if (!fs.existsSync(LOG_FILE)) return 'No logs found.';
        return fs.readFileSync(LOG_FILE, 'utf8');
    } catch (err) {
        return 'Error reading logs.';
    }
}

export function clearLogs() {
    try {
        fs.writeFileSync(LOG_FILE, '');
        return true;
    } catch (err) {
        return false;
    }
}
