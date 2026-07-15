import { json } from '@sveltejs/kit';
import Stripe from 'stripe';

const getStripeClient = () => {
	const key = process.env.STRIPE_SECRET_KEY;
	if (!key) return null;
	return new Stripe(key);
};

export async function GET() {
	try {
		const stripe = getStripeClient();
		if (!stripe) {
			return json(
				{
					success: false,
					error: 'STRIPE_SECRET_KEY no está configurada en las variables de entorno'
				},
				{ status: 500 }
			);
		}

		// Listar los precios activos y expandir el objeto product
		const prices = await stripe.prices.list({
			active: true,
			limit: 100,
			expand: ['data.product']
		});

		// Mapear los datos para enviar al frontend
		const data = prices.data.map((p) => ({
			idPrecioStripe: p.id,
			nombre: p.product.name,
			precio: p.unit_amount / 100,
			moneda: p.currency
		}));

		// Ordenar alfabéticamente por nombre de producto
		data.sort((a, b) => a.nombre.localeCompare(b.nombre));

		return json({ success: true, prices: data });
	} catch (error) {
		console.error('Error al listar precios de Stripe:', error);
		return json({ success: false, error: error.message }, { status: 500 });
	}
}

export async function POST({ request }) {
	try {
		const stripe = getStripeClient();
		if (!stripe) {
			return json(
				{
					success: false,
					error: 'STRIPE_SECRET_KEY no está configurada en las variables de entorno'
				},
				{ status: 500 }
			);
		}

		const { nombre, precio } = await request.json();

		if (!nombre || precio === undefined || precio === null) {
			return json({ success: false, error: 'Nombre y precio son requeridos' }, { status: 400 });
		}

		// Calcular el precio inflado para trasladar la comisión de Stripe (México) al cliente.
		// Comisión Stripe: 3.6% + $3.00 MXN + 16% IVA de la comisión
		// Fórmula: (PrecioOriginal + 3.48) / 0.95824
		const precioOriginal = Number(precio);
		let precioCalculado = precioOriginal;

		if (precioOriginal > 0) {
			const feeFijoConIva = 3.0 * 1.16; // 3.48
			const factorVariableConIva = 0.036 * 1.16; // 0.04176
			const precioFinal = (precioOriginal + feeFijoConIva) / (1 - factorVariableConIva);
			precioCalculado = Math.round(precioFinal * 100) / 100;
		}

		// 1. Crear el producto en Stripe
		const product = await stripe.products.create({
			name: nombre
		});

		// 2. Crear el precio asociado (en centavos, MXN por defecto)
		const price = await stripe.prices.create({
			product: product.id,
			unit_amount: Math.round(precioCalculado * 100),
			currency: 'mxn'
		});

		return json({
			success: true,
			idPrecioStripe: price.id,
			productId: product.id,
			precioCalculado // Retornamos el precio recalculado al frontend para sincronización
		});
	} catch (error) {
		console.error('Error al crear producto/precio en Stripe:', error);
		return json({ success: false, error: error.message }, { status: 500 });
	}
}
