import { writable } from 'svelte/store';

/**
 * Store para gestionar los datos de la campaña de email marketing
 * Mantiene el estado entre las diferentes pantallas del flujo
 */

function crearCampaniaStore() {
	const datosIniciales = {
		// Paso 1: Datos básicos
		titulo: '',
		asunto: '',
		destinatarios: [], // Array de IDs de ventas/clientes seleccionados
		seleccionarTodos: false,
		filtroEvento: null, // Opcional: filtrar por evento específico
		
		// Paso 2: Contenido
		cuerpoHtml: '',
		usarVariable: true, // Si se usa {{nombre}} en el correo
		
		// Metadata
		fechaCreacion: null,
		estado: 'borrador' // borrador, enviada, programada
	};

	const { subscribe, set, update } = writable(datosIniciales);

	return {
		subscribe,
		// Actualizar datos básicos (Paso 1)
		setDatosBasicos: (datos) => update(state => ({
			...state,
			titulo: datos.titulo,
			asunto: datos.asunto,
			destinatarios: datos.destinatarios,
			seleccionarTodos: datos.seleccionarTodos,
			filtroEvento: datos.filtroEvento
		})),
		
		// Actualizar contenido del correo (Paso 2)
		setCuerpoCorreo: (html, usarVariable) => update(state => ({
			...state,
			cuerpoHtml: html,
			usarVariable: usarVariable
		})),
		
		// Resetear el store
		reset: () => set(datosIniciales),
		
		// Actualizar cualquier campo
		actualizar: (campo, valor) => update(state => ({
			...state,
			[campo]: valor
		}))
	};
}

export const campaniaStore = crearCampaniaStore();
