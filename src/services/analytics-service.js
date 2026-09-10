import supabase from '$lib/supabase';

/**
 * Obtener lista de eventos disponibles para el selector de analítica
 */
export async function obtenerEventosParaSelector() {
	try {
		const { data, error } = await supabase
			.from('mEvento')
			.select('idevento, nombreEvento, fechaInicio, fechaFin, activo')
			.order('idevento', { ascending: false });

		if (error) throw error;
		return data || [];
	} catch (err) {
		console.error('Error al obtener eventos para selector:', err);
		return [];
	}
}

/**
 * Obtener métricas analíticas completas para un evento específico o consolidadas para todos
 * @param {number|string} eventoId - ID numérico del evento o 'todos'
 */
export async function obtenerMetricasAnalytics(eventoId = 'todos') {
	try {
		const esGlobal = !eventoId || eventoId === 'todos';

		// 1. Obtener Evento(s)
		let eventosQuery = supabase
			.from('mEvento')
			.select('idevento, nombreEvento, fechaInicio, fechaFin, activo');

		if (!esGlobal) {
			eventosQuery = eventosQuery.eq('idevento', parseInt(eventoId));
		} else {
			eventosQuery = eventosQuery.order('idevento', { ascending: false });
		}

		const { data: eventos, error: errorEventos } = await eventosQuery;
		if (errorEventos) throw errorEventos;
		if (!eventos || eventos.length === 0) {
			return null;
		}

		const eventoActual = !esGlobal ? eventos[0] : null;
		const eventoIds = eventos.map((e) => e.idevento);

		// 2. Obtener Fases
		let fasesQuery = supabase
			.from('cFaseEvento')
			.select('*')
			.in('idEvento', eventoIds)
			.order('precio', { ascending: true });

		const { data: fases, error: errorFases } = await fasesQuery;
		if (errorFases) throw errorFases;

		// 3. Obtener Ventas con información de clientes y pagos
		let ventasQuery = supabase
			.from('mVenta')
			.select(
				`
				idventa,
				idEvento,
				idFaseEvento,
				cantidadTickets,
				fechaVenta,
				mCliente (nombre, correo),
				mPago (cantidad, acreditado, fechaPago)
			`
			)
			.in('idEvento', eventoIds)
			.order('fechaVenta', { ascending: true });

		const { data: ventas, error: errorVentas } = await ventasQuery;
		if (errorVentas) throw errorVentas;

		return procesarMetricas({
			esGlobal,
			eventoActual,
			eventos,
			fases: fases || [],
			ventas: ventas || []
		});
	} catch (err) {
		console.error('Error al obtener métricas analíticas:', err);
		throw err;
	}
}

/**
 * Procesar datos puros de Supabase y calcular KPIs analíticos
 */
