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
			.select(`
				cliente_id,
				correo,
				nombre,
				desuscrito,
				fecha_registro,
				ultima_compra,
				mVenta (
					idventa,
					fechaVenta,
					idEvento
				)
			`)
			.eq('desuscrito', false);

		if (error) throw error;

		// Procesar métricas por cliente
		const clientesUnicos = data.map((cliente) => {
			const ventas = cliente.mVenta || [];
			const compras = ventas.length;

			// Determinar la fecha de última compra más reciente
			let maxFechaTs = null;
			ventas.forEach((v) => {
				if (v.fechaVenta) {
					const ts = new Date(v.fechaVenta).getTime();
					if (!maxFechaTs || ts > maxFechaTs) maxFechaTs = ts;
				}
			});
			if (!maxFechaTs && cliente.ultima_compra) {
				maxFechaTs = new Date(cliente.ultima_compra).getTime();
			}

			// Extraer IDs únicos de eventos en los que ha comprado
			const eventosIds = [...new Set(ventas.map((v) => v.idEvento).filter(Boolean))];

			return {
				id: cliente.cliente_id,
				correo: cliente.correo,
				nombre: cliente.nombre || 'Sin nombre',
				fecha_registro: cliente.fecha_registro,
				ultima_compra: maxFechaTs ? new Date(maxFechaTs).toISOString() : null,
				ultimaCompraTs: maxFechaTs,
				compras,
				esFrecuente: compras >= 3,
				eventosIds
			};
		});

		// Ordenar:
		// 1. Clientes más frecuentes primero (esFrecuente === true)
		// 2. Debajo, ordenados por última venta arriba (más reciente primero) y los que hace mucho no compran abajo
		// 3. Empates por compras descendente y luego nombre
		clientesUnicos.sort((a, b) => {
			if (a.esFrecuente !== b.esFrecuente) {
				return a.esFrecuente ? -1 : 1;
			}
			const timeA = a.ultimaCompraTs || 0;
			const timeB = b.ultimaCompraTs || 0;
			if (timeA !== timeB) {
				return timeB - timeA;
			}
			if (a.compras !== b.compras) {
				return b.compras - a.compras;
			}
			return a.nombre.localeCompare(b.nombre);
		});

		return clientesUnicos;
	} catch (error) {
		console.error('Error al obtener clientes:', error);
		return [];
	}
}

/**
 * Obtener clientes filtrados por evento manteniendo el orden de frecuentes y última compra
 * @param {string|number} eventoId - ID del evento
 * @returns {Promise<Array>} Lista de clientes del evento
 */
export async function obtenerClientesPorEvento(eventoId) {
	try {
		const clientes = await obtenerClientesUnicos();
		const idNum = parseInt(eventoId);
		return clientes.filter((c) => c.eventosIds && c.eventosIds.includes(idNum));
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

		console.log('Guardando destinatarios:', {
			campaniaId,
			cantidadDestinatarios: destinatarios.length
		});

		// Primero, insertar la relación con destinatarios
		const registros = destinatarios.map((clienteId) => ({
			campania_id: campaniaId,
			cliente_id: clienteId,
			enviado: false
		}));

		const { data, error } = await supabase.from('mcampaniadestinatario').insert(registros);

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
			.select(
				`
				*,
				destinatarios:mcampaniadestinatario(count)
			`
			)
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
			.select(
				`
				*,
				destinatarios:mcampaniadestinatario(
					cliente_id,
					enviado,
					fecha_envio,
					error
				)
			`
			)
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
		const { error } = await supabase.from('mcampania').update(datos).eq('id', campaniaId);

		if (error) throw error;
		return true;
	} catch (error) {
		console.error('Error al actualizar campaña:', error);
		return false;
	}
}
