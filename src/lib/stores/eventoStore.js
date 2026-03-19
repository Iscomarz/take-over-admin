import { writable } from 'svelte/store';

export const eventoStore = writable({
	nombreEvento: '',
	id_venue: null,
	venue: '',
	fechaInicio: '',
	fechaFin: '',
	direccion: '',
	aforo: '',
	descripcionCorta: '',
	fases: [],
	generos: []
});
