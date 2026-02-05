<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import toast, { Toaster } from 'svelte-french-toast';
	import {
		obtenerMiembrosDelEquipo,
		crearMiembroDelEquipo,
		actualizarMiembroDelEquipo,
		subirArchivo
	} from '../../services/team-members-service';

	let token = '';
	let miembros = [];
	let mostrarModal = false;
	let modoEdicion = false;
	let miembroActual = {
		name: '',
		role: '',
		image: '',
		description: '',
		socials: {
			instagram: '',
			soundcloud: '',
			presskitPdfPath: ''
		},
		color: 'from-emerald-500/20 to-teal-500/20',
		accent_color: 'border-emerald-500/50'
	};

	let imagenFile = null;
	let pdfFile = null;
	let imagenPreview = '';
	let subiendoArchivos = false;

	// Colores disponibles (paleta stone y otros)
	const coloresGradiente = [
		{ label: 'Esmeralda', value: 'from-emerald-500/20 to-teal-500/20' },
		{ label: 'Azul', value: 'from-blue-500/20 to-cyan-500/20' },
		{ label: 'Violeta', value: 'from-violet-500/20 to-purple-500/20' },
		{ label: 'Rosa', value: 'from-pink-500/20 to-rose-500/20' },
		{ label: 'Naranja', value: 'from-orange-500/20 to-amber-500/20' },
		{ label: 'Verde', value: 'from-green-500/20 to-lime-500/20' },
		{ label: 'Rojo', value: 'from-red-500/20 to-orange-500/20' },
		{ label: 'Índigo', value: 'from-indigo-500/20 to-blue-500/20' }
	];

	const coloresAccent = [
		{ label: 'Esmeralda', value: 'border-emerald-500/50' },
		{ label: 'Azul', value: 'border-blue-500/50' },
		{ label: 'Violeta', value: 'border-violet-500/50' },
		{ label: 'Rosa', value: 'border-pink-500/50' },
		{ label: 'Naranja', value: 'border-orange-500/50' },
		{ label: 'Verde', value: 'border-green-500/50' },
		{ label: 'Rojo', value: 'border-red-500/50' },
		{ label: 'Índigo', value: 'border-indigo-500/50' }
	];

	onMount(async () => {
		if (typeof window !== 'undefined') {
			token = localStorage.getItem('token');
			if (token == null) {
				goto('/');
			}
		}
		await cargarMiembros();
	});

	async function cargarMiembros() {
		const loadingToast = toast.loading('Cargando miembros del equipo...');
		miembros = await obtenerMiembrosDelEquipo();
		toast.dismiss(loadingToast);
		if (miembros.length > 0) {
			toast.success('Miembros cargados correctamente');
		}
	}

	function abrirModal(miembro = null) {
		if (miembro) {
			modoEdicion = true;
			miembroActual = { ...miembro };
			imagenPreview = miembro.image || '';
		} else {
			modoEdicion = false;
			miembroActual = {
				name: '',
				role: '',
				image: '',
				description: '',
				socials: {
					instagram: '',
					soundcloud: '',
					presskitPdfPath: ''
				},
				color: 'from-emerald-500/20 to-teal-500/20',
				accent_color: 'border-emerald-500/50'
			};
			imagenPreview = '';
		}
		imagenFile = null;
		pdfFile = null;
		mostrarModal = true;
	}

	function cerrarModal() {
		mostrarModal = false;
		imagenFile = null;
		pdfFile = null;
		imagenPreview = '';
	}

	function handleImagenChange(event) {
		const file = event.target.files[0];
		if (file) {
			if (!file.type.startsWith('image/')) {
				toast.error('Por favor, selecciona un archivo de imagen válido');
				return;
			}
			imagenFile = file;
			const reader = new FileReader();
			reader.onload = (e) => {
				imagenPreview = e.target.result;
			};
			reader.readAsDataURL(file);
		}
	}

	function handlePdfChange(event) {
		const file = event.target.files[0];
		if (file) {
			if (file.type !== 'application/pdf') {
				toast.error('Por favor, selecciona un archivo PDF válido');
				return;
			}
			pdfFile = file;
		}
	}

	async function guardarMiembro() {
		// Validaciones
		if (!miembroActual.name || miembroActual.name.length > 50) {
			toast.error('El nombre es requerido y debe tener máximo 50 caracteres');
			return;
		}
		if (!miembroActual.role || miembroActual.role.length > 100) {
			toast.error('El rol es requerido y debe tener máximo 100 caracteres');
			return;
		}
		if (miembroActual.description && miembroActual.description.length > 350) {
			toast.error('La descripción debe tener máximo 350 caracteres');
			return;
		}

		subiendoArchivos = true;
		const loadingToast = toast.loading('Guardando miembro...');

		try {
			// Subir imagen si hay una nueva
			if (imagenFile) {
				const imageUrl = await subirArchivo(imagenFile, 'team-members/images');
				if (imageUrl) {
					miembroActual.image = imageUrl;
				} else {
					toast.error('Error al subir la imagen');
					subiendoArchivos = false;
					toast.dismiss(loadingToast);
					return;
				}
			}

			// Subir PDF si hay uno nuevo
			if (pdfFile) {
				const pdfUrl = await subirArchivo(pdfFile, 'team-members/pdfs');
				if (pdfUrl) {
					miembroActual.socials.presskitPdfPath = pdfUrl;
				} else {
					toast.error('Error al subir el PDF');
					subiendoArchivos = false;
					toast.dismiss(loadingToast);
					return;
				}
			}

			// Crear o actualizar miembro
			let resultado;
			if (modoEdicion) {
				resultado = await actualizarMiembroDelEquipo(miembroActual);
			} else {
				resultado = await crearMiembroDelEquipo(miembroActual);
			}

			toast.dismiss(loadingToast);
			subiendoArchivos = false;

			if (resultado) {
				toast.success(
					modoEdicion
						? 'Miembro actualizado correctamente'
						: 'Miembro creado correctamente'
				);
				cerrarModal();
				await cargarMiembros();
			} else {
				toast.error('Error al guardar el miembro');
			}
		} catch (error) {
			toast.dismiss(loadingToast);
			subiendoArchivos = false;
			toast.error('Error al procesar la solicitud');
			console.error(error);
		}
	}
