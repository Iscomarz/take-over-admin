import supabase from '$lib/supabase';

// Obtener miembros del equipo
export async function obtenerMiembrosDelEquipo() {
    const { data, error } = await supabase
        .from('team_member')
        .select('*');
    if (error) {
        console.error('Error al obtener miembros del equipo:', error);
        return [];
    }
    return data;
}

// Crear nuevo miembro del equipo
export async function crearMiembroDelEquipo(team_member) {
    const { data, error } = await supabase
        .from('team_member')
        .insert(team_member)
        .select();
    if (error) {
        console.error('Error al crear miembro del equipo:', error);
        return null;
    }
    return data;
}

// Actualizar miembro del equipo
export async function actualizarMiembroDelEquipo(team_member) {
    console.log('Actualizando miembro del equipo:', team_member);

    const { data, error } = await supabase
        .from('team_member')
        .update(team_member)
        .eq('team_id', team_member.team_id)
        .select();
    if (error) {
        console.error('Error al actualizar miembro del equipo:', error);
        return null;
    }
    return data;
}

// Subir imagen a Supabase Storage
export async function subirArchivo(file, path) {
    const fileName = `${Date.now()}_${file.name}`;
    const filePath = `${path}/${fileName}`;
    
    // IMPORTANTE: Verifica en Supabase el nombre exacto de tu bucket
    // Los nombres comunes son: 'archivos-publicos', 'archivosPublicos', 'archivos_publicos'
    const bucketName = 'team-members'; // Cambia esto al nombre exacto de tu bucket
    
    const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file);
    
    if (error) {
        console.error('Error al subir archivo:', error);
        console.error('Bucket name:', bucketName);
        console.error('File path:', filePath);
        return null;
    }
    
    // Obtener URL pública
    const { data: publicData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);
    
    return publicData.publicUrl;
}