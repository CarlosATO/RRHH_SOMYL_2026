
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://meskxoyxhbvnataavkkh.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1lc2t4b3l4aGJ2bmF0YWF2a2toIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzQxNjczNywiZXhwIjoyMDYyOTkyNzM3fQ.xHmOZ82XNi4vlmOagp3DtnKyoqofmnOTuGH8EEHoP-w";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const masters = {
    rrhh_marital_status: [
        { name: 'Soltero/a' }, { name: 'Casado/a' }, { name: 'Divorciado/a' }, { name: 'Viudo/a' }, { name: 'Conviviente Civil' }
    ],
    rrhh_contract_types: [
        { name: 'Indefinido' }, { name: 'Plazo Fijo' }, { name: 'Por Obra o Faena' }, { name: 'Part-Time' }
    ],
    rrhh_pension_providers: [
        { name: 'Capital' }, { name: 'Cuprum' }, { name: 'Habitat' }, { name: 'Modelo' }, { name: 'PlanVital' }, { name: 'Provida' }, { name: 'Uno' }
    ],
    rrhh_health_providers: [
        { name: 'Fonasa' }, { name: 'Banmédica' }, { name: 'Colmena' }, { name: 'Consalud' }, { name: 'Cruz Blanca' }, { name: 'Esencial' }, { name: 'Nueva Masvida' }, { name: 'Vida Tres' }
    ],
    rrhh_departments: [
        { name: 'Administración' }, { name: 'Operaciones' }, { name: 'Finanzas' }, { name: 'Recursos Humanos' }, { name: 'Comercial' }
    ],
    rrhh_jobs: [
        { name: 'Gerente General' }, { name: 'Jefe de Operaciones' }, { name: 'Analista RRHH' }, { name: 'Administrativo' }, { name: 'Conductor' }, { name: 'Auxiliar' }
    ],
    rrhh_shifts: [
        { name: 'Turno A (Mañana)', start_time: '08:00:00', end_time: '16:00:00', work_days: [1, 2, 3, 4, 5] },
        { name: 'Turno B (Tarde)', start_time: '16:00:00', end_time: '00:00:00', work_days: [1, 2, 3, 4, 5] }
    ]
};

async function seed() {
    console.log('🌱 Buscando datos maestros faltantes...');

    for (const [table, values] of Object.entries(masters)) {
        const { data: existing, error } = await supabase.from(table).select('count');
        if (error) {
            console.error(`Error checking ${table}:`, error.message);
            // Some tables might not exist or have different names, skipping safely
            continue;
        }

        const count = existing[0]?.count || 0;

        if (count === 0) {
            console.log(`📥 Poblando ${table}...`);
            const { error: insertError } = await supabase.from(table).insert(values);
            if (insertError) console.error(`Error insertando en ${table}:`, insertError.message);
            else console.log(`✅ ${table} poblada correctamente.`);
        } else {
            console.log(`ℹ️ ${table} ya tiene datos (${count}). Omitiendo.`);
        }
    }
    console.log('🏁 Proceso finalizado.');
}

seed();
