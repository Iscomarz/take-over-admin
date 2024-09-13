import { writable } from 'svelte/store';

export const eventoStore = writable({
	nombreEvento: '',
	venue: '',
	fechaInicio: '',
	fechaFin: '',
	direccion: '',
	aforo: '',
	fases: []
});
