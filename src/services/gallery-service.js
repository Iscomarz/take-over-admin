import supabase from '$lib/supabase';

const TABLE = 'tGaleria';
const BUCKET = 'galeria-eventos';

export async function obtenerEventosGaleria() {
	const { data, error } = await supabase.from('mEvento').select('idevento,nombreEvento,fechaInicio').order('fechaInicio', { ascending: false });
	if (error) throw error;
	return data ?? [];
}

export async function obtenerGaleria() {
	const { data, error } = await supabase.from(TABLE).select('*').order('fecha_contenido', { ascending: false }).order('orden');
	if (error) throw error;
	return data ?? [];
}

export async function subirImagenGaleria(file, eventoId) {
	const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
	const path = `${eventoId}/${crypto.randomUUID()}.${extension}`;
	const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
	if (error) throw error;
	return { path, url: supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl };
}

export async function crearGaleria(rows) {
	const { error } = await supabase.from(TABLE).insert(rows);
	if (error) throw error;
}

export async function actualizarGaleria(id, payload) {
	const { error } = await supabase.from(TABLE).update(payload).eq('id', id);
	if (error) throw error;
}

export async function eliminarGaleria(item) {
	const { error } = await supabase.from(TABLE).delete().eq('id', item.id);
	if (error) throw error;
	if (item.storage_path) await supabase.storage.from(BUCKET).remove([item.storage_path]);
}
