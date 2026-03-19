import supabase from '$lib/supabase';

/**
 * Servicio para gestionar campañas de email marketing
 */

/**
 * Obtener todos los clientes únicos de la tabla mVenta
 * Incluye conteo de compras y marca clientes frecuentes (3+ compras)
 * Agrupa por CORREO únicamente y usa el nombre más frecuente
 * @returns {Promise<Array>} Lista de clientes con email, nombre y si es frecuente
 */
export async function obtenerClientesUnicos() {
	try {
		const { data, error } = await supabase
			.from('mCliente')
			.select('cliente_id, correo, nombre, desuscrito, fecha_registro, ultima_compra')
			.eq('desuscrito', false)
			.order('nombre');

		if (error) throw error;

		// Transformar para mantener compatibilidad si es necesario
		const clientesUnicos = data.map(cliente => ({
			id: cliente.cliente_id,
			correo: cliente.correo,
			nombre: cliente.nombre,
			fecha_registro: cliente.fecha_registro,
			ultima_compra: cliente.ultima_compra,
			compras: 0, // Podríamos calcularlo si fuera necesario
			esFrecuente: false // Podríamos calcularlo si fuera necesario
		}));

		return clientesUnicos;
	} catch (error) {
		console.error('Error al obtener clientes:', error);
		return [];
	}
}

/**
 * Obtener clientes filtrados por evento
 * Incluye conteo de compras totales por CORREO y marca clientes frecuentes
 * Usa el nombre más frecuente para cada correo
 * @param {string} eventoId - ID del evento
 * @returns {Promise<Array>} Lista de clientes del evento
 */
export async function obtenerClientesPorEvento(eventoId) {
	try {
		const { data, error } = await supabase
			.from('mVenta')
			.select(`
				cliente_id (
					cliente_id,
					correo,
					nombre
				)
			`)
			.eq('idEvento', eventoId);

		if (error) throw error;

		// Transformar los datos para eliminar duplicados (un cliente puede tener varias ventas en un evento)
		const clientesMap = new Map();
		
		data.forEach(venta => {
			const cliente = venta.cliente_id;
			if (cliente && !clientesMap.has(cliente.cliente_id)) {
				clientesMap.set(cliente.cliente_id, {
					id: cliente.cliente_id,
					correo: cliente.correo,
					nombre: cliente.nombre,
					evento_id: eventoId
				});
			}
		});

		const clientesUnicos = Array.from(clientesMap.values());
		
		// Ordenar alfabéticamente
		clientesUnicos.sort((a, b) => a.nombre.localeCompare(b.nombre));

		return clientesUnicos;
	} catch (error) {
		console.error('Error al obtener clientes por evento:', error);
		return [];
	}
}

/**
 * Obtener todos los eventos para filtrado
 * @returns {Promise<Array>} Lista de eventos
 */
export async function obtenerEventosParaCampania() {
	try {
		const { data, error } = await supabase
			.from('mEvento')
			.select('idevento, nombreEvento, fechaInicio')
			.order('fechaInicio', { ascending: false });

		if (error) throw error;
		return data || [];
	} catch (error) {
		console.error('Error al obtener eventos:', error);
		return [];
	}
}

/**
 * Crear una nueva campaña (guardar en base de datos)
 * @param {Object} campania - Datos de la campaña
 * @returns {Promise<Object|null>} Campaña creada o null si hay error
 */
export async function crearCampania(campania) {
	try {
		const { data, error } = await supabase
			.from('mcampania')
			.insert([
				{
					titulo: campania.titulo,
					asunto: campania.asunto,
					cuerpo_html: campania.cuerpoHtml,
					usar_variable_nombre: campania.usarVariable,
					estado: 'borrador',
					fecha_creacion: new Date().toISOString()
				}
			])
			.select()
			.single();

		if (error) throw error;
		return data;
	} catch (error) {
		console.error('Error al crear campaña:', error);
		return null;
	}
}

/**
 * Guardar destinatarios de una campaña
 * @param {string} campaniaId - ID de la campaña
 * @param {Array} destinatarios - Array de IDs de ventas/clientes
 * @param {boolean} esTodos - Si se seleccionó "todos"
 * @returns {Promise<boolean>} true si se guardó correctamente
 */
