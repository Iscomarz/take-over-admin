import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

Deno.serve(async (req) => {
	// Handle CORS preflight requests
	if (req.method === 'OPTIONS') {
		return new Response('ok', { headers: corsHeaders });
	}

	try {
		const supabaseUrl = Deno.env.get('SUPABASE_URL');
		const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
		const resendApiKey = Deno.env.get('RESEND_API_KEY');
		const resendFromEmail = Deno.env.get('RESEND_FROM_EMAIL');

		if (!supabaseUrl || !supabaseServiceKey) {
			throw new Error('Missing Supabase environment variables.');
		}
		if (!resendApiKey || !resendFromEmail) {
			throw new Error('Missing Resend environment variables.');
		}

		const supabase = createClient(supabaseUrl, supabaseServiceKey);

		console.log('Fetching active reminder configurations...');
		// 1. Fetch active configurations in mRecordatorioEvento
		const { data: configs, error: errConfigs } = await supabase
			.from('mRecordatorioEvento')
			.select(
				`
        id,
        activo,
        evento_id,
        template_id,
        mRecordatorioTemplate (
          id,
          nombre,
          asunto,
          cuerpo_html
        ),
        mEvento (
          idevento,
          nombreEvento,
          fechaInicio,
          fechaFin,
          venue,
          direccion,
          id_venue
        )
      `
			)
			.eq('activo', true);

		if (errConfigs) {
			throw new Error(`Error fetching configurations: ${errConfigs.message}`);
		}

		if (!configs || configs.length === 0) {
			return new Response(
				JSON.stringify({ message: 'No active reminder configurations found.', processed: 0 }),
				{ headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
			);
		}

		console.log(
			`Found ${configs.length} active configurations. Filtering for events starting today in America/Mexico_City timezone...`
		);

		// Helper function to check if a date is "today" in America/Mexico_City
		const isTodayInMexicoCity = (dateStr?: string) => {
			if (!dateStr) return false;
			const date = new Date(dateStr);
			const formatter = new Intl.DateTimeFormat('en-US', {
				timeZone: 'America/Mexico_City',
				year: 'numeric',
				month: '2-digit',
				day: '2-digit'
			});

			const partsToday = formatter.formatToParts(new Date());
			const partsDate = formatter.formatToParts(date);

			const yToday = partsToday.find((p) => p.type === 'year')?.value;
			const mToday = partsToday.find((p) => p.type === 'month')?.value;
			const dToday = partsToday.find((p) => p.type === 'day')?.value;

			const yDate = partsDate.find((p) => p.type === 'year')?.value;
			const mDate = partsDate.find((p) => p.type === 'month')?.value;
			const dDate = partsDate.find((p) => p.type === 'day')?.value;

			return yToday === yDate && mToday === mDate && dToday === dDate;
		};

		// Filter configs for events starting today
		const todayConfigs = configs.filter((config) => {
			const event = config.mEvento;
			return event && isTodayInMexicoCity(event.fechaInicio);
		});

		if (todayConfigs.length === 0) {
			return new Response(
				JSON.stringify({
					message: 'No events scheduled for today in America/Mexico_City timezone.',
					processed: 0
				}),
				{ headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
			);
		}

		console.log(
			`Found ${todayConfigs.length} events scheduled for today. Querying venues details if needed...`
		);

		// Fetch details for venues to get google maps URL (url_direccion)
		const venueIds = [
			...new Set(
				todayConfigs
					.map((config) => config.mEvento?.id_venue)
					.filter((id): id is number => id !== null && id !== undefined)
			)
		];

		let venuesMap: Record<number, any> = {};
		if (venueIds.length > 0) {
			const { data: venues, error: errVenues } = await supabase
				.from('venue')
				.select('id_venue, nombre_venue, direccion_venue, url_direccion')
				.in('id_venue', venueIds);

			if (errVenues) {
				console.error(`Warning: Could not fetch venue details: ${errVenues.message}`);
			} else if (venues) {
				venuesMap = venues.reduce(
					(acc, v) => {
						acc[v.id_venue] = v;
						return acc;
					},
					{} as Record<number, any>
				);
			}
		}

		let totalSent = 0;
		let totalErrors = 0;
		const details = [];

		// Process each configuration
		for (const config of todayConfigs) {
			const recordatorioEventoId = config.id;
			const event = config.mEvento;
			const template = config.mRecordatorioTemplate;

			if (!event || !template) continue;

			const eventId = event.idevento;
			console.log(`Processing event ${eventId}: "${event.nombreEvento}"...`);

			// 2. Fetch ticket buyers for the event
			const { data: buyers, error: errBuyers } = await supabase
				.from('mVenta')
				.select(
					`
          idventa,
          idEvento,
          cliente_id (
            cliente_id,
            nombre,
            correo
          )
        `
				)
				.eq('idEvento', eventId);

			if (errBuyers) {
				console.error(`Error fetching buyers for event ${eventId}:`, errBuyers);
				details.push({ eventId, error: `Failed to fetch buyers: ${errBuyers.message}` });
				continue;
			}

			if (!buyers || buyers.length === 0) {
				console.log(`No ticket sales found for event ${eventId}.`);
				details.push({ eventId, message: 'No ticket sales found.' });
				continue;
			}

			// 3. Fetch logs from mRecordatorioEnvio for this configuration to exclude already sent reminders
			const { data: sentLogs, error: errSent } = await supabase
				.from('mRecordatorioEnvio')
				.select('cliente_id')
				.eq('recordatorio_evento_id', recordatorioEventoId)
				.eq('enviado', true);

			if (errSent) {
				console.error(`Error fetching sent logs for config ${recordatorioEventoId}:`, errSent);
				details.push({ eventId, error: `Failed to fetch sent logs: ${errSent.message}` });
				continue;
			}

			const sentClientIds = new Set(sentLogs?.map((log) => log.cliente_id) || []);
			const uniqueBuyers: any[] = [];
			const buyersByEmail = new Map<
				string,
				{
					cliente_id: number;
					nombre: string;
					correo: string;
					saleIds: number[];
				}
			>();

			// Filter and group buyers by email for this event
			for (const buyer of buyers) {
				if (!buyer.cliente_id) continue;
				const cliente: any = buyer.cliente_id;
				const clientId = cliente.cliente_id;
				const email = cliente.correo?.trim().toLowerCase();

				if (!email) continue;
				if (sentClientIds.has(clientId)) continue;

				if (!buyersByEmail.has(email)) {
					buyersByEmail.set(email, {
						cliente_id: clientId,
						nombre: cliente.nombre,
						correo: cliente.correo,
						saleIds: []
					});
				}
				buyersByEmail.get(email)!.saleIds.push(buyer.idventa);
			}

			for (const buyerGroup of buyersByEmail.values()) {
				uniqueBuyers.push(buyerGroup);
			}

			console.log(
				`Found ${uniqueBuyers.length} clients to receive reminders for event ${eventId}.`
			);

			if (uniqueBuyers.length === 0) {
				details.push({ eventId, message: 'All buyers have already been notified.' });
				continue;
			}

			// 3.5. Fetch tickets for unique buyers to get QR code public URLs (for all separate sales)
			const allSaleIds = uniqueBuyers.flatMap((b) => b.saleIds);
			const { data: tickets, error: errTickets } = await supabase
				.from('ticket')
				.select('idTicket, pathStorage, referencia, idVenta')
				.in('idVenta', allSaleIds);

			if (errTickets) {
				console.error(`Error fetching tickets for event ${eventId}:`, errTickets);
			}

			const ticketsByVenta = (tickets || []).reduce(
				(acc, t) => {
					if (!acc[t.idVenta]) acc[t.idVenta] = [];
					acc[t.idVenta].push(t);
					return acc;
				},
				{} as Record<number, any[]>
			);

			// Format event date/time for template interpolation
			const eventDate = new Date(event.fechaInicio);

			const formatterFecha = new Intl.DateTimeFormat('es-MX', {
				timeZone: 'UTC',
				weekday: 'long',
				year: 'numeric',
				month: 'long',
				day: 'numeric'
			});
			const fechaFormateada = formatterFecha.format(eventDate);

			const formatterHora = new Intl.DateTimeFormat('es-MX', {
				timeZone: 'UTC',
				hour: '2-digit',
				minute: '2-digit',
				hour12: true
			});
			const horaFormateada = formatterHora.format(eventDate);

			// Get venue details
			const venueDetails = event.id_venue ? venuesMap[event.id_venue] : null;
			const ubicacion = venueDetails
				? `${venueDetails.nombre_venue} - ${venueDetails.direccion_venue}`
				: `${event.venue || ''} - ${event.direccion || ''}`.trim() || 'Ubicación por confirmar';

			const linkMaps = venueDetails?.url_direccion || '';

			let sentCount = 0;
			let errorCount = 0;

			// 4. Send reminders to each unique buyer
			for (const buyer of uniqueBuyers) {
				const buyerTickets = buyer.saleIds.flatMap(
					(saleId: number) => ticketsByVenta[saleId] || []
				);
				let linkTicket = '';
				let qrCodeHtml = '';

				if (buyerTickets.length > 0) {
					// Use first QR code public URL as the download link
					const { data: publicUrlData } = supabase.storage
						.from('codigosQR')
						.getPublicUrl(buyerTickets[0].pathStorage);
					linkTicket = publicUrlData?.publicUrl || '';

					// Generate html list of QRs
					qrCodeHtml = buyerTickets
						.map((t, idx) => {
							const { data } = supabase.storage.from('codigosQR').getPublicUrl(t.pathStorage);
							const url = data?.publicUrl || '';
							return `
								<div style="margin: 15px auto; display: inline-block; padding: 15px; background-color: #ffffff; border-radius: 12px; text-align: center; border: 1px solid #e2e8f0; max-width: 220px;">
									<img src="${url}" width="180" height="180" style="display: block; margin: 0 auto 10px auto;" />
									<div style="font-family: sans-serif; font-size: 12px; color: #475569; font-weight: 600; text-align: center;">Boleto ${idx + 1}</div>
									<div style="font-family: sans-serif; font-size: 11px; color: #94a3b8; margin-top: 2px; text-align: center;">Ref: ${t.referencia || ''}</div>
								</div>
							`;
						})
						.join('');
				}

				// Replace template variables
				let bodyHtml = template.cuerpo_html || '';
				bodyHtml = bodyHtml.replace(/\{\{nombre\}\}/g, buyer.nombre || 'Cliente');
				bodyHtml = bodyHtml.replace(/\{\{evento\}\}/g, event.nombreEvento || '');
				bodyHtml = bodyHtml.replace(/\{\{fecha\}\}/g, fechaFormateada);
				bodyHtml = bodyHtml.replace(/\{\{hora\}\}/g, horaFormateada);
				bodyHtml = bodyHtml.replace(/\{\{ubicacion\}\}/g, ubicacion);
				bodyHtml = bodyHtml.replace(/\{\{link_maps\}\}/g, linkMaps);
				bodyHtml = bodyHtml.replace(/\{\{link_ticket\}\}/g, linkTicket);
				bodyHtml = bodyHtml.replace(/\{\{tickets_qr\}\}/g, qrCodeHtml);

				let subject = template.asunto || 'Recordatorio de Evento';
				subject = subject.replace(/\{\{nombre\}\}/g, buyer.nombre || 'Cliente');
				subject = subject.replace(/\{\{evento\}\}/g, event.nombreEvento || '');

				console.log(`Sending email to ${buyer.correo}...`);

				let success = false;
				let errorMessage = null;

				try {
					const response = await fetch('https://api.resend.com/emails', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							Authorization: `Bearer ${resendApiKey}`
						},
						body: JSON.stringify({
							from: resendFromEmail,
							to: [buyer.correo],
							subject: subject,
							html: bodyHtml
						})
					});

					if (!response.ok) {
						const errBody = await response.text();
						errorMessage = `Resend API returned status ${response.status}: ${errBody}`;
					} else {
						success = true;
						sentCount++;
						totalSent++;
					}
				} catch (err: any) {
					errorMessage = err.message || 'Unknown fetch error during sending email via Resend.';
				}

				if (!success) {
					console.error(`Failed to send email to ${buyer.correo}:`, errorMessage);
					errorCount++;
					totalErrors++;
				}

				// 5. Insert log in mRecordatorioEnvio to prevent duplicates
				const { error: logErr } = await supabase.from('mRecordatorioEnvio').insert({
					recordatorio_evento_id: recordatorioEventoId,
					cliente_id: buyer.cliente_id,
					enviado: success,
					fecha_envio: success ? new Date().toISOString() : null,
					error: errorMessage
				});

				if (logErr) {
					console.error(`Failed to write log for client ${buyer.cliente_id}:`, logErr);
				}
			}

			details.push({
				eventId,
				event: event.nombreEvento,
				totalBuyers: uniqueBuyers.length,
				sent: sentCount,
				failed: errorCount
			});
		}

		return new Response(
			JSON.stringify({
				message: 'Finished processing daily reminders.',
				totalSent,
				totalErrors,
				details
			}),
			{ headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
		);
	} catch (error: any) {
		console.error('Unhandled Edge Function error:', error);
		return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			status: 500
		});
	}
});