function procesarMetricas({ esGlobal, eventoActual, eventos, fases, ventas }) {
	let totalTickets = 0;
	let totalIngresos = 0;
	let totalTransacciones = ventas.length;

	// Mapeo de fases
	const fasesMap = new Map();
	fases.forEach((f) => {
		fasesMap.set(f.idFase, {
			idFase: f.idFase,
			idEvento: f.idEvento,
			nombre: f.nombreFace || 'Fase sin nombre',
			precio: Number(f.precio) || 0,
			limite: f.limite ? Number(f.limite) : null,
			fechaExpira: f.fechaExpira || null,
			activo: f.activo,
			soldout: f.soldout,
			boletosVendidos: 0,
			ingresos: 0,
			transacciones: 0,
			primeraVentaTs: null,
			ultimaVentaTs: null
		});
	});

	// Curva de anticipación T-minus (días antes del evento)
	const distribucionAnticipacion = {
		masDe30: 0,
		de15a30: 0,
		de7a14: 0,
		de3a7: 0,
		ultimas48h: 0,
		mismoDia: 0
	};

	// Distribución por día de la semana (0: Dom, 1: Lun, ..., 6: Sáb)
	const diasSemanaNombres = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
	const ventasPorDiaSemana = [0, 0, 0, 0, 0, 0, 0];

	// Distribución por rango horario (Madrugada 0-6, Mañana 6-12, Tarde 12-18, Noche 18-24)
	const ventasPorHorario = {
		madrugada: 0, // 00:00 - 05:59
		manana: 0, // 06:00 - 11:59
		tarde: 0, // 12:00 - 17:59
		noche: 0 // 18:00 - 23:59
	};

	// Mapear eventos para acceso rápido a su fecha de inicio
	const eventosDateMap = new Map();
	eventos.forEach((e) => {
		eventosDateMap.set(e.idevento, e.fechaInicio ? new Date(e.fechaInicio).getTime() : null);
	});

	// Procesar cada venta
	ventas.forEach((v) => {
		const cantidad = Number(v.cantidadTickets) || 1;
		totalTickets += cantidad;

		// Calcular monto
		let montoVenta = 0;
		if (v.mPago && v.mPago.cantidad) {
			const cleanStr = String(v.mPago.cantidad).replace(/[^0-9.-]+/g, '');
			montoVenta = parseFloat(cleanStr) || 0;
		} else if (v.idFaseEvento && fasesMap.has(v.idFaseEvento)) {
			montoVenta = (fasesMap.get(v.idFaseEvento).precio || 0) * cantidad;
		}
		totalIngresos += montoVenta;

		// Asignar a fase
		if (v.idFaseEvento && fasesMap.has(v.idFaseEvento)) {
			const f = fasesMap.get(v.idFaseEvento);
			f.boletosVendidos += cantidad;
			f.ingresos += montoVenta;
			f.transacciones += 1;

			if (v.fechaVenta) {
				const vTs = new Date(v.fechaVenta).getTime();
				if (!f.primeraVentaTs || vTs < f.primeraVentaTs) f.primeraVentaTs = vTs;
				if (!f.ultimaVentaTs || vTs > f.ultimaVentaTs) f.ultimaVentaTs = vTs;
			}
		}

		// Análisis de temporalidad
		if (v.fechaVenta) {
			const fechaVentaObj = new Date(v.fechaVenta);
			const vTs = fechaVentaObj.getTime();

			// Día de semana
			ventasPorDiaSemana[fechaVentaObj.getDay()] += cantidad;

			// Horario
			const hora = fechaVentaObj.getHours();
			if (hora < 6) ventasPorHorario.madrugada += cantidad;
			else if (hora < 12) ventasPorHorario.manana += cantidad;
			else if (hora < 18) ventasPorHorario.tarde += cantidad;
			else ventasPorHorario.noche += cantidad;

			// Anticipación respecto a fechaInicio del evento
			const evStartTs = eventosDateMap.get(v.idEvento);
			if (evStartTs) {
				const diffMs = evStartTs - vTs;
				const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));

				if (diffDias > 30) distribucionAnticipacion.masDe30 += cantidad;
				else if (diffDias >= 15) distribucionAnticipacion.de15a30 += cantidad;
				else if (diffDias >= 7) distribucionAnticipacion.de7a14 += cantidad;
				else if (diffDias >= 3) distribucionAnticipacion.de3a7 += cantidad;
				else if (diffDias >= 1) distribucionAnticipacion.ultimas48h += cantidad;
				else distribucionAnticipacion.mismoDia += cantidad;
			}
		}
	});

	// Métricas por fase calculadas
	const fasesDetalle = Array.from(fasesMap.values()).map((f) => {
		const porcentajeCupo = f.limite ? Math.min(100, Math.round((f.boletosVendidos / f.limite) * 100)) : null;
		
		// Velocidad de venta
		let duracionHoras = null;
		let boletosPorDia = null;
		if (f.primeraVentaTs && f.ultimaVentaTs) {
			duracionHoras = Math.max(1, Math.round((f.ultimaVentaTs - f.primeraVentaTs) / (1000 * 60 * 60)));
			const duracionDias = Math.max(0.5, duracionHoras / 24);
			boletosPorDia = Number((f.boletosVendidos / duracionDias).toFixed(1));
		}

		// Diagnóstico de fase
		let diagnostico = 'Ritmo estable';
		let tipoDiagnostico = 'neutral';

		if (f.limite && f.boletosVendidos >= f.limite) {
			if (duracionHoras && duracionHoras <= 48) {
				diagnostico = 'Agotada muy rápido (<48h). Margen para subir precio o ampliar cupo.';
				tipoDiagnostico = 'subir_precio';
			} else {
				diagnostico = 'Cupo 100% completado exitosamente.';
				tipoDiagnostico = 'exito';
			}
		} else if (f.fechaExpira && new Date(f.fechaExpira) < new Date() && porcentajeCupo && porcentajeCupo < 60) {
			diagnostico = 'Venció con bajo porcentaje de venta. Ventana muy corta o precio elevado.';
			tipoDiagnostico = 'ajustar_ventana';
		} else if (f.boletosVendidos === 0) {
			diagnostico = 'Sin ventas registradas.';
			tipoDiagnostico = 'alerta';
		}

		return {
			...f,
			porcentajeCupo,
			duracionHoras,
			boletosPorDia,
			diagnostico,
			tipoDiagnostico
		};
	});

	// Promedios y ratios globales
	const ticketPromedioPrecio = totalTickets > 0 ? Number((totalIngresos / totalTickets).toFixed(2)) : 0;
	const boletosPorTransaccion = totalTransacciones > 0 ? Number((totalTickets / totalTransacciones).toFixed(2)) : 0;

	// Recomendaciones estratégicas algorítmicas
	const recomendaciones = [];

	// Evaluar compras de último minuto
	const ventasUltimaSemana =
		distribucionAnticipacion.de3a7 +
		distribucionAnticipacion.ultimas48h +
		distribucionAnticipacion.mismoDia;
	const pctUltimaSemana = totalTickets > 0 ? Math.round((ventasUltimaSemana / totalTickets) * 100) : 0;

	if (pctUltimaSemana >= 50) {
		recomendaciones.push({
			titulo: 'Fuerte demanda de último minuto (' + pctUltimaSemana + '% en la última semana)',
			detalle:
				'Tu público espera a los últimos días para comprar. Conviene mantener una fase final "Taquilla / Last Call" con el precio más alto, pero anunciando una fecha estricta de cierre para forzar compras anticipadas con descuento.',
			tipo: 'oportunidad'
		});
	}

	// Evaluar tamaño de grupo
	if (boletosPorTransaccion >= 2.2) {
		recomendaciones.push({
			titulo: 'Compra grupal frecuente (Promedio ' + boletosPorTransaccion + ' boletos/compra)',
			detalle:
				'La gente asiste en grupo. Para el próximo evento creá una fase con "Pack Amigos (4 boletos con 10% desc)" en etapa temprana para acelerar el flujo de caja inicial.',
			tipo: 'estrategia'
		});
	}

	// Evaluar horario dominante
	const totalHoras =
		ventasPorHorario.madrugada +
		ventasPorHorario.manana +
		ventasPorHorario.tarde +
		ventasPorHorario.noche;
	if (totalHoras > 0) {
		const pctNocheTarde = Math.round(
			((ventasPorHorario.tarde + ventasPorHorario.noche) / totalHoras) * 100
		);
		if (pctNocheTarde >= 70) {
			recomendaciones.push({
				titulo: 'Horario pico de conversión: Tarde / Noche (' + pctNocheTarde + '%)',
				detalle:
					'El 70%+ de las compras se cierran después de las 12:00 PM. Programá tus campañas de email, recordatorios y cambios de fase entre las 18:00 y 21:00 hs para máxima conversión.',
				tipo: 'marketing'
			});
		}
	}

	return {
		esGlobal,
		eventoActual,
		resumen: {
			totalTickets,
			totalIngresos,
			totalTransacciones,
			ticketPromedioPrecio,
			boletosPorTransaccion
		},
		fases: fasesDetalle,
		anticipacion: {
			datos: distribucionAnticipacion,
			pctUltimaSemana
		},
		patrones: {
			diasSemana: diasSemanaNombres.map((dia, i) => ({
				dia,
				boletos: ventasPorDiaSemana[i],
				porcentaje: totalTickets > 0 ? Math.round((ventasPorDiaSemana[i] / totalTickets) * 100) : 0
			})),
			horarios: [
				{
					rango: 'Madrugada (00-06h)',
					boletos: ventasPorHorario.madrugada,
					porcentaje: totalHoras > 0 ? Math.round((ventasPorHorario.madrugada / totalHoras) * 100) : 0
				},
				{
					rango: 'Mañana (06-12h)',
					boletos: ventasPorHorario.manana,
					porcentaje: totalHoras > 0 ? Math.round((ventasPorHorario.manana / totalHoras) * 100) : 0
				},
				{
					rango: 'Tarde (12-18h)',
					boletos: ventasPorHorario.tarde,
					porcentaje: totalHoras > 0 ? Math.round((ventasPorHorario.tarde / totalHoras) * 100) : 0
				},
				{
					rango: 'Noche (18-24h)',
					boletos: ventasPorHorario.noche,
					porcentaje: totalHoras > 0 ? Math.round((ventasPorHorario.noche / totalHoras) * 100) : 0
				}
			]
		},
		recomendaciones
	};
}
