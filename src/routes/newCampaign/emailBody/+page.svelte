<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import toast, { Toaster } from 'svelte-french-toast';
	import { campaniaStore } from '$lib/stores/campaniaStore';
	import { get } from 'svelte/store';
	import supabase from '$lib/supabase';
	import {
		crearCampania,
		guardarDestinatarios,
		enviarCampania,
		obtenerClientesUnicos,
		obtenerDetalleCampania,
		actualizarCampania
	} from '../../../services/campania-service';

	let token = '';
	let datosCampania = {};
	let cuerpoHtml = '';
	let usarVariable = true;
	let modoVista = 'editor'; // 'editor' o 'preview'
	let htmlPreview = '';
	let nombreEjemplo = 'Juan Pérez'; // Para preview
	let guardando = false;
	let enviando = false;
	let modoEdicion = false; // true si estamos editando un borrador
	let campaniaIdEditar = null; // ID de la campaña si estamos editando

	// Plantilla HTML por defecto
	const plantillaDefault = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .content {
            padding: 30px;
            color: #333;
            line-height: 1.6;
        }
        .button {
            display: inline-block;
            padding: 12px 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
        }
        .footer {
            background-color: #f8f8f8;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #888;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>¡Hola {{nombre}}!</h1>
        </div>
        <div class="content">
            <p>Nos emociona compartir contigo nuestras próximas experiencias.</p>
            <p>Como parte de nuestra comunidad, queremos que seas el primero en enterarte de nuestros eventos exclusivos.</p>
            <a href="https://takeovermx.com" class="button">Ver Eventos</a>
            <p>¡Te esperamos!</p>
        </div>
        <div class="footer">
            <p>© 2026 TakeOver. Todos los derechos reservados.</p>
            <p>Si no deseas recibir más correos, <a href="#">haz clic aquí</a>.</p>
        </div>
    </div>
</body>
</html>`;

	onMount(async () => {
		if (typeof window !== 'undefined') {
			token = localStorage.getItem('token');
			if (token == null) {
				goto('/');
			}
		}

		// Verificar si estamos editando un borrador (viene campaniaId en la URL)
		const urlParams = new URLSearchParams(window.location.search);
		campaniaIdEditar = urlParams.get('campaniaId');

		if (campaniaIdEditar) {
			// MODO EDICIÓN: Cargar datos del borrador
			await cargarBorradorParaEditar(campaniaIdEditar);
		} else {
			// MODO NUEVO: Obtener datos del store
			datosCampania = get(campaniaStore);

			console.log('Datos de campaña en emailBody:', datosCampania);

			// Verificar que venimos del paso anterior
			if (!datosCampania.titulo || !datosCampania.destinatarios || datosCampania.destinatarios.length === 0) {
				toast.error('Por favor completa el paso anterior primero');
				goto('/newCampaign');
				return;
			}

			// Si ya hay contenido guardado, usarlo
			if (datosCampania.cuerpoHtml) {
				cuerpoHtml = datosCampania.cuerpoHtml;
				usarVariable = datosCampania.usarVariable;
			} else {
				// Usar plantilla por defecto
				cuerpoHtml = plantillaDefault;
			}
		}

		actualizarPreview();
	});

	async function cargarBorradorParaEditar(campaniaId) {
		const loadingToast = toast.loading('Cargando borrador...');
		
		try {
			const campania = await obtenerDetalleCampania(campaniaId);
			
			if (!campania) {
				throw new Error('No se pudo cargar la campaña');
			}

			if (campania.estado !== 'borrador') {
				throw new Error('Solo se pueden editar campañas en estado borrador');
			}

			// Cargar datos de la campaña
			modoEdicion = true;
			cuerpoHtml = campania.cuerpo_html;
			usarVariable = campania.usar_variable_nombre;

			// Construir objeto de datos compatible con el store
			datosCampania = {
				titulo: campania.titulo,
				asunto: campania.asunto,
				destinatarios: campania.destinatarios?.map(d => d.venta_id) || [],
				cuerpoHtml: campania.cuerpo_html,
				usarVariable: campania.usar_variable_nombre
			};

			toast.dismiss(loadingToast);
			toast.success('Borrador cargado correctamente');
		} catch (error) {
			toast.dismiss(loadingToast);
			toast.error(error.message || 'Error al cargar el borrador');
			console.error('Error al cargar borrador:', error);
			setTimeout(() => goto('/campanias'), 1500);
		}
	}

	function actualizarPreview() {
		if (usarVariable) {
			// Reemplazar {{nombre}} con el nombre de ejemplo
			htmlPreview = cuerpoHtml.replace(/\{\{nombre\}\}/g, nombreEjemplo);
		} else {
			// Remover todas las referencias a {{nombre}}
			htmlPreview = cuerpoHtml.replace(/\{\{nombre\}\}/g, '');
		}
	}

	function insertarVariable() {
		// Insertar {{nombre}} en la posición del cursor
		const textarea = document.getElementById('htmlEditor');
		const start = textarea.selectionStart;
		const end = textarea.selectionEnd;
		const text = cuerpoHtml;

		cuerpoHtml = text.substring(0, start) + '{{nombre}}' + text.substring(end);

		// Restaurar foco y posición del cursor
		setTimeout(() => {
			textarea.focus();
			textarea.setSelectionRange(start + 10, start + 10);
		}, 0);

		actualizarPreview();
	}

	function cambiarVista(vista) {
		modoVista = vista;
		if (vista === 'preview') {
			actualizarPreview();
		}
	}

	async function guardarBorrador() {
		if (!cuerpoHtml.trim()) {
			toast.error('El contenido del correo no puede estar vacío');
			return;
		}

		guardando = true;
		const loadingToast = toast.loading(modoEdicion ? 'Actualizando borrador...' : 'Guardando borrador...');

		try {
			if (modoEdicion) {
				// MODO EDICIÓN: Actualizar borrador existente
				const exito = await actualizarCampania(campaniaIdEditar, {
					cuerpo_html: cuerpoHtml,
					usar_variable_nombre: usarVariable,
					updated_at: new Date().toISOString()
				});

				if (!exito) {
					throw new Error('Error al actualizar el borrador');
				}

				toast.dismiss(loadingToast);
				toast.success('Borrador actualizado correctamente');

				setTimeout(() => {
					goto('/campanias');
				}, 1000);
			} else {
				// MODO NUEVO: Crear nueva campaña
				// Actualizar store
				campaniaStore.setCuerpoCorreo(cuerpoHtml, usarVariable);

				// Obtener datos completos del store
				const datosCompletos = get(campaniaStore);

				console.log('Datos completos para guardar:', datosCompletos);

				// Validar datos
				if (!datosCompletos.destinatarios || datosCompletos.destinatarios.length === 0) {
					throw new Error('No hay destinatarios seleccionados');
				}

				// Crear campaña en base de datos
				const campania = await crearCampania({
					titulo: datosCompletos.titulo,
					asunto: datosCompletos.asunto,
					cuerpoHtml: cuerpoHtml,
					usarVariable: usarVariable
				});

				if (!campania) {
					throw new Error('Error al crear la campaña en la base de datos');
				}

				console.log('Campaña creada:', campania);

				// Guardar destinatarios
				const guardadoDestinatarios = await guardarDestinatarios(
					campania.id,
					datosCompletos.destinatarios,
					datosCompletos.seleccionarTodos
				);

				if (!guardadoDestinatarios) {
					throw new Error('Error al guardar destinatarios. Verifica que la tabla mcampaniadestinatario exista en tu base de datos.');
				}

				toast.dismiss(loadingToast);
				toast.success('Borrador guardado correctamente');

				// Resetear store y volver
				setTimeout(() => {
					campaniaStore.reset();
					goto('/home');
				}, 1000);
			}
		} catch (error) {
			toast.dismiss(loadingToast);
			toast.error(`Error: ${error.message}`);
			console.error('Error detallado al guardar:', error);
		} finally {
			guardando = false;
		}
	}

	async function enviarCampaniaAhora() {
		if (!cuerpoHtml.trim()) {
			toast.error('El contenido del correo no puede estar vacío');
			return;
		}

		const numDestinatarios = datosCampania.destinatarios?.length || 0;

		// Confirmar envío
		if (
			!confirm(
				`¿Estás seguro de enviar esta campaña a ${numDestinatarios} destinatarios?`
			)
		) {
			return;
		}

		enviando = true;
		const loadingToast = toast.loading('Enviando campaña...');

		try {
			// Actualizar store
			campaniaStore.setCuerpoCorreo(cuerpoHtml, usarVariable);

			// Obtener datos completos del store
			const datosCompletos = get(campaniaStore);

			console.log('Datos completos para enviar:', datosCompletos);

			// Validar datos
			if (!datosCompletos.destinatarios || datosCompletos.destinatarios.length === 0) {
				throw new Error('No hay destinatarios seleccionados');
			}

			// Crear campaña en base de datos
			const campania = await crearCampania({
				titulo: datosCompletos.titulo,
				asunto: datosCompletos.asunto,
				cuerpoHtml: cuerpoHtml,
				usarVariable: usarVariable
			});

			if (!campania) {
				throw new Error('Error al crear la campaña en la base de datos');
			}

			console.log('✅ Campaña creada exitosamente:', campania);
			console.log('🔑 ID de campaña:', campania.id);
			console.log('🔍 Tipo de ID:', typeof campania.id);
			console.log('📦 Objeto campaña completo:', JSON.stringify(campania, null, 2));

			// Guardar destinatarios
			const guardadoDestinatarios = await guardarDestinatarios(
				campania.id,
				datosCompletos.destinatarios,
				datosCompletos.seleccionarTodos
			);

			if (!guardadoDestinatarios) {
				throw new Error('Error al guardar destinatarios. Verifica que la tabla mcampaniadestinatario exista en tu base de datos.');
			}

			console.log('✅ Destinatarios guardados');

			// Obtener datos completos de los clientes desde la BD
			console.log('🔍 Obteniendo datos completos de clientes...');
			const { data: clientesCompletos, error: errorClientes } = await supabase
				.from('mVenta')
				.select('idventa, correo, nombre')
				.in('idventa', datosCompletos.destinatarios);

			if (errorClientes || !clientesCompletos) {
				console.error('Error al obtener clientes:', errorClientes);
				throw new Error('Error al obtener datos de destinatarios');
			}

			console.log('✅ Clientes obtenidos:', clientesCompletos.length);

			// Preparar datos para enviar al servidor
			const datosCampania = {
				titulo: campania.titulo,
				asunto: campania.asunto,
				cuerpo_html: cuerpoHtml,
				usar_variable_nombre: usarVariable
			};

			const destinatariosParaEnviar = clientesCompletos.map(c => ({
				id: c.idventa,
				correo: c.correo,
				nombre: c.nombre
			}));

			console.log('📧 Enviando campaña con todos los datos al servidor...');
			const resultado = await enviarCampania(campania.id, datosCampania, destinatariosParaEnviar);

			toast.dismiss(loadingToast);

			if (resultado.success) {
				toast.success(`Campaña enviada: ${resultado.enviados} exitosos, ${resultado.errores} errores`);

				// Resetear store y volver
				setTimeout(() => {
					campaniaStore.reset();
					goto('/home');
				}, 1500);
			} else {
				toast.error('Error al enviar la campaña: ' + (resultado.error || 'Error desconocido'));
			}
		} catch (error) {
			toast.dismiss(loadingToast);
			toast.error(`Error: ${error.message}`);
			console.error('Error detallado al enviar:', error);
		} finally {
			enviando = false;
		}
	}

	function volver() {
		// Guardar el contenido actual antes de volver
		campaniaStore.setCuerpoCorreo(cuerpoHtml, usarVariable);
		goto('/newCampaign');
	}
</script>

<Toaster />

<div class="min-h-screen bg-gradient-to-b from-black-900 to-stone-800 text-white pb-20">
	<div class="max-w-7xl mx-auto px-4 py-8">
		<!-- Header -->
		<div class="mb-8">
			<button on:click={volver} class="text-stone-400 hover:text-white mb-4 flex items-center gap-2">
				← Volver
			</button>
			<h1 class="text-3xl font-bold mb-2">Contenido del Correo</h1>
			<p class="text-stone-400 text-sm">
				Paso 2 de 2: Diseña el contenido de tu campaña de email
			</p>
		</div>

		<!-- Progreso -->
		<div class="mb-8">
			<div class="flex items-center gap-4">
				<div class="flex items-center gap-2 opacity-50">
					<div class="w-8 h-8 rounded-full bg-stone-700 flex items-center justify-center">1</div>
					<span class="text-sm">Datos Básicos</span>
				</div>
				<div class="flex-1 h-0.5 bg-stone-700"></div>
				<div class="flex items-center gap-2">
					<div
						class="w-8 h-8 rounded-full bg-gradient-to-r from-stone-600 to-stone-500 flex items-center justify-center font-bold"
					>
						2
					</div>
					<span class="text-sm font-medium">Contenido del Correo</span>
				</div>
			</div>
		</div>

		<!-- Info de la campaña -->
		<div class="bg-stone-900 rounded-xl p-4 border border-stone-700 mb-6">
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
				<div>
					<span class="text-stone-500">Título:</span>
					<span class="text-white font-medium ml-2">{datosCampania.titulo || ''}</span>
				</div>
				<div>
					<span class="text-stone-500">Asunto:</span>
					<span class="text-white font-medium ml-2">{datosCampania.asunto || ''}</span>
				</div>
				<div>
					<span class="text-stone-500">Destinatarios:</span>
					<span class="text-white font-medium ml-2">{datosCampania.destinatarios?.length || 0}</span>
				</div>
			</div>
		</div>

		<!-- Opciones de Variable -->
		<div class="bg-stone-900 rounded-xl p-6 border border-stone-700 mb-6">
			<div class="flex items-center justify-between mb-4">
				<div>
					<h3 class="text-lg font-semibold mb-1">Personalización</h3>
					<p class="text-sm text-stone-400">
						Usa <code class="bg-stone-800 px-2 py-1 rounded text-xs">{'{{nombre}}'}</code> para personalizar
						el correo con el nombre de cada destinatario
					</p>
				</div>
				<div class="flex items-center gap-2">
					<input
						type="checkbox"
						id="useVariable"
						bind:checked={usarVariable}
						on:change={actualizarPreview}
						class="w-4 h-4 rounded border-stone-600 bg-stone-800 text-stone-500 focus:ring-stone-500"
					/>
					<label for="useVariable" class="text-sm text-stone-300 cursor-pointer">
						Usar variable de nombre
					</label>
				</div>
			</div>

			{#if usarVariable}
				<button
					on:click={insertarVariable}
					class="bg-stone-700 hover:bg-stone-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
				>
					+ Insertar {'{{nombre}}'}
				</button>
			{/if}
		</div>

		<!-- Tabs Editor/Preview -->
		<div class="bg-stone-900 rounded-xl border border-stone-700 overflow-hidden">
			<div class="flex border-b border-stone-700">
				<button
					on:click={() => cambiarVista('editor')}
					class="flex-1 px-6 py-3 font-medium transition-colors {modoVista === 'editor'
						? 'bg-stone-800 text-white'
						: 'text-stone-400 hover:text-white hover:bg-stone-800/50'}"
				>
					📝 Editor HTML
				</button>
				<button
					on:click={() => cambiarVista('preview')}
					class="flex-1 px-6 py-3 font-medium transition-colors {modoVista === 'preview'
						? 'bg-stone-800 text-white'
						: 'text-stone-400 hover:text-white hover:bg-stone-800/50'}"
				>
					👁️ Vista Previa
				</button>
			</div>

			<div class="p-6">
				{#if modoVista === 'editor'}
					<div>
						<label class="block text-sm font-medium text-stone-300 mb-3">
							Código HTML del correo
						</label>
						<textarea
							id="htmlEditor"
							bind:value={cuerpoHtml}
							on:input={actualizarPreview}
							rows="20"
							class="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-stone-500 resize-y"
							placeholder="Escribe o pega tu código HTML aquí..."
						></textarea>
						<p class="text-xs text-stone-500 mt-2">
							💡 Tip: Usa {'{{nombre}}'} donde quieras que aparezca el nombre del destinatario
						</p>
					</div>
				{:else}
					<div>
						<div class="mb-4 flex items-center justify-between">
							<label class="text-sm font-medium text-stone-300">
								Vista previa del correo
								{#if usarVariable}
									<span class="text-stone-500 ml-2">(con nombre: {nombreEjemplo})</span>
								{/if}
							</label>
							{#if usarVariable}
								<input
									type="text"
									bind:value={nombreEjemplo}
									on:input={actualizarPreview}
									class="bg-stone-800 border border-stone-700 rounded px-3 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-stone-500"
									placeholder="Nombre de ejemplo"
								/>
							{/if}
						</div>
						<div class="bg-white rounded-lg overflow-hidden border border-stone-700">
							<iframe
								title="Vista previa del correo"
								srcdoc={htmlPreview}
								class="w-full border-0"
								style="min-height: 600px; height: 100%;"
							></iframe>
						</div>
					</div>
				{/if}
			</div>
		</div>

		<!-- Botones de Acción -->
		<div class="flex gap-4 mt-8">
			<button
				on:click={volver}
				disabled={guardando || enviando}
				class="flex-1 bg-stone-700 hover:bg-stone-600 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
			>
				← Anterior
			</button>
			<button
				on:click={guardarBorrador}
				disabled={guardando || enviando}
				class="flex-1 bg-stone-800 hover:bg-stone-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 border border-stone-600 disabled:opacity-50 disabled:cursor-not-allowed"
			>
				{guardando ? 'Guardando...' : '💾 Guardar Borrador'}
			</button>
			<button
				on:click={enviarCampaniaAhora}
				disabled={guardando || enviando}
				class="flex-1 bg-gradient-to-r from-stone-700 to-stone-600 hover:from-stone-600 hover:to-stone-500 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
			>
				{enviando ? 'Enviando...' : '📧 Enviar Campaña'}
			</button>
		</div>
	</div>
</div>
