import supabase from '$lib/supabase';

const TABLE = 'tEventoMedia';

export async function obtenerMediaPorEvento(idEvento) {
	const { data, error } = await supabase
		.from(TABLE)
		.select('*')
		.eq('id_evento', idEvento)
		.order('orden', { ascending: true })
		.order('creado_en', { ascending: false });

	if (error) throw error;
	return data ?? [];
}

export async function crearMediaEvento(payload) {
	const { data, error } = await supabase
		.from(TABLE)
		.insert(payload)
		.select()
		.single();

	if (error) throw error;
	return data;
}

export async function actualizarMediaEvento(id, payload) {
	const { data, error } = await supabase
		.from(TABLE)
		.update(payload)
		.eq('id', id)
		.select()
		.single();

	if (error) throw error;
	return data;
}

export async function eliminarMediaEvento(id) {
	const { error } = await supabase
		.from(TABLE)
		.delete()
		.eq('id', id);

	if (error) throw error;
}
