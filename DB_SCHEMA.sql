-- ============================================
-- ESQUEMA DE BASE DE DATOS PARA MÓDULO RRHH
-- ============================================

-- Tabla: Catálogo de Cursos
CREATE TABLE IF NOT EXISTS public.rrhh_course_catalog (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    validity_months INTEGER DEFAULT 12,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_rrhh_course_catalog_name ON public.rrhh_course_catalog(name);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.rrhh_course_catalog ENABLE ROW LEVEL SECURITY;

-- Política: Permitir SELECT a todos los usuarios autenticados
CREATE POLICY "Allow authenticated users to read courses"
    ON public.rrhh_course_catalog
    FOR SELECT
    TO authenticated
    USING (true);

-- Política: Permitir INSERT a todos los usuarios autenticados
CREATE POLICY "Allow authenticated users to insert courses"
    ON public.rrhh_course_catalog
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Política: Permitir UPDATE a todos los usuarios autenticados
CREATE POLICY "Allow authenticated users to update courses"
    ON public.rrhh_course_catalog
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Política: Permitir DELETE a todos los usuarios autenticados
CREATE POLICY "Allow authenticated users to delete courses"
    ON public.rrhh_course_catalog
    FOR DELETE
    TO authenticated
    USING (true);

-- ============================================
-- NOTA: Si ya tienes otras tablas de RRHH creadas,
-- asegúrate de que también tengan políticas RLS configuradas
-- ============================================

-- Verificar que la tabla de certificaciones de empleados existe
-- (Esta tabla relaciona empleados con cursos)
CREATE TABLE IF NOT EXISTS public.rrhh_employee_certifications (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES public.rrhh_employees(id) ON DELETE CASCADE,
    course_id BIGINT NOT NULL REFERENCES public.rrhh_course_catalog(id) ON DELETE CASCADE,
    issue_date DATE,
    expiry_date DATE,
    certificate_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id, course_id)
);

-- Índices para certificaciones
CREATE INDEX IF NOT EXISTS idx_rrhh_employee_certifications_employee ON public.rrhh_employee_certifications(employee_id);
CREATE INDEX IF NOT EXISTS idx_rrhh_employee_certifications_course ON public.rrhh_employee_certifications(course_id);
CREATE INDEX IF NOT EXISTS idx_rrhh_employee_certifications_expiry ON public.rrhh_employee_certifications(expiry_date);

-- Habilitar RLS en certificaciones
ALTER TABLE public.rrhh_employee_certifications ENABLE ROW LEVEL SECURITY;

-- Políticas para certificaciones
CREATE POLICY "Allow authenticated users to read certifications"
    ON public.rrhh_employee_certifications
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated users to insert certifications"
    ON public.rrhh_employee_certifications
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update certifications"
    ON public.rrhh_employee_certifications
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete certifications"
    ON public.rrhh_employee_certifications
    FOR DELETE
    TO authenticated
    USING (true);

-- ============================================
-- Función para actualizar updated_at automáticamente
-- ============================================
CREATE OR REPLACE FUNCTION public.update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para cursos
DROP TRIGGER IF EXISTS update_rrhh_course_catalog_modtime ON public.rrhh_course_catalog;
CREATE TRIGGER update_rrhh_course_catalog_modtime
    BEFORE UPDATE ON public.rrhh_course_catalog
    FOR EACH ROW
    EXECUTE FUNCTION public.update_modified_column();

-- Trigger para certificaciones
DROP TRIGGER IF EXISTS update_rrhh_employee_certifications_modtime ON public.rrhh_employee_certifications;
CREATE TRIGGER update_rrhh_employee_certifications_modtime
    BEFORE UPDATE ON public.rrhh_employee_certifications
    FOR EACH ROW
    EXECUTE FUNCTION public.update_modified_column();

-- ============================================
-- Datos de ejemplo (opcional - eliminar si no deseas)
-- ============================================
INSERT INTO public.rrhh_course_catalog (name, validity_months) VALUES
    ('Trabajo en Altura', 12),
    ('Primeros Auxilios', 24),
    ('Manejo de Extintores', 12),
    ('Seguridad en Espacios Confinados', 12),
    ('CURSO D', 36)
ON CONFLICT DO NOTHING;
