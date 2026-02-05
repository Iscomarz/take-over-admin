import { json } from '@sveltejs/kit';
import supabase from '$lib/supabase';
import { Resend } from 'resend';

// Inicializar Resend con tu API key
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST({ request }) {
	try {
		const body = await request.json();
		const { campaniaId, campania, destinatarios } = body;

		// Validaciones
		if (!campaniaId) {
			return json({ success: false, error: 'ID de campaña requerido' }, { status: 400 });
		}

		if (!campania || !campania.titulo || !campania.asunto || !campania.cuerpo_html) {
			return json({ success: false, error: 'Datos de campaña incompletos' }, { status: 400 });
		}

		if (!destinatarios || destinatarios.length === 0) {
			return json({ success: false, error: 'No hay destinatarios' }, { status: 400 });
		}

		// Preparar y enviar correos
		let enviados = 0;
		let errores = 0;
		const resultados = [];

		for (let i = 0; i < destinatarios.length; i++) {
			const destinatario = destinatarios[i];
			
			try {
				// Reemplazar variables en el HTML
				let htmlFinal = campania.cuerpo_html;
				
				const htmlContent = campania.usar_variable_nombre && destinatario.nombre
					? htmlFinal.replace(/\{\{nombre\}\}/g, destinatario.nombre)
					: htmlFinal;

				// Enviar correo con Resend
				const { data, error } = await resend.emails.send({
					from: process.env.RESEND_FROM_EMAIL || 'Take Over <onboarding@resend.dev>',
					to: destinatario.correo,
					subject: campania.asunto,
					html: htmlContent,
					headers: {
						'X-Priority': '3',
						'X-MSMail-Priority': 'Normal',
						'Importance': 'Normal',
						'List-Unsubscribe': `<mailto:unsubscribe@tudominio.com>`,
						'Precedence': 'bulk'
					},
					// Agregar versión de texto plano
					text: htmlContent.replace(/<[^>]*>/g, '')
				});

				if (error) {
					throw new Error(JSON.stringify(error));
				}
				
				// Marcar como enviado en BD
				const { error: updateError } = await supabase
					.from('mcampaniadestinatario')
					.update({
						enviado: true,
						fecha_envio: new Date().toISOString(),
						error: null
					})
					.eq('campania_id', campaniaId)
					.eq('venta_id', destinatario.id);

				if (updateError) {
					console.error('⚠️ Error al actualizar estado (pero el correo se envió):', updateError);
				} 

				enviados++;
				resultados.push({ correo: destinatario.correo, status: 'enviado', resend_id: data.id });
			} catch (error) {
				errores++;

				// Registrar error en BD
				const { error: updateError } = await supabase
					.from('mcampaniadestinatario')
					.update({
						error: error.message || String(error)
					})
					.eq('campania_id', campaniaId)
					.eq('venta_id', destinatario.id);

				if (updateError) {
					console.error('⚠️ Error al guardar el error en BD:', updateError);
				}

				resultados.push({ correo: destinatario.correo, status: 'error', error: error.message || String(error) });
			}
		}

		// Actualizar estado de la campaña
		const { error: updateCampaniaError } = await supabase
			.from('mcampania')
			.update({
				estado: 'enviada',
				fecha_envio: new Date().toISOString(),
				total_enviados: enviados,
				total_errores: errores
			})
			.eq('id', campaniaId);

		if (updateCampaniaError) {
			console.error('⚠️ Error al actualizar estado de campaña:', updateCampaniaError);
		}

		return json({
			success: true,
			enviados,
			errores,
			resultados
		});
	} catch (error) {
		return json(
			{
				success: false,
				error: error.message || 'Error interno del servidor',
				details: String(error),
				stack: error.stack
			},
			{ status: 500 }
		);
	}
}