</script>

<Toaster />

<div class="min-h-screen bg-gradient-to-b from-black-900 to-stone-800 text-white pb-20">
	<div class="max-w-7xl mx-auto px-4 py-8">
		<!-- Header -->
		<div class="flex justify-between items-center mb-8">
			<div>
				<h1 class="text-3xl font-bold mb-2">Miembros del Equipo</h1>
				<p class="text-stone-400 text-sm">Gestiona la información de tu equipo</p>
			</div>
			<button
				on:click={() => abrirModal()}
				class="bg-gradient-to-r from-stone-700 to-stone-600 hover:from-stone-600 hover:to-stone-500 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
			>
				+ Agregar Miembro
			</button>
		</div>

		<!-- Lista de Miembros -->
		{#if miembros.length > 0}
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{#each miembros as miembro}
					<div
						class="bg-gradient-to-br {miembro.color} backdrop-blur-sm border {miembro.accent_color} rounded-xl p-6 hover:scale-105 transition-transform duration-200 cursor-pointer"
						on:click={() => abrirModal(miembro)}
						on:keydown={(e) => e.key === 'Enter' && abrirModal(miembro)}
						role="button"
						tabindex="0"
					>
						{#if miembro.image}
							<div class="mb-4">
								<img
									src={miembro.image}
									alt={miembro.name}
									class="w-full h-48 object-cover rounded-lg"
								/>
							</div>
						{/if}
						<h3 class="text-xl font-bold mb-2 text-white">{miembro.name}</h3>
						<p class="text-stone-300 text-sm mb-3">{miembro.role}</p>
						{#if miembro.description}
							<p class="text-stone-400 text-xs line-clamp-3">{miembro.description}</p>
						{/if}
						{#if miembro.socials?.instagram || miembro.socials?.soundcloud}
							<div class="flex gap-2 mt-4">
								{#if miembro.socials?.instagram}
									<span class="text-xs text-stone-300">📱 Instagram</span>
								{/if}
								{#if miembro.socials?.soundcloud}
									<span class="text-xs text-stone-300">🎵 SoundCloud</span>
								{/if}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{:else}
			<div class="text-center py-12">
				<div class="animate-pulse">
					<div class="w-16 h-16 bg-stone-700 rounded-full mx-auto mb-4"></div>
					<p class="text-stone-400">No hay miembros registrados</p>
				</div>
			</div>
		{/if}
	</div>
</div>

<!-- Modal de Crear/Editar -->
{#if mostrarModal}
	<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
	<div
		class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
		on:click={cerrarModal}
		on:keydown={(e) => e.key === 'Escape' && cerrarModal()}
		role="dialog"
		aria-modal="true"
		tabindex="-1"
	>
		<div
			class="bg-stone-900 rounded-xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-stone-700"
			on:click|stopPropagation
			on:keydown|stopPropagation
			role="document"
		>
			<h2 class="text-2xl font-bold mb-6">
				{modoEdicion ? 'Editar Miembro' : 'Nuevo Miembro'}
			</h2>

			<form on:submit|preventDefault={guardarMiembro} class="space-y-6">
				<!-- Nombre -->
				<div>
					<!-- svelte-ignore a11y-label-has-associated-control -->
					<label class="block text-sm font-medium text-stone-300 mb-2">
						Nombre <span class="text-red-500">*</span>
					</label>
					<input
						type="text"
						bind:value={miembroActual.name}
						maxlength="50"
						class="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-stone-500"
						placeholder="Nombre completo"
						required
					/>
					<p class="text-xs text-stone-500 mt-1">{miembroActual.name.length}/50 caracteres</p>
				</div>

				<!-- Rol -->
				<div>
					<label class="block text-sm font-medium text-stone-300 mb-2">
						Rol 
					</label>
					<input
						type="text"
						bind:value={miembroActual.role}
						maxlength="100"
						class="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-stone-500"
						placeholder="DJ, Producer, Manager, etc."
					/>
					<p class="text-xs text-stone-500 mt-1">{miembroActual.role.length}/100 caracteres</p>
				</div>

				<!-- Descripción -->
				<div>
					<label class="block text-sm font-medium text-stone-300 mb-2"> Descripción </label>
					<textarea
						bind:value={miembroActual.description}
						maxlength="350"
						rows="4"
						class="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-stone-500 resize-none"
						placeholder="Biografía o descripción del miembro"
					></textarea>
					<p class="text-xs text-stone-500 mt-1">
						{miembroActual.description.length}/350 caracteres
					</p>
				</div>

				<!-- Imagen -->
				<div>
					<label class="block text-sm font-medium text-stone-300 mb-2"> Imagen de perfil </label>
					{#if imagenPreview}
						<div class="mb-3">
							<img
								src={imagenPreview}
								alt="Preview"
								class="w-32 h-32 object-cover rounded-lg border border-stone-700"
							/>
						</div>
					{/if}
					<input
						type="file"
						accept="image/*"
						on:change={handleImagenChange}
						class="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-stone-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-stone-700 file:text-white hover:file:bg-stone-600"
					/>
				</div>

				<!-- Redes Sociales -->
				<div class="space-y-4">
					<h3 class="text-lg font-semibold text-stone-300">Redes Sociales</h3>

					<div>
						<label class="block text-sm font-medium text-stone-300 mb-2"> Instagram </label>
						<input
							type="url"
							bind:value={miembroActual.socials.instagram}
							class="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-stone-500"
							placeholder="https://instagram.com/usuario"
						/>
					</div>

					<div>
						<label class="block text-sm font-medium text-stone-300 mb-2"> SoundCloud </label>
						<input
							type="url"
							bind:value={miembroActual.socials.soundcloud}
							class="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-stone-500"
							placeholder="https://soundcloud.com/usuario"
						/>
					</div>

					<div>
						<label class="block text-sm font-medium text-stone-300 mb-2"> Press Kit (PDF) </label>
						{#if miembroActual.socials.presskitPdfPath && !pdfFile}
							<p class="text-xs text-green-400 mb-2">✓ PDF cargado</p>
						{/if}
						<input
							type="file"
							accept="application/pdf"
							on:change={handlePdfChange}
							class="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-stone-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-stone-700 file:text-white hover:file:bg-stone-600"
						/>
					</div>
				</div>

				<!-- Color Gradiente -->
				<div>
					<label class="block text-sm font-medium text-stone-300 mb-2"> Color de Fondo </label>
					<select
						bind:value={miembroActual.color}
						class="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-stone-500"
					>
						{#each coloresGradiente as color}
							<option value={color.value}>{color.label}</option>
						{/each}
					</select>
					<div class="mt-2 h-16 rounded-lg bg-gradient-to-br {miembroActual.color}"></div>
				</div>

				<!-- Color de Acento -->
				<div>
					<label class="block text-sm font-medium text-stone-300 mb-2"> Color de Borde </label>
					<select
						bind:value={miembroActual.accent_color}
						class="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-stone-500"
					>
						{#each coloresAccent as color}
							<option value={color.value}>{color.label}</option>
						{/each}
					</select>
					<div class="mt-2 h-16 rounded-lg border-4 {miembroActual.accent_color} bg-stone-800">
					</div>
				</div>

				<!-- Botones -->
				<div class="flex gap-4 pt-4">
					<button
						type="button"
						on:click={cerrarModal}
						disabled={subiendoArchivos}
						class="flex-1 bg-stone-700 hover:bg-stone-600 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Cancelar
					</button>
					<button
						type="submit"
						disabled={subiendoArchivos}
						class="flex-1 bg-gradient-to-r from-stone-700 to-stone-600 hover:from-stone-600 hover:to-stone-500 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{subiendoArchivos ? 'Guardando...' : modoEdicion ? 'Actualizar' : 'Crear'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
