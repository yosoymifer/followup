/**
 * Este script reemplaza al antiguo cron "ciego".
 * Debe ejecutarse en segundo plano (puedes usar PM2 o el Programador de Tareas de Windows).
 * Simplemente hace un "ping" a nuestra ruta local de Next.js cada minuto para ejecutar
 * las campañas que hayan llegado a su hora "scheduledAt".
 */

const http = require('http');

console.log("Iniciando FollowUp V2 Scheduler...");
console.log("Haciendo ping a http://localhost:3001/api/cron/scheduler cada 1 minuto.");

function runScheduler() {
    console.log(`[${new Date().toISOString()}] Ping a Scheduler...`);
    http.get('http://localhost:3001/api/cron/scheduler', (resp) => {
        let data = '';

        resp.on('data', (chunk) => {
            data += chunk;
        });

        resp.on('end', () => {
            try {
                const json = JSON.parse(data);
                if (json.executed) {
                    console.log(`=> Ejecutado:`, json.results);
                }
            } catch (e) {
                // Not json or error
            }
        });

    }).on("error", (err) => {
        console.log("Error haciendo ping al scheduler (asegúrate de que Next.js está corriendo): " + err.message);
    });
}

// Ejecutar inmediatamente
runScheduler();

// Luego cada 60 segundos
setInterval(runScheduler, 60 * 1000);
