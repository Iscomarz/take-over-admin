-- 1. Modificar el check constraint para permitir 'viewer'
ALTER TABLE public."mPerfil" DROP CONSTRAINT IF EXISTS "mPerfil_rol_check";
ALTER TABLE public."mPerfil" ADD CONSTRAINT "mPerfil_rol_check" CHECK (rol IN ('admin', 'taquilla', 'viewer'));

-- 2. Actualizar perfiles a 'viewer' excepto franmtz96@gmail.com y validaciones@takeover.com
UPDATE public."mPerfil"
SET rol = 'viewer',
    actualizado_en = now()
WHERE email NOT IN ('franmtz96@gmail.com', 'validaciones@takeover.com');

-- 3. Consultar resultado final
SELECT id, email, nombre, rol, actualizado_en 
FROM public."mPerfil" 
ORDER BY email;
