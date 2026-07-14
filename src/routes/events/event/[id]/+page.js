import { eventoId } from '$lib/stores/eventoId';

export async function load({ params }) {
	const { id } = params; // Extraemos el id de la URL

	eventoId.set(id);

	return {
		prop: {
			id // Pasamos el id como prop
		}
	};
}
