-- Script para corregir fechas de schedules que se guardaron como viernes
-- en lugar de domingos debido a problemas de zona horaria

-- Ver qué fechas incorrectas existen (viernes en lugar de domingos)
SELECT 
    id,
    date,
    EXTRACT(DOW FROM date) as day_of_week  -- 0=domingo, 5=viernes
FROM sunday_schedules 
WHERE EXTRACT(DOW FROM date) = 5  -- 5 = viernes
ORDER BY date;

-- Corregir fechas: sumar 2 días para convertir viernes a domingos
-- Descomenta las siguientes líneas después de verificar los datos arriba:

-- UPDATE sunday_schedules 
-- SET date = date + INTERVAL '2 days'
-- WHERE EXTRACT(DOW FROM date) = 5;  -- 5 = viernes

-- Verificar que las fechas ahora son domingos
-- SELECT 
--     id,
--     date,
--     EXTRACT(DOW FROM date) as day_of_week  -- Debería ser 0 (domingo)
-- FROM sunday_schedules 
-- ORDER BY date;
