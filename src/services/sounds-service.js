import supabase from '$lib/supabase';

const TABLE = 'tSoundsTakeOver';

export async function obtenerSounds() {
	const { data, error } = await supabase
		.from(TABLE)
		.select('*')
		.order('orden', { ascending: true })
		.order('creado_en', { ascending: false });

	if (error) throw error;
	return data ?? [];
}

export async function crearSound(payload) {
	const { data, error } = await supabase.from(TABLE).insert(payload).select().single();
	if (error) throw error;
	return data;
}

export async function actualizarSound(id, payload) {
	const { data, error } = await supabase
		.from(TABLE)
		.update(payload)
		.eq('id', id)
		.select()
		.single();

	if (error) throw error;
	return data;
}

export async function eliminarSound(id) {
	const { error } = await supabase.from(TABLE).delete().eq('id', id);
	if (error) throw error;
}