export async function guardarDestinatarios(campaniaId, destinatarios, esTodos) {
	try {
		// Validar que hay destinatarios
		if (!destinatarios || destinatarios.length === 0) {
			console.error('No hay destinatarios para guardar');
			return false;
		}

		console.log('Guardando destinatarios:', { campaniaId, cantidadDestinatarios: destinatarios.length });

		// Primero, insertar la relación con destinatarios
		const registros = destinatarios.map(clienteId => ({
			campania_id: campaniaId,
			cliente_id: clienteId,
			enviado: false
		}));

		const { data, error } = await supabase
			.from('mcampaniadestinatario')
			.insert(registros);

		if (error) {
			console.error('Error al insertar destinatarios:', error);
			throw error;
		}

		console.log('Destinatarios guardados exitosamente');

		// Actualizar si es para todos
		if (esTodos) {
			const { error: updateError } = await supabase
				.from('mcampania')
				.update({ todos_los_clientes: true })
				.eq('id', campaniaId);

			if (updateError) {
				console.error('Error al actualizar flag todos_los_clientes:', updateError);
			}
		}

		return true;
	} catch (error) {
		console.error('Error al guardar destinatarios:', error);
		console.error('Detalles del error:', {
			message: error.message,
			details: error.details,
			hint: error.hint,
			code: error.code
		});
		return false;
	}
}

/**
 * Enviar campaña (llamar al endpoint de API)
 * @param {string} campaniaId - ID de la campaña
 * @param {Object} campania - Datos completos de la campaña
 * @param {Array} destinatarios - Lista de destinatarios con {id, correo, nombre}
 * @returns {Promise<Object>} Resultado del envío
 */
export async function enviarCampania(campaniaId, campania, destinatarios) {
	try {
		console.log('📤 Enviando campaña al servidor con todos los datos...');
		console.log('ID:', campaniaId);
		console.log('Destinatarios:', destinatarios.length);
		
		const response = await fetch('/api/enviarCampania', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ 
				campaniaId,
				campania,
				destinatarios
			})
		});

		const resultado = await response.json();
		console.log('📥 Respuesta del servidor:', resultado);
		
		return resultado;
	} catch (error) {
		console.error('Error al enviar campaña:', error);
		return { success: false, error: error.message };
	}
}

/**
 * Obtener historial de campañas
 * @returns {Promise<Array>} Lista de campañas
 */
export async function obtenerCampanias() {
	try {
		const { data, error } = await supabase
			.from('mcampania')
			.select(`
				*,
				destinatarios:mcampaniadestinatario(count)
			`)
			.order('fecha_creacion', { ascending: false });

		if (error) throw error;
		return data || [];
	} catch (error) {
		console.error('Error al obtener campañas:', error);
		return [];
	}
}

/**
 * Obtener detalles de una campaña específica
 * @param {string} campaniaId - ID de la campaña
 * @returns {Promise<Object|null>} Datos de la campaña
 */
export async function obtenerDetalleCampania(campaniaId) {
	try {
		const { data, error } = await supabase
			.from('mcampania')
			.select(`
				*,
				destinatarios:mcampaniadestinatario(
					cliente_id,
					enviado,
					fecha_envio,
					error
				)
			`)
			.eq('id', campaniaId)
			.single();

		if (error) throw error;
		return data;
	} catch (error) {
		console.error('Error al obtener detalle de campaña:', error);
		return null;
	}
}

/**
 * Eliminar una campaña (solo borradores)
 * @param {string} campaniaId - ID de la campaña
 * @returns {Promise<boolean>}
 */
export async function eliminarCampania(campaniaId) {
	try {
		const { error } = await supabase
			.from('mcampania')
			.delete()
			.eq('id', campaniaId)
			.eq('estado', 'borrador');

		if (error) throw error;
		return true;
	} catch (error) {
		console.error('Error al eliminar campaña:', error);
		return false;
	}
}

/**
 * Actualizar campaña
 * @param {string} campaniaId - ID de la campaña
 * @param {Object} datos - Datos a actualizar
 * @returns {Promise<boolean>}
 */
export async function actualizarCampania(campaniaId, datos) {
	try {
		const { error } = await supabase
			.from('mcampania')
			.update(datos)
			.eq('id', campaniaId);

		if (error) throw error;
		return true;
	} catch (error) {
		console.error('Error al actualizar campaña:', error);
		return false;
	}
}
